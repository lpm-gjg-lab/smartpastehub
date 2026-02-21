import React from 'react';
import { createRoot } from 'react-dom/client';
import DragDropZone from './windows/DragDropZone';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(React.createElement(DragDropZone));
}
