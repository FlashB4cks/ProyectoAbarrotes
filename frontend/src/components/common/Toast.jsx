import React, { useEffect } from 'react';

/* ── COMPONENTE: TOAST NOTIFICATIONS ── */
export const Toast = ({ toast, onClose }) => {
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div className={`toast toast-${toast.type || 'info'}`}>
      <span className="toast-message">{toast.message}</span>
      <button className="toast-close" onClick={onClose}>✕</button>
    </div>
  );
};


export default Toast;
