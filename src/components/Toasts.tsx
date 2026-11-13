"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Tone = "info" | "error";
type Toast = { id: number; message: string; tone: Tone };
type ShowToast = (message: string, tone?: Tone) => void;

const TOAST_DURATION_MS = 6000;
const MAX_TOASTS = 3;

const ToastContext = createContext<ShowToast>(() => {});

/** Shows a toast. Must be used inside <ToastProvider>. */
export function useToast(): ShowToast {
  return useContext(ToastContext);
}

/**
 * Minimal toast notifications for errors that are not tied to one spot on
 * the screen (e.g. "your comment couldn't be posted"). Announced to screen
 * readers through an aria-live region.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback<ShowToast>(
    (message, tone = "info") => {
      const id = ++nextId.current;
      setToasts((current) =>
        [
          // Replace an identical message instead of stacking duplicates.
          ...current.filter((toast) => toast.message !== message),
          { id, message, tone },
        ].slice(-MAX_TOASTS)
      );
      window.setTimeout(() => dismiss(id), TOAST_DURATION_MS);
    },
    [dismiss]
  );

  return (
    <ToastContext value={show}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast" data-tone={toast.tone}>
            <span>{toast.message}</span>
            <button
              type="button"
              className="toast-close"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  );
}
