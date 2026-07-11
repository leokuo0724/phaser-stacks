import Phaser from "phaser";

import { SCENE_KEYS, TEXTURE_KEYS } from "../constants";

/**
 * Where asset loading lives in a real project. To keep this template free of binary
 * assets, we generate every texture procedurally instead of `this.load.image(...)`.
 * Swap in a real preload here when you add art.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.BOOT);
  }

  create() {
    this.createTargetTexture();
    this.createSparkTexture();

    // Background runs underneath GAME; X-Ray only scans GAME, so the drifting stars never
    // clutter the debug overlay. Launch it first so it renders at the bottom of the stack.
    this.scene.launch(SCENE_KEYS.BACKGROUND);
    this.scene.start(SCENE_KEYS.GAME);
    // The X-Ray overlay runs in parallel, above GAME. It puts itself to sleep until
    // enabled, so it costs nothing until a developer switches it on (docs §9).
    this.scene.launch(SCENE_KEYS.XRAY);
  }

  /** The tappable target: a glowing cyan puck with a bright core. */
  private createTargetTexture() {
    const radius = 40;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x0b3d52, 1);
    g.fillCircle(radius, radius, radius);
    g.fillStyle(0x4cc9f0, 1);
    g.fillCircle(radius, radius, radius * 0.82);
    g.lineStyle(5, 0xd8f6ff, 0.95);
    g.strokeCircle(radius, radius, radius - 4);
    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(radius, radius, radius * 0.26);
    g.generateTexture(TEXTURE_KEYS.TARGET, radius * 2, radius * 2);
    g.destroy();
  }

  /**
   * A soft round dot with a feathered edge, drawn once to a CanvasTexture via a radial
   * gradient. Tinted at runtime, it doubles as both the particle spark and a background
   * star — one 32×32 texture, no image files.
   */
  private createSparkTexture() {
    const size = 32;
    const canvasTexture = this.textures.createCanvas(
      TEXTURE_KEYS.SPARK,
      size,
      size,
    );
    if (!canvasTexture) return;

    const ctx = canvasTexture.getContext();
    const half = size / 2;
    const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradient.addColorStop(0.4, "rgba(255, 255, 255, 0.85)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    canvasTexture.refresh();
  }
}
