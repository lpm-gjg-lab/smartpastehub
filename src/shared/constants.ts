export const DEFAULT_SETTINGS = {
  general: {
    startOnBoot: true,
    minimizeToTray: true,
    language: 'id',
    theme: 'system',
  },
  hotkeys: {
    pasteClean: 'CmdOrCtrl+Alt+V',
    ocrCapture: 'CmdOrCtrl+Alt+S',
    multiCopy: 'CmdOrCtrl+Alt+C',
    queueToggle: 'CmdOrCtrl+Alt+Q',
    historyOpen: 'CmdOrCtrl+Alt+H',
  },
  presets: {
    active: 'keepStructure',
    custom: [],
  },
  security: {
    detectSensitive: true,
    autoClear: false,
    clearTimerSeconds: 30,
    maskMode: 'partial',
  },
  history: {
    enabled: true,
    maxItems: 100,
    retentionDays: 30,
  },
  ai: {
    enabled: false,
    provider: 'local',
    autoDetect: true,
  },
  ocr: {
    languages: ['ind', 'eng'],
    autoClean: true,
  },
  sync: {
    enabled: false,
    deviceId: '',
    pairedDevices: [],
  },
  license: {
    tier: 'free',
  },
} as const;
