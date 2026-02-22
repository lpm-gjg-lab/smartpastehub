const fs = require('fs');

let content = fs.readFileSync('src/sync/sync-manager.ts', 'utf8');
content = content.replace(
  "const msg = createRelayMessage('clipboard', localDeviceId, encrypted, Date.now().toString());",
  "const msg = createRelayMessage('clipboard', localDeviceId, JSON.stringify(encrypted), Date.now().toString());"
);

fs.writeFileSync('src/sync/sync-manager.ts', content);
