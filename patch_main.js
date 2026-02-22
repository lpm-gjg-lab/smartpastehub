const fs = require('fs');

const content = `import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/globals.css';

import AutoChart from './windows/AutoChart';
import WebClipper from './windows/WebClipper';
import QRBridge from './windows/QRBridge';
import DragDropZone from './windows/DragDropZone';
import PasteHistoryRing from './windows/PasteHistoryRing';
import TemplateForm from './windows/TemplateForm';

const root = document.getElementById('root');
if (root) {
  const hash = window.location.hash.replace('#', '');
  
  let Component: any = App;
  if (hash.startsWith('/auto-chart')) Component = AutoChart;
  else if (hash.startsWith('/web-clipper')) Component = WebClipper;
  else if (hash.startsWith('/qr-bridge')) Component = QRBridge;
  else if (hash.startsWith('/drag-drop-zone')) Component = DragDropZone;
  else if (hash.startsWith('/paste-history-ring')) Component = PasteHistoryRing;
  else if (hash.startsWith('/template-form')) Component = TemplateForm;

  createRoot(root).render(<Component />);
}
`;

fs.writeFileSync('src/renderer/main.tsx', content);
