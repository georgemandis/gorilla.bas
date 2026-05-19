# GORILLAS.BAS RCade Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a two-player turn-based banana-throwing game faithful to the
original GORILLAS.BAS, running on the RCade arcade cabinet with spinner and
button controls.

**Architecture:** State-machine-driven game loop in P5.js instance mode. Game
logic separated into focused modules (physics, collision, city generation,
input, UI). Geometry-based collision detection against stored building/gorilla
data structures.

**Tech Stack:** P5.js, TypeScript, Vite, @rcade/plugin-input-classic,
@rcade/plugin-input-spinners

---

## File Map

| File               | Responsibility                                            |
| ------------------ | --------------------------------------------------------- |
| `src/types.ts`     | All TypeScript interfaces and type definitions            |
| `src/config.ts`    | Game constants, gravity presets, colors, tuning values    |
| `src/names.ts`     | Random name word lists and generator                      |
| `src/input.ts`     | Input abstraction wrapping RCade plugins                  |
| `src/physics.ts`   | Projectile position calculation                           |
| `src/collision.ts` | Geometry-based hit detection                              |
| `src/city.ts`      | Cityscape generation algorithm                            |
| `src/gorilla.ts`   | Gorilla rendering (3 arm states)                          |
| `src/ui.ts`        | HUD, angle indicator, power meter, wind arrow, sun, menus |
| `src/sound.ts`     | Sound stub (no-op for MVP, wired up later)                |
| `src/sketch.ts`    | P5.js entry point, state machine, game loop               |

---

## Task 1: Project Setup & Dependencies

**Files:**

- Modify: `src/sketch.ts` (replace template content)
- Create: `src/types.ts`
- Create: `src/config.ts`
- Modify: `package.json` (add spinner plugin)
- Modify: `rcade.manifest.json` (add spinner dependency)

- [ ] **Step 1: Install spinner plugin**

```bash
bun add @rcade/plugin-input-spinners
```

- [ ] **Step 2: Update rcade.manifest.json to declare spinner dependency**

```json
{
  "$schema": "https://rcade.dev/manifest.schema.json",
  "name": "gorillas_bas",
  "display_name": "GORILLAS.BAS",
  "description": " The legendary QBasic turn-based game featuring gorillas, cityscapes, real physics and exploding bananas.",
  "visibility": "public",
  "authors": [
    {
      "display_name": "George Mandis"
    }
  ],
  "dependencies": [
    {
      "name": "@rcade/input-classic",
      "version": "1.0.0"
    },
    {
      "name": "@rcade/input-spinners",
      "version": "1.0.0"
    }
  ]
}
```

- [ ] **Step 3: Create src/types.ts**

```typescript
export interface Circle {
  cx: number;
  cy: number;
  radius: number;
}

export interface GameWindow {
  x: number;
  y: number;
  lit: boolean;
}

export interface Building {
  x: number;
  y: number; // top of building
  width: number;
  height: number;
  color: string;
  windows: GameWindow[];
  damage: Circle[]; // reserved for future destructibility
}

export interface Gorilla {
  x: number; // top-left of bounding box
  y: number;
  width: number;
  height: number;
  playerNum: 1 | 2;
  armState: ArmState;
}

export type ArmState = "down" | "left_up" | "right_up";

export interface Projectile {
  startX: number;
  startY: number;
  vx: number;
  vy: number;
  t: number;
  active: boolean;
}

export type GamePhase =
  | "title"
  | "config"
  | "round_start"
  | "aim"
  | "power"
  | "flight"
  | "explosion"
  | "victory"
  | "game_over";

export type GravityPreset = "moon" | "earth" | "jupiter";

export interface GameState {
  phase: GamePhase;
  currentPlayer: 1 | 2;
  buildings: Building[];
  gorillas: [Gorilla, Gorilla];
  wind: number;
  gravity: number;
  scores: [number, number];
  targetScore: number;
  gravityPreset: GravityPreset;
  playerNames: [string, string];
  angle: number;
  power: number;
  projectile: Projectile | null;
  explosionTimer: number;
  victoryTimer: number;
  roundStartTimer: number;
  powerMeterValue: number;
  powerMeterDirection: 1 | -1;
  powerDeadZoneTimer: number;
  sunShocked: boolean;
  lastHitPlayer: 1 | 2 | null;
}
```

- [ ] **Step 4: Create src/config.ts**

```typescript
import type { GravityPreset } from "./types";

export const WIDTH = 336;
export const HEIGHT = 262;

// Physics
export const GRAVITY_VALUES: Record<GravityPreset, number> = {
  moon: 1.6,
  earth: 9.8,
  jupiter: 24.8,
};
export const PHYSICS_DT = 0.1;
export const MAX_FLIGHT_T = 50.0;
export const VELOCITY_SCALE = 2.5;
export const Y_SCALE = HEIGHT / 350;

// Power meter
export const POWER_CYCLE_MS = 1500; // 1 full cycle (up and back) in ms
export const POWER_DEAD_ZONE_MS = 300;

// Spinner
export const DEGREES_PER_STEP = 2;
export const INITIAL_ANGLE_P1 = 45;
export const INITIAL_ANGLE_P2 = 135;

// Gorilla
export const GORILLA_WIDTH = 20;
export const GORILLA_HEIGHT = 25;

// Explosion
export const EXPLOSION_EXPAND_MS = 300;
export const EXPLOSION_CONTRACT_MS = 200;
export const EXPLOSION_RADIUS = 15;

// Victory
export const VICTORY_DURATION_MS = 2000;
export const ROUND_START_DELAY_MS = 1500;

// UI
export const POWER_METER_WIDTH = 15;
export const POWER_METER_HEIGHT = 80;
export const ANGLE_ARROW_LENGTH = 20;

// Wind
export const WIND_BASE_RANGE = 5; // -5 to +5
export const WIND_STRONG_EXTRA = 10; // additional -10 to +10
export const WIND_STRONG_CHANCE = 1 / 3;

// City
export const BUILDING_COLORS = ["#4a3a6b", "#3a5a4b", "#5a3a3a", "#3a4a5a"];
export const WINDOW_COLOR_LIT = "#ffd700";
export const WINDOW_COLOR_DARK = "#1a1a2a";
export const BOTTOM_LINE = HEIGHT - 20; // leave room for wind arrow
export const MIN_BUILDING_WIDTH = 25;
export const MAX_BUILDING_WIDTH = 50;

// Target scores
export const TARGET_SCORE_OPTIONS = [1, 3, 5, 7];
export const GRAVITY_PRESET_OPTIONS: GravityPreset[] = [
  "moon",
  "earth",
  "jupiter",
];

// Sun
export const SUN_X = WIDTH / 2;
export const SUN_Y = 25;
export const SUN_RADIUS = 12;
```

