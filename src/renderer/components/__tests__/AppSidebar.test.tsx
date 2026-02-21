import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { AppSidebar } from '../AppSidebar';

// Mock useI18n
vi.mock('../../hooks/useI18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}));

describe('AppSidebar', () => {
  it('renders only 3 navigation tabs', () => {
    const { getAllByRole, queryByText } = render(
      <AppSidebar activeTab="paste" onTabChange={vi.fn()} />
    );
    
    // Should have 3 tab buttons
    const tabs = getAllByRole('menuitem');
    expect(tabs.length).toBe(3);
    
    // Should not contain "License" or "Plugin"
    expect(queryByText(/license/i)).toBeNull();
    expect(queryByText(/plugin/i)).toBeNull();
  });

  it('calls onTabChange when tab clicked', () => {
    const handleTabChange = vi.fn();
    const { getAllByRole } = render(
      <AppSidebar activeTab="paste" onTabChange={handleTabChange} />
    );
    
    const tabs = getAllByRole('menuitem');
    expect(tabs.length).toBeGreaterThan(1);
    
    // Click the second tab (history)
    fireEvent.click(tabs[1] as HTMLElement);
    
    expect(handleTabChange).toHaveBeenCalledWith('history');
  });

  it('supports keyboard navigation (ArrowDown)', () => {
    const { getAllByRole } = render(
      <AppSidebar activeTab="paste" onTabChange={vi.fn()} />
    );
    
    const tabs = getAllByRole('menuitem');
    expect(tabs.length).toBeGreaterThan(1);
    
    if (tabs[0]) (tabs[0] as HTMLElement).focus();
    
    // Simulate ArrowDown on first tab
    if (tabs[0]) fireEvent.keyDown(tabs[0] as HTMLElement, { key: 'ArrowDown' });
    
    // Focus should move to second tab
    expect(document.activeElement).toBe(tabs[1]);
  });
  
  it('supports keyboard navigation (ArrowUp)', () => {
    const { getAllByRole } = render(
      <AppSidebar activeTab="paste" onTabChange={vi.fn()} />
    );
    
    const tabs = getAllByRole('menuitem');
    expect(tabs.length).toBeGreaterThan(1);
    
    if (tabs[1]) (tabs[1] as HTMLElement).focus();
    
    // Simulate ArrowUp on second tab
    if (tabs[1]) fireEvent.keyDown(tabs[1] as HTMLElement, { key: 'ArrowUp' });
    
    // Focus should move back to first tab
    expect(document.activeElement).toBe(tabs[0]);
  });
});
