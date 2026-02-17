import React from 'react';
import { createRoot } from 'react-dom/client';
import './popup.css';

function Popup() {
  return (
    <div className="popup">
      <div className="status">Connected to Desktop App</div>
      <div className="section">
        <strong>Active Preset</strong>
        <label><input type="radio" name="preset" defaultChecked /> Plain Text</label>
        <label><input type="radio" name="preset" /> Keep Structure</label>
      </div>
      <div className="section">
        <button>Paste Clean</button>
        <button>OCR Area</button>
      </div>
      <button className="link">Open Full Settings</button>
    </div>
  );
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<Popup />);
}
