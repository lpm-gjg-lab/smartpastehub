import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button', () => {
  it('renders with primary variant by default', () => {
    const { getByRole } = render(<Button>Clean</Button>);
    const button = getByRole('button');
    expect(button.className).toContain('primary');
  });

  it('renders with specific variant and size', () => {
    const { getByRole } = render(
      <Button variant="ghost" size="sm">
        Click
      </Button>,
    );
    const button = getByRole('button');
    expect(button.className).toContain('ghost');
    expect(button.className).toContain('sm');
  });

  it('is disabled and shows spinner when loading', () => {
    const { getByRole, container } = render(
      <Button loading>Processing</Button>,
    );
    const button = getByRole('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    // The span is added before the children
    expect(container.querySelector('button > span')).not.toBeNull();
  });

  it('does not call onClick when disabled', () => {
    const handleClick = vi.fn();
    const { getByRole } = render(
      <Button disabled onClick={handleClick}>
        Click
      </Button>,
    );
    const button = getByRole('button');

    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('passes className through', () => {
    const { getByRole } = render(
      <Button className="custom-class">Click</Button>,
    );
    const button = getByRole('button');
    expect(button.className).toContain('custom-class');
  });
});
