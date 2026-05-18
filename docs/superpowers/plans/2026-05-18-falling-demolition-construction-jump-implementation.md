# Gorilla Falling + Demolition/Construction/Jump Bananas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a gorilla falling system and three new banana power-ups (demolition, construction, jump) to the GORILLAS.BAS arcade game.

**Architecture:** A foundational falling system checks gorilla ground support after every explosion and animates falls. Three new power-up types build on this: demolition removes buildings, construction repairs/extends them, and jump moves the gorilla to an adjacent building. All follow existing power-up patterns.

**Tech Stack:** P5.js instance mode, TypeScript, Vite + Bun. No test framework — verify with `npx tsc --noEmit`.

**Spec:** `docs/superpowers/specs/2026-05-18-falling-demolition-construction-jump-design.md`

---

### Task 1: Add new types and constants

**Files:**
- Modify: `src/types.ts`
- Modify: `src/config.ts`

- [ ] **Step 1: Add new types to `src/types.ts`**

Add `"demolition"`, `"construction"`, `"jump"` to the `PowerUpType` union (line 87-90):

```typescript
export type PowerUpType = "big_banana" | "two_bananas" | "ricochet" | "wrap_around"
  | "cluster_bomb" | "teleportation" | "portal" | "confetti" | "poison"
  | "ice" | "mirror" | "gravity_flip" | "shield" | "rubber" | "homing"
  | "ghost" | "giant" | "boomerang" | "drunk" | "earthquake"
  | "demolition" | "construction" | "jump";
```

Add `"jump"` to the `GamePhase` type (line 71-81):

```typescript
export type GamePhase =
  | "title"
  | "config"
  | "round_start"
  | "aim"
  | "power"
  | "flight"
  | "explosion"
  | "victory"
  | "bananality"
  | "game_over"
  | "jump";
```

Add new interfaces after the `Portal` interface (after line 108):

```typescript
export interface FallingAnim {
  targetY: number;
}

export interface JumpAnim {
  playerIdx: 0 | 1;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  startTime: number;
  wrapDirection: "left" | "right" | null;
}
```

Add new fields to `GameState` (after `earthquakeTimer` on line 149):

```typescript
  fallingGorillas: [FallingAnim | null, FallingAnim | null];
  jumpAnim: JumpAnim | null;
```

- [ ] **Step 2: Add new constants to `src/config.ts`**

Add after `EARTHQUAKE_SHAKE_MS` (line 119):

```typescript
export const FALLING_SPEED = 4;
export const CONSTRUCTION_HEIGHT_ADD = 30;
export const CONSTRUCTION_BUILDING_HEIGHT = 80;
export const JUMP_ARC_MS = 400;
export const JUMP_ARC_HEIGHT = 40;
```

Update `ALL_POWERUP_TYPES` (line 120-125) to include the new types:

