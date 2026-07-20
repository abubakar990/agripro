import React, { useState, useEffect } from 'react';
import { IconCheck, IconX, IconInfoCircle } from '@tabler/icons-react';

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToast = (e) => {
      const id = Date.now() + Math.random();
      const newToast = { id, ...e.detail };
      
      setToasts((prev) => [...prev, newToast]);

      // Auto-remove after 3 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3000);
    };

    window.addEventListener('toast-event', handleToast);
    return () => window.removeEventListener('toast-event', handleToast);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm text-white transform transition-all duration-300 translate-y-0 opacity-100 ${
            toast.type === 'error' ? 'bg-red-500' : toast.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
          }`}
        >
          {toast.type === 'success' && <IconCheck size={20} />}
          {toast.type === 'error' && <IconX size={20} />}
          {toast.type === 'info' && <IconInfoCircle size={20} />}
          
          <span className="font-medium">{toast.message}</span>
          
          <button onClick={() => removeToast(toast.id)} className="ml-4 hover:opacity-80">
            <IconX size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
