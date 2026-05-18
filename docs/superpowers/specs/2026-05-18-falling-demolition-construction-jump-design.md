# Gorilla Falling System + Demolition, Construction, Jump Bananas

**Goal:** Add a gorilla falling system that detects when a gorilla's rooftop is destroyed, plus three new banana power-ups: demolition (destroys entire building), construction (repairs/extends buildings), and jump (gorilla leaps to adjacent building).

**Architecture:** A foundational falling system triggers after any explosion, checking rooftop integrity for each gorilla. Three new power-up types build on top of this system and the existing power-up infrastructure. Jump uses the same instant-effect pattern as shield (no projectile).

**Tech Stack:** P5.js, TypeScript, existing power-up/collision/city systems.

---

## 1. Gorilla Falling System

### Ground Support Check

New function `checkGorillaGroundSupport(gorilla, buildings): boolean` in `city.ts`:

- Uses center-based building lookup (consistent with existing `findBuildingUnderGorilla`): finds the building whose x range contains `gorilla.x + GORILLA_WIDTH / 2`.
- If no building found, or gorilla is at ground level (`y >= BOTTOM_LINE - GORILLA_HEIGHT`), return true (already grounded, no fall needed).
- If the building under the gorilla has `height <= 0` (demolished), return false immediately.
- Otherwise, samples 5 evenly-spaced points across the gorilla's foot span (`gorilla.x` to `gorilla.x + GORILLA_WIDTH`) at the building's rooftop Y.
- For each point, checks if it falls inside any damage circle on that building.
- If fewer than 30% of sample points have solid ground (70%+ destroyed), return false.

### Fall Trigger

New function `checkAndApplyFalling(state)` in `sketch.ts`:

- Called at the end of `updateExplosion()`, after damage is applied to buildings.
- Also called after sub-projectile explosions resolve in `updateSubProjectiles()`.
- For each gorilla at index `i`: if `state.fallingGorillas[i]` is already non-null, skip (already falling). Otherwise call `checkGorillaGroundSupport`. If no support, set `state.fallingGorillas[i] = { targetY: BOTTOM_LINE - GORILLA_HEIGHT }`.

### Fall Animation

New GameState field:

```typescript
fallingGorillas: [FallingAnim | null, FallingAnim | null];
```

Where:

```typescript
interface FallingAnim {
  targetY: number; // BOTTOM_LINE - GORILLA_HEIGHT
}
```

- `gorilla.y` is mutated directly each frame, moving toward `targetY` by `FALLING_SPEED` (4) pixels per frame.
- `fallingGorillas[i] !== null` serves as the "currently falling" guard — prevents re-triggering `checkGorillaGroundSupport` while already in a fall.
- When `gorilla.y >= targetY`, set `gorilla.y = targetY` and clear `state.fallingGorillas[i] = null`.

### Simultaneous Falls

Both gorillas can fall at the same time. The fall animation update runs for both indices independently. `resolveThrowEnd()` waits until **both** `state.fallingGorillas[0]` and `state.fallingGorillas[1]` are null before advancing the turn. A new helper `isFallingComplete(state): boolean` checks this.

### Fall Update Timing

A new `updateFallingGorillas(state)` function is called unconditionally at the **top** of `draw()`, before the `switch(state.phase)` block. This ensures falls resolve regardless of which phase the game is in (explosion, victory, round_start, etc.). It updates `gorilla.y` by `FALLING_SPEED` toward `targetY` and clears the animation when complete.

### Fall-Completion Gating

`resolveThrowEnd()` must not advance the turn while gorillas are still falling. The call order in `updateExplosion()` is:

1. Apply damage to building (push damage circle).
2. Call `checkAndApplyFalling(state)` — this may set `fallingGorillas[i]` for gorillas that lost ground.
3. If `isFallingComplete(state)` is false, return early — do NOT call `resolveThrowEnd()` yet.
4. The ongoing `updateFallingGorillas()` call at the top of `draw()` will resolve the falls over subsequent frames.
5. `updateExplosion()` re-enters each frame. Once the explosion timer has elapsed AND `isFallingComplete(state)` is true, proceed to `resolveThrowEnd()`.

This same gating applies to any path that calls `resolveThrowEnd()` — the check `isFallingComplete(state)` must pass first.

### Ground-Level Gorilla Behavior

Once a gorilla is at ground level, they remain there for the rest of the round. They can still aim and throw normally. They are more exposed (no building cover) but otherwise unaffected.

### Config

```typescript
export const FALLING_SPEED = 4; // pixels per frame
```

---

## 2. Demolition Banana

