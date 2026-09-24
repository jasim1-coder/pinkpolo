import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { Registration, ActivityItem, DashboardStats } from './src/types';
import { checkInAttendeeInFirestore } from './src/services/firebaseDb';

dotenv.config();

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

  // WhatsApp Cloud API Verify Number Endpoint
  app.post('/api/verify-whatsapp', async (req: Request, res: Response) => {
    try {
      const { phone, name } = req.body || {};

      if (!phone) {
        res.status(400).json({ success: false, validWhatsApp: false, error: 'Phone number is required.' });
        return;
      }

      const cleanPhone = String(phone).replace(/[^0-9]/g, '');
      if (cleanPhone.length < 8) {
        res.status(400).json({ success: false, validWhatsApp: false, error: 'Invalid phone number length.' });
        return;
      }

      const apiVersion = process.env.WHATSAPP_API_VERSION || 'v22.0';
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '974899072381634';
      const accessToken =
        process.env.WHATSAPP_ACCESS_TOKEN ||
        'EAAW2JxtvKuYBRiimKqU3VTdNEu0qZAxvS2z5Ly7GxYLnrVc60eoJSq5P5ZBEsGq85ZAytBBjNoLBEg8fKRLkcXzz8GMd8NWrhK0SNKGmZBcfeOH2AWJ4Cxf4Ln0eeNhRy9VlUA4sYjv5xUdbxNACUMujdnwcH5blNZCOPWZBDiypYJbDHkoiSSsZBk3amEW1Yz5MAZDZD';

      const verificationPayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'text',
        text: {
          body: `🏇 *GHANTOOT RACING & POLO CLUB*\n🎗️ *Pink Polo 2026 Registration*\n\nHello *${name || 'Guest'}*,\nThank you for submitting your registration request. We have verified your WhatsApp contact. Your official digital e-Pass will be delivered here once approved by the organizing committee.\n\n📍 *Venue:* Ghantoot Polo Grounds, Abu Dhabi\n📅 *Dates:* Nov 20–22, 2026`,
        },
      };

      const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

      const metaRes = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(verificationPayload),
      });

      const metaData = await metaRes.json().catch(() => ({}));

      if (!metaRes.ok) {
        const errCode = (metaData as any)?.error?.code;
        const errMsg = (metaData as any)?.error?.message || '';
        console.warn('Meta WhatsApp Verification Warning:', errCode, errMsg, metaData);

        // Code 131047 proves the WhatsApp account exists on Meta servers
        if (errCode === 131047) {
          res.status(200).json({
            success: true,
            validWhatsApp: true,
            recipient: cleanPhone,
            note: 'Verified WhatsApp user account.',
          });
          return;
        }

        res.status(200).json({
          success: false,
          validWhatsApp: false,
          error: 'This phone number does not have an active WhatsApp account. Please enter a valid number with active WhatsApp.',
          details: metaData,
        });
        return;
      }

      if ((metaData as any)?.messages && (metaData as any).messages.length > 0) {
        res.status(200).json({
          success: true,
          validWhatsApp: true,
          recipient: cleanPhone,
          messageId: (metaData as any).messages[0].id,
        });
        return;
      }

      console.log(`[WhatsApp Verified] ${cleanPhone} is a valid WhatsApp user`);
      res.status(200).json({
        success: true,
        validWhatsApp: true,
        recipient: cleanPhone,
        messageId: (metaData as any)?.messages?.[0]?.id,
      });
    } catch (err: any) {
      console.error('WhatsApp verify exception:', err);
      res.status(500).json({ success: false, validWhatsApp: false, error: err?.message || 'Server error verifying WhatsApp' });
    }
  });

  // WhatsApp Cloud API Send Message Endpoint
  app.post('/api/send-whatsapp', async (req: Request, res: Response) => {
    try {
      const { to, name, ticketId, tier, gate, qrValue, customMessage } = req.body || {};

      if (!to) {
        res.status(400).json({ success: false, error: 'Recipient phone number is required' });
        return;
      }

      const cleanPhone = String(to).replace(/[^0-9]/g, '');
      const apiVersion = process.env.WHATSAPP_API_VERSION || 'v22.0';
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '974899072381634';
      const accessToken =
        process.env.WHATSAPP_ACCESS_TOKEN ||
        'EAAW2JxtvKuYBRiimKqU3VTdNEu0qZAxvS2z5Ly7GxYLnrVc60eoJSq5P5ZBEsGq85ZAytBBjNoLBEg8fKRLkcXzz8GMd8NWrhK0SNKGmZBcfeOH2AWJ4Cxf4Ln0eeNhRy9VlUA4sYjv5xUdbxNACUMujdnwcH5blNZCOPWZBDiypYJbDHkoiSSsZBk3amEW1Yz5MAZDZD';

      const rawQr = qrValue || `PINK-POLO-2026-${ticketId || 'PASS'}`;
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=15&data=${encodeURIComponent(
        rawQr
      )}`;

      const captionBody =
        customMessage ||
        `🏇 *GHANTOOT RACING & POLO CLUB*\n` +
          `🎗️ *PINK POLO 2026 OFFICIAL ADMISSION PASS*\n\n` +
          `Dear *${name || 'Guest'}*,\n\n` +
          `Your registration for the *Pink Polo 2026 Invitational & Charity Gala* has been *APPROVED*!\n\n` +
          `🎟️ *Ticket Pass ID:* ${ticketId || 'PINK-2026'}\n` +
          `👑 *Experience Tier:* ${tier || 'VIP Access'}\n` +
          `🚪 *Designated Entrance:* ${gate || 'Gate 1 (Royal Pavilion Turnstile)'}\n` +
          `📅 *Event Dates:* Nov 20–22, 2026 (Gate Open: 14:00)\n` +
          `📍 *Venue:* Ghantoot Racing & Polo Club Grounds\n\n` +
          `📲 *Gate Entry Instructions:*\n` +
          `Present this attached QR barcode on your phone at your assigned gate turnstile for optical laser scan & VIP wristband issuance.`;

      // Try sending as high-resolution QR Image with caption first
      const imagePayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'image',
        image: {
          link: qrImageUrl,
          caption: captionBody,
        },
      };

      const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

      let metaRes = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(imagePayload),
      });

      let metaData = await metaRes.json().catch(() => ({}));

      // Fallback to text payload if image is rejected
      if (!metaRes.ok) {
        console.warn('Meta Image message failed, retrying with text payload:', metaData);
        const textPayload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhone,
          type: 'text',
          text: {
            preview_url: true,
            body: `${captionBody}\n\n🔗 *QR Pass Image:* ${qrImageUrl}`,
          },
        };

        metaRes = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(textPayload),
        });

        metaData = await metaRes.json().catch(() => ({}));
      }

      if (!metaRes.ok) {
        console.error('Meta WhatsApp Cloud API Error:', metaData);
        res.status(metaRes.status || 500).json({
          success: false,
          error: (metaData as any)?.error?.message || 'Failed to dispatch WhatsApp message',
          details: metaData,
        });
        return;
      }

      console.log(`[WhatsApp Sent] QR Pass ${ticketId} sent to ${cleanPhone}`);
      res.status(200).json({
        success: true,
        messageId: (metaData as any)?.messages?.[0]?.id,
        recipient: cleanPhone,
        qrImageUrl,
      });
    } catch (err: any) {
      console.error('WhatsApp Error:', err);
      res.status(500).json({ success: false, error: err?.message || 'Server error' });
    }
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
