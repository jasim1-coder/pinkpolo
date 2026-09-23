import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

const REGISTRATIONS_COL = 'registrations';
const ACTIVITIES_COL = 'activities';

/**
 * Vercel Serverless Function: POST /api/check-in
 *
 * Accepts JSON:
 * {
 *   "qrData": "PINK-POLO-2026-...", // QR string or Ticket ID
 *   "ticketId": "PINK-2026-001043",   // or Ticket ID
 *   "gate": "Main Turnstile Gate",    // optional
 *   "scannedBy": "External Scanner App" // optional
 * }
 */
export default async function handler(req: any, res: any) {
  // Set standard CORS headers for any external app
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Handle pre-flight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const queryParams = req.query || {};
  const body = req.body || {};

  // Support both POST body and GET query params for quick testing
  const rawInput = String(
    body.qrData || body.ticketId || body.code || body.id || queryParams.qrData || queryParams.ticketId || queryParams.code || ''
  ).trim();

  const gate = String(body.gate || queryParams.gate || 'Main Gate Turnstile');
  const scannedBy = String(body.scannedBy || queryParams.scannedBy || 'External PWA Scanner');

  if (!rawInput) {
    return res.status(400).json({
      success: false,
      status: 'invalid',
      message: 'Missing qrData or ticketId in request. Please provide the scanned barcode string or ticket ID.',
    });
  }

  const queryUpper = rawInput.toUpperCase();
  const timeFormatted = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const nowIso = new Date().toISOString().replace('T', ' ').substring(0, 16);

  try {
    const colRef = collection(db, REGISTRATIONS_COL);
    const snapshot = await getDocs(colRef);
    let matchedDocId: string | null = null;
    let attendee: any = null;

    snapshot.forEach((docSnap) => {
      const r = docSnap.data();
      const tid = (r.ticketId || '').toUpperCase();
      const qv = (r.qrValue || '').toUpperCase();
      const rid = (r.id || '').toUpperCase();

      if (
        (tid && tid === queryUpper) ||
        (qv && qv === queryUpper) ||
        (rid && rid === queryUpper) ||
        (tid && queryUpper.includes(tid)) ||
        (qv && queryUpper.includes(qv)) ||
        (rid && queryUpper.includes(rid))
      ) {
        matchedDocId = docSnap.id;
        attendee = r;
      }
    });

    if (!attendee || !matchedDocId) {
      return res.status(404).json({
        success: false,
        status: 'invalid',
        message: `Invalid Pass: Barcode "${rawInput}" is not recognized in the guest database.`,
        scannedInput: rawInput,
        scannedAt: timeFormatted,
      });
    }

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

    // Duplicate check
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

    await updateDoc(doc(db, REGISTRATIONS_COL, matchedDocId), {
      checkedIn: true,
      checkedInAt: nowIso,
    });

    // Record Activity
    const actId = `ACT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const activity = {
      id: actId,
      type: 'checkin',
      title: `${updatedAttendee.name} checked in via Scanner`,
      description: `Gate: ${gate} · Scanned by: ${scannedBy} (${updatedAttendee.tier})`,
      timestamp: timeFormatted,
      timeAgo: 'Just now',
      createdAt: Date.now(),
      attendeeName: updatedAttendee.name,
      ticketId: updatedAttendee.ticketId,
    };
    await setDoc(doc(db, ACTIVITIES_COL, actId), activity);

    return res.status(200).json({
      success: true,
      status: 'valid',
      message: `PASS VERIFIED: Welcome, ${updatedAttendee.name}! Access granted for ${updatedAttendee.tier}.`,
      attendee: updatedAttendee,
      gate,
      scannedAt: timeFormatted,
    });
  } catch (error: any) {
    console.error('Vercel check-in endpoint error:', error);
    return res.status(500).json({
      success: false,
      status: 'invalid',
      message: `Internal server error during verification: ${error?.message || error}`,
    });
  }
}
