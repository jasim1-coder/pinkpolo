import React, { useState, useEffect } from 'react';
import { EventProvider, useEvent } from './context/EventContext';
import { GmailProvider } from './context/GmailContext';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { DashboardPage } from './components/pages/DashboardPage';
import { RegistrationsPage } from './components/pages/RegistrationsPage';
import { TicketsPage } from './components/pages/TicketsPage';
import { CheckInPage } from './components/pages/CheckInPage';
import { AnalyticsPage } from './components/pages/AnalyticsPage';
import { PublicRegistrationPortal } from './components/pages/PublicRegistrationPortal';
import { RegistrationDetailModal } from './components/common/RegistrationDetailModal';
import { TicketPassModal } from './components/common/TicketPassModal';
import { SendEmailConfirmModal } from './components/modals/SendEmailConfirmModal';
import { PwaIntegrationModal } from './components/modals/PwaIntegrationModal';
import { ToastContainer } from './components/common/ToastContainer';
import { Shield, Sparkles, Heart } from 'lucide-react';

/**
 * Isolated Standalone Public Portal Layout
 * Rendered when visitors open /register or /public
 * Completely isolated from admin controls, sidebar, and attendee database.
 */
const PublicPortalLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-rose-500 selection:text-white">
      {/* Top Luxury Branding Header */}
      <header className="w-full border-b border-rose-900/30 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-400 flex items-center justify-center font-serif font-black text-white text-lg shadow-md shadow-rose-900/40">
              P
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-white tracking-wide text-base">
                  PINK POLO 2026
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Official Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                15th Annual Charity Polo Gala • Al Rayyan Grounds, Doha
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-4 text-xs text-slate-300">
            <div className="flex items-center gap-1.5 text-rose-400 font-medium">
              <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
              <span>Breast Cancer Awareness Gala</span>
            </div>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">Nov 20–22, 2026</span>
          </div>
        </div>
      </header>

      {/* Main Registration Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8 flex flex-col justify-center">
        <PublicRegistrationPortal isStandalonePublic={true} />
      </main>

      {/* Clean Public Footer */}
      <footer className="w-full border-t border-slate-900 bg-slate-950/90 py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            © 2026 Pink Polo Official Organization. All rights reserved.
          </span>
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState({}, '', '/');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="text-slate-500 hover:text-rose-400 text-[11px] transition-colors flex items-center gap-1"
          >
            <Shield className="w-3 h-3" />
            <span>Committee / Staff Login</span>
          </a>
        </div>
      </footer>

      <ToastContainer />
    </div>
  );
};

/**
 * Main Admin Portal Shell
 * Used by event organizers and gate staff.
 */
const AdminAppContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleGlobalSearch = (query: string) => {
    if (query.trim().length > 0 && currentTab !== 'registrations' && currentTab !== 'tickets') {
      setCurrentTab('registrations');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans antialiased text-slate-900">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isOpenMobile={isMobileSidebarOpen}
        setIsOpenMobile={setIsMobileSidebarOpen}
      />

      {/* Main Viewport Container */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Header */}
        <TopBar
          currentTab={currentTab}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onSearchGlobal={handleGlobalSearch}
          setCurrentTab={setCurrentTab}
        />

        {/* Content Body */}
        <main
          className={`flex-1 w-full mx-auto ${
            currentTab === 'register'
              ? 'p-2 sm:p-4 lg:px-6 lg:py-4 max-w-7xl lg:h-[calc(100vh-4rem)] flex flex-col justify-start'
              : 'p-4 lg:p-8 max-w-7xl pb-16'
          }`}
        >
          {currentTab === 'dashboard' && <DashboardPage setCurrentTab={setCurrentTab} />}
          {currentTab === 'registrations' && (
            <RegistrationsPage onOpenRegisterForm={() => setCurrentTab('register')} />
          )}
          {currentTab === 'tickets' && <TicketsPage />}
          {currentTab === 'checkin' && <CheckInPage />}
          {currentTab === 'register' && <PublicRegistrationPortal isStandalonePublic={false} />}
          {currentTab === 'analytics' && <AnalyticsPage />}
        </main>
      </div>

      {/* Global Interactive Modals & Toasts */}
      <RegistrationDetailModal />
      <TicketPassModal />
      <SendEmailConfirmModal />
      <PwaIntegrationModal />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [search, setSearch] = useState(() => window.location.search);

  useEffect(() => {
    const handleLocationChange = () => {
      setPathname(window.location.pathname);
      setSearch(window.location.search);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const isPublicRoute =
    pathname.startsWith('/register') ||
    pathname.startsWith('/public') ||
    search.includes('view=register') ||
    search.includes('mode=public');

  return (
    <GmailProvider>
      <EventProvider>
        {isPublicRoute ? <PublicPortalLayout /> : <AdminAppContent />}
      </EventProvider>
    </GmailProvider>
  );
}

