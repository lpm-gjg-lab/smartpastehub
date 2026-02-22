import React from 'react';
import { TemplateField } from '../../hooks/template/useTemplateFields';

interface Props {
  fields: TemplateField[];
  userValues: Record<string, string>;
  setUserValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export function FieldInputs({ fields, userValues, setUserValues }: Props) {
  const systemFields = fields.filter((f) => f.type === 'system');
  const customFields = fields.filter((f) => f.type === 'user');

  if (fields.length === 0) return null;

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        padding: 10,
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ fontSize: 11, opacity: 0.6, textTransform: 'uppercase' }}>
        Variables
      </div>
      {systemFields.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {systemFields.map((sf) => (
            <span
              key={sf.name}
              style={{
                fontSize: 10,
                background: 'rgba(50, 150, 255, 0.2)',
                color: '#90c0ff',
                padding: '2px 6px',
                borderRadius: 4,
              }}
            >
              ⚙️ {sf.name}
            </span>
          ))}
        </div>
      )}
      {customFields.map((uf) => (
        <div
          key={uf.name}
          style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
        >
          <label style={{ fontSize: 11, opacity: 0.8 }}>
            {uf.name}{' '}
            {uf.defaultValue && (
              <span style={{ opacity: 0.5 }}>
                (default: {uf.defaultValue})
              </span>
            )}
          </label>
          <input
            type="text"
            value={userValues[uf.name] || ''}
            onChange={(e) =>
              setUserValues((prev) => ({
                ...prev,
                [uf.name]: e.target.value,
              }))
            }
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
        </div>
      ))}
    </div>
  );
}
