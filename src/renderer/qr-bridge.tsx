import './theme-init';
import React from 'react';
import { createRoot } from 'react-dom/client';
import QRBridge from './windows/QRBridge';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(React.createElement(QRBridge));
}
