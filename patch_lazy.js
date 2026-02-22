const fs = require('fs');

let appContent = fs.readFileSync('src/renderer/App.tsx', 'utf8');

const importsTarget = `import { SmartPastePage } from './pages/SmartPastePage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { SnippetsPage, TemplatesPage, AISettingsPage, SyncPage, PluginsPage } from './pages/Placeholders';`;

const lazyImports = `import React, { Suspense } from 'react';
const SmartPastePage = React.lazy(() => import('./pages/SmartPastePage').then(module => ({ default: module.SmartPastePage })));
const HistoryPage = React.lazy(() => import('./pages/HistoryPage').then(module => ({ default: module.HistoryPage })));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage').then(module => ({ default: module.SettingsPage })));
const SnippetsPage = React.lazy(() => import('./pages/Placeholders').then(module => ({ default: module.SnippetsPage })));
const TemplatesPage = React.lazy(() => import('./pages/Placeholders').then(module => ({ default: module.TemplatesPage })));
const AISettingsPage = React.lazy(() => import('./pages/Placeholders').then(module => ({ default: module.AISettingsPage })));
const SyncPage = React.lazy(() => import('./pages/Placeholders').then(module => ({ default: module.SyncPage })));
const PluginsPage = React.lazy(() => import('./pages/Placeholders').then(module => ({ default: module.PluginsPage })));`;

appContent = appContent.replace(importsTarget, lazyImports);
appContent = appContent.replace("import React, { useEffect, useState } from 'react';", "import { useEffect, useState } from 'react';");

const routesTarget = `{activeTab === 'paste' && <SmartPastePage />}
        {activeTab === 'history' && <HistoryPage />}
        {activeTab === 'snippets' && <SnippetsPage />}
        {activeTab === 'templates' && <TemplatesPage />}
        {activeTab === 'ai' && <AISettingsPage />}
        {activeTab === 'sync' && <SyncPage />}
        {activeTab === 'plugins' && <PluginsPage />}
        {activeTab === 'settings' && <SettingsPage />}`;

const wrappedRoutes = `<Suspense fallback={<div style={{padding: '2rem', color: 'var(--text-secondary)'}}>Loading...</div>}>
          ${routesTarget}
        </Suspense>`;

appContent = appContent.replace(routesTarget, wrappedRoutes);

fs.writeFileSync('src/renderer/App.tsx', appContent);
