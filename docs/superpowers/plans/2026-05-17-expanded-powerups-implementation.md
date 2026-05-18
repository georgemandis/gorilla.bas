# Expanded Power-Up System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 11 new banana power-up types (ice, mirror, gravity, shield, rubber, homing, ghost, giant, boomerang, drunk, earthquake) to the existing 9-type system.

**Architecture:** Extend all existing patterns — types, config, powerup-behaviors, collision, sketch flight/hit handlers, ui, gorilla rendering, sound. Fix poison double-decrement bug. Refactor gorilla tints from single boolean to structured object.

**Tech Stack:** P5.js + TypeScript, Vite + Bun, 336x262 arcade cabinet display. No test framework — verify with `npx tsc --noEmit`.

---

## Context for All Tasks

**Parametric physics:** `x = startX + vx * t + 0.5 * (wind/5) * t^2`, `y = startY - vy * t * Y_SCALE + 0.5 * gravity * t^2 * Y_SCALE`. Y_SCALE = 262/350.

**Projectile restart pattern:** When modifying a projectile mid-flight, use `restartProjectile(proj, newX, newY, newVx, newVy)` with `proj.vx` (wind-free, physics re-applies wind) and convert screen-vy to launch convention: `currentVy = -proj.vy + gravity * proj.t`, then pass `-currentVy` as newVy.

**Collision types:** `"none" | "miss" | "building" | "gorilla" | "sun" | "crate"`. Miss fires on `x < 0 || x > WIDTH || y > BOTTOM_LINE || t >= MAX_FLIGHT_T`.

**Key files:**
- `src/types.ts` — Type definitions
- `src/config.ts` — Constants
- `src/powerup-behaviors.ts` — Flight modifier handlers
- `src/sketch.ts` — Main game logic (large file, ~1440 lines)
- `src/collision.ts` — Collision detection
- `src/ui.ts` — HUD drawing
- `src/gorilla.ts` — Gorilla rendering
- `src/sound.ts` — Web Audio synthesis
- `src/city.ts` — City generation
- `src/physics.ts` — Projectile physics

---

### Task 1: Type Definitions and Config Constants

**Files:**
- Modify: `src/types.ts`
- Modify: `src/config.ts`

- [ ] **Step 1: Extend PowerUpType union**

In `src/types.ts`, line 75-76, change:
```typescript
export type PowerUpType = "big_banana" | "two_bananas" | "ricochet" | "wrap_around"
  | "cluster_bomb" | "teleportation" | "portal" | "confetti" | "poison"
  | "ice" | "mirror" | "gravity_flip" | "shield" | "rubber" | "homing"
  | "ghost" | "giant" | "boomerang" | "drunk" | "earthquake";
```

- [ ] **Step 2: Add Projectile fields**

In `src/types.ts`, add to the Projectile interface after line 56:
```typescript
  boomerangReturned?: boolean;
  rubberBouncesRemaining?: number;
  drunkPerpX?: number;
  drunkPerpY?: number;
```

- [ ] **Step 3: Add GorillaTints interface**

In `src/types.ts`, after the GorillaCostume interface (line 40), add:
```typescript
export interface GorillaTints {
  poison?: boolean;
  ice?: boolean;
  mirror?: boolean;
  gravity?: boolean;
  shield?: boolean;
}
```

- [ ] **Step 4: Add GameState fields**

In `src/types.ts`, add to GameState after `poisonTurns` (line 128):
```typescript
  iceTurns: [number, number];
  mirrorTurns: [number, number];
  gravityTurns: [number, number];
  shield: [boolean, boolean];
  earthquakeTimer: number;
```

- [ ] **Step 5: Add config constants**

In `src/config.ts`, after the existing power-up constants (after line 108), add:
```typescript
export const ICE_TURNS = 3;
export const MIRROR_TURNS = 3;
export const GRAVITY_TURNS = 1;
export const RUBBER_MAX_BOUNCES = 5;
export const HOMING_NUDGE = 0.3;
export const DRUNK_WOBBLE_AMP = 15;
export const GIANT_POWER_MULT = 0.5;
export const GIANT_EXPLOSION_MULT = 3;
export const GIANT_HITBOX_MULT = 3;
export const EARTHQUAKE_SHAKE_MS = 500;
```

- [ ] **Step 6: Extend ALL_POWERUP_TYPES**

In `src/config.ts`, update the ALL_POWERUP_TYPES array (line 109-112):
```typescript
export const ALL_POWERUP_TYPES: PowerUpType[] = [
  "big_banana", "two_bananas", "ricochet", "wrap_around",
  "cluster_bomb", "teleportation", "portal", "confetti", "poison",
  "ice", "mirror", "gravity_flip", "shield", "rubber", "homing",
  "ghost", "giant", "boomerang", "drunk", "earthquake",
];
```

- [ ] **Step 7: Initialize new state in sketch.ts**

In `src/sketch.ts`, in `createInitialState()` (after line 70, `poisonTurns`), add:
```typescript
    iceTurns: [0, 0],
    mirrorTurns: [0, 0],
    gravityTurns: [0, 0],
    shield: [false, false],
    earthquakeTimer: 0,
```

- [ ] **Step 8: Reset new state in startNewRound()**

In `src/sketch.ts`, in `startNewRound()`, after the existing resets (near line 360), add:
```typescript
    state.shield = [false, false];
    state.earthquakeTimer = 0;
    // iceTurns, mirrorTurns, gravityTurns persist across rounds (like poisonTurns)
```

- [ ] **Step 9: Reset new state in triggerBananality()**

In `src/sketch.ts`, in `triggerBananality()` (after line 936), add:
```typescript
    state.iceTurns = [0, 0];
    state.mirrorTurns = [0, 0];
    state.gravityTurns = [0, 0];
    state.shield = [false, false];
    state.earthquakeTimer = 0;
```

- [ ] **Step 10: Add stub defaults to exhaustive switches in ui.ts**

The `powerUpDisplayName` and `drawPowerUpIcon` functions in `src/ui.ts` have exhaustive switches with no `default`. Adding 11 new types to the union will cause TypeScript errors until Task 5 adds the real cases. Add temporary defaults now:

In `powerUpDisplayName`, add before the closing `}`:
```typescript
    default: return (type as string).toUpperCase();
```

In `drawPowerUpIcon`, add before the closing `}`:
```typescript
    default:
      p.fill(150);
      p.circle(x + size / 2, y + size / 2, size);
      break;
```

Similarly, in `drawAngleIndicator`, the switch on `state.selectedPowerUp` already has a `default` case, so no change needed there.

- [ ] **Step 11: Build and verify**

Run: `npx tsc --noEmit 2>&1 | grep -v node_modules`
Expected: No errors

- [ ] **Step 12: Commit**

```
git add src/types.ts src/config.ts src/sketch.ts src/ui.ts
git commit -m "feat(powerups): type definitions and config for 11 new power-ups"
```

---

### Task 2: Gorilla Tints Refactor

**Files:**
- Modify: `src/gorilla.ts`
- Modify: `src/sketch.ts`
- Modify: `src/ui.ts`

- [ ] **Step 1: Refactor drawGorilla signature**

In `src/gorilla.ts`, change the import on line 2:
```typescript
import type { Gorilla, ArmState, GorillaCostume, GorillaTints } from "./types";
```

Change `drawGorilla` signature (line 7):
```typescript
export function drawGorilla(p: p5, gorilla: Gorilla, costume?: GorillaCostume | null, tints?: GorillaTints): void {
```

