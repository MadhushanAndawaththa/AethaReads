import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider, useToast } from './Toast';

function TestToastTrigger({ message, variant }: { message: string; variant?: 'success' | 'error' | 'info' }) {
  const { toast } = useToast();
  return <button onClick={() => toast(message, variant)}>Show Toast</button>;
}

describe('ToastProvider', () => {
  it('renders a toast when toast() is called', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <TestToastTrigger message="Hello world" variant="success" />
      </ToastProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Show Toast' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('dismisses toast when dismiss button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <TestToastTrigger message="Dismiss me" />
      </ToastProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Show Toast' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('auto-dismisses toast after 4 seconds', () => {
    vi.useFakeTimers();

    render(
      <ToastProvider>
        <TestToastTrigger message="Auto gone" />
      </ToastProvider>,
    );

    act(() => {
      screen.getByRole('button', { name: 'Show Toast' }).click();
    });

    // Alert should be visible immediately after click
    expect(screen.getByRole('alert')).toBeInTheDocument();

    // Advance past the 4s auto-dismiss window
    act(() => { vi.advanceTimersByTime(4100); });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    vi.useRealTimers();
  });
});
