import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import ModeLockedCard from '@/components/ModeLockedCard';
import { AppModeProvider, APP_MODE_KEY } from '@/lib/appMode';
import { AuthProvider } from '@/hooks/useAuth';

function wrap(children: React.ReactNode) {
  return (
    <MemoryRouter>
      <AuthProvider>
        <AppModeProvider>{children}</AppModeProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('ModeLockedCard', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders the feature name + Switch CTA in production (default)', () => {
    render(wrap(<ModeLockedCard feature="Shoebox check-in" />));
    expect(screen.getByText(/Shoebox check-in is locked/)).toBeInTheDocument();
    // Default user is Super Admin → should see the Switch button
    expect(screen.getByText(/Switch to Testing Mode/i)).toBeInTheDocument();
  });

  it('renders null when mode is test', () => {
    window.localStorage.setItem(APP_MODE_KEY, 'test');
    const { container } = render(wrap(<ModeLockedCard feature="X" />));
    expect(container.firstChild).toBeNull();
  });

  it('shows custom description when provided', () => {
    render(wrap(<ModeLockedCard feature="Cartonization" description="Custom message here." />));
    expect(screen.getByText('Custom message here.')).toBeInTheDocument();
  });
});
