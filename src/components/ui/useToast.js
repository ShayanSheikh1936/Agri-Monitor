import { createContext, useContext } from "react";

// Toast context + consumer hook. Split out of toast.jsx so the provider file
// only exports a component (keeps react-refresh happy).

export const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      toast: () => {
        console.warn("useToast: <ToastProvider> is not mounted.");
      },
      dismiss: () => {},
    };
  }
  return ctx;
}
