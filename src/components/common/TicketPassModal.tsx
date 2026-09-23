import React, { useRef } from 'react';
import { useEvent } from '../../context/EventContext';
import { useGmail } from '../../context/GmailContext';
import { QRCodeView } from './QRCodeView';
import { X, Printer, Calendar, MapPin, Sparkles, CheckCircle2, Shield, UserCheck, Mail } from 'lucide-react';

export const TicketPassModal: React.FC = () => {
  const { selectedTicketPass, setSelectedTicketPass } = useEvent();
  const { openEmailConfirmation } = useGmail();
  const passPrintRef = useRef<HTMLDivElement | null>(null);

  if (!selectedTicketPass) return null;

  const reg = selectedTicketPass;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Actions header */}
        <div className="px-5 py-3 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-300">
              Verified Event Pass
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openEmailConfirmation(reg)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-rose-200 hover:text-white bg-rose-900/60 hover:bg-rose-800 border border-rose-700/60 rounded-md transition-colors cursor-pointer"
              title="Send real email with this pass via Gmail"
            >
              <Mail className="w-3.5 h-3.5 text-rose-300" />
              <span>Email Pass</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
              title="Print Pass"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={() => setSelectedTicketPass(null)}
              className="p-1 text-slate-400 hover:text-white rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* The Ticket Pass Body */}
        <div ref={passPrintRef} className="p-6 bg-slate-50 flex flex-col items-center">
          <div className="w-full bg-white rounded-2xl shadow-md border border-rose-100 overflow-hidden relative">
            {/* Top decorative banner */}
            <div className="h-3 bg-gradient-to-r from-rose-500 via-rose-600 to-rose-800" />

            {/* Pass Header */}
            <div className="p-5 pb-3 border-b border-dashed border-rose-200 bg-rose-50/30">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-rose-600">
                    Official e-Pass
                  </span>
                  <h3 className="text-xl font-extrabold text-slate-900 font-serif tracking-tight">
                    PINK POLO 2026
                  </h3>
                  <p className="text-xs text-slate-500">Charity Invitational & Gala</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 text-[11px] font-bold text-rose-800 bg-rose-100 border border-rose-200 rounded-md">
                    {reg.tier}
                  </span>
                  <span className="block text-[10px] font-mono text-slate-400 mt-1">
                    {reg.ticketId || 'PASS'}
                  </span>
                </div>
              </div>
            </div>

            {/* Ticket Notches (Tear-off effect) */}
            <div className="relative flex items-center justify-between">
              <div className="w-4 h-4 -mt-2 -ml-2 rounded-full bg-slate-50 border border-rose-100" />
              <div className="w-full border-t border-dashed border-rose-200" />
              <div className="w-4 h-4 -mt-2 -mr-2 rounded-full bg-slate-50 border border-rose-100" />
            </div>

            {/* Pass QR Section */}
            <div className="p-6 flex flex-col items-center justify-center bg-white space-y-4">
              <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                <QRCodeView
                  value={reg.qrValue || `PINK-POLO-2026-${reg.ticketId || reg.id}`}
                  size={170}
                  ticketId={reg.ticketId}
                  attendeeName={reg.name}
                  showActions={false}
                />
              </div>

              <div className="text-center space-y-1">
                <span className="text-xs text-slate-400 uppercase tracking-widest block font-medium">
                  Attendee Name
                </span>
                <p className="text-base font-bold text-slate-900">{reg.name}</p>
                <p className="text-xs font-mono text-slate-500">{reg.email}</p>
              </div>

              {/* Event Location & Date */}
              <div className="w-full grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl text-xs border border-slate-100">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                    <Calendar className="w-3 h-3 text-rose-500" />
                    <span>Dates</span>
                  </div>
                  <p className="font-semibold text-slate-800">Nov 20–22, 2026</p>
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                    <MapPin className="w-3 h-3 text-rose-500" />
                    <span>Venue</span>
                  </div>
                  <p className="font-semibold text-slate-800 truncate" title="Al Rayyan Equestrian Grounds, Doha">
                    Al Rayyan Grounds
                  </p>
                </div>
              </div>

              {/* Check-in verification status */}
              <div className="w-full flex items-center justify-between px-3 py-2 bg-slate-100/70 rounded-lg text-xs">
                <span className="text-slate-500 font-medium">Gate Status:</span>
                {reg.checkedIn ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Checked In ({reg.checkedInAt?.substring(11, 16) || 'Gate 1'})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-rose-600" />
                    Ready for Gate Scan
                  </span>
                )}
              </div>
            </div>

            {/* Bottom Barcode representation */}
            <div className="px-6 py-3 bg-slate-900 text-center">
              <div className="flex items-center justify-center gap-1 h-6">
                {[4, 2, 6, 2, 8, 3, 2, 5, 2, 7, 3, 4, 8, 2, 5, 3, 6, 2, 4, 3, 7, 2, 5, 4].map(
                  (width, idx) => (
                    <div
                      key={idx}
                      className="bg-white/80 h-full"
                      style={{ width: `${width}px` }}
                    />
                  )
                )}
              </div>
              <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase mt-1 block">
                {reg.ticketId || reg.id}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
