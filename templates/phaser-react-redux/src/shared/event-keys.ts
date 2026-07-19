/**
 * The cross-boundary event contract — reserved for TRUE one-shots.
 *
 * The template's rule of thumb: 該記住的進 store，一次性的走 event bus (state worth
 * remembering → the Redux store; genuine one-off moments → this bus). State (Redux) holds
 * *nouns* — score, status, settings — AND their transitions, because a status change is
 * remembered state, not a fleeting moment. This bus is left with only the handful of pure
 * *verbs* that have no noun form. See docs/architecture.md §5.
 *
 * Naming convention encodes direction:
 *   ui:*    → fired by React, handled by Phaser (control signals)
 *   game:*  → fired by Phaser, handled by React (notifications)
 *   debug:* → the X-Ray tooling (both directions); see src/debug/xray/
 */
export type GameEvents = {
  // UI → Phaser
  // A pure verb with no noun form: "throw some confetti, now". There is nothing to store —
  // a `isCelebrating` flag would just need someone to clear it — so it only ever lives as a
  // one-off moment on the bus. This is the case the event bus exists for (docs Q4).
  // (Round lifecycle — start/pause/resume/quit — is deliberately NOT here: those are status
  // transitions, i.e. remembered state, so they travel through the store instead.)
  "ui:celebrate": void;

  // Phaser → UI
  //   points — the score actually awarded (base × combo multiplier)
  //   combo  — the length of the current consecutive-hit run (1-based)
  "game:hit": { x: number; y: number; points: number; combo: number };
  // (No `game:over` here: game over is an `endGame` status change the scene dispatches to
  // the store; the UI reacts to `status === "over"`, not to a bus event.)

  // Debug (X-Ray mode). React owns the toggle state; the toggle signal travels the bus
  // instead of a global, so the debug feature itself demonstrates the contract
  // (docs/architecture.md §9). This channel is deliberately isolated from the game store:
  // dev-only tooling state must never leak into the gameplay state it is inspecting.
  "debug:xray": { enabled: boolean }; // React → Phaser: turn the canvas overlay on/off
  "debug:xray-sync": undefined; //        Phaser → React: XrayScene is ready, resend state
};
