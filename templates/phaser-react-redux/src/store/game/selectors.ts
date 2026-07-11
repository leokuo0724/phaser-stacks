import type { RootState } from "~/store";

export const selectStatus = (s: RootState) => s.game.status;
export const selectScore = (s: RootState) => s.game.score;
export const selectTimeLeft = (s: RootState) => s.game.timeLeft;
export const selectHighScore = (s: RootState) => s.game.highScore;
export const selectDifficulty = (s: RootState) => s.game.difficulty;
export const selectCombo = (s: RootState) => s.game.combo;
