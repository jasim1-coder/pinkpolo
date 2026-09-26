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
  MessageSquare,
} from 'lucide-react';
import poloBannerImg from '../../assets/images/pink_polo_banner_1790157590237.jpg';
import ghantootLogo from '../../assets/images/ghantoot_polo_logo.png';
import confetti from 'canvas-confetti';

import { sendWhatsAppTicketPass, validateInternationalPhone, getGateForTier } from '../../services/whatsappService';

interface PublicRegistrationPortalProps {
  isStandalonePublic?: boolean;
}

export const PublicRegistrationPortal: React.FC<PublicRegistrationPortalProps> = ({
  isStandalonePublic = false,
}) => {
  const {
    submitAttendeeRegistration,
    approveRegistration,
    registrations,
    setSelectedTicketPass,
    addToast,
  } = useEvent();

  const { openEmailConfirmation, hasGmailAuth } = useGmail();

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+971');
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
  const [isPhoneInvalid, setIsPhoneInvalid] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsPhoneInvalid(false);

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
    const fullPhone = `${countryCode} ${phoneLocal.trim()}`;

    // Validate phone number format & digit count based on international standard for selected country
    const phoneCheck = validateInternationalPhone(fullPhone);

    if (!phoneCheck.valid) {
      setIsSubmitting(false);
      setIsPhoneInvalid(true);
      setErrorMsg(
        phoneCheck.error ||
        'Please enter a valid phone number with the correct number of digits for your selected country.'
      );
      addToast(
        'warning',
        'Invalid Phone Number',
        phoneCheck.error || 'Please enter a valid phone number matching your country.'
      );
      return;
    }

    // All form values are valid -> proceed with registration
    const newReg = submitAttendeeRegistration({
      name: fullName.trim(),
      email: email.trim(),
      whatsapp: phoneCheck.formatted || fullPhone,
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

  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);

  const handleOpenWhatsApp = async () => {
    if (!liveReg) return;
    if (!liveReg.whatsapp) {
      addToast('warning', 'Missing Phone Number', 'No WhatsApp number on file.');
      return;
    }
    setIsSendingWhatsApp(true);
    addToast('info', 'Sending WhatsApp Pass...', `Dispatching QR pass to ${liveReg.whatsapp} via Meta Cloud API...`);
    try {
      const res = await sendWhatsAppTicketPass({
        toPhone: liveReg.whatsapp,
        attendeeName: liveReg.name,
        ticketId: liveReg.ticketId || liveReg.id,
        tier: liveReg.tier,
        gate: getGateForTier(liveReg.tier),
        qrValue: liveReg.qrValue || `PINK-POLO-2026-${liveReg.ticketId || liveReg.id}`,
      });
      if (res.success) {
        addToast('success', 'WhatsApp Pass Dispatched!', `QR admission pass sent to ${liveReg.whatsapp}`);
      } else {
        addToast('error', 'WhatsApp Dispatch Error', res.error || 'Failed to dispatch WhatsApp pass.');
      }
    } catch (e: any) {
      addToast('error', 'WhatsApp Exception', e?.message || 'Error communicating with WhatsApp API.');
    } finally {
      setIsSendingWhatsApp(false);
    }
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
    <div className="w-full h-full flex flex-col justify-center">
      {/* ========================================================
          STATE 1: CLEAN EDITORIAL LUXURY REGISTRATION (ENLARGED & FULLY RESPONSIVE)
          ======================================================== */}
      {!liveReg ? (
        <div className="bg-white rounded-3xl border border-stone-200/80 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.08)] overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[660px]">
            {/* Left Column: Enlarged Editorial Polo Match Hero Image */}
            <div className="lg:col-span-5 relative overflow-hidden flex flex-col justify-between p-7 sm:p-9 lg:p-10 text-white min-h-[300px] sm:min-h-[400px] lg:min-h-full">
              {/* Genuine Polo Hero Image */}
              <img
                src={poloBannerImg}
                alt="Pink Polo Match"
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
              {/* Refined gradient overlay for high-contrast legibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/95 via-stone-950/40 to-stone-950/20" />

              {/* Top Tag */}
              <div className="relative z-10">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 text-white backdrop-blur-md border border-white/30 shadow-xs">
                  <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                  <span>15th Annual Charity Gala</span>
                </span>
              </div>

              {/* Bottom: Event Title & Date */}
              <div className="relative z-10 space-y-2.5">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-white tracking-tight leading-tight">
                  Pink Polo 2026
                </h1>
                <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs sm:text-sm text-stone-200 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-rose-300" />
                    Nov 20–22, 2026
                  </span>
                  <span className="text-stone-400">·</span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-rose-300" />
                    Ghantoot, Abu Dhabi
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Enlarged Clean Registration Form */}
            <div className="lg:col-span-7 p-6 sm:p-8 lg:p-11 flex flex-col justify-between bg-white space-y-6">
              {/* Enlarged Logo & Headline Header */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
                  <img
                    src={ghantootLogo}
                    alt="Ghantoot Racing & Polo Club"
                    className="h-12 sm:h-14 lg:h-16 w-auto max-w-[280px] sm:max-w-[340px] object-contain drop-shadow-xs"
                  />
                  <span className="self-start sm:self-auto text-xs font-semibold text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-100 shadow-2xs">
                    Guest Pass Request
                  </span>
                </div>

                <div className="mt-4">
                  <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-900">
                    Attendee Registration
                  </h2>
                  <p className="text-xs sm:text-sm text-stone-500 mt-1">
                    Please provide your contact details. Official QR digital passes will be delivered directly via WhatsApp and email.
                  </p>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs sm:text-sm text-rose-800 font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                {/* Contact Fields (2-Column Grid on Tablet/Desktop, 1-Column on Mobile) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-stone-700 mb-1.5">
                      Full Name <span className="text-rose-600">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Your full name"
                        className="w-full text-xs sm:text-sm pl-10 pr-3.5 py-3 sm:py-3.5 bg-stone-50/70 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 text-stone-900 transition-all placeholder:text-stone-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-stone-700 mb-1.5">
                      Email Address <span className="text-rose-600">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full text-xs sm:text-sm pl-10 pr-3.5 py-3 sm:py-3.5 bg-stone-50/70 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 text-stone-900 font-mono transition-all placeholder:text-stone-400"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs sm:text-sm font-semibold text-stone-700">
                        WhatsApp Number <span className="text-rose-600">*</span>
                      </label>
                      {isPhoneInvalid ? (
                        <span className="text-xs text-rose-600 font-semibold">
                          Invalid phone format for country
                        </span>
                      ) : (
                        <span className="text-[11px] text-stone-500">
                          Include active WhatsApp number
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={countryCode}
                        onChange={(e) => {
                          setCountryCode(e.target.value);
                          setIsPhoneInvalid(false);
                          setErrorMsg('');
                        }}
                        className="text-xs sm:text-sm px-2.5 sm:px-3 py-3 sm:py-3.5 bg-stone-50/70 border border-stone-200 rounded-xl focus:outline-none focus:border-rose-500 text-stone-700 font-mono shrink-0"
                      >
                        <option value="+971">🇦🇪 UAE +971</option>
                        <option value="+966">🇸🇦 KSA +966</option>
                        <option value="+974">🇶🇦 Qatar +974</option>
                        <option value="+965">🇰🇼 Kuwait +965</option>
                        <option value="+968">🇴🇲 Oman +968</option>
                        <option value="+973">🇧🇭 Bahrain +973</option>
                        <option value="+91">🇮🇳 India +91</option>
                        <option value="+92">🇵🇰 Pakistan +92</option>
                        <option value="+20">🇪🇬 Egypt +20</option>
                        <option value="+962">🇯🇴 Jordan +962</option>
                        <option value="+961">🇱🇧 Lebanon +961</option>
                        <option value="+44">🇬🇧 UK +44</option>
                        <option value="+1">🇺🇸 US/CA +1</option>
                        <option value="+63">🇵🇭 Philippines +63</option>
                      </select>
                      <div className="relative flex-1">
                        <Phone className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${isPhoneInvalid ? 'text-rose-500' : 'text-stone-400'
                          }`} />
                        <input
                          type="tel"
                          required
                          value={phoneLocal}
                          onChange={(e) => {
                            setPhoneLocal(e.target.value);
                            setIsPhoneInvalid(false);
                            setErrorMsg('');
                          }}
                          placeholder={
                            countryCode === '+971'
                              ? '50 123 4567'
                              : countryCode === '+966'
                              ? '50 123 4567'
                              : countryCode === '+91'
                              ? '98765 43210'
                              : countryCode === '+1'
                              ? '202 555 0123'
                              : 'Phone digits'
                          }
                          className={`w-full text-xs sm:text-sm pl-10 pr-3.5 py-3 sm:py-3.5 rounded-xl focus:outline-none font-mono transition-colors ${isPhoneInvalid
                            ? 'bg-rose-50/50 border border-rose-400 text-rose-900 focus:bg-white focus:border-rose-500'
                            : 'bg-stone-50/70 border border-stone-200 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 text-stone-900'
                            }`}
                        />
                      </div>
                    </div>
                    {/* Simple WhatsApp notice */}
                    <div className="mt-2 text-[11.5px] text-amber-800 bg-amber-50/90 border border-amber-200/80 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
                      <span className="font-semibold text-amber-900 shrink-0">⚠️ Notice:</span>
                      <span>Please strictly provide an active WhatsApp number to receive your digital pass and QR code.</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-stone-700 mb-1.5">
                      Organization / Company <span className="text-stone-400 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <Building className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={organization}
                        onChange={(e) => setOrganization(e.target.value)}
                        placeholder="e.g. Abu Dhabi Investment Authority"
                        className="w-full text-xs sm:text-sm pl-10 pr-3.5 py-3 sm:py-3.5 bg-stone-50/70 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 text-stone-900 transition-all placeholder:text-stone-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Experience Tier Selector (Responsive 2x2 on Mobile, 4 Cols on Tablet/Desktop) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs sm:text-sm font-semibold text-stone-700">
                      Select Access Tier
                    </label>
                    <span className="text-xs sm:text-sm font-semibold text-rose-600">
                      Selected: {selectedTier}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                    {tiers.map((tier) => {
                      const isSelected = selectedTier === tier.id;
                      return (
                        <button
                          type="button"
                          key={tier.id}
                          onClick={() => setSelectedTier(tier.id)}
                          className={`p-3 sm:p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${isSelected
                            ? 'border-2 border-rose-500 bg-rose-50/80 ring-2 ring-rose-500/20 shadow-xs'
                            : 'border-stone-200 bg-stone-50/50 hover:bg-stone-50 hover:border-stone-300'
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs sm:text-sm font-bold text-stone-900 leading-tight">
                              {tier.name}
                            </span>
                            <span
                              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${isSelected
                                ? 'border-rose-600 bg-rose-600'
                                : 'border-stone-300 bg-white'
                                }`}
                            >
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </span>
                          </div>
                          <span className="text-[11px] text-stone-500 block mt-1 truncate">
                            {tier.gate.split(' ')[0]} {tier.gate.split(' ')[1]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Party & Notes (Responsive 1-col on mobile, 3-col on Tablet/Desktop) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-stone-700 mb-1.5">
                      Party Size
                    </label>
                    <select
                      value={guestCount}
                      onChange={(e) => setGuestCount(e.target.value)}
                      className="w-full text-xs sm:text-sm p-3 sm:p-3.5 bg-stone-50/70 border border-stone-200 rounded-xl focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 text-stone-900 font-medium"
                    >
                      <option value="1 Guest (Solo Attendee)">1 Guest (Solo)</option>
                      <option value="2 Guests (Couple / Pair)">2 Guests (Couple)</option>
                      <option value="3 Guests (Family / Group)">3 Guests (Group)</option>
                      <option value="4 Guests (VIP Table Party)">4 Guests (VIP Table)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs sm:text-sm font-semibold text-stone-700 mb-1.5">
                      Dietary / Seating Notes <span className="text-stone-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Vegetarian, front seating"
                      className="w-full text-xs sm:text-sm p-3 sm:p-3.5 bg-stone-50/70 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 text-stone-900 placeholder:text-stone-400 transition-all"
                    />
                  </div>
                </div>

                {/* Submit & Agreement */}
                <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <label className="flex items-center gap-2.5 text-xs sm:text-sm text-stone-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="w-4.5 h-4.5 rounded text-rose-600 focus:ring-rose-500 border-stone-300"
                    />
                    <span>Send official QR pass via WhatsApp & Email upon confirmation</span>
                  </label>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-8 py-3.5 sm:py-4 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-rose-600/25 transition-all disabled:opacity-50 whitespace-nowrap cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Confirming WhatsApp...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Submit Registration</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : isStandalonePublic ? (
        /* ========================================================
           STATE 2A: STANDALONE PUBLIC GUEST CONFIRMATION SCREEN
           ======================================================== */
        <div className="max-w-xl mx-auto w-full py-4 space-y-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xl overflow-hidden p-6 sm:p-8 space-y-6">
            {/* Header with Ghantoot Logo */}
            <div className="flex flex-col items-center text-center space-y-3 pb-4 border-b border-stone-100">
              <img
                src={ghantootLogo}
                alt="Ghantoot Racing & Polo Club"
                className="h-12 w-auto object-contain"
              />
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-serif font-bold text-stone-900">
                  Thank You, {liveReg.name}
                </h2>
                <p className="text-xs text-stone-500 mt-1">
                  Your registration for the <strong className="text-stone-900">{liveReg.tier}</strong> experience has been received.
                </p>
              </div>
            </div>

            {/* Summary details */}
            <div className="bg-stone-50 rounded-2xl p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-stone-200/60">
                <span className="text-stone-500">Reference ID</span>
                <span className="font-mono font-bold text-stone-900">{liveReg.id}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-stone-600">
                <div>
                  <span className="text-stone-400 block text-[11px]">WhatsApp</span>
                  <span className="font-mono text-stone-900 font-medium">{liveReg.whatsapp}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[11px]">Email</span>
                  <span className="font-mono text-stone-900 font-medium truncate block">{liveReg.email}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[11px]">Access Tier</span>
                  <span className="text-rose-700 font-semibold">{liveReg.tier}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[11px]">Turnstile</span>
                  <span className="text-stone-900">{getGateForTier(liveReg.tier).split('(')[0]}</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-stone-500 text-center leading-relaxed">
              Your official digital QR entry pass will be dispatched to your WhatsApp number ({liveReg.whatsapp}) upon committee confirmation.
            </p>

            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={handleResetForm}
                className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Submit Another Registration
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================
           STATE 2B: ADMIN PREVIEW & SIMULATION MODE (LUXURY LIGHT THEME)
           (Used only within the Admin Portal)
           ======================================================== */
        <div className="flex flex-col justify-start h-full space-y-3">
          {/* Top Compact Banner with Required Message */}
          <div className="bg-gradient-to-r from-rose-600 via-rose-500 to-pink-600 text-white p-4 rounded-2xl shadow-md shadow-rose-600/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-rose-400/30">
            <div className="flex items-start sm:items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0 mt-0.5 sm:mt-0">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight">
                  Your registration request has been submitted!
                </h3>
                <p className="text-[11px] text-rose-100 leading-tight">
                  Once it gets approved, you will receive a <strong>WhatsApp and email confirmation</strong> with your official QR entry pass and event directions.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] self-end sm:self-center shrink-0">
              <span className="px-2.5 py-1 rounded-lg bg-white/20 backdrop-blur-xs font-mono font-bold">
                {liveReg.id}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white/20 backdrop-blur-xs font-semibold">
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
                    className={`text-[11px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${liveReg.status === 'Approved'
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
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 text-emerald-200" />
                    <span>⚡ Simulate Approval & Generate QR Pass</span>
                  </button>
                ) : (
                  <div className="space-y-2 w-full pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedTicketPass(liveReg)}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      <Ticket className="w-3.5 h-3.5 text-rose-600" />
                      <span>View / Print E-Pass</span>
                    </button>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEmailConfirmation(liveReg)}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                        title="Send official ticket pass to attendee email via Gmail"
                      >
                        <Mail className="w-3.5 h-3.5 text-rose-400" />
                        <span>Send Email (Gmail)</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenWhatsApp}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#25D366] hover:bg-[#1ebd5a] text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                        title="Send confirmation and pass details to attendee WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-white" />
                        <span>Send WhatsApp</span>
                      </button>
                    </div>
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
                    <span>Arrive at Ghantoot Polo Grounds, Abu Dhabi between 14:00 and 16:30.</span>
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
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${previewTab === 'whatsapp'
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
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${previewTab === 'email'
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

                    {liveReg.status === 'Approved' && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={handleOpenWhatsApp}
                          className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 bg-[#25D366] hover:bg-[#1ebd5a] text-white font-bold text-[11px] rounded-lg shadow-2xs transition-colors cursor-pointer"
                        >
                          <MessageSquare className="w-3 h-3 text-white" />
                          <span>Dispatch to Attendee WhatsApp</span>
                        </button>
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
                      <span className="font-semibold text-slate-900">From:</span> Pink Polo 2026 Committee &lt;invitations@pinkpolo.ae&gt;
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
                      <>
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

                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => openEmailConfirmation(liveReg)}
                            className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] rounded-lg shadow-2xs transition-colors cursor-pointer"
                          >
                            <Mail className="w-3 h-3 text-rose-300" />
                            <span>Send Real Email via Gmail</span>
                          </button>
                        </div>
                      </>
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
