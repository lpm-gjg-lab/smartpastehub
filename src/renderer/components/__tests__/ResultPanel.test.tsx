import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ResultPanel } from '../ResultPanel';
import type { SmartPasteResult, TransformLabel } from '../../types';

describe('ResultPanel', () => {
  const mockTransform: TransformLabel = {
    id: 'pdf-fix',
    label: 'PDF Fix',
    description: 'Fixed PDF lines',
    icon: '📄',
  };

  const mockResult: SmartPasteResult = {
    input: 'raw text',
    output: 'clean text',
    detectedType: 'pdf_text',
    transforms: [mockTransform],
    timestamp: Date.now(),
  };

  it('renders output text and badges', () => {
    const { getByText } = render(
      <ResultPanel result={mockResult} onCopy={vi.fn()} onClear={vi.fn()} />,
    );

    expect(getByText('clean text')).not.toBeNull();
    expect(getByText('PDF Fix')).not.toBeNull();
  });

  it('calls onCopy and onClear', () => {
    const handleCopy = vi.fn();
    const handleClear = vi.fn();

    const { getByText } = render(
      <ResultPanel
        result={mockResult}
        onCopy={handleCopy}
        onClear={handleClear}
      />,
    );

    fireEvent.click(getByText('Copy Result'));
    expect(handleCopy).toHaveBeenCalledWith('clean text');

    fireEvent.click(getByText('Clear'));
    expect(handleClear).toHaveBeenCalled();
  });
});
