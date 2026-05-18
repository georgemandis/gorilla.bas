# Expanded Power-Up System Design

## Overview

Add 11 new banana power-up types to the existing 9, bringing the total to 20. All new types follow the established patterns: `PowerUpType` union, config constants, `applyPowerUpToProjectile()`, flight/collision handlers, inventory/crate/HUD integration.

## New Power-Up Types

### Debuff Bananas

**Ice Banana**
- On gorilla hit, freezes opponent's angle rotation for 3 turns
- Affected gorilla cannot use spinner to change aim angle during `updateAim()`
- Light blue tint overlay on frozen gorilla (same pattern as poison's green tint)
- Light blue banana during flight
- Debuff tracked as `iceTurns: [number, number]` on GameState
- Decrements same timing as poison: at round start and in `resolveThrowEnd()` else branch

**Mirror Banana**
- On gorilla hit, inverts opponent's horizontal aim for 3 turns
- In `launchBanana()`, negate the horizontal velocity component (`vx = -vx`)
- Purple tint overlay on mirrored gorilla
- Purple banana during flight
- Debuff tracked as `mirrorTurns: [number, number]` on GameState
- Same decrement timing as poison/ice

**Gravity Banana**
- On gorilla hit, flips gravity for opponent's next throw (1 turn)
- During flight, use negative gravity so banana arcs upward instead of down
- Yellow/orange tint overlay with a small inverted arrow indicator
- Yellow banana with swirl during flight
- Debuff tracked as `gravityTurns: [number, number]` on GameState
- Same decrement timing as other debuffs

**All debuffs stack independently.** A gorilla can be simultaneously poisoned, frozen, mirrored, and gravity-flipped.

### Defensive Banana

**Shield Banana**
- Throwing it deploys a shield on YOUR OWN gorilla (sacrifices offensive turn)
- Projectile suppresses all damage (like portal placement throws)
- Shield tracked as `shield: [boolean, boolean]` on GameState
- When a shielded gorilla takes a hit, shield absorbs it: no damage, no score, shield consumed
- Visual: translucent cyan bubble drawn around shielded gorilla
- Sound: shatter/pop on shield break
- Shield persists across turns until hit; cleared on new round

### Flight Modifier Bananas

**Rubber Banana**
- Bounces off buildings and screen edges with chaotic velocity changes
- On each bounce: multiply vx by random factor (0.5-1.5), add random vy perturbation, increase speed by 10%
- Explodes on 5th bounce (normal explosion radius)
- Uses `bouncesRemaining = 5` on Projectile (same field as ricochet)
- Cyan banana (like ricochet) with small spark effect on bounce
- New handler `handleRubberBounce()` in `powerup-behaviors.ts`

**Homing Banana**
- After apex (vertical velocity transitions from upward to downward), applies subtle horizontal nudge toward nearest gorilla each frame
- Nudge force: ~0.3 px/frame, gentle curve that rewards getting close but doesn't guarantee hits
- No extra projectile fields needed beyond `powerUpType === "homing"`
- Applied in `updateFlight()` by adjusting projectile position/velocity
- Red/orange banana with faint trail during flight

**Ghost Banana**
- Passes through buildings entirely, only collides with gorillas and crates
- In collision handling, skip building hit processing when `powerUpType === "ghost"`
- Normal explosion on gorilla hit
- Semi-transparent white banana that flickers every few frames

**Giant Banana**
- Massive hitbox: gorilla collision radius expanded by 3x
- Reduced power: multiply power by 0.5x in `launchBanana()`
- Huge explosion: `explosionRadius = EXPLOSION_RADIUS * 3`
- Draws as a comically large banana (3x scale, already supported by drawBanana's explosion radius scaling)

**Boomerang Banana**
- On miss (leaves screen left/right/bottom), instead of deactivating, restart projectile heading back toward the thrower's gorilla position
- One return pass only, tracked via `boomerangReturned?: boolean` on Projectile
- If it misses on the return pass, it's done
- Curved banana shape, rotates faster on return pass
- Risk of hitting yourself on return creates tactical depth

**Drunk Banana**
- Random sine-wave wobble applied to position during flight
- Wobble: `offset = sin(t * 8) * 15` pixels perpendicular to trajectory
- Applied to BOTH visual position AND collision detection position
- Normal banana visually but position wobbles unpredictably
- Makes aiming unreliable — a chaos/comedy pick

### Environmental Banana

**Earthquake Banana**
- On ANY collision (building, gorilla, ground), triggers earthquake effect
- Regenerates all building heights randomly while keeping gorillas on their buildings (adjust gorilla Y positions to new building tops)
- No explosion damage — the reshuffled city IS the effect
- Screen shake animation during quake (brief offset to all drawing)
- Brown/earth-toned banana during flight
- Uses `reshuffleBuildings()` in `city.ts`

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

## Files Modified

- `src/types.ts` — 11 new PowerUpType variants, new GameState fields, new Projectile field
- `src/config.ts` — New constants, extend `ALL_POWERUP_TYPES` array
- `src/powerup-behaviors.ts` — `handleRubberBounce()`, `applyHomingNudge()`, `applyDrunkWobble()`, `handleBoomerangReturn()`, extend `applyPowerUpToProjectile()`
- `src/sketch.ts` — Extend `updateFlight()`, `launchBanana()`, `updateAim()`, `drawBanana()`, gorilla hit handler (shield absorption, debuff application), earthquake trigger, screen shake
- `src/collision.ts` — Ghost banana skip-buildings option, giant banana expanded hitbox
- `src/ui.ts` — 11 new icons in `drawPowerUpIcon()`, 11 new names in `powerUpDisplayName()`, debuff indicators, shield bubble drawing
- `src/gorilla.ts` — Ice/mirror/gravity tint overlays extending existing poison tint pattern
- `src/sound.ts` — 11 new sounds following existing Web Audio synthesis pattern
- `src/city.ts` — `reshuffleBuildings()` for earthquake effect

## HUD and Visuals

**Gorilla tints (all stack, semi-transparent overlays):**
- Poison: green (exists)
- Ice: light blue
- Mirror: purple
- Gravity: yellow/orange + small flip arrow
- Shield: translucent cyan bubble

**Banana flight colors:**
| Type | Color/Style |
|------|-------------|
| Ice | Light blue |
| Mirror | Purple |
| Gravity | Yellow with swirl |
| Shield | Blue, flies toward self |
| Rubber | Cyan with sparks on bounce |
| Homing | Red/orange with faint trail |
| Ghost | Semi-transparent white, flickers |
| Giant | Yellow, 3x scale |
| Boomerang | Normal, faster rotation on return |
| Drunk | Normal, wobbles |
| Earthquake | Brown/earth-toned |

**Inventory icons:** Colored circles following existing pattern, unique color per type.

**Power-up name display:** Extends existing `powerUpDisplayName()` with: ICE, MIRROR, GRAVITY, SHIELD, RUBBER, HOMING, GHOST, GIANT, BOOMERANG, DRUNK, EARTHQUAKE.

## Reset and Persistence

- `iceTurns`, `mirrorTurns`, `gravityTurns`: persist across rounds (like `poisonTurns`)
- `shield`: cleared on new round
- `earthquakeTimer`: transient, resets naturally
- `createInitialState()`: all new fields zeroed/false
- `triggerBananality()`: reset all new debuff/shield state
- `startNewRound()`: clear shield, earthquake timer; keep debuff turn counters