Replace the poison tint block (lines 37-42) with stacked tint overlays:
```typescript
  // Debuff tint overlays (all stack)
  if (tints?.poison) {
    p.fill(0, 180, 0, 80);
    p.rect(x + 4, y + 10, 12, 10);
    p.rect(x + 5, y + 2, 10, 9);
  }
  if (tints?.ice) {
    p.fill(100, 200, 255, 80);
    p.rect(x + 4, y + 10, 12, 10);
    p.rect(x + 5, y + 2, 10, 9);
  }
  if (tints?.mirror) {
    p.fill(180, 0, 255, 80);
    p.rect(x + 4, y + 10, 12, 10);
    p.rect(x + 5, y + 2, 10, 9);
  }
  if (tints?.gravity) {
    p.fill(255, 180, 0, 80);
    p.rect(x + 4, y + 10, 12, 10);
    p.rect(x + 5, y + 2, 10, 9);
    // Small down-arrow indicator above head
    p.fill(255, 180, 0);
    p.triangle(x + 8, y - 2, x + 12, y - 2, x + 10, y + 1);
  }
  if (tints?.shield) {
    p.fill(0, 255, 255, 40);
    p.noStroke();
    p.ellipse(x + 10, y + 12, 24, 30);
    p.stroke(0, 255, 255, 80);
    p.strokeWeight(1);
    p.noFill();
    p.ellipse(x + 10, y + 12, 24, 30);
    p.noStroke();
  }
```

- [ ] **Step 2: Update all drawGorilla calls in sketch.ts**

Search for all `drawGorilla(p, state.gorillas[i], costumes[i], state.poisonTurns[i] > 0)` calls and replace the 4th argument with a tints object. There are multiple call sites in the gorilla drawing loop and the bananality section.

Replace all instances of:
```typescript
drawGorilla(p, state.gorillas[i], costumes[i], state.poisonTurns[i] > 0);
```
with:
```typescript
drawGorilla(p, state.gorillas[i], costumes[i], {
  poison: state.poisonTurns[i] > 0,
  ice: state.iceTurns[i] > 0,
  mirror: state.mirrorTurns[i] > 0,
  gravity: state.gravityTurns[i] > 0,
  shield: state.shield[i],
});
```

Also update the `drawGorilla` calls in `drawGameplay` for the loser/dance gorilla paths (same tints object).

For the title screen gorillas in `src/ui.ts` (`drawTitleScreen`), those pass no tints — they're fine as-is since the parameter is optional.

- [ ] **Step 3: Build and verify**

Run: `npx tsc --noEmit 2>&1 | grep -v node_modules`
Expected: No errors

- [ ] **Step 4: Commit**

```
git add src/gorilla.ts src/sketch.ts
git commit -m "feat(powerups): refactor gorilla tints from boolean to structured object"
```

---

### Task 3: Fix Poison Double-Decrement and Add Debuff Decrement

**Files:**
- Modify: `src/sketch.ts`

- [ ] **Step 1: Remove poison decrement from updateRoundStart()**

In `src/sketch.ts`, in `updateRoundStart()` (around line 378-381), remove:
```typescript
      // Decrement poison for current player at round start
      if (state.poisonTurns[state.currentPlayer - 1] > 0) {
        state.poisonTurns[state.currentPlayer - 1]--;
      }
```

- [ ] **Step 2: Add all debuff decrements in resolveThrowEnd()**

In `src/sketch.ts`, in `resolveThrowEnd()`, in the `else` branch (actual player switch), after the existing poison decrement, add ice/mirror/gravity decrements:

Find the block that looks like:
```typescript
      // Decrement poison for the player who is about to aim
      const nextPlayerIdx = (state.currentPlayer === 1 ? 1 : 0) as 0 | 1;
      if (state.poisonTurns[nextPlayerIdx] > 0) {
        state.poisonTurns[nextPlayerIdx]--;
      }
```

Add after it:
```typescript
      if (state.iceTurns[nextPlayerIdx] > 0) {
        state.iceTurns[nextPlayerIdx]--;
      }
      if (state.mirrorTurns[nextPlayerIdx] > 0) {
        state.mirrorTurns[nextPlayerIdx]--;
      }
      if (state.gravityTurns[nextPlayerIdx] > 0) {
        state.gravityTurns[nextPlayerIdx]--;
      }
```

- [ ] **Step 3: Build and verify**

Run: `npx tsc --noEmit 2>&1 | grep -v node_modules`
Expected: No errors

- [ ] **Step 4: Commit**

```
git add src/sketch.ts
git commit -m "fix(powerups): single decrement point for all debuffs in resolveThrowEnd"
```

---

### Task 4: Sounds for All 11 New Power-Ups

**Files:**
- Modify: `src/sound.ts`

- [ ] **Step 1: Extend SoundName type**

In `src/sound.ts`, line 9, extend the SoundName type to add:
```typescript
| "ice_hit" | "mirror_hit" | "gravity_hit" | "shield_deploy" | "shield_break" | "rubber_bounce" | "homing_lock" | "ghost_whoosh" | "giant_thud" | "boomerang_return" | "drunk_wobble" | "earthquake_rumble"
```

- [ ] **Step 2: Add switch cases**

In the `playSound` switch (starting line 13), add cases:
```typescript
      case "ice_hit": playIceHit(); break;
      case "mirror_hit": playMirrorHit(); break;
      case "gravity_hit": playGravityHit(); break;
      case "shield_deploy": playShieldDeploy(); break;
      case "shield_break": playShieldBreak(); break;
      case "rubber_bounce": playRubberBounce(); break;
      case "homing_lock": playHomingLock(); break;
      case "ghost_whoosh": playGhostWhoosh(); break;
      case "giant_thud": playGiantThud(); break;
      case "boomerang_return": playBoomerangReturn(); break;
      case "drunk_wobble": playDrunkWobble(); break;
      case "earthquake_rumble": playEarthquakeRumble(); break;
```

- [ ] **Step 3: Implement sound functions**

Add at the bottom of the file:

```typescript
function playIceHit() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(1200, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(400, c.currentTime + 0.3);
  gain.gain.setValueAtTime(0.12, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.3);
}

function playMirrorHit() {
  const c = getCtx();
  [800, 600, 800].forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "triangle";
    const t = c.currentTime + i * 0.08;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  });
}

function playGravityHit() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(400, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, c.currentTime + 0.4);
  gain.gain.setValueAtTime(0.12, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.4);
}

function playShieldDeploy() {
  const c = getCtx();
  [400, 600, 800, 1000].forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    const t = c.currentTime + i * 0.06;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  });
}

function playShieldBreak() {
  const c = getCtx();
  const bufferSize = c.sampleRate * 0.3;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize) * 0.6;
  }
  const noise = c.createBufferSource();
  noise.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(2000, c.currentTime);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.2, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
  noise.connect(filter).connect(gain).connect(c.destination);
  noise.start();
  noise.stop(c.currentTime + 0.3);
}

function playRubberBounce() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(200 + Math.random() * 400, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, c.currentTime + 0.1);
  gain.gain.setValueAtTime(0.15, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.1);
}

function playHomingLock() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(600, c.currentTime);
  osc.frequency.setValueAtTime(800, c.currentTime + 0.05);
  osc.frequency.setValueAtTime(600, c.currentTime + 0.1);
  gain.gain.setValueAtTime(0.08, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.15);
}

function playGhostWhoosh() {
  const c = getCtx();
  const bufferSize = c.sampleRate * 0.3;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI) * 0.3;
  }
  const noise = c.createBufferSource();
  noise.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(800, c.currentTime);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.1, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
  noise.connect(filter).connect(gain).connect(c.destination);
  noise.start();
  noise.stop(c.currentTime + 0.3);
}

function playGiantThud() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(60, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(30, c.currentTime + 0.3);
  gain.gain.setValueAtTime(0.25, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.35);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.35);
}

function playBoomerangReturn() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(300, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(600, c.currentTime + 0.15);
  osc.frequency.exponentialRampToValueAtTime(300, c.currentTime + 0.3);
  gain.gain.setValueAtTime(0.12, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.3);
}

function playDrunkWobble() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(300 + Math.random() * 200, c.currentTime);
  osc.frequency.linearRampToValueAtTime(200 + Math.random() * 200, c.currentTime + 0.1);
  gain.gain.setValueAtTime(0.06, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.1);
}

function playEarthquakeRumble() {
  const c = getCtx();
  // Low rumble
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(40, c.currentTime);
  osc.frequency.linearRampToValueAtTime(60, c.currentTime + 0.3);
  osc.frequency.linearRampToValueAtTime(30, c.currentTime + 0.5);
  gain.gain.setValueAtTime(0.2, c.currentTime);
  gain.gain.linearRampToValueAtTime(0.25, c.currentTime + 0.2);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.5);
  // Cracking noise
  const bufferSize = c.sampleRate * 0.3;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize) * 0.4;
  }
  const noise = c.createBufferSource();
  noise.buffer = buffer;
  const g2 = c.createGain();
  g2.gain.setValueAtTime(0.15, c.currentTime + 0.1);
  g2.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4);
  noise.connect(g2).connect(c.destination);
  noise.start(c.currentTime + 0.1);
  noise.stop(c.currentTime + 0.4);
}
```

