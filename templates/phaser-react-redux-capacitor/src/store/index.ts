import { configureStore } from "@reduxjs/toolkit";

import { gameReducer } from "./game/slice";
import { persistHighScoreMiddleware } from "./middleware/persist-high-score";

/**
 * Feature-sliced store. Add new domains as sibling slices under store/<feature>/.
 * Cross-cutting concerns (persistence, analytics, …) go in middleware.
 */
export const store = configureStore({
  reducer: {
    game: gameReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(persistHighScoreMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
