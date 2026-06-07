# phaser-react-redux-capacitor

A **standalone** starter: **React 18 + Phaser 3 + Redux Toolkit + Vite + TypeScript +
[Capacitor](https://capacitorjs.com/)**, demonstrating a clean responsibility split between
the game core and the product shell — and that the same architecture ships to iOS/Android.

> This is the [`phaser-react-redux`](../phaser-react-redux) template plus a Capacitor layer.
> If you only want the web app, use that one instead. Capacitor here is **two extra files**
> (a store middleware + an event-bus subscriber) — see "Native layer" below.

Copy this folder anywhere — it has no dependency on the monorepo root, and works with any
package manager (npm, pnpm, yarn, bun).

```bash
pnpm install     # or: npm install
pnpm dev         # http://localhost:5173   (or: npm run dev)
pnpm build       # type-check + production build
```

The demo is a 30-second "Popper": tap targets on the canvas to score. The game is
deliberately tiny — the point is the **architecture**, not the gameplay.

## What it shows

- React mounts the page; **Phaser renders underneath** as a transparent-overlay sibling.
- **Redux is the single source of truth** for `status / score / timeLeft / highScore /
  difficulty`. Both layers read it.
- A **`StoreManager` bridge** lets the (hook-less) Phaser scene read and write that store.
- A **typed `mitt` event bus** carries one-off moments across the boundary
  (`ui:start`, `game:hit`, …).
- 60fps data (sprite positions, tweens, timers) **stays inside Phaser** and never touches
  Redux.

See [`../../docs/architecture.md`](../../docs/architecture.md) for the full rationale.

## Where things live

```
src/
├── main.tsx                 # React root + Redux <Provider>
├── App.tsx                  # status-driven screen router; mounts canvas + UI overlay
├── global.css               # the two-layer CSS (canvas under, UI over)
│
├── game/                    # ── PHASER: the game core ──
│   ├── game-config.ts       #   Phaser.Game config (parent injected by React)
│   ├── constants.ts         #   scene + texture keys
│   ├── scenes/
│   │   ├── boot-scene.ts    #   where asset preload lives (texture generated here)
│   │   └── game-scene.ts    #   spawn loop, hit detection, juice — owns 60fps state
│   └── managers/
│       └── store-manager.ts #   THE BRIDGE: the only file game code uses to touch Redux
│
├── react/                   # ── REACT: the product shell ──
│   ├── PhaserCanvas.tsx     #   owns the Phaser.Game lifecycle (create/destroy)
│   ├── screens/             #   MainMenu / Hud / PauseModal / GameOverModal / HitFeedback
│   └── ui/Button.tsx
│
├── store/                   # ── REDUX: single source of truth ──
│   ├── index.ts             #   configureStore + RootState/AppDispatch types
│   ├── hooks.ts             #   typed useAppSelector / useAppDispatch (UI side only)
│   ├── middleware/
│   │   └── persist-high-score.ts  # Capacitor Preferences persistence (cross-cutting)
│   └── game/
│       ├── slice.ts         #   status/score/time/difficulty + reducers
│       └── selectors.ts
│
├── native/                  # ── CAPACITOR: native add-on layer ──
│   └── feedback.ts          #   Haptics on game:hit (an event-bus subscriber)
│
└── shared/                  # ── FRAMEWORK-AGNOSTIC CONTRACT ──
    ├── event-bus.ts         #   the mitt instance (reused verbatim by Vue/Zustand variants)
    ├── event-keys.ts        #   typed event names + payloads
    └── rules.ts             #   pure gameplay tuning, imported by both store and scene
```

## The data flow in one tap

1. **Start** (UI) → `dispatch(startGame())` then `emitter.emit("ui:start")`.
2. `GameScene` hears `ui:start`, reads `difficulty` via the bridge, starts its timers.
3. Tap a target (canvas) → scene `dispatch(addScore())` + `emitter.emit("game:hit")`.
4. The HUD re-renders the score from Redux; `HitFeedback` floats a `+N` from the event.
5. Countdown hits 0 → scene `dispatch(endGame())` + `emitter.emit("game:over")` → the UI
   shows the game-over screen because `status === "over"`.

## Swapping the state library

Because game code only touches Redux through `store-manager.ts`, porting to Zustand (or
anything else) means rewriting **that one file** plus `store/`. The scenes, the event bus,
and the responsibility split stay identical. That is the whole point of the bridge.

## Ship to mobile (Capacitor)

This template includes a working [Capacitor](https://capacitorjs.com/) setup so the same
build runs as a native iOS/Android app — demonstrating that the architecture extends to
mobile without changing the game core. Two integrations show how (see
[`../../docs/architecture.md`](../../docs/architecture.md) §8):

- **High-score persistence** — a store middleware (`store/middleware/persist-high-score.ts`)
  saves to Capacitor **Preferences**. On web it uses `localStorage`, so your best score
  already survives a reload in the browser.
- **Haptics on hit** — an event-bus subscriber (`native/feedback.ts`) buzzes the device on
  `game:hit`. On web it falls back to `navigator.vibrate` (and is a no-op on desktop).

The native projects are generated on demand and git-ignored, so the template still
clones-and-runs as pure web:

```bash
pnpm cap:add:ios       # one-time: generates ios/   (needs Xcode + CocoaPods)
pnpm cap:ios           # build → sync → run on a simulator/device

pnpm cap:add:android   # one-time: generates android/  (needs Android Studio)
pnpm cap:android
```

## Next steps for a real game

- Add scenes under `game/scenes/` and register them in `game-config.ts`.
- Add store slices under `store/<feature>/` and combine them in `store/index.ts`.
- Add real assets: replace the generated texture in `boot-scene.ts` with `this.load.*`.
- Add more native capabilities (orientation lock, status bar, SQLite) behind
  `Capacitor.isNativePlatform()` guards.
