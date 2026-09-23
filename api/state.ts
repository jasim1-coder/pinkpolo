import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

const REGISTRATIONS_COL = 'registrations';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const colRef = collection(db, REGISTRATIONS_COL);
    const snapshot = await getDocs(colRef);
    const list: any[] = [];
    snapshot.forEach((d) => list.push(d.data()));

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
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Database error',
    });
  }
}
