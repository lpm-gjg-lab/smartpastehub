const fs = require('fs');

let content = fs.readFileSync('src/main/ipc-handlers.ts', 'utf8');

const target = 'export function registerIpcHandlers(mainWindow: BrowserWindow, db: Database) {';
const replacement = `export function registerIpcHandlers(
  mainWindow: BrowserWindow, 
  db: Database,
  createFloatingWindow: (route: string, width?: number, height?: number) => BrowserWindow
) {`;

content = content.replace(target, replacement);

const targetEnd = '  safeHandle("clipboard:detect", async (_, { text, html }) => {\n    return detectContentType(text as string, html as string | undefined) as {\n      type: ContentType;\n    };\n  });\n}';
const replacementEnd = `  safeHandle("clipboard:detect", async (_, { text, html }) => {
    return detectContentType(text as string, html as string | undefined) as {
      type: ContentType;
    };
  });

  safeHandle("window:open", async (_, { route, width, height }) => {
    createFloatingWindow(route, width, height);
    return true;
  });
}`;

content = content.replace(targetEnd, replacementEnd);

fs.writeFileSync('src/main/ipc-handlers.ts', content);
