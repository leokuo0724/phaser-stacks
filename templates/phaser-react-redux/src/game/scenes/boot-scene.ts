import Phaser from "phaser";

import { SCENE_KEYS, TEXTURE_KEYS } from "../constants";

/**
 * Where asset loading lives in a real project. To keep this template free of binary
 * assets, we generate the target texture procedurally instead of `this.load.image(...)`.
 * Swap in a real preload here when you add art.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.BOOT);
  }

  create() {
    this.createTargetTexture();
    this.scene.start(SCENE_KEYS.GAME);
  }

  private createTargetTexture() {
    const radius = 40;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x4cc9f0, 1);
    g.fillCircle(radius, radius, radius);
    g.lineStyle(6, 0xffffff, 0.9);
    g.strokeCircle(radius, radius, radius - 3);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(radius, radius, radius * 0.28);
    g.generateTexture(TEXTURE_KEYS.TARGET, radius * 2, radius * 2);
    g.destroy();
  }
}
