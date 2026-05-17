# Power-Up System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a power-up crate and inventory system with 9 banana power-up types to GORILLAS.BAS.

**Architecture:** New modules `powerups.ts` and `powerup-behaviors.ts` handle power-up logic, keeping `sketch.ts` as the orchestrator. Power-ups that modify mid-flight physics (ricochet, wrap, portal) use a "projectile restart" pattern — creating a new projectile from the event point with modified velocity and `t=0`. The existing parametric physics model is unchanged.

**Tech Stack:** P5.js, TypeScript, Vite, Bun

**Spec:** `docs/superpowers/specs/2026-05-17-powerups-design.md`

---

## File Structure

| File | Role | Status |
|------|------|--------|
| `src/types.ts` | Add PowerUpType, PowerUpCrate, Portal types; extend GameState and Projectile | Modify |
| `src/powerups.ts` | Crate spawn/placement, inventory management, selection cycling, crate drawing | Create |
| `src/powerup-behaviors.ts` | Flight/collision modifiers per power-up type | Create |
| `src/collision.ts` | Add crate collision (after gorillas, before buildings) | Modify |
| `src/physics.ts` | Add `restartProjectile()` for bounce/wrap/portal, `splitProjectile()` for cluster | Modify |
| `src/sketch.ts` | Wire up crate spawning, B-button cycling, power-up activation, extra throw handling | Modify |
| `src/ui.ts` | Inventory icons, power-up aim indicator, portal markers, confetti particles | Modify |
| `src/gorilla.ts` | Poison green tint rendering | Modify |
| `src/sound.ts` | New sounds: crate_collect, crate_land, powerup_select, teleport_zap, portal_whoosh, confetti_pop, cluster_split, poison_hit | Modify |
| `src/city.ts` | Add `randomGorillaPlacements()` for teleportation | Modify |
| `src/config.ts` | New constants (crate size, spawn chance, explosion multipliers, etc.) | Modify |

---

### Task 1: Type Definitions

**Files:**
- Modify: `src/types.ts`
- Modify: `src/config.ts`

- [ ] **Step 1: Add power-up types to `src/types.ts`**

Add after the `CityTheme` type:

```typescript
export type PowerUpType = "big_banana" | "two_bananas" | "ricochet" | "wrap_around"
  | "cluster_bomb" | "teleportation" | "portal" | "confetti" | "poison";

export interface PowerUpCrate {
  x: number;
  y: number;
  targetY: number;
  buildingIdx: number;
  powerUp: PowerUpType;
  falling: boolean;
  fallY: number;
  fallVx: number;
}

export interface Portal {
  edge: "left" | "right";
  x: number;
  y: number;
  color: "orange" | "blue";
}
```

- [ ] **Step 2: Extend `Projectile` interface in `src/types.ts`**

Add optional fields to the existing `Projectile` interface:

```typescript
export interface Projectile {
  startX: number;
  startY: number;
  vx: number;
  vy: number;
  t: number;
  active: boolean;
  // Power-up extensions
  bouncesRemaining?: number;
  wrapsRemaining?: number;
  portalPassesRemaining?: number;
  isSubProjectile?: boolean;
  splitTimer?: number;        // millis() timestamp for cluster bomb
  explosionRadius?: number;   // override for big banana / sub-projectiles
}
```

- [ ] **Step 3: Extend `GameState` interface in `src/types.ts`**

Add after `lastHitPlayer`:

```typescript
  crate: PowerUpCrate | null;
  inventory: [PowerUpType[], PowerUpType[]];
  selectedPowerUp: PowerUpType | null;
  selectedSlotIndex: number;          // -1 = no selection, 0-2 = inventory slot
  extraThrowRemaining: boolean;
  isExtraThrow: boolean;
  portals: [Portal | null, Portal | null];
  activeSubProjectiles: Projectile[];
  poisonTurns: [number, number];
```

- [ ] **Step 4: Add power-up constants to `src/config.ts`**

```typescript
// Power-ups
export const CRATE_SPAWN_CHANCE = 0.2; // 1 in 5
export const CRATE_SIZE = 10;
export const MAX_INVENTORY = 3;
export const BIG_BANANA_EXPLOSION_MULT = 2.5;
export const BIG_BANANA_VISUAL_SCALE = 2;
export const CLUSTER_SPLIT_MS = 1200;
export const CLUSTER_SUB_COUNT = 5;
export const CLUSTER_FAN_DEGREES = 60;
export const CLUSTER_EXPLOSION_MULT = 0.5;
export const RICOCHET_MAX_BOUNCES = 3;
export const WRAP_MAX_WRAPS = 3;
export const PORTAL_MAX_PASSES = 3;
export const POISON_TURNS = 3;
export const POISON_POWER_CAP = 0.4;
export const ALL_POWERUP_TYPES: PowerUpType[] = [
  "big_banana", "two_bananas", "ricochet", "wrap_around",
  "cluster_bomb", "teleportation", "portal", "confetti", "poison",
];
```

Add import for `PowerUpType` at top of config.ts.

- [ ] **Step 5: Update `createInitialState()` in `src/sketch.ts`**

Add the new fields to the return object:

```typescript
    crate: null,
    inventory: [[], []],
    selectedPowerUp: null,
    selectedSlotIndex: -1,
    extraThrowRemaining: false,
    isExtraThrow: false,
    portals: [null, null],
    activeSubProjectiles: [],
    poisonTurns: [0, 0],
```

- [ ] **Step 6: Build and type-check**

