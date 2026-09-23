import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { Registration, ActivityItem, DashboardStats, ToastMessage, RegistrationStatus, AttendeeTier } from '../types';
import { INITIAL_DASHBOARD_STATS, INITIAL_REGISTRATIONS, INITIAL_ACTIVITIES, MOCK_CANDIDATE_NAMES } from '../data/mockData';
import {
  subscribeToRegistrations,
  subscribeToActivities,
  saveRegistrationToFirestore,
  checkInAttendeeInFirestore,
  logActivityToFirestore,
} from '../services/firebaseDb';

interface ScanResult {
  status: 'valid' | 'already_used' | 'invalid';
  registration?: Registration;
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
}

const STORAGE_KEYS = {
  REGISTRATIONS: 'pink_polo_2026_registrations',
  ACTIVITIES: 'pink_polo_2026_activities',
  STATS: 'pink_polo_2026_stats',
  AUTO_SIMULATE: 'pink_polo_2026_auto_simulate',
};

const EventContext = createContext<EventContextType | undefined>(undefined);

export const EventProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [registrations, setRegistrations] = useState<Registration[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.REGISTRATIONS);
      return stored ? JSON.parse(stored) : INITIAL_REGISTRATIONS;
    } catch {
      return INITIAL_REGISTRATIONS;
    }
  });

  const [activities, setActivities] = useState<ActivityItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ACTIVITIES);
      return stored ? JSON.parse(stored) : INITIAL_ACTIVITIES;
    } catch {
      return INITIAL_ACTIVITIES;
    }
  });

  const [stats, setStats] = useState<DashboardStats>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.STATS);
      return stored ? JSON.parse(stored) : INITIAL_DASHBOARD_STATS;
    } catch {
      return INITIAL_DASHBOARD_STATS;
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

  // Track known checked-in IDs to trigger live alerts only on new check-ins
  const initialCheckedInIdsRef = useRef<Set<string>>(new Set());

  const addToast = useCallback((type: ToastMessage['type'], title: string, message?: string) => {
    const id = 'toast-' + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [{ id, type, title, message, timestamp: Date.now() }, ...prev.slice(0, 4)]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  // Sync to localStorage and backend server
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(registrations));
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updatedRegistrations: registrations }),
      }).catch(() => {});
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
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updatedStats: stats }),
      }).catch(() => {});
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

  // Real-time Cloud Firebase Firestore Listener for External Scanner API
  useEffect(() => {
    // Populate baseline checked-in IDs
    registrations.forEach((r) => {
      if (r.checkedIn) initialCheckedInIdsRef.current.add(r.id);
    });

    const unsubscribeFirestore = subscribeToRegistrations((cloudList) => {
      if (!cloudList || cloudList.length === 0) return;

      setRegistrations((prev) => {
        // Detect newly checked-in attendees from external scanner
        cloudList.forEach((cloudReg) => {
          if (cloudReg.checkedIn && !initialCheckedInIdsRef.current.has(cloudReg.id)) {
            initialCheckedInIdsRef.current.add(cloudReg.id);
            addToast(
              'success',
              '📱 Live Scanner Check-In!',
              `${cloudReg.name} (${cloudReg.tier}) verified at Gate turnstile`
            );
          }
        });

        // Merge cloud list with local
        const cloudMap = new Map<string, Registration>();
        cloudList.forEach((r) => cloudMap.set(r.id, r));

        const updated = prev.map((local) => {
          const remote = cloudMap.get(local.id);
          if (remote) {
            return {
              ...local,
              ...remote,
              // Never downgrade a checked-in state
              checkedIn: local.checkedIn || remote.checkedIn,
              checkedInAt: remote.checkedInAt || local.checkedInAt,
            };
          }
          return local;
        });

        // Add any new ones created in cloud
        cloudList.forEach((r) => {
          if (!prev.some((p) => p.id === r.id)) {
            updated.push(r);
          }
        });

        // Update stats
        const checkedCount = updated.filter((r) => r.checkedIn).length;
        const approvedCount = updated.filter((r) => r.status === 'Approved').length;
        const pendingCount = updated.filter((r) => r.status === 'Pending').length;
        const rejectedCount = updated.filter((r) => r.status === 'Rejected').length;

        setStats((s) => ({
          ...s,
          checkedIn: checkedCount,
          approved: approvedCount,
          pendingApproval: pendingCount,
          rejected: rejectedCount,
          totalRegistrations: updated.length,
          ticketsGenerated: approvedCount,
        }));

        return updated;
      });
    });

    // Real-time Activities subscription
    const unsubscribeActivities = subscribeToActivities((cloudActivities) => {
      if (cloudActivities && cloudActivities.length > 0) {
        setActivities((prev) => {
          const existingIds = new Set(prev.map((a) => a.id));
          const newActs = cloudActivities.filter((a) => !existingIds.has(a.id));
          return [...newActs, ...prev].slice(0, 50);
        });
      }
    });

    return () => {
      unsubscribeFirestore();
      unsubscribeActivities();
    };
  }, [addToast]);

  // Active real-time sync with Vercel serverless /api/sync endpoint
  useEffect(() => {
    const pollSync = async () => {
      try {
        const res = await fetch('/api/sync');
        if (res.ok) {
          const data = await res.json();
          if (data && data.checkedInTickets) {
            const checkedMap = data.checkedInTickets;
            setRegistrations((prev) => {
              let changed = false;
              const updated = prev.map((r) => {
                const match =
                  (r.ticketId && checkedMap[r.ticketId]) ||
                  (r.ticketId && checkedMap[r.ticketId.toUpperCase()]) ||
                  checkedMap[r.id] ||
                  (r.qrValue && checkedMap[r.qrValue]);

                if (match && !r.checkedIn) {
                  changed = true;
                  addToast(
                    'success',
                    '📱 Live Scanner Check-In!',
                    `${r.name} (${r.tier}) verified at Gate turnstile`
                  );
                  return {
                    ...r,
                    checkedIn: true,
                    checkedInAt: match.checkedInAt || new Date().toISOString().replace('T', ' ').substring(0, 16),
                  };
                }
                return r;
              });

              if (changed) {
                const checkedCount = updated.filter((r) => r.checkedIn).length;
                setStats((s) => ({ ...s, checkedIn: checkedCount }));
                return updated;
              }
              return prev;
            });
          }
        }
      } catch (e) {
        // network silent retry
      }
    };

    pollSync();
    const interval = setInterval(pollSync, 2000);
    return () => clearInterval(interval);
  }, [addToast]);

  // Initial load from server and SSE live stream listener
  useEffect(() => {
    fetch('/api/state')
      .then((res) => {
        const ct = res.headers.get('content-type');
        if (res.ok && ct && ct.includes('application/json')) {
          return res.json();
        }
        throw new Error('Server state API not active on static host');
      })
      .then((data) => {
        setIsServerConnected(true);
        if (data && Array.isArray(data.registrations)) {
          setRegistrations((localRegs) => {
            const localMap = new Map<string, Registration>();
            localRegs.forEach((r) => localMap.set(r.id, r));

            const serverMap = new Map<string, Registration>();
            data.registrations.forEach((r: Registration) => {
              const local = localMap.get(r.id);
              const isCheckedIn = r.checkedIn || (local ? local.checkedIn : false);
              const checkedInAt = r.checkedInAt || (local ? local.checkedInAt : undefined);
              serverMap.set(r.id, {
                ...r,
                checkedIn: isCheckedIn,
                checkedInAt: checkedInAt,
              });
            });

            localRegs.forEach((r) => {
              if (!serverMap.has(r.id)) {
                serverMap.set(r.id, r);
              }
            });
            return Array.from(serverMap.values());
          });
        }
      })
      .catch(() => {
        setIsServerConnected(false);
      });
  }, []);

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
    setActivities((prev) => [newItem, ...prev.slice(0, 39)]);
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

  // Simulate New Registration
  const simulateNewRegistration = useCallback((): Registration => {
    const poolIndex = Math.floor(Math.random() * MOCK_CANDIDATE_NAMES.length);
    const candidate = MOCK_CANDIDATE_NAMES[poolIndex];
    const randSuffix = Math.floor(10 + Math.random() * 89);
    const uniqueEmail = candidate.email.replace('@', `${randSuffix}@`);
    const dateStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const regId = `REG-2026-${1043 + Math.floor(Math.random() * 900)}`;

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

    setRegistrations((prev) => [newReg, ...prev]);
    saveRegistrationToFirestore(newReg);

    setStats((prev) => ({
      ...prev,
      totalRegistrations: prev.totalRegistrations + 1,
      pendingApproval: prev.pendingApproval + 1,
    }));

    addActivity(
      'registration',
      'New registration received',
      `${newReg.name} (${newReg.email}) registered for ${newReg.tier}`,
      newReg.name
    );

    addToast('info', 'New registration received', `${newReg.name} · ${newReg.email}`);

    return newReg;
  }, [addActivity, addToast]);

  // Public Attendee Self-Registration Submission
  const submitAttendeeRegistration = useCallback((input: AttendeeSubmissionInput): Registration => {
    const dateStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const regId = `REG-2026-${1043 + Math.floor(Math.random() * 900)}`;

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

    setRegistrations((prev) => [newReg, ...prev]);
    saveRegistrationToFirestore(newReg);

    setStats((prev) => ({
      ...prev,
      totalRegistrations: prev.totalRegistrations + 1,
      pendingApproval: prev.pendingApproval + 1,
    }));

    addActivity(
      'registration',
      'New registration received',
      `${newReg.name} (${newReg.email}) submitted request for ${newReg.tier}`,
      newReg.name
    );

    addToast('info', 'New registration received', `${newReg.name} · ${newReg.tier}`);

    return newReg;
  }, [addActivity, addToast]);

  // Approve Flow
  const approveRegistration = useCallback((id: string) => {
    const reg = registrations.find((r) => r.id === id);
    if (!reg) return;

    if (reg.status === 'Approved') {
      addToast('info', 'Already Approved', `${reg.name} has already been approved.`);
      return;
    }

    const wasPending = reg.status === 'Pending';
    const wasRejected = reg.status === 'Rejected';

    const ticketSeq = Math.floor(100000 + Math.random() * 900000);
    const ticketId = reg.ticketId || `PINK-2026-00${ticketSeq.toString().slice(-4)}`;
    const qrValue = `PINK-POLO-2026-${ticketId}-${reg.name.toUpperCase().replace(/\s+/g, '-')}-${reg.tier.toUpperCase().replace(/\s+/g, '-')}`;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);

    const updatedReg: Registration = {
      ...reg,
      status: 'Approved',
      ticketId,
      qrValue,
      ticketGeneratedAt: now,
      ticketStatus: 'Valid',
      rejectionReason: undefined,
    };

    setRegistrations((prev) => prev.map((item) => (item.id === id ? updatedReg : item)));
    saveRegistrationToFirestore(updatedReg);

    if (selectedRegistration?.id === id) {
      setSelectedRegistration(updatedReg);
    }

    setStats((prev) => ({
      ...prev,
      pendingApproval: wasPending ? Math.max(0, prev.pendingApproval - 1) : prev.pendingApproval,
      rejected: wasRejected ? Math.max(0, prev.rejected - 1) : prev.rejected,
      approved: prev.approved + 1,
      ticketsGenerated: prev.ticketsGenerated + 1,
    }));

    addActivity('approval', `${reg.name} was approved`, `Registration ${reg.id} verified and approved by Admin`, reg.name);
    addActivity('ticket', `Ticket ${ticketId} generated`, `Official e-Pass issued for ${reg.name} (${reg.tier})`, reg.name, ticketId);

    addToast('success', 'Registration approved and ticket generated.', `Ticket ID: ${ticketId} generated for ${reg.name}`);
  }, [registrations, selectedRegistration, addActivity, addToast]);

  // Reject Flow
  const rejectRegistration = useCallback((id: string, reason = 'Administrative review - invitation quota limit reached') => {
    const reg = registrations.find((r) => r.id === id);
    if (!reg) return;

    if (reg.status === 'Rejected') {
      addToast('info', 'Already Rejected', `${reg.name} is already marked as rejected.`);
      return;
    }

    const wasPending = reg.status === 'Pending';
    const wasApproved = reg.status === 'Approved';

    const updatedReg: Registration = {
      ...reg,
      status: 'Rejected',
      ticketStatus: undefined,
      rejectionReason: reason,
    };

    setRegistrations((prev) => prev.map((item) => (item.id === id ? updatedReg : item)));
    saveRegistrationToFirestore(updatedReg);

    if (selectedRegistration?.id === id) {
      setSelectedRegistration(updatedReg);
    }

    setStats((prev) => ({
      ...prev,
      pendingApproval: wasPending ? Math.max(0, prev.pendingApproval - 1) : prev.pendingApproval,
      approved: wasApproved ? Math.max(0, prev.approved - 1) : prev.approved,
      ticketsGenerated: wasApproved ? Math.max(0, prev.ticketsGenerated - 1) : prev.ticketsGenerated,
      rejected: prev.rejected + 1,
    }));

    addActivity('rejection', `${reg.name} was rejected`, `Reason: ${reason}`, reg.name);
    addToast('warning', 'Registration rejected.', `${reg.name} has been marked as Rejected.`);
  }, [registrations, selectedRegistration, addActivity, addToast]);

  // Scan Ticket logic
  const scanTicket = useCallback((ticketIdOrQr: string): ScanResult => {
    const rawInput = ticketIdOrQr.trim();
    const query = rawInput.toUpperCase();
    const timeFormatted = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Inform server and Firestore of the scan
    fetch('/api/check-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrData: rawInput, gate: 'Local Console' }),
    }).catch(() => {});
    checkInAttendeeInFirestore(rawInput, 'Local Console', 'Admin Console');

    // Look for registration by ticket ID or QR value or Registration ID
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
        message: 'No valid ticket or attendee found matching identifier.',
        scannedAt: timeFormatted,
      };
      setLastScanResult(res);
      addToast('error', 'Invalid Ticket Scanned', `Identifier "${ticketIdOrQr}" is not recognized.`);
      return res;
    }

    if (found.status !== 'Approved') {
      const res: ScanResult = {
        status: 'invalid',
        registration: found,
        message: `This registration is currently ${found.status.toUpperCase()} and has no active entry ticket.`,
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
        message: 'This ticket has already been used.',
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
    };

    setRegistrations((prev) => prev.map((item) => (item.id === found.id ? updated : item)));

    setSelectedRegistration((curr) => (curr && curr.id === found.id ? updated : curr));
    setSelectedTicketPass((curr) => (curr && curr.id === found.id ? updated : curr));

    setStats((prev) => ({
      ...prev,
      checkedIn: prev.checkedIn + 1,
    }));

    addActivity(
      'checkin',
      `${found.name} checked in`,
      `Verified at Main Gate · Pass ${found.ticketId} (${found.tier})`,
      found.name,
      found.ticketId
    );

    const res: ScanResult = {
      status: 'valid',
      registration: updated,
      message: 'Ticket successfully verified. Attendee cleared for event access.',
      scannedAt: timeFormatted,
    };
    setLastScanResult(res);
    addToast('success', 'TICKET VALID', `${found.name} marked as Checked In.`);
    return res;
  }, [registrations, addActivity, addToast]);

  // Simulate scanning a random ticket from mock data
  const simulateScanRandomTicket = useCallback((): ScanResult => {
    // Collect all approved attendees
    const approvedList = registrations.filter((r) => r.status === 'Approved' && r.ticketId);
    if (approvedList.length === 0) {
      const fallbackRes: ScanResult = {
        status: 'invalid',
        message: 'No approved tickets available to scan. Approve an attendee first.',
        scannedAt: new Date().toLocaleTimeString(),
      };
      setLastScanResult(fallbackRes);
      return fallbackRes;
    }

    // Prefer unchecked attendees 70% of time so staff can see valid scans, but occasionally pick already checked
    const unchecked = approvedList.filter((r) => !r.checkedIn);
    let chosen: Registration;
    if (unchecked.length > 0 && Math.random() < 0.75) {
      chosen = unchecked[Math.floor(Math.random() * unchecked.length)];
    } else {
      chosen = approvedList[Math.floor(Math.random() * approvedList.length)];
    }

    return scanTicket(chosen.ticketId!);
  }, [registrations, scanTicket]);

  // Auto-simulator: creates new mock registration every 12-14 seconds when active
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
    setRegistrations(INITIAL_REGISTRATIONS);
    setActivities(INITIAL_ACTIVITIES);
    setStats(INITIAL_DASHBOARD_STATS);
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
    addToast('info', 'Demo Data Reset', 'Restored initial sample registrations and statistics.');
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