```typescript
export const ALL_POWERUP_TYPES: PowerUpType[] = [
  "big_banana", "two_bananas", "ricochet", "wrap_around",
  "cluster_bomb", "teleportation", "portal", "confetti", "poison",
  "ice", "mirror", "gravity_flip", "shield", "rubber", "homing",
  "ghost", "giant", "boomerang", "drunk", "earthquake",
  "demolition", "construction", "jump",
];
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: Errors about uninitialized `fallingGorillas` and `jumpAnim` in `createInitialState()` — that's expected, we'll fix in Task 3.

- [ ] **Step 4: Commit**

```bash
git add src/types.ts src/config.ts
git commit -m "feat: add types and constants for falling system + demolition/construction/jump"
```

---

### Task 2: Add collision guard for demolished buildings

**Files:**
- Modify: `src/collision.ts`

- [ ] **Step 1: Add height guard in collision loop**

In `checkCollision()`, add a guard at the top of the building collision loop (line 56). Change:

```typescript
    for (const building of buildings) {
      if (
        x >= building.x &&
```

To:

```typescript
    for (const building of buildings) {
      if (building.height <= 0) continue;
      if (
        x >= building.x &&
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/collision.ts
git commit -m "feat: skip demolished buildings (height <= 0) in collision detection"
```

---

### Task 3: Implement gorilla falling system

**Files:**
- Modify: `src/city.ts`
- Modify: `src/sketch.ts`

- [ ] **Step 1: Add `checkGorillaGroundSupport()` to `src/city.ts`**

Add this function at the end of the file, after `reshuffleBuildings`:

```typescript
export function checkGorillaGroundSupport(
  gorillaX: number,
  gorillaY: number,
  buildings: Building[]
): boolean {
  // Already at ground level
  if (gorillaY >= BOTTOM_LINE - GORILLA_HEIGHT) return true;

  // Find building by gorilla center
  const centerX = gorillaX + GORILLA_WIDTH / 2;
  let building: Building | null = null;
  for (const b of buildings) {
    if (centerX >= b.x && centerX <= b.x + b.width) {
      building = b;
      break;
    }
  }

  if (!building) return true; // no building found, treat as grounded
  if (building.height <= 0) return false; // demolished

  // Sample 5 points across gorilla foot span at building rooftop
  const sampleCount = 5;
  let solidCount = 0;
  for (let i = 0; i < sampleCount; i++) {
    const sx = gorillaX + (GORILLA_WIDTH * i) / (sampleCount - 1);
    // Check if this point is within the building's x range
    if (sx < building.x || sx > building.x + building.width) continue;
    // Check if point is inside any damage circle at roof level
    let damaged = false;
    for (const hole of building.damage) {
      const dx = sx - hole.cx;
      const dy = building.y - hole.cy;
      if (dx * dx + dy * dy <= hole.radius * hole.radius) {
        damaged = true;
        break;
      }
    }
    if (!damaged) solidCount++;
  }

  // Fall if less than 30% solid
  return solidCount / sampleCount >= 0.3;
}
```

Add `GORILLA_WIDTH` and `CONSTRUCTION_BUILDING_HEIGHT` to the imports at the top of `city.ts` (line 2-10). The final import block for city.ts should be:

```typescript
import {
  WIDTH,
  BOTTOM_LINE,
  MIN_BUILDING_WIDTH,
  MAX_BUILDING_WIDTH,
  CITY_THEME_COLORS,
  GORILLA_HEIGHT,
  GORILLA_WIDTH,
  EXPLOSION_RADIUS,
  CONSTRUCTION_BUILDING_HEIGHT,
} from "./config";
```

Note: `CONSTRUCTION_BUILDING_HEIGHT` is used later in Task 5. Adding it now avoids conflicting import edits.

- [ ] **Step 2: Initialize `fallingGorillas` and `jumpAnim` in `createInitialState()` in `src/sketch.ts`**

Add after `earthquakeTimer: 0,` (line 78):

```typescript
    fallingGorillas: [null, null],
    jumpAnim: null,
```

- [ ] **Step 3: Add falling-related imports to `src/sketch.ts`**

Update the city import (line 20) to include `checkGorillaGroundSupport`:

```typescript
import { generateCityscape, placeGorillas, generateWind, randomGorillaPlacements, reshuffleBuildings, checkGorillaGroundSupport } from "./city";
```

Add `FALLING_SPEED` to the config imports (line 16-17 area):

```typescript
  ALL_POWERUP_TYPES, GIANT_POWER_MULT, GIANT_HITBOX_MULT, HP_OPTIONS,
  EARTHQUAKE_SHAKE_MS, FALLING_SPEED,
```

- [ ] **Step 4: Add `checkAndApplyFalling()`, `updateFallingGorillas()`, and `isFallingComplete()` to `src/sketch.ts`**

Add these functions after `triggerEarthquake()` (after line 568):

```typescript
  function checkAndApplyFalling() {
    for (let i = 0; i < 2; i++) {
      if (state.fallingGorillas[i]) continue; // already falling
      const g = state.gorillas[i];
      if (!checkGorillaGroundSupport(g.x, g.y, state.buildings)) {
        state.fallingGorillas[i] = { targetY: BOTTOM_LINE - GORILLA_HEIGHT };
      }
    }
  }

  function updateFallingGorillas() {
    for (let i = 0; i < 2; i++) {
      const fall = state.fallingGorillas[i];
      if (!fall) continue;
      state.gorillas[i].y += FALLING_SPEED;
      if (state.gorillas[i].y >= fall.targetY) {
        state.gorillas[i].y = fall.targetY;
        state.fallingGorillas[i] = null;
      }
    }
  }

  function isFallingComplete(): boolean {
    return state.fallingGorillas[0] === null && state.fallingGorillas[1] === null;
  }
```

- [ ] **Step 5: Call `updateFallingGorillas()` unconditionally at top of `draw()`**

In the `draw` function, right before the `switch (state.phase)` block (around line 183), add:

```typescript
    updateFallingGorillas();
```

- [ ] **Step 6: Add fall check and gating to `updateExplosion()`**

In `updateExplosion()` (line 989), after the explosion timer check `if (elapsed > totalDuration)` block, restructure the building-hit path to check falling. The building-hit else branch (line 1021-1024) currently reads:

```typescript
      } else {
        // Building hit — resolve throw
        resolveThrowEnd();
      }
```

Change it to:

```typescript
      } else {
        // Building hit — check if gorillas need to fall
        checkAndApplyFalling();
        if (isFallingComplete()) {
          resolveThrowEnd();
        }
        // If gorillas are still falling, updateFallingGorillas() in draw() will
        // resolve them, and we'll re-enter updateExplosion() each frame.
        // The elapsed > totalDuration check will pass immediately (timer already done),
        // and we'll reach this branch again until falls complete.
      }
```

Also add fall check after the gorilla-survived path (line 1016-1019):

```typescript
        } else {
          // Gorilla survived — check falls before resolving
          playSound("hit");
          checkAndApplyFalling();
          if (isFallingComplete()) {
            resolveThrowEnd();
          }
        }
```

- [ ] **Step 7: Add fall check to `updateSubProjectiles()`**

In `updateSubProjectiles()`, the "All resolved — end turn" block (line 969-971) currently reads:

```typescript
    if (state.activeSubProjectiles.length === 0) {
      resolveThrowEnd();
    }
```

Change it to:

```typescript
    if (state.activeSubProjectiles.length === 0) {
      checkAndApplyFalling();
      if (isFallingComplete()) {
        resolveThrowEnd();
      }
      // If gorillas are still falling, we'll re-enter next frame.
      // activeSubProjectiles is empty so we'll hit this branch again.
    }
```

- [ ] **Step 8: Reset `fallingGorillas` in `startNewRound()`**

Add after `state.earthquakeTimer = 0;` (line 390):

```typescript
    state.fallingGorillas = [null, null];
    state.jumpAnim = null;
```

- [ ] **Step 9: Verify**

Run: `npx tsc --noEmit`
Expected: Clean (ignoring node_modules errors).

- [ ] **Step 10: Commit**

```bash
git add src/city.ts src/sketch.ts
git commit -m "feat: gorilla falling system - ground support check + animated fall"
```

---

### Task 4: Implement demolition banana

**Files:**
- Modify: `src/sketch.ts`
- Modify: `src/ui.ts`
- Modify: `src/sound.ts`

- [ ] **Step 1: Add demolition building-hit handler in `updateFlight()`**

In `updateFlight()`, in the `case "building"` block, before the generic building explosion code (before line 787 `explosionX = pos.x;`), add a demolition check:

```typescript
        if (projType === "demolition") {
          // Find and demolish the hit building
          const hitBuildingIdx = state.buildings.indexOf(result.building);
          result.building.height = 0;
          result.building.y = BOTTOM_LINE;
          result.building.windows = [];
          result.building.damage = [];
          // Clear crate if it was on this building
          if (state.crate && state.crate.buildingIdx === hitBuildingIdx) {
            state.crate = null;
          }
          explosionX = pos.x;
          explosionY = pos.y;
          activeExplosionRadius = EXPLOSION_RADIUS;
          state.projectile = null;
          state.explosionTimer = p.millis();
          state.lastHitPlayer = null;
          state.phase = "explosion";
          playSound("demolition");
          playSound("explosion");
          break;
        }
```

- [ ] **Step 2: Add demolition visual to `drawBanana()`**

In the `switch (state.projectile.powerUpType)` inside `drawBanana()`, add before the default case:

```typescript
      case "demolition":
        p.fill(40, 40, 40);
        p.arc(0, 0, 8 * scale, 6 * scale, 0, Math.PI);
        // Wrecking ball dot
        p.fill(80, 80, 80);
        p.circle(0, 1, 3 * scale);
        break;
      case "construction":
        p.fill(50, 200, 50);
        p.arc(0, 0, 8 * scale, 6 * scale, 0, Math.PI);
        break;
```

- [ ] **Step 3: Add display names and icons to `src/ui.ts`**

In `powerUpDisplayName()`, add before the `default` case:

```typescript
    case "demolition": return "DEMOLITION";
    case "construction": return "BUILD";
    case "jump": return "JUMP";
```

In `drawPowerUpIcon()`, add before the `default` case:

```typescript
    case "demolition":
      p.fill(40, 40, 40);
      p.circle(x + size / 2, y + size / 2, size);
      p.fill(80, 80, 80);
      p.circle(x + size / 2, y + size / 2, size * 0.4);
      break;
    case "construction":
      p.fill(50, 200, 50);
      p.circle(x + size / 2, y + size / 2, size);
      break;
    case "jump":
      p.fill(255, 255, 0);
      p.triangle(x + size / 2, y, x, y + size, x + size, y + size);
      break;
```

- [ ] **Step 4: Add demolition sound to `src/sound.ts`**

Add `"demolition"` to the `SoundName` type (line 9). Add a case in the `playSound` switch. Add the sound function:

```typescript
function playDemolition() {
  const c = getCtx();
  // Deep boom + crumble noise
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(80, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(25, c.currentTime + 0.5);
  gain.gain.setValueAtTime(0.3, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.5);
  // Crumble noise
  const bufferSize = c.sampleRate * 0.4;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize) * 0.5;
  }
  const noise = c.createBufferSource();
  noise.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(500, c.currentTime);
  const g2 = c.createGain();
  g2.gain.setValueAtTime(0.2, c.currentTime + 0.1);
  g2.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5);
  noise.connect(filter).connect(g2).connect(c.destination);
  noise.start(c.currentTime + 0.05);
  noise.stop(c.currentTime + 0.5);
}
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`

- [ ] **Step 6: Commit**

```bash
git add src/sketch.ts src/ui.ts src/sound.ts
git commit -m "feat: demolition banana - destroys entire building on hit"
```

---

### Task 5: Implement construction banana

**Files:**
- Modify: `src/sketch.ts`
- Modify: `src/city.ts`
- Modify: `src/sound.ts`

- [ ] **Step 1a: Export `generateWindows` in `src/city.ts`**

On line 75 of `city.ts`, change:

```typescript
function generateWindows(bx: number, by: number, bw: number, bh: number, litChance = 0.6): GameWindow[] {
```

To:

```typescript
export function generateWindows(bx: number, by: number, bw: number, bh: number, litChance = 0.6): GameWindow[] {
```

Note: `CONSTRUCTION_BUILDING_HEIGHT` was already added to the city.ts imports in Task 3.

- [ ] **Step 1b: Add `insertBuilding()` to `src/city.ts`**

Add after `checkGorillaGroundSupport()`:

```typescript
export function insertBuilding(
  buildings: Building[],
  x: number,
  cityTheme: CityTheme,
  timeOfDay: TimeOfDay
): { building: Building; insertIdx: number } {
  const maxBuildingTop = 40 + GORILLA_HEIGHT;

  // Find the gap — determine available width
  let gapStart = x;
  let gapEnd = x + MIN_BUILDING_WIDTH;
  for (const b of buildings) {
    if (b.height <= 0) continue;
    if (b.x + b.width < x) gapStart = Math.max(gapStart, b.x + b.width + 2);
    if (b.x > x) { gapEnd = Math.min(gapEnd, b.x - 2); break; }
  }

  const width = Math.max(MIN_BUILDING_WIDTH, Math.min(gapEnd - gapStart, MAX_BUILDING_WIDTH));
  let height = CONSTRUCTION_BUILDING_HEIGHT;
  if (BOTTOM_LINE - height < maxBuildingTop) height = BOTTOM_LINE - maxBuildingTop;

  const colors = CITY_THEME_COLORS[cityTheme];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const litChance = timeOfDay === "night" ? 0.7 : 0.6;
  const bx = gapStart;
  const by = BOTTOM_LINE - height;
  const windows = generateWindows(bx, by, width, height, litChance);

  const building: Building = { x: bx, y: by, width, height, color, windows, damage: [] };

  // Find correct sorted position (by x)
  let insertIdx = buildings.length;
  for (let i = 0; i < buildings.length; i++) {
    if (buildings[i].x > bx) { insertIdx = i; break; }
  }
  buildings.splice(insertIdx, 0, building);

  return { building, insertIdx };
}
```

- [ ] **Step 2: Add construction building-hit and ground-hit handlers in `updateFlight()`**

In the `case "building"` block, add before the demolition check:

```typescript
        if (projType === "construction") {
          // Repair and extend the hit building
          result.building.damage = [];
          const maxBuildingTop = 40 + GORILLA_HEIGHT;
          result.building.y = Math.max(result.building.y - CONSTRUCTION_HEIGHT_ADD, maxBuildingTop);
          result.building.height = BOTTOM_LINE - result.building.y;
          // Regenerate windows
          const litChance = state.timeOfDay === "night" ? 0.7 : 0.6;
          const colors = CITY_THEME_COLORS[state.cityTheme];
          result.building.color = colors[Math.floor(Math.random() * colors.length)];
          result.building.windows = [];
          for (let wx = result.building.x + 4; wx < result.building.x + result.building.width - 4; wx += 8) {
            for (let wy = result.building.y + 4; wy < result.building.y + result.building.height - 6; wy += 10) {
              result.building.windows.push({ x: wx, y: wy, lit: Math.random() < litChance });
            }
          }
          // Move gorillas on this building up
          for (let i = 0; i < 2; i++) {
            const bIdx = findBuildingUnderGorilla(state.gorillas[i], state.buildings);
            if (state.buildings[bIdx] === result.building) {
              state.gorillas[i].y = result.building.y - GORILLA_HEIGHT;
            }
          }
          state.projectile = null;
          playSound("construction");
          resolveThrowEnd();
          break;
        }
```

Add `CONSTRUCTION_HEIGHT_ADD`, `CITY_THEME_COLORS`, `JUMP_ARC_MS`, and `JUMP_ARC_HEIGHT` to the sketch.ts config imports if not already present. Also add `insertBuilding` to the city imports:

```typescript
import { generateCityscape, placeGorillas, generateWind, randomGorillaPlacements, reshuffleBuildings, checkGorillaGroundSupport, insertBuilding } from "./city";
```

In the `case "miss"` block of `updateFlight()` (line 673), add a construction ground-hit check. Insert it right after the earthquake miss check (after line 679 `return; }`), and before the `const pos2 = ...` line (line 680):

```typescript
        // Construction: create building if banana hit ground level
        if (projType === "construction") {
          const cPos = getProjectilePositionWithGravity(state.projectile!, state.wind, effectiveGravity);
          if (cPos.y >= BOTTOM_LINE) {
            const { building: newBuilding, insertIdx } = insertBuilding(
              state.buildings, cPos.x, state.cityTheme, state.timeOfDay
            );
            // Update crate building index if shifted
            if (state.crate && state.crate.buildingIdx >= insertIdx) {
              state.crate.buildingIdx++;
            }
            // Lift ground-level gorillas that are within the new building
            for (let i = 0; i < 2; i++) {
              const g = state.gorillas[i];
              if (g.y >= BOTTOM_LINE - GORILLA_HEIGHT) {
                const gCenter = g.x + GORILLA_WIDTH / 2;
                if (gCenter >= newBuilding.x && gCenter <= newBuilding.x + newBuilding.width) {
                  g.y = newBuilding.y - GORILLA_HEIGHT;
                  state.fallingGorillas[i] = null; // cancel any fall
                }
              }
            }
            state.projectile = null;
            playSound("construction");
            resolveThrowEnd();
            return;
          }
        }
```

Add `insertBuilding` to the city imports in sketch.ts.

- [ ] **Step 3: Add construction sound to `src/sound.ts`**

Add `"construction"` to `SoundName` type and switch. Add:

```typescript
function playConstruction() {
  const c = getCtx();
  // Rising build sound — ascending tones
  [300, 400, 500, 650].forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "triangle";
    const t = c.currentTime + i * 0.08;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.12);
  });
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add src/sketch.ts src/city.ts src/sound.ts
git commit -m "feat: construction banana - repairs buildings and creates new ones"
```

---

### Task 6: Implement jump banana

**Files:**
- Modify: `src/sketch.ts`
- Modify: `src/sound.ts`

- [ ] **Step 1: Add jump handler in `launchBanana()`**

In `launchBanana()`, after the shield instant-deploy block (after line 471 `return;`), add:

```typescript
    // Jump: instant effect, no projectile
    if (activePowerUp === "jump") {
      // Determine direction from angle
      let jumpRight = state.angle <= 90 || state.angle > 270;
      // Mirror inverts direction
      if (state.mirrorTurns[playerIdx] > 0) jumpRight = !jumpRight;

      const currentBuildingIdx = findBuildingUnderGorilla(gorilla, state.buildings);
      const targetIdx = findJumpTarget(currentBuildingIdx, jumpRight);

      if (targetIdx >= 0 && targetIdx !== currentBuildingIdx) {
        const targetBuilding = state.buildings[targetIdx];
        const endX = targetBuilding.x + targetBuilding.width / 2 - GORILLA_WIDTH / 2;
        const endY = targetBuilding.y - GORILLA_HEIGHT;
        const isWrapping = jumpRight
          ? targetIdx < currentBuildingIdx  // went right but ended up at lower index = wrapped
          : targetIdx > currentBuildingIdx; // went left but ended up at higher index = wrapped

        state.jumpAnim = {
          playerIdx,
          startX: gorilla.x,
          startY: gorilla.y,
          endX,
          endY,
          startTime: p.millis(),
          wrapDirection: isWrapping ? (jumpRight ? "right" : "left") : null,
        };
        state.phase = "jump";
        playSound("jump_launch");
      } else {
        // No valid building — stay put, consume turn
        resolveThrowEnd();
      }
      gorilla.armState = "down";
      return;
    }
