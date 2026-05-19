# Hazard Bananas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three environmental hazard banana types (Fire, Lava, Storm) that create persistent battlefield effects for the remainder of a round.

**Architecture:** Each hazard is independent state on GameState — `burningBuildings: Set<number>`, `lavaActive: boolean + lavaHeight: number`, `stormActive: boolean`. Fire/storm damage resolves at turn start via a new `hazard_damage` game phase. Lava death is checked every frame in `updateFallingGorillas`. Fizzle shows "?" text above the thrower.

**Tech Stack:** P5.js (instance mode), TypeScript, Vite, Bun

**Spec:** `docs/superpowers/specs/2026-05-18-hazard-bananas-design.md`

---

## File Structure

| File | Changes |
|------|---------|
| `src/types.ts` | Add `"fire"`, `"lava"`, `"storm"` to `PowerUpType` union. Add `"hazard_damage"` to `GamePhase`. Add `burningBuildings`, `lavaActive`, `lavaHeight`, `stormActive`, `fizzleTimer`, `fizzlePlayerIdx`, `hazardDamageStep`, `hazardDamageTimer`, `lightningTarget` to `GameState`. |
| `src/config.ts` | Add hazard constants. Add three types to `ALL_POWERUP_TYPES`. |
| `src/sound.ts` | Add 6 new sounds: `fire_ignite`, `fire_damage`, `lava_activate`, `lava_death`, `thunder`, `fizzle`. |
| `src/powerups.ts` | Add short names for fire/lava/storm in `powerUpShortName`. |
| `src/ui.ts` | Add `drawBurningBuilding`, `drawLava`, `drawStormClouds`, `drawLightning`, `drawFizzleBubble`. Add fire/lava/storm to `powerUpDisplayName`, `powerUpHint`, `drawPowerUpIcon`, aim indicator icon. |
| `src/sketch.ts` | Fire/lava/storm hit handling in `updateFlight`. New `hazard_damage` phase for turn-start resolution. Lava check in `updateFallingGorillas`. Hazard resets in `startNewRound`. Draw calls in `drawGameplay`. |

---

### Task 1: Types and Constants Foundation

**Files:**
- Modify: `src/types.ts`
- Modify: `src/config.ts`

- [ ] **Step 1: Add new PowerUpType values to the union**

In `src/types.ts`, add `"fire" | "lava" | "storm"` to the `PowerUpType` union (line 88-92):

```typescript
export type PowerUpType = "big_banana" | "two_bananas" | "ricochet" | "wrap_around"
  | "cluster_bomb" | "teleportation" | "portal" | "confetti" | "poison"
  | "ice" | "mirror" | "gravity_flip" | "shield" | "rubber" | "homing"
  | "ghost" | "giant" | "boomerang" | "drunk" | "earthquake"
  | "demolition" | "construction" | "jump"
  | "fire" | "lava" | "storm";
```

- [ ] **Step 2: Add `"hazard_damage"` to GamePhase**

In `src/types.ts`, add `"hazard_damage"` to the `GamePhase` union (line 71-82):

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
  | "jump"
  | "hazard_damage";
```

- [ ] **Step 3: Add new GameState fields**

In `src/types.ts`, add to the `GameState` interface (after `floatingText`):

```typescript
  burningBuildings: Set<number>;
  lavaActive: boolean;
  lavaHeight: number;
  stormActive: boolean;
  fizzleTimer: number;             // millis() when fizzle started, 0 = inactive
  fizzlePlayerIdx: 0 | 1;         // which gorilla shows "?"
  hazardDamageStep: number;        // 0 = fire, 1 = storm, 2 = done
  hazardDamageTimer: number;       // millis() when current step started
  lightningTarget: number;         // building index for current lightning strike, -1 = none
```

- [ ] **Step 4: Add config constants**

In `src/config.ts`, add after the `STARTING_ITEMS_OPTIONS` line:

```typescript
// Hazard bananas
export const FIRE_DAMAGE_PER_TURN = 1;
export const LAVA_RISE_MS = 500;
export const LAVA_HEIGHT_OFFSET = 60;
export const STORM_LIGHTNING_DELAY_MS = 500;
export const FIZZLE_BUBBLE_MS = 1000;
```

- [ ] **Step 5: Add fire/lava/storm to ALL_POWERUP_TYPES**

In `src/config.ts`, add the three types to the `ALL_POWERUP_TYPES` array:

```typescript
export const ALL_POWERUP_TYPES: PowerUpType[] = [
  "big_banana", "two_bananas", "ricochet", "wrap_around",
  "cluster_bomb", "teleportation", "portal", "confetti", "poison",
  "ice", "mirror", "gravity_flip", "shield", "rubber", "homing",
  "ghost", "giant", "boomerang", "drunk", "earthquake",
  "demolition", "construction",
  "fire", "lava", "storm",
];
```

- [ ] **Step 6: Build verify**

Run: `bun run build`
Expected: Build succeeds (there will be errors about missing GameState fields in sketch.ts — that's expected until Task 2).

Note: The build may fail because `createInitialState()` in sketch.ts doesn't yet have the new fields. If so, proceed to Task 2 which adds them.

- [ ] **Step 7: Commit**

```bash
git add src/types.ts src/config.ts
git commit -m "feat: add fire/lava/storm types and hazard constants"
```

---

### Task 2: GameState Initialization and Resets

**Files:**
- Modify: `src/sketch.ts`

- [ ] **Step 1: Add new fields to `createInitialState()`**

In `src/sketch.ts`, in the `createInitialState()` function (around line 40-91), add after `startingItems: 0`:

```typescript
    burningBuildings: new Set<number>(),
    lavaActive: false,
    lavaHeight: BOTTOM_LINE,
    stormActive: false,
    fizzleTimer: 0,
    fizzlePlayerIdx: 0,
    hazardDamageStep: 0,
    hazardDamageTimer: 0,
    lightningTarget: -1,
