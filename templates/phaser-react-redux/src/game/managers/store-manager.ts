import type { Unsubscribe } from "@reduxjs/toolkit";

import { AppDispatch, RootState, store } from "~/store";

/**
 * The state bridge (docs/architecture.md §4).
 *
 * Phaser scenes run outside React, so they cannot use `useSelector` / `useDispatch`.
 * They go through this thin singleton, which wraps the raw store. It is the ONLY place
 * game code touches Redux — so swapping the state library means rewriting just this file,
 * not every scene.
 */
export class StoreManager {
  private static _instance: StoreManager | null = null;

  static get instance(): StoreManager {
    if (!StoreManager._instance) {
      StoreManager._instance = new StoreManager();
    }
    return StoreManager._instance;
  }

  private constructor() {}

  /** Read a slice of state once (e.g. at the start of an update). */
  select<T>(selector: (state: RootState) => T): T {
    return selector(store.getState());
  }

  /** Dispatch an action — same action creators the UI uses. */
  dispatch: AppDispatch = store.dispatch.bind(store);

  /** Subscribe to any state change; returns an unsubscribe fn. */
  subscribe(handler: () => void): Unsubscribe {
    return store.subscribe(handler);
  }
}
