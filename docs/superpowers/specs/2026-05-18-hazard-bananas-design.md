# Hazard Bananas Design Spec

**Goal:** Add three new environmental hazard banana types (Fire, Lava, Storm) that create persistent battlefield effects lasting the remainder of the round.

**Architecture:** Each hazard is independent state on GameState. They stack freely. Damage from fire and storm is checked at turn start. Lava is checked every frame (passive death zone). All three reset at round start.

**Tech Stack:** P5.js, TypeScript, existing power-up infrastructure.

---

## 1. New PowerUpTypes

Add `"fire"`, `"lava"`, `"storm"` to the `PowerUpType` union in `types.ts` and to `ALL_POWERUP_TYPES` in `config.ts`. They appear in crates like all other power-ups.

Each gets: short name, display name, hint text, HUD icon, and aim indicator icon following existing patterns in `ui.ts` and `powerups.ts`.

These are normal crate-droppable power-ups (not permanent abilities like jump).

## 2. New GameState Fields

```typescript
burningBuildings: Set<number>  // indices of buildings currently on fire
lavaActive: boolean            // whether lava covers the ground
lavaHeight: number             // y-coordinate of lava surface
stormActive: boolean           // whether storm clouds are present
```

All reset at `startNewRound`: `burningBuildings` cleared, `lavaActive = false`, `lavaHeight = BOTTOM_LINE`, `stormActive = false`.

## 3. Fire Banana

### Throw
- Normal trajectory (angle + power), flies like a regular banana.
- No special projectile modifications at launch.

### On Building Hit
- No explosion. The hit building index is added to `burningBuildings`.
- If the building is already on fire, this is a silent no-op (Set deduplicates). No fizzle, no "?" — the fire simply persists.
- Animated flames drawn along the rooftop (orange/red/yellow flickering).
- Building tints slightly reddish.
- Crackling sound effect on ignition.

