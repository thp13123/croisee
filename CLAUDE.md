# CLAUDE.md – Croisee

## Project Overview

**Croisee** is a browser-based traffic light controller simulator for a 4-way intersection, written in French. It simulates pedestrian crossing requests that cycle traffic lights through a fixed state machine.

- **Type:** Vanilla TypeScript front-end, no framework, no bundler
- **Language context:** Code comments and UI text are in French
- **Entry point:** `index.html` loads `dist/main.js` as an ES module

## Repository Structure

```
croisee/
├── src/
│   └── main.ts          # All application logic (single source file, 212 lines)
├── dist/
│   └── main.js          # Compiled output – do NOT edit manually
├── index.html           # HTML entry point and full UI markup (165 lines)
├── style.css            # All CSS styling (350 lines)
├── tsconfig.json        # TypeScript configuration
├── package.json         # NPM scripts and dev dependencies
└── package-lock.json    # Lock file (TypeScript 5.9.3 only)
```

## Build & Development Commands

```bash
npm run build    # Compile src/main.ts → dist/main.js (one-shot)
npm run watch    # Watch mode: recompile on every save
```

Open `index.html` directly in a browser after building – no dev server needed.

There are **no test commands and no linter configured**.

## TypeScript Configuration

- **Target / module:** ES2020
- **Module resolution:** `node`
- **Strict mode:** enabled (all strict checks apply)
- **`noEmitOnError`:** enabled – compilation will not produce output if there are type errors
- **Output dir:** `dist/`
- **Root dir:** `src/`
- **Lib:** ES2020 + DOM

Always run `npm run build` and verify zero errors before committing.

## Architecture

### State Machine (`src/main.ts`)

The entire application is a single `TrafficController` class instantiated on `DOMContentLoaded`.

```
GREEN ──(button press, immediate)──► ORANGE
         ──(2 000 ms)───────────────► RED_WALK  (10-second countdown)
                  ──(10 s)──────────► GREEN
```

| Constant | Value | Purpose |
|---|---|---|
| `ORANGE_DURATION_MS` | 2 000 | Orange phase duration |
| `WALK_DURATION_S` | 10 | Pedestrian crossing window |
| `CIRCLE_CIRCUMFERENCE` | 2π × 34 ≈ 213.6 | SVG ring math (r=34) |

### Key Types

```typescript
const enum State { GREEN = 'green', ORANGE = 'orange', RED_WALK = 'red' }
type Direction = 'n' | 's' | 'e' | 'w';
```

`State` is a `const enum` – values are inlined at compile time. `Direction` maps to the four cardinal road arms.

### `TrafficController` Class

| Member | Role |
|---|---|
| `state` | Current traffic light state |
| `orangeTimer` | `setTimeout` handle for ORANGE→RED_WALK |
| `walkInterval` | `setInterval` handle for countdown ticks |
| `remainingSeconds` | Countdown value during RED_WALK |
| `buttons[]` | Cached references to all 8 pedestrian buttons |
| `requestCrossing()` | Public entry point (ignored if not GREEN) |
| `renderState()` | Calls all four update methods on every transition |

Private render methods called by `renderState()`:
- `updateCarLights()` – sets `.active` class on the correct bulb for each direction
- `updatePedestrianSignals()` – toggles stop/walk icons
- `updateButtons()` – disables all buttons during non-GREEN states
- `updateStatusLabel()` – updates text and CSS class of the status bar
- `updateCountdownVisibility()` – shows/hides the SVG ring
- `updateCountdownUI()` – updates the number and `stroke-dashoffset` of the SVG progress circle

### DOM Helper

```typescript
function el<T extends Element = HTMLElement>(id: string): T
```

Throws a descriptive error in French if the element is not found. Use this for all `getElementById` lookups.

## HTML Structure

The intersection is a **3×3 CSS Grid** (`div.intersection`):

```
[NW corner]  [N road arm]  [NE corner]
[W  road arm] [center]     [E  road arm]
[SW corner]  [S road arm]  [SE corner]
```

- **Grid dimensions:** 180px (corners) / 220px (roads) – fixed at 580×580px total
- Each **road arm** contains: `.zebra`, `.traffic-light` (3 bulbs), `.ped-signal` (stop + walk icons)
- Each **corner** contains 2 pedestrian buttons (one per adjacent road arm)
- **Status bar** (below grid): `#status-label`, `#countdown-ring` (SVG + number)

### Element ID Conventions

| Pattern | Example | Meaning |
|---|---|---|
| `light-{dir}-{color}` | `light-n-red` | Traffic light bulb |
| `ped-{dir}-stop` | `ped-s-stop` | Pedestrian stop icon |
| `ped-{dir}-walk` | `ped-e-walk` | Pedestrian walk icon |
| `btn-{dir}-{side}` | `btn-n-w` | Pedestrian button (N crossing, west side) |
| `countdown-ring` | – | SVG container (hidden until RED_WALK) |
| `countdown-progress` | – | SVG circle with `stroke-dashoffset` animation |
| `countdown-number` | – | Numeric display inside ring |
| `status-label` | – | Status text bar |

`{dir}` is always one of: `n`, `s`, `e`, `w`.

## CSS Conventions (`style.css`)

- CSS reset at top (`box-sizing: border-box`, margins zeroed)
- Dark green body background (`#1a2a1a`), light text (`#e0e0e0`)
- Active bulb colors with glow:
  - Red: `#ff3333` / Orange: `#ff8800` / Green: `#00dd44`
- Active pedestrian stop: `#cc1111` / walk: `#00aa33`
- `.active` class is toggled via JS on bulbs and pedestrian icons
- `.visible` class is toggled on `#countdown-ring`
- Status label gets a state class (`green`, `orange`, `red`) for color

## Coding Conventions

- **Language:** TypeScript with strict mode; no `any`, no non-null assertions without justification
- **DOM caching:** Cache all element references in the constructor; never query the DOM in render loops
- **Timer cleanup:** Always null-check and clear timers before reassigning (`clearWalkInterval()` pattern)
- **State guard:** `requestCrossing()` must always guard against non-GREEN state at the top
- **Comments:** Write comments in French, consistent with the existing codebase
- **No dependencies:** Do not introduce runtime npm packages; TypeScript is the only dev dependency

## Adding a New State or Feature

1. Add the value to the `State` const enum
2. Add it to the `messages` record in `updateStatusLabel()`
3. Handle the new state in all four `update*` methods inside `renderState()`
4. Add any timer logic following the existing `setTimeout`/`setInterval` + cleanup pattern
5. Run `npm run build` and verify no type errors

## Git Workflow

- Main branch: `master`
- Remote: `origin`
- Compiled output (`dist/`) is tracked in the repository
- Always build and verify before committing so `dist/main.js` stays in sync with `src/main.ts`
