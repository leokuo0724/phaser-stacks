/**
 * The named sounds of the game, composed from the {@link ./synth} primitives. This is the
 * only audio surface the rest of the app touches — Phaser calls the gameplay sounds, React
 * calls {@link playUiClick} from buttons. Re-exports the mute controls so callers have a
 * single import.
 */
import { isMuted, playTone, setMuted } from "./synth";

export { isMuted, setMuted };

/**
 * A hit blip whose pitch rises with the combo — the audible half of the combo climb. Capped
 * so a long run never shrieks.
 */
export function playHit(combo: number): void {
  const step = Math.min(combo - 1, 12);
  playTone({
    freq: 320 * Math.pow(2, step / 12),
    sweepTo: 480 * Math.pow(2, step / 12),
    duration: 0.09,
    type: "triangle",
    gain: 0.22,
  });
}

/** A soft, quiet pop when a target appears. Deliberately understated so it never nags. */
export function playSpawn(): void {
  playTone({
    freq: 660,
    duration: 0.045,
    type: "sine",
    gain: 0.05,
  });
}

/** A short two-note descending sting at the end of a round. */
export function playGameOver(): void {
  playTone({
    freq: 420,
    sweepTo: 180,
    duration: 0.35,
    type: "sawtooth",
    gain: 0.18,
  });
  window.setTimeout(
    () =>
      playTone({
        freq: 220,
        sweepTo: 90,
        duration: 0.45,
        type: "sawtooth",
        gain: 0.16,
      }),
    120,
  );
}

/** A crisp, subtle tick for UI buttons. */
export function playUiClick(): void {
  playTone({
    freq: 880,
    duration: 0.03,
    type: "square",
    gain: 0.06,
  });
}
