import { emitter } from "~/shared/event-bus";
import { startGame } from "~/store/game/slice";
import { useAppDispatch } from "~/store/hooks";

import { Button } from "../ui/Button";
import { DifficultyPicker } from "../ui/DifficultyPicker";

export function MainMenu() {
  const dispatch = useAppDispatch();

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

      <DifficultyPicker />

      <Button onClick={handleStart}>Start</Button>
    </div>
  );
}