```

- [ ] **Step 2: Add `findJumpTarget()` helper**

Add after `findBuildingUnderGorilla()`:

```typescript
  function findJumpTarget(currentIdx: number, goRight: boolean): number {
    const len = state.buildings.length;
    if (currentIdx < 0) return -1;

    const step = goRight ? 1 : -1;
    // Search in the aimed direction, wrapping around
    for (let i = 1; i < len; i++) {
      const idx = ((currentIdx + step * i) % len + len) % len;
      if (state.buildings[idx].height > 0) return idx;
    }
    return -1; // all buildings demolished
  }
```

- [ ] **Step 3: Add `updateJump()` function**

Add after `isFallingComplete()`:

```typescript
  function updateJump() {
    if (!state.jumpAnim) return;
    const elapsed = p.millis() - state.jumpAnim.startTime;
    const t = Math.min(elapsed / JUMP_ARC_MS, 1);

    const anim = state.jumpAnim;
    const gorilla = state.gorillas[anim.playerIdx];

    // Arms up during jump
    gorilla.armState = t < 1 ? "left_up" : "down";

    if (t >= 1) {
      // Landing
      gorilla.x = anim.endX;
      gorilla.y = anim.endY;
      gorilla.armState = "down";
      state.jumpAnim = null;
      playSound("jump_land");
      resolveThrowEnd();
      return;
    }

    // Compute animated position
    const peakY = Math.min(anim.startY, anim.endY) - JUMP_ARC_HEIGHT;

    if (!anim.wrapDirection) {
      // Normal jump: lerp X, parabolic Y
      gorilla.x = anim.startX + (anim.endX - anim.startX) * t;
      // Parabolic arc: y = start + (peak - start) * 4t(1-t) when t=0.5 is peak
      // More precisely: quadratic through (0, startY), (0.5, peakY), (1, endY)
      const a0 = anim.startY;
      const a1 = anim.endY;
      gorilla.y = a0 * (1 - t) * (1 - 2 * t) + peakY * 4 * t * (1 - t) + a1 * t * (2 * t - 1);
    } else {
      // Wrap-around jump: two segments
      const edge = anim.wrapDirection === "right" ? WIDTH : 0;
      const oppositeEdge = anim.wrapDirection === "right" ? 0 : WIDTH;

      if (t < 0.5) {
        // First half: move toward edge
        const segT = t / 0.5;
        gorilla.x = anim.startX + (edge - anim.startX) * segT;
        // Y arcs up to peak at t=0.5
        gorilla.y = anim.startY + (peakY - anim.startY) * segT;
      } else {
        // Second half: appear from opposite edge, move to target
        const segT = (t - 0.5) / 0.5;
        gorilla.x = oppositeEdge + (anim.endX - oppositeEdge) * segT;
        // Y arcs down from peak to end
        gorilla.y = peakY + (anim.endY - peakY) * segT;
      }
    }
  }
