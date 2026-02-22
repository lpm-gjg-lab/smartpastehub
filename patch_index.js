const fs = require('fs');

let content = fs.readFileSync('src/main/index.ts', 'utf8');

const floatingFn = `function createFloatingWindow(hashRoute: string, width = 440, height = 600) {
  const win = new BrowserWindow({
    width,
    height,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  
  if (process.env["NODE_ENV"] === "development") {
    win.loadURL(\`http://127.0.0.1:5173#\${hashRoute}\`);
  } else {
    win.loadURL(\`file://\${path.join(__dirname, "../../renderer/index.html")}#\${hashRoute}\`);
  }
  
  return win;
}

`;

content = content.replace('function createMainWindow()', floatingFn + 'function createMainWindow()');
content = content.replace('registerIpcHandlers(mainWindow, db);', 'registerIpcHandlers(mainWindow, db, createFloatingWindow);');

fs.writeFileSync('src/main/index.ts', content);
