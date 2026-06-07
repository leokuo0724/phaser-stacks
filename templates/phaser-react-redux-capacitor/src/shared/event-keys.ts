/**
 * The cross-boundary event contract.
 *
 * State (Redux) holds *nouns* — score, status, settings. This bus carries *verbs* —
 * one-off moments that one side fires and the other reacts to. See docs/architecture.md §5.
 *
 * Naming convention encodes direction:
 *   ui:*    → fired by React, handled by Phaser (control signals)
 *   game:*  → fired by Phaser, handled by React (notifications)
 */
export type GameEvents = {
  // UI → Phaser
  "ui:start": undefined;
  "ui:pause": undefined;
  "ui:resume": undefined;
  "ui:quit": undefined;

  // Phaser → UI
  "game:hit": { x: number; y: number; points: number };
  "game:over": undefined;
};