```

- [ ] **Step 2: Add imports for new constants**

In `src/sketch.ts`, add to the imports from `"./config"`:

```typescript
LAVA_HEIGHT_OFFSET, FIZZLE_BUBBLE_MS, STORM_LIGHTNING_DELAY_MS, FIRE_DAMAGE_PER_TURN,
```

- [ ] **Step 3: Reset hazard state in `startNewRound()`**

In `src/sketch.ts`, in `startNewRound()`, add after `state.floatingText = null;`:

```typescript
    state.burningBuildings = new Set<number>();
    state.lavaActive = false;
    state.lavaHeight = BOTTOM_LINE;
    state.stormActive = false;
    state.fizzleTimer = 0;
    state.hazardDamageStep = 0;
    state.hazardDamageTimer = 0;
    state.lightningTarget = -1;
```

- [ ] **Step 4: Reset hazard state in konami reset**

In `src/sketch.ts`, in the konami reset block (around line 1498), add after `state.portals = [null, null];`:

```typescript
    state.burningBuildings = new Set<number>();
    state.lavaActive = false;
    state.lavaHeight = BOTTOM_LINE;
    state.stormActive = false;
    state.fizzleTimer = 0;
    state.hazardDamageStep = 0;
    state.hazardDamageTimer = 0;
    state.lightningTarget = -1;
```

- [ ] **Step 5: Build verify**

Run: `bun run build`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/sketch.ts
git commit -m "feat: initialize and reset hazard state in GameState"
```

---

### Task 3: Sound Effects

**Files:**
- Modify: `src/sound.ts`

- [ ] **Step 1: Add new sound names to the SoundName type**

Add to the `SoundName` type union: `"fire_ignite" | "fire_damage" | "lava_activate" | "lava_death" | "thunder" | "fizzle"`.

- [ ] **Step 2: Add cases to the playSound switch**

Add these cases:

```typescript
case "fire_ignite": playFireIgnite(); break;
case "fire_damage": playFireDamage(); break;
case "lava_activate": playLavaActivate(); break;
case "lava_death": playLavaDeath(); break;
case "thunder": playThunder(); break;
case "fizzle": playFizzle(); break;
```

- [ ] **Step 3: Implement the 6 sound functions**

Add at the bottom of `src/sound.ts`:

```typescript
function playFireIgnite() {
  const c = getCtx();
  // Crackling noise burst
  const bufferSize = c.sampleRate * 0.4;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    // Crackling: random bursts with decay
    data[i] = (Math.random() > 0.7 ? (Math.random() * 2 - 1) : 0) * (1 - i / bufferSize) * 0.5;
  }
  const noise = c.createBufferSource();
  noise.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(1000, c.currentTime);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.2, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4);
  noise.connect(filter).connect(gain).connect(c.destination);
  noise.start();
  noise.stop(c.currentTime + 0.4);
}

function playFireDamage() {
  const c = getCtx();
  // Sizzle hit
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(400, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, c.currentTime + 0.25);
  gain.gain.setValueAtTime(0.15, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.3);
}

function playLavaActivate() {
  const c = getCtx();
  // Deep rumbling bubble
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(50, c.currentTime);
  osc.frequency.linearRampToValueAtTime(80, c.currentTime + 0.3);
  osc.frequency.linearRampToValueAtTime(40, c.currentTime + 0.6);
  gain.gain.setValueAtTime(0.2, c.currentTime);
  gain.gain.linearRampToValueAtTime(0.25, c.currentTime + 0.3);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.7);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.7);
  // Bubbling overlay
  [180, 220, 160, 200, 140].forEach((freq, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    const t = c.currentTime + 0.1 + i * 0.1;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + 0.08);
  });
}

function playLavaDeath() {
  const c = getCtx();
  // Dramatic sizzle/hiss
  const bufferSize = c.sampleRate * 0.5;
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
  filter.frequency.exponentialRampToValueAtTime(500, c.currentTime + 0.5);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.25, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5);
  noise.connect(filter).connect(gain).connect(c.destination);
  noise.start();
  noise.stop(c.currentTime + 0.5);
}

function playThunder() {
  const c = getCtx();
  // Sharp crack
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(100, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(30, c.currentTime + 0.4);
  gain.gain.setValueAtTime(0.3, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.5);
  // White noise burst for crack
  const bufferSize = c.sampleRate * 0.15;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const noise = c.createBufferSource();
  noise.buffer = buffer;
  const g2 = c.createGain();
  g2.gain.setValueAtTime(0.2, c.currentTime);
  g2.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
  noise.connect(g2).connect(c.destination);
  noise.start();
  noise.stop(c.currentTime + 0.15);
}

function playFizzle() {
  const c = getCtx();
  // Dull thud
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(120, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(50, c.currentTime + 0.15);
  gain.gain.setValueAtTime(0.15, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.2);
}
```

