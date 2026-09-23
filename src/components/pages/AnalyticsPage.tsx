import React, { useMemo } from 'react';
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
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const { stats, registrations } = useEvent();

  // Tier breakdown calculation
  const tiers = [
    { name: 'VIP Pavilion', color: 'bg-rose-500', barColor: 'bg-rose-500' },
    { name: 'Clubhouse Lounge', color: 'bg-amber-500', barColor: 'bg-amber-500' },
    { name: 'Garden Terrace', color: 'bg-emerald-500', barColor: 'bg-emerald-500' },
    { name: 'Grandstand', color: 'bg-sky-500', barColor: 'bg-sky-500' },
  ];

  // Dynamically calculate hourly turnstile gate entries from checkedInAt timestamps in DB
  const hourlyFlow = useMemo(() => {
    const hours = [
      { time: '14:00', label: 'Gate Open', hourNum: 14 },
      { time: '15:00', label: 'Prelims', hourNum: 15 },
      { time: '16:00', label: 'Peak Flow', hourNum: 16 },
      { time: '17:00', label: 'Exhibition', hourNum: 17 },
      { time: '18:00', label: 'Championship', hourNum: 18 },
      { time: '19:00', label: 'Trophy Gala', hourNum: 19 },
    ];

    return hours.map((h) => {
      const count = registrations.filter((r) => {
        if (!r.checkedIn) return false;
        if (!r.checkedInAt) return false;
        const timePart = r.checkedInAt.includes(' ') ? r.checkedInAt.split(' ')[1] : r.checkedInAt;
        const regHour = parseInt(timePart.split(':')[0], 10);
        return regHour === h.hourNum;
      }).length;

      return {
        time: h.time,
        label: h.label,
        count,
      };
    });
  }, [registrations]);

  const maxHour = Math.max(1, ...hourlyFlow.map((h) => h.count));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-rose-600" />
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Event Analytics & Insights</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Pacing, tier allocations, and turnstile gate traffic for Pink Polo 2026.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
            Live Synchronization Active
          </span>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Registration to Gate Entry Funnel
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <span className="text-[11px] font-semibold text-slate-500 block uppercase">1. Registrations</span>
            <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
              {stats.totalRegistrations.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 block mt-1">100% of pipeline</span>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <span className="text-[11px] font-semibold text-slate-500 block uppercase">2. Approved</span>
            <span className="text-2xl font-bold font-mono text-emerald-700 tabular-nums">
              {stats.approved.toLocaleString()}
            </span>
            <span className="text-[10px] text-emerald-600 block mt-1">
              {Math.round((stats.approved / (stats.totalRegistrations || 1)) * 100)}% approval rate
            </span>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <span className="text-[11px] font-semibold text-slate-500 block uppercase">3. Passes Issued</span>
            <span className="text-2xl font-bold font-mono text-rose-700 tabular-nums">
              {stats.ticketsGenerated.toLocaleString()}
            </span>
            <span className="text-[10px] text-rose-600 block mt-1">100% QR generated</span>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <span className="text-[11px] font-semibold text-slate-500 block uppercase">4. Admitted to Grounds</span>
            <span className="text-2xl font-bold font-mono text-sky-700 tabular-nums">
              {stats.checkedIn.toLocaleString()}
            </span>
            <span className="text-[10px] text-sky-600 block mt-1">
              {Math.round((stats.checkedIn / (stats.ticketsGenerated || 1)) * 100)}% gate scan rate
            </span>
          </div>
        </div>
      </div>

      {/* Two Column Grid: Tier Capacity & Hourly Gate Traffic */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tier Distribution Card */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Tier Allocation
              </h3>
              <p className="text-sm font-bold text-slate-900">Hospitality & Seating Breakdown</p>
            </div>
            <Award className="w-5 h-5 text-rose-500" />
          </div>

          <div className="space-y-4 pt-2">
            {tiers.map((tier) => {
              const count = registrations.filter((r) => r.tier === tier.name).length;
              const percent = Math.min(100, Math.round((count / (registrations.length || 1)) * 100));

              return (
                <div key={tier.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{tier.name}</span>
                    <span className="font-mono text-slate-500">
                      {count} attendees ({percent}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${percent}%` }}
                      className={`h-full ${tier.barColor} rounded-full transition-all duration-500`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hourly Turnstile Gate Entry Profile */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Hourly Entry Distribution
              </h3>
              <p className="text-sm font-bold text-slate-900">Gate Turnstile Pacing</p>
            </div>
            <span className="text-xs font-mono text-slate-400">Turnstile Entries</span>
          </div>

          <div className="h-48 flex items-end gap-3 pt-6 border-b border-slate-100">
            {hourlyFlow.map((h, i) => {
              const hPercent = Math.round((h.count / maxHour) * 100);
              return (
                <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group">
                  <div
                    style={{ height: `${hPercent}%` }}
                    className="w-full max-w-[28px] bg-rose-500/80 group-hover:bg-rose-600 rounded-t-md transition-all relative"
                    title={`${h.time}: ${h.count} attendees (${h.label})`}
                  >
                    <span className="opacity-0 group-hover:opacity-100 absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-mono bg-slate-900 text-white px-1 rounded transition-opacity">
                      {h.count}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 mt-2 block">
                    {h.time}
                  </span>
                  <span className="text-[9px] text-slate-400 truncate max-w-full block">
                    {h.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Total admitted: <strong className="font-mono">{stats.checkedIn}</strong></span>
            <span>Turnstile gates active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