- [ ] **Step 4: Build and verify**

Run: `npx tsc --noEmit 2>&1 | grep -v node_modules`
Expected: No errors

- [ ] **Step 5: Commit**

```
git add src/sound.ts
git commit -m "feat(powerups): sounds for 11 new power-up types"
```

---

### Task 5: UI — Icons, Names, and Aim Indicator

**Files:**
- Modify: `src/ui.ts`

- [ ] **Step 1: Add new power-up display names**

In `src/ui.ts`, extend `powerUpDisplayName()` switch with new cases:
```typescript
    case "ice": return "ICE";
    case "mirror": return "MIRROR";
    case "gravity_flip": return "GRAVITY";
    case "shield": return "SHIELD";
    case "rubber": return "RUBBER";
    case "homing": return "HOMING";
    case "ghost": return "GHOST";
    case "giant": return "GIANT";
    case "boomerang": return "BOOMERANG";
    case "drunk": return "DRUNK";
    case "earthquake": return "EARTHQUAKE";
```

- [ ] **Step 2: Add new power-up icons**

In `src/ui.ts`, extend `drawPowerUpIcon()` switch with new cases:
```typescript
    case "ice":
      p.fill(100, 200, 255);
      p.circle(x + size / 2, y + size / 2, size);
      break;
    case "mirror":
      p.fill(180, 0, 255);
      p.circle(x + size / 2, y + size / 2, size);
      break;
    case "gravity_flip":
      p.fill(255, 180, 0);
      p.circle(x + size / 2, y + size / 2, size);
      break;
    case "shield":
      p.fill(0, 255, 255);
      p.circle(x + size / 2, y + size / 2, size);
      break;
    case "rubber":
      p.fill(0, 220, 255);
      p.circle(x + size / 2, y + size / 2, size);
      p.fill(255);
      p.circle(x + size / 2, y + size / 2, size * 0.3);
      break;
    case "homing":
      p.fill(255, 80, 50);
      p.circle(x + size / 2, y + size / 2, size);
      break;
    case "ghost":
      p.fill(255, 255, 255, 150);
      p.circle(x + size / 2, y + size / 2, size);
      break;
    case "giant":
      p.fill(255, 255, 0);
      p.circle(x + size / 2, y + size / 2, size * 1.3);
      break;
    case "boomerang":
      p.fill(255, 200, 100);
      p.circle(x + size / 2, y + size / 2, size);
      break;
    case "drunk":
      p.fill(200, 100, 255);
      p.circle(x + size / 2, y + size / 2, size);
      break;
    case "earthquake":
      p.fill(139, 90, 43);
      p.circle(x + size / 2, y + size / 2, size);
      break;
```

- [ ] **Step 3: Add aim indicator cases**

In `src/ui.ts`, in `drawAngleIndicator()`, extend the switch on `state.selectedPowerUp` with new cases inside the `p.push()` block. Add before the default case:
```typescript
    case "ice":
      p.fill(100, 200, 255);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      break;
    case "mirror":
      p.fill(180, 0, 255);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      break;
    case "gravity_flip":
      p.fill(255, 180, 0);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      break;
    case "shield":
      p.fill(0, 255, 255);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      break;
    case "rubber":
      p.fill(0, 220, 255);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      break;
    case "homing":
      p.fill(255, 80, 50);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      break;
    case "ghost":
      p.fill(255, 255, 255, 150);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      break;
    case "giant":
      p.fill(255, 255, 0);
      p.arc(0, 0, 12, 9, 0, Math.PI);
      break;
    case "boomerang":
      p.fill(255, 200, 100);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      break;
    case "drunk":
      p.fill(200, 100, 255);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      break;
    case "earthquake":
      p.fill(139, 90, 43);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      break;
```

- [ ] **Step 4: Mirror aim arrow inversion**

In `src/ui.ts`, in `drawAngleIndicator()`, at the top of the function, after computing `angleRad` (line 35), add mirror inversion. Import `GameState` is already imported. The state's `mirrorTurns` is on state. Add:

```typescript
  // Mirror debuff: invert the displayed aim arrow horizontally
  const playerIdx = state.currentPlayer - 1;
  const effectiveAngle = state.mirrorTurns[playerIdx] > 0
    ? Math.PI - angleRad  // mirror horizontally
    : angleRad;
```

Then replace ALL 4 uses of `angleRad` after this point with `effectiveAngle`:
1. `const endX = centerX + Math.cos(effectiveAngle) * ANGLE_ARROW_LENGTH;`
2. `const endY = centerY - Math.sin(effectiveAngle) * ANGLE_ARROW_LENGTH;`
3. `p.translate(endX, endY);` (uses the recomputed endX/endY above)
4. `p.rotate(-effectiveAngle);`

- [ ] **Step 5: Build and verify**

Run: `npx tsc --noEmit 2>&1 | grep -v node_modules`
Expected: No errors

- [ ] **Step 6: Commit**

```
git add src/ui.ts
git commit -m "feat(powerups): UI icons, names, and aim indicator for 11 new types"
```

---

### Task 6: Collision Changes — Ghost and Giant

**Files:**
- Modify: `src/collision.ts`

- [ ] **Step 1: Add parameters for ghost and giant**

In `src/collision.ts`, modify `checkCollision` signature (line 12) to add optional parameters:
```typescript
export function checkCollision(
  x: number,
  y: number,
  t: number,
  buildings: Building[],
  gorillas: [Gorilla, Gorilla],
  crate?: PowerUpCrate | null,
  options?: { skipBuildings?: boolean; gorillaHitboxMult?: number }
): CollisionResult {
```

- [ ] **Step 2: Apply gorillaHitboxMult to gorilla collision check**

Replace the gorilla collision loop (lines 32-41) with:
```typescript
  const hitMult = options?.gorillaHitboxMult ?? 1;
  for (const gorilla of gorillas) {
    const expandX = (gorilla.width * (hitMult - 1)) / 2;
    const expandY = (gorilla.height * (hitMult - 1)) / 2;
    if (
      x >= gorilla.x - expandX &&
      x <= gorilla.x + gorilla.width + expandX &&
      y >= gorilla.y - expandY &&
      y <= gorilla.y + gorilla.height + expandY
    ) {
      return { type: "gorilla", gorilla };
    }
  }
```

- [ ] **Step 3: Skip buildings for ghost banana**

Wrap the building collision loop (lines 51-71) with:
```typescript
  if (!options?.skipBuildings) {
    // existing building collision code
  }
```

