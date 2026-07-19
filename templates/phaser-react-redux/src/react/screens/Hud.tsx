import { playUiClick } from "~/shared/audio/sfx";
import { emitter } from "~/shared/event-bus";
import { comboMultiplier } from "~/shared/rules";
import {
  selectCombo,
  selectScore,
  selectStatus,
  selectTimeLeft,
} from "~/store/game/selectors";
import { pauseGame } from "~/store/game/slice";
import { useAppDispatch, useAppSelector } from "~/store/hooks";

import { usePulse } from "../hooks/usePulse";
import { MuteButton } from "../ui/MuteButton";

/**
 * The heads-up display: renders canonical score/time/combo straight from Redux. It holds no
 * game logic — the scene drives these numbers; the HUD only displays them, adding a small
 * "pop" when the score or combo changes so the numbers feel alive.
 */
export function Hud() {
  const dispatch = useAppDispatch();
  const score = useAppSelector(selectScore);
  const timeLeft = useAppSelector(selectTimeLeft);
  const combo = useAppSelector(selectCombo);
  const status = useAppSelector(selectStatus);

  const scorePulse = usePulse(score);
  const comboPulse = usePulse(combo);

  const handlePause = () => {
    // Store-first: flip status playing → paused; the scene freezes off that transition.
    dispatch(pauseGame());
  };

  // Q4: fire a pure verb at Phaser. No state changes — just a moment on the bus, which the
  // scene turns into a confetti burst. Only meaningful mid-round, so disabled otherwise.
  const handleCelebrate = () => {
    playUiClick();
    emitter.emit("ui:celebrate");
  };

  return (
    <div className="hud" data-xray-label="Hud">
      <div className="hud__stat">
        <span className="hud__label">Score</span>
        <span
          key={scorePulse.key}
          className={`hud__value hud__value--score ${scorePulse.pulsing ? "is-pulse" : ""}`}
        >
          {score}
        </span>
      </div>

      <div className="hud__center">
        <div className="hud__controls">
          <MuteButton />
          <button
            className="icon-btn"
            onClick={handleCelebrate}
            disabled={status !== "playing"}
            aria-label="Celebrate"
            data-xray-label="CelebrateButton"
          >
            🎉
          </button>
          <button className="icon-btn" onClick={handlePause} aria-label="Pause">
            ❚❚
          </button>
        </div>
        {combo >= 2 && (
          <div
            key={comboPulse.key}
            className={`combo ${comboPulse.pulsing ? "is-pulse" : ""}`}
            data-xray-label="ComboBadge"
          >
            <span className="combo__count">{combo}×</span>
            <span className="combo__mult">×{comboMultiplier(combo)} score</span>
          </div>
        )}
      </div>

      <div className="hud__stat hud__stat--right">
        <span className="hud__label">Time</span>
        <span className="hud__value hud__value--time">{timeLeft}</span>
      </div>
    </div>
  );
}
