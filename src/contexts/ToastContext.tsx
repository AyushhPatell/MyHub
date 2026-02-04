import {
  createContext,
  useCallback,
  useContext,
  useState,
  ReactNode,
} from 'react';
import Toast, { Toast as ToastType, ToastType as ToastTypeEnum } from '../components/Toast';

interface ToastContextValue {
  showToast: (message: string, type?: ToastTypeEnum) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastType | null>(null);

  const showToast = useCallback((message: string, type: ToastTypeEnum = 'info') => {
    setToast({
      id: `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      message,
      type,
    });
  }, []);

  const success = useCallback((message: string) => showToast(message, 'success'), [showToast]);
  const error = useCallback((message: string) => showToast(message, 'error'), [showToast]);
  const warning = useCallback((message: string) => showToast(message, 'warning'), [showToast]);
  const info = useCallback((message: string) => showToast(message, 'info'), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      {toast && (
        <Toast
          toast={toast}
          onClose={() => setToast(null)}
        />
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
