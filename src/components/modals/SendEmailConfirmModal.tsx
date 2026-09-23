import React from 'react';
import { useGmail } from '../../context/GmailContext';
import { useEvent } from '../../context/EventContext';
import { Mail, AlertCircle, CheckCircle2, X, Send, Sparkles } from 'lucide-react';

export const SendEmailConfirmModal: React.FC = () => {
  const {
    emailConfirmationModal,
    closeEmailConfirmation,
    confirmSendEmail,
    currentUser,
    hasGmailAuth,
    signInWithGoogle,
  } = useGmail();
  const { addToast, addActivity } = useEvent();

  if (!emailConfirmationModal.isOpen || !emailConfirmationModal.registration) {
    return null;
  }

  const reg = emailConfirmationModal.registration;

  const handleConfirm = async () => {
    if (!hasGmailAuth) {
      const ok = await signInWithGoogle();
      if (!ok) {
        addToast('error', 'Google Sign-In Required', 'Please connect your Google account to send real emails.');
        return;
      }
    }

    try {
      await confirmSendEmail();
      addToast(
        'success',
        'Real Email Dispatched via Gmail!',
        `Official admission pass & QR code sent to ${reg.email}`
      );
      addActivity(
        'approval',
        'Real Email Sent via Gmail API',
        `Pass sent to ${reg.email} (${reg.name}) from ${currentUser?.email || 'connected Gmail'}`,
        reg.name,
        reg.ticketId
      );
    } catch (err: any) {
      addToast('error', 'Failed to Send Email', err?.message || 'Gmail API Error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-600 via-rose-700 to-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/15 backdrop-blur-xs rounded-xl text-white">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Confirm Real Email Dispatch</h3>
              <p className="text-[11px] text-rose-200">Google Workspace Gmail API</p>
            </div>
          </div>
          <button
            onClick={closeEmailConfirmation}
            disabled={emailConfirmationModal.isSending}
            className="p-1 rounded-lg text-rose-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">
                Send official admission pass to <u>{reg.email}</u>?
              </p>
              <p className="text-[11px] text-rose-700">
                This will send a real, live HTML email from your connected Google account with the scannable turnstile QR code and arrival guide.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Email Details
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 block">Recipient</span>
                <strong className="text-slate-900 truncate block">{reg.name}</strong>
                <span className="text-slate-600 font-mono text-[10px] truncate block">{reg.email}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Ticket & Tier</span>
                <strong className="text-rose-700 font-mono text-[11px] block">{reg.ticketId || 'Auto-generated'}</strong>
                <span className="text-slate-700 text-[10px] block">{reg.tier}</span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200 text-[11px] flex items-center justify-between text-slate-500">
              <span>Sender Account:</span>
              <strong className="text-slate-700 font-mono">{currentUser?.email || 'Your Google Account'}</strong>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeEmailConfirmation}
              disabled={emailConfirmationModal.isSending}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={emailConfirmationModal.isSending}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50"
            >
              {emailConfirmationModal.isSending ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending via Gmail...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Confirm & Send Real Email</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
