import React, { useState, useEffect, useCallback } from 'react';

interface TemplateField {
  name: string;
  type: 'system' | 'user';
  defaultValue?: string;
}

interface Template {
  id: string;
  name: string;
  content: string;
}

declare global {
  interface Window {
    electronAPI?: {
      invoke: (channel: string, payload?: unknown) => Promise<unknown>;
    };
  }
}

export default function TemplateForm() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [rawContent, setRawContent] = useState('');
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [userValues, setUserValues] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState('');
  const [newName, setNewName] = useState('');
  const [copied, setCopied] = useState(false);

  const loadTemplates = useCallback(async () => {
    const res = (await window.electronAPI?.invoke(
      'template:list-templates',
    )) as { data: Template[] } | undefined;
    setTemplates(res?.data ?? []);
  }, []);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  // When content changes, re-parse fields
  useEffect(() => {
    if (!rawContent) {
      setFields([]);
      return;
    }
    void (async () => {
      const res = (await window.electronAPI?.invoke(
        'template:get-fields',
        rawContent,
      )) as { data: TemplateField[] } | undefined;
      const f = res?.data ?? [];
      setFields(f);
      // Reset user values that no longer appear
      setUserValues((prev) => {
        const next: Record<string, string> = {};
        for (const field of f) {
          if (field.type === 'user') {
            next[field.name] = prev[field.name] ?? '';
          }
        }
        return next;
      });
    })();
  }, [rawContent]);

  // Re-build preview whenever content or user values change
  useEffect(() => {
    if (!rawContent) {
      setPreview('');
      return;
    }
    void (async () => {
      const res = (await window.electronAPI?.invoke('template:fill', {
        content: rawContent,
        values: userValues,
        context: {},
      })) as { data: string } | undefined;
      setPreview(res?.data ?? '');
    })();
  }, [rawContent, userValues]);

  const handleSelectTemplate = (id: string) => {
    setSelectedId(id);
    const tmpl = templates.find((t) => t.id === id);
    if (tmpl) {
      setRawContent(tmpl.content);
      setNewName(tmpl.name);
    }
  };

  const handleFillAndCopy = async () => {
    await navigator.clipboard.writeText(preview);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSave = async () => {
    if (!newName || !rawContent) return;
    await window.electronAPI?.invoke('template:save-template', {
      id: selectedId || undefined,
      name: newName,
      content: rawContent,
    });
    void loadTemplates();
  };

  const userFields = fields.filter((f) => f.type === 'user');
  const systemFields = fields.filter((f) => f.type === 'system');

  return (
    <div
      style={{
        width: 440,
        height: 520,
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(15,15,25,0.96)',
        backdropFilter: 'blur(16px)',
        fontFamily: 'system-ui, sans-serif',
        color: '#e0e0ef',
        overflow: 'hidden',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          fontWeight: 600,
          fontSize: 13,
        }}
      >
        📝 Template Form
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {/* Template selector */}
        {templates.length > 0 && (
          <div>
            <label style={{ fontSize: 11, opacity: 0.6 }}>Load template</label>
            <select
              value={selectedId}
              onChange={(e) => handleSelectTemplate(e.target.value)}
              style={{
                display: 'block',
                width: '100%',
                marginTop: 4,
                padding: '5px 8px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 6,
                color: '#e0e0ef',
                fontSize: 12,
              }}
            >
              <option value="">— select —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Template content editor */}
        <div>
          <label style={{ fontSize: 11, opacity: 0.6 }}>Template content</label>
          <textarea
            value={rawContent}
            onChange={(e) => setRawContent(e.target.value)}
            placeholder="e.g. Hello {name}, today is {date}. Code: {random:8}"
            rows={4}
            style={{
              display: 'block',
              width: '100%',
              marginTop: 4,
              padding: '6px 8px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 6,
              color: '#e0e0ef',
              fontSize: 12,
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* System var chips */}
        {systemFields.length > 0 && (
          <div>
            <label style={{ fontSize: 11, opacity: 0.6 }}>
              System variables (auto-filled)
            </label>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                marginTop: 4,
              }}
            >
              {systemFields.map((f) => (
                <span
                  key={f.name}
                  style={{
                    padding: '2px 8px',
                    borderRadius: 12,
                    background: 'rgba(100,180,100,0.2)',
                    border: '1px solid rgba(100,180,100,0.4)',
                    fontSize: 11,
                    color: '#86efac',
                  }}
                >
                  {'{'}
                  {f.name}
                  {'}'}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* User var inputs */}
        {userFields.length > 0 && (
          <div>
            <label style={{ fontSize: 11, opacity: 0.6 }}>
              Fill in variables
            </label>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                marginTop: 4,
              }}
            >
              {userFields.map((f) => (
                <div
                  key={f.name}
                  style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      width: 100,
                      flexShrink: 0,
                      color: '#a5b4fc',
                      fontFamily: 'monospace',
                    }}
                  >
                    {'{'}
                    {f.name}
                    {'}'}
                  </span>
                  <input
                    value={userValues[f.name] ?? ''}
                    onChange={(e) =>
                      setUserValues((prev) => ({
                        ...prev,
                        [f.name]: e.target.value,
                      }))
                    }
                    placeholder={f.defaultValue ?? f.name}
                    style={{
                      flex: 1,
                      padding: '4px 8px',
                      background: 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 5,
                      color: '#e0e0ef',
                      fontSize: 12,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div>
            <label style={{ fontSize: 11, opacity: 0.6 }}>Preview</label>
            <div
              style={{
                marginTop: 4,
                padding: '6px 8px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 6,
                fontSize: 12,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: 80,
                overflowY: 'auto',
              }}
            >
              {preview}
            </div>
          </div>
        )}

        {/* Save name */}
        <div>
          <label style={{ fontSize: 11, opacity: 0.6 }}>
            Template name (to save)
          </label>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Email greeting"
            style={{
              display: 'block',
              width: '100%',
              marginTop: 4,
              padding: '5px 8px',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 6,
              color: '#e0e0ef',
              fontSize: 12,
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Action bar */}
      <div
        style={{
          padding: '8px 12px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          gap: 8,
        }}
      >
        <button
          onClick={() => void handleFillAndCopy()}
          disabled={!preview}
          style={{
            flex: 2,
            padding: '7px 0',
            borderRadius: 6,
            border: 'none',
            cursor: preview ? 'pointer' : 'not-allowed',
            fontSize: 12,
            fontWeight: 600,
            background: copied
              ? 'rgba(100,200,100,0.7)'
              : 'rgba(100,120,255,0.8)',
            color: '#fff',
            transition: 'background 0.2s',
          }}
        >
          {copied ? '✓ Copied!' : 'Fill & Copy'}
        </button>
        <button
          onClick={() => void handleSave()}
          disabled={!newName || !rawContent}
          style={{
            flex: 1,
            padding: '7px 0',
            borderRadius: 6,
            border: 'none',
            cursor: newName && rawContent ? 'pointer' : 'not-allowed',
            fontSize: 12,
            background: 'rgba(255,255,255,0.08)',
            color: '#fff',
          }}
        >
          Save
        </button>
      </div>
    </div>
  );
}
