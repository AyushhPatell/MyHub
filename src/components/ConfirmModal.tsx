import { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import ModalContainer from './ModalContainer';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'neutral';
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmModalProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open && confirmRef.current) {
      // Focus cancel by default so Enter doesn't confirm destructive action
      const cancelBtn = document.querySelector('[data-confirm-cancel]') as HTMLButtonElement;
      if (cancelBtn) cancelBtn.focus();
    }
  }, [open]);

  if (!open) return null;

  const variantStyles = {
    danger:
      'bg-red-600 hover:bg-red-700 focus:ring-red-500 dark:bg-red-600 dark:hover:bg-red-700',
    warning:
      'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 dark:bg-amber-600 dark:hover:bg-amber-700',
    neutral:
      'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500 dark:bg-primary-600 dark:hover:bg-primary-700',
  };

  return (
    <ModalContainer onClose={onCancel}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-md mx-auto overflow-hidden"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div
              className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                variant === 'danger'
                  ? 'bg-red-100 dark:bg-red-900/30'
                  : variant === 'warning'
                    ? 'bg-amber-100 dark:bg-amber-900/30'
                    : 'bg-primary-100 dark:bg-primary-900/30'
              }`}
            >
              <AlertTriangle
                className={`w-6 h-6 ${
                  variant === 'danger'
                    ? 'text-red-600 dark:text-red-400'
                    : variant === 'warning'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-primary-600 dark:text-primary-400'
                }`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h2
                id="confirm-title"
                className="text-lg font-bold text-gray-900 dark:text-white mb-1"
              >
                {title}
              </h2>
              <p
                id="confirm-desc"
                className="text-sm text-gray-600 dark:text-gray-300"
              >
                {message}
              </p>
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-3 mt-6">
            <button
              data-confirm-cancel
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              {cancelLabel}
            </button>
            <button
              ref={confirmRef}
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`px-4 py-2.5 rounded-xl font-semibold text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 ${variantStyles[variant]}`}
            >
              {loading ? 'Please wait…' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </ModalContainer>
  );
}
