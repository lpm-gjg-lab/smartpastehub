import { ToastData } from '../../hooks/useToastData';

export async function runToastAction(
  action: string, 
  data: ToastData, 
  setData: (data: ToastData) => void,
  setIsAiLoading: (loading: boolean) => void,
  setCopied: (copied: boolean) => void,
  scheduleClose: (delay: number) => void,
  clearDismissTimers: () => void
) {
  let newText = data.cleaned;
  const original = data.original;
  
  // @ts-ignore
  const api = window.floatingAPI;

  if (action === 'summarize') {
    clearDismissTimers();
    setIsAiLoading(true);
    try {
      const res = (await api?.invoke('ai:rewrite', {
        text: data.cleaned,
        mode: 'summarize',
      })) as any;

      if (res && res.ok && res.data && res.data.rewritten) {
        newText = res.data.rewritten;
        setData({ ...data, cleaned: newText });
      }
    } catch (err) {
      console.error('AI Summarize failed', err);
    }
    setIsAiLoading(false);
  } else if (action === 'calculate') {
    try {
      const res = (await api?.invoke('transform:math', original)) as any;
      if (res && res.result) {
        newText = res.result;
        setData({ ...data, cleaned: newText });
      }
    } catch (err) {
      console.error(err);
    }
  } else if (action === 'convert_color') {
    try {
      const res = (await api?.invoke('transform:color', original)) as any;
      if (res && res.result) {
        newText = res.result;
        setData({ ...data, cleaned: newText });
      }
    } catch (err) {
      console.error(err);
    }
  } else if (action === 'convert_md') {
    try {
      const res = (await api?.invoke('transform:md-to-rtf', original)) as any;
      if (res && res.result) {
        newText = "Markdown Converted to Rich Text! Ready to paste.";
        setData({ ...data, cleaned: newText, type: 'rich_text' });
        setCopied(true);
      }
    } catch (err) {
      console.error(err);
    }
  } else if (action === 'open_links') {
    try {
      const res = (await api?.invoke('transform:open-links', original)) as any;
      if (res && res.result) {
        newText = res.result;
        setData({ ...data, cleaned: newText });
      }
    } catch (err) {
      console.error(err);
    }
  } else if (action === 'extract_file') {
    try {
      const res = (await api?.invoke('transform:extract-file', original)) as any;
      if (res && res.result) {
        newText = res.result;
        setData({ ...data, cleaned: newText, type: 'source_code' });
      } else {
        setData({ ...data, cleaned: 'Error: Cannot read file or file too large.' });
        return; 
      }
    } catch (err) {
      console.error(err);
    }
  } else if (action === 'scrape_url') {
    setIsAiLoading(true);
    clearDismissTimers();
    try {
      const res = (await api?.invoke('transform:scrape-url', original)) as any;
      if (res && res.result) {
        newText = res.result;
        setData({ ...data, cleaned: newText, type: 'markdown' });
      } else {
        setData({ ...data, cleaned: 'Error: Could not extract article from URL.' });
        setIsAiLoading(false);
        return;
      }
    } catch (err) {
      console.error(err);
    }
    setIsAiLoading(false);
  } else if (action === 'make_secret') {
    setIsAiLoading(true);
    clearDismissTimers();
    try {
      const res = (await api?.invoke('transform:make-secret', original)) as any;
      if (res && res.result) {
        newText = res.result;
        setData({ ...data, cleaned: newText, type: 'secret_link' });
      } else {
        setData({ ...data, cleaned: 'Error: Failed to create secret link.' });
        setIsAiLoading(false);
        return;
      }
    } catch (err) {
      console.error(err);
    }
    setIsAiLoading(false);
  } else if (action === 'UPPERCASE') {
    newText = data.cleaned.toUpperCase();
  } else if (action === 'lowercase') {
    newText = data.cleaned.toLowerCase();
  } else if (action === 'invert') {
    newText = data.cleaned.split('').map(char => {
      if (char === char.toUpperCase()) return char.toLowerCase();
      if (char === char.toLowerCase()) return char.toUpperCase();
      return char;
    }).join('');
  }

  // Force write directly to clipboard
  api?.send('clipboard:force-write', newText);
  setCopied(true);
  scheduleClose(1000);
}
