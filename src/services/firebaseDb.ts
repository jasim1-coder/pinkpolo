import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  updateDoc,
  Firestore,
} from 'firebase/firestore';
import { getApps, initializeApp, getApp } from 'firebase/app';
import firebaseConfig from '../../firebase-applet-config.json';
import { Registration, ActivityItem } from '../types';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db: Firestore = getFirestore(app);

const REGISTRATIONS_COL = 'registrations';
const ACTIVITIES_COL = 'activities';

/**
 * Remove any undefined properties from object to satisfy Firestore SDK serialization rules
 */
export const sanitizeForFirestore = <T extends Record<string, any>>(obj: T): Record<string, any> => {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        cleaned[key] = sanitizeForFirestore(value);
      } else {
        cleaned[key] = value;
      }
    }
  }
  return cleaned;
};

/**
 * Real-time subscription to all registrations in Firestore DB.
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
          onUpdate([]);
        }
      },
      (err) => {
        console.warn('Firestore subscription notice (using local state fallback):', err);
        if (onError) onError(err);
      }
    );
    return unsubscribe;
  } catch (err: any) {
    console.warn('Could not initialize Firestore snapshot listener:', err);
    if (onError) onError(err);
    return () => {};
  }
};

/**
 * Real-time subscription to live activities in Firestore DB.
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
        } else {
          onUpdate([]);
        }
      },
      (err) => {
        console.warn('Firestore activities subscription notice:', err);
      }
    );
    return unsubscribe;
  } catch {
    return () => {};
  }
};

/**
 * Save / update a single registration in Firestore DB (with clean undefined stripping)
 */
export const saveRegistrationToFirestore = async (registration: Registration): Promise<boolean> => {
  try {
    const enriched: Registration = {
      ...registration,
      checkInStatus: registration.checkedIn ? 'Checked In' : 'Not Checked In',
      ticketStatus: registration.checkedIn
        ? 'Checked In'
        : registration.ticketStatus || (registration.status === 'Approved' ? 'Valid' : 'Pending'),
    };
    const cleaned = sanitizeForFirestore(enriched);
    await setDoc(doc(db, REGISTRATIONS_COL, registration.id), cleaned, { merge: true });
    console.log(`[Firestore] Registration ${registration.id} saved with status: ${registration.status}, ticketStatus: ${enriched.ticketStatus}`);
    return true;
  } catch (err) {
    console.error('CRITICAL: Could not save registration to Firestore DB:', err);
    return false;
  }
};

/**
 * Record a check-in / approval / registration activity in Firestore DB
 */
export const logActivityToFirestore = async (activity: ActivityItem): Promise<boolean> => {
  try {
    const cleaned = sanitizeForFirestore(activity);
    await setDoc(doc(db, ACTIVITIES_COL, activity.id), cleaned);
    return true;
  } catch (err) {
    console.error('Could not log activity to Firestore DB:', err);
    return false;
  }
};

/**
 * Perform a live check-in on Firestore DB by Ticket ID, QR string, or Registration ID.
 */
