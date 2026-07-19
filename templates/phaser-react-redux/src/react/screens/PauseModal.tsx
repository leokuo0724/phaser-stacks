import { quitToMenu, resumeGame } from "~/store/game/slice";
import { useAppDispatch } from "~/store/hooks";

import { Button } from "../ui/Button";
import { DifficultyPicker } from "../ui/DifficultyPicker";

export function PauseModal() {
  const dispatch = useAppDispatch();

  const handleResume = () => {
    // Store-first: status paused → playing; the scene unfreezes off that transition.
    dispatch(resumeGame());
  };

  const handleQuit = () => {
    // Store-first: status → idle; the scene tears the round down off that transition.
    dispatch(quitToMenu());
  };

  return (
    <div className="overlay">
      <div className="panel panel--center" data-xray-label="PauseModal">
        <h2 className="title title--sm">Paused</h2>
        {/* Change difficulty here → the running scene applies it live via store subscribe
            (docs Q3). pause → 改難度 → resume → spawn cadence has already changed. */}
        <DifficultyPicker />
        <Button onClick={handleResume}>Resume</Button>
        <Button variant="ghost" onClick={handleQuit}>
          Quit to menu
        </Button>
      </div>
    </div>
  );
}
