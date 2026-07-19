import { startGame } from "~/store/game/slice";
import { useAppDispatch } from "~/store/hooks";

import { Button } from "../ui/Button";
import { DifficultyPicker } from "../ui/DifficultyPicker";

export function MainMenu() {
  const dispatch = useAppDispatch();

  const handleStart = () => {
    // Store-first: just move status idle → playing. The scene watches the store and starts
    // the round off that transition — no separate "begin" event to fire and keep in sync.
    dispatch(startGame());
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
