import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";

import type { AppDispatch, RootState } from ".";

/**
 * Typed hooks for the React (UI) layer. The Phaser layer does NOT use these — it cannot
 * call hooks — and reaches the same store through StoreManager instead.
 */
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
