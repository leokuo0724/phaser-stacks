import type { Unsubscribe } from "@reduxjs/toolkit";
import Phaser from "phaser";

import { playGameOver, playHit, playSpawn } from "~/shared/audio/sfx";
import { emitter } from "~/shared/event-bus";
import {
  BURST,
  COMBO,
  comboMultiplier,
  Difficulty,
  DIFFICULTY,
  DifficultyConfig,
  SHAKE,
} from "~/shared/rules";
import {
  selectCombo,
  selectDifficulty,
  selectStatus,
  selectTimeLeft,
} from "~/store/game/selectors";
import {
  endGame,
  type GameStatus,
  registerHit,
  resetCombo,
  tick,
} from "~/store/game/slice";

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
 *   • StoreManager  — read difficulty/combo/status, write score/combo/tick/end, and drive
 *                     the round lifecycle off `status` transitions        (state, nouns)
 *   • emitter       — receive `ui:celebrate`, send `game:hit`             (moments, verbs)
 *
 * Store-first lifecycle: round start/pause/resume/quit are *status changes*, i.e. remembered
 * state, so they arrive through the store subscription — not the bus. Everything the scene
 * reacts to funnels through one handler (`handleStoreChange`): a single breakpoint, and every
 * transition is visible in Redux DevTools and reproducible from a state snapshot. The bus is
 * reserved for true one-shots that have no noun form (docs/architecture.md §5).
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
  /** Store `subscribe` teardown. Forgetting to call this on shutdown leaks the listener. */
  private unsubscribe?: Unsubscribe;
  /** Last difficulty we acted on — the store fires on *every* change, so we diff. */
  private lastDifficulty: Difficulty = this.store.select(selectDifficulty);
  /** Last status we drove the scene to — same reason: diff to catch true transitions. */
  private prevStatus: GameStatus = this.store.select(selectStatus);

  constructor() {
    super(SCENE_KEYS.GAME);
  }

  create() {
    this.targets = this.add.group();
    this.popups = new PopupPool(this);
    this.burst = new HitBurst(this);

    // UI → Phaser, the ONE remaining bus verb: a pure "throw confetti" moment (Q4).
    // Bound once; cleaned up on shutdown.
    emitter.on("ui:celebrate", this.handleCelebrate);

    // React → Phaser over *state*: subscribe means "something in the store changed". We
    // don't know what, so we diff the slices we care about and apply them — no events. This
    // one funnel drives BOTH the live difficulty (Q3) and the whole round lifecycle
    // (start/pause/resume/quit as `status` transitions). Unsubscribed in cleanup()
    // (forgetting that leaks the listener).
    this.unsubscribe = this.store.subscribe(this.handleStoreChange);

    // A tap that lands on nothing breaks the combo. Phaser reports what the pointer was
    // over; an empty list means empty canvas.
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown);

    this.exposeTestSeam();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup);
  }

  // --- round lifecycle (driven by `status` transitions, see handleStoreChange) ---

  /** Start (or restart) a round: reset timers/combo and spawn. Shared by a fresh start and
   *  a play-again, since both are just "arrive in `playing` with a clean slate". */
  private startRound() {
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
  }

  /** Freeze the scene: timers and physics halt, targets stay on screen behind the modal. */
  private pauseRound() {
    if (!this.scene.isPaused()) this.scene.pause();
  }

  /** Unfreeze only — the round resumes exactly where it left off. A difficulty change made
   *  while paused was already applied live by the difficulty diff, so nothing to re-arm. */
  private resumeRound() {
    if (this.scene.isPaused()) this.scene.resume();
  }

  /** Tear the round down (quit to menu). Unpause first so timers can be cleanly removed. */
  private teardownRound() {
    if (this.scene.isPaused()) this.scene.resume();
    this.stopRound();
  }

  /**
   * Q4: a pure verb from React. Fire a few celebratory bursts and return — no store touched.
   * There is deliberately no `isCelebrating` noun: it would need someone to clear it, whereas
   * a fire-and-forget moment cleans up after itself. That is exactly why the bus exists.
   */
  private handleCelebrate = () => {
    if (prefersReducedMotion()) return;
    const { width, height } = this.scale;
    const bursts = Phaser.Math.Between(3, 5);
    for (let i = 0; i < bursts; i++) {
      const x = Phaser.Math.Between(40, width - 40);
      const y = Phaser.Math.Between(40, height - 40);
      this.burst.fire(
        x,
        y,
        heatColor(Phaser.Math.Between(1, 6)),
        BURST.maxCount,
      );
    }
  };

  // --- the single store funnel (React → Phaser via store subscribe) ---

  /**
   * Fired on *every* store change. We don't know what changed, so we diff each slice the
   * scene cares about. This is the one funnel to breakpoint when debugging any React→Phaser
   * flow: difficulty (live cadence) and status (round lifecycle) both land here.
   */
  private handleStoreChange = () => {
    // 1) live difficulty — re-arm spawn cadence mid-round when it changes.
    const nextDifficulty = this.store.select(selectDifficulty);
    if (nextDifficulty !== this.lastDifficulty) {
      this.lastDifficulty = nextDifficulty;
      this.applyDifficulty(nextDifficulty);
    }

    // 2) round lifecycle — drive start/pause/resume/quit off the status transition.
    const nextStatus = this.store.select(selectStatus);
    if (nextStatus !== this.prevStatus) {
      const prevStatus = this.prevStatus;
      this.prevStatus = nextStatus;
      this.applyStatusTransition(prevStatus, nextStatus);
    }
  };

  /**
   * The exhaustive status → status transition map. Store-first means these are the ONLY
   * entry points to the round lifecycle; there is no parallel event path to keep in sync.
   */
  private applyStatusTransition(prev: GameStatus, next: GameStatus) {
    // Quit to menu is reachable from any prior status, so handle it before the pair switch.
    if (next === "idle") {
      this.teardownRound();
      return;
    }

    switch (`${prev}->${next}` as const) {
      case "idle->playing": // fresh start from the menu
      case "over->playing": // play again — same reset+spawn path as a fresh start
        this.startRound();
        break;
      case "paused->playing": // resume — unfreeze only, targets/timers untouched
        this.resumeRound();
        break;
      case "playing->paused": // pause — freeze the scene
        this.pauseRound();
        break;
      case "playing->over": // scene-originated: handleTick already stopped the round and
        break; //             played the game-over juice. Idempotent no-op; the store change
      //                    is just the UI catching up to what the scene already did.
      default:
        // Exhaustive-with-warn: any transition we didn't plan for surfaces as a visible
        // warning instead of a silent no-op — the teaching habit that turns "nothing
        // happened" bugs into a line in the console pointing at the exact prev→next.
        console.warn("unhandled status transition", prev, next);
    }
  }

  /** Swap the active config and, if a round is live, re-arm the spawn cadence immediately. */
  private applyDifficulty(difficulty: Difficulty) {
    this.activeCfg = DIFFICULTY[difficulty];
    // targetLifetimeMs / pointsPerHit are read from activeCfg at spawn/hit time, so they
    // take effect on the next target automatically; only the running spawn timer needs a
    // live re-arm to change the interval mid-round.
    if (this.spawnTimer) {
      this.spawnTimer.remove();
      this.spawnTimer = this.time.addEvent({
        delay: this.activeCfg.spawnIntervalMs,
        loop: true,
        callback: () => this.spawnTarget(this.activeCfg),
      });
    }
  }

  // --- game loop ---

  private handleTick = () => {
    this.store.dispatch(tick());
    if (this.store.select(selectTimeLeft) <= 0) {
      // Scene-originated game over: stop the round and play juice, then record the status
      // change. `endGame` flips status playing → over, which re-enters handleStoreChange;
      // that `playing->over` transition is a deliberate no-op (the work is already done
      // here). No `game:over` event: the status change IS the signal, and the UI reacts to
      // `status === "over"`.
      this.stopRound();
      this.playGameOverJuice();
      this.store.dispatch(endGame());
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
    emitter.off("ui:celebrate", this.handleCelebrate);
    this.input.off(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown);
    this.unsubscribe?.(); // release the store subscription — forgetting this leaks it
    this.unsubscribe = undefined;
  };
}