- [ ] **Step 4: Build and verify**

Run: `npx tsc --noEmit 2>&1 | grep -v node_modules`
Expected: No errors

- [ ] **Step 5: Commit**

```
git add src/collision.ts
git commit -m "feat(powerups): ghost skip-buildings and giant hitbox multiplier in collision"
```

---

### Task 7: Power-Up Behaviors — Rubber, Homing, Drunk, Boomerang

**Files:**
- Modify: `src/powerup-behaviors.ts`

- [ ] **Step 1: Add imports**

In `src/powerup-behaviors.ts`, update the config import to add:
```typescript
import {
  BIG_BANANA_EXPLOSION_MULT, EXPLOSION_RADIUS,
  RICOCHET_MAX_BOUNCES, WRAP_MAX_WRAPS, PORTAL_MAX_PASSES,
  CLUSTER_SPLIT_MS, WIDTH,
  CLUSTER_SUB_COUNT, CLUSTER_FAN_DEGREES, CLUSTER_EXPLOSION_MULT, Y_SCALE,
  RUBBER_MAX_BOUNCES, HOMING_NUDGE, DRUNK_WOBBLE_AMP,
  GIANT_EXPLOSION_MULT, GIANT_HITBOX_MULT,
} from "./config";
```

- [ ] **Step 2: Extend applyPowerUpToProjectile**

In `src/powerup-behaviors.ts`, in the `applyPowerUpToProjectile` switch, add cases:
```typescript
    case "rubber":
      proj.rubberBouncesRemaining = RUBBER_MAX_BOUNCES;
      break;
    case "giant":
      proj.explosionRadius = EXPLOSION_RADIUS * GIANT_EXPLOSION_MULT;
      break;
    case "drunk": {
      // Store perpendicular direction in SCREEN SPACE (not launch convention)
      // proj.vy is launch convention (positive = up), screen vy = -proj.vy * Y_SCALE
      const screenVy = -proj.vy * Y_SCALE;
      const speed = Math.sqrt(proj.vx * proj.vx + screenVy * screenVy);
      if (speed > 0) {
        proj.drunkPerpX = -screenVy / speed;
        proj.drunkPerpY = proj.vx / speed;
      } else {
        proj.drunkPerpX = 0;
        proj.drunkPerpY = 1;
      }
      break;
    }
    // ice, mirror, gravity_flip, shield, homing, ghost, boomerang, earthquake:
    // no projectile mods needed at launch time
```

- [ ] **Step 3: Add handleRubberBounce**

```typescript
export function handleRubberBounce(
  proj: Projectile,
  x: number,
  y: number,
  hitSurface: "top" | "side" | "edge_left" | "edge_right" | "edge_top",
  gravity: number
): Projectile | null {
  if (!proj.rubberBouncesRemaining || proj.rubberBouncesRemaining <= 0) return null;

  const currentVy = -proj.vy + gravity * proj.t;
  let newVx = proj.vx;
  let newVy = -currentVy; // convert back to launch convention

  switch (hitSurface) {
    case "top":
      // Bounce off building top: flip vertical
      newVy = currentVy; // reflect: was going down, now going up in launch convention
      break;
    case "side":
    case "edge_left":
    case "edge_right":
      // Bounce off side: flip horizontal
      newVx = -proj.vx;
      newVy = -currentVy;
      break;
    case "edge_top":
      // Bounce off top of screen
      newVy = currentVy;
      break;
  }

  // Chaotic velocity mutations
  newVx *= 0.5 + Math.random(); // 0.5 to 1.5
  newVy += newVy * (Math.random() * 0.6 - 0.3); // +/- 30%
  // Increase speed by 10%
  newVx *= 1.1;
  newVy *= 1.1;

  const restarted = restartProjectile(proj, x, y, newVx, newVy);
  restarted.rubberBouncesRemaining = proj.rubberBouncesRemaining - 1;
  return restarted;
}
```

- [ ] **Step 4: Add applyHomingNudge**

```typescript
export function applyHomingNudge(
  proj: Projectile,
  currentPos: { x: number; y: number },
  targetX: number,
  wind: number,
  gravity: number
): Projectile | null {
  // Only activate after apex (screen-vy becomes positive = moving downward)
  const screenVy = -proj.vy + gravity * proj.t;
  if (screenVy <= 0) return null; // still going up

  const diff = targetX - currentPos.x;
  if (Math.abs(diff) < 5) return null; // close enough

  // Use restartProjectile pattern to avoid position discontinuity
  const nudgedVx = proj.vx + Math.sign(diff) * HOMING_NUDGE * 0.1;
  return restartProjectile(proj, currentPos.x, currentPos.y, nudgedVx, -screenVy);
}
```

**IMPORTANT:** This uses `restartProjectile` to re-anchor the position. Modifying `proj.vx` directly would cause a position jump because position is computed parametrically as `startX + vx * t`. The restart resets `t=0` at the current position with the nudged velocity.

- [ ] **Step 5: Add applyDrunkWobble**

```typescript
export function applyDrunkWobble(
  pos: { x: number; y: number },
  proj: Projectile
): { x: number; y: number } {
  if (proj.drunkPerpX === undefined || proj.drunkPerpY === undefined) return pos;
  const wobble = Math.sin(proj.t * 8) * DRUNK_WOBBLE_AMP;
  return {
    x: pos.x + proj.drunkPerpX * wobble,
    y: pos.y + proj.drunkPerpY * wobble,
  };
}
```

- [ ] **Step 6: Add handleBoomerangReturn**

```typescript
export function handleBoomerangReturn(
  proj: Projectile,
  missX: number,
  missY: number,
  throwerX: number,
  throwerY: number
): Projectile | null {
  if (proj.boomerangReturned) return null;

  // Calculate angle from miss position back to thrower
  const dx = throwerX - missX;
  const dy = throwerY - missY;
  const angle = Math.atan2(-dy, dx); // negative dy because screen Y is inverted
  const speed = Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy) * 0.7;

  const newVx = Math.cos(angle) * speed;
  const newVy = Math.sin(angle) * speed;

  const restarted = restartProjectile(proj, missX, missY, newVx, newVy);
  restarted.boomerangReturned = true;
  return restarted;
}
```

- [ ] **Step 7: Build and verify**

Run: `npx tsc --noEmit 2>&1 | grep -v node_modules`
Expected: No errors

- [ ] **Step 8: Commit**

```
git add src/powerup-behaviors.ts
git commit -m "feat(powerups): rubber bounce, homing nudge, drunk wobble, boomerang return handlers"
```

---

### Task 8: City — Earthquake Reshuffle

**Files:**
- Modify: `src/city.ts`

- [ ] **Step 1: Add reshuffleBuildings function**

In `src/city.ts`, add this exported function at the bottom:

```typescript
export function reshuffleBuildings(buildings: Building[], cityTheme: CityTheme, timeOfDay: TimeOfDay): void {
  const maxBuildingTop = 40 + GORILLA_HEIGHT;

  for (const b of buildings) {
    // Randomize height while preserving x and width
    let newHeight = Math.floor(Math.random() * 120) + 40;
    if (BOTTOM_LINE - newHeight < maxBuildingTop) newHeight = BOTTOM_LINE - maxBuildingTop;
    if (newHeight < 20) newHeight = 20;

    b.height = newHeight;
    b.y = BOTTOM_LINE - newHeight;
    b.damage = []; // clear damage on reshuffled buildings

    // Regenerate windows
    const colors = CITY_THEME_COLORS[cityTheme];
    b.color = colors[Math.floor(Math.random() * colors.length)];
    const litChance = timeOfDay === "night" ? 0.7 : 0.6;
    b.windows = generateWindows(b.x, b.y, b.width, b.height, litChance);
  }
}
```

