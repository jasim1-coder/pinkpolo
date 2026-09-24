import React, { useState, useMemo } from 'react';
import { useEvent } from '../../context/EventContext';
import {
  BarChart3,
  Users,
  CheckCircle2,
  Calendar,
  Layers,
  Download,
  Clock,
  MapPin,
  Percent,
  UserX,
  UserCheck,
  Search,
  Filter,
  Phone,
  Mail,
  Flame,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const { stats, registrations, addToast } = useEvent();
  
  // Default to Attendance Manifest (Day-wise check-ins)
  const [activeReportTab, setActiveReportTab] = useState<'attendees' | 'daily' | 'tiers'>('attendees');
  
  // Filters for Attendance Manifest
  const [selectedDayFilter, setSelectedDayFilter] = useState<'all' | 'day1' | 'day2' | 'day3' | 'today'>('all');
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [gateFilter, setGateFilter] = useState<string>('all');

  const todayIsoDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Overall Admission & No-Show KPIs
  const totalApproved = stats.ticketsGenerated || stats.approved || 1;
  const overallAdmissionRate = Math.round((stats.checkedIn / totalApproved) * 100);
  const overallNoShowRate = Math.max(0, 100 - overallAdmissionRate);
  const pendingArrivals = Math.max(0, stats.ticketsGenerated - stats.checkedIn);

  // List of all people who actually attended the event (Checked-In Guests)
  const attendedGuestsList = useMemo(() => {
    return registrations
      .filter((r) => r.checkedIn || (r.dailyCheckIns && Object.keys(r.dailyCheckIns).length > 0))
      .map((r) => {
        const checkInsMap = r.dailyCheckIns || {};
        const checkInsList = Object.values(checkInsMap);
        const latestCheckIn = checkInsList.length > 0 ? checkInsList[checkInsList.length - 1] : null;
        
        const scanTime = latestCheckIn?.time || (r.checkedInAt ? r.checkedInAt.split(' ')[1] : 'Verified');
        const scanDate = latestCheckIn?.date || (r.checkedInAt ? r.checkedInAt.split(' ')[0] : 'Today');
        const gate = latestCheckIn?.gate || r.scannedGate || 'Main Gate';
        
        // Multi-day checks
        const checkInDates = Object.keys(checkInsMap);
        const hasDay1 = Boolean(
          checkInsMap['day1'] ||
          checkInsMap['2026-11-20'] ||
          (r.checkedInAt && r.checkedInAt.startsWith('2026-11-20')) ||
          (r.checkedIn && !r.dailyCheckIns)
        );
        const hasDay2 = Boolean(
          checkInsMap['day2'] ||
          checkInsMap['2026-11-21'] ||
          (r.checkedInAt && r.checkedInAt.startsWith('2026-11-21'))
        );
        const hasDay3 = Boolean(
          checkInsMap['day3'] ||
          checkInsMap['2026-11-22'] ||
          (r.checkedInAt && r.checkedInAt.startsWith('2026-11-22'))
        );
        const hasToday = Boolean(
          checkInsMap[todayIsoDate] ||
          (r.checkedInAt && r.checkedInAt.startsWith(todayIsoDate)) ||
          r.checkedIn
        );

        const daysCount = checkInsList.length > 0 ? checkInsList.length : 1;

        return {
          id: r.id,
          name: r.name,
          email: r.email,
          whatsapp: r.whatsapp || 'N/A',
          ticketId: r.ticketId || `PINK-2026-${r.id.slice(-4)}`,
          tier: r.tier,
          gate,
          scannedAt: r.checkedInAt || `${scanDate} ${scanTime}`,
          scanDate,
          scanTime,
          daysAttended: daysCount,
          hasDay1,
          hasDay2,
          hasDay3,
          hasToday,
          checkInDates,
          scannedBy: latestCheckIn?.scannedBy || r.scannedBy || 'Gate Scanner',
        };
      });
  }, [registrations, todayIsoDate]);

  // Day-wise check-in summary metrics
  const day1Count = useMemo(() => attendedGuestsList.filter((g) => g.hasDay1).length, [attendedGuestsList]);
  const day2Count = useMemo(() => attendedGuestsList.filter((g) => g.hasDay2).length, [attendedGuestsList]);
  const day3Count = useMemo(() => attendedGuestsList.filter((g) => g.hasDay3).length, [attendedGuestsList]);
  const todayCount = useMemo(() => attendedGuestsList.filter((g) => g.hasToday).length, [attendedGuestsList]);

  // Filtered attended guests based on Day filter, search & dropdowns
  const filteredAttendedGuests = useMemo(() => {
    return attendedGuestsList.filter((g) => {
      // Day selection filter
      if (selectedDayFilter === 'day1' && !g.hasDay1) return false;
      if (selectedDayFilter === 'day2' && !g.hasDay2) return false;
      if (selectedDayFilter === 'day3' && !g.hasDay3) return false;
      if (selectedDayFilter === 'today' && !g.hasToday) return false;

      const matchQuery =
        !attendeeSearch ||
        g.name.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
        g.email.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
        g.ticketId.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
        g.whatsapp.includes(attendeeSearch);

      const matchTier = tierFilter === 'all' || g.tier === tierFilter;
      const matchGate = gateFilter === 'all' || g.gate.toLowerCase().includes(gateFilter.toLowerCase());

      return matchQuery && matchTier && matchGate;
    });
  }, [attendedGuestsList, selectedDayFilter, attendeeSearch, tierFilter, gateFilter]);

  // =========================================================================
  // REPORT DATA: DAILY EVENT ATTENDANCE & ADMISSION RATE DATA
  // =========================================================================
  const dailyAttendanceReport = useMemo(() => {
    const today = new Date();
    const days = [];

    // Past 7 live dates tracked in DB
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const isoDateStr = d.toISOString().slice(0, 10);
      const dayLabel = i === 0 ? 'Today' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      const dayRegs = registrations.filter(
        (r) => r.registrationDate && r.registrationDate.startsWith(isoDateStr)
      );
      const dayApproved = dayRegs.filter((r) => r.status === 'Approved').length;
      const dayCheckedIn = registrations.filter(
        (r) => r.checkedIn && r.checkedInAt && r.checkedInAt.startsWith(isoDateStr)
      ).length;

      const basePasses = dayApproved > 0 ? dayApproved : dayCheckedIn > 0 ? dayCheckedIn : 0;
      const admitRate = basePasses > 0 ? Math.min(100, Math.round((dayCheckedIn / basePasses) * 100)) : 0;

      days.push({
        dayLabel,
        isoDate: isoDateStr,
        eventTitle: i === 0 ? 'Live Reception' : `Session ${7 - i}`,
        registered: dayRegs.length,
        approved: dayApproved,
        admitted: dayCheckedIn,
        admissionRate: admitRate,
        noShowCount: Math.max(0, dayApproved - dayCheckedIn),
      });
    }

    return days;
  }, [registrations]);

  // Specific 3 Gala Event Dates Benchmark
  const eventGalaDays = useMemo(() => {
    const galaSchedule = [
      {
        dayKey: 'Day 1',
        dateStr: 'Nov 20, 2026',
        title: 'Opening Ceremony & Charity Prelims',
        gateOpen: '14:00',
        capacity: 450,
      },
      {
        dayKey: 'Day 2',
        dateStr: 'Nov 21, 2026',
        title: 'Equestrian Exhibition & Luncheon',
        gateOpen: '14:00',
        capacity: 600,
      },
      {
        dayKey: 'Day 3',
        dateStr: 'Nov 22, 2026',
        title: 'Championship Finals & Pink Gala',
        gateOpen: '15:00',
        capacity: 750,
      },
    ];

    return galaSchedule.map((g) => {
      const approvedCount = stats.ticketsGenerated || stats.approved;
      const admittedCount = stats.checkedIn;
      const admissionRate = approvedCount > 0 ? Math.round((admittedCount / approvedCount) * 100) : 0;

      return {
        ...g,
        approvedPasses: approvedCount,
        admittedGuests: admittedCount,
        admissionRate: admissionRate,
        unclaimedSeats: Math.max(0, approvedCount - admittedCount),
      };
    });
  }, [stats]);

  // =========================================================================
  // REPORT DATA: TIER-BY-TIER GUEST ATTENDANCE & ADMISSION RATE
  // =========================================================================
  const tierAttendanceReport = useMemo(() => {
    const tierConfig = [
      {
        name: 'VIP Pavilion',
        gate: 'Gate 1 (Royal Turnstile)',
        badge: 'Royal Access',
        color: 'rose',
        bgBadge: 'bg-rose-100 text-rose-800 border-rose-200',
        barColor: 'bg-rose-600',
        nominalCapacity: 120,
      },
      {
        name: 'Clubhouse Lounge',
        gate: 'Gate 2 (South Entry)',
        badge: 'Executive',
        color: 'amber',
        bgBadge: 'bg-amber-100 text-amber-800 border-amber-200',
        barColor: 'bg-amber-500',
        nominalCapacity: 200,
      },
      {
        name: 'Garden Terrace',
        gate: 'Gate 3 (Terrace Gate)',
        badge: 'Dining Lawn',
        color: 'emerald',
        bgBadge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        barColor: 'bg-emerald-500',
        nominalCapacity: 250,
      },
      {
        name: 'Grandstand',
        gate: 'Gate 4 (East Turnstile)',
        badge: 'Spectator',
        color: 'sky',
        bgBadge: 'bg-sky-100 text-sky-800 border-sky-200',
        barColor: 'bg-sky-500',
        nominalCapacity: 400,
      },
    ];

    return tierConfig.map((t) => {
      const tierRegs = registrations.filter((r) => r.tier === t.name);
      const approved = tierRegs.filter((r) => r.status === 'Approved').length;
      const admitted = tierRegs.filter((r) => r.checkedIn).length;
      const admissionRate = approved > 0 ? Math.round((admitted / approved) * 100) : 0;
      const noShowRate = Math.max(0, 100 - admissionRate);
      const vacantSeats = Math.max(0, approved - admitted);

      return {
        ...t,
        registered: tierRegs.length,
        approved,
        admitted,
        admissionRate,
        noShowRate,
        vacantSeats,
      };
    });
  }, [registrations]);

  // =========================================================================
  // REPORT DATA: HOURLY ARRIVAL PACING & NO-SHOW / DROP-OFF DATA
  // =========================================================================
  const hourlyArrivalPacing = useMemo(() => {
    const hours = [
      { time: '14:00', label: 'Gate Open', hourNum: 14 },
      { time: '15:00', label: 'Prelims Wave', hourNum: 15 },
      { time: '16:00', label: 'Peak Gala Rush', hourNum: 16 },
      { time: '17:00', label: 'Exhibition Match', hourNum: 17 },
      { time: '18:00', label: 'Championship', hourNum: 18 },
      { time: '19:00', label: 'Trophy Gala', hourNum: 19 },
    ];

    return hours.map((h) => {
      const count = registrations.filter((r) => {
        if (!r.checkedIn || !r.checkedInAt) return false;
        const timePart = r.checkedInAt.includes(' ') ? r.checkedInAt.split(' ')[1] : r.checkedInAt;
        const regHour = parseInt(timePart.split(':')[0], 10);
        return regHour === h.hourNum;
      }).length;

      const pctOfTotal = stats.checkedIn > 0 ? Math.round((count / stats.checkedIn) * 100) : 0;

      return {
        ...h,
        admittedCount: count,
        sharePct: pctOfTotal,
      };
    });
  }, [registrations, stats.checkedIn]);

  // CSV Exporter
  const handleExportCSV = (reportName: string, rows: any[]) => {
    if (!rows || rows.length === 0) return;
    const headers = Object.keys(rows[0]).join(',');
    const csvContent = [headers, ...rows.map((r) => Object.values(r).map((v) => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `pink_polo_2026_${reportName.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('success', 'Report Exported', `${reportName} downloaded as CSV.`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Report View Selector */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-rose-600" />
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Reports & Analytics Hub
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Select a dedicated report view below to inspect attendance manifests, admission rates, or tier turnouts.
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-2 text-xs">
            <span className="px-3 py-1.5 rounded-xl bg-slate-100 font-mono font-medium text-slate-700">
              Approved: <strong className="text-slate-900">{stats.ticketsGenerated}</strong>
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 font-mono font-bold border border-emerald-200">
              Admitted: {stats.checkedIn}
            </span>
          </div>
        </div>

        {/* 3 Dedicated Report Selector Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Report 1 (Default): Attendance Manifest */}
          <button
            type="button"
            onClick={() => setActiveReportTab('attendees')}
            className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
              activeReportTab === 'attendees'
                ? 'bg-rose-50/80 border-rose-400 ring-2 ring-rose-500/20 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
            }`}
          >
            <div
              className={`p-2.5 rounded-lg shrink-0 ${
                activeReportTab === 'attendees'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Users className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900">Attendance Manifest</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-800">
                  Default
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Day 1, 2, 3 who checked in, contact & gate logs
              </p>
            </div>
          </button>

          {/* Report 2: Daily Admission & Pacing */}
          <button
            type="button"
            onClick={() => setActiveReportTab('daily')}
            className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
              activeReportTab === 'daily'
                ? 'bg-rose-50/80 border-rose-400 ring-2 ring-rose-500/20 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
            }`}
          >
            <div
              className={`p-2.5 rounded-lg shrink-0 ${
                activeReportTab === 'daily'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-900 block">Daily Admission & Pacing</span>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Daily turnstile rates, Gala dates & hourly rush
              </p>
            </div>
          </button>

          {/* Report 3: Hospitality Tier Turnout */}
          <button
            type="button"
            onClick={() => setActiveReportTab('tiers')}
            className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
              activeReportTab === 'tiers'
                ? 'bg-rose-50/80 border-rose-400 ring-2 ring-rose-500/20 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
            }`}
          >
            <div
              className={`p-2.5 rounded-lg shrink-0 ${
                activeReportTab === 'tiers'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Layers className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-900 block">Hospitality Tier Turnout</span>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                VIP, Clubhouse, Terrace & Grandstand capacity
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* =========================================================================
          REPORT 1: ATTENDANCE MANIFEST (DEFAULT)
          Who checked in day-by-day (Day 1, Day 2, Day 3, Today)
          ========================================================================= */}
      {activeReportTab === 'attendees' && (
        <div className="space-y-4">
          {/* Day-wise Check-In Quick Filter Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <button
              type="button"
              onClick={() => setSelectedDayFilter('all')}
              className={`p-3 rounded-xl border text-left transition-all ${
                selectedDayFilter === 'all'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                selectedDayFilter === 'all' ? 'text-slate-300' : 'text-slate-400'
              }`}>
                All Attendance
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-bold font-mono tabular-nums">
                  {attendedGuestsList.length}
                </span>
                <span className={`text-[10px] ${selectedDayFilter === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>
                  Unique Guests
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedDayFilter('day1')}
              className={`p-3 rounded-xl border text-left transition-all ${
                selectedDayFilter === 'day1'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-rose-50/50'
              }`}
            >
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                selectedDayFilter === 'day1' ? 'text-rose-100' : 'text-rose-600'
              }`}>
                Day 1 (Nov 20)
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-bold font-mono tabular-nums">
                  {day1Count}
                </span>
                <span className={`text-[10px] ${selectedDayFilter === 'day1' ? 'text-rose-100' : 'text-slate-500'}`}>
                  Admitted
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedDayFilter('day2')}
              className={`p-3 rounded-xl border text-left transition-all ${
                selectedDayFilter === 'day2'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-rose-50/50'
              }`}
            >
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                selectedDayFilter === 'day2' ? 'text-rose-100' : 'text-rose-600'
              }`}>
                Day 2 (Nov 21)
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-bold font-mono tabular-nums">
                  {day2Count}
                </span>
                <span className={`text-[10px] ${selectedDayFilter === 'day2' ? 'text-rose-100' : 'text-slate-500'}`}>
                  Admitted
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedDayFilter('day3')}
              className={`p-3 rounded-xl border text-left transition-all ${
                selectedDayFilter === 'day3'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-rose-50/50'
              }`}
            >
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                selectedDayFilter === 'day3' ? 'text-rose-100' : 'text-rose-600'
              }`}>
                Day 3 (Nov 22)
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-bold font-mono tabular-nums">
                  {day3Count}
                </span>
                <span className={`text-[10px] ${selectedDayFilter === 'day3' ? 'text-rose-100' : 'text-slate-500'}`}>
                  Admitted
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedDayFilter('today')}
              className={`p-3 rounded-xl border text-left transition-all col-span-2 sm:col-span-1 ${
                selectedDayFilter === 'today'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50/50'
              }`}
            >
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                selectedDayFilter === 'today' ? 'text-emerald-100' : 'text-emerald-700'
              }`}>
                Today / Live
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-bold font-mono tabular-nums">
                  {todayCount}
                </span>
                <span className={`text-[10px] ${selectedDayFilter === 'today' ? 'text-emerald-100' : 'text-slate-500'}`}>
                  Scanned
                </span>
              </div>
            </button>
          </div>

          {/* Main Attendance Table Box */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Attendance Manifest
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    Verified Checked-In Guests Manifest
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Showing {filteredAttendedGuests.length} verified attendees{' '}
                  {selectedDayFilter !== 'all' && (
                    <span className="font-semibold text-rose-600">
                      filtered by {selectedDayFilter.toUpperCase()}
                    </span>
                  )}
                  .
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  handleExportCSV(
                    `Attendance_Manifest_${selectedDayFilter}`,
                    filteredAttendedGuests.map((g) => ({
                      Name: g.name,
                      Email: g.email,
                      WhatsApp: g.whatsapp,
                      Ticket_ID: g.ticketId,
                      Tier: g.tier,
                      Scanned_Gate: g.gate,
                      CheckIn_Date: g.scanDate,
                      CheckIn_Time: g.scanTime,
                      Days_Attended: g.daysAttended,
                      Day1_CheckedIn: g.hasDay1 ? 'Yes' : 'No',
                      Day2_CheckedIn: g.hasDay2 ? 'Yes' : 'No',
                      Day3_CheckedIn: g.hasDay3 ? 'Yes' : 'No',
                      Scanned_By: g.scannedBy,
                    }))
                  )
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-2xs shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Attendance CSV</span>
              </button>
            </div>

            {/* Search & Dropdown Filters Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={attendeeSearch}
                  onChange={(e) => setAttendeeSearch(e.target.value)}
                  placeholder="Search attendee name, email, ticket ID, or phone..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-slate-900 placeholder:text-slate-400"
                />
              </div>

              {/* Dropdowns */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={tierFilter}
                    onChange={(e) => setTierFilter(e.target.value)}
                    aria-label="Filter by Tier"
                    className="text-xs bg-transparent text-slate-700 font-medium focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Tiers</option>
                    <option value="VIP Pavilion">VIP Pavilion</option>
                    <option value="Clubhouse Lounge">Clubhouse Lounge</option>
                    <option value="Garden Terrace">Garden Terrace</option>
                    <option value="Grandstand">Grandstand</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={gateFilter}
                    onChange={(e) => setGateFilter(e.target.value)}
                    aria-label="Filter by Gate"
                    className="text-xs bg-transparent text-slate-700 font-medium focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Gates</option>
                    <option value="Gate 1">Gate 1 (Royal)</option>
                    <option value="Gate 2">Gate 2 (South)</option>
                    <option value="Gate 3">Gate 3 (Terrace)</option>
                    <option value="Gate 4">Gate 4 (East)</option>
                    <option value="Main Gate">Main Gate</option>
                  </select>
                </div>

                <span className="text-[11px] font-mono text-slate-600 bg-slate-200/70 px-2.5 py-1.5 rounded-lg whitespace-nowrap font-medium">
                  {filteredAttendedGuests.length} Shown
                </span>
              </div>
            </div>

            {/* Attendance Manifest Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-3.5">Attendee / Guest</th>
                    <th className="py-3 px-3.5">Contact Details</th>
                    <th className="py-3 px-3.5">Ticket Pass ID</th>
                    <th className="py-3 px-3.5">Hospitality Tier</th>
                    <th className="py-3 px-3.5">Scanned Gate</th>
                    <th className="py-3 px-3.5">Check-In Timestamp</th>
                    <th className="py-3 px-3.5">Days Attended</th>
                    <th className="py-3 px-3.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAttendedGuests.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-medium text-slate-600">No checked-in guests found</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {attendeeSearch || tierFilter !== 'all' || gateFilter !== 'all' || selectedDayFilter !== 'all'
                            ? 'Try clearing or changing your search/day filter.'
                            : 'As tickets are scanned at turnstiles, verified attendees will appear here automatically.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredAttendedGuests.map((guest, idx) => (
                      <tr key={guest.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        {/* Name & Initials */}
                        <td className="py-2.5 px-3.5 font-medium text-slate-900">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-rose-600 to-rose-400 text-white flex items-center justify-center font-bold text-[10px] shrink-0 shadow-2xs">
                              {guest.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block leading-tight">{guest.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{guest.id}</span>
                            </div>
                          </div>
                        </td>

                        {/* Contact Info */}
                        <td className="py-2.5 px-3.5 text-slate-600">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-slate-700">
                              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[160px]">{guest.email}</span>
                            </div>
                            {guest.whatsapp && guest.whatsapp !== 'N/A' && (
                              <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
                                <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>{guest.whatsapp}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Ticket ID */}
                        <td className="py-2.5 px-3.5 font-mono text-slate-900 font-semibold">
                          <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px]">
                            {guest.ticketId}
                          </span>
                        </td>

                        {/* Tier */}
                        <td className="py-2.5 px-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border inline-block ${
                              guest.tier === 'VIP Pavilion'
                                ? 'bg-rose-100 text-rose-800 border-rose-200'
                                : guest.tier === 'Clubhouse Lounge'
                                ? 'bg-amber-100 text-amber-800 border-amber-200'
                                : guest.tier === 'Garden Terrace'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : 'bg-sky-100 text-sky-800 border-sky-200'
                            }`}
                          >
                            {guest.tier}
                          </span>
                        </td>

                        {/* Scanned Gate */}
                        <td className="py-2.5 px-3.5 text-slate-700">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-rose-600 shrink-0" />
                            <span className="font-medium truncate max-w-[130px]">{guest.gate}</span>
                          </div>
                        </td>

                        {/* Check-In Timestamp */}
                        <td className="py-2.5 px-3.5 text-slate-700">
                          <div className="font-mono text-[11px]">
                            <span className="font-bold text-slate-900 block">{guest.scanTime}</span>
                            <span className="text-[10px] text-slate-400">{guest.scanDate}</span>
                          </div>
                        </td>

                        {/* Days Attended Badges */}
                        <td className="py-2.5 px-3.5">
                          <div className="flex items-center gap-1 flex-wrap">
                            {guest.hasDay1 && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                Day 1
                              </span>
                            )}
                            {guest.hasDay2 && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                Day 2
                              </span>
                            )}
                            {guest.hasDay3 && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                                Day 3
                              </span>
                            )}
                            {!guest.hasDay1 && !guest.hasDay2 && !guest.hasDay3 && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700">
                                {guest.daysAttended} Day
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-2.5 px-3.5 text-right">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Admitted
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          REPORT 2: DAILY EVENT ATTENDANCE & ADMISSION RATE REPORT
          ========================================================================= */}
      {activeReportTab === 'daily' && (
        <div className="space-y-5">
          {/* Top 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span>Overall Admission Rate</span>
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
                  <Percent className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-emerald-700 tabular-nums">
                  {overallAdmissionRate}%
                </span>
                <span className="text-xs text-slate-400">of approved guests</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {stats.checkedIn} admitted of {stats.ticketsGenerated} issued passes
              </p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span>Total Admitted Guests</span>
                <div className="p-2 rounded-lg bg-sky-50 text-sky-700">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-sky-800 tabular-nums">
                  {stats.checkedIn.toLocaleString()}
                </span>
                <span className="text-xs text-emerald-600 font-medium">Scanned</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Live turnstile check-ins verified at gates
              </p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span>Pending / Unscanned Passes</span>
                <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-amber-800 tabular-nums">
                  {pendingArrivals.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400">expected</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Ticket holders not yet arrived at turnstiles
              </p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span>No-Show / Drop-Off Index</span>
                <div className="p-2 rounded-lg bg-rose-50 text-rose-700">
                  <UserX className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-rose-700 tabular-nums">
                  {overallNoShowRate}%
                </span>
                <span className="text-xs text-slate-400">unclaimed</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Available for standby / waitlist seat release
              </p>
            </div>
          </div>

          {/* 3 Main Gala Days Cards */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  3-Day Pink Polo Gala Benchmark
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Admission capacity targets for each official championship day.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleExportCSV('Daily_Attendance_Report', dailyAttendanceReport)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export Daily CSV</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {eventGalaDays.map((gala, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-2xs space-y-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        {gala.dayKey} • {gala.dateStr}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        Gates: {gala.gateOpen}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mt-2 leading-tight">
                      {gala.title}
                    </h4>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Admission Rate:</span>
                      <span className="font-mono font-bold text-emerald-700 text-sm">
                        {gala.admissionRate}%
                      </span>
                    </div>

                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${Math.min(100, gala.admissionRate)}%` }}
                        className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 text-slate-600">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Admitted</span>
                        <strong className="text-slate-900 font-mono text-xs">{gala.admittedGuests}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Unclaimed Seats</span>
                        <span className="text-amber-700 font-mono text-xs">{gala.unclaimedSeats}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Daily Table Breakdown */}
            <div className="overflow-x-auto pt-2">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-y border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Registered Requests</th>
                    <th className="py-2.5 px-3">Approved Passes</th>
                    <th className="py-2.5 px-3">Admitted at Gates</th>
                    <th className="py-2.5 px-3">Daily Admission Rate</th>
                    <th className="py-2.5 px-3">Pending / No-Shows</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dailyAttendanceReport.map((day, i) => (
                    <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {day.dayLabel} <span className="text-slate-400 text-[10px] font-mono">({day.isoDate})</span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">{day.registered}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-900 font-medium">{day.approved}</td>
                      <td className="py-2.5 px-3 font-mono text-emerald-700 font-bold">{day.admitted}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 w-9">{day.admissionRate}%</span>
                          <div className="h-1.5 w-16 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${day.admissionRate}%` }}
                              className="h-full bg-emerald-600 rounded-full"
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-amber-700">{day.noShowCount}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {day.admitted > 0 ? 'Live Flow' : 'Tracked'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Hourly Pacing Chart Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Turnstile Hourly Arrival Pacing
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Peak entry windows and gate flow pacing distribution.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                Peak: 16:00–17:00
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {hourlyArrivalPacing.map((h, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 text-center space-y-2"
                >
                  <span className="text-xs font-bold text-slate-700 font-mono block">
                    {h.time}
                  </span>
                  <div className="h-16 flex items-end justify-center">
                    <div
                      style={{ height: `${Math.max(12, h.sharePct)}%` }}
                      className="w-8 bg-rose-500 rounded-t-md transition-all duration-500"
                    />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 font-mono block">
                      {h.admittedCount}
                    </span>
                    <span className="text-[10px] text-slate-400 block">{h.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          REPORT 3: HOSPITALITY TIER TURNOUT REPORT
          ========================================================================= */}
      {activeReportTab === 'tiers' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                  Hospitality Tiers
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Enclosure Capacity & Turnout Ratios
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Compares admission and turnout rates across VIP Pavilion, Clubhouse Lounge, Garden Terrace, and Grandstand.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleExportCSV('Tier_Attendance_Report', tierAttendanceReport)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export Tier CSV</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {tierAttendanceReport.map((tier) => (
              <div
                key={tier.name}
                className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${tier.bgBadge}`}>
                      {tier.badge}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {tier.gate.split(' ')[0]}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 mt-2">{tier.name}</h4>
                  <span className="text-[11px] text-slate-500 block truncate">{tier.gate}</span>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Tier Attendance Rate:</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {tier.admissionRate}%
                    </span>
                  </div>

                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, tier.admissionRate)}%` }}
                      className={`h-full ${tier.barColor} rounded-full transition-all duration-500`}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-1 text-[11px] pt-1 text-slate-600">
                    <div>
                      <span className="text-slate-400 block text-[9px]">Approved</span>
                      <strong className="text-slate-900 font-mono">{tier.approved}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px]">Admitted</span>
                      <strong className="text-emerald-700 font-mono">{tier.admitted}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px]">Vacant</span>
                      <span className="text-amber-700 font-mono">{tier.vacantSeats}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