- [ ] **Step 5: Replace src/sketch.ts with minimal state machine skeleton**

```typescript
import p5 from "p5";
import type { GamePhase, GameState } from "./types";
import { HEIGHT, WIDTH } from "./config";

function createInitialState(): GameState {
  return {
    phase: "title",
    currentPlayer: 1,
    buildings: [],
    gorillas: [
      { x: 0, y: 0, width: 20, height: 25, playerNum: 1, armState: "down" },
      { x: 0, y: 0, width: 20, height: 25, playerNum: 2, armState: "down" },
    ],
    wind: 0,
    gravity: 9.8,
    scores: [0, 0],
    targetScore: 3,
    gravityPreset: "earth",
    playerNames: ["Player 1", "Player 2"],
    angle: 45,
    power: 0,
    projectile: null,
    explosionTimer: 0,
    victoryTimer: 0,
    roundStartTimer: 0,
    powerMeterValue: 0,
    powerMeterDirection: 1,
    powerDeadZoneTimer: 0,
    sunShocked: false,
    lastHitPlayer: null,
  };
}

const sketch = (p: p5) => {
  let state: GameState;

  p.setup = () => {
    p.createCanvas(WIDTH, HEIGHT);
    state = createInitialState();
  };

  p.draw = () => {
    p.background(20, 20, 40);

    switch (state.phase) {
      case "title":
        drawTitle(p);
        break;
      case "config":
        break;
      case "round_start":
        break;
      case "aim":
        break;
      case "power":
        break;
      case "flight":
        break;
      case "explosion":
        break;
      case "victory":
        break;
      case "game_over":
        break;
    }
  };
};

function drawTitle(p: p5) {
  p.fill(255, 200, 50);
  p.textSize(16);
  p.textAlign(p.CENTER, p.CENTER);
  p.text("GORILLAS.BAS", WIDTH / 2, HEIGHT / 3);
  p.fill(200);
  p.textSize(10);
  p.text("Press START", WIDTH / 2, HEIGHT / 2);
}

new p5(sketch, document.getElementById("sketch")!);
```

- [ ] **Step 6: Verify it builds**

```bash
cd /Users/georgemandis/Projects/recurse/2026/gorillas_bas && bun run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: project setup with types, config, and state machine skeleton"
```

---

## Task 2: Input Abstraction

**Files:**

- Create: `src/input.ts`
- Create: `src/names.ts`

- [ ] **Step 1: Create src/input.ts**

This wraps both RCade input plugins into a clean interface the game can use.

```typescript
import { PLAYER_1, PLAYER_2, SYSTEM } from "@rcade/plugin-input-classic";
import {
  PLAYER_1 as SPINNER_1,
  PLAYER_2 as SPINNER_2,
} from "@rcade/plugin-input-spinners";
import { DEGREES_PER_STEP } from "./config";

export interface PlayerInput {
  dpadUp: boolean;
  dpadDown: boolean;
  dpadLeft: boolean;
  dpadRight: boolean;
  a: boolean;
  b: boolean;
  spinnerDelta: number; // in degrees
}

export interface SystemInput {
  onePlayer: boolean;
  twoPlayer: boolean;
}

export function getPlayerInput(player: 1 | 2): PlayerInput {
  const classic = player === 1 ? PLAYER_1 : PLAYER_2;
  const spinner = player === 1 ? SPINNER_1 : SPINNER_2;

  return {
    dpadUp: classic.DPAD.up,
    dpadDown: classic.DPAD.down,
    dpadLeft: classic.DPAD.left,
    dpadRight: classic.DPAD.right,
    a: classic.A,
    b: classic.B,
    spinnerDelta: spinner.spinner.step_delta * DEGREES_PER_STEP,
  };
}

export function getSystemInput(): SystemInput {
  return {
    onePlayer: SYSTEM.ONE_PLAYER,
    twoPlayer: SYSTEM.TWO_PLAYER,
  };
}
```

- [ ] **Step 2: Create src/sound.ts**

```typescript
// Sound stub — no-op for MVP. Wire up Web Audio or p5.sound later.
export function playSound(
  _name: "throw" | "explosion" | "victory" | "hit",
): void {
  // No-op
}
```

- [ ] **Step 3: Create src/names.ts**

```typescript
const ADJECTIVES = [
  "Atomic",
  "Blazing",
  "Cosmic",
  "Crystal",
  "Doom",
  "Dr.",
  "Electric",
  "Frozen",
  "Golden",
  "Hyper",
  "Iron",
  "Laser",
  "Mega",
  "Mighty",
  "Mx.",
  "Neon",
  "Phantom",
  "Radical",
  "Raging",
  "Shadow",
  "Silent",
  "Steel",
  "The",
  "Thunder",
  "Turbo",
  "Ultra",
  "Venom",
  "Wild",
];

const NOUNS = [
  "Ape",
  "Banana",
  "Beast",
  "Blaster",
  "Bomber",
  "Bubbles",
  "Champ",
  "Chimp",
  "Crusher",
  "Fist",
  "Fury",
  "Gorilla",
  "Simian",
  "Hurler",
  "Kong",
  "Legend",
  "Monkey",
  "Primate",
  "Rocket",
  "Slammer",
  "Storm",
  "Striker",
  "Titan",
  "Tosser",
  "Warrior",
  "Wizard",
  "Yeti",
];

export function randomName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj} ${noun}`;
}
```

- [ ] **Step 4: Verify build**

```bash
cd /Users/georgemandis/Projects/recurse/2026/gorillas_bas && bun run build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/input.ts src/sound.ts src/names.ts && git commit -m "feat: add input abstraction, sound stub, and random name generator"
```

---

## Task 3: Cityscape Generation

**Files:**

- Create: `src/city.ts`

- [ ] **Step 1: Create src/city.ts**

```typescript
import type { Building, GameWindow } from "./types";
import {
  BOTTOM_LINE,
  BUILDING_COLORS,
  GORILLA_HEIGHT,
  MAX_BUILDING_WIDTH,
  MIN_BUILDING_WIDTH,
  WIDTH,
  WINDOW_COLOR_LIT,
} from "./config";

type SlopeType = "up" | "down" | "v" | "inv_v" | "v2" | "inv_v2";

