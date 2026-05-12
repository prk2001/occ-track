import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import LockOverlay from '@/components/LockOverlay';
import { AuthProvider } from '@/hooks/useAuth';

function wrap(children: React.ReactNode) {
  return (
    <MemoryRouter>
      <AuthProvider>{children}</AuthProvider>
    </MemoryRouter>
  );
}

describe('LockOverlay', () => {
  it('renders nothing when visible is false (and no warning)', () => {
    const { container } = render(
      wrap(<LockOverlay visible={false} onUnlock={() => {}} />)
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the lock modal when visible is true', () => {
    render(wrap(<LockOverlay visible={true} onUnlock={() => {}} />));
    // Use the unique heading-italic phrase to avoid AnimatePresence
    // double-render false positives.
    expect(screen.getByText(/Confirm it\'s still you/i)).toBeInTheDocument();
  });

  it('calls onUnlock when the continue button is clicked', async () => {
    const onUnlock = vi.fn();
    const user = userEvent.setup();
    render(wrap(<LockOverlay visible={true} onUnlock={onUnlock} />));
    await user.click(screen.getByRole('button', { name: /Continue as/i }));
    expect(onUnlock).toHaveBeenCalled();
  });

  it('shows the warning toast when warning=true and visible=false', () => {
    render(wrap(<LockOverlay visible={false} warning={true} onUnlock={() => {}} />));
    expect(screen.getByText(/locked soon/i)).toBeInTheDocument();
  });
});
