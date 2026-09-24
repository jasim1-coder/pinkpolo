import React from 'react';
import { useEvent } from '../../context/EventContext';
import {
  LayoutDashboard,
  Users,
  Ticket,
  QrCode,
  BarChart3,
  Sparkles,
  Calendar,
  Layers,
  ChevronRight,
  Smartphone,
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
  const { stats, setPwaModalOpen } = useEvent();

  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'registrations' as NavTab,
      label: 'Registrations',
      icon: Users,
      badge: stats.pendingApproval > 0 ? `${stats.pendingApproval} pending` : null,
      badgeColor: 'bg-amber-100 text-amber-800',
    },
    {
      id: 'tickets' as NavTab,
      label: 'Tickets',
      icon: Ticket,
      badge: `${stats.ticketsGenerated}`,
      badgeColor: 'bg-slate-100 text-slate-700',
    },
    {
      id: 'checkin' as NavTab,
      label: 'Gate Check-In',
      icon: QrCode,
      badge: 'Live',
      badgeColor: 'bg-rose-100 text-rose-700 font-semibold',
    },
    {
      id: 'analytics' as NavTab,
      label: 'Analytics',
      icon: BarChart3,
      badge: null,
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
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs lg:hidden"
          onClick={() => setIsOpenMobile(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Lockup */}
        <div className="h-18 px-4 border-b border-slate-100 flex items-center justify-center bg-white">
          <img
            src={ghantootLogo}
            alt="Ghantoot Racing & Polo Club"
            className="h-11 w-auto object-contain"
          />
        </div>

        {/* Navigation Items */}
        <div className="flex-1 py-5 px-3 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Event Management
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                  isActive
                    ? 'bg-rose-50/80 text-rose-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-rose-600' : 'text-slate-400 group-hover:text-slate-700'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono tabular-nums ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Event Quick Info Banner */}
        <div className="p-4 m-3 bg-gradient-to-br from-rose-50 to-slate-50 rounded-xl border border-rose-100 space-y-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-rose-600" />
            <span className="text-xs font-semibold text-slate-900">Event Dates</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-tight">
            Nov 20–22, 2026 · Al Rayyan Equestrian Grounds
          </p>
          <div className="pt-1 flex items-center justify-between text-[11px] text-rose-700 font-medium">
            <span>Gate Open: 14:00</span>
            <span className="font-mono tabular-nums text-slate-500">Day 1 of 3</span>
          </div>
        </div>

        {/* PWA Scanner Integration Button */}
        <div className="px-3 pb-1">
          <button
            type="button"
            onClick={() => {
              setPwaModalOpen(true);
              setIsOpenMobile(false);
            }}
            className="w-full flex items-center justify-between px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors shadow-2xs cursor-pointer border border-slate-700"
          >
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <Smartphone className="w-3.5 h-3.5 text-rose-300" />
              <span>PWA Scanner API</span>
            </div>
            <span className="text-[10px] text-slate-400">Docs & Test</span>
          </button>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span className="text-[11px]">System v2.4 (Prototype)</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500" title="System operational" />
        </div>
      </aside>
    </>
  );
};
