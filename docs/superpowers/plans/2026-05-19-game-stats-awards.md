# End-of-Game Stats & Awards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show funny stat-based awards on the game over screen, one per player plus an optional name-based bonus award.

**Architecture:** New `src/stats.ts` module tracks per-player counters via simple mutation functions called from `sketch.ts` at each game event. At game over, award pickers select the best award per player. The game over screen in `ui.ts` reveals awards sequentially with fade-in, icons, and sound effects.

**Tech Stack:** P5.js, TypeScript, Vite, Bun

**Spec:** `docs/superpowers/specs/2026-05-19-game-stats-awards-design.md`

---

## File Structure

| File | Role |
|------|------|
| `src/stats.ts` | **New.** `PlayerStats`, `GameStats`, `Award`, `NameAward` interfaces, recording functions, `pickStatAward`, `pickNameAward` |
| `src/types.ts` | Add `gameOverEnteredAt: number` to `GameState` |
| `src/config.ts` | Add award timing constants |
| `src/sound.ts` | Add 3 award sound effects (`award_reveal_1`, `award_reveal_2`, `award_bonus`) |
| `src/ui.ts` | Add `drawAwardIcon`, modify `drawGameOver` to show awards with reveal timing |
| `src/sketch.ts` | Create/reset `GameStats`, call recording functions at game events, pass stats to game over screen |

---

### Task 1: Stats Module — Types and Recording Functions

**Files:**
- Create: `src/stats.ts`

This task creates the entire stats tracking module with all interfaces, recording functions, and award selection logic. It's a pure data module with no UI dependencies.

- [ ] **Step 1: Create `src/stats.ts` with interfaces and recording functions**

```typescript
import type { PowerUpType } from "./types";

export interface PlayerStats {
  throws: number;
  hits: number;
  selfKills: number;
  jumps: number;
  shieldsUsed: number;
  powerUpsUsed: number;
  fireUsed: number;
  lavaUsed: number;
  stormUsed: number;
  constructionUsed: number;
  demolitionUsed: number;
  earthquakesUsed: number;
  kills: number;
  deathByFire: number;
  deathByLava: number;
  deathByLightning: number;
  totalPower: number;
  firstThrowKills: number;
  throwsThisRound: number;
}

export interface GameStats {
  players: [PlayerStats, PlayerStats];
}

function emptyPlayerStats(): PlayerStats {
  return {
    throws: 0, hits: 0, selfKills: 0, jumps: 0, shieldsUsed: 0,
    powerUpsUsed: 0, fireUsed: 0, lavaUsed: 0, stormUsed: 0,
    constructionUsed: 0, demolitionUsed: 0, earthquakesUsed: 0,
    kills: 0, deathByFire: 0, deathByLava: 0, deathByLightning: 0,
    totalPower: 0, firstThrowKills: 0, throwsThisRound: 0,
  };
}

export function createGameStats(): GameStats {
  return { players: [emptyPlayerStats(), emptyPlayerStats()] };
}

export function recordThrow(stats: GameStats, playerIdx: 0 | 1, power: number): void {
  stats.players[playerIdx].throws++;
  stats.players[playerIdx].throwsThisRound++;
  stats.players[playerIdx].totalPower += power;
}

export function recordHit(stats: GameStats, playerIdx: 0 | 1): void {
  stats.players[playerIdx].hits++;
}

export function recordSelfKill(stats: GameStats, playerIdx: 0 | 1): void {
  stats.players[playerIdx].selfKills++;
}

export function recordKill(stats: GameStats, playerIdx: 0 | 1): void {
  stats.players[playerIdx].kills++;
}

export function recordFirstThrowKill(stats: GameStats, playerIdx: 0 | 1): void {
  stats.players[playerIdx].firstThrowKills++;
}

export function recordDeath(stats: GameStats, playerIdx: 0 | 1, cause: "fire" | "lava" | "lightning"): void {
  if (cause === "fire") stats.players[playerIdx].deathByFire++;
  else if (cause === "lava") stats.players[playerIdx].deathByLava++;
  else stats.players[playerIdx].deathByLightning++;
}

export function recordPowerUp(stats: GameStats, playerIdx: 0 | 1, type: PowerUpType): void {
  stats.players[playerIdx].powerUpsUsed++;
  switch (type) {
    case "fire": stats.players[playerIdx].fireUsed++; break;
    case "lava": stats.players[playerIdx].lavaUsed++; break;
    case "storm": stats.players[playerIdx].stormUsed++; break;
    case "construction": stats.players[playerIdx].constructionUsed++; break;
    case "demolition": stats.players[playerIdx].demolitionUsed++; break;
    case "earthquake": stats.players[playerIdx].earthquakesUsed++; break;
  }
}

export function recordJump(stats: GameStats, playerIdx: 0 | 1): void {
  stats.players[playerIdx].jumps++;
}

export function recordShield(stats: GameStats, playerIdx: 0 | 1): void {
  stats.players[playerIdx].shieldsUsed++;
}

export function resetRoundThrows(stats: GameStats): void {
  stats.players[0].throwsThisRound = 0;
  stats.players[1].throwsThisRound = 0;
}
```

