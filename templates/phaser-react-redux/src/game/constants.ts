/** Stable string keys for Phaser scenes and generated textures. */
export const SCENE_KEYS = {
  BOOT: "boot",
  /** The living background, launched *below* GAME so X-Ray stays focused on gameplay. */
  BACKGROUND: "background",
  GAME: "game",
  /** The X-Ray debug overlay, launched above GAME (docs/architecture.md §9). */
  XRAY: "xray",
} as const;

export const TEXTURE_KEYS = {
  TARGET: "target",
  /** A soft radial dot, tinted at runtime for hit-burst particles and background stars. */
  SPARK: "spark",
} as const;
