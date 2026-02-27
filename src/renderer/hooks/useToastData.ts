import { useState, useEffect } from "react";
import { onIPC } from "../lib/ipc";

export interface ToastData {
  cleaned: string;
  original: string;
  changes?: string[];
  type: string;
  securityAlert?: unknown;
  isMerged?: boolean;
  mergedCount?: number;
  sourceApp?: string;
  sensitiveCount?: number;
  sensitiveTypes?: string[];
  sizeKb?: number;
  fieldIntent?: string;
  preview?: string;
  previewRequired?: boolean;
  paletteOptions?: string[];
  previewOriginal?: string;
  previewCleaned?: string;
  previewStats?: string[];
  paletteSelected?: string;
  contentType?: string;
  strategyIntent?: "plain_text" | "rich_text";
}

export function useToastData(onNewData?: () => void) {
  const [data, setData] = useState<ToastData | null>(null);

  useEffect(() => {
    const cleanup = onIPC("toast:data", (payload) => {
      setData(payload as ToastData);
      if (onNewData) onNewData();
    });

    return () => {
      cleanup();
    };
  }, [onNewData]);

  return { data, setData };
}
