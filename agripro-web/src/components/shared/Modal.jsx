import { useEffect, useRef } from 'react';
import { IconX } from '@tabler/icons-react';

const Modal = ({ isOpen, onClose, title, children }) => {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);

    // Move focus to the dialog on open
    dialogRef.current?.focus();

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 outline-none"
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
