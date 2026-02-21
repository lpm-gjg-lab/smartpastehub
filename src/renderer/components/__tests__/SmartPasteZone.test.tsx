import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { SmartPasteZone } from '../SmartPasteZone';

describe('SmartPasteZone', () => {
  it('renders correctly with placeholder', () => {
    const { getByPlaceholderText } = render(
      <SmartPasteZone
        inputText=""
        onInputChange={vi.fn()}
        onClean={vi.fn()}
        isProcessing={false}
      />,
    );
    expect(getByPlaceholderText(/Paste anything here/i)).not.toBeNull();
  });

  it('calls onClean when button clicked', () => {
    const handleClean = vi.fn();
    const { getByText } = render(
      <SmartPasteZone
        inputText="test text"
        onInputChange={vi.fn()}
        onClean={handleClean}
        isProcessing={false}
      />,
    );

    fireEvent.click(getByText('Clean Now'));
    expect(handleClean).toHaveBeenCalledWith('test text');
  });

  it('disables button when processing or empty', () => {
    const { getByText, rerender } = render(
      <SmartPasteZone
        inputText=""
        onInputChange={vi.fn()}
        onClean={vi.fn()}
        isProcessing={false}
      />,
    );

    expect((getByText('Clean Now') as HTMLButtonElement).disabled).toBe(true);

    rerender(
      <SmartPasteZone
        inputText="test text"
        onInputChange={vi.fn()}
        onClean={vi.fn()}
        isProcessing={true}
      />,
    );

    expect((getByText('Clean Now') as HTMLButtonElement).disabled).toBe(true);
  });
});
