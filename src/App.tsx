/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { EventProvider, useEvent } from './context/EventContext';
import { GmailProvider } from './context/GmailContext';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { DashboardPage } from './components/pages/DashboardPage';
import { RegistrationsPage } from './components/pages/RegistrationsPage';
import { TicketsPage } from './components/pages/TicketsPage';
import { CheckInPage } from './components/pages/CheckInPage';
import { AnalyticsPage } from './components/pages/AnalyticsPage';
import { SettingsPage } from './components/pages/SettingsPage';
import { PublicRegistrationPortal } from './components/pages/PublicRegistrationPortal';
import { RegistrationDetailModal } from './components/common/RegistrationDetailModal';
import { TicketPassModal } from './components/common/TicketPassModal';
import { SendEmailConfirmModal } from './components/modals/SendEmailConfirmModal';
import { PwaIntegrationModal } from './components/modals/PwaIntegrationModal';
import { ToastContainer } from './components/common/ToastContainer';

const AppContent: React.FC = () => {
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
          {currentTab === 'register' && <PublicRegistrationPortal />}
          {currentTab === 'analytics' && <AnalyticsPage />}
          {currentTab === 'settings' && <SettingsPage />}
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
  return (
    <GmailProvider>
      <EventProvider>
        <AppContent />
      </EventProvider>
    </GmailProvider>
  );
}
