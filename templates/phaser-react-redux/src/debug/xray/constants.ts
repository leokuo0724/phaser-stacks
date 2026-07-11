/**
 * Shared X-Ray constants (docs/architecture.md §9).
 *
 * The accent colours are the single source of truth both layers read: React reads them
 * from the `--xray-*` custom properties in global.css, Phaser reads the numeric literals
 * here for its Graphics / Text. Keep the two in sync — same hex, one meaning per layer:
 *
 *   react  (blue)    — the DOM / product-shell layer
 *   phaser (orange)  — the canvas / game-core layer
 *   store  (neutral) — Redux, the shared source of truth
 *
 * This file is framework-agnostic (plain data), so both a React component and a Phaser
 * scene may import it without crossing the layer boundary.
 */

/** Layer accents as Phaser number literals (`0xRRGGBB`). */
export const XRAY_COLOR = {
  react: 0x4c9ff0,
  phaser: 0xff9838,
  store: 0x9aa4b2,
} as const;

/** The same accents as CSS-style hex strings, for Phaser Text and any string API. */
export const XRAY_COLOR_HEX = {
  react: "#4c9ff0",
  phaser: "#ff9838",
  store: "#9aa4b2",
} as const;

/** How many recent events the live event-bus log keeps in its ring buffer. */
export const XRAY_EVENT_LOG_SIZE = 50;
