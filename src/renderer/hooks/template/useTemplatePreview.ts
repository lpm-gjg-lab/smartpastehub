import { useState, useEffect } from 'react';

export function useTemplatePreview(rawContent: string, userValues: Record<string, string>) {
  const [preview, setPreview] = useState('');

  useEffect(() => {
    if (!rawContent) {
      setPreview('');
      return;
    }
    void (async () => {
      try {
        const res = (await window.electronAPI?.invoke('template:fill', {
          content: rawContent,
          values: userValues,
          context: {},
        })) as { data: string } | undefined;
        setPreview(res?.data ?? '');
      } catch (err) {
        console.error('Failed to generate template preview:', err);
      }
    })();
  }, [rawContent, userValues]);

  return { preview };
}
