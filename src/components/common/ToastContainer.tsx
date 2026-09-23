import React from 'react';
import { useEvent } from '../../context/EventContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useEvent();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let icon = <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />;
        let borderClass = 'border-sky-200 bg-white';
        let titleClass = 'text-slate-900';

        if (toast.type === 'success') {
          icon = <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />;
          borderClass = 'border-emerald-200 bg-white';
          titleClass = 'text-slate-900';
        } else if (toast.type === 'warning') {
          icon = <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />;
          borderClass = 'border-amber-200 bg-white';
          titleClass = 'text-slate-900';
        } else if (toast.type === 'error') {
          icon = <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />;
          borderClass = 'border-rose-200 bg-white';
          titleClass = 'text-slate-900';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-lg transition-all duration-200 animate-in fade-in slide-in-from-top-2 ${borderClass}`}
          >
            {icon}
            <div className="flex-1 min-w-0 pr-1">
              <p className={`text-xs font-semibold ${titleClass} truncate`}>{toast.title}</p>
              {toast.message && (
                <p className="text-[11px] text-slate-600 mt-0.5 leading-snug line-clamp-2">
                  {toast.message}
                </p>
              )}
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors shrink-0"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
