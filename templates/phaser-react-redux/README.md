# phaser-react-redux

A **standalone** starter: **React 18 + Phaser 3 + Redux Toolkit + Vite + TypeScript**,
demonstrating a clean responsibility split between the game core and the product shell.

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
- **Juice, code-only (zero image/audio assets):** particle bursts + camera-shake +
  squash-and-stretch + pooled score pops live in the Phaser scene
  ([`game/scenes/game-scene.ts`](src/game/scenes/game-scene.ts),
  [`game/juice/`](src/game/juice)); a drifting starfield in a sibling
  [`background-scene.ts`](src/game/scenes/background-scene.ts); a Web-Audio synth shared by
  both layers ([`shared/audio/`](src/game/../shared/audio)); and a **combo** system whose
  count lives in Redux and pulses in the HUD. All tunables sit in
  [`shared/rules.ts`](src/shared/rules.ts).

See [`../../docs/architecture.md`](../../docs/architecture.md) for the full rationale.

## Four cross-boundary patterns

Every message crossing the React ↔ Phaser boundary is one of four kinds — a 2×2 of
**direction** (who fires) × **kind** (a _noun_ that lives in state, or a _verb_ that flashes
by on the bus). The demo shows all four:

| Pattern                             | Example                                                                     | File                                                                                                           |
| ----------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Q1** Phaser → React, state (noun) | scene dispatches `registerHit` → HUD re-renders score/combo                 | [`game-scene.ts`](src/game/scenes/game-scene.ts) → [`Hud.tsx`](src/react/screens/Hud.tsx)                      |
| **Q2** Phaser → React, event (verb) | `game:hit` → transient milestone toast (never stored)                       | [`game-scene.ts`](src/game/scenes/game-scene.ts) → [`ComboToast.tsx`](src/react/screens/ComboToast.tsx)        |
| **Q3** React → Phaser, state (noun) | pause-menu difficulty switch → scene `subscribe` re-arms spawn cadence live | [`DifficultyPicker.tsx`](src/react/ui/DifficultyPicker.tsx) → [`game-scene.ts`](src/game/scenes/game-scene.ts) |
| **Q4** React → Phaser, event (verb) | 🎉 button emits `ui:celebrate` → confetti burst (no noun form)              | [`Hud.tsx`](src/react/screens/Hud.tsx) → [`game-scene.ts`](src/game/scenes/game-scene.ts)                      |

Turn on **X-Ray** (press `x`) to watch Q2 and Q4 stream through the event-bus log as they fire.

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
│   │   ├── boot-scene.ts        #   asset preload (target + spark textures generated here)
│   │   ├── background-scene.ts  #   drifting starfield, rendered below GAME
│   │   ├── game-scene.ts        #   spawn loop, hit detection, juice — owns 60fps state
│   │   └── xray-scene.ts        #   X-Ray: orange bounds around live display objects
│   ├── juice/               #   particle burst, pooled score pops, hit-colour palette
│   └── managers/
│       └── store-manager.ts #   THE BRIDGE: the only file game code uses to touch Redux
│
├── react/                   # ── REACT: the product shell ──
│   ├── PhaserCanvas.tsx     #   owns the Phaser.Game lifecycle (create/destroy)
│   ├── screens/             #   MainMenu / Hud / PauseModal / GameOverModal / ComboToast
│   ├── hooks/usePulse.ts    #   brief "pop" when a HUD number changes
│   └── ui/                  #   Button / MuteButton / DifficultyPicker
│
├── debug/xray/              # ── X-RAY: the architecture-debug overlay ──
│   ├── Xray.tsx             #   owns the on/off state; mounts chip + panels
│   ├── XrayEventLog.tsx     #   live event-bus log (colour-coded by direction)
│   ├── XrayStatePanel.tsx   #   live Redux game slice, flashes on change
│   ├── constants.ts         #   layer accent colours shared with the Phaser scene
│   └── ...                  #   chip + hooks
│
├── store/                   # ── REDUX: single source of truth ──
│   ├── index.ts             #   configureStore + RootState/AppDispatch types
│   ├── hooks.ts             #   typed useAppSelector / useAppDispatch (UI side only)
│   └── game/
│       ├── slice.ts         #   status/score/time/difficulty + reducers
│       └── selectors.ts
│
└── shared/                  # ── FRAMEWORK-AGNOSTIC CONTRACT ──
    ├── event-bus.ts         #   the mitt instance (reused verbatim by Vue/Zustand variants)
    ├── event-keys.ts        #   typed event names + payloads
    ├── audio/               #   dependency-free Web-Audio synth + named SFX (both layers)
    └── rules.ts             #   pure gameplay tuning + juice magnitudes, shared both ways
```

## The data flow in one tap

1. **Start** (UI) → `dispatch(startGame())` then `emitter.emit("ui:start")`.
2. `GameScene` hears `ui:start`, reads `difficulty` via the bridge, starts its timers.
3. Tap a target (canvas) → scene `dispatch(registerHit())` + `emitter.emit("game:hit")`.
4. The HUD re-renders the score/combo from Redux; the scene fires the particle burst and a
   pooled `+N` pop on the canvas from the same moment.
5. Countdown hits 0 → scene `dispatch(endGame())` + `emitter.emit("game:over")` → the UI
   shows the game-over screen because `status === "over"`.

## X-Ray Mode — make the architecture visible

The boundaries this template is about are normally invisible. **X-Ray mode** turns them on:
press **`x`** (or tap the **X-RAY** chip in the corner, or load with **`?xray=1`**) and the
four moving parts light up, each in its layer's colour.

<!-- TODO: xray.gif -->

| Colour      | Layer           | What you see                                                                                 |
| ----------- | --------------- | -------------------------------------------------------------------------------------------- |
| **Blue**    | React (DOM)     | An outline + name chip on every UI component (`Hud`, `MainMenu`, `Button`, …).               |
| **Orange**  | Phaser (canvas) | A bounding box + type label around every live display object (`Image(target)`).              |
| **Neutral** | Redux (store)   | A panel of the game slice's values (`status / score / timeLeft / …`) that flashes on change. |
| —           | Event bus       | A live log of every `mitt` event, coloured by direction: `ui:*` blue, `game:*` orange.       |

Each colour maps to one architecture layer, so a glance shows you which layer owns what and —
in the event log — exactly which messages cross the boundary and in which direction.

The toggle itself rides the architecture it illustrates: React owns the on/off state and
publishes it as a typed **`debug:xray`** event on the bus; the Phaser `XrayScene` listens and
wakes or sleeps. No globals cross the boundary. When off, the DOM outlines are inert CSS and
the scene sleeps, so X-Ray costs nothing until you switch it on. See
[`../../docs/architecture.md`](../../docs/architecture.md) §9.

## Swapping the state library

Because game code only touches Redux through `store-manager.ts`, porting to Zustand (or
anything else) means rewriting **that one file** plus `store/`. The scenes, the event bus,
and the responsibility split stay identical. That is the whole point of the bridge.

## Next steps for a real game

- Add scenes under `game/scenes/` and register them in `game-config.ts`.
- Add store slices under `store/<feature>/` and combine them in `store/index.ts`.
- Add real assets: replace the generated texture in `boot-scene.ts` with `this.load.*`.
- Want iOS/Android? Use the sibling
  [`phaser-react-redux-capacitor`](../phaser-react-redux-capacitor) template — same code
  plus a ready [Capacitor](https://capacitorjs.com/) setup (native persistence + haptics).
