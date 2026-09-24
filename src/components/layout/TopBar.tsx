import React, { useState, useRef, useEffect } from 'react';
import { useEvent } from '../../context/EventContext';
import { useGmail } from '../../context/GmailContext';
import { GoogleAuthButton } from '../common/GoogleAuthButton';
import { NavTab } from './Sidebar';
import {
  Menu,
  Search,
  Bell,
  CheckCircle2,
  Clock,
  Sparkles,
  Ticket,
  ExternalLink,
  ChevronDown,
  LogOut,
  Shield,
  Send,
  LayoutDashboard,
  X,
  Smartphone,
} from 'lucide-react';
import adminAvatarImg from '../../assets/images/admin_avatar_1790157604248.jpg';

interface TopBarProps {
  currentTab: NavTab;
  onOpenMobileSidebar: () => void;
  onSearchGlobal?: (query: string) => void;
  setCurrentTab: (tab: NavTab) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentTab,
  onOpenMobileSidebar,
  onSearchGlobal,
  setCurrentTab,
}) => {
  const {
    activities,
    setSelectedRegistration,
    registrations,
    setPwaModalOpen,
  } = useEvent();

  const {
    currentUser,
    hasGmailAuth,
    isLoadingAuth,
    signInWithGoogle,
    signOutGoogle,
  } = useGmail();

  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (onSearchGlobal) onSearchGlobal(val);
  };

  const getPageTitle = (tab: NavTab) => {
    switch (tab) {
      case 'dashboard':
        return 'Executive Overview';
      case 'registrations':
        return 'Attendee Registrations';
      case 'tickets':
        return 'Issued Tickets & Passes';
      case 'checkin':
        return 'Gate Check-In Console';
      case 'register':
        return 'Guest Registration Request Form';
      case 'analytics':
        return 'Event Analytics & Metrics';
      default:
        return 'Admin Dashboard';
    }
  };

  const handleActivityClick = (attendeeName: string) => {
    const found = registrations.find((r) => r.name.toLowerCase() === attendeeName.toLowerCase());
    if (found) {
      setSelectedRegistration(found);
      setNotificationsOpen(false);
    }
  };

  return (
    <header className="h-16 px-3 sm:px-4 lg:px-6 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-30 min-w-0">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onOpenMobileSidebar}
          className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg lg:hidden shrink-0"
          title="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="hidden xs:flex items-center gap-1.5 text-[11px] text-slate-400">
            <span>Pink Polo 2026</span>
            <span>/</span>
            <span className="capitalize text-slate-600 font-medium truncate">
              {currentTab === 'register' ? 'Guest Portal' : currentTab}
            </span>
          </div>
          <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight truncate max-w-[150px] xs:max-w-[220px] sm:max-w-xs md:max-w-none">
            {getPageTitle(currentTab)}
          </h1>
        </div>
      </div>

      {/* Center: Desktop Search input */}
      <div className="hidden xl:flex items-center max-w-xs w-full mx-4">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search attendee, ticket, email..."
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-rose-400 focus:bg-white text-slate-900 placeholder-slate-400 transition-colors"
          />
        </div>
      </div>

      {/* Right Actions: Responsive buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Mobile/Tablet Search Toggle */}
        <div className="xl:hidden relative">
          <button
            type="button"
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            className={`p-2 rounded-lg text-slate-500 hover:text-slate-900 transition-colors ${
              mobileSearchOpen ? 'bg-slate-100 text-slate-900' : 'hover:bg-slate-100'
            }`}
            title="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {mobileSearchOpen && (
            <div className="absolute right-0 top-12 w-72 sm:w-80 bg-white border border-slate-200 shadow-xl rounded-xl p-2 z-50 animate-in fade-in slide-in-from-top-1">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search attendee, pass ID, email..."
                  className="w-full text-xs pl-8 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-rose-400 text-slate-900 placeholder-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setMobileSearchOpen(false)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Public Guest Registration Request Form Button (shown in admin views) */}
        {currentTab !== 'register' && (
          <button
            type="button"
            onClick={() => setCurrentTab('register')}
            className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors shadow-2xs whitespace-nowrap bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 hover:border-rose-300"
            title="Open the Public Attendee Registration Form"
          >
            <Send className="w-3.5 h-3.5 text-rose-600" />
            <span className="hidden md:inline">Guest Form</span>
            <span className="md:hidden">Form</span>
          </button>
        )}

        {/* Google Workspace Gmail Connection (shown in admin views) */}
        {currentTab !== 'register' && (
          hasGmailAuth ? (
            <div
              className="hidden lg:inline-flex items-center gap-2 px-2.5 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-medium shadow-2xs"
              title={`Connected as ${currentUser?.email || 'Google User'}. Real approval emails are enabled.`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="max-w-[130px] truncate font-medium">
                {currentUser?.email?.split('@')[0] || 'Gmail'}
              </span>
              <button
                type="button"
                onClick={signOutGoogle}
                className="text-[10px] text-emerald-600 hover:text-emerald-950 underline cursor-pointer ml-0.5"
                title="Disconnect Google account"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <GoogleAuthButton
              onClick={signInWithGoogle}
              isLoading={isLoadingAuth}
              label="Connect Gmail"
              className="py-1 px-2.5 text-xs hidden sm:inline-flex"
            />
          )
        )}

        {/* External PWA Integration Modal Trigger */}
        {currentTab !== 'register' && (
          <button
            type="button"
            onClick={() => setPwaModalOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer border border-slate-700"
            title="View PWA barcode camera scanner API, endpoint URL, and integration code"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <Smartphone className="w-3.5 h-3.5 text-rose-300" />
            <span className="hidden md:inline">PWA Scanner API</span>
          </button>
        )}

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Activity Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-1">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Live Activity Feed</span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {activities.length} updates recorded
                </span>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {activities.slice(0, 7).map((act) => (
                  <div
                    key={act.id}
                    onClick={() => handleActivityClick(act.attendeeName)}
                    className="p-3 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-2.5 text-xs"
                  >
                    <div className="mt-0.5">
                      {act.type === 'approval' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                      {act.type === 'checkin' && <Ticket className="w-3.5 h-3.5 text-rose-600" />}
                      {act.type === 'registration' && <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block mt-1" />}
                      {act.type === 'ticket' && <Sparkles className="w-3.5 h-3.5 text-sky-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{act.title}</p>
                      <p className="text-[11px] text-slate-500 truncate">{act.description}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                      {act.timeAgo}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-2 bg-slate-50 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentTab('dashboard');
                    setNotificationsOpen(false);
                  }}
                  className="text-xs text-rose-600 font-semibold hover:text-rose-700"
                >
                  View Full Recent Activity on Dashboard
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Admin Profile */}
        <div className="relative pl-1 border-l border-slate-200" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 p-1 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <img
              src={adminAvatarImg}
              alt="Eleanor Vance"
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-full object-cover border border-rose-200"
            />
            <div className="hidden xl:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-900 leading-tight">
                Eleanor Vance
              </span>
              <span className="text-[10px] text-slate-400">Chief Event Director</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden xl:block" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in">
              <div className="p-3.5 border-b border-slate-100 bg-slate-50">
                <p className="text-xs font-bold text-slate-900">Eleanor Vance</p>
                <p className="text-[11px] text-slate-500">e.vance@pinkpolo2026.qa</p>
                <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 w-fit">
                  <Shield className="w-3 h-3 text-rose-600" />
                  Super Admin
                </div>
              </div>
              <div className="p-1 text-xs text-slate-700">
                <button
                  onClick={() => {
                    setCurrentTab('dashboard');
                    setProfileOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg"
                >
                  Dashboard Overview
                </button>
                <button
                  onClick={() => {
                    setCurrentTab('registrations');
                    setProfileOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg"
                >
                  Manage Registrations
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
