# Power-Up System Design Spec

## Overview

A power-up system for GORILLAS.BAS where collectible crates parachute onto buildings, players spend a turn to collect them by hitting the crate with a banana, and collected power-ups modify subsequent throws. Each player can hold up to 3 power-ups. 9 power-up types provide tactical variety while keeping the core turn-based flow intact.

## Crate Mechanics

### Spawn Rules
- At the start of each `aim` phase, 1-in-5 chance to spawn a crate if none currently exists
- Only one crate on the map at a time
- Random power-up type assigned on spawn (uniform across all 9 types, hidden from players)
- Crate cleared when a new round starts
- **Crate spawn only triggers on the first `aim` entry of a turn** — extra throws (Two Bananas, Portal) returning to `aim` do NOT trigger another spawn roll. Tracked via a `isExtraThrow` flag.

### Landing Position
- Random building whose center X falls in the middle third of the screen (WIDTH/3 to 2*WIDTH/3)
- Lands on top of that building (y = building.y - crate height)
- Parachute fall animation: drifts visually with `wind * 0.3` during the fall, but **always lands on the predetermined target building**. The drift is cosmetic only — the crate snaps to its target position on landing.

### Visuals
- ~10x10 pixel box, flashing between two colors
- Question mark inside
- Parachute during fall: small triangle above crate with connecting lines

### Collection
- Banana hitting the crate is treated like hitting a building (banana consumed, turn ends)
- If thrower has < 3 power-ups: random power-up added to inventory, collection sparkle effect
- If thrower has 3 power-ups: crate destroyed, no collection
- Either player can hit the crate (opponent can destroy it tactically)

### Collision Priority
Full collision check order: **Gorillas > Crate > Buildings > Sun**. Gorilla hits always take priority over crate collection. If a crate overlaps with a gorilla bounding box, the gorilla hit wins.

## Controls

### Power-Up Selection (during `aim` phase)
- **Active player's B button** cycles through: Normal -> Slot 1 -> Slot 2 -> Slot 3 -> Normal (skips empty slots)
- This replaces the active player's B-button taunt capability. Active player can still taunt via DPAD.
- **Idle player's B button** remains a taunt trigger (unchanged)
- Selection sound on each press
- The aim indicator (pulsating banana on angle halo) changes icon to reflect selection
- Confetti banana shows a normal banana icon (deception is the point)
- Selection is consumed from inventory when the throw happens, not on selection
- During `power` and `flight` phases, selection is locked
- **`selectedPowerUp` resets to null on actual player switch.** It persists during extra throws (Two Bananas second throw, Portal second throw).

### Inventory Display
- Small icons near each player's score at the top of the screen (up to 3 per player)
- Simple colored symbols distinguishing each type

## Power-Up Types

### 1. Big Banana
- Projectile drawn at 2x size
- Explosion radius = EXPLOSION_RADIUS * 2.5
- Everything else normal

### 2. Two Bananas
- After first throw resolves, player gets an immediate second throw (normal banana)
- Tracked via `extraThrowRemaining` flag on game state
- Second throw does not consume another power-up

### 3. Ricochet Banana
- Banana bounces off screen edges (left, right, top) instead of being a miss
- Horizontal edge: flip vx. Top edge: flip vy
- Max 3 bounces, then normal miss behavior
- Tracked via `bouncesRemaining` on projectile
- **Physics note:** On bounce, a new projectile is created from the bounce point with reflected velocity and `t=0`. The current parametric physics model computes position from `(startX, startY, vx, vy, t)`, so mid-flight velocity changes require restarting the projectile. This applies to Ricochet, Wrap-Around, and Portal behaviors.

### 4. Wrap-Around Banana
- Banana exiting left/right screen edge reappears on opposite side at same Y with same velocity
- Max 3 wraps to prevent infinite orbits
- Tracked via `wrapsRemaining` on projectile
- On wrap: new projectile created from the opposite edge at same Y, same velocity, `t=0` (see Ricochet physics note)

### 5. Cluster Bomb Banana
- After 1.2 seconds of **wall-clock time** (tracked via `p.millis()` launch timestamp stored as `splitTimer` on the projectile), banana splits into 5 smaller sub-projectiles
- Sub-projectiles spread in ~60 degree fan from original trajectory
- Each sub-projectile has half the normal explosion radius
- Original banana disappears on split
- Sub-projectiles tracked in `activeSubProjectiles` array, each checked independently for collision
- **Resolution rules:**
  - First gorilla hit by any sub-projectile ends the turn immediately — all remaining sub-projectiles are removed
  - Only one hit can score per cluster bomb (no multi-kills)
  - Sub-projectiles CAN hit crates (collected/destroyed normally)
  - Each sub-projectile that hits a building/ground gets a brief small explosion visual
  - Sub-projectiles that go off-screen are silently removed
  - Turn ends when all sub-projectiles have resolved (hit something or gone off-screen)

### 6. Teleportation Banana
- On impact (building or ground, NOT gorilla), both gorillas randomly relocate to new building rooftops
- **Placement rules:** Pick two buildings that are (a) different from each other, (b) different from current gorilla buildings, (c) have rooftops not heavily covered by damage holes (at least 50% of roof width undamaged), (d) minimum 3 buildings apart from each other. New placement function, not reusing `placeGorillas`.
- "Poof" effect at old positions, sparkle at new positions, zappy sound
- No building damage, no points scored
- If it hits a gorilla directly: acts like a normal banana (scores the hit, no teleportation)
- Turn ends, switches to other player

