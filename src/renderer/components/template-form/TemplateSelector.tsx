import React from 'react';
import { Template } from '../../hooks/template/useTemplates';

interface Props {
  templates: Template[];
  selectedId: string;
  onSelect: (id: string) => void;
  newName: string;
  setNewName: (name: string) => void;
}

export function TemplateSelector({ templates, selectedId, onSelect, newName, setNewName }: Props) {
  return (
    <>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <select
          value={selectedId}
          onChange={(e) => onSelect(e.target.value)}
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.06)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: 12,
            outline: 'none',
          }}
        >
          <option value="">-- Custom Template --</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button
          onClick={() => {
            onSelect('');
            setNewName('');
          }}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            color: '#fff',
            borderRadius: 6,
            padding: '6px 10px',
            cursor: 'pointer',
            fontSize: 11,
          }}
        >
          New
        </button>
      </div>
      <input
        type="text"
        placeholder="Template Name (to save)"
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        style={{
          background: 'rgba(0,0,0,0.2)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#fff',
          padding: '6px 10px',
          borderRadius: 6,
          fontSize: 12,
          outline: 'none',
        }}
      />
    </>
  );
}
