import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { AppLayout } from '../AppLayout';

describe('AppLayout', () => {
  it('renders sidebar and children', () => {
    const { getByText } = render(
      <AppLayout sidebar={<div>Test Sidebar</div>}>
        <div>Test Content</div>
      </AppLayout>
    );
    
    expect(getByText('Test Sidebar')).not.toBeNull();
    expect(getByText('Test Content')).not.toBeNull();
  });
});
