import { configureStore } from "@reduxjs/toolkit";

import { gameReducer } from "./game/slice";

/**
 * Feature-sliced store. Add new domains as sibling slices under store/<feature>/.
 */
export const store = configureStore({
  reducer: {
    game: gameReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
