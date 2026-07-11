import { useEffect, useRef, useState } from "react";

const FLASH_MS = 600;

/**
 * Returns `true` for a brief window after `value` changes, so a row can flash-highlight
 * when the Redux state behind it updates. Skips the first render so nothing flashes on
 * mount.
 */
export function useFlashOnChange(value: unknown): boolean {
  const [flashing, setFlashing] = useState(false);
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    setFlashing(true);
    const timer = window.setTimeout(() => setFlashing(false), FLASH_MS);
    return () => window.clearTimeout(timer);
  }, [value]);

  return flashing;
}
