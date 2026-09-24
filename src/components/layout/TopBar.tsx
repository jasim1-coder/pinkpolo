import React, { useState, useRef, useEffect } from 'react';
import { useEvent } from '../../context/EventContext';
import { useGmail } from '../../context/GmailContext';
import { GoogleAuthButton } from '../common/GoogleAuthButton';
import { NavTab } from './Sidebar';
import {
  Menu,
  Bell,
  CheckCircle2,
  Ticket,
  ChevronDown,
  Shield,
  Send,
  LayoutDashboard,
  Users,
  BarChart3,
  Sparkles,
} from 'lucide-react';
import ghantootLogo from '../../assets/images/ghantoot_polo_logo.png';

interface TopBarProps {
  currentTab: NavTab;
  onOpenMobileSidebar: () => void;
  setCurrentTab: (tab: NavTab) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentTab,
  onOpenMobileSidebar,
  setCurrentTab,
}) => {
  const {
    activities,
    setSelectedRegistration,
    registrations,
  } = useEvent();

  const {
    currentUser,
    hasGmailAuth,
    isLoadingAuth,
    signInWithGoogle,
    signOutGoogle,
  } = useGmail();

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

  const handleActivityClick = (attendeeName: string) => {
    const found = registrations.find((r) => r.name.toLowerCase() === attendeeName.toLowerCase());
    if (found) {
      setSelectedRegistration(found);
      setNotificationsOpen(false);
    }
  };

  return (
    <header className="h-16 px-4 sm:px-6 lg:px-8 bg-white/95 backdrop-blur-md border-b border-slate-200/90 flex items-center justify-between sticky top-0 z-30 min-w-0 shadow-2xs">
      {/* Left: Mobile Toggle & Mobile Logo */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileSidebar}
          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl lg:hidden shrink-0 transition-colors border border-slate-200/80 shadow-2xs"
          title="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile-only logo */}
        <div className="lg:hidden flex items-center">
          <img
            src={ghantootLogo}
            alt="Ghantoot Racing & Polo Club"
            className="h-9 w-auto object-contain"
          />
        </div>
      </div>

      {/* Right: Quick Action Toolbar */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Quick Launch Guest Form Button */}
        {currentTab !== 'register' && (
          <button
            type="button"
            onClick={() => setCurrentTab('register')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 active:scale-[0.98] border border-rose-200/80 rounded-xl transition-all shadow-2xs"
            title="Open Public Guest Registration Form"
          >
            <Send className="w-3.5 h-3.5 text-rose-600" />
            <span className="hidden sm:inline">Guest Registration Form</span>
            <span className="sm:hidden">Guest UI</span>
          </button>
        )}

        {/* Google Workspace Gmail Connection Indicator */}
        {hasGmailAuth ? (
          <div
            className="hidden lg:inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-xl text-xs font-medium shadow-2xs"
            title={`Connected as ${currentUser?.email || 'Google User'}. Automatic approval emails are active.`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="max-w-[130px] truncate font-medium">
              {currentUser?.email?.split('@')[0] || 'Gmail'}
            </span>
            <button
              type="button"
              onClick={signOutGoogle}
              className="text-[10px] text-emerald-700 hover:text-emerald-950 underline cursor-pointer ml-0.5 font-semibold"
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
            className="py-1.5 px-3 text-xs hidden sm:inline-flex rounded-xl shadow-2xs"
          />
        )}

        {/* Activity Notifications Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className={`relative p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all ${
              notificationsOpen ? 'bg-slate-100 text-slate-900 border-slate-200' : ''
            }`}
            title="Activity Notifications"
          >
            <Bell className="w-4 h-4" />
            {activities.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-1">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-rose-600" />
                  <span className="text-xs font-bold text-slate-900">Live Activity Feed</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono font-medium">
                  {activities.length} updates logged
                </span>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {activities.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No recent activity recorded yet.
                  </div>
                ) : (
                  activities.slice(0, 7).map((act) => (
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
                  ))
                )}
              </div>

              <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentTab('dashboard');
                    setNotificationsOpen(false);
                  }}
                  className="text-xs text-rose-600 font-bold hover:text-rose-700"
                >
                  View Full Activity on Dashboard →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Administrator Profile Dropdown */}
        <div className="relative pl-1 border-l border-slate-200" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2.5 p-1.5 hover:bg-slate-100 rounded-xl transition-all cursor-pointer border border-transparent hover:border-slate-200"
            title="Administrator Menu"
          >
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-2xs ring-2 ring-rose-100">
              <Shield className="w-4 h-4 text-rose-300" />
            </div>
            <div className="hidden xl:block text-left text-xs leading-tight pr-1">
              <span className="font-bold text-slate-900 block">Admin Console</span>
              <span className="text-[10px] text-slate-400 font-mono">Ghantoot Polo</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in">
              <div className="p-3.5 border-b border-slate-100 bg-slate-50">
                <p className="text-xs font-bold text-slate-900">Ghantoot Event Operations</p>
                <div className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 w-fit">
                  <Shield className="w-3 h-3 text-rose-600" />
                  Administrator Role
                </div>
              </div>
              <div className="p-1.5 text-xs text-slate-700 space-y-0.5">
                <button
                  onClick={() => {
                    setCurrentTab('dashboard');
                    setProfileOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-xl font-medium flex items-center gap-2"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-slate-400" />
                  <span>Dashboard</span>
                </button>
                <button
                  onClick={() => {
                    setCurrentTab('registrations');
                    setProfileOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-xl font-medium flex items-center gap-2"
                >
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>Registrations</span>
                </button>
                <button
                  onClick={() => {
                    setCurrentTab('analytics');
                    setProfileOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-xl font-medium flex items-center gap-2"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Attendance Manifest</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
