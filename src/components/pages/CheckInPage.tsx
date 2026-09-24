import React, { useState } from 'react';
import { useEvent } from '../../context/EventContext';
import {
  QrCode,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Scan,
  Sparkles,
  Search,
  UserCheck,
  Clock,
  ShieldCheck,
  RefreshCw,
  Volume2,
  VolumeX,
  Smartphone,
  Radio,
  Camera,
  CameraOff,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const CheckInPage: React.FC = () => {
  const {
    simulateScanRandomTicket,
    scanTicket,
    lastScanResult,
    stats,
    registrations,
    activities,
    setSelectedRegistration,
    setPwaModalOpen,
  } = useEvent();

  const [manualTicketInput, setManualTicketInput] = useState('');
  const [selectedGate, setSelectedGate] = useState('Gate 1 - Royal Pavilion Entrance');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isScanningAnimation, setIsScanningAnimation] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const scanIntervalRef = React.useRef<any>(null);

  const approvedList = registrations.filter((r) => r.status === 'Approved' && r.ticketId);

  // Live Camera Scanner Toggle
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);

      // Start BarcodeDetector if supported
      if ('BarcodeDetector' in window) {
        const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code', 'code_128', 'code_39'] });
        scanIntervalRef.current = setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            try {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0) {
                const scannedRaw = barcodes[0].rawValue;
                if (scannedRaw) {
                  stopCamera();
                  handleBarcodeScanned(scannedRaw);
                }
              }
            } catch (e) {
              // frame decode pass
            }
          }
        }, 300);
      }
    } catch (err: any) {
      setCameraError(err?.message || 'Unable to access device camera. Please allow camera permissions.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  React.useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleBarcodeScanned = (scannedValue: string) => {
    setIsScanningAnimation(true);
    setTimeout(() => {
      const result = scanTicket(scannedValue);
      setIsScanningAnimation(false);

      if (result.status === 'valid') {
        playSound('success');
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.7 },
          colors: ['#10b981', '#34d399', '#f43f5e', '#ffffff'],
        });
      } else if (result.status === 'already_used') {
        playSound('warning');
      } else {
        playSound('error');
      }
    }, 200);
  };

  // Trigger audio feedback effect using Web Audio API synthesized tone
  const playSound = (type: 'success' | 'warning' | 'error') => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      } else if (type === 'warning') {
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.setValueAtTime(330, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      } else {
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      }
    } catch {
      // AudioContext not allowed before user interaction
    }
  };

  const handleSimulateScan = () => {
    setIsScanningAnimation(true);
    setTimeout(() => {
      const result = simulateScanRandomTicket();
      setIsScanningAnimation(false);

      if (result.status === 'valid') {
        playSound('success');
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.7 },
          colors: ['#10b981', '#34d399', '#f43f5e', '#ffffff'],
        });
      } else if (result.status === 'already_used') {
        playSound('warning');
      } else {
        playSound('error');
      }
    }, 400);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTicketInput.trim()) return;

    handleBarcodeScanned(manualTicketInput.trim());
    setManualTicketInput('');
  };

  // Recent scans filtered from activities
  const recentGateScans = activities.filter((a) => a.type === 'checkin');

  return (
    <div className="space-y-6">
      {/* Top Console Bar */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-600/30 border border-rose-500/40 flex items-center justify-center text-rose-300">
            <Scan className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-mono tracking-widest text-emerald-400 uppercase">
                Scanner Terminal Online
              </span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">Gate Check-In Console</h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Gate Selector */}
          <div className="flex-1 md:flex-none">
            <select
              value={selectedGate}
              onChange={(e) => setSelectedGate(e.target.value)}
              className="text-xs bg-slate-800 border border-slate-700 text-slate-200 px-3 py-2 rounded-xl focus:outline-rose-500 w-full"
            >
              <option value="Gate 1 - Royal Pavilion Entrance">Gate 1 - Royal Pavilion Entrance</option>
              <option value="Gate 2 - South Lawn VIP Entrance">Gate 2 - South Lawn VIP Entrance</option>
              <option value="Gate 3 - Clubhouse Turnstile">Gate 3 - Clubhouse Turnstile</option>
              <option value="Gate 4 - Grandstand East Gate">Gate 4 - Grandstand East Gate</option>
            </select>
          </div>

          {/* PWA Integration Quick Button */}
          <button
            type="button"
            onClick={() => setPwaModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            title="Open PWA API Endpoint and Code Guide"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>PWA Scanner API</span>
          </button>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border transition-colors ${
              soundEnabled
                ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                : 'bg-slate-800/40 text-slate-500 border-slate-800'
            }`}
            title={soundEnabled ? 'Gate buzzer sound enabled' : 'Gate buzzer muted'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* PWA External Scanner Hook Status */}
      <div className="bg-gradient-to-r from-slate-900 to-rose-950 text-white rounded-2xl p-4 border border-rose-900/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-500/20 text-rose-300 rounded-xl border border-rose-500/30">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold">External PWA Camera Scanner Ready</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Sync Active
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              When your mobile PWA scans an attendee's pass, it calls <code className="text-rose-300 font-mono">POST /api/check-in</code> and updates this screen immediately.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setPwaModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-colors border border-white/15 cursor-pointer whitespace-nowrap shrink-0"
        >
          <span>View API & Setup Guide</span>
        </button>
      </div>

      {/* Main Terminal Body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: QR Scanner Viewfinder & Scan Outcome */}
        <div className="lg:col-span-2 space-y-6">
          {/* Scanner Viewfinder Box */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Viewfinder Target Frame */}
            <div className="relative w-full max-w-sm aspect-square bg-slate-950 rounded-2xl border-2 border-slate-800 flex flex-col items-center justify-center overflow-hidden shadow-2xl p-4">
              {/* Corner Reticles */}
              <div className="absolute top-4 left-4 w-7 h-7 border-t-3 border-l-3 border-rose-500 rounded-tl-lg z-20" />
              <div className="absolute top-4 right-4 w-7 h-7 border-t-3 border-r-3 border-rose-500 rounded-tr-lg z-20" />
              <div className="absolute bottom-4 left-4 w-7 h-7 border-b-3 border-l-3 border-rose-500 rounded-bl-lg z-20" />
              <div className="absolute bottom-4 right-4 w-7 h-7 border-b-3 border-r-3 border-rose-500 rounded-br-lg z-20" />

              {/* Video Element for live camera feed */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover rounded-xl z-10 ${
                  cameraActive ? 'block' : 'hidden'
                }`}
              />

              {/* Laser Line Scanning Animation */}
              <div
                className={`absolute left-4 right-4 h-1 bg-gradient-to-r from-rose-500 via-pink-400 to-rose-500 shadow-[0_0_12px_#f43f5e] transition-all duration-700 z-20 ${
                  isScanningAnimation ? 'top-3/4 animate-bounce' : 'top-1/2 opacity-70 animate-pulse'
                }`}
              />

              {/* Center Target Icon when camera is not active */}
              {!cameraActive && (
                <div className="z-10 flex flex-col items-center text-center space-y-3">
                  <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white backdrop-blur-xs">
                    <QrCode className="w-10 h-10 text-rose-400" />
                  </div>
                  <div className="text-slate-300 text-xs">
                    <p className="font-semibold text-white">Scanner Viewfinder Ready</p>
                    <p className="text-[11px] text-slate-400">Position attendee QR pass or use camera</p>
                  </div>
                </div>
              )}

              {/* Subtle grid backdrop */}
              <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-30" />
            </div>

            {cameraError && (
              <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs text-center max-w-sm">
                {cameraError}
              </div>
            )}

            {/* Action Buttons: Live Camera Scan + Simulate Scan */}
            <div className="mt-6 flex flex-col sm:flex-row items-center gap-2.5 w-full max-w-sm">
              <button
                type="button"
                onClick={cameraActive ? stopCamera : startCamera}
                className={`flex-1 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer ${
                  cameraActive
                    ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                }`}
              >
                {cameraActive ? (
                  <>
                    <CameraOff className="w-4 h-4 text-amber-200" />
                    <span>Stop Camera</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 text-emerald-200" />
                    <span>Open Live Camera</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSimulateScan}
                disabled={isScanningAnimation}
                className="flex-1 w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Scan className="w-4 h-4 text-rose-200" />
                <span>Simulate Scan</span>
              </button>
            </div>

            {/* Manual Entry Form */}
            <form onSubmit={handleManualSubmit} className="mt-4 w-full max-w-sm flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={manualTicketInput}
                  onChange={(e) => setManualTicketInput(e.target.value)}
                  placeholder="Or enter Ticket ID (e.g. PINK-2026-001245)..."
                  className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-rose-500 font-mono text-slate-900 placeholder:font-sans placeholder-slate-400"
                />
              </div>
              <button
                type="submit"
                className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl whitespace-nowrap cursor-pointer"
              >
                Verify
              </button>
            </form>
          </div>

          {/* SCAN OUTCOME BANNER (As specified in section 7) */}
          {lastScanResult && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
              {/* Outcome 1: TICKET VALID */}
              {lastScanResult.status === 'valid' && (
                <div className="p-6 bg-gradient-to-r from-emerald-50 via-emerald-100/60 to-white rounded-2xl border-2 border-emerald-400 shadow-md space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-800">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold tracking-tight uppercase">
                          ✓ TICKET VALID
                        </h3>
                        <p className="text-xs text-emerald-700">Verified attendee cleared for entrance</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-bold text-emerald-900 bg-white border border-emerald-300 rounded-lg shadow-2xs">
                      {lastScanResult.scannedAt}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-white/90 rounded-xl border border-emerald-200">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Guest Name
                      </span>
                      <p className="text-lg font-bold text-slate-900">
                        {lastScanResult.guestName || lastScanResult.registration?.name}
                      </p>
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Ticket ID
                      </span>
                      <p className="text-base font-bold font-mono text-emerald-800">
                        {lastScanResult.ticketId || lastScanResult.registration?.ticketId}
                      </p>
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Guest Email
                      </span>
                      <p className="text-xs font-mono text-slate-700 truncate">
                        {lastScanResult.guestEmail || lastScanResult.registration?.email}
                      </p>
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Check-in Status
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200 mt-0.5">
                        <UserCheck className="w-3.5 h-3.5" />
                        Checked In
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Outcome 2: ALREADY CHECKED IN */}
              {lastScanResult.status === 'already_used' && (
                <div className="p-6 bg-gradient-to-r from-amber-50 via-amber-100/50 to-white rounded-2xl border-2 border-amber-400 shadow-md space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-900">
                      <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold tracking-tight uppercase">
                          ⚠ ALREADY CHECKED IN
                        </h3>
                        <p className="text-xs font-medium text-amber-800">
                          This ticket has already been used.
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-bold text-amber-900 bg-white border border-amber-300 rounded-lg">
                      {lastScanResult.scannedAt}
                    </span>
                  </div>

                  {(lastScanResult.registration || lastScanResult.guestName) && (
                    <div className="p-4 bg-white/90 rounded-xl border border-amber-200 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Guest Name:</span>
                        <span className="font-bold text-slate-900">
                          {lastScanResult.guestName || lastScanResult.registration?.name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Guest Email:</span>
                        <span className="font-mono text-slate-700">
                          {lastScanResult.guestEmail || lastScanResult.registration?.email}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Ticket ID:</span>
                        <span className="font-mono font-bold text-slate-900">
                          {lastScanResult.ticketId || lastScanResult.registration?.ticketId}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">First Scanned At:</span>
                        <span className="font-mono font-semibold text-amber-800">
                          {lastScanResult.registration?.checkedInAt || lastScanResult.scannedAt}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Outcome 3: INVALID TICKET */}
              {lastScanResult.status === 'invalid' && (
                <div className="p-6 bg-rose-50 rounded-2xl border-2 border-rose-300 shadow-md space-y-2">
                  <div className="flex items-center gap-2 text-rose-900">
                    <XCircle className="w-5 h-5 text-rose-600" />
                    <h3 className="text-base font-extrabold uppercase">✕ Invalid or Unapproved Ticket</h3>
                  </div>
                  <p className="text-xs text-rose-700">{lastScanResult.message}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right 1 Col: Live Gate Stream & Rapid Quick Pick */}
        <div className="space-y-6">
          {/* Gate Terminal Counter Card */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Gate Attendance Pacing
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-extrabold font-mono text-slate-900 tabular-nums">
                {stats.checkedIn.toLocaleString()}
              </span>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {stats.ticketsGenerated > 0 ? Math.round((stats.checkedIn / stats.ticketsGenerated) * 100) : 0}% capacity
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Total attendees admitted into Pink Polo 2026 grounds today.
            </p>
          </div>

          {/* Quick Select Attendee to test Scan */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Quick Test Picker
              </span>
              <span className="text-[10px] text-slate-400">Click to test</span>
            </div>

            <p className="text-xs text-slate-500 leading-snug">
              Select any attendee below to test a live entry scan or trigger an "Already Checked In" warning:
            </p>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 divide-y divide-slate-100">
              {approvedList.slice(0, 6).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scanTicket(item.ticketId!)}
                  className="w-full text-left p-2 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between group"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-900 group-hover:text-rose-600 truncate">
                      {item.name}
                    </p>
                    <span className="text-[10px] font-mono text-slate-400 block">
                      {item.ticketId}
                    </span>
                  </div>

                  {item.checkedIn ? (
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 shrink-0">
                      Already In
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                      Unchecked
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Live Gate Log */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Recent Gate Scans
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {recentGateScans.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No scans recorded yet.</p>
              ) : (
                recentGateScans.map((scan) => (
                  <div
                    key={scan.id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-slate-900 truncate">{scan.attendeeName}</p>
                      <span className="text-[10px] text-slate-400 font-mono">{scan.ticketId}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 shrink-0">
                      {scan.timeAgo}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
