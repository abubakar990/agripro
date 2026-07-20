import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { IconAlertTriangle } from '@tabler/icons-react';

export default function ConfirmContainer() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [resolvePromise, setResolvePromise] = useState(null);

  useEffect(() => {
    const handleConfirm = (e) => {
      setMessage(e.detail.message);
      setResolvePromise(() => e.detail.resolve);
      setIsOpen(true);
    };

    window.addEventListener('confirm-event', handleConfirm);
    return () => window.removeEventListener('confirm-event', handleConfirm);
  }, []);

  const handleYes = () => {
    setIsOpen(false);
    if (resolvePromise) resolvePromise(true);
  };

  const handleNo = () => {
    setIsOpen(false);
    if (resolvePromise) resolvePromise(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleNo} title="Confirm Action">
      <div className="flex flex-col items-center text-center py-4">
        <IconAlertTriangle size={48} className="text-amber-500 mb-4" />
        <p className="text-lg font-medium text-text-primary mb-6">{message}</p>
        
        <div className="flex gap-4 w-full">
          <button 
            onClick={handleNo}
            className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-bg-alt font-medium transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleYes}
            className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium transition-colors shadow-sm"
          >
            Yes, Proceed
          </button>
        </div>
      </div>
    </Modal>
  );
}
