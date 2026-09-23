import { store } from './_store.js';

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

  const queryUpper = rawInput.toUpperCase();
  const timeFormatted = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const nowIso = new Date().toISOString().replace('T', ' ').substring(0, 16);

  // Check if ticket was already marked as checked-in in the store
  const previousScan = store.checkedInTickets.get(rawInput) || store.checkedInTickets.get(queryUpper);

  const digitsOnly = queryUpper.replace(/[^0-9]/g, '');

  let matched = null;
  for (const r of store.registrations.values()) {
    const tid = (r.ticketId || '').toUpperCase();
    const qv = (r.qrValue || '').toUpperCase();
    const rid = (r.id || '').toUpperCase();
    const tDigits = tid.replace(/[^0-9]/g, '');

    if (
      (tid && tid === queryUpper) ||
      (qv && qv === queryUpper) ||
      (rid && rid === queryUpper) ||
      (tid && tid.includes(queryUpper)) ||
      (tid && queryUpper.includes(tid)) ||
      (qv && qv.includes(queryUpper)) ||
      (qv && queryUpper.includes(qv)) ||
      (rid && queryUpper.includes(rid)) ||
      (rid && rid.includes(queryUpper)) ||
      (digitsOnly && digitsOnly.length >= 4 && tDigits.endsWith(digitsOnly))
    ) {
      matched = r;
      break;
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

  // Duplicate Check
  if (matched.checkedIn || previousScan) {
    const existingTime = matched.checkedInAt || previousScan?.checkedInAt || nowIso;
    return res.status(409).json({
      success: false,
      status: 'already_used',
      message: `ALREADY SCANNED: Ticket ${matched.ticketId || rawInput} was already used by ${matched.name} at ${existingTime}.`,
      guestName: matched.name,
      guestEmail: matched.email,
      ticketId: matched.ticketId,
      tier: matched.tier,
      ticketStatus: 'Checked In',
      checkInStatus: 'Checked In',
      attendee: {
        ...matched,
        ticketStatus: 'Checked In',
        checkInStatus: 'Checked In',
        checkedIn: true,
        checkedInAt: existingTime,
      },
      scannedAt: timeFormatted,
    });
  }

  // Successful Check-In!
  const updated = {
    ...matched,
    checkedIn: true,
    checkedInAt: nowIso,
    ticketStatus: 'Checked In',
    checkInStatus: 'Checked In',
    scannedGate: gate,
    scannedBy: scannedBy,
  };
  store.registrations.set(matched.id, updated);

  const scannedKey = matched.ticketId || rawInput;

  // Store in scanned tickets lookup by ticket ID, qr value, and ID
  const scanData = {
    ticketId: matched.ticketId || rawInput,
    id: matched.id,
    attendeeName: matched.name,
    checkedInAt: nowIso,
    ticketStatus: 'Checked In',
    checkInStatus: 'Checked In',
    gate,
    scannedBy,
  };
  store.checkedInTickets.set(rawInput, scanData);
  store.checkedInTickets.set(queryUpper, scanData);
  if (matched.ticketId) {
    store.checkedInTickets.set(matched.ticketId.toUpperCase(), scanData);
    store.checkedInTickets.set(matched.ticketId, scanData);
  }
  if (matched.id) {
    store.checkedInTickets.set(matched.id, scanData);
  }

  const activity = {
    id: `ACT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type: 'checkin',
    title: `${updated.name} checked in via Scanner`,
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
    message: `PASS VERIFIED: Welcome, ${updated.name}! Access granted for ${updated.tier}.`,
    guestName: updated.name,
    guestEmail: updated.email,
    ticketId: updated.ticketId,
    tier: updated.tier,
    ticketStatus: 'Checked In',
    checkInStatus: 'Checked In',
    attendee: updated,
    gate,
    scannedAt: timeFormatted,
  });
}
