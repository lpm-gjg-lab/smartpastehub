import { useState, useEffect } from 'react';

export interface ToastData {
  cleaned: string;
  original: string;
  changes?: string[];
  type: string;
  securityAlert?: unknown;
  isMerged?: boolean;
  mergedCount?: number;
  sourceApp?: string;
}

export function useToastData(onNewData?: () => void) {
  const [data, setData] = useState<ToastData | null>(null);

  useEffect(() => {
    // @ts-ignore
    const cleanup = window.floatingAPI?.on('toast:data', (payload: any) => {
      setData(payload as ToastData);
      if (onNewData) onNewData();
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, [onNewData]);

  return { data, setData };
}
