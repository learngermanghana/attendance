/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from "react";

const ToastContext = createContext(null);

function buildToast(toast) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: toast.type || "success",
    message: toast.message || "",
    durationMs: typeof toast.durationMs === "number" ? toast.durationMs : 3600,
  };
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const pushToast = useCallback((toastInput) => {
    const toast = buildToast(toastInput || {});
    setToasts((current) => [...current, toast]);

    if (toast.durationMs > 0) {
      window.setTimeout(() => dismissToast(toast.id), toast.durationMs);
    }
  }, [dismissToast]);

  const api = useMemo(() => ({
    toasts,
    pushToast,
    dismissToast,
    success: (message, options = {}) => pushToast({ ...options, type: "success", message }),
    error: (message, options = {}) => pushToast({ ...options, type: "error", message }),
    info: (message, options = {}) => pushToast({ ...options, type: "info", message }),
  }), [dismissToast, pushToast, toasts]);

  return <ToastContext.Provider value={api}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
