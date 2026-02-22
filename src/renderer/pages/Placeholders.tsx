import React from "react";

const placeholderStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
  color: "var(--text-secondary)",
  padding: "var(--space-xl)",
  textAlign: "center",
  gap: "var(--space-md)",
};

export const SnippetsPage: React.FC = () => (
  <div style={placeholderStyle}>
    <div style={{ fontSize: "3rem", opacity: 0.5 }}>📌</div>
    <h2>Snippets (Coming Soon)</h2>
    <p>Manage your frequently used text snippets here.</p>
  </div>
);

export const TemplatesPage: React.FC = () => (
  <div style={placeholderStyle}>
    <div style={{ fontSize: "3rem", opacity: 0.5 }}>📝</div>
    <h2>Templates (Coming Soon)</h2>
    <p>Create and fill dynamic text templates.</p>
  </div>
);

export const AISettingsPage: React.FC = () => (
  <div style={placeholderStyle}>
    <div style={{ fontSize: "3rem", opacity: 0.5 }}>🤖</div>
    <h2>AI & OCR (Coming Soon)</h2>
    <p>Configure local AI rewriting and OCR capabilities.</p>
  </div>
);

export const SyncPage: React.FC = () => (
  <div style={placeholderStyle}>
    <div style={{ fontSize: "3rem", opacity: 0.5 }}>📱</div>
    <h2>Cross-Device Sync (Coming Soon)</h2>
    <p>Pair your mobile device and sync clipboard history securely.</p>
  </div>
);

export const PluginsPage: React.FC = () => (
  <div style={placeholderStyle}>
    <div style={{ fontSize: "3rem", opacity: 0.5 }}>🔌</div>
    <h2>Plugins (Coming Soon)</h2>
    <p>Extend Smart Paste Hub with community plugins.</p>
  </div>
);
