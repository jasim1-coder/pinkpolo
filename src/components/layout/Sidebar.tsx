import React from 'react';
import { useEvent } from '../../context/EventContext';
import {
  LayoutDashboard,
  Users,
  Ticket,
  BarChart3,
  Calendar,
} from 'lucide-react';

import ghantootLogo from '../../assets/images/ghantoot_polo_logo.png';

export type NavTab = 'dashboard' | 'registrations' | 'tickets' | 'checkin' | 'register' | 'analytics';

interface SidebarProps {
  currentTab: NavTab;
  setCurrentTab: (tab: NavTab) => void;
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  isOpenMobile,
  setIsOpenMobile,
}) => {
  const { stats } = useEvent();

  const primaryNavItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'registrations' as NavTab,
      label: 'Registrations',
      icon: Users,
      badge: stats.pendingApproval > 0 ? `${stats.pendingApproval} pending` : null,
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    },
    {
      id: 'tickets' as NavTab,
      label: 'Tickets',
      icon: Ticket,
      badge: stats.ticketsGenerated > 0 ? `${stats.ticketsGenerated}` : null,
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
    },
    {
      id: 'analytics' as NavTab,
      label: 'Analytics & Attendance',
      icon: BarChart3,
      badge: null,
      badgeColor: '',
    },
  ];

  const handleSelect = (tab: NavTab) => {
    setCurrentTab(tab);
    setIsOpenMobile(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setIsOpenMobile(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200/90 flex flex-col justify-between transition-transform duration-300 ease-out shadow-sm lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Top Header & Navigation */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Brand Header Lockup */}
          <div className="h-22 px-4 py-3 border-b border-slate-100 flex flex-col items-center justify-center bg-gradient-to-b from-slate-50/70 to-white">
            <img
              src={ghantootLogo}
              alt="Ghantoot Racing & Polo Club"
              className="h-14 w-auto max-w-[210px] object-contain drop-shadow-2xs"
            />
            <span className="text-[9px] font-semibold text-rose-700 tracking-wider uppercase mt-1">
              Pink Polo 2026 · Abu Dhabi
            </span>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
            <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Event Management
            </div>

            {primaryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group ${
                    isActive
                      ? 'bg-gradient-to-r from-rose-50/90 to-white text-rose-950 shadow-xs border border-rose-200/70'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`p-1.5 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-rose-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold tabular-nums border ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Section: Event Dates & System Status */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-3">
          {/* Event Quick Info Banner */}
          <div className="p-3 bg-gradient-to-br from-rose-50 to-white rounded-xl border border-rose-100/80 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-rose-600" />
                <span className="text-xs font-bold text-slate-900">Nov 20–22, 2026</span>
              </div>
              <span className="text-[10px] font-bold text-rose-700 bg-rose-100/70 px-1.5 py-0.2 rounded">
                Gala
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              Ghantoot Polo Grounds, Abu Dhabi
            </p>
            <div className="pt-1 flex items-center justify-between text-[10px] text-slate-600 font-medium">
              <span>Gate: 14:00</span>
              <span className="text-emerald-700 font-semibold font-mono">Turnstile Active</span>
            </div>
          </div>

          {/* Footer Metadata */}
          <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Database Connected</span>
            </span>
            <span className="font-mono text-[10px]">v2.6</span>
          </div>
        </div>
      </aside>
    </>
  );
};
