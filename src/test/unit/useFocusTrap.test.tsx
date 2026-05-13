import { describe, expect, it } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

/**
 * useFocusTrap — verifies focus moves into the trap on mount, Tab/Shift+Tab
 * wrap at the edges, and focus is restored to the trigger on unmount.
 */
function TrapHarness({ open }: { open: boolean }) {
  const ref = useFocusTrap<HTMLDivElement>(open);
  if (!open) return null;
  return (
    <div ref={ref} data-testid="trap">
      <button data-testid="first">First</button>
      <button data-testid="middle">Middle</button>
      <button data-testid="last">Last</button>
    </div>
  );
}

describe('useFocusTrap', () => {
  it('focuses the first focusable element on mount', () => {
    const { getByTestId } = render(<TrapHarness open={true} />);
    expect(document.activeElement).toBe(getByTestId('first'));
  });

  it('wraps Tab from the last focusable to the first', () => {
    const { getByTestId } = render(<TrapHarness open={true} />);
    const last = getByTestId('last');
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(getByTestId('first'));
  });

  it('wraps Shift+Tab from the first focusable to the last', () => {
    const { getByTestId } = render(<TrapHarness open={true} />);
    const first = getByTestId('first');
    first.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(getByTestId('last'));
  });

  it('restores focus to the trigger element when the trap unmounts', () => {
    const trigger = document.createElement('button');
    trigger.id = 'trigger';
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    const { rerender } = render(<TrapHarness open={true} />);
    rerender(<TrapHarness open={false} />);
    // After unmount, focus should restore to the trigger.
    expect(document.activeElement).toBe(trigger);

    document.body.removeChild(trigger);
  });
});