```

- [ ] **Step 4: Add `"jump"` case to the `draw()` phase switch**

In the `switch (state.phase)` block, add after the `"explosion"` case (after line 257):

```typescript
      case "jump":
        updateJump();
        drawGameplay(p);
        break;
```

- [ ] **Step 5: Add jump sounds to `src/sound.ts`**

Add `"jump_launch"` and `"jump_land"` to `SoundName` type and switch. Add:

```typescript
function playJumpLaunch() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(200, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800, c.currentTime + 0.15);
  gain.gain.setValueAtTime(0.15, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.2);
}

function playJumpLand() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(150, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(60, c.currentTime + 0.15);
  gain.gain.setValueAtTime(0.2, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.15);
}
```

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit`

- [ ] **Step 7: Commit**

```bash
git add src/sketch.ts src/sound.ts
git commit -m "feat: jump banana - gorilla leaps to adjacent building with arc animation"
```

---

### Task 7: Drawing loop guard for demolished buildings

**Files:**
- Modify: `src/sketch.ts`

- [ ] **Step 1: Skip demolished buildings in `drawCity()`**

Find the `drawCity` function in sketch.ts. In the building drawing loop, add a guard at the top:

```typescript
    if (b.height <= 0) continue;
```

This prevents drawing zero-height buildings.

