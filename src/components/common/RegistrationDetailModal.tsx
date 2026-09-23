import React, { useState } from 'react';
import { useEvent } from '../../context/EventContext';
import { useGmail } from '../../context/GmailContext';
import { QRCodeView } from './QRCodeView';
import {
  X,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  Phone,
  Calendar,
  Ticket,
  ShieldCheck,
  UserCheck,
  AlertOctagon,
  Sparkles,
  ExternalLink,
  Send,
  MessageSquare,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const RegistrationDetailModal: React.FC = () => {
  const {
    registrations,
    selectedRegistration,
    setSelectedRegistration,
    approveRegistration,
    rejectRegistration,
    setSelectedTicketPass,
  } = useEvent();

  const { openEmailConfirmation, hasGmailAuth } = useGmail();

  const [rejectPromptOpen, setRejectPromptOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('Capacity limit reached for selected afternoon session slot');

  if (!selectedRegistration) return null;

  const reg = registrations.find((r) => r.id === selectedRegistration.id) || selectedRegistration;

  const handleApprove = () => {
    approveRegistration(reg.id);
    confetti({
      particleCount: 45,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#e11d48', '#fda4af', '#f43f5e', '#fb7185', '#cbd5e1'],
    });
  };

  const handleRejectConfirm = () => {
    rejectRegistration(reg.id, rejectReason);
    setRejectPromptOpen(false);
  };

  const openPassView = () => {
    setSelectedTicketPass(reg);
  };

  const handleWhatsAppShare = () => {
    const cleanPhone = (reg.whatsapp || '').replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(
      `*Pink Polo 2026 E-Pass Approved*\n\nDear ${reg.name},\nYour registration (${reg.id}) has been APPROVED!\nTicket ID: ${reg.ticketId}\nTier: ${reg.tier}\n\nPresent your verified QR barcode at the gate for fast check-in.\nSee you at Al Rayyan Grounds!`
    );
    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${msg}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Pink Polo Accent */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-rose-900 via-rose-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-300">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono tracking-wider text-rose-300 uppercase">
                  {reg.id}
                </span>
                <span className="text-slate-400">·</span>
                <span className="text-xs text-rose-200 font-medium">Pink Polo 2026</span>
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">{reg.name}</h2>
            </div>
          </div>

          <button
            onClick={() => setSelectedRegistration(null)}
            className="p-1.5 text-rose-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Status Badge & Tier Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Current Status:</span>
              {reg.status === 'Approved' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-100/90 rounded-md">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Approved
                </span>
              )}
              {reg.status === 'Pending' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-amber-800 bg-amber-100/90 rounded-md">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Pending Approval
                </span>
              )}
              {reg.status === 'Rejected' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-rose-800 bg-rose-100/90 rounded-md">
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  Rejected
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Access Tier:</span>
              <span className="text-xs font-semibold text-slate-900 bg-white border border-slate-200 px-2.5 py-1 rounded-md shadow-xs">
                {reg.tier}
              </span>
            </div>
          </div>

          {/* Attendee Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                <span>Email Address</span>
              </div>
              <p className="text-sm font-medium text-slate-900 truncate" title={reg.email}>
                {reg.email}
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span>WhatsApp / Phone</span>
              </div>
              <p className="text-sm font-medium text-slate-900 font-mono tabular-nums">
                {reg.whatsapp}
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Registration Date</span>
              </div>
              <p className="text-sm font-medium text-slate-900 font-mono tabular-nums">
                {reg.registrationDate}
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                <span>Registration ID</span>
              </div>
              <p className="text-sm font-medium text-slate-900 font-mono">
                {reg.id}
              </p>
            </div>
          </div>

          {/* Conditional Sections based on status */}

          {/* If Pending: Approval Controls */}
          {reg.status === 'Pending' && !rejectPromptOpen && (
            <div className="p-4 bg-amber-50/80 rounded-xl border border-amber-200 space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <h4 className="text-xs font-semibold text-amber-900 uppercase tracking-wider">
                  Pending Executive Approval
                </h4>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                Approve to generate a verified QR ticket pass for {reg.name}. An automated confirmation with the barcode and gate credentials will be recorded in the system.
              </p>
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleApprove}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:scale-[0.99] rounded-lg shadow-sm transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5 text-rose-200" />
                  Approve Registration & Issue Ticket
                </button>
                <button
                  type="button"
                  onClick={() => setRejectPromptOpen(true)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-rose-50 hover:text-rose-700 border border-slate-300 rounded-lg transition-colors"
                >
                  Reject
                </button>
              </div>
            </div>
          )}

          {/* Reject Reason Form if prompted */}
          {rejectPromptOpen && (
            <div className="p-4 bg-rose-50/90 rounded-xl border border-rose-200 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-rose-900 font-semibold text-xs uppercase tracking-wider">
                <AlertOctagon className="w-4 h-4 text-rose-600" />
                Confirm Registration Rejection
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Reason for rejection:
                </label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-rose-500"
                >
                  <option value="Capacity limit reached for selected afternoon session slot">Capacity limit reached for selected slot</option>
                  <option value="Duplicate registration detected with previous corporate batch">Duplicate registration detected</option>
                  <option value="Invalid invitation code entered at registration checkout">Invalid invitation code</option>
                  <option value="Incomplete attendee verification details">Incomplete attendee verification details</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setRejectPromptOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRejectConfirm}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-md shadow-xs"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          )}

          {/* If Approved: QR Ticket & Ticket Info */}
          {reg.status === 'Approved' && (
            <div className="p-5 bg-gradient-to-b from-rose-50/40 to-slate-50/70 rounded-2xl border border-rose-200/80 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-rose-600" />
                  <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                    Official QR e-Ticket Pass
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={openPassView}
                  className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-semibold transition-colors"
                >
                  <span>Open Full Pass</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6 bg-white p-4 rounded-xl border border-rose-100 shadow-xs">
                {/* QR Code Canvas */}
                <div className="shrink-0">
                  <QRCodeView
                    value={reg.qrValue || `PINK-POLO-2026-${reg.ticketId || reg.id}`}
                    size={160}
                    ticketId={reg.ticketId}
                    attendeeName={reg.name}
                  />
                </div>

                {/* Ticket Details */}
                <div className="flex-1 w-full space-y-3">
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                      Ticket ID
                    </span>
                    <span className="text-base font-bold font-mono text-slate-900 tracking-tight">
                      {reg.ticketId}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Ticket Status</span>
                      <span className="font-semibold text-emerald-700">Valid for Entry</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Check-in Status</span>
                      {reg.checkedIn ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                          <UserCheck className="w-3.5 h-3.5" />
                          Checked In
                        </span>
                      ) : (
                        <span className="font-semibold text-slate-600">Not Checked In</span>
                      )}
                    </div>
                  </div>

                  {reg.checkedIn && reg.checkedInAt && (
                    <div className="text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                      Scanned at gate: <span className="font-mono">{reg.checkedInAt}</span>
                    </div>
                  )}

                  <div className="pt-1 text-[11px] text-slate-500">
                    Payload: <code className="font-mono text-[10px] text-slate-700 break-all">{reg.qrValue}</code>
                  </div>
                </div>
              </div>

              {/* Real Email & WhatsApp Dispatch Buttons */}
              <div className="pt-3 border-t border-rose-100 space-y-2">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Deliver E-Pass to Attendee
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => openEmailConfirmation(reg)}
                    className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                    title={`Send real confirmation email with QR pass to ${reg.email}`}
                  >
                    <Send className="w-3.5 h-3.5 text-rose-200" />
                    <span>Send Real Email (Gmail)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleWhatsAppShare}
                    className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-[#25D366] hover:bg-[#1ebd5a] active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                    title={`Send E-Pass message to ${reg.whatsapp} via WhatsApp`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-white" />
                    <span>Send via WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* If Rejected: Rejection Status & Reason */}
          {reg.status === 'Rejected' && (
            <div className="p-4 bg-rose-50/70 rounded-xl border border-rose-200 space-y-2">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-600" />
                <h4 className="text-xs font-semibold text-rose-900 uppercase tracking-wider">
                  Registration Rejected
                </h4>
              </div>
              <p className="text-xs text-rose-800">
                <span className="font-medium">Reason on file:</span> {reg.rejectionReason || 'Administrative review'}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleApprove}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-white hover:bg-rose-100 border border-rose-300 rounded-lg transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                  Override & Approve Registration
                </button>
              </div>
            </div>
          )}

          {/* Notes if any */}
          {reg.notes && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <span className="font-semibold text-slate-700 block mb-0.5">Attendee Special Requests:</span>
              <span className="text-slate-600 italic">"{reg.notes}"</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Pink Polo 2026 Invitational · Qatar Equestrian Federation
          </span>
          <button
            type="button"
            onClick={() => setSelectedRegistration(null)}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
