import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from '../ThemeProvider';

// Mock matchMedia
const mockMatchMedia = vi.fn().mockReturnValue({
  matches: false,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
});
Object.defineProperty(window, 'matchMedia', { value: mockMatchMedia, writable: true });

function ThemeConsumer() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
      <button onClick={() => setTheme('light')}>Set Light</button>
      <button onClick={() => setTheme('system')}>Set System</button>
    </div>
  );
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    mockMatchMedia.mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  it('should default to system theme', () => {
    render(
      <ThemeProvider><ThemeConsumer /></ThemeProvider>,
    );
    expect(screen.getByTestId('theme').textContent).toBe('system');
    expect(screen.getByTestId('resolved').textContent).toBe('light');
  });

  it('should switch to dark theme', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider><ThemeConsumer /></ThemeProvider>,
    );

    await user.click(screen.getByText('Set Dark'));

    expect(screen.getByTestId('theme').textContent).toBe('dark');
    expect(screen.getByTestId('resolved').textContent).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('should persist theme to localStorage', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider><ThemeConsumer /></ThemeProvider>,
    );

    await user.click(screen.getByText('Set Dark'));
    expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
  });

  it('should restore theme from localStorage', () => {
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue('dark');

    render(
      <ThemeProvider><ThemeConsumer /></ThemeProvider>,
    );

    // After useEffect runs, theme should be dark
    expect(screen.getByTestId('theme').textContent).toBe('dark');
  });

  it('should throw when useTheme is used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ThemeConsumer />)).toThrow(
      'useTheme must be used within a ThemeProvider',
    );
    spy.mockRestore();
  });
});
