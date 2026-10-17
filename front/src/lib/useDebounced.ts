import { useEffect, useState } from 'react';

/** Valeur mise à jour après une courte pause (recherche envoyée au serveur après la frappe) */
export function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
