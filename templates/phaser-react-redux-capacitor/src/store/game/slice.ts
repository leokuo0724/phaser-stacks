import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { Difficulty, ROUND_SECONDS } from "~/shared/rules";

export type GameStatus = "idle" | "playing" | "paused" | "over";

export interface GameState {
  status: GameStatus;
  score: number;
  timeLeft: number;
  highScore: number;
  difficulty: Difficulty;
}

const initialState: GameState = {
  status: "idle",
  score: 0,
  timeLeft: ROUND_SECONDS,
  highScore: 0,
  difficulty: "normal",
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
      // Only meaningful from the menu; ignore mid-round to keep the bridge honest.
      if (state.status === "idle" || state.status === "over") {
        state.difficulty = action.payload;
      }
    },
    startGame: (state) => {
      state.status = "playing";
      state.score = 0;
      state.timeLeft = ROUND_SECONDS;
    },
    addScore: (state, action: PayloadAction<number>) => {
      state.score += action.payload;
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
    },
    // Hydrate the persisted high score on startup (see store/middleware).
    hydrateHighScore: (state, action: PayloadAction<number>) => {
      state.highScore = Math.max(state.highScore, action.payload);
    },
  },
});

export const {
  setDifficulty,
  startGame,
  addScore,
  tick,
  pauseGame,
  resumeGame,
  endGame,
  quitToMenu,
  hydrateHighScore,
} = gameSlice.actions;

export const gameReducer = gameSlice.reducer;
