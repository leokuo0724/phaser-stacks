# Architecture

This document explains the framework-agnostic contract shared by every Phaser Stacks
template. If you understand this page, you can read any template — or write a new one
(say, Vue + Pinia) — in an afternoon.

The **invariants** below hold for every stack: two layers, the framework owning the game
lifecycle, a single source of truth, a thin state bridge, and the event bus. Only one
thing legitimately changes per stack — the _concrete_ store API the bridge wraps (§4) —
and that is exactly what the bridge exists to isolate. Where the concrete code differs,
this page shows a per-stack mapping and each template's README has the real source.

## 1. Two layers, one screen

A web-framework + Phaser app renders **two independent layers** stacked on the same
viewport:

- **Canvas layer** (`Phaser.Game`) — sits at the bottom (`z-index: 0`).
- **UI layer** (React/Vue DOM) — sits on top (`z-index: 1`).

The UI layer is **transparent to pointer events** (`pointer-events: none`) so taps fall
through to the canvas by default. Individual UI elements (buttons, panels, modals) opt
back in with `pointer-events: auto`. This is what lets a HUD float over a live game
without stealing input from the play area.

The canvas is **not** rendered inside a component subtree. It is a sibling layer whose
_lifecycle_ happens to be controlled by a component. This keeps Phaser's render loop
independent of UI re-renders.

## 2. Lifecycle: the framework owns the game

One component is responsible for the `Phaser.Game` instance:

- On mount → `new Phaser.Game({ ...config, parent: <its own div> })`.
- On unmount → `game.destroy(true)`.
- Guard against double-creation (StrictMode / HMR / remounts).
- In dev, expose the instance on `window` so E2E tests and the console can reach it.

Nothing else in the UI should create or destroy the game.

## 3. State: one source of truth

Shared, persistent, "product" state lives in the state library and is the **single
source of truth both layers read**:

- Status (`idle` / `playing` / `paused` / `over`)
- Score, timers, progression, currency
- Settings (difficulty, sound, locale)

Rules of thumb:

- **If the UI needs to render it, it belongs in the store.** (score, status, settings)
- **If only the game core needs it frame-to-frame, keep it in Phaser.** (sprite
  positions, velocities, tween handles, particle emitters) — do **not** push 60fps data
  into the store.

The store is **organized by domain**: each feature owns its state, its read accessors,
and any cross-cutting concerns (auto-save, analytics). The concrete mechanism differs per
template — a Redux slice + middleware, a Zustand store + middleware, a Pinia store +
plugin — but the domain split is identical.

## 4. The state bridge (`StoreManager`)

Phaser scenes run **outside** the UI framework, so they cannot use React hooks or Vue
composables to reach the store. They go through a thin singleton — the **state bridge** —
that exposes exactly three operations:

1. **read** a value from the store (once, e.g. at the start of an update)
2. **write** a change to the store
3. **subscribe** to changes over time

This is the one part of the architecture whose _concrete_ shape depends on the state
library — and that is the point. The bridge is the **only** file game code uses to touch
the store, so swapping libraries means rewriting this one file, not every scene.

```ts
// phaser-react-redux — the bridge in this template
StoreManager.instance.select(selectDifficulty); // read
StoreManager.instance.dispatch(addScore(10)); //   write
StoreManager.instance.subscribe(onChange); //      subscribe
```

The same three operations map cleanly onto every stack — only the syntax changes:

| Operation | Redux Toolkit         | Zustand                  | Pinia                  |
| --------- | --------------------- | ------------------------ | ---------------------- |
| read      | `select(selector)`    | `store.getState().x`     | `store.x`              |
| write     | `dispatch(action())`  | `store.getState().fn()`  | `store.fn()`           |
| subscribe | `store.subscribe(fn)` | `store.subscribe(fn)`    | `store.$subscribe(fn)` |

The UI side never uses the bridge; it binds with the framework's idiomatic API
(`useSelector` / `storeToRefs` / `useStore`) so components re-render correctly.

## 5. The event bus (verbs, not nouns)

Some things crossing the boundary are **moments**, not state: "the player hit a target",
"the round is over", "start now". Putting these in the store is awkward (you'd set a flag
and immediately clear it). Instead, use a tiny typed pub/sub:

