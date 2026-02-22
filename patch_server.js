const fs = require('fs');

let content = fs.readFileSync('src/main/index.ts', 'utf8');

const importTarget = 'import { logger } from "../shared/logger";';
const newImport = importTarget + `\nimport net from "net";`;

content = content.replace(importTarget, newImport);

const setupServer = `
function setupExtensionServer() {
  const SOCKET_PATH = process.platform === 'win32' 
    ? '\\\\.\\pipe\\smartpastehub-ext' 
    : '/tmp/smartpastehub-ext.sock';

  const server = net.createServer((stream) => {
    stream.on('data', async (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'clean_paste') {
          const result = await cleanContent({ text: msg.text });
          stream.write(JSON.stringify({ type: 'clean_paste_result', text: result.cleaned }));
        }
      } catch (e) {
        logger.error('Ext Server Error', { error: e });
      }
    });
  });

  server.listen(SOCKET_PATH, () => {
    logger.info('Extension IPC server listening');
  });
  
  // Clean up socket file on unix
  if (process.platform !== 'win32') {
    app.on('will-quit', () => {
      if (fs.existsSync(SOCKET_PATH)) fs.unlinkSync(SOCKET_PATH);
    });
  }
}
`;

content = content.replace('async function initializeApp() {', setupServer + '\nasync function initializeApp() {');
content = content.replace('wireClipboardWatcher(mainWindow);', 'wireClipboardWatcher(mainWindow);\n  setupExtensionServer();');

fs.writeFileSync('src/main/index.ts', content);
