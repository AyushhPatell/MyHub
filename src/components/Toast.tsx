import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastProps {
  toast: Toast;
  onClose: () => void;
}

export default function Toast({ toast, onClose }: ToastProps) {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsClosing(true);
      // Wait for animation to complete before calling onClose
      setTimeout(() => {
        onClose();
      }, 300);
    }, 2500); // Start closing after 2.5 seconds (3 seconds total with animation)

    return () => clearTimeout(timer);
  }, [onClose]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: Info,
  };

  const colors = {
    success: 'bg-green-500 dark:bg-green-600 border-green-600 dark:border-green-700',
    error: 'bg-red-500 dark:bg-red-600 border-red-600 dark:border-red-700',
    warning: 'bg-yellow-500 dark:bg-yellow-600 border-yellow-600 dark:border-yellow-700',
    info: 'bg-blue-500 dark:bg-blue-600 border-blue-600 dark:border-blue-700',
  };

  const Icon = icons[toast.type];

  const toastContent = (
    <div
      className={`fixed pt-safe top-4 left-1/2 -translate-x-1/2 z-[10000] w-auto max-w-[90vw] sm:max-w-2xl ${
        isClosing ? 'animate-slide-up' : 'animate-slide-down'
      }`}
      role="alert"
      style={{ 
        position: 'fixed',
        top: 'max(1rem, env(safe-area-inset-top, 1rem))',
        left: '50%',
        transform: 'translateX(-50%)',
        paddingTop: 'max(1rem, env(safe-area-inset-top, 1rem))',
      }}
    >
      <div
        className={`
          flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl border-2
          ${colors[toast.type]}
          text-white
          backdrop-blur-sm
        `}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        <p className="flex-1 text-sm font-medium">{toast.message}</p>
        <button
          onClick={handleClose}
          className="flex-shrink-0 p-1 hover:bg-white/20 rounded transition-colors"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  // Use portal to render directly to body, ensuring viewport-relative positioning
  return createPortal(toastContent, document.body);
}