Run: `npx tsc --noEmit 2>&1 | grep -v node_modules`
Expected: No errors (there may be unused variable warnings — that's fine for now)

Run: `bun run build`
Expected: Build succeeds

- [ ] **Step 7: Commit**

```
git add src/types.ts src/config.ts src/sketch.ts
git commit -m "feat(powerups): add type definitions and state fields"
```

---

### Task 2: Crate Spawn, Fall, and Drawing

**Files:**
- Create: `src/powerups.ts`
- Modify: `src/sketch.ts`
- Modify: `src/config.ts`

- [ ] **Step 1: Create `src/powerups.ts` with crate spawn logic**

```typescript
import type { GameState, PowerUpCrate, PowerUpType, Building } from "./types";
import {
  WIDTH, CRATE_SPAWN_CHANCE, CRATE_SIZE, ALL_POWERUP_TYPES,
} from "./config";
import p5 from "p5";

export function trySpawnCrate(state: GameState, wind: number): void {
  if (state.crate !== null) return;
  if (state.isExtraThrow) return;
  if (Math.random() >= CRATE_SPAWN_CHANCE) return;

  // Pick a building in the middle third
  const minX = WIDTH / 3;
  const maxX = (2 * WIDTH) / 3;
  const candidates = state.buildings
    .map((b, i) => ({ b, i }))
    .filter(({ b }) => {
      const cx = b.x + b.width / 2;
      return cx >= minX && cx <= maxX;
    });

  if (candidates.length === 0) return;

  const { b, i } = candidates[Math.floor(Math.random() * candidates.length)];
  const crateX = b.x + b.width / 2 - CRATE_SIZE / 2;
  const targetY = b.y - CRATE_SIZE;

  state.crate = {
    x: crateX,
    y: targetY,
    targetY,
    buildingIdx: i,
    powerUp: ALL_POWERUP_TYPES[Math.floor(Math.random() * ALL_POWERUP_TYPES.length)],
    falling: true,
    fallY: -20,
    fallVx: wind * 0.3,
  };
}

export function updateCrateFall(crate: PowerUpCrate): void {
  if (!crate.falling) return;

  crate.fallY += 1.5; // fall speed

  if (crate.fallY >= crate.targetY) {
    // Land on target building
    crate.fallY = crate.targetY;
    crate.falling = false;
    crate.y = crate.targetY;
  }
}

export function drawCrate(p: p5, crate: PowerUpCrate): void {
  const drawX = crate.x;
  const drawY = crate.falling ? crate.fallY : crate.y;

  // Parachute during fall
  if (crate.falling) {
    const driftX = drawX + crate.fallVx * (crate.fallY / crate.targetY);
    // Clamp drift to be cosmetic only — draw parachute offset but crate stays on path
    p.stroke(200);
    p.strokeWeight(1);
    // Parachute canopy
    p.fill(255, 255, 255, 150);
    p.arc(drawX + CRATE_SIZE / 2, drawY - 8, 16, 10, Math.PI, Math.PI * 2);
    // Lines from canopy to crate
    p.line(drawX + CRATE_SIZE / 2 - 6, drawY - 5, drawX + 1, drawY);
    p.line(drawX + CRATE_SIZE / 2 + 6, drawY - 5, drawX + CRATE_SIZE - 1, drawY);
    p.noStroke();
  }

  // Crate box — flashing
  const flash = Math.floor(p.millis() / 300) % 2 === 0;
  p.fill(flash ? "#e8a020" : "#d06020");
  p.noStroke();
  p.rect(drawX, drawY, CRATE_SIZE, CRATE_SIZE);

  // Border
  p.stroke(flash ? "#ffcc44" : "#ff8844");
  p.strokeWeight(1);
  p.noFill();
  p.rect(drawX, drawY, CRATE_SIZE, CRATE_SIZE);

  // Question mark
  p.fill(255);
  p.noStroke();
  p.textSize(6);
  p.textAlign(p.CENTER, p.CENTER);
  p.text("?", drawX + CRATE_SIZE / 2, drawY + CRATE_SIZE / 2);
}
```

- [ ] **Step 2: Wire up crate spawn and drawing in `src/sketch.ts`**

Add import at top:
```typescript
import { trySpawnCrate, updateCrateFall, drawCrate } from "./powerups";
```

In `updateAim()`, at the very start (before spinner handling):
```typescript
    // Spawn crate at start of turn (not extra throws)
    if (!state.isExtraThrow && state.crate === null) {
      trySpawnCrate(state, state.wind);
    }
```

Wait — `trySpawnCrate` already checks `isExtraThrow`. But we only want to roll once per aim entry, not every frame. Add a local flag:
Actually, the spawn check already has `state.crate !== null` guard and the random roll, so calling it every frame is fine — once a crate spawns, `state.crate !== null` prevents further rolls. But we should only try on the first frame of aim. Better approach: call `trySpawnCrate` in the transition TO aim phase (in `updateRoundStart` and after miss/building-hit), not in `updateAim` itself.

In `updateRoundStart()`, after `state.phase = "aim"`:
```typescript
      trySpawnCrate(state, state.wind);
```

In `updateFlight()`, in the `case "miss"` block, after setting `state.phase = "aim"`:
```typescript
        trySpawnCrate(state, state.wind);
```

In `updateExplosion()`, in the building-hit else branch, after setting `state.phase = "aim"`:
```typescript
        trySpawnCrate(state, state.wind);
```

In the `drawGameplay()` function, add after drawing buildings and before drawing gorillas:
```typescript
    // Draw crate
    if (state.crate) {
      updateCrateFall(state.crate);
      drawCrate(p, state.crate);
    }
```

In `startNewRound()`, add:
```typescript
    state.crate = null;
    state.portals = [null, null];
    state.activeSubProjectiles = [];
    state.extraThrowRemaining = false;
    state.isExtraThrow = false;
    state.selectedPowerUp = null;
```

- [ ] **Step 3: Build and verify**

Run: `npx tsc --noEmit 2>&1 | grep -v node_modules`
Expected: No errors

Run: `bun run build`
Expected: Build succeeds

Test manually: run the dev server, play through a few turns. Crates should occasionally parachute in and land on middle buildings.

- [ ] **Step 4: Commit**

```
git add src/powerups.ts src/sketch.ts src/config.ts
git commit -m "feat(powerups): crate spawn, parachute fall, and drawing"
```

---

### Task 3: Crate Collision and Collection

**Files:**
- Modify: `src/collision.ts`
- Modify: `src/powerups.ts`
- Modify: `src/sketch.ts`
- Modify: `src/sound.ts`

- [ ] **Step 1: Add crate collision type to `src/collision.ts`**

Update the `CollisionResult` type:
```typescript
export type CollisionResult =
  | { type: "none" }
  | { type: "miss" }
  | { type: "building"; building: Building }
  | { type: "gorilla"; gorilla: Gorilla }
  | { type: "sun" }
  | { type: "crate" };
```

Update the `checkCollision` function signature to accept a crate parameter:
```typescript
export function checkCollision(
  x: number,
  y: number,
  t: number,
  buildings: Building[],
  gorillas: [Gorilla, Gorilla],
  crate?: { x: number; y: number; width: number; height: number } | null
): CollisionResult {
```

Add crate check AFTER the gorilla loop but BEFORE the building loop:
```typescript
  // Check crate (after gorillas, before buildings)
  if (crate && !crate.falling) {
    if (x >= crate.x && x <= crate.x + crate.width &&
        y >= crate.y && y <= crate.y + crate.height) {
      return { type: "crate" };
    }
  }
```

Wait — the crate object from GameState is `PowerUpCrate` which doesn't have `width`/`height`. Pass a simpler shape. Update the parameter to just check against `CRATE_SIZE`:

```typescript
export function checkCollision(
  x: number,
  y: number,
  t: number,
  buildings: Building[],
  gorillas: [Gorilla, Gorilla],
  crate?: PowerUpCrate | null
): CollisionResult {
```

Add import for `PowerUpCrate` and `CRATE_SIZE`:
```typescript
import type { Building, Gorilla, PowerUpCrate } from "./types";
import { WIDTH, MAX_FLIGHT_T, SUN_X, SUN_Y, SUN_RADIUS, BOTTOM_LINE, CRATE_SIZE } from "./config";
```

Crate collision check (after gorillas, before buildings):
```typescript
  if (crate && !crate.falling) {
    if (x >= crate.x && x <= crate.x + CRATE_SIZE &&
        y >= crate.y && y <= crate.y + CRATE_SIZE) {
      return { type: "crate" };
    }
  }
```

- [ ] **Step 2: Add collection logic to `src/powerups.ts`**

```typescript
import { MAX_INVENTORY } from "./config";

export function collectCrate(state: GameState, playerIdx: 0 | 1): PowerUpType | null {
  if (!state.crate) return null;
  const powerUp = state.crate.powerUp;
  state.crate = null;

  if (state.inventory[playerIdx].length < MAX_INVENTORY) {
    state.inventory[playerIdx].push(powerUp);
    return powerUp;
  }
  // Inventory full — crate destroyed, nothing collected
  return null;
}
```

- [ ] **Step 3: Handle crate collision in `src/sketch.ts`**

In `updateFlight()`, update the `checkCollision` call to pass the crate:
```typescript
    const result = checkCollision(pos.x, pos.y, state.projectile.t, state.buildings, state.gorillas, state.crate);
```

Add a new case in the switch:
```typescript
      case "crate":
        explosionX = pos.x;
        explosionY = pos.y;
        state.projectile = null;
        state.explosionTimer = p.millis();
        state.lastHitPlayer = null;
        state.phase = "explosion";
        const playerIdx = (state.currentPlayer - 1) as 0 | 1;
        const collected = collectCrate(state, playerIdx);
        if (collected) {
          playSound("crate_collect");
        } else {
          playSound("explosion");
        }
        break;
```

Add import for `collectCrate`.

- [ ] **Step 4: Add crate sounds to `src/sound.ts`**

Update the `SoundName` type:
```typescript
export type SoundName = ... | "crate_collect" | "crate_land" | "powerup_select";
```

Add cases in the `playSound` switch and implement:

```typescript
case "crate_collect": playCrateCollect(); break;
case "crate_land": playCrateLand(); break;
case "powerup_select": playPowerupSelect(); break;
```

```typescript
function playCrateCollect() {
  const c = getCtx();
  // Cheerful ascending arpeggio
  [600, 800, 1000, 1200].forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    const t = c.currentTime + i * 0.08;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.12);
  });
}

function playCrateLand() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(200, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, c.currentTime + 0.15);
  gain.gain.setValueAtTime(0.15, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.15);
}

function playPowerupSelect() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(500, c.currentTime);
  osc.frequency.setValueAtTime(700, c.currentTime + 0.05);
  gain.gain.setValueAtTime(0.1, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.1);
}
```

Also add `crate_land` sound playback in `updateCrateFall` in `powerups.ts` when the crate finishes falling. This requires passing a sound callback or importing `playSound`. Simplest: import and call directly:

In `powerups.ts`:
```typescript
import { playSound } from "./sound";
```

In `updateCrateFall`, when landing:
```typescript
  if (crate.fallY >= crate.targetY) {
    crate.fallY = crate.targetY;
    crate.falling = false;
    crate.y = crate.targetY;
    playSound("crate_land");
  }
```

- [ ] **Step 5: Build and verify**

Run: `npx tsc --noEmit 2>&1 | grep -v node_modules`
Expected: No errors

Test manually: throw bananas at crates. Verify collection sound plays, crate disappears, and turn ends.

- [ ] **Step 6: Commit**

```
git add src/collision.ts src/powerups.ts src/sketch.ts src/sound.ts
git commit -m "feat(powerups): crate collision, collection, and sounds"
```

---

### Task 4: B-Button Power-Up Cycling and Inventory HUD

**Files:**
- Modify: `src/powerups.ts`
- Modify: `src/sketch.ts`
- Modify: `src/ui.ts`

- [ ] **Step 1: Add cycling logic to `src/powerups.ts`**

```typescript
// Track selected slot by index to handle duplicate power-up types correctly
export function cycleSelectedPowerUp(state: GameState, playerIdx: 0 | 1): void {
  const inv = state.inventory[playerIdx];
  if (inv.length === 0) {
    state.selectedPowerUp = null;
    state.selectedSlotIndex = -1;
    return;
  }

  if (state.selectedSlotIndex === -1 || state.selectedPowerUp === null) {
    // Select first item
    state.selectedSlotIndex = 0;
    state.selectedPowerUp = inv[0];
  } else if (state.selectedSlotIndex >= inv.length - 1) {
    // Wrap back to null (normal banana)
    state.selectedSlotIndex = -1;
    state.selectedPowerUp = null;
  } else {
    state.selectedSlotIndex++;
    state.selectedPowerUp = inv[state.selectedSlotIndex];
  }
}

export function consumeSelectedPowerUp(state: GameState, playerIdx: 0 | 1): PowerUpType | null {
  const selected = state.selectedPowerUp;
  if (!selected || state.selectedSlotIndex === -1) return null;

  const inv = state.inventory[playerIdx];
  if (state.selectedSlotIndex < inv.length) {
    inv.splice(state.selectedSlotIndex, 1);
  }
  state.selectedPowerUp = null;
  state.selectedSlotIndex = -1;
  return selected;
}
```

- [ ] **Step 2: Wire B-button cycling in `src/sketch.ts`**

In `updateAim()`, add B-button handling for the active player. The active player's B currently triggers taunts via `updateTaunts`. We need to intercept B for the active player and use it for power-up cycling instead.

In `updateTaunts()`, change the idle player B taunt to only fire for the idle player (it already does — `idleInput.b && !idlePrevB`). Remove the active player's ability to use B for taunts by... actually, looking at the code, the active player taunts via DPAD, not B. The idle player uses A for dance and B for bubble. So B-button is already free for the active player during `aim`!

Add in `updateAim()`, after the spinner handling, before the A-button check:
```typescript
    // B button cycles power-up selection (active player)
    const prevB = state.currentPlayer === 1 ? prevB1 : prevB2;
    if (input.b && !prevB) {
      cycleSelectedPowerUp(state, (state.currentPlayer - 1) as 0 | 1);
      playSound("powerup_select");
    }
```

Add import for `cycleSelectedPowerUp`.

- [ ] **Step 3: Add inventory HUD to `src/ui.ts`**

Add a new exported function:

```typescript
export function drawInventoryHUD(p: p5, state: GameState): void {
  const iconSize = 5;
  const spacing = 7;

  // Player 1 inventory — below score, left side
  for (let i = 0; i < state.inventory[0].length; i++) {
    const x = 4 + i * spacing;
    const y = 12;
    drawPowerUpIcon(p, x, y, iconSize, state.inventory[0][i]);
  }

  // Player 2 inventory — below score, right side
  for (let i = 0; i < state.inventory[1].length; i++) {
    const x = WIDTH - 4 - (state.inventory[1].length - i) * spacing;
    const y = 12;
    drawPowerUpIcon(p, x, y, iconSize, state.inventory[1][i]);
  }
}

function drawPowerUpIcon(p: p5, x: number, y: number, size: number, type: PowerUpType): void {
  p.noStroke();
  switch (type) {
    case "big_banana":
      p.fill(255, 255, 0);
      p.circle(x + size / 2, y + size / 2, size);
      break;
    case "two_bananas":
      p.fill(255, 255, 0);
      p.circle(x + 1, y + size / 2, size * 0.7);
      p.circle(x + size - 1, y + size / 2, size * 0.7);
      break;
    case "ricochet":
      p.fill(0, 200, 255);
      p.circle(x + size / 2, y + size / 2, size);
      break;
    case "wrap_around":
      p.fill(200, 0, 255);
      p.circle(x + size / 2, y + size / 2, size);
      break;
    case "cluster_bomb":
      p.fill(255, 100, 0);
      p.circle(x + size / 2, y + size / 2, size);
      break;
    case "teleportation":
      p.fill(0, 255, 200);
      p.circle(x + size / 2, y + size / 2, size);
      break;
    case "portal":
      p.fill(255, 140, 0);
      p.circle(x + size / 2, y + size / 2, size);
      p.fill(0, 140, 255);
      p.circle(x + size / 2, y + size / 2, size * 0.5);
      break;
    case "confetti":
      p.fill(255, 255, 0);
      p.circle(x + size / 2, y + size / 2, size);
      break;
    case "poison":
      p.fill(0, 200, 0);
      p.circle(x + size / 2, y + size / 2, size);
      break;
  }
}
```

Import `PowerUpType` from types, and `WIDTH` from config.

- [ ] **Step 4: Draw inventory HUD in `src/sketch.ts`**

In `drawGameplay()`, after `drawScores(p, state)`:
```typescript
    drawInventoryHUD(p, state);
```

Import `drawInventoryHUD` from `"./ui"`.

- [ ] **Step 5: Update aim indicator to show selected power-up**

In `drawAngleIndicator()` in `src/ui.ts`, the pulsating banana at the end of the aim arrow is drawn as:
```typescript
p.arc(0, 0, 8, 6, 0, Math.PI);
```

Update this to accept the selected power-up and change the icon. Modify the function signature:
```typescript
export function drawAngleIndicator(p: p5, state: GameState): void {
```

After the `p.scale(scale)` call, replace the banana drawing with a switch on `state.selectedPowerUp`:

```typescript
    p.fill(255, 255, 0);
    p.noStroke();
    switch (state.selectedPowerUp) {
      case "big_banana":
        p.arc(0, 0, 12, 9, 0, Math.PI); // bigger
        break;
      case "two_bananas":
        p.arc(-3, 0, 6, 4, 0, Math.PI);
        p.arc(3, 0, 6, 4, 0, Math.PI);
        break;
      case "ricochet":
        p.fill(0, 200, 255);
        p.arc(0, 0, 8, 6, 0, Math.PI);
        break;
      case "wrap_around":
        p.fill(200, 0, 255);
        p.arc(0, 0, 8, 6, 0, Math.PI);
        break;
      case "cluster_bomb":
        p.fill(255, 100, 0);
        p.arc(0, 0, 8, 6, 0, Math.PI);
        // sparkle dots
        p.fill(255, 255, 0);
        p.circle(-3, -3, 2);
        p.circle(3, -3, 2);
        break;
      case "teleportation":
        p.fill(0, 255, 200);
        p.arc(0, 0, 8, 6, 0, Math.PI);
        break;
      case "portal":
        p.fill(255, 140, 0);
        p.arc(0, 0, 8, 6, 0, Math.PI);
        // ring
        p.noFill();
        p.stroke(0, 140, 255);
        p.strokeWeight(1);
        p.circle(0, 0, 10);
        p.noStroke();
        break;
      case "poison":
        p.fill(0, 200, 0);
        p.arc(0, 0, 8, 6, 0, Math.PI);
        break;
      case "confetti":
      case null:
      default:
        // Normal banana (confetti intentionally looks the same)
        p.arc(0, 0, 8, 6, 0, Math.PI);
        break;
    }
```

- [ ] **Step 6: Reset selectedPowerUp on player switch**

In `switchPlayer()` in `src/sketch.ts`:
```typescript
  function switchPlayer() {
    state.currentPlayer = state.currentPlayer === 1 ? 2 : 1;
    state.selectedPowerUp = null;
    state.selectedSlotIndex = -1;
    state.isExtraThrow = false;
  }
```

- [ ] **Step 7: Build and verify**

Run: `npx tsc --noEmit 2>&1 | grep -v node_modules`
Expected: No errors

Test manually: collect a crate, press B to cycle through power-ups, verify aim indicator changes and inventory icons appear.

- [ ] **Step 8: Commit**

```
git add src/powerups.ts src/sketch.ts src/ui.ts
git commit -m "feat(powerups): B-button cycling, inventory HUD, aim indicator"
```

---

### Task 5: Big Banana and Two Bananas

**Files:**
- Create: `src/powerup-behaviors.ts`
- Modify: `src/sketch.ts`
- Modify: `src/powerups.ts`

- [ ] **Step 1: Create `src/powerup-behaviors.ts`**

Start with a function that applies power-up properties to a newly launched projectile:

```typescript
import type { Projectile, PowerUpType } from "./types";
import {
  BIG_BANANA_EXPLOSION_MULT, EXPLOSION_RADIUS,
  RICOCHET_MAX_BOUNCES, WRAP_MAX_WRAPS, PORTAL_MAX_PASSES,
  CLUSTER_SPLIT_MS,
} from "./config";

export function applyPowerUpToProjectile(
  proj: Projectile,
  powerUp: PowerUpType | null,
  launchTime: number
): void {
  if (!powerUp) return;

  switch (powerUp) {
    case "big_banana":
      proj.explosionRadius = EXPLOSION_RADIUS * BIG_BANANA_EXPLOSION_MULT;
      break;
    case "ricochet":
      proj.bouncesRemaining = RICOCHET_MAX_BOUNCES;
      break;
    case "wrap_around":
      proj.wrapsRemaining = WRAP_MAX_WRAPS;
      break;
    case "cluster_bomb":
      proj.splitTimer = launchTime + CLUSTER_SPLIT_MS;
      break;
    case "portal":
      proj.portalPassesRemaining = PORTAL_MAX_PASSES;
      break;
    // two_bananas, teleportation, confetti, poison: no projectile mods needed
  }
}
```

- [ ] **Step 2: Wire power-up consumption into `launchBanana()` in `src/sketch.ts`**

At the start of `launchBanana()`, consume the selected power-up and apply it:

```typescript
import { consumeSelectedPowerUp } from "./powerups";
import { applyPowerUpToProjectile } from "./powerup-behaviors";
```

In `launchBanana()`, after creating the projectile:
```typescript
    state.projectile = createProjectile(startX, startY, state.angle, state.power);

    // Apply active power-up
    const activePowerUp = consumeSelectedPowerUp(state, (state.currentPlayer - 1) as 0 | 1);
    applyPowerUpToProjectile(state.projectile, activePowerUp, p.millis());

    // Track active power-up type for flight/collision behavior
    // Store it temporarily so updateFlight knows what to do
    state.selectedPowerUp = activePowerUp; // repurpose: during flight, this tracks the active throw's type
```

Wait — `consumeSelectedPowerUp` sets `state.selectedPowerUp = null`. We need the type during flight. Better: add a separate field, or just store it in a local variable. Simplest: add `activePowerUpType: PowerUpType | null` to GameState, or just use a local sketch variable.

Actually, let's add `activePowerUpType` to the `Projectile` itself:

In `src/types.ts`, add to Projectile:
```typescript
  powerUpType?: PowerUpType;
```

In `applyPowerUpToProjectile`, add:
```typescript
  proj.powerUpType = powerUp;
```

Then in `updateFlight`, read `state.projectile.powerUpType` to determine behavior.

- [ ] **Step 3: Implement Big Banana explosion radius**

In `updateFlight()` in `src/sketch.ts`, in the `"building"` case, replace the hardcoded `EXPLOSION_RADIUS`:

```typescript
      case "building":
        explosionX = pos.x;
        explosionY = pos.y;
        const buildingExpRadius = state.projectile.explosionRadius ?? EXPLOSION_RADIUS;
        activeExplosionRadius = buildingExpRadius; // track for visual
        state.projectile = null;
        state.explosionTimer = p.millis();
        state.lastHitPlayer = null;
        state.phase = "explosion";
        result.building.damage.push({ cx: pos.x, cy: pos.y, radius: buildingExpRadius });
        playSound("explosion");
        break;
```

Add a sketch-level variable to track the active explosion size:
```typescript
  let activeExplosionRadius = EXPLOSION_RADIUS;
```

Also set it in the gorilla hit case:
```typescript
        activeExplosionRadius = state.projectile?.explosionRadius ?? EXPLOSION_RADIUS;
```

Update `drawExplosion` in `src/ui.ts` to accept an optional radius override:
```typescript
export function drawExplosion(p: p5, x: number, y: number, progress: number, maxRadius?: number): void {
  const radius = progress * (maxRadius ?? 15);
  p.fill(255, 100, 0, 200);
  p.noStroke();
  p.circle(x, y, radius * 2);
  p.fill(255, 255, 0, 150);
  p.circle(x, y, radius);
}
```

Update the call site in the explosion phase drawing:
```typescript
        drawExplosion(p, explosionX, explosionY, getExplosionProgress(), activeExplosionRadius);
```

Also update the `drawBanana` function to draw bigger when `explosionRadius` is set:

In `drawBanana()`:
```typescript
  function drawBanana(p: p5) {
    if (!state.projectile) return;
    const pos = getProjectilePositionWithGravity(state.projectile, state.wind, state.gravity);
    if (pos.y < -50 || pos.x < -10 || pos.x > WIDTH + 10) return;

    const scale = state.projectile.explosionRadius
      ? (state.projectile.explosionRadius / EXPLOSION_RADIUS)
      : 1;

    p.push();
    p.translate(pos.x, pos.y);
    p.rotate(bananaRotation);
    p.fill(255, 255, 0);
    p.noStroke();
    p.arc(0, 0, 8 * scale, 6 * scale, 0, Math.PI);
    p.pop();
  }
```

- [ ] **Step 4: Implement Two Bananas extra throw**

In `launchBanana()`, after applying the power-up, set the extra throw flag:
```typescript
    if (activePowerUp === "two_bananas") {
      state.extraThrowRemaining = true;
    }
```

In `updateFlight()`, modify the `"miss"`, `"building"`, and `"crate"` resolution to check `extraThrowRemaining` before switching players:

Create a helper:
```typescript
  function resolveThrowEnd() {
    if (state.extraThrowRemaining) {
      state.extraThrowRemaining = false;
      state.isExtraThrow = true;
      state.angle = lastAngles[state.currentPlayer - 1];
      state.phase = "aim";
    } else {
      state.isExtraThrow = false;
      switchPlayer();
      state.angle = lastAngles[state.currentPlayer - 1];
      state.phase = "aim";
      trySpawnCrate(state, state.wind);
    }
  }
```

Replace the `switchPlayer()` + `state.phase = "aim"` blocks in the miss case and in `updateExplosion()` building-hit branch with `resolveThrowEnd()`.

Note: gorilla hits still go to the victory flow, not `resolveThrowEnd`. Two Bananas second throw is only granted on miss or building hit.

- [ ] **Step 5: Build and verify**

Run: `npx tsc --noEmit 2>&1 | grep -v node_modules`
Expected: No errors

Test manually:
- Collect a crate, get Big Banana, throw it — should see a larger banana and bigger explosion
- Collect Two Bananas — should get a second throw after the first resolves

- [ ] **Step 6: Commit**

```
git add src/powerup-behaviors.ts src/sketch.ts src/types.ts src/powerups.ts
git commit -m "feat(powerups): big banana and two bananas behaviors"
```

---

### Task 6: Ricochet and Wrap-Around

**Files:**
- Modify: `src/physics.ts`
- Modify: `src/powerup-behaviors.ts`
- Modify: `src/sketch.ts`
- Modify: `src/collision.ts`

- [ ] **Step 1: Add `restartProjectile` to `src/physics.ts`**

This creates a new projectile from a given position with a given velocity, preserving metadata:

```typescript
export function restartProjectile(
  proj: Projectile,
  newX: number,
  newY: number,
  newVx: number,
  newVy: number
): Projectile {
  return {
    ...proj,
    startX: newX,
    startY: newY,
    vx: newVx,
    vy: newVy,
    t: 0,
  };
}
```

The spread copies all optional fields (bouncesRemaining, wrapsRemaining, etc.).

- [ ] **Step 2: Add edge-handling functions to `src/powerup-behaviors.ts`**

```typescript
import { restartProjectile, getProjectilePositionWithGravity } from "./physics";
import { WIDTH } from "./config";

export function handleRicochet(
  proj: Projectile,
  x: number,
  y: number,
  wind: number,
  gravity: number
): Projectile | null {
  if (!proj.bouncesRemaining || proj.bouncesRemaining <= 0) return null;

  // Calculate current velocity at this point in time, WITHOUT wind
  // (wind is re-applied by the parametric physics after restart)
  // vx_initial = proj.vx (wind is applied separately in physics formula)
  // vy_screen = -proj.vy + gravity * proj.t  (screen coords, down = positive)
  const currentVy = -proj.vy + gravity * proj.t;

  let newVx: number;
  let newVy: number;

  if (x <= 0 || x >= WIDTH) {
    // Horizontal edge: flip horizontal, preserve vertical
    newVx = -proj.vx;           // flip initial horizontal (wind-free)
    newVy = -currentVy;         // negate screen-vy back to launch convention
  } else if (y <= 0) {
    // Top edge: preserve horizontal, flip vertical
    newVx = proj.vx;            // keep initial horizontal (wind-free)
    newVy = currentVy;          // currentVy is screen-down; keeping it = launch-up (vy positive = up)
  } else {
    return null;
  }

  const restarted = restartProjectile(proj, x, y, newVx, newVy);
  restarted.bouncesRemaining = proj.bouncesRemaining - 1;
  return restarted;
}

export function handleWrapAround(
  proj: Projectile,
  x: number,
  y: number,
  wind: number,
  gravity: number
): Projectile | null {
  if (!proj.wrapsRemaining || proj.wrapsRemaining <= 0) return null;

  if (x <= 0 || x >= WIDTH) {
    const newX = x <= 0 ? WIDTH - 1 : 1;
    // Preserve trajectory direction. Use wind-free vx (physics re-applies wind).
    // Convert current screen-vy back to launch convention.
    const currentVy = -proj.vy + gravity * proj.t;

    const restarted = restartProjectile(proj, newX, y, proj.vx, -currentVy);
    restarted.wrapsRemaining = proj.wrapsRemaining - 1;
    return restarted;
  }

  return null;
}
```

- [ ] **Step 3: Intercept miss in `updateFlight()` for ricochet/wrap**

In `src/sketch.ts`, modify the `"miss"` case in `updateFlight()`:

```typescript
      case "miss": {
        const pos2 = getProjectilePositionWithGravity(state.projectile, state.wind, state.gravity);

        // Try ricochet
        if (state.projectile.bouncesRemaining) {
          const bounced = handleRicochet(state.projectile, pos2.x, pos2.y, state.wind, state.gravity);
          if (bounced) {
            state.projectile = bounced;
            playSound("aim_tick"); // reuse tick sound for bounce
            return;
          }
        }

        // Try wrap-around
        if (state.projectile.wrapsRemaining) {
          const wrapped = handleWrapAround(state.projectile, pos2.x, pos2.y, state.wind, state.gravity);
          if (wrapped) {
            state.projectile = wrapped;
            return;
          }
        }

        // Normal miss
        state.projectile = null;
        resolveThrowEnd();
        break;
      }
```

Note: the miss check in `collision.ts` fires when `x < 0 || x > WIDTH || y > BOTTOM_LINE`. Ricochet/wrap only apply to screen edges (x boundaries and y < 0 top), NOT to `y > BOTTOM_LINE` (ground). The ground miss should always be a real miss. So we need to distinguish:

Actually, looking at `checkCollision`: `y > BOTTOM_LINE` returns `"miss"` and `x < 0 || x > WIDTH` returns `"miss"`. We need to differentiate. Options:
1. Check position ourselves before calling `checkCollision`
2. Add more collision result types

Simpler: in the miss handler, check the position to decide if it's an edge miss or ground miss:

```typescript
      case "miss": {
        const pos2 = getProjectilePositionWithGravity(state.projectile!, state.wind, state.gravity);
        const isEdgeMiss = pos2.x < 0 || pos2.x > WIDTH || pos2.y < 0;
        const isGroundMiss = pos2.y > BOTTOM_LINE;

        if (isEdgeMiss && !isGroundMiss) {
          // Try ricochet
          if (state.projectile!.bouncesRemaining) {
            const bounced = handleRicochet(state.projectile!, pos2.x, pos2.y, state.wind, state.gravity);
            if (bounced) {
              state.projectile = bounced;
              playSound("aim_tick");
              return;
            }
          }

          // Try wrap-around
          if (state.projectile!.wrapsRemaining) {
            const wrapped = handleWrapAround(state.projectile!, pos2.x, pos2.y, state.wind, state.gravity);
            if (wrapped) {
              state.projectile = wrapped;
              return;
            }
          }
        }

        // Normal miss
        state.projectile = null;
        resolveThrowEnd();
        break;
      }
```

Import `handleRicochet` and `handleWrapAround` from `"./powerup-behaviors"`.

- [ ] **Step 4: Build and verify**

Run: `npx tsc --noEmit 2>&1 | grep -v node_modules`
Expected: No errors

Test manually: collect ricochet/wrap power-ups, throw bananas off screen edges, verify they bounce or wrap.

- [ ] **Step 5: Commit**

```
git add src/physics.ts src/powerup-behaviors.ts src/sketch.ts src/collision.ts
git commit -m "feat(powerups): ricochet bounce and wrap-around behaviors"
```

---

### Task 7: Cluster Bomb

**Files:**
- Modify: `src/powerup-behaviors.ts`
- Modify: `src/sketch.ts`
- Modify: `src/sound.ts`

- [ ] **Step 1: Add cluster split function to `src/powerup-behaviors.ts`**

```typescript
import { createProjectile } from "./physics";
import { CLUSTER_SUB_COUNT, CLUSTER_FAN_DEGREES, CLUSTER_EXPLOSION_MULT, EXPLOSION_RADIUS, Y_SCALE } from "./config";

export function splitClusterBomb(
  x: number,
  y: number,
  vx: number,
  vy: number,
  wind: number,
  gravity: number,
  projT: number
): Projectile[] {
  const subs: Projectile[] = [];

  // Calculate current velocity at split time (physics-convention)
  // vy in physics = positive up; screen-space vy = (-vy + gravity * t) * Y_SCALE
  const currentVyPhysics = -vy + gravity * projT; // positive = downward in physics
  const screenVy = currentVyPhysics * Y_SCALE;    // convert to screen pixels/t

  // Work in screen space for angle/speed to avoid Y_SCALE distortion
  const baseAngle = Math.atan2(-screenVy, vx); // vx is wind-free, screenVy negated so up = positive angle
  const fanRad = (CLUSTER_FAN_DEGREES * Math.PI) / 180;
  const speed = Math.sqrt(vx * vx + screenVy * screenVy) * 0.7;

  for (let i = 0; i < CLUSTER_SUB_COUNT; i++) {
    const frac = CLUSTER_SUB_COUNT === 1 ? 0 : (i / (CLUSTER_SUB_COUNT - 1)) - 0.5;
    const angle = baseAngle + frac * fanRad;

    // Compute screen-space velocity, then convert vy back to physics convention
    const screenVxSub = Math.cos(angle) * speed;
    const screenVySub = Math.sin(angle) * speed; // positive = up in screen
    const sub: Projectile = {
      startX: x,
      startY: y,
      vx: screenVxSub,
      vy: screenVySub / Y_SCALE, // convert back to physics convention (vy * Y_SCALE = screen vy)
      t: 0,
      active: true,
      isSubProjectile: true,
      explosionRadius: EXPLOSION_RADIUS * CLUSTER_EXPLOSION_MULT,
    };
    subs.push(sub);
  }

  return subs;
}
```

- [ ] **Step 2: Add cluster_split sound to `src/sound.ts`**

```typescript
// Add to SoundName type:
| "cluster_split"

// Add case in playSound switch:
case "cluster_split": playClusterSplit(); break;
```

```typescript
function playClusterSplit() {
  const c = getCtx();
  // Pop + scatter
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(400, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1200, c.currentTime + 0.1);
  gain.gain.setValueAtTime(0.15, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.15);
}
```

- [ ] **Step 3: Handle cluster bomb split and sub-projectile flight in `src/sketch.ts`**

In `updateFlight()`, before the collision check, add a cluster bomb timer check:

```typescript
    // Check cluster bomb split timer
    if (state.projectile.splitTimer && p.millis() >= state.projectile.splitTimer) {
      const pos = getProjectilePositionWithGravity(state.projectile, state.wind, state.gravity);
      state.activeSubProjectiles = splitClusterBomb(
        pos.x, pos.y,
        state.projectile.vx, state.projectile.vy,
        state.wind, state.gravity, state.projectile.t
      );
      state.projectile = null;
      playSound("cluster_split");
      return;
    }
```

Add a sub-projectile update loop. When `state.projectile` is null and `state.activeSubProjectiles.length > 0`, we're in cluster mode:

Add a new function:
```typescript
  function updateSubProjectiles() {
    if (state.activeSubProjectiles.length === 0) return;

    for (let i = state.activeSubProjectiles.length - 1; i >= 0; i--) {
      const sub = state.activeSubProjectiles[i];
      if (!sub.active) continue;

      advanceProjectile(sub);
      const pos = getProjectilePositionWithGravity(sub, state.wind, state.gravity);
      const result = checkCollision(pos.x, pos.y, sub.t, state.buildings, state.gorillas, state.crate);

      switch (result.type) {
        case "none":
        case "sun":
          break;
        case "miss":
          sub.active = false;
          break;
        case "building": {
          const radius = sub.explosionRadius ?? EXPLOSION_RADIUS;
          result.building.damage.push({ cx: pos.x, cy: pos.y, radius });
          sub.active = false;
          playSound("explosion");
          break;
        }
        case "gorilla":
          // Gorilla hit — end entire cluster, score the hit
          state.activeSubProjectiles = [];
          explosionX = pos.x;
          explosionY = pos.y;
          state.explosionTimer = p.millis();
          state.lastHitPlayer = result.gorilla.playerNum;
          state.phase = "explosion";
          playSound("hit");
          return;
        case "crate": {
          const playerIdx = (state.currentPlayer - 1) as 0 | 1;
          const collected = collectCrate(state, playerIdx);
          if (collected) playSound("crate_collect");
          sub.active = false;
          break;
        }
      }
    }

    // Remove inactive subs
    state.activeSubProjectiles = state.activeSubProjectiles.filter(s => s.active);

    // All resolved — end turn
    if (state.activeSubProjectiles.length === 0) {
      resolveThrowEnd();
    }
  }
```

In the `"flight"` case of the draw loop, call this when there's no main projectile:
```typescript
      case "flight":
        if (state.projectile) {
          updateFlight();
        } else if (state.activeSubProjectiles.length > 0) {
          updateSubProjectiles();
        }
        updateTaunts(p1Input, p2Input);
        drawGameplay(p);
        if (state.projectile) {
          drawBanana(p);
        }
        drawSubProjectiles(p);
        break;
```

Add `drawSubProjectiles`:
```typescript
  function drawSubProjectiles(p: p5) {
    for (const sub of state.activeSubProjectiles) {
      if (!sub.active) continue;
      const pos = getProjectilePositionWithGravity(sub, state.wind, state.gravity);
      if (pos.y < -50 || pos.x < -10 || pos.x > WIDTH + 10) continue;
      p.push();
      p.translate(pos.x, pos.y);
      p.rotate(bananaRotation);
      p.fill(255, 200, 0);
      p.noStroke();
      p.arc(0, 0, 5, 4, 0, Math.PI); // smaller banana
      p.pop();
    }
  }
```

Import `splitClusterBomb` from `"./powerup-behaviors"`.

- [ ] **Step 4: Build and verify**

Run: `npx tsc --noEmit 2>&1 | grep -v node_modules`
Expected: No errors

Test manually: get cluster bomb, throw, watch it split after ~1.2s into 5 smaller bananas.

- [ ] **Step 5: Commit**

```
git add src/powerup-behaviors.ts src/sketch.ts src/sound.ts
git commit -m "feat(powerups): cluster bomb split and sub-projectile flight"
```

---

### Task 8: Confetti Banana

**Files:**
- Modify: `src/powerup-behaviors.ts`
- Modify: `src/sketch.ts`
- Modify: `src/sound.ts`

- [ ] **Step 1: Add confetti sound to `src/sound.ts`**

```typescript
// Add to SoundName: | "confetti_pop"
// Add case: case "confetti_pop": playConfettiPop(); break;

function playConfettiPop() {
  const c = getCtx();
  // Silly party horn sound
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(300, c.currentTime);
  osc.frequency.linearRampToValueAtTime(600, c.currentTime + 0.1);
  osc.frequency.linearRampToValueAtTime(200, c.currentTime + 0.3);
  gain.gain.setValueAtTime(0.12, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.35);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.35);
}
```

- [ ] **Step 2: Handle confetti in `updateFlight()` in `src/sketch.ts`**

In the `"building"` and `"gorilla"` cases, check if the active power-up type is confetti:

For the gorilla case, replace:
```typescript
      case "gorilla":
        if (state.projectile?.powerUpType === "confetti") {
          // Confetti! No damage, no score
          explosionX = pos.x;
          explosionY = pos.y;
          state.projectile = null;
          confettiParticles = generateConfetti(pos.x, pos.y);
          confettiTimer = p.millis();
          playSound("confetti_pop");
          // Confused reaction from victim
          triggerBubble(result.gorilla.playerNum as 1 | 2, CONFETTI_REACTIONS);
          // Thrower dances
          triggerDance(state.currentPlayer);
          // End turn after a short pause
          state.explosionTimer = p.millis();
          state.lastHitPlayer = null; // no scoring
          state.phase = "explosion";
          break;
        }
        explosionX = pos.x;
        // ... rest of normal gorilla hit
```

Similarly for building:
```typescript
      case "building":
        if (state.projectile?.powerUpType === "confetti") {
          explosionX = pos.x;
          explosionY = pos.y;
          state.projectile = null;
          confettiParticles = generateConfetti(pos.x, pos.y);
          confettiTimer = p.millis();
          playSound("confetti_pop");
          state.explosionTimer = p.millis();
          state.lastHitPlayer = null;
          state.phase = "explosion";
          break;
        }
        // ... rest of normal building hit
```

- [ ] **Step 3: Add confetti particles system to `src/sketch.ts`**

Add state variables:
```typescript
  let confettiParticles: { x: number; y: number; vx: number; vy: number; color: string }[] = [];
  let confettiTimer = 0;
  const CONFETTI_DURATION_MS = 1500;
  const CONFETTI_REACTIONS = ["...What?", "Huh?!", "Confetti?!", "*blinks*", "Wha...?", "???", "Seriously?!"];
```

```typescript
  function generateConfetti(x: number, y: number) {
    const colors = ["#ff0066", "#00ccff", "#ffcc00", "#66ff00", "#ff6600", "#cc00ff"];
    const particles = [];
    for (let i = 0; i < 30; i++) {
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 4,
        vy: -Math.random() * 3 - 1,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    return particles;
  }

  function drawConfetti(p: p5) {
    if (confettiParticles.length === 0) return;
    const elapsed = p.millis() - confettiTimer;
    if (elapsed > CONFETTI_DURATION_MS) {
      confettiParticles = [];
      return;
    }
    const fade = 1 - elapsed / CONFETTI_DURATION_MS;
    for (const c of confettiParticles) {
      c.x += c.vx;
      c.y += c.vy;
      c.vy += 0.1; // gravity
      p.fill(p.color(c.color + Math.floor(fade * 255).toString(16).padStart(2, "0")));
      p.noStroke();
      p.rect(c.x, c.y, 2, 2);
    }
  }
```

Call `drawConfetti(p)` in `drawGameplay()` after drawing gorillas.

In the explosion phase drawing in the main switch, skip normal explosion when confetti is active:
```typescript
      case "explosion":
        updateExplosion();
        drawGameplay(p);
        if (confettiParticles.length > 0) {
          drawConfetti(p); // confetti replaces normal explosion visual
        } else {
          drawExplosion(p, explosionX, explosionY, getExplosionProgress(), activeExplosionRadius);
        }
        break;
```

- [ ] **Step 4: Build and verify**

Run: `npx tsc --noEmit 2>&1 | grep -v node_modules`
Expected: No errors

Test: throw confetti at opponent — confetti burst, confused bubble, no damage.

- [ ] **Step 5: Commit**

```
git add src/sketch.ts src/sound.ts
git commit -m "feat(powerups): confetti banana with particle effects"
```

---

### Task 9: Teleportation Banana

**Files:**
- Modify: `src/powerup-behaviors.ts`
- Modify: `src/sketch.ts`
- Modify: `src/city.ts`
- Modify: `src/sound.ts`

- [ ] **Step 1: Add random gorilla placement function to `src/city.ts`**

```typescript
export function randomGorillaPlacements(
  buildings: Building[],
  currentP1Idx: number,
  currentP2Idx: number
): [{ x: number; y: number; buildingIdx: number }, { x: number; y: number; buildingIdx: number }] | null {
  // Find buildings with at least 50% undamaged roof
  const viable = buildings.map((b, i) => ({ b, i })).filter(({ b, i }) => {
    if (i === currentP1Idx || i === currentP2Idx) return false;
    const roofDamage = b.damage.filter(d => d.cy <= b.y + 5).length;
    return roofDamage < b.width / (EXPLOSION_RADIUS * 2); // rough heuristic
  });

  if (viable.length < 2) return null;

  // Pick two buildings at least 3 apart
  for (let attempts = 0; attempts < 20; attempts++) {
    const a = viable[Math.floor(Math.random() * viable.length)];
    const b2 = viable[Math.floor(Math.random() * viable.length)];
    if (a.i !== b2.i && Math.abs(a.i - b2.i) >= 3) {
      return [
        { x: a.b.x + a.b.width / 2 - 10, y: a.b.y - 25, buildingIdx: a.i },
        { x: b2.b.x + b2.b.width / 2 - 10, y: b2.b.y - 25, buildingIdx: b2.i },
      ];
    }
  }

  return null; // couldn't find valid placement
}
```

Import `EXPLOSION_RADIUS` from config. Export the function.

- [ ] **Step 2: Add teleport sound to `src/sound.ts`**

```typescript
// Add: | "teleport_zap"
// Case: case "teleport_zap": playTeleportZap(); break;

function playTeleportZap() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(200, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(2000, c.currentTime + 0.15);
  osc.frequency.exponentialRampToValueAtTime(100, c.currentTime + 0.3);
  gain.gain.setValueAtTime(0.15, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.3);
}
```

- [ ] **Step 3: Handle teleportation in `updateFlight()` in `src/sketch.ts`**

In the `"building"` case (and the ground/BOTTOM_LINE miss that we treat as building hit), before the normal building damage:

```typescript
      case "building":
        if (state.projectile?.powerUpType === "confetti") {
          // ... existing confetti handling
        }
        if (state.projectile?.powerUpType === "teleportation") {
          state.projectile = null;
          // Teleport both gorillas
          const placements = randomGorillaPlacements(
            state.buildings,
            findBuildingUnderGorilla(state.gorillas[0], state.buildings),
            findBuildingUnderGorilla(state.gorillas[1], state.buildings)
          );
          if (placements) {
            state.gorillas[0].x = placements[0].x;
            state.gorillas[0].y = placements[0].y;
            state.gorillas[1].x = placements[1].x;
            state.gorillas[1].y = placements[1].y;
          }
          playSound("teleport_zap");
          // No explosion, just end turn
          resolveThrowEnd();
          break;
        }
        // ... normal building handling
```

Add a helper to find which building a gorilla is on:
```typescript
  function findBuildingUnderGorilla(gorilla: Gorilla, buildings: Building[]): number {
    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      const gCenterX = gorilla.x + GORILLA_WIDTH / 2;
      if (gCenterX >= b.x && gCenterX <= b.x + b.width) return i;
    }
    return -1;
  }
```

Import `randomGorillaPlacements` from `"./city"`.

Note: if teleportation banana hits a gorilla directly, it should score as a normal hit (per spec). The gorilla case in updateFlight runs before building case, so this is already handled — a gorilla hit is a gorilla hit regardless of power-up type (except confetti which is checked first).

Wait — per spec, teleportation should NOT apply when hitting a gorilla. The gorilla case already handles this as a normal hit. But confetti IS checked in the gorilla case. So the order in the gorilla case should be: check confetti first, then everything else is a normal gorilla hit. Teleportation doesn't need special gorilla handling. Good.

- [ ] **Step 4: Build and verify**

Run: `npx tsc --noEmit 2>&1 | grep -v node_modules`
Expected: No errors

Test: throw teleportation banana at a building — both gorillas should teleport to new locations.

- [ ] **Step 5: Commit**

```
git add src/city.ts src/sketch.ts src/sound.ts src/powerup-behaviors.ts
git commit -m "feat(powerups): teleportation banana with random gorilla relocation"
```

---

### Task 10: Poison Banana

**Files:**
- Modify: `src/sketch.ts`
- Modify: `src/gorilla.ts`
- Modify: `src/sound.ts`

- [ ] **Step 1: Add poison sound to `src/sound.ts`**

```typescript
// Add: | "poison_hit"
// Case: case "poison_hit": playPoisonHit(); break;

function playPoisonHit() {
  const c = getCtx();
  // Sickly bubbling sound
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(150, c.currentTime);
  osc.frequency.linearRampToValueAtTime(100, c.currentTime + 0.3);
  gain.gain.setValueAtTime(0.15, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.4);

  // Bubbles
  [200, 250, 180, 220].forEach((freq, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    const t = c.currentTime + 0.05 + i * 0.08;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + 0.06);
  });
}
```

- [ ] **Step 2: Handle poison in gorilla hit in `src/sketch.ts`**

In the gorilla case in `updateFlight()`, after the confetti check:

```typescript
        if (state.projectile?.powerUpType === "poison") {
          // Poison the victim — no damage, no score
          const victimIdx = result.gorilla.playerNum === 1 ? 0 : 1;
          state.poisonTurns[victimIdx] = POISON_TURNS;
          state.projectile = null;
          playSound("poison_hit");
          // Show a small explosion effect but no scoring
          explosionX = pos.x;
          explosionY = pos.y;
          state.explosionTimer = p.millis();
          state.lastHitPlayer = null;
          state.phase = "explosion";
          break;
        }
```

Import `POISON_TURNS` from config.

- [ ] **Step 3: Apply poison effect to power meter in `updatePower()`**

In `updatePower()`, clamp the power meter value when poisoned:

After `state.powerMeterValue = Math.abs(Math.sin(cycleProgress * Math.PI));`:
```typescript
    // Poison caps power
    if (state.poisonTurns[state.currentPlayer - 1] > 0) {
      state.powerMeterValue = Math.min(state.powerMeterValue, POISON_POWER_CAP);
    }
```

Import `POISON_POWER_CAP` from config.

- [ ] **Step 4: Decrement poison at start of turn**

Poison must decrement every time the poisoned player enters the aim phase — not just at round start. The cleanest approach: decrement in `resolveThrowEnd()` and in `updateRoundStart()` when transitioning to aim, since both are entry points to a player's turn.

In `resolveThrowEnd()`, add inside the `else` branch (actual player switch, NOT extra throws — an extra throw is the same turn):
```typescript
      // Decrement poison for the player who is about to aim
      const nextPlayerIdx = (state.currentPlayer === 1 ? 1 : 0) as 0 | 1;
      if (state.poisonTurns[nextPlayerIdx] > 0) {
        state.poisonTurns[nextPlayerIdx]--;
      }
```

In `updateRoundStart()`, when transitioning to aim:
```typescript
      // Decrement poison for current player at round start
      if (state.poisonTurns[state.currentPlayer - 1] > 0) {
        state.poisonTurns[state.currentPlayer - 1]--;
      }
```

- [ ] **Step 5: Draw poison tint on gorilla in `src/gorilla.ts`**

Add a `poisoned` parameter to `drawGorilla`:

```typescript
export function drawGorilla(p: p5, gorilla: Gorilla, costume?: GorillaCostume | null, poisoned?: boolean): void {
```

If `poisoned`, apply a green tint overlay after drawing the gorilla body:

After the body rect and before the eyes:
```typescript
  if (poisoned) {
    p.fill(0, 180, 0, 80);
    p.rect(x + 4, y + 10, 12, 10); // body tint
    p.rect(x + 5, y + 2, 10, 9);   // head tint
  }
```

Update all `drawGorilla` calls in `sketch.ts` to pass the poison state:
```typescript
drawGorilla(p, state.gorillas[i], costumes[i], state.poisonTurns[i] > 0);
```

- [ ] **Step 6: Build and verify**

Run: `npx tsc --noEmit 2>&1 | grep -v node_modules`
Expected: No errors

Test: throw poison banana at opponent, verify green tint, verify weakened power meter for 3 turns.

- [ ] **Step 7: Commit**

```
git add src/sketch.ts src/gorilla.ts src/sound.ts
git commit -m "feat(powerups): poison banana with green tint and power cap"
```

---

### Task 11: Portal Banana

**Files:**
- Modify: `src/powerup-behaviors.ts`
- Modify: `src/sketch.ts`
- Modify: `src/ui.ts`
- Modify: `src/sound.ts`

- [ ] **Step 1: Add portal sounds to `src/sound.ts`**

```typescript
// Add: | "portal_whoosh" | "portal_place"
// Cases: case "portal_whoosh": playPortalWhoosh(); break;
//        case "portal_place": playPortalPlace(); break;

function playPortalPlace() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(300, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800, c.currentTime + 0.2);
  gain.gain.setValueAtTime(0.12, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.25);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.25);
}

function playPortalWhoosh() {
  const c = getCtx();
  const bufferSize = c.sampleRate * 0.2;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize) * 0.5;
  }
  const noise = c.createBufferSource();
  noise.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(1000, c.currentTime);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.15, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);
  noise.connect(filter).connect(gain).connect(c.destination);
  noise.start();
  noise.stop(c.currentTime + 0.2);
}
```

- [ ] **Step 2: Handle portal placement during flight**

Portal throws suppress all damage. In `launchBanana()`, when the power-up is "portal", set `extraThrowRemaining = true` for the second portal throw (but only on the first throw):

```typescript
    if (activePowerUp === "portal") {
      state.extraThrowRemaining = true; // need second throw for portal B
    }
```

In `updateFlight()`, portal bananas need special handling for ALL collision types. Add a check at the top of the collision switch:

```typescript
    // Portal banana — suppress damage, place portal
    if (state.projectile?.powerUpType === "portal") {
      if (result.type === "miss") {
        const pos2 = getProjectilePositionWithGravity(state.projectile, state.wind, state.gravity);
        const isEdgeMiss = pos2.x < 0 || pos2.x > WIDTH;

        if (isEdgeMiss) {
          // Place portal at screen edge
          const edge: "left" | "right" = pos2.x < 0 ? "left" : "right";
          placePortal(state, edge, edge === "left" ? 0 : WIDTH, pos2.y);
          state.projectile = null;
          playSound("portal_place");
          resolveThrowEnd();
          return;
        }
        // Ground miss or top miss — place portal at impact point
        placePortal(state, pos2.x < WIDTH / 2 ? "left" : "right", pos2.x, pos2.y);
        state.projectile = null;
        playSound("portal_place");
        resolveThrowEnd();
        return;
      }
      if (result.type === "building" || result.type === "gorilla" || result.type === "crate") {
        // Place portal at impact point, no damage
        const pos2 = getProjectilePositionWithGravity(state.projectile, state.wind, state.gravity);
        placePortal(state, pos2.x < WIDTH / 2 ? "left" : "right", pos2.x, pos2.y);
        state.projectile = null;
        playSound("portal_place");
        resolveThrowEnd();
        return;
      }
      // "none" and "sun" fall through to normal handling
    }
```

Add helper:
```typescript
  function placePortal(state: GameState, edge: "left" | "right", x: number, y: number) {
    if (state.portals[0] === null) {
      state.portals[0] = { edge, x, y, color: "orange" };
    } else if (state.portals[1] === null) {
      state.portals[1] = { edge, x, y, color: "blue" };
    }
    // Both already placed — shouldn't happen for portal throws
  }
```

- [ ] **Step 3: Handle portal teleportation for normal bananas during flight**

In `updateFlight()`, after getting the position but before the collision check, test for portal entry:

```typescript
    // Check if banana enters a portal
    if (state.portals[0] && state.portals[1] && state.projectile.powerUpType !== "portal") {
      const portalResult = checkPortalEntry(state.projectile, pos, state.portals, state.gravity);
      if (portalResult) {
        state.projectile = portalResult;
        return; // continue flight from portal exit
      }
    }
```

Add to `src/powerup-behaviors.ts`:

```typescript
export function checkPortalEntry(
  proj: Projectile,
  pos: { x: number; y: number },
  portals: [Portal | null, Portal | null],
  gravity: number
): Projectile | null {
  if (!portals[0] || !portals[1]) return null;
  if (proj.portalPassesRemaining !== undefined && proj.portalPassesRemaining <= 0) return null;

  for (let i = 0; i < 2; i++) {
    const portal = portals[i]!;
    const otherPortal = portals[1 - i]!;

    // Check if banana is near this portal (within ~10px)
    const dx = pos.x - portal.x;
    const dy = pos.y - portal.y;
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      // Use current velocity (wind-free vx, convert screen-vy to launch convention)
      const currentVy = -proj.vy + gravity * proj.t;
      const restarted = restartProjectile(
        proj, otherPortal.x, otherPortal.y,
        proj.vx,      // wind-free (physics re-applies wind)
        -currentVy     // negate screen-vy back to launch convention
      );
      restarted.portalPassesRemaining = (proj.portalPassesRemaining ?? PORTAL_MAX_PASSES) - 1;
      return restarted;
    }
  }
  return null;
}
```

- [ ] **Step 4: Draw portal markers in `src/ui.ts`**

```typescript
export function drawPortals(p: p5, portals: [Portal | null, Portal | null]): void {
  for (const portal of portals) {
    if (!portal) continue;
    const pulse = Math.sin(p.millis() / 300) * 0.2 + 0.8;

    if (portal.color === "orange") {
      p.fill(255, 140, 0, 150 * pulse);
      p.stroke(255, 180, 50, 200 * pulse);
    } else {
      p.fill(0, 100, 255, 150 * pulse);
      p.stroke(50, 150, 255, 200 * pulse);
    }
    p.strokeWeight(1);
    p.ellipse(portal.x, portal.y, 12, 18);
  }
}
```

Call `drawPortals(p, state.portals)` in `drawGameplay()` in sketch.ts, after drawing buildings.

Import `Portal` type in ui.ts.

- [ ] **Step 5: Build and verify**

Run: `npx tsc --noEmit 2>&1 | grep -v node_modules`
Expected: No errors

Test: use portal power-up, throw two bananas to place portals, then throw normal banana through a portal.

- [ ] **Step 6: Commit**

```
git add src/sketch.ts src/powerup-behaviors.ts src/ui.ts src/sound.ts
git commit -m "feat(powerups): portal banana with edge placement and teleportation"
```

---

### Task 12: Bananality Reset and Final Polish

**Files:**
- Modify: `src/sketch.ts`

- [ ] **Step 1: Reset all power-up state in `triggerBananality()`**

In `triggerBananality()`, add:

```typescript
    state.selectedPowerUp = null;
    state.selectedSlotIndex = -1;
    state.extraThrowRemaining = false;
    state.isExtraThrow = false;
    state.activeSubProjectiles = [];
    state.portals = [null, null];
    confettiParticles = [];
```

- [ ] **Step 2: Reset power-up state in `startNewRound()`**

Verify `startNewRound()` already has the resets from Task 2. Also add:
```typescript
    // Don't reset inventory or poisonTurns — those persist across rounds
```

Actually, per spec: portals persist per round but are cleared on new round. Inventory and poison persist across rounds within a match. Verify this is correct in `startNewRound()`:

```typescript
    state.crate = null;
    state.portals = [null, null];
    state.activeSubProjectiles = [];
    state.extraThrowRemaining = false;
    state.isExtraThrow = false;
    state.selectedPowerUp = null;
    state.selectedSlotIndex = -1;
    // inventory and poisonTurns intentionally NOT reset — persist across rounds
```

- [ ] **Step 3: Clear all state on game over reset**

In `updateGameOver()`, verify `createInitialState()` returns zeroed power-up state (it does from Task 1).

- [ ] **Step 4: Full build and test**

Run: `npx tsc --noEmit 2>&1 | grep -v node_modules`
Expected: No errors

Run: `bun run build`
Expected: Build succeeds

Manual testing checklist:
- Crates spawn on ~20% of turns
- Crate parachutes in, lands on middle building
- Hitting crate collects power-up (sound plays)
- B cycles through inventory
- Aim indicator changes per power-up
- Big Banana: bigger explosion
- Two Bananas: second throw
- Ricochet: bounces off edges (max 3)
- Wrap-Around: appears on other side (max 3)
- Cluster Bomb: splits after ~1.2s
- Confetti: confetti burst, no damage, confused reaction
- Teleportation: both gorillas relocate
- Poison: green tint, weakened power for 3 turns
- Portal: place two portals, bananas teleport through them
- Bananality resets all power-up state
- Inventory persists across rounds
- Inventory capped at 3

- [ ] **Step 5: Commit**

```
git add src/sketch.ts
git commit -m "feat(powerups): bananality reset and final state management polish"
```
