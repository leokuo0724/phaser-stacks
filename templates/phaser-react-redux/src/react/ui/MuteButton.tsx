import { useState } from "react";

import { isMuted, setMuted } from "~/shared/audio/sfx";

/**
 * The sound toggle. Audio state lives in the framework-agnostic audio module (and
 * localStorage); this component is just a thin control that mirrors it. Sound is a shared
 * capability, so React reaches the same synth Phaser does — no event-bus round-trip needed.
 */
export function MuteButton() {
  const [muted, setMutedState] = useState(isMuted);

  const toggle = () => {
    const next = !muted;
    setMuted(next); // the tap itself unlocks/keeps the AudioContext alive
    setMutedState(next);
  };

  return (
    <button
      className="icon-btn"
      onClick={toggle}
      aria-pressed={muted}
      aria-label={muted ? "Unmute" : "Mute"}
      data-xray-label="MuteButton"
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}
