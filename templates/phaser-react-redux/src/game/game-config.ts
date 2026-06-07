import Phaser from "phaser";

import { BootScene } from "./scenes/boot-scene";
import { GameScene } from "./scenes/game-scene";

/**
 * Phaser config. `parent` is intentionally omitted here — <PhaserCanvas /> supplies the
 * DOM element it owns at construction time, so React controls the mount point and
 * lifecycle (docs/architecture.md §2).
 */
export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  backgroundColor: "#0e1116",
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, GameScene],
};
