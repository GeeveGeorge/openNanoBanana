"use client";

import { useState, useEffect, useCallback } from "react";

export function useLocalStorage(key: string, initialValue: string) {
  const [value, setValue] = useState(initialValue);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) setValue(stored);
    } catch {
      // localStorage not available
    }
    setLoaded(true);
  }, [key]);

  const set = useCallback(
    (newValue: string) => {
      setValue(newValue);
      try {
        localStorage.setItem(key, newValue);
      } catch {
        // localStorage not available
      }
    },
    [key],
  );

  return [value, set, loaded] as const;
}
