import { selectHighScore, selectScore } from "~/store/game/selectors";
import { quitToMenu, startGame } from "~/store/game/slice";
import { useAppDispatch, useAppSelector } from "~/store/hooks";

import { Button } from "../ui/Button";

export function GameOverModal() {
  const dispatch = useAppDispatch();
  const score = useAppSelector(selectScore);
  const highScore = useAppSelector(selectHighScore);
  const isBest = score > 0 && score >= highScore;

  const handlePlayAgain = () => {
    // Store-first: status over → playing; the scene restarts the round off that transition.
    dispatch(startGame());
  };

  const handleMenu = () => {
    // Store-first: status → idle; the scene tears the round down off that transition.
    dispatch(quitToMenu());
  };

  return (
    <div className="overlay">
      <div className="panel panel--center" data-xray-label="GameOverModal">
        <h2 className="title title--sm">Time!</h2>
        <p className="score-big">{score}</p>
        <p className="subtitle">
          {isBest ? "New best!" : `Best: ${highScore}`}
        </p>
        <Button onClick={handlePlayAgain}>Play again</Button>
        <Button variant="ghost" onClick={handleMenu}>
          Menu
        </Button>
      </div>
    </div>
  );
}
