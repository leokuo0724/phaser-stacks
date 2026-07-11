import { emitter } from "~/shared/event-bus";
import { Difficulty } from "~/shared/rules";
import { selectDifficulty } from "~/store/game/selectors";
import { setDifficulty, startGame } from "~/store/game/slice";
import { useAppDispatch, useAppSelector } from "~/store/hooks";

import { Button } from "../ui/Button";

const DIFFICULTIES: Difficulty[] = ["easy", "normal", "hard"];

export function MainMenu() {
  const dispatch = useAppDispatch();
  const difficulty = useAppSelector(selectDifficulty);

  const handleStart = () => {
    // 1. set state, then 2. fire the moment that tells Phaser to begin.
    dispatch(startGame());
    emitter.emit("ui:start");
  };

  return (
    <div className="panel panel--center" data-xray-label="MainMenu">
      <h1 className="title">Popper</h1>
      <p className="subtitle">
        Tap the targets. 30 seconds. A demo of the React + Phaser + Redux split.
      </p>

      <div className="field">
        <span className="field__label">Difficulty</span>
        <div className="segmented">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              className={`segmented__item ${
                d === difficulty ? "is-active" : ""
              }`}
              onClick={() => dispatch(setDifficulty(d))}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <Button onClick={handleStart}>Start</Button>
    </div>
  );
}
