import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const show = useCallback((text, isErr = false) => {
    clearTimeout(timer.current);
    setToast({ text, isErr });
    timer.current = setTimeout(() => setToast(null), isErr ? 6000 : 3000);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={'toast' + (toast?.isErr ? ' err' : '')} role="status" aria-live="polite" hidden={!toast}>
        {toast?.text}
      </div>
    </ToastContext.Provider>
  );
}
