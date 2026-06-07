import Phaser from "phaser";

import { emitter } from "~/shared/event-bus";
import { DIFFICULTY, DifficultyConfig } from "~/shared/rules";
import { selectDifficulty, selectTimeLeft } from "~/store/game/selectors";
import { addScore, endGame, tick } from "~/store/game/slice";

import { SCENE_KEYS, TEXTURE_KEYS } from "../constants";
import { StoreManager } from "../managers/store-manager";

/**
 * The game core (docs/architecture.md §2 & §6).
 *
 * What this scene OWNS: spawning targets, the spawn/countdown timers, hit detection,
 * and all the "juice" (tweens). What it does NOT own: any screen/menu/modal, and the
 * canonical score/timer values — those live in Redux and the UI renders them.
 *
 * It talks to the rest of the app through exactly two channels:
 *   • StoreManager  — read difficulty, write score/tick/end   (state, nouns)
 *   • emitter       — receive ui:* control, send game:* events (moments, verbs)
 */
export class GameScene extends Phaser.Scene {
  private store = StoreManager.instance;
  private targets!: Phaser.GameObjects.Group;
  private spawnTimer?: Phaser.Time.TimerEvent;
  private countdownTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super(SCENE_KEYS.GAME);
  }

  create() {
    this.targets = this.add.group();

    // UI → Phaser control signals. Bound once; cleaned up on shutdown.
    emitter.on("ui:start", this.handleStart);
    emitter.on("ui:pause", this.handlePause);
    emitter.on("ui:resume", this.handleResume);
    emitter.on("ui:quit", this.handleQuit);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup);
  }

  // --- control handlers (arrow fns so `this` binds and we can `off` them) ---

  private handleStart = () => {
    this.clearTargets();
    const difficulty = this.store.select(selectDifficulty);
    const cfg = DIFFICULTY[difficulty];

    this.spawnTimer?.remove();
    this.countdownTimer?.remove();

    this.spawnTimer = this.time.addEvent({
      delay: cfg.spawnIntervalMs,
      loop: true,
      callback: () => this.spawnTarget(cfg),
    });
    this.countdownTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: this.handleTick,
    });

    this.spawnTarget(cfg); // one immediately so the round starts with feedback
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

    // pop in
    this.tweens.add({
      targets: target,
      scale: 1,
      duration: 140,
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

  private onHit(target: Phaser.GameObjects.Image, points: number) {
    target.disableInteractive();

    // state: the score change (a noun the UI will render)
    this.store.dispatch(addScore(points));
    // moment: a one-off the UI can react to (sound, score-pop) — a verb
    emitter.emit("game:hit", { x: target.x, y: target.y, points });

    this.tweens.add({
      targets: target,
      scale: 1.4,
      alpha: 0,
      duration: 180,
      ease: "Quad.out",
      onComplete: () => target.destroy(),
    });
  }

  // --- teardown ---

  private stopRound() {
    this.spawnTimer?.remove();
    this.countdownTimer?.remove();
    this.spawnTimer = undefined;
    this.countdownTimer = undefined;
    this.clearTargets();
  }

  private clearTargets() {
    this.targets?.clear(true, true);
  }

  private cleanup = () => {
    emitter.off("ui:start", this.handleStart);
    emitter.off("ui:pause", this.handlePause);
    emitter.off("ui:resume", this.handleResume);
    emitter.off("ui:quit", this.handleQuit);
  };
}
