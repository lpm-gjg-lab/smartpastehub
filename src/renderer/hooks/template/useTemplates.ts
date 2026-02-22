import { useState, useCallback, useEffect } from 'react';

export interface Template {
  id: string;
  name: string;
  content: string;
}

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);

  const loadTemplates = useCallback(async () => {
    try {
      const res = (await window.electronAPI?.invoke('template:list-templates')) as { data: Template[] } | undefined;
      setTemplates(res?.data ?? []);
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  }, []);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const saveTemplate = async (id: string, name: string, content: string) => {
    if (!name || !content) return;
    try {
      await window.electronAPI?.invoke('template:save-template', {
        id: id || undefined,
        name,
        content,
      });
      await loadTemplates();
    } catch (err) {
      console.error('Failed to save template:', err);
    }
  };

  return { templates, loadTemplates, saveTemplate };
}
