import { create } from 'zustand';
import type { ContentType } from '../../shared/types';

interface SmartPasteState {
  inputText: string;
  outputText: string;
  detectedType: ContentType | null;
  appliedTransforms: string[];
  isProcessing: boolean;
  hasResult: boolean;
  error: string | null;
}

interface SmartPasteActions {
  setInput: (text: string) => void;
  setResult: (result: {
    outputText: string;
    detectedType: ContentType;
    appliedTransforms: string[];
  }) => void;
  setProcessing: (processing: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: SmartPasteState = {
  inputText: '',
  outputText: '',
  detectedType: null,
  appliedTransforms: [],
  isProcessing: false,
  hasResult: false,
  error: null,
};

export const useSmartPasteStore = create<SmartPasteState & SmartPasteActions>(
  (set) => ({
    ...initialState,
    setInput: (text) => set({ inputText: text }),
    setResult: (result) =>
      set({
        outputText: result.outputText,
        detectedType: result.detectedType,
        appliedTransforms: result.appliedTransforms,
        isProcessing: false,
        hasResult: true,
        error: null,
      }),
    setProcessing: (processing) => set({ isProcessing: processing }),
    setError: (error) => set({ error, isProcessing: false }),
    reset: () => set(initialState),
  }),
);