export function generateCityscape(): Building[] {
  const buildings: Building[] = [];
  let x = 2;

  const slopeTypes: SlopeType[] = ["up", "down", "v", "v", "v", "inv_v"];
  const slope = slopeTypes[Math.floor(Math.random() * slopeTypes.length)];

  let newHt = slope === "down" || slope === "inv_v" ? 100 : 15;
  const htInc = 8;
  const maxBuildingTop = 40 + GORILLA_HEIGHT; // leave room for gorillas and sun

  while (x < WIDTH - 10) {
    // Adjust height based on slope
    switch (slope) {
      case "up":
        newHt += htInc;
        break;
      case "down":
        newHt -= htInc;
        break;
      case "v":
      case "v2":
        if (x > WIDTH / 2) newHt -= 2 * htInc;
        else newHt += 2 * htInc;
        break;
      case "inv_v":
      case "inv_v2":
        if (x > WIDTH / 2) newHt += 2 * htInc;
        else newHt -= 2 * htInc;
        break;
    }

    const bWidth = MIN_BUILDING_WIDTH +
      Math.floor(Math.random() * (MAX_BUILDING_WIDTH - MIN_BUILDING_WIDTH));
    const actualWidth = Math.min(bWidth, WIDTH - x - 2);

    let bHeight = Math.floor(Math.random() * 80) + newHt;
    if (bHeight < htInc) bHeight = htInc;
    if (BOTTOM_LINE - bHeight < maxBuildingTop) {
      bHeight = BOTTOM_LINE - maxBuildingTop;
    }
    if (bHeight < 20) bHeight = 20;

    const color =
      BUILDING_COLORS[Math.floor(Math.random() * BUILDING_COLORS.length)];
    const windows = generateWindows(
      x,
      BOTTOM_LINE - bHeight,
      actualWidth,
      bHeight,
    );

    buildings.push({
      x,
      y: BOTTOM_LINE - bHeight,
      width: actualWidth,
      height: bHeight,
      color,
      windows,
      damage: [],
    });

    x += actualWidth + 2;
  }

  return buildings;
}

function generateWindows(
  bx: number,
  by: number,
  bw: number,
  bh: number,
): GameWindow[] {
  const windows: GameWindow[] = [];
  const wWidth = 3;
  const wHeight = 5;
  const hSpacing = 8;
  const vSpacing = 10;

  for (let wx = bx + 4; wx < bx + bw - 4; wx += hSpacing) {
    for (let wy = by + 4; wy < by + bh - 6; wy += vSpacing) {
      windows.push({
        x: wx,
        y: wy,
        lit: Math.random() > 0.4,
      });
    }
  }

  return windows;
}

export function placeGorillas(
  buildings: Building[],
): [{ x: number; y: number }, { x: number; y: number }] {
  const lastIdx = buildings.length - 1;

  // Player 1: 2nd or 3rd building from left
  const p1Idx = 1 + Math.floor(Math.random() * 2); // index 1 or 2
  // Player 2: 2nd or 3rd building from right
  const p2Idx = lastIdx - 1 - Math.floor(Math.random() * 2); // lastIdx-1 or lastIdx-2

  const p1Building = buildings[Math.min(p1Idx, lastIdx)];
  const p2Building = buildings[Math.max(p2Idx, 0)];

  return [
    {
      x: p1Building.x + p1Building.width / 2 - 10,
      y: p1Building.y - 25,
    },
    {
      x: p2Building.x + p2Building.width / 2 - 10,
      y: p2Building.y - 25,
    },
  ];
}

