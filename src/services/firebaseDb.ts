import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  updateDoc,
  query,
  Firestore,
} from 'firebase/firestore';
import { getApps, initializeApp, getApp } from 'firebase/app';
import firebaseConfig from '../../firebase-applet-config.json';
import { Registration, ActivityItem, DashboardStats } from '../types';
import { INITIAL_REGISTRATIONS } from '../data/mockData';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db: Firestore = getFirestore(app);

const REGISTRATIONS_COL = 'registrations';
const ACTIVITIES_COL = 'activities';
const META_DOC = 'meta/stats';

/**
 * Real-time subscription to all registrations in Firestore.
 * Automatically updates when an external scanner or admin updates an attendee.
 */
export const subscribeToRegistrations = (
  onUpdate: (registrations: Registration[]) => void,
  onError?: (error: Error) => void
) => {
  try {
    const regCollection = collection(db, REGISTRATIONS_COL);
    const unsubscribe = onSnapshot(
      regCollection,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: Registration[] = [];
          snapshot.forEach((docSnap) => {
            list.push(docSnap.data() as Registration);
          });
          onUpdate(list);
        } else {
          // Initialize/seed if empty
          seedInitialRegistrations();
        }
      },
      (err) => {
        console.warn('Firestore subscription error (using local state fallback):', err);
        if (onError) onError(err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Could not initialize Firestore snapshot listener:', err);
    return () => {};
  }
};

/**
 * Real-time subscription to activities
 */
export const subscribeToActivities = (
  onUpdate: (activities: ActivityItem[]) => void
) => {
  try {
    const actCollection = collection(db, ACTIVITIES_COL);
    const unsubscribe = onSnapshot(
      actCollection,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: ActivityItem[] = [];
          snapshot.forEach((docSnap) => {
            list.push(docSnap.data() as ActivityItem);
          });
          // Sort descending by createdAt
          list.sort((a, b) => b.createdAt - a.createdAt);
          onUpdate(list);
        }
      },
      (err) => {
        console.warn('Firestore activities subscription error:', err);
      }
    );
    return unsubscribe;
  } catch {
    return () => {};
  }
};

/**
 * Seed initial mock registrations to Firestore if empty
 */
export const seedInitialRegistrations = async () => {
  try {
    const colRef = collection(db, REGISTRATIONS_COL);
    const existing = await getDocs(colRef);
    if (existing.empty) {
      for (const reg of INITIAL_REGISTRATIONS) {
        await setDoc(doc(db, REGISTRATIONS_COL, reg.id), reg);
      }
    }
  } catch (err) {
    console.warn('Could not seed initial registrations to Firestore:', err);
  }
};

/**
 * Save / update a single registration in Firestore
 */
export const saveRegistrationToFirestore = async (registration: Registration) => {
  try {
    await setDoc(doc(db, REGISTRATIONS_COL, registration.id), registration, { merge: true });
  } catch (err) {
    console.warn('Could not save registration to Firestore:', err);
  }
};

/**
 * Record a check-in activity in Firestore
 */
export const logActivityToFirestore = async (activity: ActivityItem) => {
  try {
    await setDoc(doc(db, ACTIVITIES_COL, activity.id), activity);
  } catch (err) {
    console.warn('Could not log activity to Firestore:', err);
  }
};

/**
 * Perform a live check-in on Firestore by Ticket ID, QR string, or Registration ID.
 */
export const checkInAttendeeInFirestore = async (
  ticketIdOrQr: string,
  gate = 'Main Gate',
  scannedBy = 'External Scanner'
): Promise<{
  success: boolean;
  status: 'valid' | 'already_used' | 'invalid';
  message: string;
  attendee?: Registration;
}> => {
  const rawInput = ticketIdOrQr.trim();
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
    let matchedAttendee: Registration | null = null;
    const digitsOnly = queryUpper.replace(/[^0-9]/g, '');

    snapshot.forEach((docSnap) => {
      const r = docSnap.data() as Registration;
      const tid = (r.ticketId || '').toUpperCase();
      const qv = (r.qrValue || '').toUpperCase();
      const rid = (r.id || '').toUpperCase();
      const tDigits = tid.replace(/[^0-9]/g, '');

      if (
        (tid && tid === queryUpper) ||
        (qv && qv === queryUpper) ||
        (rid && rid === queryUpper) ||
        (tid && queryUpper.includes(tid)) ||
        (qv && queryUpper.includes(qv)) ||
        (rid && queryUpper.includes(rid)) ||
        (tid && tid.includes(queryUpper)) ||
        (rid && rid.includes(queryUpper)) ||
        (digitsOnly && digitsOnly.length >= 4 && tDigits.endsWith(digitsOnly)) ||
        (digitsOnly && digitsOnly.length >= 4 && tDigits.includes(digitsOnly))
      ) {
        matchedDocId = docSnap.id;
        matchedAttendee = r;
      }
    });

    if (!matchedAttendee || !matchedDocId) {
      return {
        success: false,
        status: 'invalid',
        message: `Invalid Pass: Barcode "${rawInput}" is not recognized in the database.`,
      };
    }

    const attendee = matchedAttendee as Registration;

    if (attendee.status !== 'Approved') {
      return {
        success: false,
        status: 'invalid',
        message: `Entry Denied: Attendee ${attendee.name} has status "${attendee.status}". Entry pass not activated.`,
        attendee,
      };
    }

    if (attendee.checkedIn) {
      return {
        success: false,
        status: 'already_used',
        message: `ALREADY SCANNED: Ticket ${attendee.ticketId} was already used by ${attendee.name} at ${attendee.checkedInAt}.`,
        attendee,
      };
    }

    // Mark as Checked In directly in Firestore
    const updatedAttendee: Registration = {
      ...attendee,
      checkedIn: true,
      checkedInAt: nowIso,
    };

    await updateDoc(doc(db, REGISTRATIONS_COL, matchedDocId), {
      checkedIn: true,
      checkedInAt: nowIso,
    });

    // Log Activity to Firestore
    const activity: ActivityItem = {
      id: `ACT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: 'checkin',
      title: `${updatedAttendee.name} checked in`,
      description: `Gate: ${gate} · Scanned by: ${scannedBy} (${updatedAttendee.tier})`,
      timestamp: timeFormatted,
      timeAgo: 'Just now',
      createdAt: Date.now(),
      attendeeName: updatedAttendee.name,
      ticketId: updatedAttendee.ticketId,
    };
    await logActivityToFirestore(activity);

    return {
      success: true,
      status: 'valid',
      message: `Pass Verified: ${updatedAttendee.name} cleared for entry.`,
      attendee: updatedAttendee,
    };
  } catch (err: any) {
    console.error('Check-in Firestore error:', err);
    return {
      success: false,
      status: 'invalid',
      message: `Database error during check-in: ${err?.message || err}`,
    };
  }
};
