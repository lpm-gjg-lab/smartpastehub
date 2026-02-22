import { useEffect, useState } from 'react';
import './styles/globals.css';
import { Onboarding } from './components/Onboarding';
import { AppLayout } from './components/AppLayout';
import { AppSidebar } from './components/AppSidebar';
import { SmartPastePage } from './pages/SmartPastePage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { ToastContainer } from './components/Toast';
import { useToastStore } from './stores/useToastStore';
import { onIPC } from './lib/ipc';
import type { AppTab } from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('paste');
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('onboarded'));
  const { addToast } = useToastStore();

  // Keyboard navigation for tabs
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '1') {
          e.preventDefault();
          setActiveTab('paste');
        } else if (e.key === '2') {
          e.preventDefault();
          setActiveTab('history');
        } else if (e.key === '3') {
          e.preventDefault();
          setActiveTab('settings');
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Global IPC Listeners (must be preserved)
  useEffect(() => {
    const unsubSecurity = onIPC('security:alert', (payload: any) => {
      addToast({
        title: 'Sensitive Data Detected',
        message: 'Your clipboard content contains sensitive information.',
        type: 'warning',
        duration: 8000
      });
    });

    const unsubRecovery = onIPC('recovery:restored', () => {
      addToast({
        title: 'Session Restored',
        message: 'Recovered from unexpected shutdown',
        type: 'info'
      });
    });

    return () => {
      unsubSecurity();
      unsubRecovery();
    };
  }, [addToast]);

  return (
    <>
      <div id="sr-announcer" className="sr-only" aria-live="polite"></div>
      <AppLayout 
        sidebar={
          <AppSidebar 
            activeTab={activeTab} 
            onTabChange={setActiveTab} 
          />
        }
      >
        {activeTab === 'paste' && <SmartPastePage />}
        {activeTab === 'history' && <HistoryPage />}
        {activeTab === 'settings' && <SettingsPage />}
      </AppLayout>
      <ToastContainer />
    </>
  );
};

export default App;
