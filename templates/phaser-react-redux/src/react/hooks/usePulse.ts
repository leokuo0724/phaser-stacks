import { useEffect, useRef, useState } from "react";

const PULSE_MS = 260;

/**
 * Returns `true` for a brief beat after `value` changes, so a number can "pop" when the
 * Redux state behind it updates (score ticking up, combo climbing). Skips the first render
 * so nothing pulses on mount. A keyed re-trigger (via a counter) restarts the animation even
 * when the value changes twice in quick succession.
 */
export function usePulse(value: unknown): { pulsing: boolean; key: number } {
  const [state, setState] = useState({ pulsing: false, key: 0 });
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    setState((prev) => ({ pulsing: true, key: prev.key + 1 }));
    const timer = window.setTimeout(
      () => setState((prev) => ({ ...prev, pulsing: false })),
      PULSE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [value]);

  return state;
}
