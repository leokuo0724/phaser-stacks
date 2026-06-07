import { useEffect, useState } from "react";

import { emitter } from "~/shared/event-bus";

interface Pop {
  id: number;
  x: number;
  y: number;
  points: number;
}

/**
 * Demonstrates the Phaser → UI direction of the event bus: the scene emits "game:hit"
 * with a screen position, and this DOM layer renders a floating "+N" there. Nothing here
 * touches game state — it's a pure reaction to a moment.
 */
export function HitFeedback() {
  const [pops, setPops] = useState<Pop[]>([]);

  useEffect(() => {
    let nextId = 0;
    const onHit = ({
      x,
      y,
      points,
    }: {
      x: number;
      y: number;
      points: number;
    }) => {
      const id = nextId++;
      setPops((prev) => [...prev, { id, x, y, points }]);
      window.setTimeout(() => {
        setPops((prev) => prev.filter((p) => p.id !== id));
      }, 600);
    };

    emitter.on("game:hit", onHit);
    return () => emitter.off("game:hit", onHit);
  }, []);

  return (
    <div className="hit-layer">
      {pops.map((p) => (
        <span key={p.id} className="hit-pop" style={{ left: p.x, top: p.y }}>
          +{p.points}
        </span>
      ))}
    </div>
  );
}
