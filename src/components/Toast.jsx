import React, { createContext, useContext, useState } from 'react';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState({ open: false, msg: '', type: 'info' });

  const showToast = (msg, type = 'info') => {
    setToast({ open: true, msg, type });
    setTimeout(() => setToast({ ...toast, open: false }), 3500);
  };

  const styles = {
    position: 'fixed',
    top: 20,
    right: 20,
    padding: '12px 24px',
    borderRadius: 6,
    color: '#fff',
    fontWeight: 500,
    zIndex: 9999,
    backgroundColor: toast.type === 'error' ? '#dc3545' : toast.type === 'success' ? '#28a745' : '#007bff',
    transition: 'all 0.3s ease'
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast.open && <div style={styles}>{toast.msg}</div>}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);