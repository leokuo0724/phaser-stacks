import { useEffect, useRef, useState } from "react";

import { emitter } from "~/shared/event-bus";
import type { GameEvents } from "~/shared/event-keys";

import { XRAY_EVENT_LOG_SIZE } from "./constants";

type EventName = keyof GameEvents;
type Lane = "react" | "phaser" | "store";

interface LogEntry {
  id: number;
  type: EventName;
  payload: unknown;
  time: number;
}

/**
 * Subscribes to the mitt wildcard and streams the last {@link XRAY_EVENT_LOG_SIZE} events,
 * newest first. Colour follows the naming convention: `ui:*` blue (React → Phaser),
 * `game:*` orange (Phaser → React), everything else neutral.
 *
 * It is only mounted while X-Ray is on, so the wildcard listener exists only then.
 */
export function XrayEventLog() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    const onAny = (type: EventName, payload?: unknown) => {
      setEntries((prev) => {
        const entry: LogEntry = {
          id: nextId.current++,
          type,
          payload,
          time: Date.now(),
        };
        return [entry, ...prev].slice(0, XRAY_EVENT_LOG_SIZE);
      });
    };

    emitter.on("*", onAny);
    return () => emitter.off("*", onAny);
  }, []);

  return (
    <aside className="xray-panel xray-log" aria-label="Event bus log">
      <header className="xray-panel__head">
        <span
          className="xray-panel__dot xray-panel__dot--phaser"
          aria-hidden="true"
        />
        event bus
      </header>
      <ol className="xray-log__list">
        {entries.length === 0 && (
          <li className="xray-log__empty">waiting for events…</li>
        )}
        {entries.map((entry) => (
          <li
            key={entry.id}
            className={`xray-log__row xray-log__row--${laneOf(entry.type)}`}
          >
            <span className="xray-log__time">{clock(entry.time)}</span>
            <span className="xray-log__type">{entry.type}</span>
            <span className="xray-log__payload">
              {formatPayload(entry.payload)}
            </span>
          </li>
        ))}
      </ol>
    </aside>
  );
}

function laneOf(type: string): Lane {
  if (type.startsWith("ui:")) return "react";
  if (type.startsWith("game:")) return "phaser";
  return "store";
}

function clock(time: number): string {
  const date = new Date(time);
  const hms = date.toLocaleTimeString([], { hour12: false });
  return `${hms}.${String(date.getMilliseconds()).padStart(3, "0")}`;
}

function formatPayload(payload: unknown): string {
  if (payload === undefined || payload === null) return "";
  if (typeof payload !== "object") return String(payload);
  const parts = Object.entries(payload as Record<string, unknown>).map(
    ([key, value]) =>
      `${key}:${typeof value === "number" ? Math.round(value) : JSON.stringify(value)}`,
  );
  return `{${parts.join(",")}}`;
}
