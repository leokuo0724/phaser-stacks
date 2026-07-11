import { emitter } from "~/shared/event-bus";
import { selectScore, selectTimeLeft } from "~/store/game/selectors";
import { pauseGame } from "~/store/game/slice";
import { useAppDispatch, useAppSelector } from "~/store/hooks";

/**
 * The heads-up display: renders canonical score/time straight from Redux. It holds no
 * game logic — the scene drives these numbers; the HUD only displays them.
 */
export function Hud() {
  const dispatch = useAppDispatch();
  const score = useAppSelector(selectScore);
  const timeLeft = useAppSelector(selectTimeLeft);

  const handlePause = () => {
    dispatch(pauseGame());
    emitter.emit("ui:pause");
  };

  return (
    <div className="hud" data-xray-label="Hud">
      <div className="hud__stat">
        <span className="hud__label">Score</span>
        <span className="hud__value">{score}</span>
      </div>

      <button className="hud__pause" onClick={handlePause} aria-label="Pause">
        ❚❚
      </button>

      <div className="hud__stat hud__stat--right">
        <span className="hud__label">Time</span>
        <span className="hud__value">{timeLeft}</span>
      </div>
    </div>
  );
}
