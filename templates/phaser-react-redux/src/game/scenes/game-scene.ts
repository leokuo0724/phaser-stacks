import Phaser from "phaser";

import { playGameOver, playHit, playSpawn } from "~/shared/audio/sfx";
import { emitter } from "~/shared/event-bus";
import {
  BURST,
  COMBO,
  comboMultiplier,
  DIFFICULTY,
  DifficultyConfig,
  SHAKE,
} from "~/shared/rules";
import {
  selectCombo,
  selectDifficulty,
  selectTimeLeft,
} from "~/store/game/selectors";
import { endGame, registerHit, resetCombo, tick } from "~/store/game/slice";

import { SCENE_KEYS, TEXTURE_KEYS } from "../constants";
import { HitBurst } from "../juice/hit-burst";
import { heatColor } from "../juice/palette";
import { PopupPool } from "../juice/popup-pool";
import { StoreManager } from "../managers/store-manager";
import { prefersReducedMotion } from "../util/motion";

/**
 * The game core (docs/architecture.md §2 & §6).
 *
 * What this scene OWNS: spawning targets, the spawn/countdown timers, hit detection, the
 * combo *timing*, and all the "juice" (tweens, particles, screen-shake, score pops). What it
 * does NOT own: any screen/menu/modal, and the canonical score/combo/timer values — those
 * live in Redux and the UI renders them.
 *
 * It talks to the rest of the app through exactly two channels:
 *   • StoreManager  — read difficulty/combo, write score/combo/tick/end   (state, nouns)
 *   • emitter       — receive ui:* control, send game:* events            (moments, verbs)
 */
export class GameScene extends Phaser.Scene {
  private store = StoreManager.instance;
  private targets!: Phaser.GameObjects.Group;
  private popups!: PopupPool;
  private burst!: HitBurst;
  private spawnTimer?: Phaser.Time.TimerEvent;
  private countdownTimer?: Phaser.Time.TimerEvent;
  /** Re-armed on every hit; when it fires the combo window has lapsed. */
  private comboWindow?: Phaser.Time.TimerEvent;
  private activeCfg = DIFFICULTY[this.store.select(selectDifficulty)];

  constructor() {
    super(SCENE_KEYS.GAME);
  }

  create() {
    this.targets = this.add.group();
    this.popups = new PopupPool(this);
    this.burst = new HitBurst(this);

    // UI → Phaser control signals. Bound once; cleaned up on shutdown.
    emitter.on("ui:start", this.handleStart);
    emitter.on("ui:pause", this.handlePause);
    emitter.on("ui:resume", this.handleResume);
    emitter.on("ui:quit", this.handleQuit);

    // A tap that lands on nothing breaks the combo. Phaser reports what the pointer was
    // over; an empty list means empty canvas.
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown);

