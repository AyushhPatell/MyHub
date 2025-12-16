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
    // Prevent body scroll when modal is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    
    // Scroll the modal content into view
    if (contentRef.current) {
      requestAnimationFrame(() => {
        contentRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'center'
        });
      });
    }

    return () => {
      // Restore body scroll
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const modalContent = (
    <div 
      className={`fixed inset-0 ${backdropClassName} z-[9999] flex items-center justify-center p-4 modal-backdrop`}
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
        className="my-auto modal-content"
      >
        {children}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