**New power-up type:** `"demolition"` added to `PowerUpType` union and `ALL_POWERUP_TYPES`.

### Flight

Normal banana physics. No special flight modifiers.

### Visual

Dark/black colored banana to suggest destruction. Small wrecking-ball aesthetic.

### On Building Hit

- Identify the hit building in the buildings array.
- Set `building.height = 0` and `building.y = BOTTOM_LINE`. Clear `building.windows = []` and `building.damage = []`.
- Do NOT splice the building from the array — indices are used elsewhere (crate placement, `findBuildingUnderGorilla`, etc.). Drawing loop skips buildings with `height <= 0`.
- If a crate exists on this building (`state.crate && state.crate.buildingIdx === hitBuildingIdx`), clear the crate: `state.crate = null`.
- Play explosion sound + unique demolition sound.
- Normal explosion animation at impact point.
- `checkAndApplyFalling()` runs after the explosion, automatically handling any gorilla that was on the demolished building.

### Collision Guard for Zero-Height Buildings

Add an explicit guard in `checkCollision()`: skip buildings with `height <= 0` in the building collision loop. This avoids degenerate edge cases where `building.y = BOTTOM_LINE` and `height = 0` could still match exact y-coordinate checks.

### On Gorilla Hit

Normal hit — deals HP damage, triggers explosion as usual.

### On Miss

Normal miss, no special effect.

### Config

- No special constants needed beyond existing explosion config.
- Add `"demolition"` to sound effects map.

---

## 3. Construction Banana

**New power-up type:** `"construction"` added to `PowerUpType` union and `ALL_POWERUP_TYPES`.

### Flight

Normal banana physics. No special flight modifiers.

### Visual

Bright green or hard-hat yellow banana.

### On Building Hit

- Clear all damage circles: `building.damage = []`.
- Extend building height by `CONSTRUCTION_HEIGHT_ADD` (30 pixels).
- Cap: `building.y = Math.max(building.y - CONSTRUCTION_HEIGHT_ADD, maxBuildingTop)` where `maxBuildingTop = 40 + GORILLA_HEIGHT`. Recompute `building.height = BOTTOM_LINE - building.y`.
- Regenerate windows for the new dimensions.
- Check each gorilla using `findBuildingUnderGorilla` (center-based lookup). If a gorilla's building matches the hit building, move them up: `gorilla.y = building.y - GORILLA_HEIGHT`.
- No explosion animation. Play a unique construction/build sound.
- No damage dealt.

### On Gorilla Hit

Treat as a normal hit — deals HP damage. The construction effect does not fire. Keeps behavior consistent: if you hit the gorilla, it's a hit.

### On Ground Hit (Gap Between Buildings)

- Create a new building at the impact x position.
- Width: `MIN_BUILDING_WIDTH` (25px), or fit to the available gap if smaller.
- Height: `CONSTRUCTION_BUILDING_HEIGHT` (80 pixels).
- Generate windows, assign random color from current city theme.
- Insert into buildings array at the correct sorted position (by x).
- After insertion, update `state.crate.buildingIdx` if a crate exists and its index is >= the insertion point (increment by 1).
- After insertion, check if any gorilla at ground level (`y >= BOTTOM_LINE - GORILLA_HEIGHT`) has their center x within the new building's x range. If so, place them on top: `gorilla.y = newBuilding.y - GORILLA_HEIGHT`. This prevents gorillas from being visually submerged inside the new building.

### On Miss (Off Screen / Timeout)

No effect.

### Config

```typescript
export const CONSTRUCTION_HEIGHT_ADD = 30;
export const CONSTRUCTION_BUILDING_HEIGHT = 80;
```

---

## 4. Jump Banana

**New power-up type:** `"jump"` added to `PowerUpType` union and `ALL_POWERUP_TYPES`.

### No Projectile

Like shield, this is an instant effect. Consumes the power-up and the turn. No banana is created or launched. Skips the power meter phase — pressing A during aim triggers the jump immediately.

### Direction

Uses the current aim angle to determine direction:
- `angle <= 90 || angle > 270` → jump right (includes straight up at 90°, which defaults to right)
- Otherwise → jump left

Note: angles exactly at vertical (90° straight up, 270° straight down) default to right. This is an acceptable edge case — 90° is already "mostly right" in aiming context and 270° is unreachable in normal gameplay.

Mirror effect: if the current player has `mirrorTurns > 0`, the direction is inverted (right becomes left, left becomes right). This is consistent with how mirror inverts aim for thrown bananas.

### Target Building

