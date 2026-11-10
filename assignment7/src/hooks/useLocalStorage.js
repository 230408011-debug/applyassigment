import { useEffect, useState } from 'react';
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved === null ? (typeof initialValue === 'function' ? initialValue() : initialValue) : JSON.parse(saved);
    } catch { return typeof initialValue === 'function' ? initialValue() : initialValue; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch { /* The preference still works when browser storage is unavailable. */ }
  }, [key, value]);
  return [value, setValue];
}
