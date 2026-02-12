import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast } from '../ToastProvider';

function ToastTrigger() {
  const { toast } = useToast();
  return (
    <div>
      <button onClick={() => toast({ title: 'Success', description: 'It worked', variant: 'success' })}>
        Show Toast
      </button>
      <button onClick={() => toast({ title: 'Error', variant: 'destructive' })}>
        Show Error
      </button>
    </div>
  );
}

describe('ToastProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render children', () => {
    render(
      <ToastProvider><div data-testid="child">Hello</div></ToastProvider>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('should show a toast when triggered', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <ToastProvider><ToastTrigger /></ToastProvider>,
    );

    await user.click(screen.getByText('Show Toast'));

    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('It worked')).toBeInTheDocument();
  });

  it('should auto-dismiss toast after 5 seconds', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <ToastProvider><ToastTrigger /></ToastProvider>,
    );

    await user.click(screen.getByText('Show Toast'));
    expect(screen.getByText('Success')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(5000); });

    expect(screen.queryByText('Success')).not.toBeInTheDocument();
  });

  it('should throw when useToast is used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ToastTrigger />)).toThrow(
      'useToast must be used within a ToastProvider',
    );
    spy.mockRestore();
  });
});
