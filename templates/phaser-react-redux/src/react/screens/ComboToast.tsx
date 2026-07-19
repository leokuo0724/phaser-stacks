import { useEffect, useRef, useState } from "react";

import { emitter } from "~/shared/event-bus";
import type { GameEvents } from "~/shared/event-keys";

/** How long a milestone toast stays up before it auto-dismisses. */
const TOAST_MS = 1000;
/** Milestones fire on every Nth hit of a run. */
const MILESTONE_EVERY = 5;

interface Toast {
  combo: number;
  key: number;
}

/**
 * Q2 — Phaser → React over the event bus.
 *
 * Listens to the same `game:hit` verb the scene emits per hit and shows a transient toast
 * whenever the combo crosses a milestone (5, 10, 15…). This is deliberately NOT in Redux:
 * it is a one-shot moment, not a rendered noun. Storing a "current toast" would just add a
 * value someone else has to remember to clear — the moment fires, the toast shows, it
 * dismisses itself. That is exactly the state-vs-bus call this template is teaching.
 */
export function ComboToast() {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<number>();

  useEffect(() => {
    const onHit = ({ combo }: GameEvents["game:hit"]) => {
      if (combo === 0 || combo % MILESTONE_EVERY !== 0) return;
      // A newer milestone replaces the current toast — only one at a time.
      window.clearTimeout(timer.current);
      setToast({ combo, key: Date.now() });
      timer.current = window.setTimeout(() => setToast(null), TOAST_MS);
    };

    emitter.on("game:hit", onHit);
    return () => {
      emitter.off("game:hit", onHit);
      window.clearTimeout(timer.current);
    };
  }, []);

  if (!toast) return null;

  return (
    <div
      key={toast.key}
      className="combo-toast"
      data-xray-label="ComboToast"
      role="status"
      aria-live="polite"
    >
      COMBO ×{toast.combo}!
    </div>
  );
}
