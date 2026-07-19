/**
 * The cross-boundary event contract.
 *
 * State (Redux) holds *nouns* — score, status, settings. This bus carries *verbs* —
 * one-off moments that one side fires and the other reacts to. See docs/architecture.md §5.
 *
 * Naming convention encodes direction:
 *   ui:*    → fired by React, handled by Phaser (control signals)
 *   game:*  → fired by Phaser, handled by React (notifications)
 *   debug:* → the X-Ray tooling (both directions); see src/debug/xray/
 */
export type GameEvents = {
  // UI → Phaser
  "ui:start": undefined;
  "ui:pause": undefined;
  "ui:resume": undefined;
  "ui:quit": undefined;
  // A pure verb with no noun form: "throw some confetti, now". There is nothing to store —
  // a `isCelebrating` flag would just need someone to clear it — so it only ever lives as a
  // one-off moment on the bus. This is the case the event bus exists for (docs Q4).
  "ui:celebrate": void;

  // Phaser → UI
  //   points — the score actually awarded (base × combo multiplier)
  //   combo  — the length of the current consecutive-hit run (1-based)
  "game:hit": { x: number; y: number; points: number; combo: number };
  "game:over": undefined;

  // Debug (X-Ray mode). React owns the toggle state; the toggle signal travels the bus
  // instead of a global, so the debug feature itself demonstrates the contract
  // (docs/architecture.md §9).
  "debug:xray": { enabled: boolean }; // React → Phaser: turn the canvas overlay on/off
  "debug:xray-sync": undefined; //        Phaser → React: XrayScene is ready, resend state
};
