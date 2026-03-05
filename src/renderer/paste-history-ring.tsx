import './theme-init';
import React from 'react';
import { createRoot } from 'react-dom/client';
import PasteHistoryRing from './windows/PasteHistoryRing';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(React.createElement(PasteHistoryRing));
}
