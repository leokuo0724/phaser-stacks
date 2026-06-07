import { Preferences } from "@capacitor/preferences";
import type { Middleware } from "@reduxjs/toolkit";

import { selectHighScore } from "../game/selectors";

const KEY = "phaser-stacks:high-score";

/**
 * Read the persisted high score at startup. Capacitor Preferences uses the native store on
 * device (UserDefaults / SharedPreferences) and falls back to `localStorage` on the web —
 * so this same call works in the browser demo and on a phone.
 */
export async function loadPersistedHighScore(): Promise<number | null> {
  const { value } = await Preferences.get({ key: KEY });
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * A cross-cutting *store* concern (docs/architecture.md §3, §8): whenever the high score
 * changes, persist it. This is the idiomatic place for "save on change" — game scenes and
 * UI components stay unaware that persistence even exists.
 */
export const persistHighScoreMiddleware: Middleware =
  (store) => (next) => (action) => {
    const before = selectHighScore(store.getState());
    const result = next(action);
    const after = selectHighScore(store.getState());
    if (after !== before) {
      void Preferences.set({ key: KEY, value: String(after) });
    }
    return result;
  };
