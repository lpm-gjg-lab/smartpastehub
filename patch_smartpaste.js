const fs = require('fs');

let content = fs.readFileSync('src/renderer/pages/SmartPastePage.tsx', 'utf8');

const importTarget = "import { getTransformLabels } from '../lib/transform-labels';";
const newImports = importTarget + "\nimport { Button } from '../components/Button';";

content = content.replace(importTarget, newImports);

const openWindowFn = `
  const openFloatingWindow = async (route: string, title: string, width = 440, height = 600) => {
    try {
      await invokeIPC('window:open', { route, width, height });
    } catch (e) {
      addToast({ title: \`Failed to open \${title}\`, type: 'error' });
    }
  };
`;

content = content.replace("export const SmartPastePage: React.FC = () => {", "export const SmartPastePage: React.FC = () => {" + openWindowFn);

const quickToolsUI = `
      <div className={styles.quickTools} style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '1.5rem', flexWrap: 'wrap' }}>
        <Button variant="secondary" size="sm" onClick={() => openFloatingWindow('/paste-history-ring', 'History Ring', 400, 500)}>
          ⏱️ History Ring
        </Button>
        <Button variant="secondary" size="sm" onClick={() => openFloatingWindow('/template-form', 'Template Form', 500, 600)}>
          📝 Templates
        </Button>
        <Button variant="secondary" size="sm" onClick={() => openFloatingWindow('/qr-bridge', 'QR Bridge', 350, 450)}>
          📱 QR Bridge
        </Button>
        <Button variant="secondary" size="sm" onClick={() => openFloatingWindow('/drag-drop-zone', 'Drop Zone', 300, 400)}>
          📥 Drop Zone
        </Button>
        <Button variant="secondary" size="sm" onClick={() => openFloatingWindow('/auto-chart', 'Auto Chart', 600, 500)}>
          📊 Auto Chart
        </Button>
        <Button variant="secondary" size="sm" onClick={() => openFloatingWindow('/web-clipper', 'Web Clipper', 400, 600)}>
          🌐 Web Clipper
        </Button>
      </div>
`;

content = content.replace("        />\n      </div>", "        />\n" + quickToolsUI + "\n      </div>");

fs.writeFileSync('src/renderer/pages/SmartPastePage.tsx', content);
