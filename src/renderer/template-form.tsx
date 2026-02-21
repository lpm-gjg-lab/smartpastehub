import React from 'react';
import { createRoot } from 'react-dom/client';
import TemplateForm from './windows/TemplateForm';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(React.createElement(TemplateForm));
}
