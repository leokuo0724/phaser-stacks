/**
 * Pure gameplay rules shared by the store (initial/derived state) and the Phaser scene
 * (loop tuning). Keeping these framework-agnostic means neither layer imports the other.
 */
export type Difficulty = "easy" | "normal" | "hard";

export const ROUND_SECONDS = 30;

export interface DifficultyConfig {
  /** ms between target spawns */
  spawnIntervalMs: number;
  /** ms a target stays on screen before vanishing */
  targetLifetimeMs: number;
  /** points awarded per hit */
  pointsPerHit: number;
}

export const DIFFICULTY: Record<Difficulty, DifficultyConfig> = {
  easy: { spawnIntervalMs: 900, targetLifetimeMs: 1600, pointsPerHit: 1 },
  normal: { spawnIntervalMs: 650, targetLifetimeMs: 1100, pointsPerHit: 2 },
  hard: { spawnIntervalMs: 450, targetLifetimeMs: 750, pointsPerHit: 3 },
};
