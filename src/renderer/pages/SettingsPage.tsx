import React, { useEffect, useState } from 'react';
import styles from '../styles/pages/SettingsPage.module.css';
import { invokeIPC } from '../lib/ipc';
import { Button } from '../components/Button';
import { useToastStore } from '../stores/useToastStore';
import type { AppSettings } from '../../shared/types';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToastStore();

  const loadSettings = async () => {
    try {
      const data = await invokeIPC<AppSettings>('settings:get');
      setSettings(data);
      
      // Update DOM theme if needed
      if (data?.general?.theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    
    } catch (err) {
      console.error('Failed to load settings', err);
      // Fallback for tests
      setSettings({
        general: { theme: 'dark', startOnBoot: false, minimizeToTray: false, language: 'en' },
        hotkeys: { pasteClean: 'Ctrl+Shift+V', ocrCapture: '', multiCopy: '', queueToggle: '', historyOpen: '', clipboardSearch: '', historyRing: '', dropZone: '', qrBridge: '' },
        security: { autoClear: false, detectSensitive: false, clearTimerSeconds: 0, maskMode: 'skip', autoMask: false },
        history: { enabled: true, maxItems: 100, retentionDays: 7 },
        ai: { enabled: false, provider: 'local', autoDetect: false },
        ocr: { languages: [], autoClean: false, engine: 'auto' },
        sync: { enabled: false, deviceId: '', pairedDevices: [] },
        plugins: {},
        automation: {},
        license: { tier: 'free' },
        presets: { active: 'default', custom: [] },
        transforms: {
          enableMojibakeRepair: true,
          enableRTLHandling: true,
          enableEmojiCompat: true,
          enableHomoglyphDetection: true,
          enableBankFormatter: true,
          enableResiDetector: true,
          enableEcommerceExtractor: true,
          enablePolicyEngine: false
        }
      } as any);
    } finally {

      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const updateSetting = async (path: string, value: any) => {
    try {
      // Create nested object based on path (e.g. 'general.theme')
      const parts = path.split('.');
      const updatePayload: Record<string, any> = {};
      let current = updatePayload;
      
      for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i] as string;
        current[key] = {};
        current = current[key];
      }
      const finalKey = parts[parts.length - 1] as string;
      current[finalKey] = value;

      // Optimistic UI update
      const newSettings = JSON.parse(JSON.stringify(settings));
      let target = newSettings;
      for (let i = 0; i < parts.length - 1; i++) {
        const tkey = parts[i] as string;
        if (!target[tkey]) target[tkey] = {};
        target = target[tkey];
      }
      target[finalKey] = value;
      setSettings(newSettings);

      // Handle theme change immediately
      if (path === 'general.theme') {
        if (value === 'light') document.documentElement.setAttribute('data-theme', 'light');
        else document.documentElement.removeAttribute('data-theme');
      }

      await invokeIPC('settings:update', updatePayload);
      
      addToast({
        title: 'Settings Saved',
        type: 'success',
        duration: 2000
      });
    } catch (err) {
      addToast({
        title: 'Failed to save',
        message: String(err),
        type: 'error'
      });
      loadSettings(); // revert
    }
  };

  if (loading || !settings) return <div className={styles.page}><div className={styles.loading}>Loading...</div></div>;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Settings</h1>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>General</h2>
        
        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>Auto-clean on copy</h3>
            <p>Automatically clean text when you copy it to clipboard</p>
          </div>
          <label className={styles.toggle}>
            <input 
              type="checkbox" 
              checked={settings.security?.autoClear || false}
              onChange={(e) => updateSetting('security.autoClear', e.target.checked)}
            />
            <span className={styles.slider}></span>
          </label>
        </div>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>Theme</h3>
            <p>Choose your preferred interface appearance</p>
          </div>
          <div className={styles.buttonGroup}>
            <Button 
              variant={settings.general?.theme === 'dark' ? 'primary' : 'secondary'} 
              size="sm"
              onClick={() => updateSetting('general.theme', 'dark')}
            >
              Dark
            </Button>
            <Button 
              variant={settings.general?.theme === 'light' ? 'primary' : 'secondary'} 
              size="sm"
              onClick={() => updateSetting('general.theme', 'light')}
            >
              Light
            </Button>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Hotkeys</h2>
        
        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>Smart Paste Shortcut</h3>
            <p>Global shortcut to paste cleaned content</p>
          </div>
          <div className={styles.hotkeyInput}>
            <input 
              type="text" 
              value={settings.hotkeys?.pasteClean || 'Ctrl+Shift+V'}
              readOnly // To make this fully functional requires a hotkey recorder, read-only for MVP
              className={styles.input}
              onKeyDown={(e) => {
                e.preventDefault();
                // Simple recorder MVP
                if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;
                
                const modifiers = [];
                if (e.ctrlKey) modifiers.push('Ctrl');
                if (e.altKey) modifiers.push('Alt');
                if (e.shiftKey) modifiers.push('Shift');
                if (e.metaKey) modifiers.push('Command');
                
                const key = e.key.toUpperCase();
                const hotkey = [...modifiers, key].join('+');
                updateSetting('hotkeys.pasteClean', hotkey);
              }}
            />
            <span className={styles.hint}>Click and press keys</span>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>About</h2>
        <div className={styles.aboutCard}>
          <div className={styles.logo}>📋✨</div>
          <div className={styles.aboutInfo}>
            <h3>SmartPasteHub</h3>
            <p>Your intelligent clipboard assistant.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