- [ ] **Step 2: Add award selection types and `pickStatAward`**

Append to `src/stats.ts`:

```typescript
export interface Award {
  id: string;
  name: string;
  flavorText: string;
}

export interface NameAward {
  id: string;
  name: string;
  flavorText: string;
}

const STAT_AWARDS: { id: string; name: string; flavorText: string; priority: number; check: (s: PlayerStats, opp: PlayerStats, isWinner: boolean, inv: PowerUpType[]) => boolean }[] = [
  { id: "friendly_fire", name: "Friendly Fire", flavorText: "Awarded themselves some damage", priority: 10, check: (s) => s.selfKills > 0 },
  { id: "floor_is_lava", name: "Floor Is Lava", flavorText: "Melted someone into goo", priority: 9, check: (_s, opp) => opp.deathByLava > 0 },
  { id: "thors_cousin", name: "Thor's Cousin", flavorText: "Called down the thunder", priority: 9, check: (_s, opp) => opp.deathByLightning > 0 },
  { id: "the_arsonist", name: "The Arsonist", flavorText: "Some gorillas just want to watch the world burn", priority: 8, check: (s) => s.fireUsed >= 2 },
  { id: "lucky_shot", name: "Lucky Shot", flavorText: "First try!", priority: 8, check: (s) => s.firstThrowKills > 0 },
  { id: "pacifist", name: "Pacifist", flavorText: "Never once hit a gorilla", priority: 7, check: (s) => s.hits === 0 && s.throws > 0 },
  { id: "seismologist", name: "Seismologist", flavorText: "Rearranged the neighborhood", priority: 6, check: (s) => s.earthquakesUsed >= 2 },
  { id: "demolition_derby", name: "Demolition Derby", flavorText: "Buildings feared them", priority: 6, check: (s) => s.demolitionUsed >= 2 },
  { id: "city_planner", name: "City Planner", flavorText: "Made the skyline beautiful", priority: 6, check: (s) => s.constructionUsed >= 2 },
  { id: "bunny", name: "Bunny", flavorText: "Couldn't sit still", priority: 5, check: (s) => s.jumps >= 3 },
  { id: "turtle", name: "Turtle", flavorText: "Played it safe", priority: 5, check: (s) => s.shieldsUsed >= 2 },
  { id: "the_sniper", name: "The Sniper", flavorText: "Deadly accurate", priority: 4, check: (s) => s.throws >= 3 && s.hits / s.throws > 0.5 },
  { id: "stormtrooper", name: "Stormtrooper", flavorText: "Couldn't hit the broad side of a building", priority: 4, check: (s) => s.throws >= 4 && s.hits / s.throws < 0.2 },
  { id: "arms_dealer", name: "Arms Dealer", flavorText: "Loved the crates", priority: 3, check: (s) => s.powerUpsUsed >= 6 },
  { id: "hulk_smash", name: "Hulk Smash", flavorText: "Full send every time", priority: 2, check: (s) => s.throws > 0 && s.totalPower / s.throws > 80 },
  { id: "butterfingers", name: "Butterfingers", flavorText: "Gentle tosser", priority: 2, check: (s) => s.throws >= 3 && s.totalPower / s.throws < 25 },
  { id: "hoarder", name: "Hoarder", flavorText: "Collected but never used", priority: 1, check: (_s, _opp, _w, inv) => inv.length >= 3 },
];

export function pickStatAward(stats: PlayerStats, opponentStats: PlayerStats, isWinner: boolean, inventory: PowerUpType[]): Award {
  // Sort by priority descending (stable — first in list wins ties)
  const sorted = [...STAT_AWARDS].sort((a, b) => b.priority - a.priority);
  for (const award of sorted) {
    if (award.check(stats, opponentStats, isWinner, inventory)) {
      return { id: award.id, name: award.name, flavorText: award.flavorText };
    }
  }
  // Fallback
  if (isWinner) {
    return { id: "champion", name: "Champion", flavorText: "Undisputed gorilla" };
  }
  return { id: "participant", name: "Participant", flavorText: "Showed up" };
}
```

- [ ] **Step 3: Add `pickNameAward`**

Append to `src/stats.ts`:

