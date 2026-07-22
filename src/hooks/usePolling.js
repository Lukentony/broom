import { useEffect, useRef } from 'react';

export function usePolling(callback, interval = 30000) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        savedCallback.current();
      }
    };

    const id = setInterval(tick, interval);
    return () => clearInterval(id);
  }, [interval]);
}