- [ ] **Step 4: Build verify**

Run: `bun run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/sound.ts
git commit -m "feat: add fire, lava, storm, and fizzle sound effects"
```

---

### Task 4: Power-Up UI Integration (Names, Icons, Hints)

**Files:**
- Modify: `src/powerups.ts`
- Modify: `src/ui.ts`

- [ ] **Step 1: Add short names in `powerUpShortName`**

In `src/powerups.ts`, add before the `default:` case:

```typescript
    case "fire": return "FIRE";
    case "lava": return "LAVA";
    case "storm": return "STORM";
```

- [ ] **Step 2: Add display names in `powerUpDisplayName`**

In `src/ui.ts`, add before the `default:` case in `powerUpDisplayName`:

```typescript
    case "fire": return "FIRE";
    case "lava": return "LAVA";
    case "storm": return "STORM";
```

- [ ] **Step 3: Add hints in `powerUpHint`**

In `src/ui.ts`, add before the `default:` case in `powerUpHint`:

```typescript
    case "fire": return "Sets buildings ablaze.";
    case "lava": return "Aim at the ground...";
    case "storm": return "Throw it skyward.";
```

- [ ] **Step 4: Add HUD icons in `drawPowerUpIcon`**

In `src/ui.ts`, add before the `default:` case in `drawPowerUpIcon`:

```typescript
    case "fire":
      p.fill(255, 80, 0);
      p.circle(x + size / 2, y + size / 2, size);
      p.fill(255, 200, 0);
      p.circle(x + size / 2, y + size / 3, size * 0.5);
      break;
    case "lava":
      p.fill(180, 30, 0);
      p.circle(x + size / 2, y + size / 2, size);
      p.fill(255, 100, 0);
      p.circle(x + size / 2, y + size / 2, size * 0.5);
      break;
    case "storm":
      p.fill(80, 80, 120);
      p.circle(x + size / 2, y + size / 2, size);
      p.fill(255, 255, 100);
      p.rect(x + size / 3, y + size / 4, size / 4, size / 2);
      break;
```

- [ ] **Step 5: Add aim indicator icons in `drawAngleIndicator`**

In `src/ui.ts`, in the `drawAngleIndicator` switch statement, add before `case null:`:

```typescript
    case "fire":
      p.fill(255, 80, 0);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      p.fill(255, 200, 0, 200);
      p.triangle(-2, 0, 2, 0, 0, -4);
      break;
    case "lava":
      p.fill(180, 30, 0);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      p.fill(255, 100, 0);
      p.arc(0, 1, 6, 3, Math.PI, Math.PI * 2);
      break;
    case "storm":
      p.fill(80, 80, 120);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      p.fill(255, 255, 100);
      p.strokeWeight(1);
      p.stroke(255, 255, 100);
      p.line(0, -3, -1, -1);
      p.line(-1, -1, 1, -2);
      p.line(1, -2, 0, 0);
      p.noStroke();
      break;
```

- [ ] **Step 6: Build verify**

