import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { HistoryPage } from '../HistoryPage';

// Mock dependencies
vi.mock('../../lib/ipc', () => ({
  invokeIPC: vi.fn().mockResolvedValue({
    recentClips: [
      {
        id: 1,
        cleaned_text: 'first clean text',
        content_type: 'plain_text',
        created_at: new Date().toISOString(),
      },
      {
        id: 2,
        cleaned_text: 'url text match',
        content_type: 'url_text',
        created_at: new Date().toISOString(),
      },
    ],
  }),
  onIPC: vi.fn(() => vi.fn()),
}));

vi.mock('../../components/Button', () => ({
  Button: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

describe('HistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders list of clips', async () => {
    const { findByText } = render(<HistoryPage />);

    expect(await findByText('first clean text')).not.toBeNull();
    expect(await findByText('url text match')).not.toBeNull();
  });

  it('filters results correctly', async () => {
    const { findByText, getByPlaceholderText, queryByText } = render(
      <HistoryPage />,
    );

    // Wait for load
    await findByText('first clean text');

    const searchInput = getByPlaceholderText('Search history...');
    fireEvent.change(searchInput, { target: { value: 'url' } });

    // Only one should remain
    expect(queryByText('first clean text')).toBeNull();
    expect(queryByText('url text match')).not.toBeNull();
  });
});
