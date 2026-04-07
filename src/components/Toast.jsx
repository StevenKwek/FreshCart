import { useEffect } from 'react';

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      onClose();
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) {
    return null;
  }

  return (
    <div className={`toast ${toast.type || 'success'}`}>
      <span>{toast.message}</span>
      <button onClick={onClose} aria-label="Close notification">
        ×
      </button>
    </div>
  );
}

export default Toast;