```typescript
const NAME_AWARDS: { id: string; name: string; flavorText: string; check: (names: [string, string], stats: GameStats, winnerIdx: 0 | 1) => boolean }[] = [
  {
    id: "kong_vs_kong", name: "Kong vs Kong", flavorText: "The ultimate showdown",
    check: (names) => names[0].includes("Kong") && names[1].includes("Kong"),
  },
  {
    id: "royal_rumble", name: "Royal Rumble", flavorText: "A clash of crowns",
    check: (names) => {
      const hasRoyal = (n: string) => n.includes("King") || n.includes("Queen");
      return hasRoyal(names[0]) && hasRoyal(names[1]);
    },
  },
  {
    id: "identity_crisis", name: "Identity Crisis", flavorText: "Are you two related?",
    check: (names) => {
      const adj0 = names[0].split(" ")[0];
      const adj1 = names[1].split(" ")[0];
      return adj0 === adj1;
    },
  },
  {
    id: "return_of_the_king", name: "Return of the King", flavorText: "Long live the king",
    check: (names, _stats, winnerIdx) => names[winnerIdx].includes("King"),
  },
  {
    id: "curious_indeed", name: "Curious Indeed", flavorText: "The hat stays on",
    check: (names, _stats, winnerIdx) => names[winnerIdx].includes("Curious"),
  },
  {
    id: "the_yeti_abides", name: "The Yeti Abides", flavorText: "Cool as ice",
    check: (names, _stats, winnerIdx) => names[winnerIdx].includes("Yeti"),
  },
  {
    id: "monkeying_around", name: "Monkeying Around", flavorText: "Classic monkey business",
    check: (names, stats) => {
      const misses0 = stats.players[0].throws - stats.players[0].hits;
      const misses1 = stats.players[1].throws - stats.players[1].hits;
      return (names[0].includes("Monkey") && misses0 >= misses1) ||
             (names[1].includes("Monkey") && misses1 >= misses0);
    },
  },
  {
    id: "beauty_and_beast", name: "Beauty & The Beast", flavorText: "An unlikely matchup",
    check: (names) => {
      const hasBeast = (n: string) => n.includes("Feral") || n.includes("Wild") || n.includes("Raging");
      return (names[0].includes("Queen") && hasBeast(names[1])) ||
             (names[1].includes("Queen") && hasBeast(names[0]));
    },
  },
  {
    id: "literally_just_vibing", name: "Literally Just Vibing", flavorText: "Didn't need 'em",
    check: (names, stats) => {
      return (names[0].includes("Funky") && stats.players[0].powerUpsUsed === 0) ||
             (names[1].includes("Funky") && stats.players[1].powerUpsUsed === 0);
    },
  },
  {
    id: "ape_escape", name: "Ape Escape", flavorText: "Couldn't get out of this one",
    check: (names, stats, winnerIdx) => {
      const loserIdx = winnerIdx === 0 ? 1 : 0;
      return names[loserIdx].includes("Ape") && stats.players[loserIdx].kills === 0;
    },
  },
];

export function pickNameAward(names: [string, string], stats: GameStats, winnerIdx: 0 | 1): NameAward | null {
  for (const award of NAME_AWARDS) {
    if (award.check(names, stats, winnerIdx)) {
      return { id: award.id, name: award.name, flavorText: award.flavorText };
    }
  }
  return null;
}
```

- [ ] **Step 4: Verify build**

Run: `bun run build`
Expected: No TypeScript errors

- [ ] **Step 5: Commit**

```bash
git add src/stats.ts
git commit -m "feat: add stats tracking module with recording functions and award pickers"
```

---

### Task 2: Type Updates and Config Constants

**Files:**
- Modify: `src/types.ts` (line 127–182, `GameState` interface)
- Modify: `src/config.ts`

- [ ] **Step 1: Add `gameOverEnteredAt` to `GameState`**

In `src/types.ts`, add to the `GameState` interface (after `lightningTarget: number;` on line 181):

```typescript
  gameOverEnteredAt: number;
```

- [ ] **Step 2: Add award timing constants to `src/config.ts`**

Append at end of file:

```typescript
// Award reveal timing
export const AWARD_REVEAL_1_MS = 1000;
export const AWARD_REVEAL_2_MS = 2000;
export const AWARD_BONUS_MS = 3000;
export const AWARD_FADE_MS = 300;
export const AWARD_START_VISIBLE_MS = 3500;
```

- [ ] **Step 3: Initialize `gameOverEnteredAt` in `createInitialState()` in `src/sketch.ts`**

In `src/sketch.ts`, in the `createInitialState()` function, add `gameOverEnteredAt: 0` to the returned object. Add it after the `lightningTarget: -1,` line (around line 100 — look for the last field in the return object).

- [ ] **Step 4: Set `gameOverEnteredAt` when entering game_over phase**

In `src/sketch.ts`, find the line `state.phase = "game_over";` inside `updateVictory()` (around line 1589). Change it to:

```typescript
        state.phase = "game_over";
        state.gameOverEnteredAt = p.millis();
```

- [ ] **Step 5: Verify build**

