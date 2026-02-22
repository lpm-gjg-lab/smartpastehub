const fs = require('fs');
const content = fs.readFileSync('src/renderer/types/index.ts', 'utf8');
const replaced = content.replace(
  "export type AppTab = 'paste' | 'history' | 'settings';",
  "export type AppTab = 'paste' | 'history' | 'snippets' | 'templates' | 'ai' | 'sync' | 'plugins' | 'settings';"
);
fs.writeFileSync('src/renderer/types/index.ts', replaced);
