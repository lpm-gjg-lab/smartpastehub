const fs = require('fs');

let content = fs.readFileSync('src/main/ipc-handlers.ts', 'utf8');

const targetImports = 'import { fillTemplate, Template } from "../productivity/template-engine";';
const newImports = `import { fillTemplate, Template } from "../productivity/template-engine";
import { rewriteText, RewriteOptions } from "../ai/ai-rewriter";
import { recognizeText, OCROptions } from "../ocr/ocr-engine";`;

content = content.replace(targetImports, newImports);

const targetHandlers = '  safeHandle("window:open", async (_, { route, width, height }) => {';
const newHandlers = `  safeHandle("ai:rewrite", async (_, { text, options }) => {
    return rewriteText(text, options as RewriteOptions);
  });

  safeHandle("ocr:recognize", async (_, { image, options }) => {
    return recognizeText(image, options as OCROptions);
  });

  safeHandle("window:open", async (_, { route, width, height }) => {`;

content = content.replace(targetHandlers, newHandlers);

fs.writeFileSync('src/main/ipc-handlers.ts', content);
