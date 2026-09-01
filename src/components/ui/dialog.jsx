import { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// Minimal shadcn-style Dialog primitive — dependency free (no radix needed),
// matches the existing components/ui conventions (data-slot + cn()).

function Dialog({ open, onOpenChange, children }) {
  const close = useCallback(() => onOpenChange?.(false), [onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close]);

  if (!open) return null;

  return createPortal(
    <div
      data-slot="dialog"
      className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6"
      role="presentation"
    >
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px] animate-[dialogFadeIn_150ms_ease-out]"
        onClick={close}
        aria-hidden="true"
      />
      {children}
    </div>,
    document.body
  );
}

function DialogContent({ className, children, onClose, ...props }) {
  return (
    <div
      data-slot="dialog-content"
      role="dialog"
      aria-modal="true"
      className={cn(
        "relative z-10 w-full max-w-[640px] max-h-[88vh] overflow-y-auto rounded-2xl border border-[var(--border)] bg-card text-card-foreground shadow-2xl animate-[dialogPopIn_180ms_ease-out] scrollbar-thin scrollbar-track-[#F2DEC4] scrollbar-thumb-[#679936]",
        className
      )}
      {...props}
    >
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-black/5 text-black/60 transition-colors hover:bg-black/10 hover:text-black cursor-pointer"
        >
          <X size={16} />
        </button>
      ) : null}
      {children}
    </div>
  );
}

function DialogHeader({ className, ...props }) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("grid gap-1.5 p-5 pb-0", className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }) {
  return (
    <h2
      data-slot="dialog-title"
      className={cn("text-lg font-bold leading-tight text-black", className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }) {
  return (
    <p
      data-slot="dialog-description"
      className={cn("text-[13px] text-black/60 leading-5", className)}
      {...props}
    />
  );
}

function DialogBody({ className, ...props }) {
  return (
    <div
      data-slot="dialog-body"
      className={cn("p-5 pt-3 grid gap-4", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex items-center justify-end gap-2 px-5 pb-5", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
};
