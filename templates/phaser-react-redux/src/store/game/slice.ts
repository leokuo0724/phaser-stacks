import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { comboMultiplier, Difficulty, ROUND_SECONDS } from "~/shared/rules";

import { readHighScore } from "../middleware/persist-high-score";

export type GameStatus = "idle" | "playing" | "paused" | "over";

export interface GameState {
  status: GameStatus;
  score: number;
  timeLeft: number;
  highScore: number;
  difficulty: Difficulty;
  /** Length of the current consecutive-hit run; 0 when idle (docs/architecture.md §3). */
  combo: number;
}

const initialState: GameState = {
  status: "idle",
  score: 0,
  timeLeft: ROUND_SECONDS,
  highScore: readHighScore(),
  difficulty: "normal",
  combo: 0,
};

/**
 * The single source of truth both layers read. React binds to it with hooks; Phaser
 * reaches it through the StoreManager bridge. Note what is NOT here: sprite positions,
 * velocities, timers — that 60fps data stays inside Phaser (docs/architecture.md §3).
 */
export const gameSlice = createSlice({
  name: "game",
  initialState,
  reducers: {
    setDifficulty: (state, action: PayloadAction<Difficulty>) => {
      // Allowed from the menu (idle/over) AND mid-round while paused — the pause modal's
      // switcher lets the running scene pick the change up live through its store
      // `subscribe` (docs Q3). Ignored while actively playing so cadence can't shift
      // without the user deliberately opening the pause menu.
      if (state.status !== "playing") {
        state.difficulty = action.payload;
      }
    },
    startGame: (state) => {
      state.status = "playing";
      state.score = 0;
      state.timeLeft = ROUND_SECONDS;
      state.combo = 0;
    },
    /**
     * Record one hit. The scene owns the *timing* (whether the combo window is still open);
     * this reducer stays the authority on the *score*, applying the combo curve so the
     * multiplier lives with the rest of the pure rules rather than in the scene.
     */
    registerHit: (
      state,
      action: PayloadAction<{ base: number; combo: number }>,
    ) => {
      const { base, combo } = action.payload;
      state.combo = combo;
      state.score += base * comboMultiplier(combo);
    },
    /** The combo window lapsed, or a tap hit nothing. */
    resetCombo: (state) => {
      state.combo = 0;
    },
    tick: (state) => {
      if (state.status !== "playing") return;
      state.timeLeft = Math.max(0, state.timeLeft - 1);
    },
    pauseGame: (state) => {
      if (state.status === "playing") state.status = "paused";
    },
    resumeGame: (state) => {
      if (state.status === "paused") state.status = "playing";
    },
    endGame: (state) => {
      state.status = "over";
      state.highScore = Math.max(state.highScore, state.score);
    },
    quitToMenu: (state) => {
      state.status = "idle";
      state.score = 0;
      state.timeLeft = ROUND_SECONDS;
      state.combo = 0;
    },
  },
});

export const {
  setDifficulty,
  startGame,
  registerHit,
  resetCombo,
  tick,
  pauseGame,
  resumeGame,
  endGame,
  quitToMenu,
} = gameSlice.actions;

export const gameReducer = gameSlice.reducer;
