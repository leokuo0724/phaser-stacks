import { emitter } from "~/shared/event-bus";
import { quitToMenu, resumeGame } from "~/store/game/slice";
import { useAppDispatch } from "~/store/hooks";

import { Button } from "../ui/Button";

export function PauseModal() {
  const dispatch = useAppDispatch();

  const handleResume = () => {
    dispatch(resumeGame());
    emitter.emit("ui:resume");
  };

  const handleQuit = () => {
    dispatch(quitToMenu());
    emitter.emit("ui:quit");
  };

  return (
    <div className="overlay">
      <div className="panel panel--center">
        <h2 className="title title--sm">Paused</h2>
        <Button onClick={handleResume}>Resume</Button>
        <Button variant="ghost" onClick={handleQuit}>
          Quit to menu
        </Button>
      </div>
    </div>
  );
}