Run: `bun run build`
Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/powerups.ts src/ui.ts
git commit -m "feat: add fire/lava/storm names, icons, and hints to HUD"
```

---

### Task 5: Visual Drawing Functions

**Files:**
- Modify: `src/ui.ts`

- [ ] **Step 1: Add BOTTOM_LINE and WIDTH to ui.ts imports if not already present**

Check and ensure `BOTTOM_LINE` and `WIDTH` are imported from config. They already are based on current imports.

- [ ] **Step 2: Add `drawBurningBuilding` function**

Add to `src/ui.ts` (exported):

```typescript
export function drawBurningBuildings(p: p5, buildings: import("./types").Building[], burningSet: Set<number>): void {
  for (const idx of burningSet) {
    const b = buildings[idx];
    if (!b || b.height <= 0) continue;

    // Reddish tint overlay on building
    p.fill(255, 50, 0, 40);
    p.noStroke();
    p.rect(b.x, b.y, b.width, b.height);

    // Animated flame particles along rooftop
    const flameCount = Math.max(2, Math.floor(b.width / 8));
    for (let i = 0; i < flameCount; i++) {
      const fx = b.x + (i + 0.5) * (b.width / flameCount);
      const flicker = Math.sin(p.millis() / 100 + i * 2.5) * 3;
      const height = 6 + Math.sin(p.millis() / 150 + i * 1.7) * 3;

      // Outer flame (orange-red)
      p.fill(255, 80 + Math.floor(Math.sin(p.millis() / 120 + i) * 40), 0, 200);
      p.noStroke();
      p.triangle(
        fx - 3, b.y,
        fx + 3, b.y,
        fx + flicker * 0.5, b.y - height
      );

      // Inner flame (yellow)
      p.fill(255, 220, 50, 180);
      p.triangle(
        fx - 1.5, b.y,
        fx + 1.5, b.y,
        fx + flicker * 0.3, b.y - height * 0.6
      );
    }
  }
}
```

- [ ] **Step 3: Add `drawLava` function**

Add to `src/ui.ts` (exported):

```typescript
export function drawLava(p: p5, lavaHeight: number): void {
  const lavaTop = lavaHeight;
  const lavaBottom = HEIGHT;

  // Main lava body
  p.fill(200, 40, 0);
  p.noStroke();
  p.rect(0, lavaTop, WIDTH, lavaBottom - lavaTop);

  // Bright orange surface layer
  p.fill(255, 120, 0);
  p.rect(0, lavaTop, WIDTH, 4);

  // Undulating surface line
  p.stroke(255, 200, 50);
  p.strokeWeight(1);
  p.noFill();
  p.beginShape();
  for (let x = 0; x <= WIDTH; x += 4) {
    const wave = Math.sin(x * 0.05 + p.millis() / 400) * 2;
    p.vertex(x, lavaTop + wave);
  }
  p.endShape();
  p.noStroke();

  // Occasional bubbles
  const bubblePhase = p.millis() / 300;
  for (let i = 0; i < 5; i++) {
    const bx = ((i * 73 + Math.floor(bubblePhase) * 37) % WIDTH);
    const bubbleT = (bubblePhase + i * 0.7) % 1;
    if (bubbleT < 0.3) {
      const by = lavaTop + 4 - bubbleT * 10;
      const bSize = 2 + bubbleT * 3;
      p.fill(255, 180, 50, 150 * (1 - bubbleT / 0.3));
      p.circle(bx, by, bSize);
    }
  }
}
```

- [ ] **Step 4: Add `drawStormClouds` function**

Add to `src/ui.ts` (exported):

```typescript
export function drawStormClouds(p: p5): void {
  // Dark cloud layer across the top
  p.noStroke();
  const drift = p.millis() * 0.005;

  for (let layer = 0; layer < 3; layer++) {
    const alpha = 120 + layer * 30;
    p.fill(30, 30, 50, alpha);
    for (let x = -20; x < WIDTH + 20; x += 25) {
      const offsetX = Math.sin(x * 0.02 + drift + layer) * 8;
      const y = 5 + layer * 10;
      const w = 30 + Math.sin(x * 0.05 + layer) * 10;
      const h = 12 + Math.sin(x * 0.03 + drift) * 3;
      p.ellipse(x + offsetX, y, w, h);
    }
  }
}
```

- [ ] **Step 5: Add `drawLightning` function**

Add to `src/ui.ts` (exported):

```typescript
export function drawLightning(p: p5, targetX: number, targetY: number, progress: number): void {
  if (progress >= 1) return;

  // White screen flash (fades quickly)
  if (progress < 0.2) {
    p.fill(255, 255, 255, Math.floor(80 * (1 - progress / 0.2)));
    p.noStroke();
    p.rect(0, 0, WIDTH, HEIGHT);
  }

  // Jagged lightning bolt from cloud to target
  const alpha = Math.floor(255 * (1 - progress));
  p.stroke(255, 255, 200, alpha);
  p.strokeWeight(2);

  const startY = 35; // bottom of cloud layer
  const segments = 5;
  let prevX = targetX + (Math.random() - 0.5) * 4;
  let prevY = startY;

  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const nextX = targetX + (Math.random() - 0.5) * 15 * (1 - t);
    const nextY = startY + (targetY - startY) * t;
    p.line(prevX, prevY, nextX, nextY);
    prevX = nextX;
    prevY = nextY;
  }

  // Bright core (thinner)
  p.stroke(255, 255, 255, alpha);
  p.strokeWeight(1);
  prevX = targetX;
  prevY = startY;
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const nextX = targetX + (Math.random() - 0.5) * 8 * (1 - t);
    const nextY = startY + (targetY - startY) * t;
    p.line(prevX, prevY, nextX, nextY);
    prevX = nextX;
    prevY = nextY;
  }

  p.noStroke();
}
```

- [ ] **Step 6: Add `drawFizzleBubble` function**

Add to `src/ui.ts` (exported):

```typescript
export function drawFizzleBubble(p: p5, gorilla: import("./types").Gorilla, progress: number): void {
  if (progress >= 1) return;
  const alpha = Math.floor(255 * (1 - progress));
  const cx = gorilla.x + GORILLA_WIDTH / 2;
  const cy = gorilla.y - 10 - progress * 5;

  p.fill(255, 255, 255, alpha);
  p.noStroke();
  p.textSize(8);
  p.textAlign(p.CENTER, p.CENTER);
  p.text("?", cx, cy);
}
```

- [ ] **Step 7: Build verify**

Run: `bun run build`
Expected: Build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/ui.ts
git commit -m "feat: add visual drawing functions for fire, lava, storm, lightning, fizzle"
```

