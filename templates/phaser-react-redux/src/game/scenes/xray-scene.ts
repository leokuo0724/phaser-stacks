import Phaser from "phaser";

import { XRAY_COLOR, XRAY_COLOR_HEX } from "~/debug/xray/constants";
import { emitter } from "~/shared/event-bus";

import { SCENE_KEYS } from "../constants";

/**
 * The Phaser half of X-Ray mode (docs/architecture.md §9).
 *
 * When enabled it draws an orange bounding box + type label around every live display
 * object in {@link GameScene}, so the canvas layer's structure becomes visible next to the
 * blue DOM outlines the React side draws. It runs *above* GameScene as a sibling and never
 * touches gameplay: it holds no interactive objects, so pointer input still falls through
 * to the targets below.
 *
 * Boundary discipline: this is Phaser code, so it may import from `shared/` and the
 * framework-agnostic `debug/xray/constants`, but never from React. The enable/disable
 * signal arrives over the event bus (`debug:xray`) — React owns that state; the scene only
 * reacts. On boot the scene asks React to (re)send the current value (`debug:xray-sync`) so
 * a `?xray=1` deep-link is honoured even though the scene starts after React mounts.
 *
 * Cost when off: the scene sleeps, so Phaser skips its update and render entirely — no
 * per-frame work until it is woken.
 */
export class XrayScene extends Phaser.Scene {
  private gfx!: Phaser.GameObjects.Graphics;
  /** Pooled labels, grown on demand and reused frame to frame. */
  private labels: Phaser.GameObjects.Text[] = [];
  /** Scratch rectangle so `getBounds` allocates nothing per object per frame. */
  private readonly bounds = new Phaser.Geom.Rectangle();

  constructor() {
    super(SCENE_KEYS.XRAY);
  }

  create() {
    this.gfx = this.add.graphics();

    emitter.on("debug:xray", this.handleToggle);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup);

    // Start dormant; React tells us the real state in response to the sync request.
    this.scene.sleep();
    emitter.emit("debug:xray-sync");
  }

  update() {
    // Only reached while awake (enabled) — a sleeping scene is never updated.
    const game = this.scene.get(SCENE_KEYS.GAME);
    if (!game) return;

    this.gfx.clear();
    this.gfx.lineStyle(1, XRAY_COLOR.phaser, 0.9);

    let used = 0;
    for (const obj of game.children.list) {
      const box = boundsOf(obj, this.bounds);
      if (!box) continue;

      this.gfx.strokeRect(box.x, box.y, box.width, box.height);

      const label = this.labelAt(used++);
      label.setText(describe(obj));
      label.setPosition(box.x, box.y - 14);
      label.setVisible(true);
    }

    // Retire any labels left over from a busier frame.
    for (let i = used; i < this.labels.length; i++) {
      this.labels[i].setVisible(false);
    }
  }

  // --- toggle (from the event bus) ---

  private handleToggle = ({ enabled }: { enabled: boolean }) => {
    // wake()/sleep() queue an operation for the next scene step rather than applying it
    // now, so we call them unconditionally: if this fires during create() (the boot-time
    // sync reply), the queued sleep() then wake() resolve in order and the scene ends awake.
    if (enabled) {
      this.scene.wake();
      this.scene.bringToTop();
    } else {
      this.gfx.clear();
      for (const label of this.labels) label.setVisible(false);
      this.scene.sleep();
    }
  };

  // --- label pool ---

  private labelAt(index: number): Phaser.GameObjects.Text {
    let label = this.labels[index];
    if (!label) {
      label = this.add.text(0, 0, "", {
        fontFamily: "monospace",
        fontSize: "11px",
        color: XRAY_COLOR_HEX.phaser,
        backgroundColor: "rgba(0, 0, 0, 0.55)",
        padding: { x: 3, y: 1 },
      });
      this.labels[index] = label;
    }
    return label;
  }

  private cleanup = () => {
    emitter.off("debug:xray", this.handleToggle);
  };
}

/**
 * A display object's bounds in screen space, or `null` if it can't be measured / isn't
 * visible. Uses `GameObject.type` (a stable string set by Phaser) rather than
 * `constructor.name`, which minifiers rewrite.
 */
type Boundable = Phaser.GameObjects.GameObject & {
  visible?: boolean;
  getBounds?: (out?: Phaser.Geom.Rectangle) => Phaser.Geom.Rectangle;
};

function boundsOf(
  obj: Phaser.GameObjects.GameObject,
  out: Phaser.Geom.Rectangle,
): Phaser.Geom.Rectangle | null {
  const candidate = obj as Boundable;
  if (!obj.active || candidate.visible === false) return null;
  if (typeof candidate.getBounds !== "function") return null;
  return candidate.getBounds(out);
}

function describe(obj: Phaser.GameObjects.GameObject): string {
  const key = (obj as Phaser.GameObjects.Image).texture?.key;
  const named = key && key !== "__DEFAULT" && key !== "__MISSING";
  return named ? `${obj.type}(${key})` : obj.type;
}
