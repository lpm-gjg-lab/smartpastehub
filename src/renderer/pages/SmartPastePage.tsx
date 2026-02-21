import React, { useEffect } from 'react';
import styles from '../styles/pages/SmartPastePage.module.css';
import { SmartPasteZone } from '../components/SmartPasteZone';
import { ResultPanel } from '../components/ResultPanel';
import { useSmartPasteStore } from '../stores/useSmartPasteStore';
import { useToastStore } from '../stores/useToastStore';
import { invokeIPC, onIPC } from '../lib/ipc';
import { getTransformLabels } from '../lib/transform-labels';
import type { ContentType, CleanResult } from '../../shared/types';

interface ProcessClipboardResult {
  cleaned: string;
  securityAlert: unknown | null;
  error?: unknown;
  changes?: string[];
  detectedType: ContentType;
  detectionConfidence: number;
  original: string;
}

export const SmartPastePage: React.FC = () => {
  const store = useSmartPasteStore();
  const { addToast } = useToastStore();

  const handleClean = async (text: string) => {
    try {
      store.setProcessing(true);
      
      const response = await invokeIPC<ProcessClipboardResult>('clipboard:paste', {
        preset: 'default',
        text
      });

      if (response.error) {
        throw new Error(String(response.error));
      }

      store.setResult({
        outputText: response.cleaned,
        detectedType: response.detectedType,
        appliedTransforms: response.changes || []
      });

    } catch (err) {
      store.setError(err instanceof Error ? err.message : 'Failed to process content');
      addToast({
        title: 'Processing Failed',
        message: err instanceof Error ? err.message : 'Unknown error occurred',
        type: 'error'
      });
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast({
        title: 'Copied',
        message: 'Result copied to clipboard',
        type: 'success'
      });
    } catch (err) {
      addToast({
        title: 'Copy Failed',
        type: 'error'
      });
    }
  };

  // Listen for background auto-clean from hotkey (Ctrl+Shift+V)
  useEffect(() => {
    const unsub = onIPC('clipboard:cleaned', (payload: any) => {
      // payload: { original, cleaned, type }
      // The changes aren't directly in this event payload usually, 
      // but we update what we have to reflect the latest hotkey action.
      store.setInput(payload.original || '');
      store.setResult({
        outputText: payload.cleaned,
        detectedType: payload.type || 'plain_text',
        appliedTransforms: [] // Unknown from just this event, but enough to show it worked
      });
    });
    return unsub;
  }, [store]);

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <SmartPasteZone 
          inputText={store.inputText}
          onInputChange={store.setInput}
          onClean={handleClean}
          isProcessing={store.isProcessing}
        />
      </div>

      {store.hasResult && (
        <div className={styles.resultContainer}>
          <ResultPanel 
            result={{
              input: store.inputText,
              output: store.outputText,
              detectedType: store.detectedType!,
              transforms: getTransformLabels(store.appliedTransforms),
              timestamp: Date.now()
            }}
            onCopy={handleCopy}
            onClear={store.reset}
          />
        </div>
      )}
    </div>
  );
};
