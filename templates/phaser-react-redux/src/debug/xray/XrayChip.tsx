interface XrayChipProps {
  enabled: boolean;
  onToggle: () => void;
}

/**
 * The always-visible corner affordance. It doubles as discoverability — a reader who never
 * reads the docs still finds X-Ray mode — so it stays subtle until switched on.
 */
export function XrayChip({ enabled, onToggle }: XrayChipProps) {
  return (
    <button
      type="button"
      className={`xray-chip ${enabled ? "is-on" : ""}`}
      onClick={onToggle}
      aria-pressed={enabled}
      title="Toggle X-Ray architecture view — press x"
    >
      <span className="xray-chip__dot" aria-hidden="true" />
      X-RAY
    </button>
  );
}
