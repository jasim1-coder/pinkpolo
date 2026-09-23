import { INITIAL_REGISTRATIONS } from '../src/data/mockData';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const list = INITIAL_REGISTRATIONS;
  const total = list.length;
  const approved = list.filter((r) => r.status === 'Approved').length;
  const checkedIn = list.filter((r) => r.checkedIn).length;
  const pending = list.filter((r) => r.status === 'Pending').length;
  const rejected = list.filter((r) => r.status === 'Rejected').length;

  return res.status(200).json({
    success: true,
    registrations: list,
    stats: {
      totalRegistrations: total,
      approved,
      pendingApproval: pending,
      rejected,
      checkedIn,
      ticketsGenerated: approved,
    },
  });
}
