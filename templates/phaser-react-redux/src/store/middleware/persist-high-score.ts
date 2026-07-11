import type { Middleware } from "@reduxjs/toolkit";

import type { GameState } from "../game/slice";

/**
 * Persists `highScore` to `localStorage` so it survives a page reload — the same
 * "save on change" concern the Capacitor doc calls out (docs/architecture.md §8), just
 * exercised on the web/Preferences side. It's a store middleware rather than a reducer
 * side effect because persistence is cross-cutting infrastructure, not a game rule: the
 * slice stays a pure function of actions, and this listens in from outside.
 */
const HIGH_SCORE_STORAGE_KEY = "popper:high-score";

/** Read the persisted best, or `0` if unset / storage is unavailable (private mode, SSR). */
export function readHighScore(): number {
  try {
    const raw = window.localStorage.getItem(HIGH_SCORE_STORAGE_KEY);
    const value = raw === null ? 0 : Number(raw);
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function writeHighScore(value: number): void {
  try {
    window.localStorage.setItem(HIGH_SCORE_STORAGE_KEY, String(value));
  } catch {
    // Private-mode / storage-disabled: fall back to in-memory only.
  }
}

/** Writes `state.game.highScore` to `localStorage` whenever it increases. */
export const persistHighScoreMiddleware: Middleware<
  Record<string, never>,
  { game: GameState }
> = (store) => (next) => (action) => {
  const previous = store.getState().game.highScore;
  const result = next(action);
  const current = store.getState().game.highScore;
  if (current !== previous) writeHighScore(current);
  return result;
};
