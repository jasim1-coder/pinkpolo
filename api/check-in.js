import { store } from './_store.js';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "gen-lang-client-0542593931",
  appId: "1:137410033238:web:0235016ef24f0ac2f2adf7",
  apiKey: "AIzaSyDJKsstF4O4s0fbBE-k0IhA5M_jV6Ft4t8",
  authDomain: "gen-lang-client-0542593931.firebaseapp.com",
  storageBucket: "gen-lang-client-0542593931.firebasestorage.app",
  messagingSenderId: "137410033238",
  measurementId: "",
  oAuthClientId: "137410033238-l5jha1g8s6clag31jhlnoaq1s84mo79n.apps.googleusercontent.com",
  recaptchaSiteKey: ""
};

let db = null;
try {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(app);
} catch (err) {
  console.warn('Firebase init warning:', err);
}

async function getRequestBody(req) {
  if (req.body) {
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body);
      } catch {
        return {};
      }
    }
    return req.body;
  }

  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

export default async function handler(req, res) {
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
    const body = await getRequestBody(req);

    const rawInput = String(
      body.qrData || body.ticketId || body.code || body.id || queryParams.qrData || queryParams.ticketId || queryParams.code || queryParams.id || ''
    ).trim();

    const gate = String(body.gate || queryParams.gate || 'Main Gate Turnstile');
    const scannedBy = String(body.scannedBy || queryParams.scannedBy || 'External Scanner App');

    if (!rawInput) {
      return res.status(400).json({
        success: false,
        status: 'invalid',
        message: 'Missing ticketId or qrData in request. Please provide ticketId or qrData parameter.',
      });
    }

    const now = new Date();
    const todayDateStr = now.toISOString().slice(0, 10);
    const timeFormatted = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const nowIso = now.toISOString().replace('T', ' ').substring(0, 16);

    const queryUpper = rawInput.toUpperCase();
    const digitsOnly = queryUpper.replace(/[^0-9]/g, '');

  let jsonTicketId = '';
  let jsonRegId = '';
  try {
    if (rawInput.startsWith('{') && rawInput.endsWith('}')) {
      const parsed = JSON.parse(rawInput);
      jsonTicketId = (parsed.ticketId || parsed.ticket_id || '').toUpperCase();
      jsonRegId = (parsed.id || parsed.regId || parsed.registrationId || '').toUpperCase();
    }
  } catch {}

  let matched = null;
  let matchedDocId = null;

  // 1. Check in-memory store
  for (const r of store.registrations.values()) {
    const tid = (r.ticketId || '').toUpperCase();
    const qv = (r.qrValue || '').toUpperCase();
    const rid = (r.id || '').toUpperCase();
    const tDigits = tid.replace(/[^0-9]/g, '');

    if (
      (tid && tid === queryUpper) ||
      (qv && qv === queryUpper) ||
      (rid && rid === queryUpper) ||
      (jsonTicketId && tid === jsonTicketId) ||
      (jsonRegId && rid === jsonRegId) ||
      (tid && tid.includes(queryUpper)) ||
      (tid && queryUpper.includes(tid)) ||
      (qv && qv.includes(queryUpper)) ||
      (qv && queryUpper.includes(qv)) ||
      (rid && queryUpper.includes(rid)) ||
      (rid && rid.includes(queryUpper)) ||
      (digitsOnly && digitsOnly.length >= 4 && tDigits.endsWith(digitsOnly))
    ) {
      matched = r;
      matchedDocId = r.id;
      break;
    }
  }

  // 2. If not found in-memory, query Firestore directly
  if (!matched && db) {
    try {
      const colRef = collection(db, 'registrations');
      const snapshot = await getDocs(colRef);
      snapshot.forEach((docSnap) => {
        const r = docSnap.data();
        const tid = (r.ticketId || '').toUpperCase();
        const qv = (r.qrValue || '').toUpperCase();
        const rid = (r.id || '').toUpperCase();
        const tDigits = tid.replace(/[^0-9]/g, '');

        if (
          (tid && tid === queryUpper) ||
          (qv && qv === queryUpper) ||
          (rid && rid === queryUpper) ||
          (jsonTicketId && tid === jsonTicketId) ||
          (jsonRegId && rid === jsonRegId) ||
          (tid && tid.includes(queryUpper)) ||
          (tid && queryUpper.includes(tid)) ||
          (qv && qv.includes(queryUpper)) ||
          (qv && queryUpper.includes(qv)) ||
          (rid && queryUpper.includes(rid)) ||
          (rid && rid.includes(queryUpper)) ||
          (digitsOnly && digitsOnly.length >= 4 && (tDigits.endsWith(digitsOnly) || tDigits.includes(digitsOnly)))
        ) {
          matched = r;
          matchedDocId = docSnap.id;
        }
      });
    } catch (e) {
      console.error('Error querying Firestore in api/check-in:', e);
    }
  }

  if (!matched) {
    return res.status(404).json({
      success: false,
      status: 'invalid',
      message: `Invalid Pass: Barcode "${rawInput}" is not recognized in the guest database.`,
      scannedInput: rawInput,
      scannedAt: timeFormatted,
    });
  }

  if (matched.status !== 'Approved') {
    return res.status(403).json({
      success: false,
      status: 'invalid',
      message: `Entry Denied: Attendee ${matched.name} has status "${matched.status}". Entry pass not activated.`,
      guestName: matched.name,
      guestEmail: matched.email,
      ticketId: matched.ticketId,
      tier: matched.tier,
      attendee: matched,
      scannedAt: timeFormatted,
    });
  }

  // --- MULTI-DAY CHECK-IN & ANTI-PASSBACK VALIDATION ---
  const dailyMap = matched.dailyCheckIns || {};
  let scannedTodayRecord = dailyMap[todayDateStr] || null;

  // Check legacy checkedInAt if dailyCheckIns map was not initialized
  if (!scannedTodayRecord && matched.checkedIn && matched.checkedInAt) {
    if (matched.checkedInAt.startsWith(todayDateStr)) {
      scannedTodayRecord = {
        date: todayDateStr,
        time: matched.checkedInAt.split(' ')[1] || timeFormatted,
        gate: matched.scannedGate || 'Main Gate',
        scannedBy: matched.scannedBy || 'Turnstile Scanner',
      };
    }
  }

  // Check in-memory store for fast duplicate prevention on the same day
  if (!scannedTodayRecord) {
    const memKeyToday = `${rawInput}_${todayDateStr}`;
    const memKeyUpper = `${queryUpper}_${todayDateStr}`;
    const memMatch = store.checkedInTickets.get(memKeyToday) || store.checkedInTickets.get(memKeyUpper);
    if (memMatch) {
      scannedTodayRecord = memMatch;
    }
  }

  if (scannedTodayRecord) {
    const scanTime = scannedTodayRecord.time || scannedTodayRecord.checkedInAt || timeFormatted;
    const scanGate = scannedTodayRecord.gate || matched.scannedGate || gate;
    return res.status(409).json({
      success: false,
      status: 'already_used',
      message: `ALREADY SCANNED TODAY (${todayDateStr}): Ticket ${matched.ticketId || rawInput} was already verified at ${scanTime} at ${scanGate}. Same-day re-entry requires wristband verification.`,
      guestName: matched.name,
      guestEmail: matched.email,
      ticketId: matched.ticketId,
      tier: matched.tier,
      ticketStatus: 'Checked In',
      checkInStatus: 'Checked In',
      scannedToday: true,
      scanDate: todayDateStr,
      scanTime: scanTime,
      scanGate: scanGate,
      attendee: {
        ...matched,
        ticketStatus: 'Checked In',
        checkInStatus: 'Checked In',
        checkedIn: true,
      },
      scannedAt: timeFormatted,
    });
  }

  // --- SUCCESSFUL CHECK-IN FOR TODAY ---
  const newScanRecord = {
    date: todayDateStr,
    time: timeFormatted,
    timestampIso: nowIso,
    gate: gate,
    scannedBy: scannedBy,
    timestamp: Date.now(),
  };

  const existingHistory = Array.isArray(matched.checkInHistory) ? matched.checkInHistory : [];
  const updatedHistory = [...existingHistory, newScanRecord];
  const updatedDailyMap = {
    ...(matched.dailyCheckIns || {}),
    [todayDateStr]: newScanRecord,
  };

  const totalDaysAttended = Object.keys(updatedDailyMap).length;

  const updated = {
    ...matched,
    checkedIn: true,
    checkedInAt: nowIso,
    ticketStatus: 'Checked In',
    checkInStatus: 'Checked In',
    scannedGate: gate,
    scannedBy: scannedBy,
    dailyCheckIns: updatedDailyMap,
    checkInHistory: updatedHistory,
  };
  store.registrations.set(matched.id, updated);

  if (matchedDocId && db) {
    try {
      await updateDoc(doc(db, 'registrations', matchedDocId), {
        checkedIn: true,
        checkedInAt: nowIso,
        ticketStatus: 'Checked In',
        checkInStatus: 'Checked In',
        scannedGate: gate,
        scannedBy: scannedBy,
        dailyCheckIns: updatedDailyMap,
        checkInHistory: updatedHistory,
      });
    } catch (e) {
      console.error('Error updating doc in Firestore in api/check-in:', e);
    }
  }

  // Record today's scan in in-memory store for instant zero-latency caching
  const memKeyToday = `${rawInput}_${todayDateStr}`;
  store.checkedInTickets.set(memKeyToday, newScanRecord);
  store.checkedInTickets.set(`${queryUpper}_${todayDateStr}`, newScanRecord);
  if (matched.ticketId) {
    store.checkedInTickets.set(`${matched.ticketId.toUpperCase()}_${todayDateStr}`, newScanRecord);
  }
  if (matched.id) {
    store.checkedInTickets.set(`${matched.id.toUpperCase()}_${todayDateStr}`, newScanRecord);
  }

  const activity = {
    id: `ACT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type: 'checkin',
    title: `${updated.name} checked in (Day ${totalDaysAttended})`,
    description: `Gate: ${gate} · Scanned by: ${scannedBy} (${updated.tier})`,
    timestamp: timeFormatted,
    timeAgo: 'Just now',
    createdAt: Date.now(),
    attendeeName: updated.name,
    ticketId: updated.ticketId,
  };
  store.activities.unshift(activity);

  return res.status(200).json({
    success: true,
    status: 'valid',
    message: `PASS VERIFIED: Welcome, ${updated.name}! Access granted for ${updated.tier} (${todayDateStr} · Day ${totalDaysAttended}).`,
    guestName: updated.name,
    guestEmail: updated.email,
    ticketId: updated.ticketId,
    tier: updated.tier,
    gate: gate,
    checkInDate: todayDateStr,
    checkInTime: timeFormatted,
    totalDaysAttended: totalDaysAttended,
    ticketStatus: 'Checked In',
    checkInStatus: 'Checked In',
    attendee: updated,
    scannedAt: timeFormatted,
  });
  } catch (err) {
    console.error('Serverless check-in exception:', err);
    return res.status(500).json({
      success: false,
      status: 'invalid',
      message: `Server check-in error: ${err?.message || err}`,
      scannedAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    });
  }
}
