import Phaser from "phaser";

import { prefersReducedMotion } from "../util/motion";
import { SCENE_KEYS, TEXTURE_KEYS } from "../constants";

const STAR_COUNT = 46;
/** Two parallax bands: distant (slow/dim/small) and near (faster/brighter/larger). */
const NEAR_BAND = 0.4;

interface Star {
  sprite: Phaser.GameObjects.Image;
  /** upward drift in px per 60fps frame */
  speed: number;
  /** gentle horizontal sway amplitude, in px */
  sway: number;
  /** per-star phase so the sway isn't synchronised */
  phase: number;
  baseX: number;
}

/**
 * A cheap, living backdrop that renders *below* GameScene (docs/architecture.md §2).
 *
 * It is a separate scene on purpose: the stars are display objects, and keeping them out of
 * GameScene means the X-Ray overlay (which scans GameScene only) stays focused on the
 * gameplay it is teaching. The look is a soft vertical gradient plus a slow, two-depth
 * parallax starfield — entirely code-generated from one tinted dot texture.
 *
 * Performance: the star pool is allocated once; `update` only mutates existing positions,
 * so there are no per-frame allocations. When the OS asks to reduce motion, the drift is
 * frozen and the field simply sits still.
 */
export class BackgroundScene extends Phaser.Scene {
  private gradient!: Phaser.GameObjects.Graphics;
  private stars: Star[] = [];
  private reducedMotion = false;

  constructor() {
    super(SCENE_KEYS.BACKGROUND);
  }

  create() {
    this.reducedMotion = prefersReducedMotion();

    this.gradient = this.add.graphics();
    this.paintGradient();
    this.createStars();

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
  }

  update(_time: number, delta: number) {
    if (this.reducedMotion) return;

    const { height } = this.scale;
    const step = delta / 16.667; // normalise to a 60fps frame
    for (const star of this.stars) {
      star.sprite.y -= star.speed * step;
      star.phase += 0.01 * step;
      star.sprite.x = star.baseX + Math.sin(star.phase) * star.sway;
      if (star.sprite.y < -8) {
        // wrap to the bottom and re-scatter horizontally
        star.baseX = Phaser.Math.Between(0, this.scale.width);
        star.sprite.x = star.baseX;
        star.sprite.y = height + 8;
      }
    }
  }

  private createStars() {
    const { width, height } = this.scale;
    for (let i = 0; i < STAR_COUNT; i++) {
      const near = Math.random() < NEAR_BAND;
      const baseX = Phaser.Math.Between(0, width);
      const sprite = this.add
        .image(baseX, Phaser.Math.Between(0, height), TEXTURE_KEYS.SPARK)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(near ? 0x5cc9f0 : 0x2a3f6b)
        .setAlpha(near ? 0.5 : 0.28)
        .setScale(near ? 0.5 : 0.28);
      this.stars.push({
        sprite,
        speed: near ? 0.28 : 0.12,
        sway: near ? 10 : 4,
        phase: Math.random() * Math.PI * 2,
        baseX,
      });
    }
  }

  /** A two-stop vertical wash: near-black at the edges, a faint blue lift in the centre. */
  private paintGradient() {
    const { width, height } = this.scale;
    const top = 0x0a1220;
    const mid = 0x111d33;
    this.gradient.clear();
    this.gradient.fillGradientStyle(top, top, mid, mid, 1);
    this.gradient.fillRect(0, 0, width, height * 0.55);
    this.gradient.fillGradientStyle(mid, mid, top, top, 1);
    this.gradient.fillRect(0, height * 0.55, width, height * 0.45);
  }

  private handleResize = () => {
    this.paintGradient();
  };

  private cleanup = () => {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
  };
}
