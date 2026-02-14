import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toast } from '../toast';

describe('Toast', () => {
  it('should render title', () => {
    render(<Toast title="Success" />);
    expect(screen.getByText('Success')).toBeInTheDocument();
  });

  it('should render description', () => {
    render(<Toast title="Title" description="Details here" />);
    expect(screen.getByText('Details here')).toBeInTheDocument();
  });

  it('should render dismiss button when onDismiss provided', () => {
    const dismiss = vi.fn();
    render(<Toast title="Test" onDismiss={dismiss} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should not render dismiss button without onDismiss', () => {
    render(<Toast title="Test" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should call onDismiss when dismiss button clicked', async () => {
    const user = userEvent.setup();
    const dismiss = vi.fn();
    render(<Toast title="Test" onDismiss={dismiss} />);

    await user.click(screen.getByRole('button'));
    expect(dismiss).toHaveBeenCalledOnce();
  });

  it('should apply variant classes', () => {
    const { container } = render(<Toast title="Error" variant="destructive" />);
    expect(container.firstChild).toHaveClass('bg-destructive/10');
  });
});
