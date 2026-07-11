import Phaser from "phaser";

/**
 * A small pool of floating "+N" score labels drawn on the canvas (docs/architecture.md §6).
 *
 * Text objects are reused, never re-allocated: a hit borrows a dormant label, animates it
 * up-and-out, then returns it to the pool. That keeps the hot path (a tap, possibly several
 * per second) allocation-free. Pooled labels are set inactive + invisible, so the X-Ray
 * overlay skips them until they are actually on screen.
 */
export class PopupPool {
  private readonly pool: Phaser.GameObjects.Text[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  /** Float a label up from (x, y). `color` is a `0xRRGGBB` literal. */
  spawn(x: number, y: number, text: string, color: number): void {
    const label = this.acquire();
    label
      .setText(text)
      .setColor(Phaser.Display.Color.IntegerToColor(color).rgba)
      .setPosition(x, y)
      .setOrigin(0.5)
      .setScale(0.6)
      .setAngle(Phaser.Math.Between(-12, 12))
      .setAlpha(1)
      .setActive(true)
      .setVisible(true);

    this.scene.tweens.add({
      targets: label,
      y: y - 64,
      scale: 1,
      alpha: 0,
      duration: 620,
      ease: "Cubic.easeOut",
      onComplete: () => this.release(label),
    });
  }

  private acquire(): Phaser.GameObjects.Text {
    const dormant = this.pool.find((label) => !label.active);
    if (dormant) return dormant;

    const label = this.scene.add
      .text(0, 0, "", {
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        fontSize: "30px",
        fontStyle: "bold",
        stroke: "#050912",
        strokeThickness: 5,
      })
      .setActive(false)
      .setVisible(false)
      .setDepth(10);
    this.pool.push(label);
    return label;
  }

  private release(label: Phaser.GameObjects.Text): void {
    label.setActive(false).setVisible(false);
  }
}
