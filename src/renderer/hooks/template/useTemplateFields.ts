import { useState, useEffect } from 'react';

export interface TemplateField {
  name: string;
  type: 'system' | 'user';
  defaultValue?: string;
}

export function useTemplateFields(rawContent: string) {
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [userValues, setUserValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!rawContent) {
      setFields([]);
      return;
    }
    void (async () => {
      try {
        const res = (await window.electronAPI?.invoke('template:get-fields', rawContent)) as { data: TemplateField[] } | undefined;
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
      } catch (err) {
        console.error('Failed to parse template fields:', err);
      }
    })();
  }, [rawContent]);

  return { fields, userValues, setUserValues };
}