export function generateWind(): number {
  let wind = Math.floor(Math.random() * 11) - 5; // -5 to +5
  if (Math.random() < 1 / 3) {
    if (wind > 0) {
      wind += Math.floor(Math.random() * 10) + 1;
    } else {
      wind -= Math.floor(Math.random() * 10) + 1;
    }
  }
  return wind;
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/georgemandis/Projects/recurse/2026/gorillas_bas && bun run build
```

- [ ] **Step 3: Commit**

```bash
git add src/city.ts && git commit -m "feat: add cityscape generation with buildings, windows, and wind"
```

---

## Task 4: Physics & Collision

**Files:**

- Create: `src/physics.ts`
- Create: `src/collision.ts`

- [ ] **Step 1: Create src/physics.ts**

```typescript
import type { Projectile } from "./types";
import { PHYSICS_DT, VELOCITY_SCALE, Y_SCALE } from "./config";

export function createProjectile(
  startX: number,
  startY: number,
  angleDegrees: number,
  power: number,
): Projectile {
  const angleRad = (angleDegrees * Math.PI) / 180;
  const velocity = power * VELOCITY_SCALE;

  return {
    startX,
    startY,
    vx: Math.cos(angleRad) * velocity,
    vy: Math.sin(angleRad) * velocity,
    t: 0,
    active: true,
  };
}

export function getProjectilePositionWithGravity(
  proj: Projectile,
  wind: number,
  gravity: number,
): { x: number; y: number } {
  const x = proj.startX + proj.vx * proj.t + 0.5 * (wind / 5) * proj.t * proj.t;
  const y = proj.startY - proj.vy * proj.t * Y_SCALE +
    0.5 * gravity * proj.t * proj.t * Y_SCALE;
  return { x, y };
}

export function advanceProjectile(proj: Projectile): void {
  proj.t += PHYSICS_DT;
}
```

- [ ] **Step 2: Create src/collision.ts**

```typescript
import type { Building, Gorilla } from "./types";
import {
  BOTTOM_LINE,
  HEIGHT,
  MAX_FLIGHT_T,
  SUN_RADIUS,
  SUN_X,
  SUN_Y,
  WIDTH,
} from "./config";

export type CollisionResult =
  | { type: "none" }
  | { type: "miss" }
  | { type: "building"; building: Building }
  | { type: "gorilla"; gorilla: Gorilla }
  | { type: "sun" };

export function checkCollision(
  x: number,
  y: number,
  t: number,
  buildings: Building[],
  gorillas: [Gorilla, Gorilla],
): CollisionResult {
  // Check max flight time
  if (t >= MAX_FLIGHT_T) {
    return { type: "miss" };
  }

  // Check screen bounds (left, right, bottom — NOT top)
  if (x < 0 || x > WIDTH || y > BOTTOM_LINE) {
    return { type: "miss" };
  }

  // Skip checks if banana is above screen (can return)
  if (y < 0) {
    return { type: "none" };
  }

  // Check gorilla hits (before buildings so gorilla on roof is detected)
  for (const gorilla of gorillas) {
    if (
      x >= gorilla.x &&
      x <= gorilla.x + gorilla.width &&
      y >= gorilla.y &&
      y <= gorilla.y + gorilla.height
    ) {
      return { type: "gorilla", gorilla };
    }
  }

  // Check building hits
  for (const building of buildings) {
    if (
      x >= building.x &&
      x <= building.x + building.width &&
      y >= building.y &&
      y <= building.y + building.height
    ) {
      return { type: "building", building };
    }
  }

  // Check sun (cosmetic)
  const dx = x - SUN_X;
  const dy = y - SUN_Y;
  if (dx * dx + dy * dy <= SUN_RADIUS * SUN_RADIUS) {
    return { type: "sun" };
  }

  return { type: "none" };
}
```

- [ ] **Step 3: Verify build**

```bash
cd /Users/georgemandis/Projects/recurse/2026/gorillas_bas && bun run build
```

- [ ] **Step 4: Commit**

```bash
git add src/physics.ts src/collision.ts && git commit -m "feat: add projectile physics and geometry-based collision detection"
```

---

## Task 5: Gorilla Rendering

**Files:**

- Create: `src/gorilla.ts`

- [ ] **Step 1: Create src/gorilla.ts**

```typescript
import p5 from "p5";
import type { ArmState, Gorilla } from "./types";

const GORILLA_COLOR = "#8B4513"; // brown
const EYE_COLOR = "#FFFFFF";

export function drawGorilla(p: p5, gorilla: Gorilla): void {
  const { x, y, armState } = gorilla;

  p.push();
  p.noStroke();

  // Body
  p.fill(GORILLA_COLOR);
  p.rect(x + 4, y + 10, 12, 10); // torso

  // Head
  p.rect(x + 5, y + 2, 10, 9);

  // Eyes
  p.fill(EYE_COLOR);
  p.rect(x + 7, y + 4, 2, 2);
  p.rect(x + 11, y + 4, 2, 2);

  // Legs
  p.fill(GORILLA_COLOR);
  p.rect(x + 5, y + 20, 4, 5);
  p.rect(x + 11, y + 20, 4, 5);

  // Arms
  drawArms(p, x, y, armState);

  p.pop();
}

function drawArms(p: p5, x: number, y: number, armState: ArmState): void {
  p.fill(GORILLA_COLOR);

  switch (armState) {
    case "down":
      // Both arms down
      p.rect(x + 1, y + 11, 3, 8);
      p.rect(x + 16, y + 11, 3, 8);
      break;
    case "left_up":
      // Left arm up, right arm down
      p.rect(x + 1, y + 2, 3, 8);
      p.rect(x + 16, y + 11, 3, 8);
      break;
    case "right_up":
      // Right arm up, left arm down
      p.rect(x + 1, y + 11, 3, 8);
      p.rect(x + 16, y + 2, 3, 8);
      break;
  }
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/georgemandis/Projects/recurse/2026/gorillas_bas && bun run build
```

- [ ] **Step 3: Commit**

```bash
git add src/gorilla.ts && git commit -m "feat: add gorilla rendering with three arm states"
```

---

## Task 6: UI Rendering (HUD, Power Meter, Angle Indicator, Sun, Wind)

**Files:**

- Create: `src/ui.ts`

- [ ] **Step 1: Create src/ui.ts**

```typescript
import p5 from "p5";
import type { GameState } from "./types";
import {
  ANGLE_ARROW_LENGTH,
  BOTTOM_LINE,
  GORILLA_HEIGHT,
  GORILLA_WIDTH,
  HEIGHT,
  POWER_METER_HEIGHT,
  POWER_METER_WIDTH,
  SUN_RADIUS,
  SUN_X,
  SUN_Y,
  WIDTH,
} from "./config";

export function drawScores(p: p5, state: GameState): void {
  p.fill(255);
  p.textSize(8);
  p.noStroke();

  p.textAlign(p.LEFT, p.TOP);
  p.text(`${state.playerNames[0]}: ${state.scores[0]}`, 4, 2);

  p.textAlign(p.RIGHT, p.TOP);
  p.text(`${state.playerNames[1]}: ${state.scores[1]}`, WIDTH - 4, 2);
}

export function drawAngleIndicator(p: p5, state: GameState): void {
  const gorilla = state.gorillas[state.currentPlayer - 1];
  const centerX = gorilla.x + GORILLA_WIDTH / 2;
  const centerY = gorilla.y + GORILLA_HEIGHT / 2;

  const angleRad = (state.angle * Math.PI) / 180;
  const endX = centerX + Math.cos(angleRad) * ANGLE_ARROW_LENGTH;
  const endY = centerY - Math.sin(angleRad) * ANGLE_ARROW_LENGTH;

  // Draw arrow line
  p.stroke(255, 200, 50);
  p.strokeWeight(2);
  p.line(centerX, centerY, endX, endY);

  // Draw arrowhead
  p.fill(255, 200, 50);
  p.noStroke();
  p.circle(endX, endY, 4);
}

export function drawPowerMeter(p: p5, state: GameState): void {
  const meterX = state.currentPlayer === 1 ? 8 : WIDTH - 8 - POWER_METER_WIDTH;
  const meterY = HEIGHT / 2 - POWER_METER_HEIGHT / 2;

  // Background
  p.fill(20, 20, 30);
  p.stroke(100);
  p.strokeWeight(1);
  p.rect(meterX, meterY, POWER_METER_WIDTH, POWER_METER_HEIGHT);

  // Gradient fill (green at bottom, yellow middle, red top)
  const fillHeight = state.powerMeterValue * POWER_METER_HEIGHT;
  for (let i = 0; i < fillHeight; i++) {
    const ratio = i / POWER_METER_HEIGHT;
    const r = Math.min(255, ratio * 2 * 255);
    const g = Math.min(255, (1 - ratio) * 2 * 255);
    p.stroke(r, g, 0);
    p.line(
      meterX + 1,
      meterY + POWER_METER_HEIGHT - i,
      meterX + POWER_METER_WIDTH - 1,
      meterY + POWER_METER_HEIGHT - i,
    );
  }

  // White marker at current position
  const markerY = meterY + POWER_METER_HEIGHT - fillHeight;
  p.stroke(255);
  p.strokeWeight(2);
  p.line(meterX - 2, markerY, meterX + POWER_METER_WIDTH + 2, markerY);
}

export function drawSun(p: p5, shocked: boolean): void {
  // Sun body
  p.fill(255, 220, 50);
  p.noStroke();
  p.circle(SUN_X, SUN_Y, SUN_RADIUS * 2);

  // Rays
  p.stroke(255, 220, 50);
  p.strokeWeight(1);
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    p.line(
      SUN_X + Math.cos(angle) * (SUN_RADIUS + 2),
      SUN_Y + Math.sin(angle) * (SUN_RADIUS + 2),
      SUN_X + Math.cos(angle) * (SUN_RADIUS + 6),
      SUN_Y + Math.sin(angle) * (SUN_RADIUS + 6),
    );
  }

  // Face
  p.fill(0);
  p.noStroke();
  // Eyes
  p.circle(SUN_X - 3, SUN_Y - 2, 3);
  p.circle(SUN_X + 3, SUN_Y - 2, 3);

  // Mouth
  if (shocked) {
    p.circle(SUN_X, SUN_Y + 4, 5);
  } else {
    p.noFill();
    p.stroke(0);
    p.strokeWeight(1);
    p.arc(SUN_X, SUN_Y + 2, 8, 6, 0, Math.PI);
  }
}

export function drawWindArrow(p: p5, wind: number): void {
  if (wind === 0) return;

  const centerX = WIDTH / 2;
  const y = BOTTOM_LINE + 10;
  const lineLength = Math.abs(wind) * 2;
  const endX = centerX + wind * 2;

  p.stroke(255, 100, 100);
  p.strokeWeight(1);
  p.line(centerX, y, endX, y);

  // Arrowhead
  const dir = wind > 0 ? -1 : 1;
  p.line(endX, y, endX + dir * 3, y - 2);
  p.line(endX, y, endX + dir * 3, y + 2);
}

export function drawExplosion(
  p: p5,
  x: number,
  y: number,
  progress: number,
): void {
  // progress goes 0→1 (expand) then 1→0 (contract)
  const radius = progress * 15;
  p.fill(255, 100, 0, 200);
  p.noStroke();
  p.circle(x, y, radius * 2);
  p.fill(255, 255, 0, 150);
  p.circle(x, y, radius);
}

export function drawTitleScreen(p: p5): void {
  p.fill(255, 200, 50);
  p.textSize(14);
  p.textAlign(p.CENTER, p.CENTER);
  p.noStroke();
  p.text("GORILLAS.BAS", WIDTH / 2, HEIGHT / 3);

  p.fill(180);
  p.textSize(9);
  p.text("A QBasic Classic", WIDTH / 2, HEIGHT / 3 + 20);

  p.fill(255);
  p.textSize(10);
  p.text("Press START", WIDTH / 2, HEIGHT * 2 / 3);
}

export function drawConfigScreen(
  p: p5,
  state: GameState,
  cursorPos: number,
): void {
  p.fill(255, 200, 50);
  p.textSize(12);
  p.textAlign(p.CENTER, p.TOP);
  p.noStroke();
  p.text("GORILLAS.BAS", WIDTH / 2, 15);

  const startY = 50;
  const lineH = 28;

  // Player names
  p.textSize(9);
  p.textAlign(p.LEFT, p.TOP);

  p.fill(100, 150, 255);
  p.text(`P1: ${state.playerNames[0]}`, 40, startY);
  p.fill(80, 80, 120);
  p.textSize(7);
  p.text("(spin to re-roll)", 40, startY + 12);

  p.textSize(9);
  p.fill(255, 100, 100);
  p.text(`P2: ${state.playerNames[1]}`, 40, startY + lineH);
  p.fill(80, 80, 120);
  p.textSize(7);
  p.text("(spin to re-roll)", 40, startY + lineH + 12);

  // Settings with cursor
  const settingsY = startY + lineH * 3;
  const settings = [
    { label: "POINTS TO WIN", value: String(state.targetScore) },
    { label: "GRAVITY", value: state.gravityPreset.toUpperCase() },
  ];

  p.textSize(9);
  for (let i = 0; i < settings.length; i++) {
    const y = settingsY + i * lineH;
    const isSelected = cursorPos === i;

    if (isSelected) {
      p.fill(255, 200, 50);
      p.text(">", 30, y);
    }

    p.fill(isSelected ? 255 : 150);
    p.text(`${settings[i].label}:`, 40, y);
    if (isSelected) p.fill(255, 255, 100);
    else p.fill(200);
    p.textAlign(p.RIGHT, p.TOP);
    p.text(`< ${settings[i].value} >`, WIDTH - 40, y);
    p.textAlign(p.LEFT, p.TOP);
  }

  // Start prompt
  p.fill(100, 255, 100);
  p.textSize(9);
  p.textAlign(p.CENTER, p.TOP);
  p.text("Press START to play", WIDTH / 2, HEIGHT - 30);
}

export function drawGameOver(p: p5, state: GameState): void {
  p.fill(255, 100, 100);
  p.textSize(14);
  p.textAlign(p.CENTER, p.CENTER);
  p.noStroke();
  p.text("GAME OVER", WIDTH / 2, HEIGHT / 3);

  p.fill(255);
  p.textSize(10);
  p.text(
    `${state.playerNames[0]}: ${state.scores[0]}`,
    WIDTH / 2,
    HEIGHT / 2 - 10,
  );
  p.text(
    `${state.playerNames[1]}: ${state.scores[1]}`,
    WIDTH / 2,
    HEIGHT / 2 + 10,
  );

  const winner = state.scores[0] >= state.targetScore
    ? state.playerNames[0]
    : state.playerNames[1];
  p.fill(255, 200, 50);
  p.text(`${winner} wins!`, WIDTH / 2, HEIGHT / 2 + 35);

  p.fill(150);
  p.textSize(8);
  p.text("Press START", WIDTH / 2, HEIGHT * 3 / 4);
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/georgemandis/Projects/recurse/2026/gorillas_bas && bun run build
```

- [ ] **Step 3: Commit**

```bash
git add src/ui.ts && git commit -m "feat: add UI rendering (scores, power meter, sun, wind, menus)"
```

---

## Task 7: Cityscape Rendering

**Files:**

- Modify: `src/sketch.ts` (add city drawing to the game loop)

- [ ] **Step 1: Add city rendering function to sketch.ts**

Add a `drawCity` function that renders all buildings and their windows. This
will be called during all gameplay states (aim, power, flight, explosion,
victory).

```typescript
import type { Building } from "./types";
import { BOTTOM_LINE, WINDOW_COLOR_DARK, WINDOW_COLOR_LIT } from "./config";

function drawCity(p: p5, buildings: Building[]): void {
  for (const b of buildings) {
    // Building body
    p.fill(b.color);
    p.noStroke();
    p.rect(b.x, b.y, b.width, b.height);

    // Windows
    for (const w of b.windows) {
      p.fill(w.lit ? WINDOW_COLOR_LIT : WINDOW_COLOR_DARK);
      p.rect(w.x, w.y, 3, 5);
    }
  }
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/georgemandis/Projects/recurse/2026/gorillas_bas && bun run build
```

- [ ] **Step 3: Commit**

```bash
git add src/sketch.ts && git commit -m "feat: add city rendering to game loop"
```

---

## Task 8: Wire Up Complete Game Loop

**Files:**

- Modify: `src/sketch.ts` (full state machine implementation)

This is the largest task — it wires everything together into the complete game
loop with all state transitions.

- [ ] **Step 1: Rewrite src/sketch.ts with full state machine**

Replace the skeleton with the complete game loop. This imports all modules and
implements every state transition:

- TITLE: renders title screen, waits for START → CONFIG
- CONFIG: renders config screen, handles DPAD navigation, spinner re-rolls,
  START → ROUND_START
- ROUND_START: generates city, places gorillas, sets wind, timer → AIM
- AIM: renders gameplay scene + angle indicator, reads spinner, A press → POWER
- POWER: renders gameplay scene + power meter, oscillates meter, A release →
  FLIGHT
- FLIGHT: advances projectile physics each frame, checks collision, draws banana
- EXPLOSION: timed expanding/contracting circle animation → AIM or VICTORY
- VICTORY: gorilla dance animation → ROUND_START or GAME_OVER
- GAME_OVER: final scores, START → TITLE

The full implementation:

```typescript
import p5 from "p5";
import type { GameState, Projectile } from "./types";
import {
  BOTTOM_LINE,
  EXPLOSION_CONTRACT_MS,
  EXPLOSION_EXPAND_MS,
  EXPLOSION_RADIUS,
  GORILLA_HEIGHT,
  GORILLA_WIDTH,
  GRAVITY_PRESET_OPTIONS,
  GRAVITY_VALUES,
  HEIGHT,
  INITIAL_ANGLE_P1,
  INITIAL_ANGLE_P2,
  POWER_CYCLE_MS,
  POWER_DEAD_ZONE_MS,
  ROUND_START_DELAY_MS,
  TARGET_SCORE_OPTIONS,
  VICTORY_DURATION_MS,
  WIDTH,
  WINDOW_COLOR_DARK,
  WINDOW_COLOR_LIT,
} from "./config";
import { getPlayerInput, getSystemInput } from "./input";
import { generateCityscape, generateWind, placeGorillas } from "./city";
import {
  advanceProjectile,
  createProjectile,
  getProjectilePositionWithGravity,
} from "./physics";
import { checkCollision } from "./collision";
import { drawGorilla } from "./gorilla";
import {
  drawAngleIndicator,
  drawConfigScreen,
  drawExplosion,
  drawGameOver,
  drawPowerMeter,
  drawScores,
  drawSun,
  drawTitleScreen,
  drawWindArrow,
} from "./ui";
import { randomName } from "./names";
import type { Building } from "./types";

function createInitialState(): GameState {
  return {
    phase: "title",
    currentPlayer: 1,
    buildings: [],
    gorillas: [
      {
        x: 0,
        y: 0,
        width: GORILLA_WIDTH,
        height: GORILLA_HEIGHT,
        playerNum: 1,
        armState: "down",
      },
      {
        x: 0,
        y: 0,
        width: GORILLA_WIDTH,
        height: GORILLA_HEIGHT,
        playerNum: 2,
        armState: "down",
      },
    ],
    wind: 0,
    gravity: 9.8,
    scores: [0, 0],
    targetScore: 3,
    gravityPreset: "earth",
    playerNames: [randomName(), randomName()],
    angle: INITIAL_ANGLE_P1,
    power: 0,
    projectile: null,
    explosionTimer: 0,
    victoryTimer: 0,
    roundStartTimer: 0,
    powerMeterValue: 0,
    powerMeterDirection: 1,
    powerDeadZoneTimer: 0,
    sunShocked: false,
    lastHitPlayer: null,
  };
}

const sketch = (p: p5) => {
  let state: GameState;
  let configCursor = 0;
  let prevA1 = false;
  let prevA2 = false;
  let prevDpadUp = false;
  let prevDpadDown = false;
  let prevDpadLeft = false;
  let prevDpadRight = false;
  let explosionX = 0;
  let explosionY = 0;
  let bananaRotation = 0;

  p.setup = () => {
    p.createCanvas(WIDTH, HEIGHT);
    state = createInitialState();
  };

  p.draw = () => {
    p.background(20, 20, 40);
    const sys = getSystemInput();
    const p1Input = getPlayerInput(1);
    const p2Input = getPlayerInput(2);
    const activeInput = state.currentPlayer === 1 ? p1Input : p2Input;

    switch (state.phase) {
      case "title":
        updateTitle(sys);
        drawTitleScreen(p);
        break;

      case "config":
        updateConfig(p1Input, p2Input, sys);
        drawConfigScreen(p, state, configCursor);
        break;

      case "round_start":
        updateRoundStart();
        drawGameplay(p);
        break;

      case "aim":
        updateAim(activeInput);
        drawGameplay(p);
        drawAngleIndicator(p, state);
        break;

      case "power":
        updatePower(activeInput);
        drawGameplay(p);
        drawAngleIndicator(p, state);
        drawPowerMeter(p, state);
        break;

      case "flight":
        updateFlight();
        drawGameplay(p);
        drawBanana(p);
        break;

      case "explosion":
        updateExplosion();
        drawGameplay(p);
        drawExplosion(p, explosionX, explosionY, getExplosionProgress());
        break;

      case "victory":
        updateVictory();
        drawGameplay(p);
        break;

      case "game_over":
        updateGameOver(sys);
        drawGameOver(p, state);
        break;
    }

    // Track previous A button state for edge detection
    prevA1 = p1Input.a;
    prevA2 = p2Input.a;
  };

  function updateTitle(sys: ReturnType<typeof getSystemInput>) {
    if (sys.onePlayer || sys.twoPlayer) {
      state.phase = "config";
    }
  }

  function updateConfig(
    p1: ReturnType<typeof getPlayerInput>,
    p2: ReturnType<typeof getPlayerInput>,
    sys: ReturnType<typeof getSystemInput>,
  ) {
    // Spinner re-rolls names
    if (p1.spinnerDelta !== 0) {
      state.playerNames[0] = randomName();
    }
    if (p2.spinnerDelta !== 0) {
      state.playerNames[1] = randomName();
    }

    // DPAD navigation (either player) — edge-detected (one action per press)
    const curUp = p1.dpadUp || p2.dpadUp;
    const curDown = p1.dpadDown || p2.dpadDown;
    const curLeft = p1.dpadLeft || p2.dpadLeft;
    const curRight = p1.dpadRight || p2.dpadRight;

    const dpad = (curUp && !prevDpadUp)
      ? "up"
      : (curDown && !prevDpadDown)
      ? "down"
      : (curLeft && !prevDpadLeft)
      ? "left"
      : (curRight && !prevDpadRight)
      ? "right"
      : null;

    prevDpadUp = curUp;
    prevDpadDown = curDown;
    prevDpadLeft = curLeft;
    prevDpadRight = curRight;

    if (dpad === "up") configCursor = Math.max(0, configCursor - 1);
    if (dpad === "down") configCursor = Math.min(1, configCursor + 1);

    if (dpad === "left" || dpad === "right") {
      const dir = dpad === "right" ? 1 : -1;
      if (configCursor === 0) {
        // Cycle target score
        const idx = TARGET_SCORE_OPTIONS.indexOf(state.targetScore);
        const newIdx = (idx + dir + TARGET_SCORE_OPTIONS.length) %
          TARGET_SCORE_OPTIONS.length;
        state.targetScore = TARGET_SCORE_OPTIONS[newIdx];
      } else {
        // Cycle gravity
        const idx = GRAVITY_PRESET_OPTIONS.indexOf(state.gravityPreset);
        const newIdx = (idx + dir + GRAVITY_PRESET_OPTIONS.length) %
          GRAVITY_PRESET_OPTIONS.length;
        state.gravityPreset = GRAVITY_PRESET_OPTIONS[newIdx];
        state.gravity = GRAVITY_VALUES[state.gravityPreset];
      }
    }

    if (sys.onePlayer || sys.twoPlayer) {
      startNewRound();
    }
  }

  function startNewRound() {
    state.buildings = generateCityscape();
    const positions = placeGorillas(state.buildings);
    state.gorillas[0].x = positions[0].x;
    state.gorillas[0].y = positions[0].y;
    state.gorillas[1].x = positions[1].x;
    state.gorillas[1].y = positions[1].y;
    state.gorillas[0].armState = "down";
    state.gorillas[1].armState = "down";
    state.wind = generateWind();
    state.sunShocked = false;
    state.phase = "round_start";
    state.roundStartTimer = p.millis();
  }

  function updateRoundStart() {
    if (p.millis() - state.roundStartTimer > ROUND_START_DELAY_MS) {
      state.angle = state.currentPlayer === 1
        ? INITIAL_ANGLE_P1
        : INITIAL_ANGLE_P2;
      state.phase = "aim";
    }
  }

  function updateAim(input: ReturnType<typeof getPlayerInput>) {
    // Spinner rotates angle
    if (input.spinnerDelta !== 0) {
      state.angle = (state.angle + input.spinnerDelta + 360) % 360;
    }

    // A button pressed (edge detection)
    const prevA = state.currentPlayer === 1 ? prevA1 : prevA2;
    if (input.a && !prevA) {
      state.phase = "power";
      state.powerMeterValue = 0;
      state.powerMeterDirection = 1;
      state.powerDeadZoneTimer = p.millis();

      // Throwing arm animation
      const gorilla = state.gorillas[state.currentPlayer - 1];
      gorilla.armState = state.currentPlayer === 1 ? "right_up" : "left_up";
    }
  }

  function updatePower(input: ReturnType<typeof getPlayerInput>) {
    // Oscillate power meter
    const elapsed = p.millis() - state.powerDeadZoneTimer;
    // Use sine wave for smooth oscillation: period = POWER_CYCLE_MS
    // Starts at 0, goes to 1, back to 0 in one cycle
    const cycleProgress = ((elapsed - POWER_DEAD_ZONE_MS) % POWER_CYCLE_MS) /
      POWER_CYCLE_MS;
    state.powerMeterValue = Math.abs(Math.sin(cycleProgress * Math.PI));

    // Check for A release (after dead zone)
    if (!input.a && elapsed > POWER_DEAD_ZONE_MS) {
      state.power = state.powerMeterValue * 100;
      launchBanana();
    }
  }

  function launchBanana() {
    const gorilla = state.gorillas[state.currentPlayer - 1];
    const startX = gorilla.x + GORILLA_WIDTH / 2;
    const startY = gorilla.y;

    state.projectile = createProjectile(
      startX,
      startY,
      state.angle,
      state.power,
    );
    state.phase = "flight";
    bananaRotation = 0;

    // Reset arm after brief delay (handled by being in flight state)
    gorilla.armState = "down";
  }

  function updateFlight() {
    if (!state.projectile) return;

    advanceProjectile(state.projectile);
    bananaRotation = (bananaRotation + 0.3) % (Math.PI * 2);

    const pos = getProjectilePositionWithGravity(
      state.projectile,
      state.wind,
      state.gravity,
    );
    const result = checkCollision(
      pos.x,
      pos.y,
      state.projectile.t,
      state.buildings,
      state.gorillas,
    );

    switch (result.type) {
      case "none":
        break;
      case "sun":
        state.sunShocked = true;
        break;
      case "miss":
        state.projectile = null;
        switchPlayer();
        state.angle = state.currentPlayer === 1
          ? INITIAL_ANGLE_P1
          : INITIAL_ANGLE_P2;
        state.phase = "aim";
        break;
      case "building":
        explosionX = pos.x;
        explosionY = pos.y;
        state.projectile = null;
        state.explosionTimer = p.millis();
        state.lastHitPlayer = null;
        state.phase = "explosion";
        break;
      case "gorilla":
        explosionX = pos.x;
        explosionY = pos.y;
        state.projectile = null;
        state.explosionTimer = p.millis();
        state.lastHitPlayer = result.gorilla.playerNum;
        state.phase = "explosion";
        break;
    }
  }

  function updateExplosion() {
    const elapsed = p.millis() - state.explosionTimer;
    const totalDuration = EXPLOSION_EXPAND_MS + EXPLOSION_CONTRACT_MS;

    if (elapsed > totalDuration) {
      if (state.lastHitPlayer !== null) {
        // A gorilla was hit — score point
        if (state.lastHitPlayer === state.currentPlayer) {
          // Self-hit: opponent scores
          const opponent = state.currentPlayer === 1 ? 1 : 0;
          state.scores[opponent]++;
        } else {
          // Hit opponent: thrower scores
          state.scores[state.currentPlayer - 1]++;
        }
        state.victoryTimer = p.millis();
        state.phase = "victory";

        // Set winner for dance
        const winner = state.lastHitPlayer === state.currentPlayer
          ? (3 - state.currentPlayer) as 1 | 2
          : state.currentPlayer;
        state.gorillas[winner - 1].armState = "left_up";
      } else {
        // Building hit — switch player
        switchPlayer();
        state.angle = state.currentPlayer === 1
          ? INITIAL_ANGLE_P1
          : INITIAL_ANGLE_P2;
        state.phase = "aim";
      }
    }
  }

  function getExplosionProgress(): number {
    const elapsed = p.millis() - state.explosionTimer;
    if (elapsed < EXPLOSION_EXPAND_MS) {
      return elapsed / EXPLOSION_EXPAND_MS;
    } else {
      const contractElapsed = elapsed - EXPLOSION_EXPAND_MS;
      return 1 - contractElapsed / EXPLOSION_CONTRACT_MS;
    }
  }

  function updateVictory() {
    const elapsed = p.millis() - state.victoryTimer;

    // Victory dance — alternate arms
    const winner = state.scores[0] > state.scores[1] ? 0 : 1;
    const danceFrame = Math.floor(elapsed / 250) % 2;
    state.gorillas[winner].armState = danceFrame === 0 ? "left_up" : "right_up";

    if (elapsed > VICTORY_DURATION_MS) {
      // Check if game over
      if (
        state.scores[0] >= state.targetScore ||
        state.scores[1] >= state.targetScore
      ) {
        state.phase = "game_over";
      } else {
        // Loser goes first next round
        if (state.lastHitPlayer !== null) {
          state.currentPlayer = state.lastHitPlayer as 1 | 2;
        }
        startNewRound();
      }
    }
  }

  function updateGameOver(sys: ReturnType<typeof getSystemInput>) {
    if (sys.onePlayer || sys.twoPlayer) {
      state = createInitialState();
    }
  }

  function switchPlayer() {
    state.currentPlayer = state.currentPlayer === 1 ? 2 : 1;
  }

  function drawGameplay(p: p5) {
    drawCity(p, state.buildings);
    drawGorilla(p, state.gorillas[0]);
    drawGorilla(p, state.gorillas[1]);
    drawSun(p, state.sunShocked);
    drawWindArrow(p, state.wind);
    drawScores(p, state);
  }

  function drawCity(p: p5, buildings: Building[]) {
    for (const b of buildings) {
      p.fill(b.color);
      p.noStroke();
      p.rect(b.x, b.y, b.width, b.height);
      for (const w of b.windows) {
        p.fill(w.lit ? WINDOW_COLOR_LIT : WINDOW_COLOR_DARK);
        p.rect(w.x, w.y, 3, 5);
      }
    }
  }

  function drawBanana(p: p5) {
    if (!state.projectile) return;
    const pos = getProjectilePositionWithGravity(
      state.projectile,
      state.wind,
      state.gravity,
    );

    // Only draw if on screen
    if (pos.y < -50 || pos.x < -10 || pos.x > WIDTH + 10) return;

    p.push();
    p.translate(pos.x, pos.y);
    p.rotate(bananaRotation);
    p.fill(255, 255, 0);
    p.noStroke();
    // Simple banana shape — arc
    p.arc(0, 0, 8, 6, 0, Math.PI);
    p.pop();
  }
};

new p5(sketch, document.getElementById("sketch")!);
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/georgemandis/Projects/recurse/2026/gorillas_bas && bun run build
```

- [ ] **Step 3: Run dev server and manually verify title screen appears**

```bash
cd /Users/georgemandis/Projects/recurse/2026/gorillas_bas && bun run dev
```

Open the RCade emulator URL. Verify:

- Title screen shows "GORILLAS.BAS" and "Press START"
- Pressing 1 (one player start) transitions to config screen

- [ ] **Step 4: Commit**

```bash
git add src/sketch.ts && git commit -m "feat: wire up complete game loop with all state transitions"
```

---

## Task 9: Playtest & Fix Issues

**Files:**

- Modify: various files as needed

- [ ] **Step 1: Run dev server and play through a full game**

```bash
cd /Users/georgemandis/Projects/recurse/2026/gorillas_bas && bun run dev
```

Test the following flow:

1. Title → START → Config screen
2. Config: spin to re-roll names, DPAD to change settings, START to begin
3. Round starts: city generates, gorillas placed, wind arrow shown
4. AIM: spinner (C/V keys) rotates angle arrow around gorilla
5. POWER: press F (A button), meter oscillates, release F to throw
6. FLIGHT: banana arcs across screen with physics
7. Hit building → explosion → other player's turn
8. Hit gorilla → explosion → victory dance → next round
9. Reach target score → game over screen
10. START → back to title

- [ ] **Step 2: Fix any bugs found during playtest**

Common issues to watch for:

- Angle arrow direction not matching throw direction
- Power meter not visible or oscillating incorrectly
- Banana trajectory not accounting for player side correctly
- Collision not detecting hits properly
- State transitions getting stuck

- [ ] **Step 3: Commit fixes**

```bash
git add -A && git commit -m "fix: playtest fixes for game loop"
```

---

## Task 10: Polish & Edge Cases

**Files:**

- Modify: `src/sketch.ts`, `src/ui.ts` as needed

- [ ] **Step 1: Handle edge case — banana thrown straight down or backwards**

Verify the physics handles all angle ranges gracefully and the banana doesn't
get stuck in the throwing gorilla's own building immediately.

- [ ] **Step 2: Ensure gorilla can't be placed off-screen on very narrow
      cityscapes**

Add bounds checking in `placeGorillas` to clamp gorilla positions within screen
bounds.

- [ ] **Step 3: Final build verification**

```bash
cd /Users/georgemandis/Projects/recurse/2026/gorillas_bas && bun run build
```

Ensure clean build with no warnings.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "fix: polish edge cases"
```

---

## Summary

| Task | What it builds               | Key files                               |
| ---- | ---------------------------- | --------------------------------------- |
| 1    | Project setup, types, config | types.ts, config.ts, sketch.ts skeleton |
| 2    | Input abstraction + names    | input.ts, names.ts                      |
| 3    | Cityscape generation         | city.ts                                 |
| 4    | Physics & collision          | physics.ts, collision.ts                |
| 5    | Gorilla rendering            | gorilla.ts                              |
| 6    | UI components                | ui.ts                                   |
| 7    | City rendering in game loop  | sketch.ts                               |
| 8    | Full game loop wiring        | sketch.ts (complete rewrite)            |
| 9    | Playtest & fix               | various                                 |
| 10   | Polish & edge cases          | various                                 |

Tasks 1-6 are independent modules that can be built in parallel. Task 7-8
integrate everything. Tasks 9-10 are sequential testing/fixing passes.
