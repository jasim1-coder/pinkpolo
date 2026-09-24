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
    <div className="min-h-screen bg-[#FAF9F6] text-stone-900 flex flex-col justify-center items-center font-sans antialiased selection:bg-rose-200 selection:text-rose-900 p-3 sm:p-6 lg:p-8 py-6 sm:py-10">
      {/* Main Registration Content Container */}
      <main className="w-full max-w-6xl my-auto">
        <PublicRegistrationPortal isStandalonePublic={true} />
      </main>

      {/* Subtle Minimal Footer */}
      <footer className="w-full max-w-6xl mt-6 px-2 text-center text-xs text-stone-400 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span className="text-[11px] sm:text-xs">
          © 2026 Ghantoot Racing & Polo Club · Pink Polo Gala
        </span>
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            window.history.pushState({}, '', '/');
            window.dispatchEvent(new PopStateEvent('popstate'));
          }}
          className="text-stone-400 hover:text-rose-600 text-[11px] sm:text-xs transition-colors flex items-center gap-1 hover:underline"
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Staff Login</span>
        </a>
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
          {currentTab === 'checkin' && <AnalyticsPage />}
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

