import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Check, Copy } from 'lucide-react';

interface QRCodeViewProps {
  value: string;
  size?: number;
  ticketId?: string;
  attendeeName?: string;
  showActions?: boolean;
}

export const QRCodeView: React.FC<QRCodeViewProps> = ({
  value,
  size = 180,
  ticketId,
  attendeeName,
  showActions = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;

    QRCode.toCanvas(
      canvasRef.current,
      value,
      {
        width: size,
        margin: 1.5,
        color: {
          dark: '#0f172a', // dark slate
          light: '#ffffff', // pure white
        },
        errorCorrectionLevel: 'M',
      },
      (err) => {
        if (err) {
          console.error(err);
          setError('Failed to generate QR');
        } else {
          setError(null);
        }
      }
    );
  }, [value, size]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `PinkPolo2026-QR-${ticketId || 'pass'}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative p-3 bg-white rounded-xl border border-rose-100 shadow-sm transition-transform hover:scale-[1.01]">
        {/* Subtle decorative polo corner marks */}
        <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-rose-400 rounded-tl-sm" />
        <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-rose-400 rounded-tr-sm" />
        <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-rose-400 rounded-bl-sm" />
        <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-rose-400 rounded-br-sm" />

        <canvas ref={canvasRef} className="rounded-lg block" />

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-rose-50/90 text-rose-700 text-xs p-2 text-center rounded-lg">
            {error}
          </div>
        )}
      </div>

      {showActions && (
        <div className="flex items-center gap-2 mt-3">
          <button
            type="button"
            onClick={handleCopyCode}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap"
            title="Copy QR payload"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copied ? 'Copied' : 'Copy Code'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors whitespace-nowrap"
            title="Download QR image"
          >
            <Download className="w-3.5 h-3.5 text-rose-600" />
            <span>Download</span>
          </button>
        </div>
      )}
    </div>
  );
};
