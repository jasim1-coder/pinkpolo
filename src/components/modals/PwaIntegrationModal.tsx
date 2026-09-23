import React, { useState } from 'react';
import { useEvent } from '../../context/EventContext';
import {
  X,
  Smartphone,
  CheckCircle2,
  Copy,
  Check,
  Code,
  Terminal,
  Zap,
  Radio,
  ExternalLink,
  Shield,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';

export const PwaIntegrationModal: React.FC = () => {
  const { pwaModalOpen, setPwaModalOpen, registrations, isServerConnected } = useEvent();
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'snippets' | 'test'>('overview');

  // Test console state
  const [testInput, setTestInput] = useState('');
  const [testGate, setTestGate] = useState('Gate 1 - Royal Pavilion');
  const [testResponse, setTestResponse] = useState<any | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  if (!pwaModalOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const apiEndpoint = `${currentOrigin}/api/check-in`;

  const copyToClipboard = (text: string, sectionKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionKey);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const handleRunTest = async () => {
    if (!testInput.trim()) return;
    setIsTesting(true);
    setTestResponse(null);

    try {
      const res = await fetch('/api/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrData: testInput.trim(),
          gate: testGate,
          scannedBy: 'In-Dashboard PWA Tester',
        }),
      });

      const data = await res.json();
      setTestResponse({
        httpStatus: res.status,
        body: data,
      });
    } catch (err: any) {
      setTestResponse({
        httpStatus: 0,
        body: { error: err.message || 'Network error' },
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Approved attendees with ticket IDs for quick testing
  const approvedAttendees = registrations.filter((r) => r.status === 'Approved' && r.ticketId);

  const jsSnippet = `// Function to call from your PWA camera scanner callback
async function sendTicketCheckIn(scannedQrString) {
  try {
    const response = await fetch("${apiEndpoint}", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        qrData: scannedQrString, // The raw string decoded from QR camera
        gate: "Gate 1 (Royal Pavilion Turnstile)", // Optional gate name
        scannedBy: "Steward iPhone PWA",          // Optional terminal ID
      }),
    });

    const result = await response.json();

    if (result.status === "valid") {
      // ✅ ACCESS GRANTED
      console.log("Check-in successful:", result.attendee);
      alert("✅ ACCESS GRANTED: " + result.attendee.name + " (" + result.attendee.tier + ")");
    } else if (result.status === "already_used") {
      // ⚠️ DUPLICATE ATTEMPT
      alert("⚠️ ALREADY CHECKED IN: Ticket was used at " + result.attendee.checkedInAt);
    } else {
      // ❌ INVALID / NOT APPROVED
      alert("❌ ENTRY DENIED: " + result.message);
    }

    return result;
  } catch (error) {
    console.error("Failed to connect to Pink Polo server:", error);
    alert("Network error communicating with check-in gate");
  }
}`;

  const reactHookSnippet = `import { useState } from 'react';

export function useGateCheckIn() {
  const [loading, setLoading] = useState(false);
  const [lastScan, setLastScan] = useState(null);

  const verifyTicket = async (qrData) => {
    setLoading(true);
    try {
      const res = await fetch("${apiEndpoint}", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrData: qrData,
          gate: "Turnstile Gate 1",
          scannedBy: "Mobile PWA Scanner"
        })
      });
      const data = await res.json();
      setLastScan(data);
      return data;
    } finally {
      setLoading(false);
    }
  };

  return { verifyTicket, loading, lastScan };
}`;

  const curlSnippet = `curl -X POST "${apiEndpoint}" \\
  -H "Content-Type: application/json" \\
  -d '{"qrData": "PINK-POLO-2026-PINK-2026-8801-JASIM-KHAN", "gate": "Main Turnstile"}'`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white p-5 flex items-center justify-between border-b border-rose-900/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">External PWA Scanner Integration</h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  REST API Active
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Connect your PWA camera scanner to push real-time gate check-ins to this live dashboard.
              </p>
            </div>
          </div>
          <button
            onClick={() => setPwaModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-3 gap-3">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2.5 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 border-b-2 ${
              activeTab === 'overview'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>API Specification</span>
          </button>
          <button
            onClick={() => setActiveTab('snippets')}
            className={`pb-2.5 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 border-b-2 ${
              activeTab === 'snippets'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Copy PWA Code</span>
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={`pb-2.5 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 border-b-2 ${
              activeTab === 'test'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Live Test Simulator</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-slate-800 text-xs">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Endpoint Card */}
              <div className="bg-slate-900 text-white rounded-xl p-4 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-semibold uppercase tracking-wider text-rose-400">PWA POST Endpoint</span>
                  <span className="bg-emerald-500/20 text-emerald-300 font-mono text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/30">
                    CORS: Any Origin Allowed (*)
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-2 overflow-x-auto font-mono text-xs text-rose-200">
                    <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-bold text-[10px]">POST</span>
                    <span className="select-all truncate">{apiEndpoint}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(apiEndpoint, 'endpoint')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-md text-[11px] font-semibold transition-colors shrink-0 cursor-pointer"
                  >
                    {copiedSection === 'endpoint' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy URL</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Request & Response Schema Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Request */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                      1. Request Payload (JSON)
                    </span>
                    <span className="text-[10px] text-slate-400">Content-Type: application/json</span>
                  </div>
                  <pre className="bg-slate-900 text-emerald-300 p-3 rounded-lg text-[11px] font-mono overflow-x-auto leading-relaxed">
{`{
  "qrData": "PINK-POLO-2026-...", 
  "gate": "Gate 1 - Royal Pavilion",
  "scannedBy": "Mobile PWA Terminal"
}`}
                  </pre>
                  <ul className="text-[11px] text-slate-600 space-y-1 list-disc list-inside">
                    <li><strong>qrData:</strong> Exact string decoded from the attendee's email QR pass.</li>
                    <li><strong>gate:</strong> Name of turnstile or gate entry point (optional).</li>
                    <li><strong>scannedBy:</strong> Device or steward ID (optional).</li>
                  </ul>
                </div>

                {/* Response */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                      2. Success Response (200 OK)
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold">status: "valid"</span>
                  </div>
                  <pre className="bg-slate-900 text-sky-300 p-3 rounded-lg text-[11px] font-mono overflow-x-auto leading-relaxed">
{`{
  "success": true,
  "status": "valid",
  "message": "Access Granted! Welcome ...",
  "attendee": {
    "name": "Jasim Khan",
    "tier": "VIP Pavilion",
    "ticketId": "PINK-2026-8801",
    "checkedIn": true,
    "checkedInAt": "2026-09-23 09:45"
  }
}`}
                  </pre>
                  <p className="text-[11px] text-slate-600">
                    If scanned twice, returns <code className="text-amber-700 font-bold">"already_used"</code> to block duplicate entries.
                  </p>
                </div>
              </div>

              {/* Real-time synchronization note */}
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-rose-900 text-[11px]">
                    Automatic Dashboard Live-Sync via Server-Sent Events (SSE)
                  </p>
                  <p className="text-[11px] text-rose-700 leading-relaxed">
                    The moment your PWA makes the <code>POST /api/check-in</code> call, this admin dashboard instantly updates in real-time. The attendee's badge flips to <strong>Checked In</strong> with the exact timestamp, the live attendance counter increments, and an activity card is logged without needing any page reload.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'snippets' && (
            <div className="space-y-4">
              {/* JavaScript Fetch */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5 text-rose-600" />
                    Vanilla JavaScript / Fetch (Any PWA or Web View)
                  </span>
                  <button
                    onClick={() => copyToClipboard(jsSnippet, 'js')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    {copiedSection === 'js' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSection === 'js' ? 'Copied' : 'Copy Code'}</span>
                  </button>
                </div>
                <pre className="bg-slate-900 text-slate-200 p-3.5 rounded-xl font-mono text-[11px] overflow-x-auto max-h-56 leading-relaxed">
                  {jsSnippet}
                </pre>
              </div>

              {/* React Hook */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5 text-rose-600" />
                    React / TypeScript Hook (useGateCheckIn)
                  </span>
                  <button
                    onClick={() => copyToClipboard(reactHookSnippet, 'react')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    {copiedSection === 'react' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSection === 'react' ? 'Copied' : 'Copy Code'}</span>
                  </button>
                </div>
                <pre className="bg-slate-900 text-slate-200 p-3.5 rounded-xl font-mono text-[11px] overflow-x-auto max-h-48 leading-relaxed">
                  {reactHookSnippet}
                </pre>
              </div>

              {/* cURL */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-rose-600" />
                    Terminal cURL Command
                  </span>
                  <button
                    onClick={() => copyToClipboard(curlSnippet, 'curl')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    {copiedSection === 'curl' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSection === 'curl' ? 'Copied' : 'Copy cURL'}</span>
                  </button>
                </div>
                <pre className="bg-slate-900 text-amber-300 p-3 rounded-xl font-mono text-[11px] overflow-x-auto leading-relaxed">
                  {curlSnippet}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'test' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 text-xs">Simulate PWA Scan Request</h4>
                  <p className="text-[11px] text-slate-500">
                    Test the exact <code>POST /api/check-in</code> endpoint right now and watch the live dashboard update in real-time.
                  </p>
                </div>

                {/* Quick Select Buttons */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Select an Approved Guest Ticket to Test:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {approvedAttendees.slice(0, 5).map((att) => (
                      <button
                        key={att.id}
                        type="button"
                        onClick={() => setTestInput(att.qrValue || att.ticketId || '')}
                        className="px-2 py-1 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 rounded-lg text-[11px] font-medium text-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <span className={att.checkedIn ? 'text-slate-400 line-through' : 'text-slate-900 font-bold'}>
                          {att.name}
                        </span>
                        <span className="text-[10px] text-rose-600 font-mono">({att.ticketId})</span>
                        {att.checkedIn && <span className="text-[9px] bg-slate-200 px-1 rounded text-slate-600">Checked In</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Manual Input */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Scanned QR String / Ticket ID
                  </label>
                  <input
                    type="text"
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    placeholder="e.g. PINK-POLO-2026-PINK-2026-001245-AHMED-ALI-VIP"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                      Gate
                    </label>
                    <input
                      type="text"
                      value={testGate}
                      onChange={(e) => setTestGate(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleRunTest}
                      disabled={isTesting || !testInput.trim()}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isTesting ? (
                        <>
                          <Zap className="w-3.5 h-3.5 animate-spin" />
                          <span>Sending to API...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5 text-rose-200" />
                          <span>Send POST /api/check-in</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Test Response View */}
              {testResponse && (
                <div className="space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      Server HTTP Response:
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          testResponse.httpStatus === 200
                            ? 'bg-emerald-100 text-emerald-800'
                            : testResponse.httpStatus === 409
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        HTTP {testResponse.httpStatus} ({testResponse.body?.status?.toUpperCase() || 'UNKNOWN'})
                      </span>
                    </span>
                  </div>
                  <pre
                    className={`p-3.5 rounded-xl font-mono text-[11px] overflow-x-auto leading-relaxed ${
                      testResponse.httpStatus === 200
                        ? 'bg-slate-900 text-emerald-300 border border-emerald-800'
                        : testResponse.httpStatus === 409
                        ? 'bg-slate-900 text-amber-300 border border-amber-800'
                        : 'bg-slate-900 text-rose-300 border border-rose-800'
                    }`}
                  >
                    {JSON.stringify(testResponse.body, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Endpoint listening at <code className="font-mono text-slate-700">/api/check-in</code></span>
          </div>
          <button
            type="button"
            onClick={() => setPwaModalOpen(false)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
