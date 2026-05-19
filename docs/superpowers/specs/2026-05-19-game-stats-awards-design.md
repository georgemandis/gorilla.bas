# End-of-Game Stats & Awards Design Spec

**Goal:** Show funny awards on the game over screen based on tracked per-player stats, with optional name-based bonus awards.

**Architecture:** A separate `src/stats.ts` module tracks per-player counters during gameplay. At game over, an award picker selects the single best stat-based award per player plus an optional name-based bonus. The game over screen reveals awards sequentially with icons and sound effects.

**Tech Stack:** P5.js, TypeScript, existing game infrastructure.

---

## 1. Stats Tracking

New `src/stats.ts` with:

```typescript
interface PlayerStats {
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
  throwsThisRound: number;  // resets each round, used to detect first-throw kills
}

interface GameStats {
  players: [PlayerStats, PlayerStats];
}
```

Derived values computed at award-selection time:
- `misses = throws - hits`
- `hitRatio = hits / throws`
- `avgPower = totalPower / throws`

### Recording Functions

Simple mutation functions exported from `stats.ts`:

- `createGameStats(): GameStats` — all zeros
- `recordThrow(stats, playerIdx, power)` — increments `throws`, `throwsThisRound`, adds to `totalPower`
- `recordHit(stats, playerIdx)` — increments `hits`
- `recordSelfKill(stats, playerIdx)` — increments `selfKills`
- `recordKill(stats, playerIdx)` — increments `kills`
- `recordFirstThrowKill(stats, playerIdx)` — increments `firstThrowKills`
- `recordDeath(stats, playerIdx, cause)` — increments `deathByFire`/`deathByLava`/`deathByLightning`
- `recordPowerUp(stats, playerIdx, type)` — increments `powerUpsUsed` and the type-specific counter
- `recordJump(stats, playerIdx)` — increments `jumps`
- `recordShield(stats, playerIdx)` — increments `shieldsUsed`
- `resetRoundThrows(stats)` — resets `throwsThisRound` for both players (called at round start)

### Recording Locations in sketch.ts

**Ordering in `launchBanana()`:** `consumeSelectedPowerUp` is called first. Then `recordPowerUp` is called immediately after (before the shield/jump early-returns, so shield and jump are counted as power-ups used). Then `recordShield`/`recordJump` are called in their respective early-return blocks. `recordThrow` is called *after* the shield/jump early-returns, at the point where `state.projectile` is created, using `effectivePower` (which accounts for Giant power reduction).

**Kill recording at all kill sites:** `recordKill` and `recordSelfKill` must be called at every location that sets HP to 0 and transitions to victory — not just `updateExplosion`. This includes hazard damage (fire/lightning in `updateHazardDamage`) and lava deaths (in `updateFallingGorillas`, `updateJump`, and lava activation instant-kill).

| Function | Location |
|----------|----------|
| `recordPowerUp` | `launchBanana()` immediately after `consumeSelectedPowerUp` returns a type (before shield/jump returns) |
| `recordShield` | `launchBanana()` in the shield early-return block |
| `recordJump` | `launchBanana()` in the jump early-return block |
| `recordThrow` | `launchBanana()` after shield/jump early-returns, at projectile creation, using `effectivePower` |
| `recordHit` | `updateExplosion()` when `lastHitPlayer !== null` and HP decremented |
| `recordSelfKill` | `updateExplosion()` when self-KO; `updateHazardDamage()` fire/lightning self-kill; lava death sites when thrower kills self |
| `recordKill` | `updateExplosion()` when opponent KO'd; `updateHazardDamage()` fire/lightning kills; all 3 lava death sites |
| `recordFirstThrowKill` | At every kill site, when `throwsThisRound === 1` for the killer |
| `recordDeath("fire")` | `updateHazardDamage()` fire step when HP reaches 0 |
| `recordDeath("lava")` | All 3 lava death sites: `updateFallingGorillas`, `updateJump`, lava activation instant-kill |
| `recordDeath("lightning")` | `updateHazardDamage()` storm step when HP reaches 0 |
| `resetRoundThrows` | `startNewRound()` |

**Note on `firstThrowKills`:** "First throw" means the first throw of any single round (when `throwsThisRound === 1`), not the first throw of the entire game. The counter accumulates across the whole game, but the award condition is simply `> 0`.

### Lifecycle

- Created alongside `createInitialState()` at game start
- Persists across rounds within a game
- Reset when new game starts in `updateGameOver()`

