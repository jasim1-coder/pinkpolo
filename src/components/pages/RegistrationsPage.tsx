import React, { useState, useMemo } from 'react';
import { useEvent } from '../../context/EventContext';
import { useGmail } from '../../context/GmailContext';
import { GoogleAuthButton } from '../common/GoogleAuthButton';
import { Registration, RegistrationStatus } from '../../types';
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  Ticket,
  ChevronLeft,
  ChevronRight,
  Eye,
  Check,
  X,
  Download,
  Calendar,
  Sparkles,
  Send,
  Mail,
  MessageSquare,
  ExternalLink,
  Share2,
} from 'lucide-react';

import { sendWhatsAppTicketPass, getGateForTier } from '../../services/whatsappService';

interface RegistrationsPageProps {
  onOpenRegisterForm?: () => void;
}

export const RegistrationsPage: React.FC<RegistrationsPageProps> = ({ onOpenRegisterForm }) => {
  const {
    registrations,
    approveRegistration,
    rejectRegistration,
    setSelectedRegistration,
    setSelectedTicketPass,
    addToast,
  } = useEvent();

  const {
    currentUser,
    hasGmailAuth,
    isLoadingAuth,
    signInWithGoogle,
    openEmailConfirmation,
  } = useGmail();

  const [sendingWhatsAppId, setSendingWhatsAppId] = useState<string | null>(null);

  const handleDirectSendWhatsApp = async (reg: Registration) => {
    if (!reg.whatsapp) {
      addToast('warning', 'No Phone Number', `No WhatsApp phone number on file for ${reg.name}.`);
      return;
    }
    setSendingWhatsAppId(reg.id);
    addToast('info', 'Sending WhatsApp Pass...', `Dispatching official pass to ${reg.whatsapp} via Meta Cloud API...`);
    try {
      const res = await sendWhatsAppTicketPass({
        toPhone: reg.whatsapp,
        attendeeName: reg.name,
        ticketId: reg.ticketId || reg.id,
        tier: reg.tier,
        gate: getGateForTier(reg.tier),
        qrValue: reg.qrValue || `PINK-POLO-2026-${reg.ticketId || reg.id}`,
      });
      if (res.success) {
        addToast('success', 'WhatsApp Pass Dispatched!', `Official QR pass sent directly to ${reg.whatsapp}`);
      } else {
        addToast('error', 'WhatsApp Dispatch Error', res.error || 'Failed to dispatch via WhatsApp Cloud API');
      }
    } catch (err: any) {
      addToast('error', 'WhatsApp Dispatch Failed', err?.message || 'Server error');
    } finally {
      setSendingWhatsAppId(null);
    }
  };

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | RegistrationStatus>('All');
  const [dateFilter, setDateFilter] = useState<string>('All'); // 'All', 'Today', 'Past 3 Days', 'Older'
  const [tierFilter, setTierFilter] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Filtered registrations
  const filteredRegistrations = useMemo(() => {
    return registrations.filter((reg) => {
      // Search matches name, email, phone, ticket ID, registration ID
      const query = search.toLowerCase().trim();
      const matchesSearch =
        !query ||
        reg.name.toLowerCase().includes(query) ||
        reg.email.toLowerCase().includes(query) ||
        reg.whatsapp.toLowerCase().includes(query) ||
        (reg.ticketId && reg.ticketId.toLowerCase().includes(query)) ||
        reg.id.toLowerCase().includes(query);

      // Status filter
      const matchesStatus = statusFilter === 'All' || reg.status === statusFilter;

      // Tier filter
      const matchesTier = tierFilter === 'All' || reg.tier === tierFilter;

      // Date filter (dynamic based on current day and past 3 days)
      let matchesDate = true;
      if (dateFilter === 'Today') {
        const todayIso = new Date().toISOString().slice(0, 10);
        matchesDate = Boolean(reg.registrationDate && reg.registrationDate.startsWith(todayIso));
      } else if (dateFilter === 'Past 3 Days') {
        const regTime = new Date(reg.registrationDate).getTime();
        const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
        matchesDate = !isNaN(regTime) ? regTime >= threeDaysAgo : true;
      }

      return matchesSearch && matchesStatus && matchesTier && matchesDate;
    });
  }, [registrations, search, statusFilter, dateFilter, tierFilter]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredRegistrations.length / pageSize) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRegistrations.slice(start, start + pageSize);
  }, [filteredRegistrations, currentPage, pageSize]);

  const handleExportCSV = () => {
    const headers = ['ID', 'Name', 'Email', 'WhatsApp', 'Date', 'Status', 'Tier', 'Ticket ID', 'Checked In'];
    const rows = filteredRegistrations.map((r) => [
      r.id,
      `"${r.name}"`,
      r.email,
      r.whatsapp,
      r.registrationDate,
      r.status,
      `"${r.tier}"`,
      r.ticketId || 'N/A',
      r.checkedIn ? 'Yes' : 'No',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'PinkPolo2026_Registrations.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar with Quick Stats & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Attendee Registrations</h2>
          <p className="text-xs text-slate-500">
            Review incoming applications, issue VIP digital passes, and manage guest approvals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {onOpenRegisterForm && (
            <button
              type="button"
              onClick={onOpenRegisterForm}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors shadow-2xs whitespace-nowrap"
              title="Open the public attendee submission form"
            >
              <Send className="w-3.5 h-3.5 text-rose-600" />
              <span>+ Open Guest Form</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              const publicUrl = `${window.location.origin}/register`;
              if (navigator.clipboard) {
                navigator.clipboard.writeText(publicUrl);
                addToast('success', 'Public Link Copied!', `${publicUrl} copied to clipboard.`);
              }
              window.open('/register', '_blank');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors shadow-2xs"
            title="Open and copy public attendee registration link"
          >
            <ExternalLink className="w-3.5 h-3.5 text-rose-600" />
            <span>Public Registration Link</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Google Workspace Gmail Integration Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-700/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="p-2.5 bg-rose-500/20 text-rose-300 rounded-xl border border-rose-500/30 shrink-0">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-tight">Real Email Ticket Pass Delivery</h3>
              {hasGmailAuth ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Connected ({currentUser?.email})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Connect Required
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Send official Pink Polo 2026 QR admission passes directly to attendees' real inboxes via Google Workspace Gmail API.
            </p>
          </div>
        </div>

        <div className="shrink-0 w-full sm:w-auto">
          {hasGmailAuth ? (
            <div className="text-xs text-emerald-300 font-medium flex items-center gap-1.5 bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-800/60">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Ready to dispatch real emails</span>
            </div>
          ) : (
            <GoogleAuthButton
              onClick={signInWithGoogle}
              isLoading={isLoadingAuth}
              label="Sign in to Send Real Emails"
              className="w-full sm:w-auto justify-center"
            />
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by name, email, WhatsApp, or ticket ID..."
              className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 focus:bg-white text-slate-900 placeholder-slate-400"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 text-slate-800"
            >
              <option value="All">All Statuses ({registrations.length})</option>
              <option value="Pending">Pending ({registrations.filter((r) => r.status === 'Pending').length})</option>
              <option value="Approved">Approved ({registrations.filter((r) => r.status === 'Approved').length})</option>
              <option value="Rejected">Rejected ({registrations.filter((r) => r.status === 'Rejected').length})</option>
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 text-slate-800"
            >
              <option value="All">All Registration Dates</option>
              <option value="Today">Today</option>
              <option value="Past 3 Days">Past 3 Days</option>
            </select>
          </div>
        </div>

        {/* Tier filter pill tags (Functional Buttons per Anti-slop constitution) */}
        <div className="flex items-center gap-1.5 pt-1 text-xs">
          <span className="text-slate-400 text-[11px] font-medium mr-1">Access Tier:</span>
          {['All', 'VIP Pavilion', 'Grandstand', 'Garden Terrace', 'Clubhouse Lounge'].map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => {
                setTierFilter(tier);
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                tierFilter === tier
                  ? 'bg-rose-50 text-rose-800 font-semibold border border-rose-200'
                  : 'text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-transparent'
              }`}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>

      {/* Main Registrations Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 w-12 text-center">#</th>
                <th className="py-3.5 px-4">Attendee Name</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">WhatsApp Number</th>
                <th className="py-3.5 px-4">Registration Date</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Ticket</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-slate-600 text-sm">No registrations found</p>
                    <p className="text-xs text-slate-400 mt-1">Try modifying your search or status filter.</p>
                  </td>
                </tr>
              ) : (
                paginatedList.map((reg, index) => {
                  const rowNumber = (currentPage - 1) * pageSize + index + 1;
                  return (
                    <tr
                      key={reg.id}
                      onClick={() => setSelectedRegistration(reg)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    >
                      {/* # Number */}
                      <td className="py-3.5 px-4 text-center text-slate-400 font-mono text-[11px] tabular-nums">
                        {rowNumber}
                      </td>

                      {/* Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 group-hover:text-rose-600 transition-colors">
                            {reg.name}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {reg.id} · {reg.tier}
                          </span>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 font-mono text-slate-600 text-xs truncate max-w-[190px]">
                        {reg.email}
                      </td>

                      {/* WhatsApp */}
                      <td className="py-3.5 px-4 font-mono text-slate-700 tabular-nums whitespace-nowrap">
                        {reg.whatsapp}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 font-mono text-slate-500 tabular-nums whitespace-nowrap">
                        {reg.registrationDate}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {reg.status === 'Approved' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Approved
                          </span>
                        )}
                        {reg.status === 'Pending' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-md">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            Pending
                          </span>
                        )}
                        {reg.status === 'Rejected' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-200 rounded-md">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            Rejected
                          </span>
                        )}
                      </td>

                      {/* Ticket Column */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {reg.ticketId ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTicketPass(reg);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 font-mono text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors"
                            title="Click to view QR pass"
                          >
                            <Ticket className="w-3 h-3 text-rose-500" />
                            <span>{reg.ticketId}</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs italic font-sans">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {reg.status === 'Pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() => approveRegistration(reg.id)}
                                className="p-1.5 text-emerald-700 hover:bg-emerald-50 border border-emerald-200 rounded-lg transition-colors"
                                title="Approve Registration"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => rejectRegistration(reg.id)}
                                className="p-1.5 text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors"
                                title="Reject Registration"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {reg.status === 'Approved' && (
                            <>
                              <button
                                type="button"
                                disabled={sendingWhatsAppId === reg.id}
                                onClick={() => handleDirectSendWhatsApp(reg)}
                                className="p-1.5 text-emerald-700 hover:bg-emerald-50 border border-emerald-200 rounded-lg transition-colors inline-flex items-center gap-1 text-xs cursor-pointer disabled:opacity-50"
                                title={`Send official QR admission pass to ${reg.whatsapp} via WhatsApp Cloud API`}
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="hidden xl:inline text-[11px] font-medium text-emerald-800">
                                  {sendingWhatsAppId === reg.id ? 'Sending...' : 'WhatsApp'}
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() => openEmailConfirmation(reg)}
                                className="p-1.5 text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors inline-flex items-center gap-1 text-xs cursor-pointer"
                                title={`Send real admission pass email to ${reg.email} via Gmail`}
                              >
                                <Mail className="w-3.5 h-3.5 text-rose-600" />
                                <span className="hidden xl:inline text-[11px] font-medium text-rose-800">Send Email</span>
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedRegistration(reg)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            title="View Full Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination Controls */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing{' '}
            <span className="font-mono font-bold text-slate-800">
              {filteredRegistrations.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </span>{' '}
            to{' '}
            <span className="font-mono font-bold text-slate-800">
              {Math.min(currentPage * pageSize, filteredRegistrations.length)}
            </span>{' '}
            of{' '}
            <span className="font-mono font-bold text-slate-800">
              {filteredRegistrations.length}
            </span>{' '}
            filtered attendees
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <span className="px-2 font-mono font-medium text-slate-700">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
