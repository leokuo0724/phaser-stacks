/**
 * Whether the user has asked the OS to reduce motion. The Phaser layer honours the same
 * `prefers-reduced-motion` signal the CSS does, so screen-shake and particle bursts are
 * skipped for players who opt out. Read at the moment of use (not cached) so a mid-session
 * OS change is respected.
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
