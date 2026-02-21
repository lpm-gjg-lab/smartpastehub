import { describe, it, expect, beforeEach } from 'vitest';
import { useSmartPasteStore } from '../useSmartPasteStore';

describe('useSmartPasteStore', () => {
  beforeEach(() => {
    useSmartPasteStore.getState().reset();
  });

  it('should have initial state', () => {
    const state = useSmartPasteStore.getState();
    expect(state.inputText).toBe('');
    expect(state.outputText).toBe('');
    expect(state.detectedType).toBeNull();
    expect(state.appliedTransforms).toEqual([]);
    expect(state.isProcessing).toBe(false);
    expect(state.hasResult).toBe(false);
    expect(state.error).toBeNull();
  });

  it('should set input text', () => {
    useSmartPasteStore.getState().setInput('test input');
    expect(useSmartPasteStore.getState().inputText).toBe('test input');
  });

  it('should set result', () => {
    const result = {
      outputText: 'cleaned text',
      detectedType: 'plain_text' as const,
      appliedTransforms: ['trim', 'lowercase'],
    };

    useSmartPasteStore.getState().setProcessing(true);
    useSmartPasteStore.getState().setResult(result);

    const state = useSmartPasteStore.getState();
    expect(state.outputText).toBe('cleaned text');
    expect(state.detectedType).toBe('plain_text');
    expect(state.appliedTransforms).toEqual(['trim', 'lowercase']);
    expect(state.isProcessing).toBe(false);
    expect(state.hasResult).toBe(true);
    expect(state.error).toBeNull();
  });

  it('should toggle processing state', () => {
    useSmartPasteStore.getState().setProcessing(true);
    expect(useSmartPasteStore.getState().isProcessing).toBe(true);

    useSmartPasteStore.getState().setProcessing(false);
    expect(useSmartPasteStore.getState().isProcessing).toBe(false);
  });

  it('should set error and clear processing', () => {
    useSmartPasteStore.getState().setProcessing(true);
    useSmartPasteStore.getState().setError('some error');

    const state = useSmartPasteStore.getState();
    expect(state.error).toBe('some error');
    expect(state.isProcessing).toBe(false);
  });

  it('should reset to initial state', () => {
    useSmartPasteStore.getState().setInput('dirty');
    useSmartPasteStore.getState().setResult({
      outputText: 'clean',
      detectedType: 'plain_text',
      appliedTransforms: ['trim'],
    });

    useSmartPasteStore.getState().reset();

    const state = useSmartPasteStore.getState();
    expect(state.inputText).toBe('');
    expect(state.outputText).toBe('');
    expect(state.hasResult).toBe(false);
  });
});
