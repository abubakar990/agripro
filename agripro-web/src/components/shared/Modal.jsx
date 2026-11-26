import { useEffect, useRef } from 'react';
import { IconX } from '@tabler/icons-react';

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
};

const Modal = ({ isOpen, onClose, title, size = 'md', zIndex = 'z-[1000]', children }) => {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);

  // Keep latest onClose callback without triggering effects on re-render
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onCloseRef.current?.();
    };

    document.addEventListener('keydown', handleKeyDown);

    // Only move focus to dialog on initial open if active focus is not already inside it
    if (dialogRef.current && !dialogRef.current.contains(document.activeElement)) {
      dialogRef.current.focus();
    }

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const maxWidthClass = sizeClasses[size] || 'max-w-md';

  return (
    <div
      className={`fixed inset-0 ${zIndex} flex items-center justify-center bg-black/55 backdrop-blur-sm p-4`}
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={`bg-white rounded-2xl shadow-xl w-full ${maxWidthClass} max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 outline-none`}
      >
        <div className="bg-primary px-6 py-4 flex justify-between items-center sticky top-0 z-10">
          <h3 className="text-white font-bold text-lg">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-white/80 hover:text-white transition-colors"
          >
            <IconX size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