Run: `bun run build`
Expected: No TypeScript errors

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/config.ts src/sketch.ts
git commit -m "feat: add gameOverEnteredAt to GameState and award timing constants"
```

---

### Task 3: Award Sound Effects

**Files:**
- Modify: `src/sound.ts`

- [ ] **Step 1: Add award sounds to `SoundName` type**

In `src/sound.ts` line 9, add `"award_reveal_1" | "award_reveal_2" | "award_bonus"` to the end of the `SoundName` type union (before the semicolon after `"fizzle"`).

- [ ] **Step 2: Add switch cases in `playSound`**

In `src/sound.ts`, add these cases inside the `switch (name)` block, after the `case "fizzle"` line (around line 56):

```typescript
      case "award_reveal_1": playAwardReveal1(); break;
      case "award_reveal_2": playAwardReveal2(); break;
      case "award_bonus": playAwardBonus(); break;
```

- [ ] **Step 3: Add sound implementation functions**

Append to `src/sound.ts` before the closing of the file:

```typescript
function playAwardReveal1() {
  // Short ascending chime
  const c = getCtx();
  [523, 659, 784].forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    const t = c.currentTime + i * 0.1;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  });
}

function playAwardReveal2() {
  // Short descending chime
  const c = getCtx();
  [784, 659, 523].forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    const t = c.currentTime + i * 0.1;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  });
}

