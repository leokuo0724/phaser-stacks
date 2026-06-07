import { Haptics, ImpactStyle } from "@capacitor/haptics";

import { emitter } from "~/shared/event-bus";

/**
 * Native feedback as an *event-bus subscriber* (docs/architecture.md §8) — the haptic
 * mirror of the visual `HitFeedback` pop. It listens for the same `game:hit` moment and
 * fires a device vibration.
 *
 * Haptics has a web implementation (`navigator.vibrate`, where supported) and is a safe
 * no-op on desktop, so this runs everywhere and simply "lights up" on a phone.
 *
 * Returns a teardown function.
 */
export function setupNativeFeedback(): () => void {
  const onHit = () => {
    void Haptics.impact({ style: ImpactStyle.Light });
  };

  emitter.on("game:hit", onHit);
  return () => emitter.off("game:hit", onHit);
}
