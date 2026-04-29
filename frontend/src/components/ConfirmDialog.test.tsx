import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmProvider, useConfirm } from './ConfirmDialog';

function TestConfirmTrigger({ onResult }: { onResult: (v: boolean) => void }) {
  const { confirm } = useConfirm();
  return (
    <button
      onClick={async () => {
        const result = await confirm({ message: 'Are you sure?', confirmLabel: 'Yes', danger: true });
        onResult(result);
      }}
    >
      Open Confirm
    </button>
  );
}

describe('ConfirmProvider', () => {
  it('shows dialog when confirm() is called', async () => {
    const user = userEvent.setup();
    render(
      <ConfirmProvider>
        <TestConfirmTrigger onResult={() => {}} />
      </ConfirmProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Open Confirm' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('resolves true when confirm button is clicked', async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();

    render(
      <ConfirmProvider>
        <TestConfirmTrigger onResult={onResult} />
      </ConfirmProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Open Confirm' }));
    await user.click(await screen.findByRole('button', { name: 'Yes' }));

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('resolves false when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();

    render(
      <ConfirmProvider>
        <TestConfirmTrigger onResult={onResult} />
      </ConfirmProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Open Confirm' }));
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('resolves false when backdrop is clicked', async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();

    render(
      <ConfirmProvider>
        <TestConfirmTrigger onResult={onResult} />
      </ConfirmProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Open Confirm' }));
    const dialog = await screen.findByRole('dialog');
    // click the backdrop (first child div of the dialog)
    const backdrop = dialog.querySelector('div');
    if (backdrop) await user.click(backdrop);

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
  });
});
