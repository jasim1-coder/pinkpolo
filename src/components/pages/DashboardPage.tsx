import React, { useMemo } from 'react';
import { useEvent } from '../../context/EventContext';
import { NavTab } from '../layout/Sidebar';
import {
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Ticket,
  UserCheck,
  TrendingUp,
  ArrowUpRight,
  Sparkles,
  QrCode,
  Calendar,
  ShieldCheck,
  ChevronRight,
  Flame,
  Send,
} from 'lucide-react';
import poloBannerImg from '../../assets/images/pink_polo_banner_1790157590237.jpg';
import ghantootLogo from '../../assets/images/ghantoot_polo_logo.png';

interface DashboardPageProps {
  setCurrentTab: (tab: NavTab) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ setCurrentTab }) => {
  const {
    stats,
    activities,
    registrations,
    simulateNewRegistration,
    setSelectedRegistration,
  } = useEvent();

  // Formatting numbers with comma separators
  const formatNum = (num: number) => (num || 0).toLocaleString('en-US');

  // Calculate check-in percentage
  const checkInRate = stats.ticketsGenerated > 0
    ? Math.round((stats.checkedIn / stats.ticketsGenerated) * 100)
    : 0;

  // Calculate approval rate
  const approvalRate = stats.totalRegistrations > 0
    ? Math.round((stats.approved / stats.totalRegistrations) * 100)
    : 0;

  // Stat cards definition with live computed metrics
  const statCards = [
    {
      title: 'Total Registrations',
      value: formatNum(stats.totalRegistrations),
      diff: `${stats.totalRegistrations} total requests`,
      icon: Users,
      color: 'text-slate-900',
      bgLight: 'bg-slate-50',
      border: 'border-slate-200',
      iconBg: 'bg-slate-100 text-slate-700',
      tabTarget: 'registrations' as NavTab,
    },
    {
      title: 'Pending Approval',
      value: formatNum(stats.pendingApproval),
      diff: stats.pendingApproval > 0 ? `${stats.pendingApproval} awaiting review` : 'All reviewed',
      icon: Clock,
      color: 'text-amber-700',
      bgLight: 'bg-amber-50/50',
      border: 'border-amber-200',
      iconBg: 'bg-amber-100 text-amber-700',
      tabTarget: 'registrations' as NavTab,
    },
    {
      title: 'Approved',
      value: formatNum(stats.approved),
      diff: `${approvalRate}% approval rate`,
      icon: CheckCircle2,
      color: 'text-emerald-700',
      bgLight: 'bg-emerald-50/50',
      border: 'border-emerald-200',
      iconBg: 'bg-emerald-100 text-emerald-700',
      tabTarget: 'registrations' as NavTab,
    },
    {
      title: 'Rejected',
      value: formatNum(stats.rejected),
      diff: `${stats.rejected} rejected`,
      icon: XCircle,
      color: 'text-rose-700',
      bgLight: 'bg-rose-50/40',
      border: 'border-rose-200',
      iconBg: 'bg-rose-100 text-rose-700',
      tabTarget: 'registrations' as NavTab,
    },
    {
      title: 'Tickets Generated',
      value: formatNum(stats.ticketsGenerated),
      diff: `${stats.ticketsGenerated} passes issued`,
      icon: Ticket,
      color: 'text-rose-900',
      bgLight: 'bg-rose-50/60',
      border: 'border-rose-300',
      iconBg: 'bg-rose-100 text-rose-700',
      tabTarget: 'tickets' as NavTab,
    },
    {
      title: 'Checked In',
      value: formatNum(stats.checkedIn),
      diff: `${checkInRate}% turnout at gate`,
      icon: UserCheck,
      color: 'text-sky-800',
      bgLight: 'bg-sky-50/50',
      border: 'border-sky-200',
      iconBg: 'bg-sky-100 text-sky-700',
      tabTarget: 'checkin' as NavTab,
    },
  ];

  // Dynamically compute 7-day timeline pacing from real DB registrations
  const timelineDays = useMemo(() => {
    const days: { day: string; count: number; approved: number }[] = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const isoDateStr = d.toISOString().slice(0, 10);
      const dayLabel = i === 0 ? 'Today' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      const dayRegs = registrations.filter((r) => r.registrationDate && r.registrationDate.startsWith(isoDateStr));
      const dayApproved = dayRegs.filter((r) => r.status === 'Approved').length;

      days.push({
        day: dayLabel,
        count: dayRegs.length,
        approved: dayApproved,
      });
    }
    return days;
  }, [registrations]);

  const maxVal = Math.max(1, ...timelineDays.map((d) => d.count));

  // Dynamically compute daily turnstile attendance & check-ins per event date
  const dailyCheckIns = useMemo(() => {
    const today = new Date();
    const days: {
      dayLabel: string;
      dateStr: string;
      checkedInCount: number;
      gate1Count: number;
      gate2Count: number;
      gate3Count: number;
      gate4Count: number;
    }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const isoDateStr = d.toISOString().slice(0, 10);
      const dayLabel = i === 0 ? 'Today' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      // Find all attendees who checked in on this date
      const checkedOnDay = registrations.filter(
        (r) => r.checkedIn && r.checkedInAt && r.checkedInAt.startsWith(isoDateStr)
      );

      const g1 = checkedOnDay.filter((r) => r.scannedGate?.includes('Gate 1') || r.tier === 'VIP Pavilion').length;
      const g2 = checkedOnDay.filter((r) => r.scannedGate?.includes('Gate 2') || r.tier === 'Clubhouse Lounge').length;
      const g3 = checkedOnDay.filter((r) => r.scannedGate?.includes('Gate 3') || r.tier === 'Garden Terrace').length;
      const g4 = checkedOnDay.filter((r) => r.scannedGate?.includes('Gate 4') || r.tier === 'Grandstand').length;

      days.push({
        dayLabel,
        dateStr: isoDateStr,
        checkedInCount: checkedOnDay.length,
        gate1Count: g1,
        gate2Count: g2,
        gate3Count: g3,
        gate4Count: g4,
      });
    }

    return days;
  }, [registrations]);

  const maxCheckInDay = Math.max(1, ...dailyCheckIns.map((d) => d.checkedInCount));

  return (
    <div className="space-y-6">
      {/* Hero Event Banner Card */}
      <div className="relative overflow-hidden rounded-2xl border border-rose-200/80 bg-slate-900 text-white shadow-sm">
        <div className="absolute inset-0 z-0">
          <img
            src={poloBannerImg}
            alt="Pink Polo 2026 Grounds"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/90 to-transparent" />
        </div>

        <div className="relative z-10 p-6 lg:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-xl space-y-3">
            {/* Ghantoot Racing & Polo Club Logo Badge */}
            <div className="bg-white/95 backdrop-blur-md rounded-xl p-2 sm:p-2.5 shadow-md inline-flex items-center gap-2.5 border border-white/40">
              <img
                src={ghantootLogo}
                alt="Ghantoot Racing & Polo Club"
                className="h-9 w-auto object-contain"
              />
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-slate-900 tracking-tight leading-tight">
                  GHANTOOT RACING & POLO CLUB
                </span>
                <span className="text-[9px] text-rose-700 font-semibold leading-tight">
                  نادي غنتوت لسباق الخيل والبولو
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Official Event Dashboard
              </span>
              <span className="text-xs text-slate-300 font-medium">Pink Polo 2026</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-serif font-bold text-white tracking-tight">
              Ghantoot Pink Polo Invitational & Gala
            </h2>
            <p className="text-xs lg:text-sm text-slate-300 leading-relaxed">
              Real-time monitoring console for guest approvals, verified QR entry passes, and Gate 1–4 turnstile check-ins.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setCurrentTab('register')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
            >
              <Send className="w-4 h-4 text-white" />
              <span>Submit Request (Guest UI)</span>
            </button>
            <button
              onClick={() => setCurrentTab('checkin')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-slate-900 hover:bg-rose-50 font-semibold text-xs rounded-xl shadow-md transition-colors"
            >
              <QrCode className="w-4 h-4 text-rose-600" />
              <span>Launch Gate Scanner</span>
            </button>
            <button
              onClick={simulateNewRegistration}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl shadow-md border border-slate-700 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-rose-300" />
              <span>+ Quick Attendee</span>
            </button>
          </div>
        </div>
      </div>

      {/* 6 Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={() => setCurrentTab(card.tabTarget)}
              className={`p-4 rounded-xl border bg-white shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between ${card.border}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 group-hover:text-slate-900 transition-colors">
                  {card.title}
                </span>
                <div className={`p-2 rounded-lg ${card.iconBg}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-3">
                <div className={`text-2xl font-bold font-mono tracking-tight tabular-nums ${card.color}`}>
                  {card.value}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                  <span>{card.diff}</span>
                  <ArrowUpRight className="w-3 h-3 text-slate-300 group-hover:text-rose-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Two Column Layout: Charts & Live Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Status Breakdown, Check-in progress & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chart 1: Registration Status Breakdown + Check-In Progress */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Status Breakdown Card */}
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Registration Distribution
                  </h3>
                  <p className="text-sm font-bold text-slate-900">Current Status Ratio</p>
                </div>
                <span className="text-xs font-mono text-slate-500 font-semibold">
                  {formatNum(stats.totalRegistrations)} total
                </span>
              </div>

              {/* Stacked Progress Bar */}
              <div className="space-y-2">
                <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                  <div
                    style={{ width: `${(stats.approved / (stats.totalRegistrations || 1)) * 100}%` }}
                    className="bg-emerald-500 h-full transition-all duration-500"
                    title={`Approved: ${stats.approved}`}
                  />
                  <div
                    style={{ width: `${(stats.pendingApproval / (stats.totalRegistrations || 1)) * 100}%` }}
                    className="bg-amber-400 h-full transition-all duration-500"
                    title={`Pending: ${stats.pendingApproval}`}
                  />
                  <div
                    style={{ width: `${(stats.rejected / (stats.totalRegistrations || 1)) * 100}%` }}
                    className="bg-rose-500 h-full transition-all duration-500"
                    title={`Rejected: ${stats.rejected}`}
                  />
                </div>

                {/* Legend & Breakdown values */}
                <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                    <span className="text-[11px] text-emerald-800 block font-medium">Approved</span>
                    <span className="font-mono font-bold text-emerald-900 tabular-nums">
                      {formatNum(stats.approved)}
                    </span>
                    <span className="block text-[10px] text-emerald-600">
                      {Math.round((stats.approved / (stats.totalRegistrations || 1)) * 100)}%
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-amber-50 border border-amber-100">
                    <span className="text-[11px] text-amber-800 block font-medium">Pending</span>
                    <span className="font-mono font-bold text-amber-900 tabular-nums">
                      {formatNum(stats.pendingApproval)}
                    </span>
                    <span className="block text-[10px] text-amber-600">
                      {Math.round((stats.pendingApproval / (stats.totalRegistrations || 1)) * 100)}%
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-rose-50 border border-rose-100">
                    <span className="text-[11px] text-rose-800 block font-medium">Rejected</span>
                    <span className="font-mono font-bold text-rose-900 tabular-nums">
                      {formatNum(stats.rejected)}
                    </span>
                    <span className="block text-[10px] text-rose-600">
                      {Math.round((stats.rejected / (stats.totalRegistrations || 1)) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Check-In Gate Progress Card */}
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Gate Check-in Statistics
                  </h3>
                  <span className="text-[11px] px-2 py-0.5 rounded font-semibold text-rose-700 bg-rose-50 border border-rose-200">
                    Gate 1-4 Active
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-900 mt-1">Turnout & Gate Attendance</p>
              </div>

              <div className="flex items-center justify-between gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-500 block">Total Checked In</span>
                  <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                    {formatNum(stats.checkedIn)}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    of {formatNum(stats.ticketsGenerated)} issued tickets
                  </span>
                </div>

                <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-200"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-rose-600 transition-all duration-500"
                      strokeDasharray={`${checkInRate}, 100`}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-sm font-bold font-mono text-slate-900 tabular-nums">{checkInRate}%</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-500">Remaining to enter:</span>
                <span className="font-mono font-bold text-slate-800 tabular-nums">
                  {formatNum(Math.max(0, stats.ticketsGenerated - stats.checkedIn))} attendees
                </span>
              </div>
            </div>
          </div>

          {/* Chart 2: Registrations Over Time (Timeline Chart) */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Registrations Over Time
                </h3>
                <p className="text-sm font-bold text-slate-900">Registration Volume & Approval Pacing</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="text-slate-600">Total Volume</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-slate-600">Approved Passes</span>
                </div>
              </div>
            </div>

            {/* SVG Visual Bars / Curves */}
            <div className="h-44 flex items-end gap-3 pt-6 border-b border-slate-100">
              {timelineDays.map((item, i) => {
                const heightPercent = Math.round((item.count / maxVal) * 100);
                const approvedPercent = Math.round((item.approved / maxVal) * 100);

                return (
                  <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group">
                    <div className="w-full flex items-end justify-center gap-1 h-full">
                      {/* Approved Bar */}
                      <div
                        style={{ height: `${approvedPercent}%` }}
                        className="w-1/2 max-w-[18px] bg-emerald-400/80 group-hover:bg-emerald-500 rounded-t-sm transition-all"
                        title={`${item.day} Approved: ${item.approved}`}
                      />
                      {/* Total Bar */}
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-1/2 max-w-[18px] bg-rose-500 group-hover:bg-rose-600 rounded-t-sm transition-all"
                        title={`${item.day} Total: ${item.count}`}
                      />
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 mt-2 block group-hover:text-slate-900 transition-colors">
                      {item.day}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                <TrendingUp className="w-3.5 h-3.5" />
                {stats.totalRegistrations > 0
                  ? `${stats.totalRegistrations} registrations tracked in database`
                  : 'Live registration tracking initialized'}
              </span>
              <span className="font-mono text-[11px] text-slate-400">Database synchronized</span>
            </div>
          </div>

          {/* Report 3: SEPARATE GATE ATTENDANCE & CHECK-IN REPORT BY DATE */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-sky-100 text-sky-800 border border-sky-200">
                    Turnstile Attendance Report
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">Live Gates 1–4</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mt-1">
                  Checked-In Attendees by Event Date
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <div className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-sky-600" />
                  <span>Total Admitted: <strong className="font-mono text-slate-900">{formatNum(stats.checkedIn)}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentTab('checkin')}
                  className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition-colors"
                >
                  Open Scanner →
                </button>
              </div>
            </div>

            {/* Visual Date-by-Date Attendance Histogram */}
            <div className="space-y-3">
              <div className="grid grid-cols-7 gap-2 pt-2">
                {dailyCheckIns.map((day, idx) => {
                  const checkInPct = maxCheckInDay > 0 ? Math.round((day.checkedInCount / maxCheckInDay) * 100) : 0;
                  const isToday = day.dayLabel === 'Today';

                  return (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl border flex flex-col justify-between text-center transition-all ${
                        isToday
                          ? 'bg-sky-50/70 border-sky-300 ring-1 ring-sky-300/60 shadow-2xs'
                          : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/70'
                      }`}
                    >
                      <span className="text-[11px] font-bold text-slate-700 block truncate">
                        {day.dayLabel}
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono block">
                        {day.dateStr.slice(5)}
                      </span>

                      {/* Mini Bar Meter */}
                      <div className="h-14 w-full bg-slate-200/60 rounded-lg my-1.5 flex items-end justify-center p-1 overflow-hidden">
                        <div
                          style={{ height: `${Math.max(8, checkInPct)}%` }}
                          className={`w-full rounded-md transition-all duration-500 ${
                            day.checkedInCount > 0
                              ? 'bg-sky-600 shadow-xs'
                              : 'bg-slate-300'
                          }`}
                          title={`${day.dayLabel}: ${day.checkedInCount} attendees checked in`}
                        />
                      </div>

                      <div className="font-mono font-bold text-xs text-slate-900">
                        {day.checkedInCount}
                        <span className="text-[9px] text-slate-400 font-normal block">attended</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Turnstile Gate Breakdown Strip for Recorded Check-ins */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-500 block truncate">Gate 1 (Royal VIP)</span>
                    <strong className="font-mono text-slate-900">
                      {registrations.filter((r) => r.checkedIn && (r.scannedGate?.includes('Gate 1') || r.tier === 'VIP Pavilion')).length} checked in
                    </strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-500 block truncate">Gate 2 (Clubhouse)</span>
                    <strong className="font-mono text-slate-900">
                      {registrations.filter((r) => r.checkedIn && (r.scannedGate?.includes('Gate 2') || r.tier === 'Clubhouse Lounge')).length} checked in
                    </strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-500 block truncate">Gate 3 (Terrace)</span>
                    <strong className="font-mono text-slate-900">
                      {registrations.filter((r) => r.checkedIn && (r.scannedGate?.includes('Gate 3') || r.tier === 'Garden Terrace')).length} checked in
                    </strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-500 block truncate">Gate 4 (Grandstand)</span>
                    <strong className="font-mono text-slate-900">
                      {registrations.filter((r) => r.checkedIn && (r.scannedGate?.includes('Gate 4') || r.tier === 'Grandstand')).length} checked in
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: LIVE RECENT ACTIVITY SECTION */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Live Feed
                </h3>
              </div>
              <p className="text-sm font-bold text-slate-900">Recent Activity</p>
            </div>
            <button
              onClick={() => setCurrentTab('registrations')}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
            >
              View All
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 max-h-[540px]">
            {activities.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Users className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-600">No activity recorded yet</p>
                <p className="text-[11px] text-slate-400 max-w-[200px] mx-auto">
                  Incoming registrations, pass issues, and turnstile scans will appear here live.
                </p>
              </div>
            ) : (
              activities.map((act) => {
                let iconBox = (
                  <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700 shrink-0 mt-0.5">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                );

                if (act.type === 'approval') {
                  iconBox = (
                    <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  );
                } else if (act.type === 'ticket') {
                  iconBox = (
                    <div className="p-1.5 rounded-lg bg-rose-100 text-rose-700 shrink-0 mt-0.5">
                      <Ticket className="w-3.5 h-3.5" />
                    </div>
                  );
                } else if (act.type === 'checkin') {
                  iconBox = (
                    <div className="p-1.5 rounded-lg bg-sky-100 text-sky-700 shrink-0 mt-0.5">
                      <UserCheck className="w-3.5 h-3.5" />
                    </div>
                  );
                } else if (act.type === 'rejection') {
                  iconBox = (
                    <div className="p-1.5 rounded-lg bg-rose-100 text-rose-800 shrink-0 mt-0.5">
                      <XCircle className="w-3.5 h-3.5" />
                    </div>
                  );
                }

                return (
                  <div
                    key={act.id}
                    onClick={() => {
                      const match = registrations.find(
                        (r) => r.name.toLowerCase() === act.attendeeName.toLowerCase()
                      );
                      if (match) setSelectedRegistration(match);
                    }}
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                  >
                    {iconBox}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {act.title}
                        </p>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">
                          {act.timeAgo}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-2">
                        {act.description}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 text-center">
            <span className="text-[11px] text-slate-400">
              Connected to real-time event dispatcher
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
