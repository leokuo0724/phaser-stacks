import { XrayChip } from "./XrayChip";
import { XrayEventLog } from "./XrayEventLog";
import { XrayStatePanel } from "./XrayStatePanel";
import { useXray } from "./useXray";

/**
 * The single owner of X-Ray mode (docs/architecture.md §9). Mount it once, inside the UI
 * overlay. It renders the always-visible toggle chip and, only while enabled, the two DOM
 * panels — the Redux state view and the live event-bus log.
 *
 * The other two visualisations live elsewhere by design: the blue DOM outlines are pure CSS
 * driven by `<html data-xray>`, and the orange canvas boxes are drawn by the Phaser
 * `XrayScene`. Everything here is deliberately thin.
 */
export function Xray() {
  const { enabled, toggle } = useXray();

  return (
    <>
      <XrayChip enabled={enabled} onToggle={toggle} />
      {enabled && (
        <>
          <XrayStatePanel />
          <XrayEventLog />
        </>
      )}
    </>
  );
}
