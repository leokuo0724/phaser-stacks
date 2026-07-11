import Phaser from "phaser";

import { TEXTURE_KEYS } from "../constants";

/**
 * One reusable particle emitter for hit bursts (docs/architecture.md §6).
 *
 * Phaser pools the particles internally, so a whole round of hits runs through a single
 * emitter with no per-hit allocation. Each burst is tinted on the fly (cool for a first hit,
 * hot for a big combo) and scales its particle count with the combo.
 */
export class HitBurst {
  private readonly emitter: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene) {
    this.emitter = scene.add
      .particles(0, 0, TEXTURE_KEYS.SPARK, {
        speed: { min: 70, max: 240 },
        angle: { min: 0, max: 360 },
        lifespan: { min: 280, max: 560 },
        scale: { start: 0.7, end: 0 },
        alpha: { start: 1, end: 0 },
        gravityY: 220,
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setDepth(20);
  }

  /** Throw `count` tinted particles from (x, y). `color` is a `0xRRGGBB` literal. */
  fire(x: number, y: number, color: number, count: number): void {
    this.emitter.setParticleTint(color);
    this.emitter.emitParticleAt(x, y, count);
  }
}