---

### Task 6: Fire Banana Flight Handling

**Files:**
- Modify: `src/sketch.ts`

This task adds fire banana behavior to the `updateFlight` collision handling.

- [ ] **Step 1: Add fire handling in the `case "building"` block**

In `src/sketch.ts`, in `updateFlight()`, in the `case "building"` block (around line 1046), add after the `construction` handling and before the default explosion handling:

```typescript
        if (projType === "fire") {
          const hitBuildingIdx = state.buildings.indexOf(result.building);
          if (hitBuildingIdx >= 0) {
            state.burningBuildings.add(hitBuildingIdx);
            playSound("fire_ignite");
          }
          state.projectile = null;
          resolveThrowEnd();
          break;
        }
```

- [ ] **Step 2: Add fire handling in the `case "gorilla"` block**

In `src/sketch.ts`, in the `case "gorilla"` block (around line 1167), add after the shield check and before the earthquake check:

```typescript
        if (state.projectile?.powerUpType === "fire") {
          // No damage — set the building the victim is on ablaze
          const vidx = (result.gorilla.playerNum - 1) as 0 | 1;
          const bIdx = findBuildingUnderGorilla(state.gorillas[vidx], state.buildings);
          if (bIdx >= 0) {
            state.burningBuildings.add(bIdx);
            playSound("fire_ignite");
          } else {
            // No building found — fizzle
            state.fizzleTimer = p.millis();
            state.fizzlePlayerIdx = (state.currentPlayer - 1) as 0 | 1;
            playSound("fizzle");
          }
          state.projectile = null;
          resolveThrowEnd();
          break;
        }
```

- [ ] **Step 3: Add fire fizzle on miss (ground/off-screen)**

In `src/sketch.ts`, in the `case "miss"` block, add before the earthquake check (around line 955):

```typescript
        // Fire: fizzle on ground/off-screen miss
        if (state.projectile!.powerUpType === "fire") {
          state.fizzleTimer = p.millis();
          state.fizzlePlayerIdx = (state.currentPlayer - 1) as 0 | 1;
          playSound("fizzle");
          state.projectile = null;
          resolveThrowEnd();
          return;
        }
```

- [ ] **Step 4: Build verify**

Run: `bun run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/sketch.ts
git commit -m "feat: fire banana flight handling - building ignition, gorilla hit, fizzle"
```

---

### Task 7: Lava Banana Flight Handling

**Files:**
- Modify: `src/sketch.ts`

- [ ] **Step 1: Add lava handling in `case "miss"` block**

