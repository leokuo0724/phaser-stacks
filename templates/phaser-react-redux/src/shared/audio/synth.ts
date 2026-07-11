/**
 * A tiny, dependency-free Web Audio synth. It owns nothing game-specific — it just turns
 * declarative "tone" requests into oscillator + gain-envelope nodes. Both layers use it
 * through {@link ./sfx}: Phaser for gameplay sounds, React for UI clicks. Living in
 * `shared/` (next to the event bus) it stays framework-agnostic, so a Vue/Zustand variant
 * reuses it verbatim.
 *
 * Zero audio files: every sound is generated at runtime. ~90 lines, no runtime dependency.
 */

export interface ToneSpec {
  /** starting frequency in Hz */
  freq: number;
  /** seconds the tone lasts */
  duration: number;
  type?: OscillatorType;
  /** peak gain (0–1) before the master/mute stage */
  gain?: number;
  /** if set, the frequency ramps to this value over `duration` (a sweep) */
  sweepTo?: number;
  /** attack time in seconds */
  attack?: number;
}

const MUTE_STORAGE_KEY = "popper:muted";

let context: AudioContext | null = null;
let master: GainNode | null = null;
let muted = readMutedPreference();

/**
 * Lazily create (and resume) the AudioContext. Called from within user-gesture-driven
 * play calls, which satisfies the browser autoplay policy — the first sound is always a
 * click or a tap. Returns null if Web Audio is unavailable.
 */
function ensureContext(): AudioContext | null {
  if (context) {
    if (context.state === "suspended") void context.resume();
    return context;
  }
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;

  context = new Ctor();
  master = context.createGain();
  master.gain.value = 0.6;
  master.connect(context.destination);
  return context;
}

/** Play a single enveloped tone. No-op while muted or if audio is unavailable. */
export function playTone(spec: ToneSpec): void {
  if (muted) return;
  const ctx = ensureContext();
  if (!ctx || !master) return;

  const now = ctx.currentTime;
  const attack = spec.attack ?? 0.005;
  const peak = spec.gain ?? 0.2;

  const osc = ctx.createOscillator();
  osc.type = spec.type ?? "triangle";
  osc.frequency.setValueAtTime(spec.freq, now);
  if (spec.sweepTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(spec.sweepTo, 1),
      now + spec.duration,
    );
  }

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, now);
  env.gain.exponentialRampToValueAtTime(peak, now + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, now + spec.duration);

  osc.connect(env);
  env.connect(master);
  osc.start(now);
  osc.stop(now + spec.duration + 0.02);
}

export function isMuted(): boolean {
  return muted;
}

/** Set (and persist) the mute preference. */
export function setMuted(value: boolean): void {
  muted = value;
  try {
    window.localStorage.setItem(MUTE_STORAGE_KEY, value ? "1" : "0");
  } catch {
    // Private-mode / storage-disabled: fall back to in-memory only.
  }
  // Touching the context on a user gesture keeps it unlocked for the next unmuted play.
  if (!value) ensureContext();
}

function readMutedPreference(): boolean {
  try {
    return window.localStorage.getItem(MUTE_STORAGE_KEY) === "1";
  } catch {
    return false; // default ON (unmuted)
  }
}