```ts
emitter.emit("game:hit", { x, y }); // Phaser → UI (play a sound, pop an animation)
emitter.emit("ui:start");           // UI → Phaser (begin spawning)
```

Direction is by convention in the event name:

- `ui:*` — UI → Phaser control signals (`start`, `pause`, `resume`, `quit`).
- `game:*` — Phaser → UI notifications (`hit`, `over`).

Event payloads are typed in one place (`shared/event-keys.ts`), so both sides share a
checked contract.

### State vs. event bus — how to decide

| Question | Use |
| --- | --- |
| Does the UI need to **render** this continuously? | **State** |
| Is it a **one-off moment** that triggers a reaction? | **Event bus** |
| Would I set a flag and immediately reset it? | **Event bus** |
| Should it survive a reload / be persisted? | **State** |

## 6. Putting it together — a frame in the life of a tap

1. User taps **Start** in the menu (UI). It writes `status = playing` to the store, then
   `emitter.emit("ui:start")`.
2. The `GameScene` hears `ui:start`, reads `difficulty` via the bridge, and starts its
   spawn + countdown timers (game loop).
3. User taps a target on the canvas (Phaser input). The scene writes the score increase to
   the store and `emitter.emit("game:hit", { x, y })`.
4. The HUD (UI) re-renders the new score from the store; a hit sound plays in response to
   the event.
5. The countdown reaches zero. The scene ends the round in the store (which also updates
   the high score) and `emitter.emit("game:over")`.
6. The UI sees `status === "over"` and renders the game-over modal.

Notice the symmetry: **state flows through the store, moments flow through the bus, and
the canvas lifecycle is owned by exactly one component.**

## 7. Trade-offs vs. Unity / Godot

**You gain:** one language/toolchain end-to-end; the web's mature UI/layout/a11y/i18n
stack for free; instant browser distribution; Capacitor for mobile from the same source;
web testing (component tests + Playwright that can drive the DOM and the game together).

**You pay:** a lower raw rendering ceiling than native engines; a do-it-yourself asset
pipeline; a smaller ecosystem of game-specific tooling (level editors, animation
graphs); and you must be disciplined about not leaking 60fps data into the UI layer.

For UI-heavy games (card games, sports sims, management, puzzle, narrative) the web stack
is often a _better_ fit than a native engine. For rendering-bound action games, weigh it
carefully.

## 8. Extending to native (Capacitor)

[Capacitor](https://capacitorjs.com/) is **orthogonal** to the framework × state-library
axis: it wraps the same Vite build into iOS/Android without changing the architecture.

It ships as a dedicated template — [`phaser-react-redux-capacitor`](../templates/phaser-react-redux-capacitor) —
which is the base `phaser-react-redux` **plus two files** (and the Capacitor config). We
provide it as a separate template so the mobile starter is clone-and-run, while the base
stays pure web. What we deliberately do **not** do is clone a `*-capacitor` variant for
_every_ framework × state combination — that is a combinatorial trap. The integration is
identical regardless of framework or state library, so the recipe below ports to any base.

The key insight: the two native integrations land on the **same connection points you
already have** — no new concepts.

| Native capability | Where it plugs in | Mirrors |
| --- | --- | --- |
| **Persistence** (high score) | a **store middleware** (`store/middleware/persist-high-score.ts`) — a cross-cutting concern (§3) | the "save on change" you'd add anyway |
| **Haptics** (buzz on hit) | an **event-bus subscriber** (`native/feedback.ts`) reacting to `game:hit` (§5) | `HitFeedback` — the visual pop, now a haptic pop |

Both use Capacitor plugins that have **web implementations** (Preferences → `localStorage`,
Haptics → `navigator.vibrate`), so the browser demo keeps working and the same code simply
"lights up" on a device. Truly native-only calls (orientation lock, status bar) would be
guarded with `Capacitor.isNativePlatform()`.

So "going native" doesn't fork the design — it adds **one middleware and one bus
subscriber**. The bridge, scenes, and screens are untouched. The native projects
(`ios/`, `android/`) are generated on demand (`npx cap add …`) and git-ignored, so the
template still clones-and-runs as pure web. See the template README for build/run steps.
