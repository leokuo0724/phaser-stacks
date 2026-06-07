import mitt from "mitt";

import type { GameEvents } from "./event-keys";

/**
 * A single, typed pub/sub instance shared by both layers.
 *
 * Import the same `emitter` from React components and from Phaser scenes:
 *   emitter.emit("ui:start");
 *   emitter.on("game:over", () => { ... });
 *
 * It is framework-agnostic on purpose — a Vue or Zustand template reuses this file
 * unchanged.
 */
export const emitter = mitt<GameEvents>();
