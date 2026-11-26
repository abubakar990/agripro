import { useState, useEffect } from 'react';
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
    <div
      className="fixed top-5 right-5 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm text-white transform transition-all duration-300 translate-y-0 opacity-100 border border-white/10 ${
            toast.type === 'error' ? 'bg-red-600' : toast.type === 'success' ? 'bg-emerald-600' : 'bg-blue-600'
          }`}
        >
          {toast.type === 'success' && <IconCheck size={20} className="shrink-0" />}
          {toast.type === 'error' && <IconX size={20} className="shrink-0" />}
          {toast.type === 'info' && <IconInfoCircle size={20} className="shrink-0" />}
          
          <span className="font-medium flex-1 leading-snug">{toast.message}</span>
          
          <button
            onClick={() => removeToast(toast.id)}
            aria-label="Dismiss notification"
            className="ml-2 p-1 rounded-md hover:bg-white/20 transition-colors shrink-0"
          >
            <IconX size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
