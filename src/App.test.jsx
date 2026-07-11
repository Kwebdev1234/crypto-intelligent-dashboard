import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';

describe('App', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    window.localStorage.clear();
  });

  it('toggles the page theme from dark to light', () => {
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>
    );

    const toggleButton = screen.getByRole('button', { name: /switch to light mode/i });
    fireEvent.click(toggleButton);

    expect(document.body.getAttribute('data-theme')).toBe('light');
  });
});