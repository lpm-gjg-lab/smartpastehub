const fs = require('fs');

let content = fs.readFileSync('src/main/ipc-handlers.ts', 'utf8');

const targetImports = 'import { recognizeText, OCROptions } from "../ocr/ocr-engine";';
const newImports = targetImports + `
import { enqueue, dequeue, peek, size, clearQueue } from "../productivity/paste-queue";
import { startCollecting, addItem, mergeAndPaste, clear as clearMulti, getMultiClipboard } from "../productivity/multi-clipboard";`;

content = content.replace(targetImports, newImports);

const targetHandlers = '  safeHandle("window:open", async (_, { route, width, height }) => {';
const newHandlers = `  // Productivity: Paste Queue
  safeHandle("queue:enqueue", async (_, { text }) => { enqueue(text); return true; });
  safeHandle("queue:dequeue", async () => dequeue());
  safeHandle("queue:peek", async () => peek());
  safeHandle("queue:size", async () => size());
  safeHandle("queue:clear", async () => { clearQueue(); return true; });

  // Productivity: Multi-Clipboard
  safeHandle("multi:start", async () => { startCollecting(); return true; });
  safeHandle("multi:add", async (_, { text }) => { addItem(text); return true; });
  safeHandle("multi:merge", async (_, { separator }) => mergeAndPaste(separator));
  safeHandle("multi:clear", async () => { clearMulti(); return true; });
  safeHandle("multi:state", async () => getMultiClipboard());

` + targetHandlers;

content = content.replace(targetHandlers, newHandlers);

fs.writeFileSync('src/main/ipc-handlers.ts', content);