function playAwardBonus() {
  // Sparkle chime for name bonus
  const c = getCtx();
  [1047, 1319, 1568, 2093].forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "triangle";
    const t = c.currentTime + i * 0.08;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  });
}
```

- [ ] **Step 4: Verify build**

Run: `bun run build`
Expected: No TypeScript errors

- [ ] **Step 5: Commit**

```bash
git add src/sound.ts
git commit -m "feat: add award reveal sound effects"
```

---

### Task 4: Award Icons and Game Over Screen

**Files:**
- Modify: `src/ui.ts`

This task modifies `drawGameOver` to show awards with reveal timing and adds the `drawAwardIcon` function. The game over screen needs to be significantly reworked.

- [ ] **Step 1: Add imports to `src/ui.ts`**

At the top of `src/ui.ts`, add these imports:

```typescript
import type { Award, NameAward } from "./stats";
import {
  AWARD_REVEAL_1_MS, AWARD_REVEAL_2_MS, AWARD_BONUS_MS,
  AWARD_FADE_MS, AWARD_START_VISIBLE_MS,
} from "./config";
```

- [ ] **Step 2: Add `drawAwardIcon` function**

Add this function in `src/ui.ts` (before `drawGameOver`):

```typescript
function drawAwardIcon(p: p5, awardId: string, x: number, y: number, alpha: number): void {
  p.push();
  p.noStroke();
  const s = 8; // icon size
  const a = alpha; // shorthand for fill/stroke alpha

  switch (awardId) {
    case "friendly_fire": // Red skull
      p.fill(255, 50, 50, a);
      p.circle(x, y - 1, s * 0.7);
      p.triangle(x - 2, y + 1, x + 2, y + 1, x, y + 4);
      p.fill(0, 0, 0, a);
      p.circle(x - 1.5, y - 1.5, 1.5);
      p.circle(x + 1.5, y - 1.5, 1.5);
      break;
    case "floor_is_lava": // Orange drip
      p.fill(255, 120, 0, a);
      p.beginShape();
      p.vertex(x, y - 4);
      p.vertex(x + 3, y + 1);
      p.vertex(x + 2, y + 3);
      p.vertex(x - 2, y + 3);
      p.vertex(x - 3, y + 1);
      p.endShape(p.CLOSE);
      break;
    case "thors_cousin": // Lightning bolt
      p.fill(255, 255, 50, a);
      p.beginShape();
      p.vertex(x - 1, y - 4);
      p.vertex(x + 2, y - 1);
      p.vertex(x, y - 1);
      p.vertex(x + 1, y + 4);
      p.vertex(x - 2, y + 1);
      p.vertex(x, y + 1);
      p.endShape(p.CLOSE);
      break;
    case "the_arsonist": // Flame
      p.fill(255, 100, 0, a);
      p.triangle(x - 3, y + 3, x + 3, y + 3, x, y - 4);
      p.fill(255, 200, 50, a);
      p.triangle(x - 1.5, y + 3, x + 1.5, y + 3, x, y - 1);
      break;
    case "lucky_shot": // Star
      p.fill(255, 220, 50, a);
      drawStar(p, x, y, 2, 4.5, 5);
      break;
    case "pacifist": // Peace sign
      p.noFill();
      p.stroke(100, 255, 100, a);
      p.strokeWeight(1);
      p.circle(x, y, s);
      p.line(x, y - 4, x, y + 4);
      p.line(x, y, x - 2.5, y + 3);
      p.line(x, y, x + 2.5, y + 3);
      break;
    case "seismologist": // Wavy lines
      p.stroke(255, 150, 0, a);
      p.strokeWeight(1);
      p.noFill();
      for (let w = -2; w <= 2; w += 2) {
        p.beginShape();
        for (let wx = -4; wx <= 4; wx++) {
          p.vertex(x + wx, y + w + Math.sin(wx * 1.2) * 1.5);
        }
        p.endShape();
      }
      break;
    case "demolition_derby": // Wrecking ball
      p.fill(150, 150, 150, a);
      p.circle(x, y + 1, s * 0.6);
      p.stroke(150, 150, 150, a);
      p.strokeWeight(1);
      p.line(x, y - 2, x, y - 5);
      break;
    case "city_planner": // Hard hat
      p.fill(255, 220, 50, a);
      p.arc(x, y, s, s * 0.7, p.PI, 0);
      p.rect(x - 5, y - 1, 10, 2);
      break;
    case "bunny": // Bunny ears
      p.fill(255, 150, 180, a);
      p.ellipse(x - 2, y - 2, 3, 7);
      p.ellipse(x + 2, y - 2, 3, 7);
      break;
    case "turtle": // Shell
      p.fill(80, 180, 80, a);
      p.arc(x, y, s, s * 0.8, p.PI, 0);
      p.fill(60, 140, 60, a);
      p.line(x, y - 3, x, y);
      break;
    case "the_sniper": // Crosshair
      p.noFill();
      p.stroke(255, 50, 50, a);
      p.strokeWeight(1);
      p.circle(x, y, s * 0.7);
      p.line(x - 4, y, x + 4, y);
      p.line(x, y - 4, x, y + 4);
      break;
    case "stormtrooper": // Banana with X
      p.fill(255, 255, 0, a);
      p.arc(x, y, 6, 4, 0, p.PI);
      p.stroke(255, 0, 0, a);
      p.strokeWeight(1);
      p.line(x - 2, y - 3, x + 2, y + 1);
      p.line(x + 2, y - 3, x - 2, y + 1);
      break;
    case "arms_dealer": // Crate
      p.fill(200, 120, 40, a);
      p.rect(x - 4, y - 4, 8, 8);
      p.fill(255, 255, 255, a);
      p.textSize(5);
      p.textAlign(p.CENTER, p.CENTER);
      p.text("?", x, y);
      break;
    case "hulk_smash": // Flexed arm
      p.stroke(255, 80, 80, a);
      p.strokeWeight(1.5);
      p.noFill();
      p.line(x - 3, y + 3, x - 1, y);
      p.line(x - 1, y, x + 2, y - 3);
      p.circle(x + 2, y - 3, 3);
      break;
    case "butterfingers": // Weak arm
      p.stroke(150, 150, 150, a);
      p.strokeWeight(1);
      p.noFill();
      p.line(x - 3, y + 2, x, y);
      p.line(x, y, x + 2, y + 1);
      break;
    case "hoarder": // Pile
      p.fill(160, 100, 40, a);
      p.circle(x - 2, y + 1, 4);
      p.circle(x + 2, y + 1, 4);
      p.circle(x, y - 2, 4);
      break;
    case "champion": // Gold trophy
      p.fill(255, 200, 50, a);
      p.rect(x - 3, y - 2, 6, 5);
      p.rect(x - 1, y + 3, 2, 2);
      p.rect(x - 3, y + 5, 6, 1);
      p.rect(x - 5, y - 2, 2, 3);
      p.rect(x + 3, y - 2, 2, 3);
      break;
    case "participant": // Blue ribbon
      p.fill(80, 150, 255, a);
      p.rect(x - 2, y - 3, 4, 4);
      p.triangle(x - 2, y + 1, x - 3, y + 5, x, y + 2);
      p.triangle(x + 2, y + 1, x + 3, y + 5, x, y + 2);
      break;
    default: // Name bonus: white sparkle
      p.fill(255, 255, 255, a);
      drawStar(p, x, y, 1.5, 4, 4);
      p.fill(255, 255, 200, a);
      drawStar(p, x, y, 1, 2.5, 4);
      break;
  }

  p.pop();
}

