import { INITIAL_REGISTRATIONS } from '../src/data/mockData';

const firebaseConfig = {
  projectId: 'gen-lang-client-0542593931',
  appId: '1:137410033238:web:0235016ef24f0ac2f2adf7',
  apiKey: 'AIzaSyDJKsstF4O4s0fbBE-k0IhA5M_jV6Ft4t8',
  authDomain: 'gen-lang-client-0542593931.firebaseapp.com',
  storageBucket: 'gen-lang-client-0542593931.firebasestorage.app',
  messagingSenderId: '137410033238',
  measurementId: '',
  oAuthClientId: '137410033238-l5jha1g8s6clag31jhlnoaq1s84mo79n.apps.googleusercontent.com',
  recaptchaSiteKey: '',
};

// Global in-memory cache across serverless warm invocations
let memoryRegistrations = [...INITIAL_REGISTRATIONS];
let memoryActivities: any[] = [];

/**
 * Vercel Serverless Function: POST /api/check-in (or GET for testing)
 */
export default async function handler(req: any, res: any) {
  // Set standard CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const queryParams = req.query || {};
    const body = req.body || {};

    const rawInput = String(
      body.qrData || body.ticketId || body.code || body.id || queryParams.qrData || queryParams.ticketId || queryParams.code || ''
    ).trim();

    const gate = String(body.gate || queryParams.gate || 'Main Gate Turnstile');
    const scannedBy = String(body.scannedBy || queryParams.scannedBy || 'External PWA Scanner');

    if (!rawInput) {
      return res.status(400).json({
        success: false,
        status: 'invalid',
        message: 'Missing qrData or ticketId in request body. Please provide the scanned QR string or ticket ID.',
      });
    }

    const queryUpper = rawInput.toUpperCase();
    const timeFormatted = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const nowIso = new Date().toISOString().replace('T', ' ').substring(0, 16);

    // Look for registration in memory list
    const foundIndex = memoryRegistrations.findIndex((r) => {
      const tid = (r.ticketId || '').toUpperCase();
      const qv = (r.qrValue || '').toUpperCase();
      const rid = (r.id || '').toUpperCase();

      if (tid && tid === queryUpper) return true;
      if (qv && qv === queryUpper) return true;
      if (rid && rid === queryUpper) return true;
      if (tid && queryUpper.includes(tid)) return true;
      if (qv && queryUpper.includes(qv)) return true;
      if (rid && queryUpper.includes(rid)) return true;
      return false;
    });

    if (foundIndex === -1) {
      return res.status(404).json({
        success: false,
        status: 'invalid',
        message: `Invalid Pass: Barcode "${rawInput}" is not recognized in the guest database.`,
        scannedInput: rawInput,
        scannedAt: timeFormatted,
      });
    }

    const attendee = memoryRegistrations[foundIndex];

    // Check if approved
    if (attendee.status !== 'Approved') {
      return res.status(403).json({
        success: false,
        status: 'invalid',
        message: `Entry Denied: Attendee ${attendee.name} has status "${attendee.status}". Entry pass not activated.`,
        attendee: {
          id: attendee.id,
          name: attendee.name,
          email: attendee.email,
          tier: attendee.tier,
          status: attendee.status,
        },
        scannedAt: timeFormatted,
      });
    }

    // Check duplicate check-in
    if (attendee.checkedIn) {
      return res.status(409).json({
        success: false,
        status: 'already_used',
        message: `ALREADY SCANNED: Ticket ${attendee.ticketId} was already used by ${attendee.name} at ${attendee.checkedInAt || 'earlier today'}.`,
        attendee: {
          id: attendee.id,
          name: attendee.name,
          email: attendee.email,
          tier: attendee.tier,
          ticketId: attendee.ticketId,
          checkedIn: true,
          checkedInAt: attendee.checkedInAt,
        },
        scannedAt: timeFormatted,
      });
    }

    // Mark as Checked In
    const updatedAttendee = {
      ...attendee,
      checkedIn: true,
      checkedInAt: nowIso,
    };

    memoryRegistrations[foundIndex] = updatedAttendee;

    // Optional Firestore sync in background (non-blocking)
    try {
      const { initializeApp, getApps, getApp } = await import('firebase/app');
      const { getFirestore, doc, updateDoc, setDoc } = await import('firebase/firestore');
      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      const db = getFirestore(app);
      await updateDoc(doc(db, 'registrations', updatedAttendee.id), {
        checkedIn: true,
        checkedInAt: nowIso,
      });
    } catch {
      // Graceful fallback to memory
    }

    const activity = {
      id: `ACT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: 'checkin',
      title: `${updatedAttendee.name} checked in via Scanner`,
      description: `Gate: ${gate} · Scanned by: ${scannedBy} (${updatedAttendee.tier})`,
      timestamp: timeFormatted,
      timeAgo: 'Just now',
      createdAt: Date.now(),
      attendeeName: updatedAttendee.name,
      ticketId: updatedAttendee.ticketId,
    };
    memoryActivities.unshift(activity);

    return res.status(200).json({
      success: true,
      status: 'valid',
      message: `PASS VERIFIED: Welcome, ${updatedAttendee.name}! Access granted for ${updatedAttendee.tier}.`,
      attendee: updatedAttendee,
      gate,
      scannedAt: timeFormatted,
    });
  } catch (err: any) {
    console.error('Serverless error:', err);
    return res.status(500).json({
      success: false,
      status: 'error',
      message: `Server execution error: ${err?.message || err}`,
    });
  }
}