export const checkInAttendeeInFirestore = async (
  ticketIdOrQr: string,
  gate = 'Main Gate',
  scannedBy = 'External Scanner'
): Promise<{
  success: boolean;
  status: 'valid' | 'already_used' | 'invalid';
  message: string;
  guestName?: string;
  guestEmail?: string;
  ticketId?: string;
  tier?: string;
  ticketStatus?: string;
  checkInStatus?: string;
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

    let jsonTicketId = '';
    let jsonRegId = '';
    try {
      if (rawInput.startsWith('{') && rawInput.endsWith('}')) {
        const parsed = JSON.parse(rawInput);
        jsonTicketId = (parsed.ticketId || parsed.ticket_id || '').toUpperCase();
        jsonRegId = (parsed.id || parsed.regId || parsed.registrationId || '').toUpperCase();
      }
    } catch {}

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
        (jsonTicketId && tid && tid === jsonTicketId) ||
        (jsonRegId && rid && rid === jsonRegId) ||
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
        guestName: attendee.name,
        guestEmail: attendee.email,
        ticketId: attendee.ticketId,
        tier: attendee.tier,
        attendee,
      };
    }

    // --- MULTI-DAY CHECK-IN & ANTI-PASSBACK VALIDATION ---
    const todayDateStr = new Date().toISOString().slice(0, 10);
    const dailyMap = attendee.dailyCheckIns || {};
    let scannedTodayRecord = dailyMap[todayDateStr] || null;

    if (!scannedTodayRecord && attendee.checkedIn && attendee.checkedInAt) {
      if (attendee.checkedInAt.startsWith(todayDateStr)) {
        scannedTodayRecord = {
          date: todayDateStr,
          time: attendee.checkedInAt.split(' ')[1] || timeFormatted,
          timestampIso: attendee.checkedInAt,
          gate: attendee.scannedGate || gate,
          scannedBy: attendee.scannedBy || scannedBy,
          timestamp: Date.now(),
        };
      }
    }

    if (scannedTodayRecord) {
      const scanTime = scannedTodayRecord.time || timeFormatted;
      const scanGate = scannedTodayRecord.gate || attendee.scannedGate || gate;
      return {
        success: false,
        status: 'already_used',
        message: `ALREADY SCANNED TODAY (${todayDateStr}): Ticket ${attendee.ticketId || rawInput} was already verified at ${scanTime} at ${scanGate}. Same-day re-entry requires wristband verification.`,
        guestName: attendee.name,
        guestEmail: attendee.email,
        ticketId: attendee.ticketId,
        tier: attendee.tier,
        ticketStatus: 'Checked In',
        checkInStatus: 'Checked In',
        attendee,
      };
    }

    // Record check-in for today
    const newScanRecord = {
      date: todayDateStr,
      time: timeFormatted,
      timestampIso: nowIso,
      gate: gate,
      scannedBy: scannedBy,
      timestamp: Date.now(),
    };

    const existingHistory = Array.isArray(attendee.checkInHistory) ? attendee.checkInHistory : [];
    const updatedHistory = [...existingHistory, newScanRecord];
    const updatedDailyMap = {
      ...(attendee.dailyCheckIns || {}),
      [todayDateStr]: newScanRecord,
    };
    const totalDaysAttended = Object.keys(updatedDailyMap).length;

    // Mark as Checked In directly in Firestore DB
    const updatedAttendee: Registration = {
      ...attendee,
      checkedIn: true,
      checkedInAt: nowIso,
      ticketStatus: 'Checked In',
      checkInStatus: 'Checked In',
      scannedGate: gate,
      scannedBy: scannedBy,
      dailyCheckIns: updatedDailyMap,
      checkInHistory: updatedHistory,
    };

    await updateDoc(doc(db, REGISTRATIONS_COL, matchedDocId), {
      checkedIn: true,
      checkedInAt: nowIso,
      ticketStatus: 'Checked In',
      checkInStatus: 'Checked In',
      scannedGate: gate,
      scannedBy: scannedBy,
      dailyCheckIns: updatedDailyMap,
      checkInHistory: updatedHistory,
    });

    // Log Activity to Firestore DB
    const activity: ActivityItem = {
      id: `ACT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: 'checkin',
      title: `${updatedAttendee.name} checked in (Day ${totalDaysAttended})`,
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
      message: `PASS VERIFIED: Welcome, ${updatedAttendee.name}! Access granted for ${updatedAttendee.tier} (${todayDateStr} · Day ${totalDaysAttended}).`,
      guestName: updatedAttendee.name,
      guestEmail: updatedAttendee.email,
      ticketId: updatedAttendee.ticketId,
      tier: updatedAttendee.tier,
      ticketStatus: 'Checked In',
      checkInStatus: 'Checked In',
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
