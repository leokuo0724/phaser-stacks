/**
 * The "heat" ramp for hit feedback. As a combo climbs, particles and score pops shift from
 * the cool UI cyan toward a hot magenta/amber — a purely visual cue that reads instantly.
 * Kept as `0xRRGGBB` literals so Phaser tint/graphics APIs consume them directly.
 */
const HEAT: readonly number[] = [
  0x4cc9f0, // 1× — cool cyan (matches the UI accent)
  0x5eead4, // teal
  0xa3e635, // lime
  0xfacc15, // amber
  0xfb7185, // rose
  0xff4d6d, // hot magenta — top of the ramp
];

/** Pick a hit colour for a combo count (1-based). Higher combo → hotter. */
export function heatColor(combo: number): number {
  const index = Math.min(Math.max(combo - 1, 0), HEAT.length - 1);
  return HEAT[index];
}
