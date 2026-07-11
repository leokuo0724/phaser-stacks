import Phaser from "phaser";

import { BackgroundScene } from "./scenes/background-scene";
import { BootScene } from "./scenes/boot-scene";
import { GameScene } from "./scenes/game-scene";
import { XrayScene } from "./scenes/xray-scene";

/**
 * Phaser config. `parent` is intentionally omitted here — <PhaserCanvas /> supplies the
 * DOM element it owns at construction time, so React controls the mount point and
 * lifecycle (docs/architecture.md §2).
 */
export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  backgroundColor: "#070b14",
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // Scene *list order* is render order (first = bottom). BootScene (index 0) auto-starts and
  // launches the rest: BackgroundScene renders below GameScene, XrayScene above it.
  scene: [BootScene, BackgroundScene, GameScene, XrayScene],
};
