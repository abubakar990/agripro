import React from 'react';
import { IconX } from '@tabler/icons-react';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-primary px-6 py-4 flex justify-between items-center sticky top-0 z-10">
          <h3 className="text-white font-bold text-lg">{title}</h3>
          <button 
            onClick={onClose}
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