---

## 2. Stat-Based Awards

One award per player, selected by highest priority among applicable conditions.

| Priority | Award Name | Flavor Text | Condition | Icon |
|----------|-----------|-------------|-----------|------|
| 10 | Friendly Fire | "Awarded themselves some damage" | selfKills > 0 | Skull |
| 9 | Floor Is Lava | "Melted someone into goo" | opponent has deathByLava > 0 | Lava drip |
| 9 | Thor's Cousin | "Called down the thunder" | opponent has deathByLightning > 0 | Lightning bolt |
| 8 | The Arsonist | "Some gorillas just want to watch the world burn" | fireUsed >= 2 | Flame |
| 8 | Lucky Shot | "First try!" | firstThrowKills > 0 | Star |
| 7 | Pacifist | "Never once hit a gorilla" | hits === 0 && throws > 0 | Peace sign |
| 6 | Seismologist | "Rearranged the neighborhood" | earthquakesUsed >= 2 | Wavy lines |
| 6 | Demolition Derby | "Buildings feared them" | demolitionUsed >= 2 | Wrecking ball |
| 6 | City Planner | "Made the skyline beautiful" | constructionUsed >= 2 | Hard hat |
| 5 | Bunny | "Couldn't sit still" | jumps >= 3 | Bunny ears |
| 5 | Turtle | "Played it safe" | shieldsUsed >= 2 | Shell |
| 4 | The Sniper | "Deadly accurate" | hitRatio > 0.5 && throws >= 3 | Crosshair |
| 4 | Stormtrooper | "Couldn't hit the broad side of a building" | hitRatio < 0.2 && throws >= 4 | Whiffed banana |
| 3 | Arms Dealer | "Loved the crates" | powerUpsUsed >= 6 | Crate |
| 2 | Hulk Smash | "Full send every time" | avgPower > 80 | Flexed arm |
| 2 | Butterfingers | "Gentle tosser" | avgPower < 25 && throws >= 3 | Weak arm |
| 1 | Hoarder | "Collected but never used" | inventory.length >= 3 at end of final round | Pile |

**Fallback awards** (if nothing else applies):
- Winner: "Champion" / "Undisputed gorilla" (Trophy icon)
- Loser: "Participant" / "Showed up" (Ribbon icon)

### Selection Logic

```typescript
function pickStatAward(stats: PlayerStats, opponentStats: PlayerStats, isWinner: boolean, inventory: PowerUpType[]): Award
```

