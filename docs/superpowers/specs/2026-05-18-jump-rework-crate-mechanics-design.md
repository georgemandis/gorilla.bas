# Jump Rework, Crate Mechanics & Starting Items — Design Spec

## Goal

Rework jump from a collectible power-up into a permanent ability, overhaul crate collection to use jumping (not throwing), add floating text feedback for crate events, and add a starting items config option.

## Context

Currently jump is a power-up in the loot pool. Crates are collected by hitting them with bananas. This redesign makes jump always available (encouraging movement), makes bananas destroy crates (punishing bad aim near crates), and rewards players for jumping to crate buildings.

---

## Section 1: Jump as Permanent Ability

### Changes

- **Remove jump from `ALL_POWERUP_TYPES`** array in `powerups.ts`. It must not appear in crate loot or starting item rolls.
- **Jump is always available.** It does not occupy an inventory slot. Max inventory remains 5 slots for collectible power-ups only.
- **HUD display:** Jump appears as the first item in the inventory HUD, above a visual divider line, always present regardless of inventory contents.
- **Debuff interaction:** When the current player has active poison (`poisonTurns > 0`) or ice (`iceTurns > 0`), jump is grayed out in the HUD with a short explanation (e.g., "BLOCKED" in red next to the grayed-out jump entry). The player cannot select or use jump while debuffed.
- **Existing jump mechanics unchanged:** Arc animation, wrap-around, landing, gorilla repositioning all remain as-is.

### HUD Navigation

- Jump occupies a virtual position above the inventory list. When the HUD opens, the cursor starts at the jump entry (index -1 conceptually).
- Pressing **down** from jump moves to inventory slot 0 (if any items exist). Pressing **up** from slot 0 returns to jump.
- Pressing **B** on the jump entry sets `selectedPowerUp = "jump"` and closes the HUD.
- If jump is grayed out (debuffed), pressing B on it plays a short "denied" buzzer sound and does nothing — the HUD stays open.

### State Changes

- `selectedPowerUp` can still be `"jump"` when the player selects it from HUD, but jump is never stored in `inventory[]`.
- Keep `"jump"` in the `PowerUpType` union type. Only remove it from the `ALL_POWERUP_TYPES` array.
- No new GameState fields needed for this section.

---

## Section 2: Crate Collection Rework

### Banana-Crate Collision (Destroy)

- When a banana projectile collides with a crate during flight, the crate is **destroyed** (removed from state).
- No explosion phase is triggered for crate hits — the banana continues its flight (or explodes on a building/gorilla as normal). The crate simply disappears.
- A **red floating text** animation appears at the crate's position showing the power-up's short name (see Section 4 for names).
- A **negative sound effect** plays (buzzer/crunch).
- The power-up inside is lost — neither player gets it.

### Jump Landing Collection

- When a gorilla lands on a building after jumping, check if the current crate exists on that building.
- If so, **auto-collect**: add the power-up to the jumping player's inventory, remove the crate.
- A **green floating text** animation appears showing the power-up's short name.
- A **positive sound effect** plays (chime/sparkle, randomly picked from 2-3 variants).

### Crate Lands on Gorilla's Building

- When a crate finishes its falling animation and settles on a building (i.e., `crate.falling` becomes `false` in `updateCrateFall`), immediately after landing, check if either gorilla is on that building.
- Perform this check in the main draw loop right after `updateCrateFall` returns, so the landing sound plays first, then the collect sound.
- If a gorilla is present, **auto-collect** for that player (same green text + positive sound).
- If both gorillas are on the same building (unlikely but possible), the gorilla whose turn it is collects.

### Inventory Full

- If the collecting player's inventory is already at 5 items, the crate is destroyed and the item is lost.
- **Red floating text** shows "FULL!" instead of the power-up name.
- **Negative sound effect** plays.
- Update `collectCrate` to return `"full"` when inventory is at max, distinct from `null` (no crate). New return type: `PowerUpType | "full" | null`.

### Crate Spawning

