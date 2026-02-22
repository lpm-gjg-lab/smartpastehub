const fs = require('fs');

let content = fs.readFileSync('src/main/index.ts', 'utf8');

const importTarget = 'import { logger } from "../shared/logger";';
const newImport = importTarget + `
// import { autoUpdater } from "electron-updater";`;

content = content.replace(importTarget, newImport);

const setupUpdater = `
function setupAutoUpdater() {
  // autoUpdater.logger = logger;
  // autoUpdater.checkForUpdatesAndNotify();
  logger.info('Auto-updater scaffold initialized');
}
`;

content = content.replace('function setupExtensionServer() {', setupUpdater + '\nfunction setupExtensionServer() {');

content = content.replace('setupExtensionServer();', 'setupExtensionServer();\n  setupAutoUpdater();');

fs.writeFileSync('src/main/index.ts', content);
