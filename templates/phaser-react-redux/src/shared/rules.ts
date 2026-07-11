/**
 * Pure gameplay rules shared by the store (initial/derived state) and the Phaser scene
 * (loop tuning). Keeping these framework-agnostic means neither layer imports the other.
 *
 * This is the single tuning surface for the whole demo: durations, difficulty, the combo
 * curve, and the "juice" magnitudes (screen-shake, particle counts) all live here so they
 * can be tweaked in one place.
 */
export type Difficulty = "easy" | "normal" | "hard";

export const ROUND_SECONDS = 30;

export interface DifficultyConfig {
  /** ms between target spawns */
  spawnIntervalMs: number;
  /** ms a target stays on screen before vanishing */
  targetLifetimeMs: number;
  /** points awarded per hit (before the combo multiplier) */
  pointsPerHit: number;
}

export const DIFFICULTY: Record<Difficulty, DifficultyConfig> = {
  easy: { spawnIntervalMs: 900, targetLifetimeMs: 1600, pointsPerHit: 1 },
  normal: { spawnIntervalMs: 650, targetLifetimeMs: 1100, pointsPerHit: 2 },
  hard: { spawnIntervalMs: 450, targetLifetimeMs: 750, pointsPerHit: 3 },
};

/**
 * Combo tuning. A combo is a run of consecutive hits landed inside {@link COMBO.windowMs}
 * of each other; letting the window lapse (or tapping empty space) resets it. The counter
 * is 1-based — the first hit of a run is combo 1.
 */
export const COMBO = {
  /** ms after a hit within which the next hit keeps the combo alive */
  windowMs: 1200,
  /** the multiplier is clamped here so late-round runs stay readable */
  maxMultiplier: 5,
} as const;

/**
 * The score multiplier for a given combo count. A deliberately gentle, readable curve:
 * every two consecutive hits raises the multiplier by one, capped at {@link COMBO.maxMultiplier}.
 *
 *   combo:      1  2  3  4  5  6  7  8  9+
 *   multiplier: 1  1  2  2  3  3  4  4  5
 */
export function comboMultiplier(combo: number): number {
  if (combo <= 1) return 1;
  return Math.min(Math.ceil(combo / 2), COMBO.maxMultiplier);
}

/**
 * Camera-shake magnitudes. `intensity` is a fraction of the viewport (Phaser's convention),
 * so it stays subtle on every screen size. Bigger combos shake a touch harder.
 */
export const SHAKE = {
  hitMs: 90,
  hitIntensity: 0.004,
  hitPerComboIntensity: 0.001,
  hitMaxIntensity: 0.012,
  overMs: 420,
  overIntensity: 0.011,
} as const;

/** How many particles a hit throws — scales with the combo, then clamps. */
export const BURST = {
  baseCount: 8,
  perComboCount: 2,
  maxCount: 26,
} as const;