In `src/sketch.ts`, in the `case "miss"` block, add before the fire check (or after, order doesn't matter since each returns):

```typescript
        // Lava: activate on ground hit only
        if (state.projectile!.powerUpType === "lava") {
          const lPos = getProjectilePositionWithGravity(state.projectile!, state.wind, effectiveGravity);
          if (lPos.y >= BOTTOM_LINE && !state.lavaActive) {
            state.lavaActive = true;
            state.lavaHeight = BOTTOM_LINE - LAVA_HEIGHT_OFFSET;
            playSound("lava_activate");
          } else {
            // Off-screen miss or lava already active — fizzle
            state.fizzleTimer = p.millis();
            state.fizzlePlayerIdx = (state.currentPlayer - 1) as 0 | 1;
            playSound("fizzle");
          }
          state.projectile = null;
          resolveThrowEnd();
          return;
        }
```

- [ ] **Step 2: Add lava fizzle on building hit**

In `src/sketch.ts`, in the `case "building"` block, add near the fire handling:

```typescript
        if (projType === "lava") {
          state.fizzleTimer = p.millis();
          state.fizzlePlayerIdx = (state.currentPlayer - 1) as 0 | 1;
          playSound("fizzle");
          state.projectile = null;
          resolveThrowEnd();
          break;
        }
```

- [ ] **Step 3: Add lava fizzle on gorilla hit**

In `src/sketch.ts`, in the `case "gorilla"` block, add near the fire handling:

```typescript
        if (state.projectile?.powerUpType === "lava") {
          state.fizzleTimer = p.millis();
          state.fizzlePlayerIdx = (state.currentPlayer - 1) as 0 | 1;
          playSound("fizzle");
          state.projectile = null;
          resolveThrowEnd();
          break;
        }
```

- [ ] **Step 4: Build verify**

Run: `bun run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/sketch.ts
git commit -m "feat: lava banana flight handling - ground activation, fizzle on miss"
```

---

### Task 8: Storm Banana Flight Handling

**Files:**
- Modify: `src/sketch.ts`
- Modify: `src/collision.ts` (optional — may not be needed)

The storm banana needs to detect when it exits the top of the screen. Currently, `checkCollision` returns `{ type: "none" }` when `y < 0`. The banana eventually becomes a `miss` when it falls back down or goes off the side, or when `t >= MAX_FLIGHT_T`. We need to check for `y < 0` in `updateFlight` directly.

- [ ] **Step 1: Add storm top-exit detection in `updateFlight`**

In `src/sketch.ts`, in `updateFlight()`, add after the homing nudge block and before the portal check (around line 896):

```typescript
    // Storm: activate when banana exits top of screen
    if (state.projectile!.powerUpType === "storm" && pos.y < 0) {
      if (!state.stormActive) {
        state.stormActive = true;
        playSound("thunder");
      }
      // Storm activated (or already active) — banana consumed
      state.projectile = null;
      resolveThrowEnd();
      return;
    }
```

- [ ] **Step 2: Add storm fizzle on building hit**

In `src/sketch.ts`, in `case "building"`, add near fire/lava handling:

```typescript
        if (projType === "storm") {
          state.fizzleTimer = p.millis();
          state.fizzlePlayerIdx = (state.currentPlayer - 1) as 0 | 1;
          playSound("fizzle");
          state.projectile = null;
          resolveThrowEnd();
          break;
        }
```

- [ ] **Step 3: Add storm fizzle on gorilla hit**

In `src/sketch.ts`, in `case "gorilla"`, add near fire/lava handling:

```typescript
        if (state.projectile?.powerUpType === "storm") {
          state.fizzleTimer = p.millis();
          state.fizzlePlayerIdx = (state.currentPlayer - 1) as 0 | 1;
          playSound("fizzle");
          state.projectile = null;
          resolveThrowEnd();
          break;
        }
```

- [ ] **Step 4: Add storm fizzle on ground miss**

In `src/sketch.ts`, in `case "miss"`, add near fire/lava handling:

```typescript
        // Storm: fizzle on ground/side miss
        if (state.projectile!.powerUpType === "storm") {
          state.fizzleTimer = p.millis();
          state.fizzlePlayerIdx = (state.currentPlayer - 1) as 0 | 1;
          playSound("fizzle");
          state.projectile = null;
          resolveThrowEnd();
          return;
        }
```

- [ ] **Step 5: Build verify**

Run: `bun run build`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/sketch.ts
git commit -m "feat: storm banana flight handling - top-exit activation, fizzle on miss"
```

---

### Task 9: Turn-Start Hazard Damage Phase

**Files:**
- Modify: `src/sketch.ts`

This adds the `hazard_damage` game phase that resolves fire and storm damage at the start of each player's turn.

- [ ] **Step 1: Add transition to `hazard_damage` phase**

In `src/sketch.ts`, in `resolveThrowEnd()` (and `switchPlayer` flow), after switching to the next player and before entering `aim` phase, we need to check if any hazards are active. The cleanest place is after `switchPlayer()` is called. Find where `state.phase = "aim"` is set after a throw ends.

Look at `resolveThrowEnd()` — it either calls `switchPlayer()` then sets phase to `"aim"`, or handles extra throws. Modify the transition to `"aim"` to go through `"hazard_damage"` first if any hazard is active:

In `resolveThrowEnd()`, replace the line(s) that set `state.phase = "aim"` with a helper check. Find where the aim phase is entered after turn resolution. The pattern appears in `resolveThrowEnd` around the `switchPlayer()` + `state.phase = "aim"` sequence.

Add a helper function before `resolveThrowEnd`:

```typescript
  function enterAimPhase() {
    // Check if hazard damage needs to resolve first
    if (state.burningBuildings.size > 0 || state.stormActive) {
      const playerIdx = (state.currentPlayer - 1) as 0 | 1;
      const onFire = state.burningBuildings.size > 0 &&
        state.burningBuildings.has(findBuildingUnderGorilla(state.gorillas[playerIdx], state.buildings));
      if (onFire || state.stormActive) {
        state.hazardDamageStep = 0;
        state.hazardDamageTimer = p.millis();
        state.lightningTarget = -1;
        state.phase = "hazard_damage";
        return;
      }
    }
    state.angle = lastAngles[state.currentPlayer - 1];
    state.phase = "aim";
    trySpawnCrate(state, state.wind);
  }
```

Then replace **all three** places that transition to `aim` phase with `enterAimPhase()`:

1. In `resolveThrowEnd()`, the **extra-throw path** (around line 1962): replace `state.phase = "aim"` with `enterAimPhase()` (and remove the `state.angle = lastAngles[...]` line since `enterAimPhase` handles it).
2. In `resolveThrowEnd()`, the **normal path** after `switchPlayer()` (around line 1981): replace the `state.angle = ...`, `state.phase = "aim"`, and `trySpawnCrate(...)` lines with just `enterAimPhase()`.
3. In `updateRoundStart()`, replace the direct `state.phase = "aim"` with `enterAimPhase()`:

```typescript
  function updateRoundStart() {
    if (p.millis() - state.roundStartTimer > ROUND_START_DELAY_MS) {
      enterAimPhase();
    }
  }
```

- [ ] **Step 2: Add `updateHazardDamage` function**

```typescript
  function updateHazardDamage() {
    const elapsed = p.millis() - state.hazardDamageTimer;
    const playerIdx = (state.currentPlayer - 1) as 0 | 1;

    if (state.hazardDamageStep === 0) {
      // Fire check
      const bIdx = findBuildingUnderGorilla(state.gorillas[playerIdx], state.buildings);
      if (bIdx >= 0 && state.burningBuildings.has(bIdx)) {
        if (elapsed < 200) return; // brief pause before damage
        // Deal damage once, then advance step
        state.hp[playerIdx] -= FIRE_DAMAGE_PER_TURN;
        setFloatingText(
          state.gorillas[playerIdx].x + GORILLA_WIDTH / 2,
          state.gorillas[playerIdx].y - 5,
          "-1 FIRE", "red"
        );
        playSound("fire_damage");
        state.hazardDamageStep = 1;
        state.hazardDamageTimer = p.millis();
        // Check death
        if (state.hp[playerIdx] <= 0) {
          state.hp[playerIdx] = 0;
          state.lastHitPlayer = state.currentPlayer;
          state.phase = "victory";
          state.victoryTimer = p.millis();
        }
        return;
      } else {
        // No fire damage — skip to storm
        state.hazardDamageStep = 1;
        state.hazardDamageTimer = p.millis();
      }
    }

    if (state.hazardDamageStep === 1) {
      // Storm check
      if (state.stormActive) {
        if (state.lightningTarget === -1) {
          // Pick a random non-destroyed building
          const eligible = state.buildings
            .map((b, i) => ({ b, i }))
            .filter(({ b }) => b.height > 0);
          if (eligible.length > 0) {
            state.lightningTarget = eligible[Math.floor(Math.random() * eligible.length)].i;
          }
          state.hazardDamageTimer = p.millis();
          playSound("thunder");
        }

        const stormElapsed = p.millis() - state.hazardDamageTimer;
        if (stormElapsed < STORM_LIGHTNING_DELAY_MS) return; // wait for lightning visual

        // Check if gorilla is on the struck building
        const gBIdx = findBuildingUnderGorilla(state.gorillas[playerIdx], state.buildings);
        if (state.lightningTarget >= 0 && gBIdx === state.lightningTarget) {
          state.hp[playerIdx] -= 1;
          setFloatingText(
            state.gorillas[playerIdx].x + GORILLA_WIDTH / 2,
            state.gorillas[playerIdx].y - 5,
            "-1 ZAP", "red"
          );
          playSound("fire_damage"); // reuse sizzle sound
          if (state.hp[playerIdx] <= 0) {
            state.hp[playerIdx] = 0;
            state.lastHitPlayer = state.currentPlayer;
            state.phase = "victory";
            state.victoryTimer = p.millis();
            return;
          }
        }

        state.hazardDamageStep = 2;
        state.hazardDamageTimer = p.millis();
      } else {
        state.hazardDamageStep = 2;
      }
    }

    if (state.hazardDamageStep === 2) {
      // Done — transition to aim
      const delay = p.millis() - state.hazardDamageTimer;
      if (delay < 300) return; // brief pause after last damage
      state.lightningTarget = -1;
      state.angle = lastAngles[state.currentPlayer - 1];
      state.phase = "aim";
      trySpawnCrate(state, state.wind);
    }
  }
```

- [ ] **Step 3: Add `hazard_damage` case to the main phase switch**

In `src/sketch.ts`, in the `switch (state.phase)` block, add before `case "game_over"`:

```typescript
      case "hazard_damage":
        updateHazardDamage();
        drawGameplay(p);
        // Draw lightning during storm step
        if (state.stormActive && state.lightningTarget >= 0 && state.hazardDamageStep === 1) {
          const targetBuilding = state.buildings[state.lightningTarget];
          if (targetBuilding && targetBuilding.height > 0) {
            const progress = (p.millis() - state.hazardDamageTimer) / STORM_LIGHTNING_DELAY_MS;
            drawLightning(p, targetBuilding.x + targetBuilding.width / 2, targetBuilding.y, progress);
          }
        }
        break;
```

Add `drawLightning` to the imports from `"./ui"`.

- [ ] **Step 4: Build verify**

Run: `bun run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/sketch.ts
git commit -m "feat: hazard_damage phase for turn-start fire and storm resolution"
```

---

### Task 10: Continuous Lava Death Check

**Files:**
- Modify: `src/sketch.ts`

- [ ] **Step 1: Add lava check to `updateFallingGorillas`**

In `src/sketch.ts`, in `updateFallingGorillas()`, after a gorilla finishes falling (when `state.fallingGorillas[i]` is set to null), add a lava death check:

```typescript
  function updateFallingGorillas() {
    for (let i = 0; i < 2; i++) {
      const fall = state.fallingGorillas[i];
      if (!fall) continue;
      state.gorillas[i].y += FALLING_SPEED;
      if (state.gorillas[i].y >= fall.targetY) {
        state.gorillas[i].y = fall.targetY;
        state.fallingGorillas[i] = null;

        // Lava death check
        if (state.lavaActive && state.gorillas[i].y + GORILLA_HEIGHT >= state.lavaHeight) {
          state.hp[i as 0 | 1] = 0;
          state.lastHitPlayer = (i + 1) as 1 | 2;
          playSound("lava_death");
          state.phase = "victory";
          state.victoryTimer = p.millis();
          return;
        }
      }
    }
  }
```

- [ ] **Step 2: Add lava check after jump landing**

In `src/sketch.ts`, in `updateJump()`, after the gorilla lands (after `playSound("jump_land")`), add:

```typescript
      // Lava death check on landing
      if (state.lavaActive && gorilla.y + gorilla.height >= state.lavaHeight) {
        state.hp[anim.playerIdx] = 0;
        state.lastHitPlayer = (anim.playerIdx + 1) as 1 | 2;
        playSound("lava_death");
        state.phase = "victory";
        state.victoryTimer = p.millis();
        return;
      }
```

- [ ] **Step 3: Build verify**

Run: `bun run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/sketch.ts
git commit -m "feat: continuous lava death check on gorilla fall and jump landing"
```

---

### Task 11: Drawing Hazard Visuals in drawGameplay

**Files:**
- Modify: `src/sketch.ts`

- [ ] **Step 1: Import new drawing functions**

In `src/sketch.ts`, add to the imports from `"./ui"`:

```typescript
drawBurningBuildings, drawLava, drawStormClouds, drawFizzleBubble,
```

(Note: `drawLightning` was already imported in Task 9.)

- [ ] **Step 2: Add hazard visuals to `drawGameplay`**

In `src/sketch.ts`, in `drawGameplay()`:

After `drawCity(p, state.buildings)` (line ~1996), add:

```typescript
    // Draw burning building overlays
    if (state.burningBuildings.size > 0) {
      drawBurningBuildings(p, state.buildings, state.burningBuildings);
    }
```

After the gorilla drawing loop (around line ~2085) and before `drawHP(p, state)`, add:

```typescript
    // Draw lava layer (on top of building bases and gorillas, below UI)
    if (state.lavaActive) {
      drawLava(p, state.lavaHeight);
    }
```

Replace the `drawSun` call with conditional storm cloud rendering:

```typescript
    if (state.stormActive) {
      drawStormClouds(p);
    } else {
      drawSun(p, state.sunShocked, state.timeOfDay);
    }
```

After `drawInventoryHUD(p, state)`, add fizzle bubble rendering:

```typescript
    // Draw fizzle "?" bubble
    if (state.fizzleTimer > 0) {
      const fizzleElapsed = p.millis() - state.fizzleTimer;
      if (fizzleElapsed < FIZZLE_BUBBLE_MS) {
        drawFizzleBubble(p, state.gorillas[state.fizzlePlayerIdx], fizzleElapsed / FIZZLE_BUBBLE_MS);
      } else {
        state.fizzleTimer = 0;
      }
    }
```

- [ ] **Step 3: Build verify**

Run: `bun run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/sketch.ts
git commit -m "feat: render burning buildings, lava, storm clouds, and fizzle bubble"
```

---

### Task 12: Clean Up Fire on Building Destruction

**Files:**
- Modify: `src/sketch.ts`

When a building is destroyed (demolition, earthquake), remove it from `burningBuildings`.

- [ ] **Step 1: Add fire cleanup to demolition handling**

In `src/sketch.ts`, in the `case "building"` demolition block (around line 1123), after `result.building.damage = [];`, add:

```typescript
          state.burningBuildings.delete(hitBuildingIdx);
```

- [ ] **Step 2: Add fire cleanup to earthquake**

In `src/sketch.ts`, in `triggerEarthquake()`, after `reshuffleBuildings(...)`, clear all burning buildings since buildings have been reshuffled:

```typescript
    state.burningBuildings.clear();
```

This is the simplest approach — earthquake reshuffles the entire city, so no existing fire targets make sense anymore.

- [ ] **Step 3: Build verify**

Run: `bun run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/sketch.ts
git commit -m "feat: clean up burning buildings on demolition and earthquake"
```

---

### Task 13: Final Integration and Polish

**Files:**
- Modify: `src/sketch.ts` (if needed)

- [ ] **Step 1: Full build verify**

Run: `bun run build`
Expected: Clean build with no errors.

- [ ] **Step 2: Manual testing checklist**

Run `bun run dev` and test:

1. **Fire banana:** Collect from crate, select in HUD, throw at a building. Verify:
   - Building catches fire (flames visible)
   - No explosion
   - Next turn on that building deals 1 HP damage with "-1 FIRE" text
2. **Fire fizzle:** Throw fire banana at the ground. Verify "?" appears over gorilla.
3. **Lava banana:** Throw between buildings to hit the ground. Verify:
   - Lava rises from bottom
   - Buildings partially submerged
   - Gorilla falling into lava = instant death
4. **Lava fizzle:** Throw lava banana at a building. Verify "?" appears.
5. **Storm banana:** Throw straight up off screen. Verify:
   - Dark clouds appear
   - Lightning strikes a random building each turn
   - Gorilla on struck building takes 1 HP
6. **Storm fizzle:** Throw storm banana at a building. Verify "?" appears.
7. **Stacking:** Activate all three in one round. Verify they coexist.
8. **Demolition + fire:** Set a building on fire, then demolish it. Verify fire is removed.

- [ ] **Step 3: Commit any fixes found during testing**

```bash
git add -u
git commit -m "fix: polish hazard banana integration"
```