Iterates awards in priority order. Returns first matching. Falls back to Champion/Participant. The `opponentStats` parameter is needed for "Floor Is Lava" (checks opponent's `deathByLava`) and "Thor's Cousin" (checks opponent's `deathByLightning`).

**Call-site example in `sketch.ts`:**
```typescript
const p1Award = pickStatAward(gameStats.players[0], gameStats.players[1], winnerIdx === 0, state.inventory[0]);
const p2Award = pickStatAward(gameStats.players[1], gameStats.players[0], winnerIdx === 1, state.inventory[1]);
```

Both players can receive the same award type if they both qualify — that's fine and potentially funny.

---

## 3. Name-Based Bonus Awards

A single optional 3rd award shown below the two stat awards. First matching condition wins. These check gorilla names.

| Award Name | Flavor Text | Trigger |
|-----------|-------------|---------|
| Kong vs Kong | "The ultimate showdown" | Both names contain "Kong" |
| Royal Rumble | "A clash of crowns" | Both names contain "King" or "Queen" |
| Identity Crisis | "Are you two related?" | Both gorillas share the same adjective |
| Return of the King | "Long live the king" | Winner's name contains "King" |
| Curious Indeed | "The hat stays on" | Name contains "Curious" and they won |
| The Yeti Abides | "Cool as ice" | Name contains "Yeti" and they won |
| Monkeying Around | "Classic monkey business" | Name contains "Monkey" and most misses |
| Beauty & The Beast | "An unlikely matchup" | One has "Queen", other has "Feral"/"Wild"/"Raging" |
| Literally Just Vibing | "Didn't need 'em" | Name contains "Funky" and zero power-ups used |
| Ape Escape | "Couldn't get out of this one" | Loser's name contains "Ape" and they had 0 kills |

```typescript
function pickNameAward(names: [string, string], stats: GameStats, winnerIdx: 0 | 1): NameAward | null
```

---

## 4. Game Over Screen Layout

336x262 pixel display. Awards appear below the existing scores/winner text. **Space is tight** — the score line should be condensed to a single line (e.g., `Name1: 3  Name2: 1`) using textSize 5 to leave room for up to 3 awards plus the "Press START" prompt.

```
              GAME OVER

      Name1: 3  Name2: 1
           Name1 wins!

      [icon] "The Sniper"            <- P1 stat award
      "Deadly accurate"

      [icon] "Friendly Fire"         <- P2 stat award
      "Awarded themselves some damage"

      [icon] "Kong vs Kong"          <- Name bonus (if applicable)
      "The ultimate showdown"

           Press START
```

### Text Styling

- Award name: yellow (#FFD050), textSize 6, centered
- Flavor text: gray (#999999), textSize 5, centered below name
- Icon: 8-10px thematic pixel art, drawn to the left of award name
- Player label (P1/P2 color) on the left or above the award to identify whose it is

### Reveal Sequence

Timing is relative to a `gameOverEnteredAt` timestamp (new field on `GameState`, set to `p.millis()` when `state.phase = "game_over"` is assigned in `sketch.ts`).

1. **0ms:** "GAME OVER", scores, and winner text appear (same as current)
2. **1000ms:** P1 stat award fades in + sound effect
3. **2000ms:** P2 stat award fades in + sound effect
4. **3000ms:** Name bonus award fades in (if applicable) + special chime
5. **3500ms:** "Press START" appears

Each award fades in over ~300ms (alpha 0→255).

---

## 5. Sound Effects

Three sound variants for awards, rotated:

- `award_reveal_1` — Short ascending chime (stat awards)
- `award_reveal_2` — Short descending chime (stat awards, alternated)
- `award_bonus` — Sparkle/special chime (name bonus award)

Added to `SoundName` type and `playSound` switch in `src/sound.ts`.

---

## 6. Award Icons

Each award has a tiny (8-10px) thematic icon drawn procedurally with p5 primitives (circles, triangles, lines — no images). Icons are drawn by a `drawAwardIcon(p, awardId, x, y)` function in `src/ui.ts`.

| Award | Icon Description |
|-------|-----------------|
| Friendly Fire | Red skull (circle + triangle jaw + dot eyes) |
| Floor Is Lava | Orange drip (teardrop shape) |
| Thor's Cousin | Yellow lightning bolt (zigzag) |
| The Arsonist | Orange/yellow flame (triangles) |
| Lucky Shot | Yellow star (5-pointed) |
| Pacifist | Green circle (peace sign) |
| Seismologist | Orange wavy lines (3 sine curves) |
| Demolition Derby | Gray wrecking ball (circle + line) |
| City Planner | Yellow hard hat (half-ellipse + brim) |
| Bunny | Pink bunny ears (two ovals) |
| Turtle | Green shell (half-ellipse + pattern) |
| The Sniper | Red crosshair (circle + lines) |
| Stormtrooper | Yellow banana with "X" (miss indicator) |
| Arms Dealer | Orange crate (square + "?" text) |
| Hulk Smash | Red flexed arm (lines) |
| Butterfingers | Gray weak arm (thin lines) |
| Hoarder | Brown pile (overlapping circles) |
| Champion | Gold trophy (cup shape) |
| Participant | Blue ribbon (rectangle + tails) |
| Name bonus awards | White sparkle (star burst) |

---

## 7. File Structure

| File | Changes |
|------|---------|
| `src/stats.ts` | **New.** `GameStats`, `PlayerStats`, recording functions, `pickStatAward`, `pickNameAward` |
| `src/types.ts` | Add `Award` and `NameAward` interfaces, add `gameOverEnteredAt: number` to `GameState` |
| `src/sound.ts` | Add 3 award sound effects |
| `src/ui.ts` | Add `drawAwardIcon`, modify `drawGameOver` to show awards with reveal timing |
| `src/sketch.ts` | Create/reset stats, call recording functions at game events, pass stats to `drawGameOver` |

---

## 8. Config Constants

```typescript
AWARD_REVEAL_1_MS = 1000   // delay before P1 award appears
AWARD_REVEAL_2_MS = 2000   // delay before P2 award appears
AWARD_BONUS_MS = 3000      // delay before name bonus appears
AWARD_FADE_MS = 300        // fade-in duration per award
AWARD_START_VISIBLE_MS = 3500  // when "Press START" appears
```
