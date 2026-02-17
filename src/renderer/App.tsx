import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { SettingsPage } from './pages/SettingsPage';
import { HistoryPage } from './pages/HistoryPage';
import { SnippetsPage } from './pages/SnippetsPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { AIOCRPage } from './pages/AIOCRPage';
import { SyncPage } from './pages/SyncPage';
import { PluginsPage } from './pages/PluginsPage';
import { ToastContainer } from './components/Toast';
import { useToastStore } from './stores/useToastStore';
import { onIPC } from './lib/ipc';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { addToast } = useToastStore();

  React.useEffect(() => {
    onIPC('clipboard:cleaned', (payload) => {
      const cleaned = (payload as { cleaned?: string }).cleaned ?? '';
      addToast({
        title: 'Text cleaned and ready',
        message: `${cleaned.length} characters`,
        type: 'success',
      });
    });
    onIPC('security:alert', (payload) => {
      const matches = (payload as { matches?: unknown[] }).matches ?? [];
      addToast({
        title: 'Sensitive data detected',
        message: `${matches.length} match(es) found`,
        type: 'warning',
      });
    });
  }, [addToast]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage />;
      case 'settings':
        return <SettingsPage />;
      case 'history':
        return <HistoryPage />;
      case 'snippets':
        return <SnippetsPage />;
      case 'templates':
        return <TemplatesPage />;
      case 'ai':
        return <AIOCRPage />;
      case 'sync':
        return <SyncPage />;
      case 'plugins':
        return <PluginsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <>
      <Layout activeTab={activeTab} onTabChange={setActiveTab}>
        {renderContent()}
      </Layout>
      <ToastContainer />
      <div
        id="sr-announcer"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
    </>
  );
}
