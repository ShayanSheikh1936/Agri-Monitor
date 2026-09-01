import {
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ToastContext } from "./useToast";

// Minimal shadcn-style toast system — dependency free (no radix/sonner),
// matches the existing components/ui conventions. Mount <ToastProvider> once
// on the page, then call useToast().toast({ title, description?, variant? })
// (hook lives in ./useToast.js).

const TOAST_ICONS = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, description, variant = "info", duration = 4200 }) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev.slice(-3), { id, title, description, variant }]);
      window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div
          aria-live="polite"
          className="fixed bottom-4 right-4 z-[10100] grid w-[min(340px,calc(100vw-2rem))] gap-2"
        >
          {toasts.map((t) => {
            const Icon = TOAST_ICONS[t.variant] ?? Info;
            const failed = t.variant === "error";
            return (
              <div
                key={t.id}
                role="status"
                className={cn(
                  "flex items-start gap-2.5 rounded-xl border bg-card p-3 shadow-lg animate-[toastIn_200ms_ease-out]",
                  failed ? "border-red-300" : "border-[#679936]/40"
                )}
              >
                <Icon
                  size={17}
                  className={cn(
                    "mt-0.5 shrink-0",
                    failed ? "text-red-600" : t.variant === "success" ? "text-[#679936]" : "text-black/50"
                  )}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-black leading-4">{t.title}</p>
                  {t.description ? (
                    <p className="text-[12px] text-black/60 leading-4 mt-0.5">{t.description}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  aria-label="Dismiss notification"
                  onClick={() => dismiss(t.id)}
                  className="text-black/40 hover:text-black transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export { ToastProvider };
