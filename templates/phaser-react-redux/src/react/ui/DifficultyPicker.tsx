import { Difficulty } from "~/shared/rules";
import { selectDifficulty } from "~/store/game/selectors";
import { setDifficulty } from "~/store/game/slice";
import { useAppDispatch, useAppSelector } from "~/store/hooks";

const DIFFICULTIES: Difficulty[] = ["easy", "normal", "hard"];

/**
 * The three-way difficulty control, shared by the main menu and the pause modal.
 *
 * It dispatches `setDifficulty` straight to Redux — plain state, no event bus. From the menu
 * that seeds the next round; from the pause modal it changes the *live* difficulty, which the
 * running GameScene picks up through its store `subscribe` (docs Q3, React → Phaser via state).
 */
export function DifficultyPicker() {
  const dispatch = useAppDispatch();
  const difficulty = useAppSelector(selectDifficulty);

  return (
    <div className="field">
      <span className="field__label">Difficulty</span>
      <div className="segmented">
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            className={`segmented__item ${d === difficulty ? "is-active" : ""}`}
            onClick={() => dispatch(setDifficulty(d))}
            data-xray-label="DifficultyOption"
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  );
}