- [ ] **Step 2: Also skip demolished buildings in `randomGorillaPlacements()` in `city.ts`**

In `randomGorillaPlacements()` (line 120), the filter already checks roof damage. Add a height check:

```typescript
  const viable = buildings.map((b, i) => ({ b, i })).filter(({ b, i }) => {
    if (b.height <= 0) return false; // demolished
    if (i === currentP1Idx || i === currentP2Idx) return false;
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/sketch.ts src/city.ts
git commit -m "feat: skip demolished buildings in drawing and gorilla placement"
```

---

### Task 8: Integration testing and polish

**Files:**
- Modify: `src/sketch.ts` (if needed)

- [ ] **Step 1: Full type check**

Run: `npx tsc --noEmit`
Expected: Clean (ignoring node_modules rcade plugin errors).

- [ ] **Step 2: Verify all new sound names are wired up**

Check that `SoundName` type, `playSound` switch, and the play functions are all in sync for: `demolition`, `construction`, `jump_launch`, `jump_land`.

- [ ] **Step 3: Verify the drawAngleIndicator handles new types**

Check `drawAngleIndicator()` in `ui.ts` — it has a switch for power-up visuals on the angle arrow. The new types should fall through to the default banana-colored case, which is fine.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: integration fixes for new banana types"
```

(Skip this commit if no fixes were needed.)
