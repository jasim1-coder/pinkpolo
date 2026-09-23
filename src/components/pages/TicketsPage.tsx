import React, { useState, useMemo } from 'react';
import { useEvent } from '../../context/EventContext';
import { Registration } from '../../types';
import {
  Search,
  Ticket,
  CheckCircle2,
  Clock,
  UserCheck,
  QrCode,
  ExternalLink,
  Download,
  Filter,
} from 'lucide-react';

export const TicketsPage: React.FC = () => {
  const { registrations, stats, setSelectedTicketPass } = useEvent();

  const [search, setSearch] = useState('');
  const [checkInFilter, setCheckInFilter] = useState<'All' | 'Checked In' | 'Not Checked In'>('All');
  const [tierFilter, setTierFilter] = useState<string>('All');

  // Filter only registrations with ticketId or Approved status
  const approvedTickets = useMemo(() => {
    return registrations.filter((r) => r.status === 'Approved' && r.ticketId);
  }, [registrations]);

  const filteredTickets = useMemo(() => {
    return approvedTickets.filter((item) => {
      const query = search.toLowerCase().trim();
      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.email.toLowerCase().includes(query) ||
        (item.ticketId && item.ticketId.toLowerCase().includes(query)) ||
        item.id.toLowerCase().includes(query);

      let matchesCheckIn = true;
      if (checkInFilter === 'Checked In') matchesCheckIn = item.checkedIn;
      if (checkInFilter === 'Not Checked In') matchesCheckIn = !item.checkedIn;

      const matchesTier = tierFilter === 'All' || item.tier === tierFilter;

      return matchesSearch && matchesCheckIn && matchesTier;
    });
  }, [approvedTickets, search, checkInFilter, tierFilter]);

  const handleExportTickets = () => {
    const headers = ['Ticket ID', 'Attendee Name', 'Email', 'Tier', 'Status', 'Generated Date', 'Check-in Status', 'Check-in Time'];
    const rows = filteredTickets.map((t) => [
      t.ticketId || '',
      `"${t.name}"`,
      t.email,
      `"${t.tier}"`,
      t.ticketStatus || 'Valid',
      t.ticketGeneratedAt || '',
      t.checkedIn ? 'Checked In' : 'Not Checked In',
      t.checkedInAt || 'N/A',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'PinkPolo2026_IssuedTickets.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-rose-600" />
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Issued QR Tickets</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified gate barcodes and e-Passes issued to approved attendees.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportTickets}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors shadow-2xs"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Export Ticket Manifest</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Tickets Generated</span>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
              {stats.ticketsGenerated.toLocaleString()}
            </div>
            <span className="text-[11px] text-emerald-600 font-medium">
              {stats.ticketsGenerated > 0 ? `${stats.ticketsGenerated} verified passes` : 'No passes issued'}
            </span>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <Ticket className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Checked In at Gate</span>
            <div className="text-2xl font-bold font-mono text-emerald-700 mt-1 tabular-nums">
              {stats.checkedIn.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-400">
              {stats.ticketsGenerated > 0 ? Math.round((stats.checkedIn / stats.ticketsGenerated) * 100) : 0}% attendance
            </span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Not Checked In</span>
            <div className="text-2xl font-bold font-mono text-amber-700 mt-1 tabular-nums">
              {Math.max(0, stats.ticketsGenerated - stats.checkedIn).toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-400">Pending gate arrival</span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ticket ID, attendee name..."
            className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 focus:bg-white text-slate-900"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Check-In Filter Buttons */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs">
            {(['All', 'Checked In', 'Not Checked In'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setCheckInFilter(filter)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  checkInFilter === filter
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Tier Select */}
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
          >
            <option value="All">All Tiers</option>
            <option value="VIP Pavilion">VIP Pavilion</option>
            <option value="Grandstand">Grandstand</option>
            <option value="Garden Terrace">Garden Terrace</option>
            <option value="Clubhouse Lounge">Clubhouse Lounge</option>
          </select>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Ticket ID</th>
                <th className="py-3.5 px-4">Attendee Name</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Tier Access</th>
                <th className="py-3.5 px-4">Generated Date</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Check-in Status</th>
                <th className="py-3.5 px-4 text-right">Pass View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-slate-600 text-sm">No issued tickets match your criteria</p>
                    <p className="text-xs text-slate-400 mt-1">Approve pending attendees to issue new tickets.</p>
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    onClick={() => setSelectedTicketPass(ticket)}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                  >
                    {/* Ticket ID */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded bg-rose-50 text-rose-600">
                          <Ticket className="w-3.5 h-3.5" />
                        </span>
                        <span className="font-mono font-bold text-slate-900 group-hover:text-rose-600 transition-colors">
                          {ticket.ticketId}
                        </span>
                      </div>
                    </td>

                    {/* Attendee Name */}
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {ticket.name}
                    </td>

                    {/* Email */}
                    <td className="py-3.5 px-4 font-mono text-slate-600 truncate max-w-[190px]">
                      {ticket.email}
                    </td>

                    {/* Tier */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold text-slate-700 bg-slate-100 border border-slate-200">
                        {ticket.tier}
                      </span>
                    </td>

                    {/* Generated Date */}
                    <td className="py-3.5 px-4 font-mono text-slate-500 tabular-nums whitespace-nowrap">
                      {ticket.ticketGeneratedAt || ticket.registrationDate}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Approved
                      </span>
                    </td>

                    {/* Check-in Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {ticket.checkedIn ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                          Checked In
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded-md">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          Not Checked In
                        </span>
                      )}
                    </td>

                    {/* Pass View Button */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setSelectedTicketPass(ticket)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                        title="View Official QR Ticket Pass"
                      >
                        <QrCode className="w-3.5 h-3.5 text-rose-600" />
                        <span>View Pass</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            Total issued passes: <strong className="font-mono text-slate-900">{filteredTickets.length}</strong>
          </span>
          <span className="text-[11px] text-slate-400">
            Click any row to open the high-resolution printable pass
          </span>
        </div>
      </div>
    </div>
  );
};
