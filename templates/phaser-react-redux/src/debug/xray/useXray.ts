import { useEffect, useRef, useState } from "react";

import { emitter } from "~/shared/event-bus";

/**
 * Owns X-Ray on/off state for the whole app (docs/architecture.md §9).
 *
 * React is the single owner of the flag; the Phaser overlay never reads it directly.
 * Whenever it changes we (a) reflect it onto `<html data-xray>` so the pure-CSS DOM
 * outlines light up with zero runtime cost, and (b) emit `debug:xray` so the XrayScene can
 * wake or sleep. The scene also fires `debug:xray-sync` once it is ready, letting a
 * boot-time `?xray=1` deep-link reach a scene that mounts after React.
 *
 * The only listeners this adds when X-Ray is off are the toggle key and the one-shot sync
 * responder — the visualisations themselves subscribe to nothing until mounted.
 */
export function useXray(): { enabled: boolean; toggle: () => void } {
  const [enabled, setEnabled] = useState(readInitialFlag);

  // Keep the latest value reachable from the (once-bound) sync responder below.
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  // Reflect onto the document root so `:root[data-xray="on"]` selectors activate.
  useEffect(() => {
    const root = document.documentElement;
    if (enabled) {
      root.dataset.xray = "on";
    } else {
      delete root.dataset.xray;
    }
  }, [enabled]);

  // Tell Phaser about every change (and the initial value).
  useEffect(() => {
    emitter.emit("debug:xray", { enabled });
  }, [enabled]);

  // Answer the scene's boot-time request with the current value.
  useEffect(() => {
    const resend = () =>
      emitter.emit("debug:xray", { enabled: enabledRef.current });
    emitter.on("debug:xray-sync", resend);
    return () => emitter.off("debug:xray-sync", resend);
  }, []);

  // `x` toggles, unless the user is typing into a field.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "x" && event.key !== "X") return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      setEnabled((value) => !value);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const toggle = () => setEnabled((value) => !value);
  return { enabled, toggle };
}

function readInitialFlag(): boolean {
  return new URLSearchParams(window.location.search).get("xray") === "1";
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}
