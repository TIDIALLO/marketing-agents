import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../badge';

describe('Badge', () => {
  it('should render with text content', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('should apply default variant styles', () => {
    render(<Badge data-testid="badge">Default</Badge>);
    const el = screen.getByTestId('badge');
    expect(el).toHaveClass('bg-primary');
  });

  it('should apply destructive variant', () => {
    render(<Badge data-testid="badge" variant="destructive">Error</Badge>);
    const el = screen.getByTestId('badge');
    expect(el).toHaveClass('bg-destructive');
  });

  it('should apply success variant', () => {
    render(<Badge data-testid="badge" variant="success">OK</Badge>);
    const el = screen.getByTestId('badge');
    expect(el).toHaveClass('bg-green-500/15');
  });

  it('should apply warning variant', () => {
    render(<Badge data-testid="badge" variant="warning">Warn</Badge>);
    const el = screen.getByTestId('badge');
    expect(el).toHaveClass('bg-orange-500/15');
  });

  it('should apply outline variant', () => {
    render(<Badge data-testid="badge" variant="outline">Outline</Badge>);
    const el = screen.getByTestId('badge');
    expect(el).toHaveClass('text-foreground');
    expect(el).not.toHaveClass('bg-primary');
  });

  it('should accept custom className', () => {
    render(<Badge data-testid="badge" className="ml-2">Custom</Badge>);
    expect(screen.getByTestId('badge')).toHaveClass('ml-2');
  });
});
