import { useEffect, useState } from 'react';
export function useLocalStorage(key, initialValue, validate = () => true) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      const fallback = () => typeof initialValue === 'function' ? initialValue() : initialValue;
      if (saved === null) return fallback();
      const parsed = JSON.parse(saved);
      return validate(parsed) ? parsed : fallback();
    } catch { return typeof initialValue === 'function' ? initialValue() : initialValue; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch { /* The preference still works when browser storage is unavailable. */ }
  }, [key, value]);
  return [value, setValue];
}