function drawStar(p: p5, cx: number, cy: number, innerR: number, outerR: number, points: number): void {
  p.beginShape();
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * p.PI) / points - p.HALF_PI;
    const r = i % 2 === 0 ? outerR : innerR;
    p.vertex(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
  }
  p.endShape(p.CLOSE);
}
```

- [ ] **Step 3: Rewrite `drawGameOver` to show awards**

Replace the existing `drawGameOver` function in `src/ui.ts` with:

```typescript
export function drawGameOver(
  p: p5,
  state: GameState,
  awards?: { p1: Award; p2: Award; bonus: NameAward | null },
): void {
  const elapsed = p.millis() - state.gameOverEnteredAt;

  // Title
  p.fill(255, 100, 100);
  p.textSize(12);
  p.textAlign(p.CENTER, p.CENTER);
  p.noStroke();
  p.text("GAME OVER", WIDTH / 2, 30);

  // Condensed score line
  p.fill(255);
  p.textSize(5);
  p.text(
    `${state.playerNames[0]}: ${state.scores[0]}  ${state.playerNames[1]}: ${state.scores[1]}`,
    WIDTH / 2, 55,
  );

  // Winner
  const winnerIdx = state.scores[0] >= state.targetScore ? 0 : 1;
  const winner = state.playerNames[winnerIdx];
  p.fill(255, 200, 50);
  p.textSize(7);
  p.text(`${winner} wins!`, WIDTH / 2, 72);

  if (!awards) {
    // Fallback: show "Press START" immediately if no awards
    p.fill(150);
    p.textSize(6);
    p.text("Press START", WIDTH / 2, HEIGHT * 3 / 4);
    return;
  }

  // Player colors
  const p1Color: [number, number, number] = [100, 180, 255];
  const p2Color: [number, number, number] = [255, 120, 120];

  // P1 stat award
  let yPos = 100;
  if (elapsed >= AWARD_REVEAL_1_MS) {
    const alpha = Math.min(255, ((elapsed - AWARD_REVEAL_1_MS) / AWARD_FADE_MS) * 255);
    drawAward(p, awards.p1, state.playerNames[0], p1Color, yPos, alpha);
    // Play sound on first frame visible
    if (elapsed - AWARD_REVEAL_1_MS < 50) {
      // Sound is triggered from sketch.ts, not here (no side effects in draw)
    }
  }

  // P2 stat award
  yPos = 142;
  if (elapsed >= AWARD_REVEAL_2_MS) {
    const alpha = Math.min(255, ((elapsed - AWARD_REVEAL_2_MS) / AWARD_FADE_MS) * 255);
    drawAward(p, awards.p2, state.playerNames[1], p2Color, yPos, alpha);
  }

  // Name bonus award
  yPos = 184;
  if (awards.bonus && elapsed >= AWARD_BONUS_MS) {
    const alpha = Math.min(255, ((elapsed - AWARD_BONUS_MS) / AWARD_FADE_MS) * 255);
    drawAward(p, awards.bonus, null, [255, 255, 255], yPos, alpha);
  }

  // Press START
  if (elapsed >= AWARD_START_VISIBLE_MS) {
    p.fill(150);
    p.textSize(6);
    p.noStroke();
    p.text("Press START", WIDTH / 2, 240);
  }
}

function drawAward(
  p: p5,
  award: Award | NameAward,
  playerName: string | null,
  color: [number, number, number],
  y: number,
  alpha: number,
): void {
  // Player label
  if (playerName) {
    p.fill(color[0], color[1], color[2], alpha * 0.6);
    p.textSize(4);
    p.textAlign(p.CENTER, p.CENTER);
    p.noStroke();
    p.text(playerName, WIDTH / 2, y - 8);
  }

  // Icon (alpha threaded through since p.tint() only affects images, not primitives)
  drawAwardIcon(p, award.id, WIDTH / 2 - 60, y + 4, alpha);

  // Award name
  p.fill(255, 208, 80, alpha);
  p.textSize(6);
  p.textAlign(p.CENTER, p.CENTER);
  p.noStroke();
  p.text(`"${award.name}"`, WIDTH / 2 + 5, y);

  // Flavor text
  p.fill(153, 153, 153, alpha);
  p.textSize(5);
  p.text(award.flavorText, WIDTH / 2, y + 12);
}
```

- [ ] **Step 4: Verify build**

Run: `bun run build`
Expected: No TypeScript errors

- [ ] **Step 5: Commit**

```bash
git add src/ui.ts
git commit -m "feat: add award icons, drawAwardIcon, and rework drawGameOver for award reveal"
```

---

### Task 5: Wire Stats Recording into sketch.ts

**Files:**
- Modify: `src/sketch.ts`

This is the integration task — adding stat recording calls at every game event location, and passing awards to the game over screen.

- [ ] **Step 1: Add imports and create `gameStats` variable**

In `src/sketch.ts`, add to the existing import block:

```typescript
import {
  createGameStats, recordThrow, recordHit, recordSelfKill, recordKill,
  recordFirstThrowKill, recordDeath, recordPowerUp, recordJump, recordShield,
  resetRoundThrows, pickStatAward, pickNameAward,
} from "./stats";
import type { GameStats, Award, NameAward } from "./stats";
import {
  AWARD_REVEAL_1_MS, AWARD_REVEAL_2_MS, AWARD_BONUS_MS,
} from "./config";
```

Also add the `AWARD_REVEAL_1_MS`, `AWARD_REVEAL_2_MS`, `AWARD_BONUS_MS` to the existing config import line if they're not already there.

Then, near the top of the `sketch` function (alongside other module-level variables like `lastAngles`, `costumes`, `prevA`, etc.), add:

```typescript
  let gameStats = createGameStats();
  let gameOverAwards: { p1: Award; p2: Award; bonus: NameAward | null } | null = null;
  let awardSound1Played = false;
  let awardSound2Played = false;
  let awardBonusSoundPlayed = false;
