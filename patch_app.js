const fs = require('fs');
let appContent = fs.readFileSync('src/renderer/App.tsx', 'utf8');

const imports = `import { SmartPastePage } from './pages/SmartPastePage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { SnippetsPage, TemplatesPage, AISettingsPage, SyncPage, PluginsPage } from './pages/Placeholders';`;

appContent = appContent.replace(
  "import { SmartPastePage } from './pages/SmartPastePage';\nimport { HistoryPage } from './pages/HistoryPage';\nimport { SettingsPage } from './pages/SettingsPage';",
  imports
);

const routes = `{activeTab === 'paste' && <SmartPastePage />}
        {activeTab === 'history' && <HistoryPage />}
        {activeTab === 'snippets' && <SnippetsPage />}
        {activeTab === 'templates' && <TemplatesPage />}
        {activeTab === 'ai' && <AISettingsPage />}
        {activeTab === 'sync' && <SyncPage />}
        {activeTab === 'plugins' && <PluginsPage />}
        {activeTab === 'settings' && <SettingsPage />}`;

appContent = appContent.replace(
  "{activeTab === 'paste' && <SmartPastePage />}\n        {activeTab === 'history' && <HistoryPage />}\n        {activeTab === 'settings' && <SettingsPage />}",
  routes
);

fs.writeFileSync('src/renderer/App.tsx', appContent);
