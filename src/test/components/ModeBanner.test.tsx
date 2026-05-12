import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import ModeBanner from '@/components/ModeBanner';
import { AppModeProvider, useAppMode, APP_MODE_KEY } from '@/lib/appMode';
import type { User } from '@/data/mockData';

const superAdmin: User = { id: 'u0', name: 'Franklin Graham', email: 'fg@sp.org', role: 'super_admin' };

function Harness() {
  return (
    <AppModeProvider>
      <ModeBanner />
      <ModeToggle />
    </AppModeProvider>
  );
}

function ModeToggle() {
  const { setMode, mode } = useAppMode();
  return (
    <button onClick={() => setMode(mode === 'test' ? 'production' : 'test', superAdmin)}>
      Flip
    </button>
  );
}

describe('ModeBanner', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders nothing in production mode (default)', () => {
    render(<Harness />);
    expect(screen.queryByText(/Testing Mode/i)).toBeNull();
  });

  it('renders the gold "Testing Mode" strip when mode flips to test', async () => {
    render(<Harness />);
    expect(screen.queryByText(/Testing Mode/i)).toBeNull();
    // Flip mode via the context
    act(() => {
      screen.getByText('Flip').click();
    });
    expect(screen.getByText(/Testing Mode/i)).toBeInTheDocument();
    expect(screen.getByText(/NOT counted/i)).toBeInTheDocument();
  });

  it('reads existing test-mode from localStorage on first render', () => {
    window.localStorage.setItem(APP_MODE_KEY, 'test');
    render(<Harness />);
    expect(screen.getByText(/Testing Mode/i)).toBeInTheDocument();
  });
});
