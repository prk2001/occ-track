import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TurnstileStub from '@/components/TurnstileStub';

describe('TurnstileStub', () => {
  it('renders the unverified state with "I\'m not a robot" prompt', () => {
    render(<TurnstileStub onVerified={() => {}} verifiedToken={null} />);
    expect(screen.getByText(/I\'m not a robot/i)).toBeInTheDocument();
    expect(screen.getByText(/Cloudflare Turnstile/i)).toBeInTheDocument();
  });

  it('renders the verified state when a token is provided', () => {
    render(<TurnstileStub onVerified={() => {}} verifiedToken="stub_abc123" />);
    expect(screen.getByText(/Verified\./i)).toBeInTheDocument();
  });

  it('calls onVerified with a stub_ token after click (real timers; ~800ms wait)', async () => {
    const onVerified = vi.fn();
    const user = userEvent.setup();
    render(<TurnstileStub onVerified={onVerified} verifiedToken={null} />);
    await user.click(screen.getByRole('button'));
    await waitFor(() => expect(onVerified).toHaveBeenCalled(), { timeout: 2000 });
    const tokenArg = onVerified.mock.calls[0][0];
    expect(tokenArg).toMatch(/^stub_/);
  });

  it('shows "Verifying…" state while pending', async () => {
    const user = userEvent.setup();
    render(<TurnstileStub onVerified={() => {}} verifiedToken={null} />);
    await user.click(screen.getByRole('button'));
    // The pending state is visible immediately after click + before resolution
    expect(screen.getByText(/Verifying/i)).toBeInTheDocument();
  });
});