    this.exposeTestSeam();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup);
  }

  // --- control handlers (arrow fns so `this` binds and we can `off` them) ---

  private handleStart = () => {
    this.clearTargets();
    this.activeCfg = DIFFICULTY[this.store.select(selectDifficulty)];

    this.spawnTimer?.remove();
    this.countdownTimer?.remove();
    this.breakCombo();

    this.spawnTimer = this.time.addEvent({
      delay: this.activeCfg.spawnIntervalMs,
      loop: true,
      callback: () => this.spawnTarget(this.activeCfg),
    });
    this.countdownTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: this.handleTick,
    });

    this.spawnTarget(this.activeCfg); // one immediately so the round starts with feedback
  };

  private handlePause = () => {
    if (!this.scene.isPaused()) this.scene.pause();
  };

  private handleResume = () => {
    if (this.scene.isPaused()) this.scene.resume();
  };

  private handleQuit = () => {
    if (this.scene.isPaused()) this.scene.resume();
    this.stopRound();
  };

  // --- game loop ---

  private handleTick = () => {
    this.store.dispatch(tick());
    if (this.store.select(selectTimeLeft) <= 0) {
      this.stopRound();
      this.store.dispatch(endGame());
      this.playGameOverJuice();
      emitter.emit("game:over");
    }
  };

  private spawnTarget(cfg: DifficultyConfig) {
    const { width, height } = this.scale;
    const pad = 60;
    const x = Phaser.Math.Between(pad, width - pad);
    const y = Phaser.Math.Between(pad, height - pad);

    const target = this.add
      .image(x, y, TEXTURE_KEYS.TARGET)
      .setScale(0)
      .setInteractive({ useHandCursor: true });
    this.targets.add(target);
    playSpawn();

    // pop in with a springy overshoot
    this.tweens.add({
      targets: target,
      scale: 1,
      duration: 180,
      ease: "Back.out",
    });

    // auto-expire if not hit in time
    const expire = this.time.delayedCall(cfg.targetLifetimeMs, () => {
      this.tweens.add({
        targets: target,
        scale: 0,
        alpha: 0,
        duration: 160,
        onComplete: () => target.destroy(),
      });
    });

    target.once(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      expire.remove();
      this.onHit(target, cfg.pointsPerHit);
    });
  }

  private onHit(target: Phaser.GameObjects.Image, base: number) {
    target.disableInteractive();

    // combo timing is 60fps data → owned here; the count itself is the shared noun.
    const combo = this.store.select(selectCombo) + 1;
    const awarded = base * comboMultiplier(combo);
    const color = heatColor(combo);

    // state: score + combo (nouns the UI renders)
    this.store.dispatch(registerHit({ base, combo }));
    // moment: a one-off the UI can react to (combo pulse, sound) — a verb
    emitter.emit("game:hit", {
      x: target.x,
      y: target.y,
      points: awarded,
      combo,
    });

    // in-canvas juice
    this.popups.spawn(target.x, target.y, `+${awarded}`, color);
    this.fireBurst(target.x, target.y, color, combo);
    this.shakeOnHit(combo);
    this.squashAndPop(target);
    playHit(combo);

    // keep the combo alive until the window lapses
    this.comboWindow?.remove();
    this.comboWindow = this.time.delayedCall(COMBO.windowMs, this.breakCombo);
  }

  // --- juice helpers ---

  private squashAndPop(target: Phaser.GameObjects.Image) {
    // a quick squash reads as impact, then the puck scales up and fades out
    this.tweens.add({
      targets: target,
      scaleX: 1.3,
      scaleY: 0.7,
      duration: 70,
      ease: "Quad.out",
      onComplete: () => {
        this.tweens.add({
          targets: target,
          scale: 1.5,
          alpha: 0,
          duration: 150,
          ease: "Quad.out",
          onComplete: () => target.destroy(),
        });
      },
    });
  }

  private fireBurst(x: number, y: number, color: number, combo: number) {
    if (prefersReducedMotion()) return;
    const count = Math.min(
      BURST.baseCount + combo * BURST.perComboCount,
      BURST.maxCount,
    );
    this.burst.fire(x, y, color, count);
  }

  private shakeOnHit(combo: number) {
    if (prefersReducedMotion()) return;
    const intensity = Math.min(
      SHAKE.hitIntensity + (combo - 1) * SHAKE.hitPerComboIntensity,
      SHAKE.hitMaxIntensity,
    );
    this.cameras.main.shake(SHAKE.hitMs, intensity);
  }

  private playGameOverJuice() {
    playGameOver();
    if (prefersReducedMotion()) return;
    this.cameras.main.shake(SHAKE.overMs, SHAKE.overIntensity);
    this.cameras.main.flash(220, 255, 70, 70); // brief red-ish wash
  }

  // --- combo timing ---

  private handlePointerDown = (
    _pointer: Phaser.Input.Pointer,
    currentlyOver: Phaser.GameObjects.GameObject[],
  ) => {
    if (currentlyOver.length === 0) this.breakCombo();
  };

  private breakCombo = () => {
    this.comboWindow?.remove();
    this.comboWindow = undefined;
    if (this.store.select(selectCombo) !== 0) this.store.dispatch(resetCombo());
  };

  // --- teardown ---

  private stopRound() {
    this.spawnTimer?.remove();
    this.countdownTimer?.remove();
    this.spawnTimer = undefined;
    this.countdownTimer = undefined;
    this.breakCombo();
    this.clearTargets();
  }

  private clearTargets() {
    this.targets?.clear(true, true);
  }

  /**
   * A DEV-only hook so Playwright can exercise the real hit path — synthetic pointer events
   * don't reach Phaser's input manager, so verification calls this instead of tapping.
   */
  private exposeTestSeam() {
    if (!import.meta.env.DEV) return;
    (
      window as unknown as { __hitTest?: (x?: number, y?: number) => void }
    ).__hitTest = (x = this.scale.width / 2, y = this.scale.height / 2) => {
      const target = this.add
        .image(x, y, TEXTURE_KEYS.TARGET)
        .setScale(1)
        .setInteractive();
      this.targets.add(target);
      this.onHit(target, this.activeCfg.pointsPerHit);
    };
  }

  private cleanup = () => {
    emitter.off("ui:start", this.handleStart);
    emitter.off("ui:pause", this.handlePause);
    emitter.off("ui:resume", this.handleResume);
    emitter.off("ui:quit", this.handleQuit);
    this.input.off(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown);
  };
}
