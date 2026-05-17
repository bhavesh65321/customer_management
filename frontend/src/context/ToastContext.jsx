/**
 * ToastContext.jsx — Global toast notification context (FE-02)
 *
 * Wraps react-hot-toast into a React context so any component can call
 * toast helpers without importing react-hot-toast directly everywhere.
 *
 * Usage:
 *   const toast = useToast();
 *   toast.success('Customer saved!');
 *   toast.error('Failed to load data');
 *   const id = toast.loading('Saving...');
 *   toast.dismiss(id);
 */
import { createContext, useContext } from "react";
import toast from "react-hot-toast";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const notify = {
    success: (msg, opts) =>
      toast.success(msg, { duration: 3000, ...opts }),

    error: (msg, opts) =>
      toast.error(msg, { duration: 4500, ...opts }),

    loading: (msg, opts) =>
      toast.loading(msg, opts),

    info: (msg, opts) =>
      toast(msg, {
        duration: 3500,
        icon: "ℹ️",
        style: { background: "#EFF6FF", color: "#1E40AF" },
        ...opts,
      }),

    promise: (promise, msgs, opts) =>
      toast.promise(promise, msgs, opts),

    dismiss: (id) => toast.dismiss(id),
  };

  return (
    <ToastContext.Provider value={notify}>{children}</ToastContext.Provider>
  );
}

/** Hook — throws if used outside <ToastProvider> */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return ctx;
}