- Find the gorilla's current building via `findBuildingUnderGorilla` (center-based).
- Search for the next valid building in the aimed direction (index +1 for right, -1 for left).
- Skip buildings with `height <= 0` (demolished).
- If at the array edge with no valid building found, wrap around: continue searching from the other end of the array.
- If all buildings in that direction are demolished (full loop with no valid building), consume the turn but stay put.

### Game Phase During Jump

Jump uses a new phase `"jump"` added to the `GamePhase` type. When the player triggers a jump:
1. `state.phase = "jump"`, `state.jumpAnim` is populated.
2. `draw()` routes to `updateJump()` which advances the animation.
3. When animation completes, `resolveThrowEnd()` is called to advance the turn.

This avoids conflicting with aim or flight phase logic.

### Arc Animation

New GameState field:

```typescript
jumpAnim: JumpAnim | null;
```

Where:

```typescript
interface JumpAnim {
  playerIdx: 0 | 1;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  startTime: number;
  wrapDirection: "left" | "right" | null; // non-null for wrap-around jumps
}
```

- Duration: `JUMP_ARC_MS = 400`.

**Normal jumps (no wrap):**
- X: linear interpolation from startX to endX.
- Y: parabolic arc. Peak Y = `min(startY, endY) - 40` (always arcs above the higher building).

**Wrap-around jumps:**
- Two-segment animation. First half: gorilla moves from startX toward the screen edge in `wrapDirection`, arcing upward. Second half: gorilla appears from the opposite edge and moves to endX, arcing downward.
- The midpoint (screen edge crossing) happens at `t = 0.5` of the animation duration.
- X in first half: lerp from startX to edge (0 or WIDTH). X in second half: lerp from opposite edge to endX.
- Y arc: compute `peakY = min(startY, endY) - JUMP_ARC_HEIGHT`. At `t = 0.5`, the gorilla is at `peakY`. First half parabola interpolates Y from `startY` to `peakY`. Second half parabola interpolates Y from `peakY` to `endY`. Each segment uses a quadratic ease (decelerating into peak, accelerating out).

**Drawing:**
- During jump animation, the gorilla is NOT drawn at their stored x/y. Instead, `drawGorilla` uses the animated position from `jumpAnim`.
- The gorilla's `armState` is set to both arms up during the jump for a fun visual.

**Completion:**
- When elapsed time >= `JUMP_ARC_MS`: set `gorilla.x = endX`, `gorilla.y = endY`, clear `jumpAnim = null`, call `resolveThrowEnd()`.

### Sound

- Springy boing on launch.
- Thud on landing.

### Config

```typescript
export const JUMP_ARC_MS = 400;
export const JUMP_ARC_HEIGHT = 40; // pixels above higher building
```

---

## Files Changed

| File | Changes |
|------|---------|
| `src/types.ts` | Add `"demolition"`, `"construction"`, `"jump"` to `PowerUpType`. Add `"jump"` to `GamePhase`. Add `FallingAnim`, `JumpAnim` interfaces. Add `fallingGorillas` and `jumpAnim` to `GameState`. |
| `src/config.ts` | Add `FALLING_SPEED`, `CONSTRUCTION_HEIGHT_ADD`, `CONSTRUCTION_BUILDING_HEIGHT`, `JUMP_ARC_MS`, `JUMP_ARC_HEIGHT`. Add new types to `ALL_POWERUP_TYPES`. |
| `src/city.ts` | Add `checkGorillaGroundSupport()`. Add `insertBuilding()` for construction on-ground. |
| `src/collision.ts` | Add `height <= 0` guard to skip demolished buildings in collision loop. |
| `src/sketch.ts` | Add `checkAndApplyFalling()`, `updateFallingGorillas()`, `isFallingComplete()`, `updateJump()`. Handle demolition/construction/jump in `updateFlight()` and `launchBanana()`. Modify `updateExplosion()` to call falling check. Add `"jump"` case to `draw()` phase switch. |
| `src/powerup-behaviors.ts` | No flight modifiers needed for these three types. |
| `src/ui.ts` | Add display names and icons for three new types. Add jump phase drawing. |
| `src/sound.ts` | Add demolition, construction, jump_launch, jump_land sounds. |
| `src/gorilla.ts` | No changes expected. |

---

## Implementation Order

1. **Gorilla falling system** — foundational, must exist first.
2. **Demolition banana** — depends on falling system for gorilla-on-demolished-building case.
3. **Construction banana** — depends on falling system being stable (construction can affect gorilla positions, and new buildings interact with the ground-level gorilla case).
4. **Jump banana** — independent of demolition/construction but depends on demolished-building skipping logic from step 2.