### 7. Portal Banana
- Player throws two bananas in sequence (similar to Two Bananas flow)
- **Portal throws suppress all damage and scoring.** If a portal banana hits a gorilla or building, a portal marker is placed at the impact point but no damage/points occur. No building destruction either.
- Each banana ideally flies until it exits a screen edge; a portal marker is placed at the exit point (edge + y-coordinate)
- If a banana hits a building/gorilla before reaching an edge, portal placed at impact point (functional but less strategically useful)
- Two portal markers persist for the rest of the round
- Drawn as glowing colored ovals (orange for A, blue for B) on screen edges
- Any subsequent banana from either player entering Portal A exits Portal B with same velocity, and vice versa
- On portal transit: new projectile created at exit portal position with same velocity vector, `t=0` (see Ricochet physics note)
- Max 3 portal teleports per banana to prevent infinite loops
- If only one portal placed (second throw also hits a surface), single portal does nothing

### 8. Confetti Banana
- Flies identically to a normal banana (no visual distinction in flight)
- On any impact: colorful confetti particle burst, NO damage, NO points
- No building damage either
- Victim gorilla shows confused reaction bubble ("...What?", "Huh?!", "Confetti?!", "*blinks*")
- Thrower auto-dances
- Turn ends normally

### 9. Poison Banana
- On gorilla hit: no immediate damage/points, but marks victim as poisoned for 3 of their turns
- Poisoned gorilla drawn with green tint
- While poisoned: power meter sine output **clamped to 0.4 max** — meter visually stops at 40%, providing clear feedback that the gorilla is weakened
- On building/ground hit: acts like a normal banana (normal explosion, no poison applied)
- Poison counter decrements at the start of each of the poisoned player's turns
- Poison stacks do NOT accumulate — a second poison hit resets the counter to 3

## Architectural Notes

### Projectile Restart Pattern
The current physics model uses parametric equations: `position = f(startPos, velocity, t)`. Mid-flight velocity changes (bounces, wraps, portal exits) cannot be applied by mutating `vx`/`vy` since position is computed from `t=0`. Instead, these events **create a new projectile** from the event point with the modified velocity and `t=0`, preserving metadata like `bouncesRemaining`, `wrapsRemaining`, `portalPassesRemaining`. This is a clean pattern that avoids changing the physics model.

### Bananality Interaction
When Bananality triggers, ALL power-up state is reset: `selectedPowerUp = null`, `extraThrowRemaining = false`, `activeSubProjectiles = []`, portals cleared for the round. Bananality takes precedence over everything.

## State Design

### GameState additions
```
crate: PowerUpCrate | null
inventory: [PowerUpType[], PowerUpType[]]
selectedPowerUp: PowerUpType | null
extraThrowRemaining: boolean
isExtraThrow: boolean
portals: [Portal | null, Portal | null]
activeSubProjectiles: Projectile[]
poisonTurns: [number, number]
```

### Projectile additions
```
bouncesRemaining?: number
wrapsRemaining?: number
portalPassesRemaining?: number
isSubProjectile?: boolean
splitTimer?: number          // millis() timestamp of launch, for cluster bomb timing
explosionRadius?: number     // override for big banana / sub-projectiles
```

### New types
```typescript
type PowerUpType = "big_banana" | "two_bananas" | "ricochet" | "wrap_around"
  | "cluster_bomb" | "teleportation" | "portal" | "confetti" | "poison"

interface PowerUpCrate {
  x: number
  y: number
  targetY: number           // final landing Y
  buildingIdx: number
  powerUp: PowerUpType      // hidden from player
  falling: boolean
  fallY: number             // current Y during fall animation
  fallVx: number            // wind drift velocity
}

interface Portal {
  edge: "left" | "right"
  x: number
  y: number
  color: "orange" | "blue"
}
```

### GamePhase
No new phases needed. Power-ups modify existing phases:
- Two Bananas and Portal keep player in `aim` phase for a second throw
- Cluster bomb sub-projectiles handled within `flight` phase
- Teleportation resolves during `explosion` phase

## File Structure

### New files
- `src/powerups.ts` — Type definitions, crate spawn/placement, inventory management, selection cycling, crate drawing
- `src/powerup-behaviors.ts` — Flight/collision modifiers for each type (ricochet bouncing, cluster splitting, portal logic, wrap-around, confetti/teleport/poison effects)

### Modified files
- `src/types.ts` — New types (PowerUpType, PowerUpCrate, Portal), updated GameState and Projectile
- `src/collision.ts` — Crate collision check (after gorillas, before buildings), portal edge detection, wrap-around edge handling
- `src/physics.ts` — Projectile restart function for bounces/wraps/portals, cluster bomb split
- `src/sketch.ts` — Wire up crate spawning, B button cycling, power-up activation, extra throw handling. Delegates to new modules.
- `src/ui.ts` — Inventory icons, power-up aim indicator variants, portal markers, confetti particles, poison tint on gorilla
- `src/sound.ts` — New sounds: crate_collect, crate_land, powerup_select, teleport_zap, portal_whoosh, confetti_pop, cluster_split, poison_hit
- `src/gorilla.ts` — Poison green tint rendering

## Implementation Order
1. Core system: types, crate spawn/fall/collect, inventory, B-button cycling, HUD
2. Big Banana + Two Bananas (simplest, validates system)
3. Ricochet + Wrap-Around (edge interaction, validates projectile restart pattern)
4. Cluster Bomb
5. Confetti + Teleportation
6. Poison
7. Portal (most complex, saved for last)
