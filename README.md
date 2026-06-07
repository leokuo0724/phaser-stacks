# Phaser Stacks

**Starter templates for building full game _products_ with web frameworks + [Phaser](https://phaser.io/).**

A game is rarely "just a `<canvas>`". Once it has menus, settings, modals, multiple
screens, persistence and a responsive shell, you are building a **product** — and the
web platform already has excellent tools for that part. Phaser Stacks shows how to let
**Phaser own the game core** and a **UI framework own the product shell**, with a small,
explicit contract between them — one consistent architecture across several
framework + state-library **stacks**.

These templates are distilled from the architecture of a shipped production game into the
smallest runnable form that still demonstrates every boundary.

---

## The core idea: a responsibility split

The whole architecture comes down to one question — **who owns what?**

| Concern | Owner | Why |
| --- | --- | --- |
| Scenes, sprites, animation, physics, game loop | **Phaser** | This is what a game engine is good at. |
| Canvas input (aim, swing, drag inside the play area) | **Phaser** | Tight coupling to render/update timing. |
| Menus, settings, modals, HUD, screen flow, responsive layout | **UI framework** (React/Vue/…) | This is what the DOM + a component framework are good at. |
| Shared/product state (score, status, progression, settings) | **State library** (Redux/Zustand/…) | Single source of truth both sides read. |
| Transient cross-boundary "moments" (hit, level-up, game-over) | **Event bus** | Decoupled verbs that don't belong in state. |

```
┌──────────────────────────────────────────────────────────┐
│  UI framework  — product shell (menus, HUD, modals)        │  DOM overlay, pointer-events: auto
│      │  reads state          ▲ dispatches actions          │
│      ▼                       │                             │
│  ┌────────────────────────────────────┐                   │
│  │   State store (single source of     │   ◀── event bus ──┐
│  │   truth: score / status / settings) │      (verbs)      │
│  └────────────────────────────────────┘                   │
│      ▲ select / dispatch     │ subscribe                   │
│      │     (via a thin "store bridge", because Phaser      │
│      │      code lives outside the framework's hooks)      │
│  ┌────────────────────────────────────┐                   │
│  │   Phaser  — game core (canvas)      │ ──────────────────┘
│  └────────────────────────────────────┘                   │  canvas underneath, pointer-events: auto
└──────────────────────────────────────────────────────────┘
```

### The three connection points

Every template implements the **same three contracts**, regardless of framework:

1. **Lifecycle** — the UI framework creates and destroys the `Phaser.Game`. The canvas
   lives underneath the UI as a sibling layer, not inside a component subtree.
2. **State bridge** — Phaser code can't use a framework's hooks/composables, so it talks
   to the store through a thin singleton (`StoreManager`) that wraps
   `getState` / `select` / `dispatch` / `subscribe`.
3. **Event bus** — a tiny typed pub/sub (`mitt`) for fire-and-forget moments that cross
   the boundary in both directions. State is for _nouns_; the bus is for _verbs_.

Keep those three boundaries clean and you can swap the state library or even the UI
framework without touching the game core.

---

## Templates

| Template | Framework | State | Status |
| --- | --- | --- | --- |
| [`phaser-react-redux`](./templates/phaser-react-redux) | React 18 | Redux Toolkit | ✅ Available |
| [`phaser-react-redux-capacitor`](./templates/phaser-react-redux-capacitor) | React 18 + Capacitor | Redux Toolkit | ✅ Available · 📱 iOS/Android |
| `phaser-react-zustand` | React 18 | Zustand | 🚧 Planned |

> 📱 `phaser-react-redux-capacitor` is the base template **plus** a Capacitor layer
> (native persistence + haptics). Capacitor is an _orthogonal add-on_ — the integration is
> just two files, so we don't clone a `*-capacitor` variant for every stack; the recipe in
> [`docs/architecture.md`](./docs/architecture.md) §8 ports to any base.

Each template is **self-contained** — copy the folder, run an install, and go. Nothing
depends on the repo root, and the templates are **package-manager-agnostic** (no lockfile
is shipped inside them — use npm, pnpm, yarn, or bun).

```bash
# Try the React + Redux template (use whichever PM you like)
cd templates/phaser-react-redux
pnpm install   # or: npm install / yarn / bun install
pnpm dev       # or: npm run dev
```

### Developing in this repo

This monorepo uses **pnpm workspaces**. pnpm ships with Node via Corepack — no global
install needed:

```bash
corepack enable        # one-time; activates the pinned pnpm version
pnpm install           # install all templates
pnpm dev:react-redux   # run the React + Redux template
```

The demo game (a 30-second reflex "popper") is intentionally tiny. It is not the point —
the **boundaries** are. Read [`docs/architecture.md`](./docs/architecture.md) for the
full walkthrough, and the "Where things live" section in each template's README.

---

## Why a web stack instead of Unity / Godot?

Unity and Godot are excellent. This architecture is for teams that want:

- **One language and toolchain** across game, UI, build, and CI.
- **The web's UI muscle** — DOM, flexbox/grid, accessibility, i18n, instant responsive
  layout — for everything that isn't the play area.
- **Web-native distribution** — ship to the browser instantly; wrap with
  [Capacitor](https://capacitorjs.com/) for iOS/Android from the same codebase.
- **Web testing & automation** — component tests, Playwright E2E that can drive both the
  DOM _and_ the running game.

The trade-offs (raw rendering ceiling, asset pipeline, ecosystem of game-specific
tooling) are real and discussed in [`docs/architecture.md`](./docs/architecture.md).

---

## License

[MIT](./LICENSE) — use these as a starting point for anything.
