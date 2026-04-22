'use client';

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';

interface ConfirmOptions {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type ConfirmResolver = (confirmed: boolean) => void;

interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue>({
  confirm: () => Promise.resolve(false),
});

interface DialogState {
  opts: ConfirmOptions;
  resolve: ConfirmResolver;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const resolverRef = useRef<ConfirmResolver | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setDialog({ opts, resolve });
    });
  }, []);

  const handleChoice = useCallback((confirmed: boolean) => {
    resolverRef.current?.(confirmed);
    setDialog(null);
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {dialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-msg"
          className="fixed inset-0 z-[300] flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => handleChoice(false)}
          />

          {/* Panel */}
          <div className="relative bg-[var(--surface-2,#1a1a2e)] border border-[var(--border-color)] rounded-xl shadow-2xl p-6 w-full max-w-sm">
            <p id="confirm-msg" className="text-[var(--text-primary)] text-base mb-6 leading-relaxed">
              {dialog.opts.message}
            </p>
            <div className="flex justify-end gap-3">
              <button
                autoFocus
                onClick={() => handleChoice(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-[var(--border-color)]
                  text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                {dialog.opts.cancelLabel ?? 'Cancel'}
              </button>
              <button
                onClick={() => handleChoice(true)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dialog.opts.danger
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-[var(--brand-500,#7c3aed)] hover:opacity-90 text-white'
                }`}
              >
                {dialog.opts.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext);
}
