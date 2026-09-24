import React, { useState, useMemo } from 'react';
import { useEvent } from '../../context/EventContext';
import {
  BarChart3,
  TrendingUp,
  Users,
  CheckCircle2,
  Ticket,
  UserCheck,
  Calendar,
  Layers,
  Award,
  Download,
  Clock,
  MapPin,
  Percent,
  UserX,
  Zap,
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const { stats, registrations, addToast } = useEvent();
  const [activeReportTab, setActiveReportTab] = useState<'all' | 'daily' | 'tiers' | 'noshow'>('all');

  // Overall Admission & No-Show KPIs
  const totalApproved = stats.ticketsGenerated || stats.approved || 1;
  const overallAdmissionRate = Math.round((stats.checkedIn / totalApproved) * 100);
  const overallNoShowRate = Math.max(0, 100 - overallAdmissionRate);
  const pendingArrivals = Math.max(0, stats.ticketsGenerated - stats.checkedIn);

  // =========================================================================
  // REPORT 1: DAILY EVENT ATTENDANCE & ADMISSION RATE DATA
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
      // Scale based on live registered guest count
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
  // REPORT 2: TIER-BY-TIER GUEST ATTENDANCE & ADMISSION RATE
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
  // REPORT 3: HOURLY ARRIVAL PACING & NO-SHOW / DROP-OFF DATA
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

  const maxHourAdmit = Math.max(1, ...hourlyArrivalPacing.map((h) => h.admittedCount));

  // CSV Exporter for Reports
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
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-rose-600" />
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Guest Attendance & Admission Rate Reports
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time daily admission rates, tier turnout ratios, and hourly arrival pacing.
          </p>
        </div>

        {/* Report Tab Filters */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveReportTab('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeReportTab === 'all'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All 3 Reports
          </button>
          <button
            type="button"
            onClick={() => setActiveReportTab('daily')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeReportTab === 'daily'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1. Daily Admission
          </button>
          <button
            type="button"
            onClick={() => setActiveReportTab('tiers')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeReportTab === 'tiers'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            2. Tier Turnout
          </button>
          <button
            type="button"
            onClick={() => setActiveReportTab('noshow')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeReportTab === 'noshow'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            3. Arrival & No-Shows
          </button>
        </div>
      </div>

      {/* Top 4 Executive KPI Cards */}
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

      {/* =========================================================================
          REPORT 1: DAILY EVENT ATTENDANCE & ADMISSION RATE REPORT
          ========================================================================= */}
      {(activeReportTab === 'all' || activeReportTab === 'daily') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                  Report 1
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Daily Event Attendance & Admission Rate Breakdown
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Tracks approved passes versus admitted guests and computes the exact admission rate for each event date.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleExportCSV('Daily_Attendance_Report', dailyAttendanceReport)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
          </div>

          {/* 3 Main Gala Days Cards */}
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

                  {/* Progress Bar */}
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
          <div className="overflow-x-auto">
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
      )}

      {/* =========================================================================
          REPORT 2: TIER-BY-TIER GUEST ATTENDANCE & TURNOUT RATE REPORT
          ========================================================================= */}
      {(activeReportTab === 'all' || activeReportTab === 'tiers') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                  Report 2
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Hospitality Tier Attendance & Enclosure Capacity Turnout
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Compares admission and attendance rates across VIP Pavilion, Clubhouse, Garden Terrace, and Grandstand.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleExportCSV('Tier_Attendance_Report', tierAttendanceReport)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
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

      {/* =========================================================================
          REPORT 3: HOURLY ARRIVAL PACING & NO-SHOW / DROP-OFF REPORT
          ========================================================================= */}
      {(activeReportTab === 'all' || activeReportTab === 'noshow') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-sky-100 text-sky-800 border border-sky-200">
                  Report 3
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Hourly Arrival Pacing & No-Show / Drop-Off Analysis
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Examines arrival velocity across hourly waves and calculates unclaimed seat capacity for waitlist re-allocation.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleExportCSV('Hourly_Arrival_Pacing', hourlyArrivalPacing)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left: Hourly Flow Histogram */}
            <div className="lg:col-span-8 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold">Turnstile Entry Distribution (14:00 – 19:00)</span>
                <span className="font-mono text-slate-400">Peak Admitted Wave</span>
              </div>

              <div className="h-44 flex items-end gap-3 pt-6 border-b border-slate-100">
                {hourlyArrivalPacing.map((h, idx) => {
                  const hPercent = maxHourAdmit > 0 ? Math.round((h.admittedCount / maxHourAdmit) * 100) : 0;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                      <div
                        style={{ height: `${Math.max(10, hPercent)}%` }}
                        className="w-full max-w-[32px] bg-sky-600/80 group-hover:bg-sky-600 rounded-t-lg transition-all relative flex items-center justify-center shadow-xs"
                      >
                        <span className="opacity-0 group-hover:opacity-100 absolute -top-6 text-[10px] font-mono bg-slate-900 text-white px-1.5 py-0.5 rounded transition-opacity shadow-xs whitespace-nowrap">
                          {h.admittedCount} guests
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-slate-700 mt-2 block">
                        {h.time}
                      </span>
                      <span className="text-[9px] text-slate-400 truncate max-w-full block">
                        {h.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>Fastest turnstile pacing during 16:00 peak gala rush</span>
                <span className="font-mono text-slate-700 font-semibold">{stats.checkedIn} total check-ins</span>
              </div>
            </div>

            {/* Right: No-Show & Reallocation Action Card */}
            <div className="lg:col-span-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Seat Re-Allocation Summary</span>
                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  {overallNoShowRate}% No-Show
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Unclaimed Passes:</span>
                  <strong className="font-mono text-slate-900">{pendingArrivals}</strong>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Standby Capacity:</span>
                  <strong className="font-mono text-emerald-700">{Math.round(pendingArrivals * 0.8)} seats</strong>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500">Turnstile Status:</span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Operational
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-tight pt-1">
                Unclaimed tickets past 17:00 gate cutoff can be released directly to VIP waitlist candidates.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
