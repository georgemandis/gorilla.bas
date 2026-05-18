# Expanded Power-Up System Design

## Overview

Add 11 new banana power-up types to the existing 9, bringing the total to 20. All new types follow the established patterns: `PowerUpType` union, config constants, `applyPowerUpToProjectile()`, flight/collision handlers, inventory/crate/HUD integration.

All power-ups have equal spawn probability from crates (no rarity tiers).

## Debuff Decrement Convention

**Fix existing double-decrement:** Currently poison decrements in both `updateRoundStart()` and `resolveThrowEnd()`. Remove the `updateRoundStart()` decrement. All debuffs (poison, ice, mirror, gravity) decrement ONLY in `resolveThrowEnd()` else branch (on actual player switch, not extra throws). This gives accurate turn counts.

## New Power-Up Types

### Debuff Bananas

**Ice Banana**
- On gorilla hit, freezes opponent's angle rotation for 3 turns
- Affected gorilla cannot use spinner to change aim angle during `updateAim()` — spinner input is ignored, angle stays at whatever it was
- Light blue tint overlay on frozen gorilla (same pattern as poison's green tint)
- Light blue banana during flight
- Debuff tracked as `iceTurns: [number, number]` on GameState
- Decrements in `resolveThrowEnd()` else branch only

**Mirror Banana**
- On gorilla hit, inverts opponent's horizontal aim for 3 turns
- In `launchBanana()`, negate the horizontal velocity component (`vx = -vx`) after projectile creation
- The aim arrow indicator is ALSO inverted during `drawAngleIndicator()` — arrow points where banana will actually go, so the player must "think backwards" to aim correctly
- Purple tint overlay on mirrored gorilla
- Purple banana during flight
- Debuff tracked as `mirrorTurns: [number, number]` on GameState

**Gravity Banana**
- On gorilla hit, flips gravity for opponent's next throw (1 turn)
- During flight, use `gravity * -1` in the projectile position formula — banana arcs upward
- This is an intentionally severe debuff: the banana will fly off-screen upward. The player must aim steeply downward to compensate. It's a 1-turn debuff so the extreme effect is balanced by its brevity.
- Yellow/orange tint overlay with a small downward-pointing arrow icon above gorilla
- Yellow banana with swirl during flight
- Debuff tracked as `gravityTurns: [number, number]` on GameState

**All debuffs stack independently.** A gorilla can be simultaneously poisoned, frozen, mirrored, and gravity-flipped.

### Defensive Banana

**Shield Banana**
- Activation is instant — no projectile flies. In `launchBanana()`, when the power-up is "shield", set `shield[currentPlayerIdx] = true`, skip projectile creation entirely, and call `resolveThrowEnd()`
- Shield tracked as `shield: [boolean, boolean]` on GameState
- When a shielded gorilla takes a hit (including cluster bomb sub-projectiles), shield absorbs the FIRST hit only: no damage, no score, shield consumed. Any subsequent hits in the same volley (remaining sub-projectiles) deal damage normally.
- Visual: translucent cyan bubble drawn around shielded gorilla
- Sound: crystalline "deploy" sound on activation, shatter/pop on shield break
- Shield persists across turns until hit; cleared on new round and bananality (intentional)

### Flight Modifier Bananas

**Rubber Banana**
- Bounces off screen edges AND buildings with chaotic velocity changes
- Uses a SEPARATE field `rubberBouncesRemaining?: number` on Projectile (not shared with ricochet's `bouncesRemaining`)
- Screen edge bounces: handled in the existing miss path (same detection as ricochet/wrap), dispatched to `handleRubberBounce()` based on `powerUpType`
- Building bounces: in the `"building"` collision case, instead of exploding, call `handleRubberBounce()`. Building top surfaces reflect vertically (negate vy), building side surfaces reflect horizontally (negate vx). Use the collision position to determine which surface was hit: if the banana's x is within the building's x range, it hit the top; otherwise it hit a side.
- On each bounce: multiply vx by random factor (0.5-1.5), add random vy perturbation (+/- 30% of current vy), increase overall speed by 10%
- Explodes on 5th bounce with normal explosion radius
- Cyan banana with small spark particle effect on each bounce
- New handler `handleRubberBounce()` in `powerup-behaviors.ts`

**Homing Banana**
- After the projectile's apex (when screen-space vertical velocity transitions from upward to downward: `(-proj.vy + gravity * proj.t) > 0`), apply a small horizontal nudge toward the **opponent** gorilla each frame
- Nudge: adjust `proj.vx` by +/- 0.3 toward opponent's center x position
- No extra projectile fields needed beyond `powerUpType === "homing"`
- Applied in `updateFlight()` after `advanceProjectile()` but before collision check
- Red/orange banana with faint trail (draw 2-3 previous positions as fading dots)

**Ghost Banana**
- Passes through buildings entirely — skip building collision processing when `powerUpType === "ghost"`
- Still collides with gorillas, crates, and ground/screen edges (normal miss behavior)
- Deactivates normally on ground hit, edge miss, and `MAX_FLIGHT_T` timeout
- Normal explosion on gorilla hit
- Semi-transparent white banana (alpha ~120) that flickers every ~6 frames

**Giant Banana**
- Massive hitbox: expand gorilla bounding box check by `GIANT_HITBOX_MULT` (3x) in each direction when checking collision. Pass a `hitboxMult` parameter to `checkCollision()`, defaulting to 1.
- Reduced power: multiply `state.power` by `GIANT_POWER_MULT` (0.5) in `launchBanana()` before creating projectile
- Huge explosion: `explosionRadius = EXPLOSION_RADIUS * GIANT_EXPLOSION_MULT` (3x)
- Draws as a comically large banana (3x scale via existing drawBanana explosion radius scaling)
- The expanded hitbox applies to ALL gorillas (opponent and self) — you can bonk yourself with the giant hitbox

**Boomerang Banana**
- On screen edge miss (x < 0 or x > WIDTH) only — NOT on ground hit or timeout — trigger boomerang return
- Return mechanics: use `restartProjectile()` at the miss position, aimed toward the thrower's gorilla center. Compute angle from miss position to thrower's `(gorilla.x + GORILLA_WIDTH/2, gorilla.y + GORILLA_HEIGHT/2)`, launch at 70% of original speed.
- Set `proj.boomerangReturned = true` to prevent infinite returns
- On return pass: normal collision behavior (buildings block it, gorillas get hit — including the thrower!)
- If it misses again on return (any miss type), deactivate normally
- One extra Projectile field: `boomerangReturned?: boolean`
- Visual: faster rotation speed on return (double `bananaRotation` increment)

**Drunk Banana**
- Sine-wave wobble applied perpendicular to the INITIAL launch angle (fixed direction, not recomputed per frame)
- Wobble: compute perpendicular direction at launch as `perpX = -sin(launchAngle)`, `perpY = -cos(launchAngle)`. Each frame, offset = `sin(proj.t * 8) * DRUNK_WOBBLE_AMP` applied along this perpendicular.
- Applied to BOTH visual position AND collision detection position (offset the `pos` returned by `getProjectilePositionWithGravity` before checking collisions)
- Store launch angle on Projectile: `drunkPerpX?: number`, `drunkPerpY?: number`
- Normal yellow banana visually — the wobbling position IS the visual
- Makes aiming unreliable — a chaos/comedy pick

### Environmental Banana

**Earthquake Banana**
- On ANY collision (building, gorilla, ground miss), triggers earthquake effect. No explosion damage.
- Effect: call `reshuffleBuildings()` in `city.ts` which randomizes all building heights while preserving x positions and widths. Then reposition gorillas using `findBuildingUnderGorilla()` to get their current building index, then set `gorilla.y = building.y - GORILLA_HEIGHT`.
- Clear portals (`state.portals = [null, null]`) — they'd be floating in invalid positions
- Clear crate (`state.crate = null`) — same reason
- Deactivate all active sub-projectiles (`state.activeSubProjectiles = []`) — buildings shifted under them
- Screen shake: set `earthquakeTimer = millis()`. During drawing, offset all rendering by `random(-3, 3)` pixels for `EARTHQUAKE_SHAKE_MS` (500ms). After shake completes, call `resolveThrowEnd()`.
- Brown/earth-toned banana during flight

## State Changes

### GameState additions
```typescript
iceTurns: [number, number];       // turns of frozen angle per player
mirrorTurns: [number, number];    // turns of inverted aim per player
gravityTurns: [number, number];   // turns of flipped gravity per player
shield: [boolean, boolean];       // active shield per player
earthquakeTimer: number;          // millis timestamp for screen shake, 0 = inactive
```

### Projectile additions
```typescript
boomerangReturned?: boolean;      // true after boomerang has made its return pass
rubberBouncesRemaining?: number;  // separate from ricochet's bouncesRemaining
drunkPerpX?: number;              // perpendicular wobble direction (fixed at launch)
drunkPerpY?: number;
```

### Config constants
```
ICE_TURNS = 3
MIRROR_TURNS = 3
GRAVITY_TURNS = 1
RUBBER_MAX_BOUNCES = 5
HOMING_NUDGE = 0.3
DRUNK_WOBBLE_AMP = 15
GIANT_POWER_MULT = 0.5
GIANT_EXPLOSION_MULT = 3
GIANT_HITBOX_MULT = 3
EARTHQUAKE_SHAKE_MS = 500
```

## Gorilla Rendering

Change `drawGorilla` signature to accept a tints object instead of a single boolean:

```typescript
interface GorillaTints {
  poison?: boolean;
  ice?: boolean;
  mirror?: boolean;
  gravity?: boolean;
  shield?: boolean;
}

export function drawGorilla(p: p5, gorilla: Gorilla, costume?: GorillaCostume | null, tints?: GorillaTints): void
```

Each tint draws a semi-transparent overlay after the body, all stacking:
- Poison: green (0, 180, 0, 80) — already exists, migrate to new signature
- Ice: light blue (100, 200, 255, 80)
- Mirror: purple (180, 0, 255, 80)
- Gravity: yellow/orange (255, 180, 0, 80) + small downward arrow
- Shield: translucent cyan bubble (0, 255, 255, 60) circle around gorilla

## Files Modified

- `src/types.ts` — 11 new PowerUpType variants, new GameState fields, new Projectile fields, `GorillaTints` interface
- `src/config.ts` — New constants, extend `ALL_POWERUP_TYPES` array
- `src/powerup-behaviors.ts` — `handleRubberBounce()`, `applyHomingNudge()`, `applyDrunkWobble()`, `handleBoomerangReturn()`, extend `applyPowerUpToProjectile()`
- `src/sketch.ts` — Extend `updateFlight()`, `launchBanana()`, `updateAim()`, `drawBanana()`, gorilla hit handler (shield absorption, debuff application), earthquake trigger, screen shake, fix poison double-decrement
- `src/collision.ts` — Ghost banana skip-buildings option, giant banana `hitboxMult` parameter
- `src/ui.ts` — 11 new icons in `drawPowerUpIcon()`, 11 new names in `powerUpDisplayName()`, mirror aim arrow inversion
- `src/gorilla.ts` — Migrate `poisoned?: boolean` to `tints?: GorillaTints`, add ice/mirror/gravity/shield overlays
- `src/sound.ts` — 11 new sounds following existing Web Audio synthesis pattern
- `src/city.ts` — `reshuffleBuildings()` for earthquake effect

## HUD and Visuals

**Banana flight colors:**
| Type | Color/Style |
|------|-------------|
| Ice | Light blue |
| Mirror | Purple |
| Gravity | Yellow with swirl |
| Shield | N/A (no projectile) |
| Rubber | Cyan with sparks on bounce |
| Homing | Red/orange with faint trail dots |
| Ghost | Semi-transparent white, flickers |
| Giant | Yellow, 3x scale |
| Boomerang | Normal, faster rotation on return |
| Drunk | Normal yellow, wobbles |
| Earthquake | Brown/earth-toned |

**Inventory icons:** Colored circles following existing pattern, unique color per type.

**Power-up name display:** Extends existing `powerUpDisplayName()` with: ICE, MIRROR, GRAVITY, SHIELD, RUBBER, HOMING, GHOST, GIANT, BOOMERANG, DRUNK, EARTHQUAKE.

## Reset and Persistence

- `iceTurns`, `mirrorTurns`, `gravityTurns`: persist across rounds (like `poisonTurns`)
- `shield`: cleared on new round and bananality (intentional)
- `earthquakeTimer`: transient, resets naturally
- `createInitialState()`: all new fields zeroed/false
- `triggerBananality()`: reset all debuffs, shield, sub-projectiles, portals
- `startNewRound()`: clear shield, earthquake timer, portals, sub-projectiles; keep debuff turn counters and inventory
