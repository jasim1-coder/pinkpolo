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

  if (req.method === 'POST') {
    const body = await getRequestBody(req);
    const { updatedRegistrations, updatedStats } = body || {};

    if (Array.isArray(updatedRegistrations)) {
      updatedRegistrations.forEach((r) => {
        // If this attendee was previously checked in on the server, preserve their check-in status
        const checkedInfo = store.checkedInTickets.get(r.ticketId) || store.checkedInTickets.get(r.id);
        if (checkedInfo) {
          store.registrations.set(r.id, {
            ...r,
            checkedIn: true,
            checkedInAt: checkedInfo.checkedInAt || r.checkedInAt,
          });
        } else {
          store.registrations.set(r.id, r);
        }
      });
    }

    return res.status(200).json({
      success: true,
      count: store.registrations.size,
      scannedTicketsCount: store.checkedInTickets.size,
    });
  }

  // GET: Return current registrations and list of all scanned ticket IDs
  const regs = Array.from(store.registrations.values());
  const checkedInMap = Object.fromEntries(store.checkedInTickets);

  return res.status(200).json({
    success: true,
    registrations: regs,
    checkedInTickets: checkedInMap,
    activities: store.activities.slice(0, 30),
  });
}