- Unchanged. Crates still spawn randomly on buildings during rounds.

---

## Section 3: Starting Items Config

### Config Screen

- New row on the config screen: `"STARTING ITEMS: 0"`
- Spinner cycles through values: `[0, 1, 2, 3, 5]`
- Default: `0`

### State

- New field: `startingItems: number` in GameState.
- Default: `0` in `createInitialState()`.
- Set on the config screen. Persists across rounds within a match. Reset to default when a new GameState is created (i.e., returning to title/config for a new match).
- The options skip 4 intentionally — 5 is a "max chaos" option, not a linear scale.

### Config Screen Integration

- Add as a new row at the bottom of the config screen. Update cursor range to include the new row (currently 0-4, becomes 0-5).

### Round Start Behavior

- At the beginning of each round (in `startNewRound`), after clearing inventory:
  - For each player, roll `startingItems` random power-ups from `ALL_POWERUP_TYPES` (which no longer includes jump).
  - Duplicates are allowed.
  - Both players get the same count but different random items.
  - Items are added to `inventory[playerIdx]`.

---

## Section 4: Floating Text for Crate Events

### Display Names

| Power-Up | Short Name |
|----------|-----------|
| big_banana | BIG |
| two_bananas | x2 |
| ricochet | RICOCHET |
| wrap_around | WRAP |
| cluster_bomb | CLUSTER |
| teleportation | TELEPORT |
| portal | PORTAL |
| confetti | CONFETTI |
| poison | POISON |
| ice | ICE |
| mirror | MIRROR |
| gravity_flip | GRAVITY |
| shield | SHIELD |
| rubber | RUBBER |
| homing | HOMING |
| ghost | GHOST |
| giant | GIANT |
| boomerang | BOOMERANG |
| drunk | DRUNK |
| earthquake | QUAKE |
| demolition | DEMOLISH |
| construction | BUILD |

### Animation

- Text appears at the crate's `(x, y)` position.
- Drifts upward ~20px over 60 frames.
- Alpha fades from 255 to 0 over the same duration.
- Color: **red** (`#FF0000`) for destroyed/full, **green** (`#00FF00`) for collected.

### State

- New field: `floatingText: { x: number; y: number; label: string; color: "red" | "green"; timer: number } | null` in GameState.
- `timer` starts at 60, decrements each frame. When it reaches 0, set to `null`.
- Only one floating text at a time — if a new event fires while one is active, it overwrites the previous one. This is acceptable; overlapping crate events within 1 second are extremely rare.
- Floating text persists across phase changes and only clears via its own timer (not on phase change). This ensures text from a crate destroyed during flight is still visible during the subsequent explosion phase.

### Sound

- **Destroyed / Full:** Single buzzer sound (new `"crate_destroy"` sound).
- **Collected:** A `"crate_collect"` sound already exists in `sound.ts` (ascending arpeggio). Modify it to randomly pick from 2-3 positive chime variants for variety.

---

## Files Expected to Change

- `src/types.ts` — Add `floatingText` and `startingItems` to GameState. Keep `"jump"` in the `PowerUpType` union type (it's still used as a selected power-up value).
- `src/powerups.ts` — Remove `"jump"` from `ALL_POWERUP_TYPES`. Add `powerUpShortName()` function. Update `collectCrate` return type to `PowerUpType | "full" | null`.
- `src/sketch.ts` — Jump always-available logic in `updateAim`. Auto-collect on jump landing. Auto-collect on crate landing. Banana-crate collision in flight phase. Floating text rendering and timer. Starting items in `startNewRound`. Config screen starting items option.
- `src/ui.ts` — Jump as permanent first item in HUD with divider. "BLOCKED" display when debuffed. Floating text draw function.
- `src/sound.ts` — New `"crate_destroy"` and `"crate_collect"` sounds.
- `src/config.ts` — `MAX_INVENTORY = 5`. `STARTING_ITEMS_OPTIONS = [0, 1, 2, 3, 5]`.
