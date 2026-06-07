import { PhaserCanvas } from "~/react/PhaserCanvas";
import { GameOverModal } from "~/react/screens/GameOverModal";
import { HitFeedback } from "~/react/screens/HitFeedback";
import { Hud } from "~/react/screens/Hud";
import { MainMenu } from "~/react/screens/MainMenu";
import { PauseModal } from "~/react/screens/PauseModal";
import { selectStatus } from "~/store/game/selectors";
import { useAppSelector } from "~/store/hooks";

/**
 * The product shell. `status` from Redux decides which screen the UI shows over the
 * always-running canvas. This is the "screen flow" responsibility that belongs to the UI
 * framework, not the game engine.
 */
export default function App() {
  const status = useAppSelector(selectStatus);

  return (
    <>
      {/* bottom layer: the game */}
      <PhaserCanvas />

      {/* top layer: the UI overlay (pointer-events transparent except its children) */}
      <div className="ui-layer">
        {(status === "playing" || status === "paused") && <Hud />}
        <HitFeedback />

        {status === "idle" && <MainMenu />}
        {status === "paused" && <PauseModal />}
        {status === "over" && <GameOverModal />}
      </div>
    </>
  );
}
