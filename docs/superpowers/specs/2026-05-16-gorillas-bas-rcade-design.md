# GORILLAS.BAS → RCade Port: Design Spec

## Overview

Port the classic QBasic GORILLAS.BAS (Microsoft, 1990) to the RCade arcade cabinet platform. The game is a two-player turn-based projectile game where gorillas standing on buildings throw exploding bananas at each other, accounting for angle, power, wind, and gravity.

The port targets a 336x262 pixel display with arcade controls (joystick, two buttons per player, spinner wheel, and system start buttons). All keyboard-based inputs from the original are replaced with arcade-friendly equivalents.

## Platform

- **Display**: 336x262 pixels (close to original's CGA mode of 320x200)
- **Framework**: P5.js (instance mode) + TypeScript
- **Build**: Vite
- **Input Plugins**: `@rcade/plugin-input-classic` + `@rcade/plugin-input-spinners`
- **Deployment**: GitHub Actions → RCade CDN

## Game States

```
TITLE → CONFIG → ROUND_START → AIM → POWER → FLIGHT ─┬─→ MISS ──────────→ AIM (other player)
                                                      ├─→ BUILDING_HIT ──→ EXPLOSION → AIM (other player)
                                                      └─→ GORILLA_HIT ───→ EXPLOSION → VICTORY → ROUND_START
                                                                                              ↓ (if final round)
                                                                                         GAME_OVER → TITLE
```

**Turn alternation**: Players alternate turns. After a round is won, the loser of that round takes the first turn in the next round.

**Win condition**: First player to reach the target score wins. The rounds setting (1/3/5/7) is the number of points needed to win (not total rounds played).

1. **TITLE** — Logo/intro screen. Press START to proceed.
2. **CONFIG** — Quick setup screen. Each player's own spinner re-rolls their own name. DPAD up/down moves a cursor between settings (Rounds, Gravity). DPAD left/right cycles the focused setting's value. Press START to begin.
3. **ROUND_START** — Generate cityscape, place gorillas on buildings, randomize wind. Brief pause, then first player's turn.
4. **AIM** — Active player's spinner rotates an angle indicator arrow around their gorilla. Press A to lock angle.
5. **POWER** — Oscillating power meter (constant speed, bounces between min and max). Player is already holding A from the lock-in; release A to set power and throw.
6. **FLIGHT** — Banana projectile animated along physics trajectory. Banana sprite rotates through 4 frames.
7. **EXPLOSION** — On hit: expanding/contracting circle animation. If gorilla hit: gorilla explosion animation.
8. **VICTORY** — Winning gorilla does arm-waving dance. Score updates. Brief pause, then next round.
9. **GAME_OVER** — Final scores displayed. Press START to return to TITLE.

## Controls

### Input Mapping

| Phase | Spinner | A Button | B Button | DPAD | START |
|-------|---------|----------|----------|------|-------|
| Title | — | — | — | — | Begin |
| Config | Re-roll own name (P1 spinner → P1 name, P2 spinner → P2 name) | — | — | Up/Down: move cursor between settings. Left/Right: cycle setting value | Confirm & start game |
| Aim | Rotate angle arrow | Lock angle (enter power phase) | — | — | — |
| Power | — | (held from aim) Release to throw | — | — | — |
| Flight | — | — | — | — | — |
| Game Over | — | — | — | — | Return to title |

### Turn Sequence Detail

1. **AIM phase begins**: Arrow appears around active gorilla. Only the active player's spinner is read; the other player's spinner is ignored. Spinner rotates the arrow continuously (wrapping 0°-360°). No numeric display — purely visual.
2. **Player presses A**: Angle locks. Arrow freezes in place. Power meter appears on the active player's side of the screen. A brief dead zone of 300ms begins where releasing A is ignored (prevents accidental instant-throw).
3. **POWER phase**: Meter oscillates at constant speed (1 full cycle per 1.5 seconds — up and back down). Meter starts at 0 (bottom) and rises. Visual is a vertical bar with gradient (green→yellow→red from bottom to top). White marker bounces up and down.
4. **Player releases A** (after dead zone): Power locks at current meter position. Banana is thrown.

### Angle Convention

- **0° = straight right** (standard math convention)
- Angle increases counter-clockwise (90° = straight up, 180° = straight left)
- Player 1 (left side): useful range is roughly 0°-90° (throwing right and up)
- Player 2 (right side): useful range is roughly 90°-180° (throwing left and up)
- The full 360° range is available (you can throw backwards/downward if you want)

### Spinner Sensitivity

- Each spinner step_delta increment = 2 degrees of rotation
- At ~60Hz repeat rate when held, this gives approximately 120°/sec of rotation — fast enough to sweep the full range quickly, precise enough to aim carefully with small taps

### Initial Angle

At the start of each turn:
- Player 1's angle resets to 45° (up and to the right — toward opponent)
- Player 2's angle resets to 135° (up and to the left — toward opponent)

### Development Keyboard Bindings

- Player 1 spinner: C (left) / V (right)
- Player 2 spinner: . (left) / / (right)
- Standard classic controls as per RCade defaults (WASD, F/G for P1; IJKL, ;/' for P2)

## Physics

Faithful port of the original's projectile model:

```
x(t) = startX + (Vx * t) + (0.5 * (wind / 5) * t²)
y(t) = startY - (Vy * t) + (0.5 * gravity * t²)
```

Where:
- `Vx = cos(angle) * velocity`
- `Vy = sin(angle) * velocity`
- `t` increments by 0.1 per physics step (matching original)
- `velocity` = power meter value mapped to 0-100 range. At 45° angle, 50% power (~50 velocity), no wind, Earth gravity, the banana should travel approximately half the screen width. Starting scale factor: ~2.5 (expect tuning during development).
- `gravity` = preset value (Earth: 9.8, Moon: 1.6, Jupiter: 24.8)
- `wind` = random integer in range -5 to +5. With 1/3 chance, the wind is strengthened: if positive, add a random 1-10; if negative, subtract a random 1-10. This gives a total possible range of -15 to +15 (matching original). Displayed as directional arrow at bottom of screen, length proportional to absolute value.

Y-axis scaling factor: `(screenHeight / 350)` as in original.

## Collision Detection (Geometry-Based)

### Checks (in order per physics step):
1. **Screen bounds** — banana exits left, right, or bottom → miss, turn passes. Exiting the **top** is NOT a miss (banana can arc above screen and return). Maximum flight time: if `t` exceeds 50.0 (500 physics steps) without resolution, treat as a miss to prevent infinite loops.
2. **Building rectangles** — banana center enters any building's bounding box → building hit (explosion, turn passes to other player)
3. **Gorilla bounding boxes** — banana center enters either gorilla's hitbox → gorilla hit (including self-hit). Scoring: if the thrower hits the opponent's gorilla, the thrower scores a point. If the thrower hits their own gorilla, the opponent scores the point (matching original).
4. **Sun hitbox** — banana passes through sun area → sun makes shocked face (cosmetic only, banana continues)

### Building Damage (deferred implementation)
Buildings store a `damage: Circle[]` array in their data structure. For MVP, this array remains empty and unused. When destructible buildings are implemented later:
- Each hit appends a `{ cx, cy, radius }` to the building's damage array
- Rendering subtracts damage circles from the building rectangle
- Collision checks account for damage (banana passes through craters)

## Cityscape Generation

Faithful to original algorithm:
- Random slope pattern selected (1 of 6: upward, downward, V-shape, inverted-V, etc.)
- Buildings generated left-to-right with random widths and heights influenced by slope
- Each building gets a random color (from a limited palette of 3-4 building colors)
- Windows drawn as a grid within each building (random lit/unlit)
- Gorilla 1 placed on a randomly chosen building (2nd or 3rd from left edge). Gorilla 2 placed on a randomly chosen building (2nd or 3rd from right edge). Random choice between 2nd and 3rd each round. Gorillas must be at least 3 buildings apart (guaranteed by placement logic since buildings fill the screen width).

### Building Data Structure

```typescript
interface Building {
  x: number;
  y: number;         // top of building
  width: number;
  height: number;
  color: string;
  windows: Window[];
  damage: Circle[];  // reserved for future destructibility
}

interface Window {
  x: number;
  y: number;
  lit: boolean;
}

interface Circle {
  cx: number;
  cy: number;
  radius: number;
}
```

## Gorillas

### Rendering
Drawn programmatically (not sprite-based), matching the original's blocky style:
- Head, body, arms, legs as filled rectangles and arcs
- Three arm states: both down, left up, right up
- Scaled to fit ~25px tall on 336x262 screen

### Animation States
- **Idle**: Arms down
- **Throwing**: Arm up on throwing side (brief flash during launch)
- **Victory dance**: Alternating left/right arm raises with sound

## UI Elements

### During Gameplay
- **Scores**: Top-left (P1) and top-right (P2), with player names
- **Score display**: Shows "P1Name: X | P2Name: Y" (scores only, no round counter — scores implicitly communicate progress toward win target)
- **Wind arrow**: Bottom-center, length proportional to wind strength
- **Sun**: Top-center, with happy/shocked face states
- **Angle indicator** (during AIM): Arrow/line rotating around active gorilla, extending ~20px from center
- **Power meter** (during POWER): Vertical bar on active player's side of screen, ~15px wide, ~80px tall

### Config Screen
- Game title at top
- Player 1 name (with "spin to re-roll" hint) — P1's spinner re-rolls
- Player 2 name (with "spin to re-roll" hint) — P2's spinner re-rolls
- Rounds (points to win): cycle with DPAD left/right (1, 3, 5, 7)
- Gravity: cycle with DPAD left/right (Moon, Earth, Jupiter)
- DPAD up/down moves a visible cursor between Rounds and Gravity settings
- Either player's DPAD works for navigation (cooperative setup, single shared cursor)
- "Press START" prompt at bottom

Note: States not listed in the controls table (MISS, EXPLOSION, VICTORY, ROUND_START, BUILDING_HIT) are non-interactive with timed/automatic transitions.

## Rendering Approach

All rendering done in P5.js `draw()` loop:
- Clear and redraw each frame (standard P5 approach)
- No pixel-buffer manipulation needed (unlike original's BASIC approach)
- Buildings, gorillas, UI all redrawn every frame
- Banana position updated per physics step, drawn at current position
- Explosion rendered as expanding/contracting circle over multiple frames (expands to 15px radius over 300ms, contracts over 200ms)

### Gorilla Hitbox

Gorilla hitbox matches the visual bounding box: approximately 20px wide x 25px tall (the full rendered gorilla area). No additional forgiveness padding.

## Sound

Deferred for MVP. The original uses PLAY statements for:
- Intro music
- Throw sound
- Explosion sound
- Victory dance music

P5.js has `p5.sound` or we can use the Web Audio API directly. Architecture should have a `playSound(name)` function that's a no-op initially and can be wired up later.

## File Structure (Planned)

```
src/
├── sketch.ts          # P5.js entry point, game loop, state machine
├── types.ts           # TypeScript interfaces (Building, Gorilla, etc.)
├── city.ts            # Cityscape generation
├── physics.ts         # Projectile physics simulation
├── collision.ts       # Geometry-based hit detection
├── gorilla.ts         # Gorilla rendering and animation
├── ui.ts              # HUD, menus, power meter, angle indicator
├── input.ts           # Input abstraction (spinner, buttons, DPAD)
├── config.ts          # Game constants, gravity presets, etc.
└── names.ts           # Random name lists
```

## Dependencies

### Already installed:
- `p5` ^1.11.3
- `@rcade/plugin-input-classic` ^0.2.1

### Needs install:
- `@rcade/plugin-input-spinners`

## Future Ideas (Parked)

These are noted for future development but explicitly out of scope for MVP:

- **Real-time simultaneous mode**: Both players aim and throw at the same time. Bananas can collide mid-air. Chaotic fun.
- **Destructible buildings**: Architecture is ready (damage[] array). Implement crater rendering and collision adjustment.
- **Custom gorilla skins**: Color options or hat/accessory selection on config screen.
- **Different banana types**: Homing, cluster bomb, heavy (affected more by gravity), boomerang.
- **Sound & music**: Retro chiptune soundtrack, satisfying throw/explosion/victory sounds.
- **Background art**: Night sky gradient, stars, moon/planet based on gravity setting.
- **Variable power meter speed**: Accelerating or per-round randomized speed as difficulty options.
- **More game settings**: Number of buildings, building height range, wind strength range.
- **High score / leaderboard**: Track wins per player name on the cabinet.

## Success Criteria (MVP)

1. Two players can take turns throwing bananas at each other
2. Spinner controls angle, A button locks angle then sets power via oscillating meter
3. Banana flies with correct physics (gravity + wind)
4. Banana hits buildings (stops) or gorillas (wins round)
5. Random cityscapes generated each round
6. Scores tracked across configurable number of rounds
7. Runs at stable 60fps on RCade cabinet (336x262)
8. Quick config screen with random names and presets
9. Wind indicator and sun with reactions
10. Victory dance animation
