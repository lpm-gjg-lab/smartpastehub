import './theme-init';
import React from 'react';
import { createRoot } from 'react-dom/client';
import WebClipper from './windows/WebClipper';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(React.createElement(WebClipper));
}
