// Shared in-memory and persistence store for Vercel Serverless Functions

// Global persistent cache in process
if (!globalThis.__PINK_POLO_STORE) {
  globalThis.__PINK_POLO_STORE = {
    registrations: new Map(),
    checkedInTickets: new Map(), // ticketId/qr -> { checkedInAt, gate, scannedBy, attendee }
    activities: [],
  };
}

export const store = globalThis.__PINK_POLO_STORE;
