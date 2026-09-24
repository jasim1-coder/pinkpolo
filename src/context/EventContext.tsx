import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { Registration, ActivityItem, DashboardStats, ToastMessage, RegistrationStatus, AttendeeTier } from '../types';
import { MOCK_CANDIDATE_NAMES, EMPTY_DASHBOARD_STATS } from '../data/mockData';
import {
  subscribeToRegistrations,
  subscribeToActivities,
  saveRegistrationToFirestore,
  checkInAttendeeInFirestore,
  logActivityToFirestore,
} from '../services/firebaseDb';

export interface ScanResult {
  status: 'valid' | 'already_used' | 'invalid';
  registration?: Registration;
  guestName?: string;
  guestEmail?: string;
  ticketId?: string;
  tier?: string;
  ticketStatus?: string;
  checkInStatus?: string;
  message: string;
  scannedAt: string;
}

export interface AttendeeSubmissionInput {
  name: string;
  email: string;
  whatsapp: string;
  tier: AttendeeTier;
  company?: string;
  notes?: string;
}

interface EventContextType {
  registrations: Registration[];
  activities: ActivityItem[];
  stats: DashboardStats;
  toasts: ToastMessage[];
  autoSimulateEnabled: boolean;
  selectedRegistration: Registration | null;
  selectedTicketPass: Registration | null;
  lastScanResult: ScanResult | null;
  toggleAutoSimulate: () => void;
  simulateNewRegistration: () => Registration;
  submitAttendeeRegistration: (input: AttendeeSubmissionInput) => Registration;
  approveRegistration: (id: string) => void;
  rejectRegistration: (id: string, reason?: string) => void;
  scanTicket: (ticketIdOrQr: string) => ScanResult;
  simulateScanRandomTicket: () => ScanResult;
  dismissToast: (id: string) => void;
  addToast: (type: ToastMessage['type'], title: string, message?: string) => void;
  addActivity: (type: ActivityItem['type'], title: string, description: string, attendeeName: string, ticketId?: string) => void;
  setSelectedRegistration: (reg: Registration | null) => void;
  setSelectedTicketPass: (reg: Registration | null) => void;
  setLastScanResult: (res: ScanResult | null) => void;
  resetToDefault: () => void;
  pwaModalOpen: boolean;
  setPwaModalOpen: (open: boolean) => void;
  isServerConnected: boolean;
  isLoading: boolean;
}

const STORAGE_KEYS = {
  REGISTRATIONS: 'pink_polo_2026_db_registrations',
  ACTIVITIES: 'pink_polo_2026_db_activities',
  STATS: 'pink_polo_2026_db_stats',
  AUTO_SIMULATE: 'pink_polo_2026_db_auto_simulate',
};

// Clean legacy mock keys if present in browser storage
try {
  localStorage.removeItem('pink_polo_2026_registrations');
  localStorage.removeItem('pink_polo_2026_activities');
  localStorage.removeItem('pink_polo_2026_stats');
} catch {}

/**
 * Derives accurate, real-time KPI counts directly from active database registrations.
 */
export const computeStatsFromRegistrations = (regs: Registration[]): DashboardStats => {
  const approved = regs.filter((r) => r.status === 'Approved').length;
  const pending = regs.filter((r) => r.status === 'Pending').length;
  const rejected = regs.filter((r) => r.status === 'Rejected').length;
  const tickets = regs.filter((r) => r.status === 'Approved' && Boolean(r.ticketId)).length;
  const checked = regs.filter((r) => r.checkedIn).length;

  return {
    totalRegistrations: regs.length,
    pendingApproval: pending,
    approved,
    rejected,
    ticketsGenerated: tickets,
    checkedIn: checked,
  };
};

const EventContext = createContext<EventContextType | undefined>(undefined);

