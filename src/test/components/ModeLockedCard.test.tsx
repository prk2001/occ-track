import { describe, expect, it, beforeEach } from 'vitest';
import { useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import ModeLockedCard from '@/components/ModeLockedCard';
import { AppModeProvider, APP_MODE_KEY } from '@/lib/appMode';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/data/mockData';

// Helper: post-Phase-31 the default user is null (no auto-Super-Admin).
// Tests that need a specific role must explicitly authenticate first.
function LoginAs({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const { login, user } = useAuth();
  useEffect(() => {
    if (!user) login(role);
  }, [user, login, role]);
  return user ? <>{children}</> : null;
}

function wrap(role: UserRole, children: React.ReactNode) {
  return (
    <MemoryRouter>
      <AuthProvider>
        <AppModeProvider>
          <LoginAs role={role}>{children}</LoginAs>
        </AppModeProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('ModeLockedCard', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders the feature name + Switch CTA when Super Admin is logged in (production)', async () => {
    render(wrap('super_admin', <ModeLockedCard feature="Shoebox check-in" />));
    await waitFor(() => {
      expect(screen.getByText(/Shoebox check-in is locked/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Switch to Testing Mode/i)).toBeInTheDocument();
  });

  it('shows a contact-Super-Admin hint when a non-Super role is logged in', async () => {
    render(wrap('cdo_leader', <ModeLockedCard feature="Shoebox check-in" />));
    await waitFor(() => {
      expect(screen.getByText(/Shoebox check-in is locked/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Contact your Super Admin/i)).toBeInTheDocument();
  });

  it('renders null when mode is test', async () => {
    window.localStorage.setItem(APP_MODE_KEY, 'test');
    const { container } = render(wrap('super_admin', <ModeLockedCard feature="X" />));
    // Wait briefly for the login effect, then assert null
    await new Promise((r) => setTimeout(r, 50));
    expect(container.firstChild).toBeNull();
  });

  it('shows custom description when provided', async () => {
    render(wrap('super_admin', <ModeLockedCard feature="Cartonization" description="Custom message here." />));
    await waitFor(() => {
      expect(screen.getByText('Custom message here.')).toBeInTheDocument();
    });
  });
});