Note: `generateWindows` is currently a private function. You'll need to either export it or make `reshuffleBuildings` call it. Since it's in the same file, it can call it directly.

- [ ] **Step 2: Verify imports**

`TimeOfDay` is already imported in `src/city.ts` line 1. No changes needed. Also verify `CITY_THEME_COLORS`, `BOTTOM_LINE`, and `GORILLA_HEIGHT` are imported (they already are).

- [ ] **Step 3: Build and verify**

Run: `npx tsc --noEmit 2>&1 | grep -v node_modules`
Expected: No errors

- [ ] **Step 4: Commit**

```
git add src/city.ts
git commit -m "feat(powerups): earthquake reshuffle buildings function"
```

---

### Task 9: Shield Banana — Instant Deploy

**Files:**
- Modify: `src/sketch.ts`

- [ ] **Step 1: Handle shield in launchBanana()**

In `src/sketch.ts`, in `launchBanana()`, after the line that consumes the power-up (line ~451 `const activePowerUp = ...`), add a shield short-circuit BEFORE creating the projectile. Restructure:

```typescript
    // Apply active power-up (skip consume on extra throw — power-up already consumed)
    const activePowerUp = state.isExtraThrow ? null : consumeSelectedPowerUp(state, (state.currentPlayer - 1) as 0 | 1);

    // Shield: instant deploy, no projectile
    if (activePowerUp === "shield") {
      state.shield[(state.currentPlayer - 1) as 0 | 1] = true;
      playSound("shield_deploy");
      gorilla.armState = "down";
      resolveThrowEnd();
      return;
    }
```

This must go AFTER `consumeSelectedPowerUp` but BEFORE `createProjectile`.

Actually, looking at the current code structure, `createProjectile` is called on line 448 BEFORE the power-up is consumed. So we need to move the consume BEFORE the projectile creation, or handle shield before the projectile line. The cleanest approach:

Move `consumeSelectedPowerUp` call to before `createProjectile`. Restructure `launchBanana()`:

```typescript
  function launchBanana() {
    lastAngles[state.currentPlayer - 1] = state.angle;
    const gorilla = state.gorillas[state.currentPlayer - 1];
    const playerIdx = (state.currentPlayer - 1) as 0 | 1;

    // Consume power-up first (skip on extra throw)
    const activePowerUp = state.isExtraThrow ? null : consumeSelectedPowerUp(state, playerIdx);

    // Shield: instant deploy, no projectile
    if (activePowerUp === "shield") {
      state.shield[playerIdx] = true;
      playSound("shield_deploy");
      gorilla.armState = "down";
      resolveThrowEnd();
      return;
    }

    const angleRad = (state.angle * Math.PI) / 180;
    const launchOffset = GORILLA_HEIGHT / 2 + 5;
    const startX = gorilla.x + GORILLA_WIDTH / 2 + Math.cos(angleRad) * launchOffset;
    const startY = gorilla.y - Math.sin(angleRad) * launchOffset;

    // Giant: reduce power
    let effectivePower = state.power;
    if (activePowerUp === "giant") {
      effectivePower *= GIANT_POWER_MULT;
    }

    state.projectile = createProjectile(startX, startY, state.angle, effectivePower);

    // Mirror: negate horizontal velocity
    if (state.mirrorTurns[playerIdx] > 0) {
      state.projectile.vx = -state.projectile.vx;
    }

    // Gravity flip: negate gravity for this throw (store on projectile? No — handle in updateFlight)

    // For portal extra throw, tag projectile as portal
    if (state.isExtraThrow && state.portals[0] !== null && state.portals[1] === null) {
      state.projectile.powerUpType = "portal";
    } else {
      applyPowerUpToProjectile(state.projectile, activePowerUp, p.millis());
    }

    if (activePowerUp === "two_bananas") {
      state.extraThrowRemaining = true;
    }
    if (activePowerUp === "portal") {
      state.extraThrowRemaining = true;
    }

    state.phase = "flight";
    bananaRotation = 0;
    playSound("throw");
    gorilla.armState = "down";
  }
```

Also import `GIANT_POWER_MULT` in the config import at the top of sketch.ts.

- [ ] **Step 2: Handle shield absorption in gorilla hit**

In `src/sketch.ts`, in `updateFlight()`, in the `"gorilla"` case (around line 680), add a shield check at the very top of the gorilla case, BEFORE any power-up-specific handling:

```typescript
      case "gorilla": {
        // Shield absorption
        const victimIdx = (result.gorilla.playerNum - 1) as 0 | 1;
        if (state.shield[victimIdx]) {
          state.shield[victimIdx] = false;
          state.projectile = null;
          playSound("shield_break");
          resolveThrowEnd();
          break;
        }
        // ... rest of existing gorilla hit handling
```

Also add the same shield check in `updateSubProjectiles()` for the gorilla case, so cluster bomb sub-projectiles respect shields.

- [ ] **Step 3: Build and verify**

Run: `npx tsc --noEmit 2>&1 | grep -v node_modules`
Expected: No errors

- [ ] **Step 4: Commit**

```
git add src/sketch.ts
git commit -m "feat(powerups): shield banana instant deploy and hit absorption"
```

---

### Task 10: Ice, Mirror, Gravity, Poison Debuff Hit Handlers

**Files:**
- Modify: `src/sketch.ts`

- [ ] **Step 1: Add debuff hit handlers in gorilla case**

In `src/sketch.ts`, in `updateFlight()`, in the `"gorilla"` case, after the shield check and before the existing confetti/poison handlers, add debuff hit handlers. **Note:** All debuff bananas set `lastHitPlayer = null` (no score), same as poison — they apply a debuff effect, not damage:

```typescript
        if (state.projectile?.powerUpType === "ice") {
          const vidx = (result.gorilla.playerNum - 1) as 0 | 1;
          state.iceTurns[vidx] = ICE_TURNS;
          state.projectile = null;
          playSound("ice_hit");
          explosionX = pos.x;
          explosionY = pos.y;
          state.explosionTimer = p.millis();
          state.lastHitPlayer = null; // no scoring
          state.phase = "explosion";
          break;
        }
        if (state.projectile?.powerUpType === "mirror") {
          const vidx = (result.gorilla.playerNum - 1) as 0 | 1;
          state.mirrorTurns[vidx] = MIRROR_TURNS;
          state.projectile = null;
          playSound("mirror_hit");
          explosionX = pos.x;
          explosionY = pos.y;
          state.explosionTimer = p.millis();
          state.lastHitPlayer = null;
          state.phase = "explosion";
          break;
        }
        if (state.projectile?.powerUpType === "gravity_flip") {
          const vidx = (result.gorilla.playerNum - 1) as 0 | 1;
          state.gravityTurns[vidx] = GRAVITY_TURNS;
          state.projectile = null;
          playSound("gravity_hit");
          explosionX = pos.x;
          explosionY = pos.y;
          state.explosionTimer = p.millis();
          state.lastHitPlayer = null;
          state.phase = "explosion";
          break;
        }
```

Import `ICE_TURNS`, `MIRROR_TURNS`, `GRAVITY_TURNS` from config at the top of sketch.ts.

- [ ] **Step 2: Ice — freeze spinner in updateAim()**

In `src/sketch.ts`, in `updateAim()`, wrap the spinner input handling (line ~389-392) with an ice check:

```typescript
    // Spinner rotates angle (unless frozen by ice)
    if (state.iceTurns[state.currentPlayer - 1] <= 0 && input.spinnerDelta !== 0) {
      state.angle = (state.angle + input.spinnerDelta + 360) % 360;
      playSound("aim_tick");
    }
```

- [ ] **Step 3: Gravity flip in updateFlight()**