export const EventProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [registrations, setRegistrations] = useState<Registration[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.REGISTRATIONS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [activities, setActivities] = useState<ActivityItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ACTIVITIES);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [stats, setStats] = useState<DashboardStats>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.STATS);
      if (stored) return JSON.parse(stored);
      const regsStored = localStorage.getItem(STORAGE_KEYS.REGISTRATIONS);
      if (regsStored) return computeStatsFromRegistrations(JSON.parse(regsStored));
      return EMPTY_DASHBOARD_STATS;
    } catch {
      return EMPTY_DASHBOARD_STATS;
    }
  });

  const [autoSimulateEnabled, setAutoSimulateEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.AUTO_SIMULATE);
      return stored ? JSON.parse(stored) : false;
    } catch {
      return false;
    }
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
  const [selectedTicketPass, setSelectedTicketPass] = useState<Registration | null>(null);
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);
  const [pwaModalOpen, setPwaModalOpen] = useState(false);
  const [isServerConnected, setIsServerConnected] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Track known checked-in IDs to trigger live alerts only on new check-ins
  const initialCheckedInIdsRef = useRef<Set<string>>(new Set());

  const addToast = useCallback((type: ToastMessage['type'], title: string, message?: string) => {
    const id = 'toast-' + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [{ id, type, title, message, timestamp: Date.now() }, ...prev.slice(0, 4)]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  // Sync to localStorage for offline cache
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(registrations));
    } catch (e) {
      console.error(e);
    }
  }, [registrations]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activities));
    } catch (e) {
      console.error(e);
    }
  }, [activities]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
    } catch (e) {
      console.error(e);
    }
  }, [stats]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.AUTO_SIMULATE, JSON.stringify(autoSimulateEnabled));
    } catch (e) {
      console.error(e);
    }
  }, [autoSimulateEnabled]);

  // Initial fetch from backend API & real-time Firestore DB listeners
  useEffect(() => {
    let isMounted = true;

    // Fast initial state hydration from /api/state if available
    fetch('/api/state')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data) return;
        if (Array.isArray(data.registrations) && data.registrations.length > 0) {
          setRegistrations(data.registrations);
          setStats(computeStatsFromRegistrations(data.registrations));
        }
        if (Array.isArray(data.activities) && data.activities.length > 0) {
          setActivities(data.activities);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    // Populate baseline checked-in IDs
    registrations.forEach((r) => {
      if (r.checkedIn) initialCheckedInIdsRef.current.add(r.id);
    });

    // Real-time Cloud Firestore Listener for all database registrations
    const unsubscribeFirestore = subscribeToRegistrations(
      (cloudList) => {
        if (!isMounted) return;
        setIsLoading(false);

        // Detect newly checked-in attendees to show real-time turnstile toast
        cloudList.forEach((cloudReg) => {
          if (cloudReg.checkedIn && !initialCheckedInIdsRef.current.has(cloudReg.id)) {
            initialCheckedInIdsRef.current.add(cloudReg.id);
            addToast(
              'success',
              '📱 Live Turnstile Gate Scan!',
              `${cloudReg.name} (${cloudReg.tier}) verified for gate entry`
            );
          }
        });

        setRegistrations(cloudList);
        const derivedStats = computeStatsFromRegistrations(cloudList);
        setStats(derivedStats);
        setIsServerConnected(true);

        // Sync with server API
        fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updatedRegistrations: cloudList, updatedStats: derivedStats }),
        }).catch(() => {});
      },
      (err) => {
        console.warn('Firestore subscription status:', err);
        if (isMounted) setIsLoading(false);
      }
    );

    // Real-time Firestore Listener for activities
    const unsubscribeActivities = subscribeToActivities((cloudActivities) => {
      if (!isMounted) return;
      if (cloudActivities) {
        setActivities(cloudActivities.slice(0, 50));
      }
    });

    return () => {
      isMounted = false;
      unsubscribeFirestore();
      unsubscribeActivities();
    };
  }, [addToast]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addActivity = useCallback((type: ActivityItem['type'], title: string, description: string, attendeeName: string, ticketId?: string) => {
    const newItem: ActivityItem = {
      id: 'act-' + Math.random().toString(36).substring(2, 9),
      type,
      title,
      description,
      timestamp: 'Just now',
      timeAgo: 'Just now',
      createdAt: Date.now(),
      attendeeName,
      ticketId,
    };
    setActivities((prev) => [newItem, ...prev.slice(0, 49)]);
    logActivityToFirestore(newItem);
  }, []);

  // Update relative timestamps in activities every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setActivities((prev) =>
        prev.map((act) => {
          const diffMs = Date.now() - act.createdAt;
          const diffMins = Math.floor(diffMs / 60000);
          let timeAgo = 'Just now';
          let timestamp = 'Just now';
          if (diffMins < 1) {
            timeAgo = 'Just now';
            timestamp = 'Just now';
          } else if (diffMins === 1) {
            timeAgo = '1m ago';
            timestamp = '1 minute ago';
          } else if (diffMins < 60) {
            timeAgo = `${diffMins}m ago`;
            timestamp = `${diffMins} minutes ago`;
          } else {
            const hours = Math.floor(diffMins / 60);
            timeAgo = `${hours}h ago`;
            timestamp = `${hours} hour${hours > 1 ? 's' : ''} ago`;
          }
          return { ...act, timeAgo, timestamp };
        })
      );
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Quick Simulation of an Attendee Registration (saved to Firestore DB)
  const simulateNewRegistration = useCallback((): Registration => {
    const poolIndex = Math.floor(Math.random() * MOCK_CANDIDATE_NAMES.length);
    const candidate = MOCK_CANDIDATE_NAMES[poolIndex];
    const randSuffix = Math.floor(10 + Math.random() * 89);
    const uniqueEmail = candidate.email.replace('@', `${randSuffix}@`);
    const dateStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const regId = `REG-2026-${1000 + registrations.length + 1}`;

    const newReg: Registration = {
      id: regId,
      name: candidate.name,
      email: uniqueEmail,
      whatsapp: candidate.phone,
      registrationDate: dateStr,
      status: 'Pending',
      tier: candidate.tier,
      checkedIn: false,
    };

    const nextList = [newReg, ...registrations];
    setRegistrations(nextList);
    setStats(computeStatsFromRegistrations(nextList));

    // Save directly to Firestore DB
    saveRegistrationToFirestore(newReg);

    const newAct: ActivityItem = {
      id: `act-${Date.now()}`,
      type: 'registration',
      title: 'New registration received',
      description: `${newReg.name} (${newReg.email}) registered for ${newReg.tier}`,
      timestamp: 'Just now',
      timeAgo: 'Just now',
      createdAt: Date.now(),
      attendeeName: newReg.name,
    };

    setActivities((prev) => [newAct, ...prev.slice(0, 49)]);
    logActivityToFirestore(newAct);

    addToast('info', 'New registration received', `${newReg.name} · ${newReg.email}`);

    // Sync to backend
    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updatedRegistrations: [newReg],
        newActivity: newAct,
      }),
    }).catch(() => {});

    return newReg;
  }, [registrations, addToast]);

  // Public Attendee Self-Registration Submission (saved to Firestore DB)
  const submitAttendeeRegistration = useCallback((input: AttendeeSubmissionInput): Registration => {
    const dateStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const regId = `REG-2026-${1000 + registrations.length + 1}`;

    const newReg: Registration = {
      id: regId,
      name: input.name.trim(),
      email: input.email.trim(),
      whatsapp: input.whatsapp.trim(),
      registrationDate: dateStr,
      status: 'Pending',
      tier: input.tier,
      notes: input.company ? `Organization: ${input.company}. ${input.notes || ''}`.trim() : input.notes,
      checkedIn: false,
    };

    const nextList = [newReg, ...registrations];
    setRegistrations(nextList);
    setStats(computeStatsFromRegistrations(nextList));

    // Save directly to Firestore DB
    saveRegistrationToFirestore(newReg);

    const newAct: ActivityItem = {
      id: `act-${Date.now()}`,
      type: 'registration',
      title: 'New registration request',
      description: `${newReg.name} (${newReg.email}) submitted request for ${newReg.tier}`,
      timestamp: 'Just now',
      timeAgo: 'Just now',
      createdAt: Date.now(),
      attendeeName: newReg.name,
    };

    setActivities((prev) => [newAct, ...prev.slice(0, 49)]);
    logActivityToFirestore(newAct);

    addToast('info', 'New registration received', `${newReg.name} · ${newReg.tier}`);

    // Sync with backend API
    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updatedRegistrations: [newReg],
        newActivity: newAct,
      }),
    }).catch(() => {});

    return newReg;
  }, [registrations, addToast]);

  // Approve Flow (Generates ticket & saves directly to DB)
  const approveRegistration = useCallback((id: string) => {
    const reg = registrations.find((r) => r.id === id);
    if (!reg) return;

    if (reg.status === 'Approved') {
      addToast('info', 'Already Approved', `${reg.name} has already been approved.`);
      return;
    }

    const ticketSeq = Math.floor(100000 + Math.random() * 900000);
    const ticketId = reg.ticketId || `PINK-2026-00${ticketSeq.toString().slice(-4)}`;
    const qrData = {
      event: 'PINK_POLO_2026',
      ticketId,
      id: reg.id,
      name: reg.name,
      email: reg.email,
      tier: reg.tier,
      gate: reg.tier === 'VIP Pavilion' ? 'Gate 1 (Royal Pavilion)' : 'Gate 2 (Main Gate)',
      status: 'Approved',
      valid: true,
    };
    const qrValue = JSON.stringify(qrData);
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);

    const updatedReg: Registration = {
      ...reg,
      status: 'Approved',
      ticketId,
      qrValue,
      ticketGeneratedAt: now,
      ticketStatus: 'Valid',
      checkInStatus: 'Not Checked In',
      checkedIn: false,
    };
    delete (updatedReg as any).rejectionReason;

    const nextList = registrations.map((item) => (item.id === id ? updatedReg : item));
    setRegistrations(nextList);
    setStats(computeStatsFromRegistrations(nextList));

    // Save directly to Firestore DB
    saveRegistrationToFirestore(updatedReg);

    if (selectedRegistration?.id === id) {
      setSelectedRegistration(updatedReg);
    }

    const approvalAct: ActivityItem = {
      id: `act-${Date.now()}-1`,
      type: 'approval',
      title: `${reg.name} was approved`,
      description: `Registration ${reg.id} verified and approved by Admin`,
      timestamp: 'Just now',
      timeAgo: 'Just now',
      createdAt: Date.now(),
      attendeeName: reg.name,
    };

    const ticketAct: ActivityItem = {
      id: `act-${Date.now()}-2`,
      type: 'ticket',
      title: `Ticket ${ticketId} issued`,
      description: `Official e-Pass issued for ${reg.name} (${reg.tier})`,
      timestamp: 'Just now',
      timeAgo: 'Just now',
      createdAt: Date.now(),
      attendeeName: reg.name,
      ticketId,
    };

    setActivities((prev) => [ticketAct, approvalAct, ...prev.slice(0, 48)]);
    logActivityToFirestore(approvalAct);
    logActivityToFirestore(ticketAct);

    addToast('success', 'Registration approved & ticket generated', `Ticket ID: ${ticketId} issued for ${reg.name}`);

    // Sync to server API
    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updatedRegistrations: [updatedReg],
        newActivity: ticketAct,
      }),
    }).catch(() => {});
  }, [registrations, selectedRegistration, addToast]);

  // Reject Flow (saves directly to DB)
  const rejectRegistration = useCallback((id: string, reason = 'Administrative review - invitation quota limit reached') => {
    const reg = registrations.find((r) => r.id === id);
    if (!reg) return;

    if (reg.status === 'Rejected') {
      addToast('info', 'Already Rejected', `${reg.name} is already marked as rejected.`);
      return;
    }

    const updatedReg: Registration = {
      ...reg,
      status: 'Rejected',
      rejectionReason: reason,
    };
    delete (updatedReg as any).ticketStatus;

    const nextList = registrations.map((item) => (item.id === id ? updatedReg : item));
    setRegistrations(nextList);
    setStats(computeStatsFromRegistrations(nextList));

    // Save to Firestore DB
    saveRegistrationToFirestore(updatedReg);

    if (selectedRegistration?.id === id) {
      setSelectedRegistration(updatedReg);
    }

    const rejAct: ActivityItem = {
      id: `act-${Date.now()}`,
      type: 'rejection',
      title: `${reg.name} was rejected`,
      description: `Reason: ${reason}`,
      timestamp: 'Just now',
      timeAgo: 'Just now',
      createdAt: Date.now(),
      attendeeName: reg.name,
    };

    setActivities((prev) => [rejAct, ...prev.slice(0, 49)]);
    logActivityToFirestore(rejAct);

    addToast('warning', 'Registration rejected', `${reg.name} marked as Rejected.`);

    // Sync to server API
    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updatedRegistrations: [updatedReg],
        newActivity: rejAct,
      }),
    }).catch(() => {});
  }, [registrations, selectedRegistration, addToast]);

  // Scan Ticket logic (Updates Firestore DB and local state)
  const scanTicket = useCallback((ticketIdOrQr: string): ScanResult => {
    const rawInput = ticketIdOrQr.trim();
    const query = rawInput.toUpperCase();
    const timeFormatted = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Look for registration in local state
    const found = registrations.find(
      (r) =>
        (r.ticketId && r.ticketId.toUpperCase() === query) ||
        (r.qrValue && r.qrValue.toUpperCase().includes(query)) ||
        (r.qrValue && query.includes(r.qrValue.toUpperCase())) ||
        (r.ticketId && query.includes(r.ticketId.toUpperCase())) ||
        (r.id && r.id.toUpperCase() === query)
    );

    if (!found) {
      const res: ScanResult = {
        status: 'invalid',
        message: `No attendee found matching identifier "${ticketIdOrQr}".`,
        scannedAt: timeFormatted,
      };
      setLastScanResult(res);
      addToast('error', 'Invalid Ticket Scanned', `Identifier "${ticketIdOrQr}" not found in database.`);
      return res;
    }

    if (found.status !== 'Approved') {
      const res: ScanResult = {
        status: 'invalid',
        registration: found,
        guestName: found.name,
        guestEmail: found.email,
        ticketId: found.ticketId,
        tier: found.tier,
        message: `This registration is currently ${found.status.toUpperCase()} and has no active entry pass.`,
        scannedAt: timeFormatted,
      };
      setLastScanResult(res);
      addToast('error', 'Entry Denied', `${found.name} is not approved for gate entry.`);
      return res;
    }

    if (found.checkedIn) {
      const res: ScanResult = {
        status: 'already_used',
        registration: found,
        guestName: found.name,
        guestEmail: found.email,
        ticketId: found.ticketId,
        tier: found.tier,
        ticketStatus: 'Checked In',
        checkInStatus: 'Checked In',
        message: `This ticket was already used by ${found.name} at ${found.checkedInAt || 'earlier session'}.`,
        scannedAt: timeFormatted,
      };
      setLastScanResult(res);
      addToast('warning', 'ALREADY CHECKED IN', `Ticket ${found.ticketId} was scanned previously.`);
      return res;
    }

    // Valid check-in!
    const nowIso = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const updated: Registration = {
      ...found,
      checkedIn: true,
      checkedInAt: nowIso,
      ticketStatus: 'Checked In',
      checkInStatus: 'Checked In',
      scannedGate: 'Main Gate',
      scannedBy: 'Admin Console',
    };

    const nextList = registrations.map((item) => (item.id === found.id ? updated : item));
    setRegistrations(nextList);
    setStats(computeStatsFromRegistrations(nextList));

    setSelectedRegistration((curr) => (curr && curr.id === found.id ? updated : curr));
    setSelectedTicketPass((curr) => (curr && curr.id === found.id ? updated : curr));

    // Save directly to Firestore DB
    saveRegistrationToFirestore(updated);
    checkInAttendeeInFirestore(rawInput, 'Main Gate', 'Admin Console');

    // Inform server API
    fetch('/api/check-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrData: rawInput, gate: 'Main Gate' }),
    }).catch(() => {});

    const checkinAct: ActivityItem = {
      id: `act-${Date.now()}`,
      type: 'checkin',
      title: `${found.name} checked in`,
      description: `Verified at Main Gate · Pass ${found.ticketId} (${found.tier})`,
      timestamp: 'Just now',
      timeAgo: 'Just now',
      createdAt: Date.now(),
      attendeeName: found.name,
      ticketId: found.ticketId,
    };

    setActivities((prev) => [checkinAct, ...prev.slice(0, 49)]);
    logActivityToFirestore(checkinAct);

    const res: ScanResult = {
      status: 'valid',
      registration: updated,
      guestName: updated.name,
      guestEmail: updated.email,
      ticketId: updated.ticketId,
      tier: updated.tier,
      ticketStatus: 'Checked In',
      checkInStatus: 'Checked In',
      message: 'Ticket successfully verified. Attendee cleared for event access.',
      scannedAt: timeFormatted,
    };
    setLastScanResult(res);
    addToast('success', 'TICKET VALID', `${found.name} marked as Checked In.`);
    return res;
  }, [registrations, addToast]);

  // Simulate scanning a random ticket from real database
  const simulateScanRandomTicket = useCallback((): ScanResult => {
    const approvedList = registrations.filter((r) => r.status === 'Approved' && r.ticketId);
    if (approvedList.length === 0) {
      const fallbackRes: ScanResult = {
        status: 'invalid',
        message: 'No approved tickets in database to scan. Approve an attendee first.',
        scannedAt: new Date().toLocaleTimeString(),
      };
      setLastScanResult(fallbackRes);
      return fallbackRes;
    }

    const unchecked = approvedList.filter((r) => !r.checkedIn);
    let chosen: Registration;
    if (unchecked.length > 0 && Math.random() < 0.75) {
      chosen = unchecked[Math.floor(Math.random() * unchecked.length)];
    } else {
      chosen = approvedList[Math.floor(Math.random() * approvedList.length)];
    }

    return scanTicket(chosen.ticketId!);
  }, [registrations, scanTicket]);

  // Auto-simulator: creates new registration every 13 seconds when active
  useEffect(() => {
    if (!autoSimulateEnabled) return;

    const timer = setInterval(() => {
      simulateNewRegistration();
    }, 13000);

    return () => clearInterval(timer);
  }, [autoSimulateEnabled, simulateNewRegistration]);

  const toggleAutoSimulate = useCallback(() => {
    setAutoSimulateEnabled((prev) => {
      const next = !prev;
      addToast(
        next ? 'info' : 'warning',
        next ? 'Live Demo Mode Activated' : 'Live Demo Mode Paused',
        next ? 'Simulating incoming registrations every 13 seconds.' : 'Manual simulation only.'
      );
      return next;
    });
  }, [addToast]);

  const resetToDefault = useCallback(() => {
    setRegistrations([]);
    setActivities([]);
    setStats(EMPTY_DASHBOARD_STATS);
    setAutoSimulateEnabled(false);
    setSelectedRegistration(null);
    setSelectedTicketPass(null);
    setLastScanResult(null);
    try {
      localStorage.removeItem(STORAGE_KEYS.REGISTRATIONS);
      localStorage.removeItem(STORAGE_KEYS.ACTIVITIES);
      localStorage.removeItem(STORAGE_KEYS.STATS);
      localStorage.removeItem(STORAGE_KEYS.AUTO_SIMULATE);
    } catch {}

    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updatedRegistrations: [],
        updatedStats: EMPTY_DASHBOARD_STATS,
      }),
    }).catch(() => {});

    addToast('info', 'Database Cleared', 'Reset all local attendee registrations and statistics to clean zero state.');
  }, [addToast]);

  return (
    <EventContext.Provider
      value={{
        registrations,
        activities,
        stats,
        toasts,
        autoSimulateEnabled,
        selectedRegistration,
        selectedTicketPass,
        lastScanResult,
        toggleAutoSimulate,
        simulateNewRegistration,
        submitAttendeeRegistration,
        approveRegistration,
        rejectRegistration,
        scanTicket,
        simulateScanRandomTicket,
        dismissToast,
        addToast,
        addActivity,
        setSelectedRegistration,
        setSelectedTicketPass,
        setLastScanResult,
        resetToDefault,
        pwaModalOpen,
        setPwaModalOpen,
        isServerConnected,
        isLoading,
      }}
    >
      {children}
    </EventContext.Provider>
  );
};

export const useEvent = () => {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error('useEvent must be used within an EventProvider');
  }
  return context;
};
