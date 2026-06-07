import Phaser from "phaser";
import { useEffect, useRef } from "react";

import { gameConfig } from "~/game/game-config";

/**
 * Owns the Phaser.Game lifecycle (docs/architecture.md §2).
 *
 * The canvas is mounted into a <div> this component renders, but it lives as the bottom
 * layer of the page — the UI floats above it. React creates the game on mount and
 * destroys it on unmount; nothing else in the app touches the instance.
 */
export function PhaserCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    // Guard against StrictMode double-invoke / HMR re-runs.
    if (!hostRef.current || gameRef.current) return;

    const game = new Phaser.Game({ ...gameConfig, parent: hostRef.current });
    gameRef.current = game;

    if (import.meta.env.DEV) {
      // Handy for the console and Playwright E2E.
      (window as unknown as { __GAME__?: Phaser.Game }).__GAME__ = game;
    }

    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div ref={hostRef} className="game-canvas" aria-hidden="true" />;
}
