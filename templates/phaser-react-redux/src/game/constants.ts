/** Stable string keys for Phaser scenes and generated textures. */
export const SCENE_KEYS = {
  BOOT: "boot",
  GAME: "game",
  /** The X-Ray debug overlay, launched above GAME (docs/architecture.md §9). */
  XRAY: "xray",
} as const;

export const TEXTURE_KEYS = {
  TARGET: "target",
} as const;
