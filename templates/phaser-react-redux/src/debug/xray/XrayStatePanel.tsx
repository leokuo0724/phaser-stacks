import {
  selectCombo,
  selectDifficulty,
  selectHighScore,
  selectScore,
  selectStatus,
  selectTimeLeft,
} from "~/store/game/selectors";
import { useAppSelector } from "~/store/hooks";

import { useFlashOnChange } from "./useFlashOnChange";

/**
 * A compact live view of the Redux game slice — the shared source of truth both layers
 * read. Each row flash-highlights when its value changes, so you can watch state update in
 * response to the events streaming in the log next to it.
 *
 * It reads through the same typed selectors the UI uses; the panel adds no state of its own.
 */
export function XrayStatePanel() {
  const status = useAppSelector(selectStatus);
  const score = useAppSelector(selectScore);
  const timeLeft = useAppSelector(selectTimeLeft);
  const highScore = useAppSelector(selectHighScore);
  const difficulty = useAppSelector(selectDifficulty);
  const combo = useAppSelector(selectCombo);

  return (
    <aside className="xray-panel xray-state" aria-label="Redux game state">
      <header className="xray-panel__head">
        <span
          className="xray-panel__dot xray-panel__dot--store"
          aria-hidden="true"
        />
        redux · game
      </header>
      <dl className="xray-state__rows">
        <StateRow label="status" value={status} />
        <StateRow label="score" value={score} />
        <StateRow label="combo" value={combo} />
        <StateRow label="timeLeft" value={timeLeft} />
        <StateRow label="highScore" value={highScore} />
        <StateRow label="difficulty" value={difficulty} />
      </dl>
    </aside>
  );
}

interface StateRowProps {
  label: string;
  value: string | number;
}

function StateRow({ label, value }: StateRowProps) {
  const flashing = useFlashOnChange(value);
  return (
    <div className={`xray-state__row ${flashing ? "is-flash" : ""}`}>
      <dt className="xray-state__key">{label}</dt>
      <dd className="xray-state__value">{value}</dd>
    </div>
  );
}
