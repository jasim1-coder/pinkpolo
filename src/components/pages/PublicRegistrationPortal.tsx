import React, { useState } from 'react';
import { useEvent } from '../../context/EventContext';
import { useGmail } from '../../context/GmailContext';
import { AttendeeTier, Registration } from '../../types';
import { QRCodeView } from '../common/QRCodeView';
import {
  Ticket,
  Calendar,
  MapPin,
  CheckCircle2,
  Clock,
  Send,
  User,
  Mail,
  Phone,
  Building,
  Heart,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Users,
  Smartphone,
  CheckCheck,
  Download,
  Zap,
  Printer,
  FileCheck,
} from 'lucide-react';
import poloBannerImg from '../../assets/images/pink_polo_banner_1790157590237.jpg';
import confetti from 'canvas-confetti';

interface PublicRegistrationPortalProps {
  // Public standalone portal
}

export const PublicRegistrationPortal: React.FC<PublicRegistrationPortalProps> = () => {
  const {
    submitAttendeeRegistration,
    approveRegistration,
    registrations,
    setSelectedTicketPass,
  } = useEvent();

  const { openEmailConfirmation, hasGmailAuth } = useGmail();

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+974');
  const [phoneLocal, setPhoneLocal] = useState('');
  const [selectedTier, setSelectedTier] = useState<AttendeeTier>('VIP Pavilion');
  const [organization, setOrganization] = useState('');
  const [guestCount, setGuestCount] = useState('1 Guest (Solo Attendee)');
  const [notes, setNotes] = useState('');
  const [agreed, setAgreed] = useState(true);

  // Submission State
  const [submittedRegId, setSubmittedRegId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Post-submission Preview Tab (WhatsApp vs Email)
  const [previewTab, setPreviewTab] = useState<'whatsapp' | 'email'>('whatsapp');

  // Find the live record from state so updates like approval are immediately reflected
  const liveReg = submittedRegId
    ? registrations.find((r) => r.id === submittedRegId) || null
    : null;

  const tiers: {
    id: AttendeeTier;
    name: string;
    gate: string;
    tagline: string;
    perks: string[];
    badge: string;
  }[] = [
    {
      id: 'VIP Pavilion',
      name: 'VIP Pavilion',
      gate: 'Gate 1 (Royal Turnstile)',
      tagline: 'Royal enclosure, gourmet dining & player meet',
      perks: ['Royal enclosure seating', 'Gourmet dining & bar', 'Fast-track Gate 1 access'],
      badge: 'Royal Access',
    },
    {
      id: 'Clubhouse Lounge',
      name: 'Clubhouse Lounge',
      gate: 'Gate 2 (South Entry)',
      tagline: 'Climate terrace with panoramic field view',
      perks: ['Indoor climate terrace', 'Dedicated bar service', 'Official event gift bag'],
      badge: 'Popular',
    },
    {
      id: 'Garden Terrace',
      name: 'Garden Terrace',
      gate: 'Gate 3 (Terrace Gate)',
      tagline: 'Field-side lawn tables with afternoon tea',
      perks: ['Field-side lawn tables', 'Afternoon tea buffet', 'Access to gala market'],
      badge: 'Social & Dining',
    },
    {
      id: 'Grandstand',
      name: 'Grandstand',
      gate: 'Gate 4 (East Turnstile)',
      tagline: 'Open spectator grandstand seating',
      perks: ['Central field view', 'Food village access', 'Opening ceremony access'],
      badge: 'Spectator',
    },
  ];

  const currentTierInfo = tiers.find((t) => t.id === selectedTier) || tiers[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!phoneLocal.trim()) {
      setErrorMsg('Please enter your WhatsApp / phone number.');
      return;
    }
    if (!agreed) {
      setErrorMsg('Please confirm agreement to event terms.');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const fullPhone = `${countryCode} ${phoneLocal.trim()}`;
      const newReg = submitAttendeeRegistration({
        name: fullName.trim(),
        email: email.trim(),
        whatsapp: fullPhone,
        tier: selectedTier,
        company: organization.trim() || undefined,
        notes: notes.trim() ? `${notes.trim()} (Party: ${guestCount})` : `Party: ${guestCount}`,
      });

      setIsSubmitting(false);
      setSubmittedRegId(newReg.id);

      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#e11d48', '#fda4af', '#f43f5e', '#38bdf8', '#10b981'],
      });
    }, 400);
  };

  const handleInstantApprove = () => {
    if (!liveReg) return;
    approveRegistration(liveReg.id);
    confetti({
      particleCount: 70,
      spread: 80,
      origin: { y: 0.5 },
      colors: ['#10b981', '#34d399', '#f43f5e', '#ffffff'],
    });
  };

  const handleResetForm = () => {
    setFullName('');
    setEmail('');
    setPhoneLocal('');
    setOrganization('');
    setNotes('');
    setSubmittedRegId(null);
  };

  // Determine gate based on tier
  const getGateForTier = (tier: string) => {
    if (tier.includes('VIP')) return 'Gate 1 (Royal Pavilion Turnstile)';
    if (tier.includes('Clubhouse')) return 'Gate 2 (Clubhouse South Entry)';
    if (tier.includes('Garden')) return 'Gate 3 (Garden Terrace Gate)';
    return 'Gate 4 (Grandstand East Turnstile)';
  };

  return (
    <div className="w-full h-full flex flex-col justify-start">
      {/* ========================================================
          STATE 1: STREAMLINED ZERO-SCROLL REGISTRATION FORM
          ======================================================== */}
      {!liveReg ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 items-stretch h-full">
          {/* Left Column: Event Context & Live Tier Highlights */}
          <div className="lg:col-span-4 rounded-2xl bg-slate-950 text-white p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between border border-rose-900/40 shadow-md">
            {/* Background image & gradient overlay */}
            <div className="absolute inset-0 z-0">
              <img
                src={poloBannerImg}
                alt="Pink Polo 2026 Grounds"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center opacity-30 scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/85 to-slate-900/60" />
            </div>

            {/* Top Area: Emblem & Event Info */}
            <div className="relative z-10 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-600 text-white shadow-xs">
                  Pink Polo 2026
                </span>
                <span className="text-[11px] text-rose-300 flex items-center gap-1 font-medium">
                  <Heart className="w-3 h-3 text-rose-400 fill-rose-400" />
                  <span>Charity Gala</span>
                </span>
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-white tracking-tight leading-tight">
                  Invitational & Gala
                </h2>
                <p className="text-xs text-slate-300 leading-snug mt-1">
                  Official attendee registration. Request approval for access to premier equestrian hospitality.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 pt-1">
                <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-xs px-2.5 py-1.5 rounded-lg border border-white/10">
                  <Calendar className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span className="truncate">Nov 20–22, 2026</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-xs px-2.5 py-1.5 rounded-lg border border-white/10">
                  <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span className="truncate">Al Rayyan, Doha</span>
                </div>
              </div>
            </div>

            {/* Middle: Live Selected Tier Preview Card */}
            <div className="relative z-10 my-3 p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300">
                  Selected Experience
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-500/30 text-rose-200 border border-rose-400/30">
                  {currentTierInfo.gate}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white">{currentTierInfo.name}</h4>
              <p className="text-[11px] text-slate-300 leading-tight">
                {currentTierInfo.tagline}
              </p>
              <div className="pt-1.5 border-t border-white/10 space-y-1">
                {currentTierInfo.perks.map((perk, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-200">
                    <CheckCircle2 className="w-3 h-3 text-rose-400 shrink-0" />
                    <span className="truncate">{perk}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom: 3-Step Micro Workflow */}
            <div className="relative z-10 pt-2 border-t border-white/10 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                How It Works
              </span>
              <div className="grid grid-cols-3 gap-1.5 text-[10px] text-slate-300 text-center">
                <div className="p-1.5 rounded-lg bg-white/5 border border-white/10">
                  <span className="block font-bold text-rose-400">1. Submit</span>
                  <span className="text-[9px] text-slate-400">Your details</span>
                </div>
                <div className="p-1.5 rounded-lg bg-white/5 border border-white/10">
                  <span className="block font-bold text-amber-400">2. Review</span>
                  <span className="text-[9px] text-slate-400">Committee</span>
                </div>
                <div className="p-1.5 rounded-lg bg-white/5 border border-white/10">
                  <span className="block font-bold text-emerald-400">3. Pass</span>
                  <span className="text-[9px] text-slate-400">WhatsApp QR</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: High-Efficiency Compact Form */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col justify-between">
            <form onSubmit={handleSubmit} className="flex flex-col justify-between h-full space-y-3">
              {/* Form Title & Description */}
              <div className="border-b border-slate-100 pb-2.5">
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  Submit Attendee Registration Request
                </h3>
                <p className="text-[11px] text-slate-500">
                  Once approved by the committee, your official QR pass will be sent to your WhatsApp and Email.
                </p>
              </div>

              {errorMsg && (
                <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-semibold">
                  {errorMsg}
                </div>
              )}

              {/* Section 1: Contact Details (2x2 Grid) */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <User className="w-3 h-3 text-rose-500" />
                  <span>1. Contact Information</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Sheikh Nasser Al-Kuwari"
                        className="w-full text-xs pl-8 pr-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-rose-400 text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nasser@example.qa"
                        className="w-full text-xs pl-8 pr-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-rose-400 text-slate-900 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      WhatsApp Number <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex gap-1.5">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="text-xs px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-rose-400 text-slate-700 font-mono"
                      >
                        <option value="+974">QA +974</option>
                        <option value="+971">AE +971</option>
                        <option value="+966">SA +966</option>
                        <option value="+965">KW +965</option>
                        <option value="+973">BH +973</option>
                        <option value="+44">UK +44</option>
                        <option value="+1">US +1</option>
                      </select>
                      <div className="relative flex-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="tel"
                          required
                          value={phoneLocal}
                          onChange={(e) => setPhoneLocal(e.target.value)}
                          placeholder="5512 3456"
                          className="w-full text-xs pl-8 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-rose-400 text-slate-900 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Organization / Sponsor <span className="text-slate-400">(Optional)</span>
                    </label>
                    <div className="relative">
                      <Building className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={organization}
                        onChange={(e) => setOrganization(e.target.value)}
                        placeholder="e.g. Qatar Foundation"
                        className="w-full text-xs pl-8 pr-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-rose-400 text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Compact 4-Card Tier Selection */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Ticket className="w-3 h-3 text-rose-500" />
                    <span>2. Select Access Tier</span>
                  </span>
                  <span className="text-[11px] font-semibold text-rose-600">
                    Selected: {selectedTier}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {tiers.map((tier) => {
                    const isSelected = selectedTier === tier.id;
                    return (
                      <button
                        type="button"
                        key={tier.id}
                        onClick={() => setSelectedTier(tier.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'border-rose-500 bg-rose-50/50 ring-1 ring-rose-500 shadow-2xs'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                              isSelected
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {tier.badge}
                          </span>
                          <span
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? 'border-rose-600 bg-rose-600 text-white'
                                : 'border-slate-300'
                            }`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </span>
                        </div>
                        <div className="mt-1.5">
                          <h4 className="text-xs font-bold text-slate-900 leading-tight">
                            {tier.name}
                          </h4>
                          <span className="text-[10px] text-slate-500 block truncate">
                            {tier.gate.split(' ')[0]} {tier.gate.split(' ')[1]}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 3: Party Details & Special Requests */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Users className="w-3 h-3 text-rose-500" />
                  <span>3. Attendance Options</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Party Size
                    </label>
                    <select
                      value={guestCount}
                      onChange={(e) => setGuestCount(e.target.value)}
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-rose-400 text-slate-900"
                    >
                      <option value="1 Guest (Solo Attendee)">1 Guest (Solo)</option>
                      <option value="2 Guests (Couple / Pair)">2 Guests (Couple)</option>
                      <option value="3 Guests (Family / Group)">3 Guests (Group)</option>
                      <option value="4 Guests (VIP Table Party)">4 Guests (VIP Table)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Dietary / Seating / Accessibility Requests
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Vegetarian diet, field-front preference"
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-rose-400 text-slate-900 placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* Bottom: Terms Agreement & Submit Button */}
              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-[11px] text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span>Receive official QR entry pass via WhatsApp & Email upon approval</span>
                </label>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/20 transition-all disabled:opacity-50 whitespace-nowrap"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Registration Request</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        /* ========================================================
           STATE 2: SUBMITTED - CONFIRMATION & WHATSAPP/EMAIL PASS
           ======================================================== */
        <div className="flex flex-col justify-start h-full space-y-3">
          {/* Top Compact Banner with Required Message */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-700 to-slate-900 text-white p-3.5 sm:p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0 mt-0.5 sm:mt-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight">
                  Your registration request has been submitted!
                </h3>
                <p className="text-[11px] text-emerald-100 leading-tight">
                  Once it gets approved, you will receive a <strong>WhatsApp and email confirmation</strong> with your official QR entry pass and event directions.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] self-end sm:self-center shrink-0">
              <span className="px-2.5 py-1 rounded-lg bg-white/15 backdrop-blur-xs font-mono font-bold">
                {liveReg.id}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white/15 backdrop-blur-xs font-semibold">
                {liveReg.tier}
              </span>
            </div>
          </div>

          {/* Two-Column Responsive Layout: Left = Actions & What Happens Next; Right = Phone Simulator with QR */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start flex-1 min-h-0">
            {/* Left Column: Status, Instant Approval Simulator & Next Steps */}
            <div className="lg:col-span-5 space-y-2.5">
              {/* Status & Immediate Simulator Card */}
              <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Application Status</span>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                      liveReg.status === 'Approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {liveReg.status === 'Approved' ? '✓ Approved' : 'Pending Review'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 leading-tight">
                  {liveReg.status === 'Approved'
                    ? `Pass ID ${liveReg.ticketId} issued. Your QR code is verified for gate entry.`
                    : 'Click below to simulate executive approval and instantly issue the QR barcode.'}
                </p>

                {liveReg.status === 'Pending' ? (
                  <button
                    type="button"
                    onClick={handleInstantApprove}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 text-emerald-200" />
                    <span>⚡ Simulate Approval & Generate QR Pass</span>
                  </button>
                ) : (
                  <div className="space-y-1.5 w-full">
                    <button
                      type="button"
                      onClick={() => setSelectedTicketPass(liveReg)}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      <Ticket className="w-3.5 h-3.5 text-rose-600" />
                      <span>View / Print E-Pass</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openEmailConfirmation(liveReg)}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5 text-rose-400" />
                      <span>Send Real Pass to {liveReg.email} via Gmail</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Attendee Details Summary */}
              <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs text-xs space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Registered Details
                </span>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Guest Name</span>
                    <strong className="text-slate-900 truncate block">{liveReg.name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">WhatsApp</span>
                    <span className="text-slate-700 font-mono truncate block">{liveReg.whatsapp}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Email</span>
                    <span className="text-slate-700 font-mono truncate block">{liveReg.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Assigned Turnstile</span>
                    <strong className="text-rose-700 truncate block">{getGateForTier(liveReg.tier)}</strong>
                  </div>
                </div>
              </div>

              {/* What Happens Next Guide */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-800 block">
                  📋 What Happens Next?
                </span>
                <ul className="text-[11px] text-slate-600 space-y-1">
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-600 font-bold">1.</span>
                    <span>Save your QR barcode to your mobile phone gallery or Apple/Google wallet.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-600 font-bold">2.</span>
                    <span>Arrive at Al Rayyan Grounds between 14:00 and 16:30.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-600 font-bold">3.</span>
                    <span>Proceed to <strong>{getGateForTier(liveReg.tier)}</strong> for laser scan.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-600 font-bold">4.</span>
                    <span>Gate turnstile automatically unlocks and staff issues your VIP wristband.</span>
                  </li>
                </ul>
              </div>

              {/* Public Attendee Action Options */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="text-xs text-slate-600 hover:text-slate-900 font-semibold"
                >
                  + Submit Another Request
                </button>
                {liveReg.status === 'Approved' ? (
                  <button
                    type="button"
                    onClick={() => setSelectedTicketPass(liveReg)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download / View E-Pass</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-amber-700 font-medium bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Awaiting Approval</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: WhatsApp / Email Live Pass Preview with QR */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-3.5 flex flex-col justify-between">
              {/* Tab Selector */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800">
                  Notification Preview ({previewTab === 'whatsapp' ? 'WhatsApp' : 'Email'})
                </span>
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setPreviewTab('whatsapp')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                      previewTab === 'whatsapp'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Smartphone className="w-3 h-3" />
                    <span>WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTab('email')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                      previewTab === 'email'
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Mail className="w-3 h-3" />
                    <span>Email</span>
                  </button>
                </div>
              </div>

              {/* View 1: WhatsApp Message with QR */}
              {previewTab === 'whatsapp' && (
                <div className="bg-[#e5ddd5] rounded-xl p-3 my-2 border border-slate-200 shadow-2xs">
                  {/* WhatsApp Verified Header */}
                  <div className="bg-[#075e54] text-white p-2 rounded-lg flex items-center justify-between shadow-2xs mb-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold font-serif text-sm">
                        P
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-[11px]">Pink Polo 2026 Official</span>
                          <CheckCheck className="w-3 h-3 text-sky-300" />
                        </div>
                        <span className="text-[9px] text-emerald-200">Verified Organizer</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-emerald-200 font-mono">14:02</span>
                  </div>

                  {/* Message Bubble */}
                  <div className="bg-white rounded-xl p-3 shadow-2xs space-y-2 border border-slate-200 text-xs">
                    <p className="text-[11px] text-slate-700 leading-snug">
                      Dear <strong>{liveReg.name}</strong>,
                      <br />
                      {liveReg.status === 'Approved' ? (
                        <>
                          Your registration for <strong>Pink Polo 2026</strong> has been{' '}
                          <strong className="text-emerald-700">APPROVED</strong>! Present this QR code at{' '}
                          <strong>{getGateForTier(liveReg.tier)}</strong>.
                        </>
                      ) : (
                        <>
                          Your registration request has been received and is under{' '}
                          <strong>Executive Committee Review</strong>. Your QR pass will activate here once approved.
                        </>
                      )}
                    </p>

                    {/* QR Code Block */}
                    {liveReg.status === 'Approved' ? (
                      <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-2.5 flex items-center gap-3">
                        <div className="p-1.5 bg-white rounded-lg border border-slate-200 shadow-2xs shrink-0">
                          <QRCodeView
                            value={liveReg.qrValue || `PINK-POLO-2026-${liveReg.ticketId}`}
                            size={110}
                            ticketId={liveReg.ticketId}
                            attendeeName={liveReg.name}
                            showActions={false}
                          />
                        </div>
                        <div className="space-y-1 text-[11px] min-w-0">
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase tracking-wider block">
                              Ticket Pass ID
                            </span>
                            <span className="font-mono font-bold text-rose-700 text-xs">
                              {liveReg.ticketId}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase tracking-wider block">
                              Gate & Tier
                            </span>
                            <strong className="text-slate-900 block truncate">
                              {liveReg.tier} ({getGateForTier(liveReg.tier).split(' ')[0]})
                            </strong>
                          </div>
                          <span className="text-[10px] text-emerald-700 font-semibold block">
                            ✓ Ready for turnstile scan
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-center">
                        <Clock className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                        <span className="text-[11px] font-bold text-amber-900 block">
                          Pass Under Committee Review
                        </span>
                        <span className="text-[10px] text-amber-700">
                          Click "Simulate Approval" on the left to see the scannable pass.
                        </span>
                      </div>
                    )}

                    <div className="pt-1 flex items-center justify-between text-[9px] text-slate-400 border-t border-slate-100">
                      <span>Pink Polo Automated Concierge</span>
                      <div className="flex items-center gap-1">
                        <span>Delivered</span>
                        <CheckCheck className="w-3 h-3 text-sky-500" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* View 2: Official Email Pass */}
              {previewTab === 'email' && (
                <div className="bg-slate-50 rounded-xl p-3 my-2 border border-slate-200 shadow-2xs space-y-2 text-xs">
                  <div className="bg-white p-2 rounded-lg border border-slate-200 text-[11px] space-y-0.5">
                    <div>
                      <span className="font-semibold text-slate-900">From:</span> Pink Polo 2026 Committee &lt;invitations@pinkpolo2026.qa&gt;
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900">To:</span> {liveReg.email}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900">Subject:</span>{' '}
                      <strong>
                        {liveReg.status === 'Approved'
                          ? `[OFFICIAL PASS] Pink Polo 2026 Admission - ${liveReg.ticketId}`
                          : `Pink Polo 2026 - Registration Received (${liveReg.id})`}
                      </strong>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                    <p className="text-[11px] text-slate-700">
                      Dear {liveReg.name},
                      <br />
                      {liveReg.status === 'Approved'
                        ? 'We are delighted to confirm your attendance at Pink Polo 2026. Below is your official QR barcode for entry.'
                        : 'Thank you for your registration request. It is currently being reviewed by the executive committee.'}
                    </p>

                    {liveReg.status === 'Approved' && (
                      <div className="flex items-center gap-3 p-2 bg-rose-50/50 rounded-lg border border-rose-200">
                        <div className="p-1 bg-white rounded border border-slate-200 shrink-0">
                          <QRCodeView
                            value={liveReg.qrValue || `PINK-POLO-2026-${liveReg.ticketId}`}
                            size={100}
                            ticketId={liveReg.ticketId}
                            attendeeName={liveReg.name}
                            showActions={false}
                          />
                        </div>
                        <div className="text-[11px] space-y-0.5">
                          <span className="text-rose-700 font-mono font-bold block">{liveReg.ticketId}</span>
                          <span className="text-slate-900 font-semibold block">{liveReg.tier}</span>
                          <span className="text-slate-500 text-[10px] block">{getGateForTier(liveReg.tier)}</span>
                          <span className="text-slate-500 text-[10px] block">Dates: Nov 20–22, 2026</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Bottom Quick Help */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Real-time live simulation mode</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedTicketPass(liveReg)}
                  className="text-rose-600 hover:text-rose-700 font-semibold text-[11px]"
                >
                  Open Full Pass Modal →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