```

- [ ] **Step 2: Add `recordPowerUp` call in `launchBanana()`**

In `launchBanana()`, right after the line `const activePowerUp = state.isExtraThrow ? null : consumeSelectedPowerUp(state, playerIdx);` (line ~627), add:

```typescript
    // Record power-up usage (before shield/jump early-returns so they count)
    if (activePowerUp) {
      recordPowerUp(gameStats, playerIdx, activePowerUp);
    }
```

- [ ] **Step 3: Add `recordShield` and `recordJump` in their early-return blocks**

In `launchBanana()`, inside the shield block (after `state.shield[playerIdx] = true;`, around line 631), add:

```typescript
      recordShield(gameStats, playerIdx);
```

Inside the jump block (after `if (activePowerUp === "jump") {`, around line 639), add at the start of that block:

```typescript
      recordJump(gameStats, playerIdx);
```

- [ ] **Step 4: Add `recordThrow` after shield/jump early-returns**

In `launchBanana()`, after the `let effectivePower = state.power;` line and Giant power adjustment (around line 681-684), right before `state.projectile = createProjectile(...)`, add:

```typescript
    recordThrow(gameStats, playerIdx, effectivePower);
```

- [ ] **Step 5: Add `recordHit` in `updateExplosion()`**

In `updateExplosion()`, after the line `state.hp[hitIdx] = Math.max(0, state.hp[hitIdx] - 1);` (line ~1522), add:

```typescript
        recordHit(gameStats, (state.currentPlayer - 1) as 0 | 1);
```

- [ ] **Step 6: Add kill/self-kill recording in `updateExplosion()`**

In `updateExplosion()`, inside the `if (state.hp[hitIdx] <= 0)` block (line ~1524):

After `state.scores[opponentIdx]++;` in the self-hit branch (line ~1529), add:

```typescript
            recordSelfKill(gameStats, (state.currentPlayer - 1) as 0 | 1);
            // Opponent gets the kill credit
            recordKill(gameStats, opponentIdx as 0 | 1);
            if (gameStats.players[opponentIdx].throwsThisRound === 1) {
              recordFirstThrowKill(gameStats, opponentIdx as 0 | 1);
            }
```

After `state.scores[state.currentPlayer - 1]++;` in the opponent-hit branch (line ~1535), add:

```typescript
            recordKill(gameStats, (state.currentPlayer - 1) as 0 | 1);
            if (gameStats.players[state.currentPlayer - 1].throwsThisRound === 1) {
              recordFirstThrowKill(gameStats, (state.currentPlayer - 1) as 0 | 1);
            }
```

- [ ] **Step 7: Add kill recording at lava death sites**

There are 3 lava death sites. At each, add `recordKill` and `recordDeath` calls.

**Site 1: `updateFallingGorillas()`** (line ~807, after `state.hp[i as 0 | 1] = 0;`):

```typescript
          recordDeath(gameStats, i as 0 | 1, "lava");
          // The thrower (currentPlayer) caused the death
          const killerIdx = (state.currentPlayer - 1) as 0 | 1;
          if (i === state.currentPlayer - 1) {
            recordSelfKill(gameStats, killerIdx);
          } else {
            recordKill(gameStats, killerIdx);
            if (gameStats.players[killerIdx].throwsThisRound === 1) {
              recordFirstThrowKill(gameStats, killerIdx);
            }
          }
```

**Site 2: `updateJump()`** (line ~859, after `state.hp[anim.playerIdx] = 0;`):

```typescript
          recordDeath(gameStats, anim.playerIdx, "lava");
          recordSelfKill(gameStats, anim.playerIdx);
```

**Site 3: Lava activation instant-kill** (line ~1071, after `state.hp[li as 0 | 1] = 0;`):

```typescript
                recordDeath(gameStats, li as 0 | 1, "lava");
                const killerIdx = (state.currentPlayer - 1) as 0 | 1;
                if (li === state.currentPlayer - 1) {
                  recordSelfKill(gameStats, killerIdx);
                } else {
                  recordKill(gameStats, killerIdx);
                  if (gameStats.players[killerIdx].throwsThisRound === 1) {
                    recordFirstThrowKill(gameStats, killerIdx);
                  }
                }
```

- [ ] **Step 8: Add kill recording at hazard damage sites**

**Fire death in `updateHazardDamage()`** (line ~2170, after `state.hp[playerIdx] = 0;`):

```typescript
          recordDeath(gameStats, playerIdx, "fire");
          // Fire is environmental — current player takes damage from it
          // The opponent is the "killer" (they started the fire)
          const oppIdx = (playerIdx === 0 ? 1 : 0) as 0 | 1;
          recordKill(gameStats, oppIdx);
```

**Lightning death in `updateHazardDamage()`** (line ~2213, after `state.hp[playerIdx] = 0;`):

```typescript
            recordDeath(gameStats, playerIdx, "lightning");
            const oppIdx = (playerIdx === 0 ? 1 : 0) as 0 | 1;
            recordKill(gameStats, oppIdx);
```

- [ ] **Step 9: Add `resetRoundThrows` in `startNewRound()`**

In `startNewRound()`, add after the existing state resets (around line 448, before the inventory assignment):

```typescript
    resetRoundThrows(gameStats);
```

- [ ] **Step 10: Compute awards at game over and pass to `drawGameOver`**

In `updateVictory()`, where `state.phase = "game_over"` is set (line ~1589), add after it:

```typescript
        // Compute awards
        const winIdx = (state.scores[0] >= state.targetScore ? 0 : 1) as 0 | 1;
        const p1Award = pickStatAward(gameStats.players[0], gameStats.players[1], winIdx === 0, state.inventory[0]);
        const p2Award = pickStatAward(gameStats.players[1], gameStats.players[0], winIdx === 1, state.inventory[1]);
        const bonusAward = pickNameAward(state.playerNames, gameStats, winIdx);
        gameOverAwards = { p1: p1Award, p2: p2Award, bonus: bonusAward };
        awardSound1Played = false;
        awardSound2Played = false;
        awardBonusSoundPlayed = false;
```

- [ ] **Step 11: Update the `drawGameOver` call to pass awards**

In the main `draw()` function's `case "game_over":` block (line ~308-310), change:

```typescript
        drawGameOver(p, state);
```

to:

```typescript
        drawGameOver(p, state, gameOverAwards ?? undefined);
```

- [ ] **Step 12: Add award sound triggering in `updateGameOver`**

In `updateGameOver()`, before the START button check (line ~1914), add:

```typescript
    // Play award reveal sounds at the right times
    const elapsed = p.millis() - state.gameOverEnteredAt;
    if (!awardSound1Played && elapsed >= AWARD_REVEAL_1_MS) {
      playSound("award_reveal_1");
      awardSound1Played = true;
    }
    if (!awardSound2Played && elapsed >= AWARD_REVEAL_2_MS) {
      playSound("award_reveal_2");
      awardSound2Played = true;
    }
    if (!awardBonusSoundPlayed && gameOverAwards?.bonus && elapsed >= AWARD_BONUS_MS) {
      playSound("award_bonus");
      awardBonusSoundPlayed = true;
    }
```

Also, gate the START button press behind the reveal timing — change the condition from:

```typescript
    if ((sys.onePlayer && !prevStart1P) || (sys.twoPlayer && !prevStart2P)) {
```

to:

```typescript
    if (elapsed >= AWARD_START_VISIBLE_MS && ((sys.onePlayer && !prevStart1P) || (sys.twoPlayer && !prevStart2P))) {
```

- [ ] **Step 13: Reset stats on new game**

In `updateGameOver()`, inside the block that calls `state = createInitialState()` (line ~1915), add after that line:

```typescript
      gameStats = createGameStats();
      gameOverAwards = null;
```

- [ ] **Step 14: Verify build**

Run: `bun run build`
Expected: No TypeScript errors

- [ ] **Step 15: Commit**

```bash
git add src/sketch.ts
git commit -m "feat: wire stats recording and award display into game loop"
```

---

### Task 6: Manual Testing and Polish

**Files:**
- Potentially any of the above

- [ ] **Step 1: Run the game and play a complete match**

Run: `bun run dev`

Play through a full game (3 rounds). Verify:
1. Game over screen shows "GAME OVER", condensed scores, winner name
2. After ~1 second, P1's stat award fades in with ascending chime
3. After ~2 seconds, P2's stat award fades in with descending chime
4. After ~3 seconds, name bonus appears (if applicable) with sparkle chime
5. After ~3.5 seconds, "Press START" appears
6. START button only works after awards are revealed
7. Awards make sense given gameplay (e.g., if you used lots of shields, you should get "Turtle")

- [ ] **Step 2: Test edge cases**

Play a quick game where:
- One player self-KOs (should get "Friendly Fire")
- Test with names that trigger bonus awards (if you get lucky with random names containing "Kong")
- Play a game with no power-ups used, minimal throws (verify fallback Champion/Participant awards)

- [ ] **Step 3: Fix any visual layout issues**

If awards overlap or text is cut off on the 336x262 display, adjust `yPos` values in `drawGameOver` or `textSize` values. The layout should look clean with all 3 awards visible.

- [ ] **Step 4: Final build check and commit**

Run: `bun run build`
Expected: Clean build, no errors

```bash
git add -A
git commit -m "fix: polish award layout and edge cases"
```