### On Gorilla Hit
- No impact damage. Find the building the gorilla is standing on (use `findBuildingUnderGorilla` or equivalent). If a building is found, add its index to `burningBuildings`. If no building is found (shouldn't happen in practice), fizzle with "?".

### On Miss (ground/off-screen)
- Fizzles with no effect. Throwing gorilla shows "?" speech bubble for ~1 second.

### Persistent Effect
- At start of each player's turn: if that player's gorilla is on a burning building, they take 1 HP damage.
- Red floating text: "-1 FIRE".
- If HP reaches 0, victory triggers for the other player.

### Building Destruction
- When a building is destroyed (demolition, earthquake, or other means), remove its index from `burningBuildings`. Fire does not transfer to other buildings.

## 4. Lava Banana

### Throw
- Normal trajectory (angle + power). Player must aim it so it reaches the ground between/past buildings without hitting anything.

### On Ground Hit
- No explosion. `lavaActive = true`.
- `lavaHeight` set to approximately `BOTTOM_LINE - LAVA_HEIGHT_OFFSET` (roughly 1 building height, tunable).
- Lava animates rising up from ground over ~500ms.
- Deep rumbling/bubbling sound effect.
- If lava is already active, this is a silent no-op — lava is already there, no fizzle needed.

### On Building or Gorilla Hit
- Fizzles with no effect. Throwing gorilla shows "?" speech bubble for ~1 second.

### Persistent Effect (checked every frame, not just turn-start)
- Any gorilla whose feet (bottom of bounding box: `gorilla.y + gorilla.height`) are at or below `lavaHeight` instantly dies (HP = 0).
- This is checked continuously (every frame during falling animations, jump landings, post-earthquake settling, etc.), not just at turn start.
- This means lava kills happen immediately when a gorilla falls into it mid-turn — no waiting for turn-start resolution.
- Lava drawn as bubbling orange/red layer across full screen width.
- Animated: undulating surface line, occasional bubble pops.
- Buildings appear partially submerged (lava drawn on top of lower building portions).

## 5. Storm Banana

### Throw
- Normal trajectory (angle + power). Player must aim it upward so it exits the top of the screen.

### On Exit Top of Screen
- `stormActive = true`.
- Dark storm clouds animate in from the top, covering upper ~40px of sky.
- Sun/moon gets obscured (drawn behind clouds or hidden).
- Thunder sound effect.
- If storm is already active, this is a silent no-op — storm is already present. No re-animation, no fizzle.

### On Building, Gorilla, or Ground Hit
- Fizzles with no effect. Throwing gorilla shows "?" speech bubble for ~1 second.

### Persistent Effect
- Once per turn at turn start: lightning strikes a random building chosen uniformly from all non-destroyed buildings (buildings with height > 0). Destroyed buildings are excluded from the pool. The same building can be struck on consecutive turns.
- Lightning visual always plays regardless of whether a gorilla is on the struck building: bright white jagged line from cloud to building top, brief white screen flash (~200ms). This is a visual-only effect when no gorilla is present.
- If a gorilla is on the struck building, they take 1 HP damage.
- Red floating text: "-1 ZAP" (uses existing red color for damage).
- Thunder crack sound on each strike.

## 6. Fizzle / "?" Speech Bubble

When any hazard banana fails its activation condition (fire hits ground/off-screen, lava hits building/gorilla, storm hits building/gorilla/ground), the banana disappears with no effect. The throwing gorilla displays a "?" above their head for ~1 second. This uses a dedicated fizzle overlay (not the `floatingText` field), drawn as white text centered above the gorilla.

A dull thud sound plays on fizzle.

## 7. Turn-Start Damage Resolution

At the start of each player's turn (entering `aim` phase), before the player can act:

1. **Fire check:** If current player's gorilla is on a burning building, deal 1 HP. Show "-1 FIRE" floating text (red). Wait ~500ms for visibility. If HP <= 0, go to victory. Stop here.
2. **Storm check:** Pick a random non-destroyed building for lightning strike. Play lightning visual + sound (~500ms). If current player's gorilla is on that building, deal 1 HP. Show "-1 ZAP" floating text (red). Wait ~500ms. If HP <= 0, go to victory. Stop here.

Lava is NOT checked at turn-start. It is checked every frame (see Section 4). If a gorilla is in lava at turn start, the continuous check will have already killed them before reaching the aim phase.

**Floating text sequencing:** Fire and storm effects are strictly sequential with delays between them. Each floating text displays and fades before the next effect begins. The existing single-slot `floatingText` field on GameState is sufficient since effects never overlap.

## 8. Stacking

All three hazards are independent and can be active simultaneously. A gorilla could theoretically take fire + lightning damage in the same turn start (2 HP total, resolved sequentially). Multiple buildings can be on fire at once (each fire banana adds to the set). Lava and storm are boolean — a second lava/storm banana that hits the correct target is a silent no-op (already active).

## 9. Power-Up Interactions

Hazard bananas are standalone power-ups. They do not combine with other power-ups (a player selects one power-up per throw). Interactions to note:

- **Ghost:** Not applicable — ghost is a separate power-up choice, not combined with fire/lava/storm.
- **Confetti:** Not applicable — same reason. A player chooses either confetti OR a hazard banana, not both.
- **Two bananas:** If a player uses two_bananas with a hazard banana equipped... they can't. Two_bananas is its own power-up. Only one power-up is active per throw.

In short: since the game has no power-up stacking/combining mechanic, there are no cross-power-up interaction concerns.

## 10. Visuals Summary

| Hazard | Aim Indicator Icon | HUD Icon | Building Effect | Screen Effect |
|--------|-------------------|----------|-----------------|---------------|
| Fire | Orange/red flame arc | Orange-red circle | Flames on rooftop, reddish tint | None |
| Lava | Dark red/brown arc | Dark red circle | Lower portions submerged | Bubbling lava layer at bottom |
| Storm | Gray/dark blue arc | Gray circle | Lightning flash on strike | Dark clouds across top, lightning bolts |

## 11. Sound Effects

| Event | Sound |
|-------|-------|
| Fire ignition | Crackling/sizzle |
| Fire damage (turn start) | Burn/sizzle hit |
| Lava activation | Deep rumble/bubble |
| Lava death | Dramatic sizzle/hiss |
| Storm activation | Thunder crack |
| Lightning strike | Sharp thunder crack |
| Fizzle ("?") | Dull thud |

## 12. Config Constants

```typescript
FIRE_DAMAGE_PER_TURN = 1
LAVA_RISE_MS = 500
LAVA_HEIGHT_OFFSET = 60        // pixels above BOTTOM_LINE
STORM_LIGHTNING_DELAY_MS = 500 // visual duration of lightning strike
FIZZLE_BUBBLE_MS = 1000        // how long "?" shows
HAZARD_DAMAGE_DELAY_MS = 500   // delay between sequential turn-start damage effects
```