In `src/sketch.ts`, in `updateFlight()`, when computing position and collision, use flipped gravity if the current player has gravityTurns > 0. Add near the top of `updateFlight()`, after `advanceProjectile`:

```typescript
    // Gravity flip: use negative gravity for position calculation
    const playerIdx = (state.currentPlayer - 1) as 0 | 1;
    const effectiveGravity = state.gravityTurns[playerIdx] > 0 ? -state.gravity : state.gravity;
```

Replace `state.gravity` with `effectiveGravity` in ALL of these `getProjectilePositionWithGravity()` calls within `updateFlight()`:
- Line ~538: main position call
- Line ~542: portal entry check gravity parameter
- Line ~555: portal miss position
- Line ~576: portal building hit position
- Line ~593: normal miss position
- Line ~600: ricochet gravity parameter
- Line ~610: wrap-around gravity parameter

**Leave line ~527 (cluster split) using `state.gravity`** — sub-projectiles are independent and don't inherit gravity flip.

**IMPORTANT:** Also use `effectiveGravity` in `drawBanana()` when calling `getProjectilePositionWithGravity()`. Compute it there too:
```typescript
    const playerGravIdx = (state.currentPlayer - 1) as 0 | 1;
    const drawGravity = state.gravityTurns[playerGravIdx] > 0 ? -state.gravity : state.gravity;
```

- [ ] **Step 4: Build and verify**

Run: `npx tsc --noEmit 2>&1 | grep -v node_modules`
Expected: No errors

- [ ] **Step 5: Commit**

```
git add src/sketch.ts
git commit -m "feat(powerups): ice freeze, mirror aim inversion, gravity flip debuffs"
```

---

### Task 11: Ghost and Giant Flight Behavior

**Files:**
- Modify: `src/sketch.ts`

- [ ] **Step 1: Pass collision options in updateFlight()**

In `src/sketch.ts`, in `updateFlight()`, where `checkCollision` is called (line ~550), pass options based on power-up type:

```typescript
    const collisionOptions = {
      skipBuildings: state.projectile.powerUpType === "ghost",
      gorillaHitboxMult: state.projectile.powerUpType === "giant" ? GIANT_HITBOX_MULT : 1,
    };
    const result = checkCollision(pos.x, pos.y, state.projectile.t, state.buildings, state.gorillas, state.crate, collisionOptions);
```

Import `GIANT_HITBOX_MULT` from config.

- [ ] **Step 2: Ghost banana visual in drawBanana()**

In `src/sketch.ts`, in `drawBanana()`, add a ghost visual case in the power-up type drawing logic:

```typescript
    } else if (state.projectile.powerUpType === "ghost") {
      // Flickering ghost banana
      const flicker = Math.floor(p.millis() / 100) % 6 !== 0;
      if (flicker) {
        p.fill(255, 255, 255, 120);
        p.arc(0, 0, 8 * scale, 6 * scale, 0, Math.PI);
      }
```

- [ ] **Step 3: Giant banana — ensure 3x scale visual**

Giant banana already gets 3x explosion radius from `applyPowerUpToProjectile`, and `drawBanana` already scales by `explosionRadius / EXPLOSION_RADIUS`. So the 3x visual scaling is automatic. No extra draw code needed.

But add a sound on building hit for giant:
In the building collision case, after the normal explosion handling, add before `playSound("explosion")`:
```typescript
        if (state.projectile?.powerUpType === "giant") {
          playSound("giant_thud");
        }
```

Actually, `state.projectile` is set to null before this point. Use a local variable:
```typescript
      case "building": {
        const projType = state.projectile?.powerUpType;
        // ... existing confetti/teleportation checks ...
        // ... default building hit ...
        if (projType === "giant") playSound("giant_thud");
        playSound("explosion");
        break;
      }
```

- [ ] **Step 4: Build and verify**

Run: `npx tsc --noEmit 2>&1 | grep -v node_modules`
Expected: No errors

- [ ] **Step 5: Commit**

```
git add src/sketch.ts
git commit -m "feat(powerups): ghost pass-through and giant hitbox/visual in flight"
```

---

### Task 12: Homing Banana Flight

**Files:**
- Modify: `src/sketch.ts`

- [ ] **Step 1: Add homing nudge in updateFlight()**

In `src/sketch.ts`, in `updateFlight()`, after `advanceProjectile` and the effectiveGravity computation, add:

```typescript
    // Homing: nudge toward opponent after apex (uses restartProjectile internally)
    if (state.projectile.powerUpType === "homing") {
      const opponentIdx = state.currentPlayer === 1 ? 1 : 0;
      const targetX = state.gorillas[opponentIdx].x + GORILLA_WIDTH / 2;
      const homingResult = applyHomingNudge(state.projectile, pos, targetX, state.wind, effectiveGravity);
      if (homingResult) {
        state.projectile = homingResult;
      }
    }
```

Import `applyHomingNudge` from `./powerup-behaviors` in the import statement. Note: this must come AFTER the `pos` computation but BEFORE collision check.

- [ ] **Step 2: Homing visual — red/orange with trail**

In `src/sketch.ts`, in `drawBanana()`, add a case:

```typescript
    } else if (state.projectile.powerUpType === "homing") {
      p.fill(255, 80, 50);
      p.arc(0, 0, 8 * scale, 6 * scale, 0, Math.PI);
```

Also draw a faint trail. Before the `p.push()` in drawBanana, store previous positions. Simpler approach — draw 3 fading circles behind the banana:

After drawing the homing banana arc, before `p.pop()`:
```typescript
      // Trail dots (approximate previous positions)
      p.fill(255, 80, 50, 60);
      for (let ti = 1; ti <= 3; ti++) {
        const trailProj = { ...state.projectile, t: Math.max(0, state.projectile.t - ti * 0.3) };
        const trailPos = getProjectilePositionWithGravity(trailProj, state.wind, effectiveGravity);
        p.circle(trailPos.x - pos.x, trailPos.y - pos.y, 3);
      }
```

Wait — this won't work because we're inside a translated/rotated context. Better to draw the trail BEFORE the push/translate:

```typescript
    // Homing trail (drawn before main banana transform)
    if (state.projectile.powerUpType === "homing") {
      p.noStroke();
      for (let ti = 1; ti <= 3; ti++) {
        const trailT = Math.max(0, state.projectile.t - ti * 0.3);
        const tp = getProjectilePositionWithGravity(
          { ...state.projectile, t: trailT },
          state.wind, effectiveGravity
        );
        p.fill(255, 80, 50, 80 - ti * 20);
        p.circle(tp.x, tp.y, 3);
      }
    }
```

Add this before the existing `p.push()` call in `drawBanana()`.

Note: `effectiveGravity` needs to be available in `drawBanana()`. Either pass it as a parameter, compute it there, or store it as a module-level variable set during `updateFlight()`. Simplest: compute it in `drawBanana()`:
```typescript
    const playerGravIdx = (state.currentPlayer - 1) as 0 | 1;
    const drawGravity = state.gravityTurns[playerGravIdx] > 0 ? -state.gravity : state.gravity;
```

Use `drawGravity` for all `getProjectilePositionWithGravity` calls in `drawBanana()`.

- [ ] **Step 3: Build and verify**

Run: `npx tsc --noEmit 2>&1 | grep -v node_modules`
Expected: No errors

- [ ] **Step 4: Commit**

```
git add src/sketch.ts
git commit -m "feat(powerups): homing banana with opponent tracking and trail visual"
```

---

### Task 13: Rubber Banana Flight and Building Bounce

**Files:**
- Modify: `src/sketch.ts`

- [ ] **Step 1: Handle rubber bounce on edge miss**

In `src/sketch.ts`, in `updateFlight()`, in the `"miss"` case, after the existing wrap-around check and before "Normal miss", add rubber bounce handling:

```typescript
          // Try rubber bounce (screen edges)
          if (state.projectile!.rubberBouncesRemaining) {
            let surface: "edge_left" | "edge_right" | "edge_top" = "edge_left";
            if (pos2.x > WIDTH) surface = "edge_right";
            if (pos2.y < 0) surface = "edge_top";
            const bounced = handleRubberBounce(state.projectile!, pos2.x, pos2.y, surface, effectiveGravity);
            if (bounced) {
              state.projectile = bounced;
              playSound("rubber_bounce");
              return;
            }
          }
```

Import `handleRubberBounce` from `./powerup-behaviors`.

- [ ] **Step 2: Handle rubber bounce on building hit**

In `src/sketch.ts`, in `updateFlight()`, in the `"building"` case, add rubber bounce handling BEFORE confetti/teleportation checks. This should be the first check in the building case:

```typescript
      case "building": {
        const projType = state.projectile?.powerUpType;

        // Rubber: bounce off buildings
        if (state.projectile?.rubberBouncesRemaining) {
          // Determine if we hit the top or side of the building
          const bldg = result.building;
          const hitTop = pos.x >= bldg.x && pos.x <= bldg.x + bldg.width &&
                         Math.abs(pos.y - bldg.y) < 5;
          const surface = hitTop ? "top" : "side";
          const bounced = handleRubberBounce(state.projectile, pos.x, pos.y, surface as "top" | "side", effectiveGravity);
          if (bounced) {
            state.projectile = bounced;
            playSound("rubber_bounce");
            return;
          }
        }

        // existing confetti, teleportation, etc. checks...
```

- [ ] **Step 3: Rubber banana visual**

In `src/sketch.ts`, in `drawBanana()`, add:

```typescript
    } else if (state.projectile.powerUpType === "rubber") {
      p.fill(0, 220, 255);
      p.arc(0, 0, 8 * scale, 6 * scale, 0, Math.PI);
```

- [ ] **Step 4: Build and verify**

Run: `npx tsc --noEmit 2>&1 | grep -v node_modules`
Expected: No errors

- [ ] **Step 5: Commit**

```
git add src/sketch.ts
git commit -m "feat(powerups): rubber banana with chaotic building and edge bouncing"
```

---

### Task 14: Drunk Banana Flight

**Files:**
- Modify: `src/sketch.ts`

- [ ] **Step 1: Apply drunk wobble to position**

In `src/sketch.ts`, in `updateFlight()`, after computing `pos` from `getProjectilePositionWithGravity`, apply wobble BEFORE the collision check:

```typescript
    let pos = getProjectilePositionWithGravity(state.projectile, state.wind, effectiveGravity);

    // Drunk wobble — affects both visual and collision position
    if (state.projectile.powerUpType === "drunk") {
      pos = applyDrunkWobble(pos, state.projectile);
    }
```

Import `applyDrunkWobble` from `./powerup-behaviors`.

Note: `pos` is currently declared with `const`. Change it to `let` for the wobble assignment.

- [ ] **Step 2: Apply wobble in drawBanana() too**

In `src/sketch.ts`, in `drawBanana()`, after getting `pos`:
```typescript
    let pos = getProjectilePositionWithGravity(state.projectile, state.wind, drawGravity);
    if (state.projectile.powerUpType === "drunk") {
      pos = applyDrunkWobble(pos, state.projectile);
    }
```

Same `const` to `let` change needed here.

- [ ] **Step 3: Drunk visual — normal yellow, wobble IS the visual**

No special color needed — the wobbling position is the visual effect. The default yellow banana draw handles it.

- [ ] **Step 4: Build and verify**

Run: `npx tsc --noEmit 2>&1 | grep -v node_modules`
Expected: No errors

- [ ] **Step 5: Commit**

```
git add src/sketch.ts
git commit -m "feat(powerups): drunk banana with sine-wave wobble flight path"
```

---

### Task 15: Boomerang Banana Flight

**Files:**
- Modify: `src/sketch.ts`

- [ ] **Step 1: Handle boomerang return on edge miss**

In `src/sketch.ts`, in `updateFlight()`, in the `"miss"` case, after the rubber bounce check and before "Normal miss", add boomerang handling:

```typescript
          // Try boomerang return (left/right edge only, not ground or top)
          const isSideEdgeMiss = pos2.x < 0 || pos2.x > WIDTH;
          if (state.projectile!.powerUpType === "boomerang" && !state.projectile!.boomerangReturned && isSideEdgeMiss && !isGroundMiss) {
            const thrower = state.gorillas[state.currentPlayer - 1];
            const throwerCX = thrower.x + GORILLA_WIDTH / 2;
            const throwerCY = thrower.y + GORILLA_HEIGHT / 2;
            const returned = handleBoomerangReturn(state.projectile!, pos2.x, pos2.y, throwerCX, throwerCY);
            if (returned) {
              state.projectile = returned;
              playSound("boomerang_return");
              bananaRotation = 0;
              return;
            }
          }
```

Import `handleBoomerangReturn` from `./powerup-behaviors`.

- [ ] **Step 2: Boomerang visual — faster rotation on return**

In `src/sketch.ts`, in `updateFlight()`, where `bananaRotation` is incremented (line ~523), add:

```typescript
    const rotSpeed = (state.projectile.powerUpType === "boomerang" && state.projectile.boomerangReturned) ? 0.6 : 0.3;
    bananaRotation = (bananaRotation + rotSpeed) % (Math.PI * 2);
```

Replace the existing `bananaRotation = (bananaRotation + 0.3) % (Math.PI * 2);` line.

- [ ] **Step 3: Boomerang banana color**

In `src/sketch.ts`, in `drawBanana()`:
```typescript
    } else if (state.projectile.powerUpType === "boomerang") {
      p.fill(255, 200, 100);
      p.arc(0, 0, 8 * scale, 6 * scale, 0, Math.PI);
```

- [ ] **Step 4: Build and verify**

Run: `npx tsc --noEmit 2>&1 | grep -v node_modules`
Expected: No errors

- [ ] **Step 5: Commit**

```
git add src/sketch.ts
git commit -m "feat(powerups): boomerang banana with return-to-sender on edge miss"
```

---

### Task 16: Earthquake Banana

**Files:**
- Modify: `src/sketch.ts`
- Modify: `src/city.ts` (already done in Task 8)

- [ ] **Step 1: Handle earthquake on any collision**

In `src/sketch.ts`, in `updateFlight()`, add earthquake handling. It needs to be checked in the building case, gorilla case, AND miss case (ground hit). Add at the start of the building case, gorilla case, and a ground-miss sub-case.

For building case, after rubber bounce check:
```typescript
        // Earthquake: reshuffle buildings, no damage
        if (projType === "earthquake") {
          state.projectile = null;
          triggerEarthquake();
          break;
        }
```

For gorilla case, after shield check:
```typescript
        if (state.projectile?.powerUpType === "earthquake") {
          state.projectile = null;
          triggerEarthquake();
          break;
        }
```

For miss case (any miss type — ground, edge, or timeout):
```typescript
        // Earthquake triggers on any miss (ground, edge, timeout)
        if (state.projectile!.powerUpType === "earthquake") {
          state.projectile = null;
          triggerEarthquake();
          return;
        }
```

Add this at the very top of the miss case, before the `isEdgeMiss`/`isGroundMiss` checks.

- [ ] **Step 2: Add triggerEarthquake helper**

Add near other helper functions in sketch.ts:

```typescript
  function triggerEarthquake() {
    reshuffleBuildings(state.buildings, state.cityTheme, state.timeOfDay);
    // Reposition gorillas on their (now reshuffled) buildings
    for (let i = 0; i < 2; i++) {
      const bIdx = findBuildingUnderGorilla(state.gorillas[i], state.buildings);
      if (bIdx >= 0) {
        state.gorillas[i].y = state.buildings[bIdx].y - GORILLA_HEIGHT;
      }
    }
    // Clear portals and crate (positions invalid after reshuffle)
    state.portals = [null, null];
    state.crate = null;
    state.activeSubProjectiles = [];
    state.earthquakeTimer = p.millis();
    playSound("earthquake_rumble");
    // resolveThrowEnd called after shake completes (in flight phase update)
  }
```

Import `reshuffleBuildings` from `./city` and `EARTHQUAKE_SHAKE_MS` from `./config`.

- [ ] **Step 3: Screen shake during earthquake**

In `src/sketch.ts`, in the flight case of the main draw switch, add earthquake shake handling. When `state.earthquakeTimer > 0` and elapsed < EARTHQUAKE_SHAKE_MS, offset all drawing:

In `updateFlight()`, after the `if (!state.projectile) return;` guard at line 520, add earthquake shake update:
```typescript
    // Earthquake shake timer — wait for shake to finish before resolving
    if (state.earthquakeTimer > 0) {
      if (p.millis() - state.earthquakeTimer >= EARTHQUAKE_SHAKE_MS) {
        state.earthquakeTimer = 0;
        resolveThrowEnd();
      }
      return; // don't process flight during shake
    }
```

In the flight phase DRAW code (around line 215-228), add visual shake offset:
```typescript
      case "flight":
        // Earthquake screen shake visual
        if (state.earthquakeTimer > 0) {
          const shakeElapsed = p.millis() - state.earthquakeTimer;
          if (shakeElapsed < EARTHQUAKE_SHAKE_MS) {
            const intensity = 3 * (1 - shakeElapsed / EARTHQUAKE_SHAKE_MS);
            p.translate((Math.random() - 0.5) * intensity * 2, (Math.random() - 0.5) * intensity * 2);
          }
        }
        // ... rest of flight handling
```

- [ ] **Step 4: Earthquake banana visual**

In `src/sketch.ts`, in `drawBanana()`:
```typescript
    } else if (state.projectile.powerUpType === "earthquake") {
      p.fill(139, 90, 43);
      p.arc(0, 0, 8 * scale, 6 * scale, 0, Math.PI);
```

- [ ] **Step 5: Build and verify**

Run: `npx tsc --noEmit 2>&1 | grep -v node_modules`
Expected: No errors

- [ ] **Step 6: Commit**

```
git add src/sketch.ts src/city.ts
git commit -m "feat(powerups): earthquake banana with building reshuffle and screen shake"
```

---

### Task 17: Banana Flight Visuals — Consolidate to Switch Statement

**Files:**
- Modify: `src/sketch.ts`

- [ ] **Step 1: Refactor drawBanana to use a switch on powerUpType**

After all prior tasks have added their `else if` branches, the drawing code is messy. Refactor the entire power-up visual section inside `drawBanana()` to use a `switch` statement. Replace the if/else chain with:

```typescript
    switch (state.projectile.powerUpType) {
      case "portal": {
        const isSecond = state.portals[0] !== null;
        if (isSecond) {
          p.fill(0, 140, 255);
        } else {
          p.fill(255, 140, 0);
        }
        p.arc(0, 0, 8 * scale, 6 * scale, 0, Math.PI);
        p.stroke(255, 255, 255, 150);
        p.strokeWeight(1);
        p.noFill();
        p.arc(0, 0, 10 * scale, 8 * scale, 0.3, Math.PI - 0.3);
        break;
      }
      case "ghost": {
        const flicker = Math.floor(p.millis() / 100) % 6 !== 0;
        if (flicker) {
          p.fill(255, 255, 255, 120);
          p.arc(0, 0, 8 * scale, 6 * scale, 0, Math.PI);
        }
        break;
      }
      case "homing":
        p.fill(255, 80, 50);
        p.arc(0, 0, 8 * scale, 6 * scale, 0, Math.PI);
        break;
      case "rubber":
        p.fill(0, 220, 255);
        p.arc(0, 0, 8 * scale, 6 * scale, 0, Math.PI);
        break;
      case "boomerang":
        p.fill(255, 200, 100);
        p.arc(0, 0, 8 * scale, 6 * scale, 0, Math.PI);
        break;
      case "earthquake":
        p.fill(139, 90, 43);
        p.arc(0, 0, 8 * scale, 6 * scale, 0, Math.PI);
        break;
      case "ice":
        p.fill(100, 200, 255);
        p.arc(0, 0, 8 * scale, 6 * scale, 0, Math.PI);
        break;
      case "mirror":
        p.fill(180, 0, 255);
        p.arc(0, 0, 8 * scale, 6 * scale, 0, Math.PI);
        break;
      case "gravity_flip":
        p.fill(255, 180, 0);
        p.arc(0, 0, 8 * scale, 6 * scale, 0, Math.PI);
        p.noFill();
        p.stroke(255, 255, 255, 100);
        p.strokeWeight(1);
        p.arc(0, 0, 6 * scale, 4 * scale, 0, Math.PI * 1.5);
        p.noStroke();
        break;
      default:
        // Normal yellow banana (also covers big_banana, two_bananas, cluster_bomb, confetti, poison, etc.)
        p.fill(255, 255, 0);
        p.arc(0, 0, 8 * scale, 6 * scale, 0, Math.PI);
        break;
    }
```

When implementing earlier tasks (11-16) that add banana visuals, use `else if` branches. This task consolidates them all into a clean switch.

- [ ] **Step 2: Build and verify**

Run: `npx tsc --noEmit 2>&1 | grep -v node_modules`
Expected: No errors

- [ ] **Step 3: Commit**

```
git add src/sketch.ts
git commit -m "feat(powerups): colored banana visuals for ice, mirror, and gravity types"
```

---

### Task 18: Final Polish and State Reset

**Files:**
- Modify: `src/sketch.ts`

- [ ] **Step 1: Ensure all new power-up imports**

Verify sketch.ts imports all needed symbols:
- From `./config`: `ICE_TURNS`, `MIRROR_TURNS`, `GRAVITY_TURNS`, `GIANT_POWER_MULT`, `GIANT_HITBOX_MULT`, `EARTHQUAKE_SHAKE_MS`
- From `./powerup-behaviors`: `handleRubberBounce`, `applyHomingNudge`, `applyDrunkWobble`, `handleBoomerangReturn`
- From `./city`: `reshuffleBuildings`

- [ ] **Step 2: Verify triggerBananality resets**

Confirm `triggerBananality()` resets all new state (should have been done in Task 1 Step 9):
```typescript
    state.iceTurns = [0, 0];
    state.mirrorTurns = [0, 0];
    state.gravityTurns = [0, 0];
    state.shield = [false, false];
    state.earthquakeTimer = 0;
```

- [ ] **Step 3: Verify startNewRound resets**

Confirm `startNewRound()` clears shield and earthquakeTimer but NOT debuff turn counters (Task 1 Step 8).

- [ ] **Step 4: Update testing inventory**

The `ALL_POWERUP_TYPES` array already includes all 20 types (Task 1 Step 6), and `startNewRound()` already has the testing code that fills both players' inventories with `[...ALL_POWERUP_TYPES]`. So all 20 power-ups will be available for testing.

The `MAX_INVENTORY` constant needs to be at least 20 for testing (currently 9). Update to 20:
```typescript
export const MAX_INVENTORY = 20; // TODO: revert to 3 after testing
```

- [ ] **Step 5: Full build**

Run: `npx tsc --noEmit 2>&1 | grep -v node_modules`
Expected: No errors

- [ ] **Step 6: Commit**

```
git add src/sketch.ts src/config.ts
git commit -m "feat(powerups): final polish, state resets, and testing inventory for 20 power-ups"
```
