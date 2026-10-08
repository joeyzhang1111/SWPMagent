import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const showToast = useCallback((msg) => {
    clearTimeout(timerRef.current);
    setToast({ msg, fading: false });
    timerRef.current = setTimeout(() => {
      setToast((t) => (t ? { ...t, fading: true } : t));
      setTimeout(() => setToast(null), 300);
    }, 2500);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <div className="toast-message" style={{ opacity: toast.fading ? 0 : 1 }}>
          {toast.msg}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
