import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { Registration, ActivityItem, DashboardStats } from './src/types';
import { checkInAttendeeInFirestore } from './src/services/firebaseDb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory persistent server store (seeded dynamically from DB / client sync)
let registrations: Registration[] = [];
let activities: ActivityItem[] = [];
let stats: DashboardStats = {
  totalRegistrations: 0,
  pendingApproval: 0,
  approved: 0,
  rejected: 0,
  ticketsGenerated: 0,
  checkedIn: 0,
};

// Connected SSE clients for real-time live check-in notifications
const sseClients: Set<Response> = new Set();

function broadcastEvent(eventType: string, data: any) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch (e) {
      console.error('SSE client write error:', e);
      sseClients.delete(client);
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Enable CORS for all origins so external PWA from any domain/localhost can call this API
  app.use(
    cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  app.use(express.json());

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      system: 'Pink Polo 2026 Turnstile Gate API',
      timestamp: new Date().toISOString(),
      checkedInCount: stats.checkedIn,
      totalAttendees: registrations.length,
    });
  });

  // API docs / Integration manifest info
  app.get('/api/pwa-info', (req: Request, res: Response) => {
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;

    res.json({
      name: 'Pink Polo 2026 QR Scanner Admission API',
      checkInEndpoint: `${baseUrl}/api/check-in`,
      lookupEndpoint: `${baseUrl}/api/ticket/:code`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      requestExample: {
        qrData: 'PINK-POLO-2026-PINK-2026-8801-JASIM-KHAN',
        gate: 'Gate 1 (Royal Pavilion Turnstile)',
        scannedBy: 'PWA Turnstile Terminal',
      },
      responseStatuses: ['valid', 'already_used', 'invalid'],
    });
  });

  // Current state
  app.get('/api/state', (req: Request, res: Response) => {
    res.json({
      registrations,
      activities: activities.slice(0, 50),
      stats,
    });
  });

  // Sync client state (when client creates or approves a registration locally)
  app.post('/api/sync', (req: Request, res: Response) => {
    const { updatedRegistrations, updatedStats, newActivity } = req.body;

    if (Array.isArray(updatedRegistrations)) {
      // Merge or update registrations
      const map = new Map<string, Registration>();
      registrations.forEach((r) => map.set(r.id, r));
      updatedRegistrations.forEach((r: Registration) => map.set(r.id, r));
      registrations = Array.from(map.values());
    }

    if (updatedStats) {
      stats = { ...stats, ...updatedStats };
    }

    if (newActivity) {
      activities.unshift(newActivity);
      if (activities.length > 100) activities.pop();
    }

    broadcastEvent('sync', { stats, count: registrations.length });
    res.json({ success: true, count: registrations.length });
  });

  // Lookup attendee by ticket ID or QR code without checking in
  app.get('/api/ticket/:code', (req: Request, res: Response) => {
    const rawCode = decodeURIComponent(req.params.code || '').trim().toUpperCase();
    if (!rawCode) {
      res.status(400).json({ success: false, message: 'Ticket code or QR value is required' });
      return;
    }

    const found = registrations.find((r) => {
      const tid = (r.ticketId || '').toUpperCase();
      const qv = (r.qrValue || '').toUpperCase();
      const rid = (r.id || '').toUpperCase();

      return (
        tid === rawCode ||
        qv === rawCode ||
        rid === rawCode ||
        (tid && rawCode.includes(tid)) ||
        (qv && rawCode.includes(qv)) ||
        (tid && tid.includes(rawCode))
      );
    });

    if (!found) {
      res.status(404).json({
        success: false,
        status: 'invalid',
        message: 'No attendee found for this ticket code',
      });
      return;
    }

    res.json({
      success: true,
      attendee: {
        id: found.id,
        name: found.name,
        email: found.email,
        tier: found.tier,
        status: found.status,
        ticketId: found.ticketId,
        checkedIn: found.checkedIn,
        checkedInAt: found.checkedInAt,
      },
    });
  });

  /**
   * PRIMARY CHECK-IN ENDPOINT FOR THE USER'S PWA SCANNER APP
   * POST /api/check-in (or /api/scan)
   *
   * Accepts:
   * {
   *   "qrData": "PINK-POLO-2026-...", // decoded string from camera QR scan
   *   "gate": "Gate 1 (Royal Pavilion Turnstile)", // optional
   *   "scannedBy": "Mobile PWA Scanner" // optional
   * }
   */
  const handleCheckIn = async (req: Request, res: Response) => {
    const { qrData, ticketId, code, id, gate = 'Main Turnstile Gate', scannedBy = 'External PWA Scanner' } = req.body || {};

    const rawInput = String(qrData || ticketId || code || id || '').trim();
    if (!rawInput) {
      res.status(400).json({
        success: false,
        status: 'invalid',
        message: 'Missing qrData or ticketId in request body.',
      });
      return;
    }

    const timeFormatted = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    try {
      const dbResult = await checkInAttendeeInFirestore(rawInput, gate, scannedBy);

      if (!dbResult.success) {
        const statusCode =
          dbResult.status === 'already_used'
            ? 409
            : dbResult.status === 'invalid' && dbResult.attendee
            ? 403
            : 404;

        res.status(statusCode).json({
          success: false,
          status: dbResult.status,
          message: dbResult.message,
          guestName: dbResult.guestName,
          guestEmail: dbResult.guestEmail,
          ticketId: dbResult.ticketId,
          tier: dbResult.tier,
          ticketStatus: dbResult.ticketStatus,
          checkInStatus: dbResult.checkInStatus,
          attendee: dbResult.attendee,
          scannedInput: rawInput,
          scannedAt: timeFormatted,
        });
        return;
      }

      const updatedAttendee = dbResult.attendee!;

      // Broadcast live to all connected web dashboards via SSE
      broadcastEvent('checkin', {
        attendee: updatedAttendee,
        scannedBy,
        gate,
      });

      console.log(`[PWA CHECK-IN] ${updatedAttendee.name} (${updatedAttendee.ticketId}) checked in at ${gate}`);

      res.status(200).json({
        success: true,
        status: 'valid',
        message: dbResult.message,
        guestName: dbResult.guestName || updatedAttendee.name,
        guestEmail: dbResult.guestEmail || updatedAttendee.email,
        ticketId: dbResult.ticketId || updatedAttendee.ticketId,
        tier: dbResult.tier || updatedAttendee.tier,
        ticketStatus: 'Checked In',
        checkInStatus: 'Checked In',
        attendee: updatedAttendee,
        gate,
        scannedAt: timeFormatted,
      });
    } catch (err: any) {
      console.error('Check-in handler exception:', err);
      res.status(500).json({
        success: false,
        status: 'invalid',
        message: `Internal check-in error: ${err?.message || err}`,
        scannedInput: rawInput,
        scannedAt: timeFormatted,
      });
    }
  };

  app.post('/api/check-in', handleCheckIn);
  app.post('/api/scan', handleCheckIn);

  // Server-Sent Events (SSE) for instant dashboard live updates
  app.get('/api/events', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    sseClients.add(res);

    // Initial ping
    res.write(`event: connected\ndata: ${JSON.stringify({ connected: true, clients: sseClients.size })}\n\n`);

    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  // Vite integration: Dev middleware or Production static files
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Pink Polo 2026 Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup error:', err);
  process.exit(1);
});
