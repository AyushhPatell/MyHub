import { useEffect, useRef, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalContainerProps {
  children: ReactNode;
  onClose: () => void;
  backdropClassName?: string;
}

export default function ModalContainer({ children, onClose, backdropClassName = 'bg-black/70 backdrop-blur-md' }: ModalContainerProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 modal-backdrop ${backdropClassName}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        ref={contentRef}
        onClick={(e) => e.stopPropagation()}
        className="modal-content max-h-[90vh] overflow-y-auto w-full flex justify-center"
      >
        {children}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

