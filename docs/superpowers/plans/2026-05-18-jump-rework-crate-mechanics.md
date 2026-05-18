# Jump Rework, Crate Mechanics & Starting Items — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework jump into a permanent ability, make bananas destroy crates (instead of collecting them), add auto-collection via jumping, add floating text feedback, and add a starting items config option.

**Architecture:** Changes span config, types, powerups, sound, UI, and the main sketch. Each task targets one logical concern. The inventory HUD gets a "jump" entry above a divider; crate collision in flight switches from collect to destroy; new floating text state renders over gameplay; config screen gains a new row.

**Tech Stack:** TypeScript, P5.js, Vite, Bun

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/config.ts` | `MAX_INVENTORY = 5`, `STARTING_ITEMS_OPTIONS`, remove `"jump"` from `ALL_POWERUP_TYPES` |
| `src/types.ts` | Add `floatingText`, `startingItems` to GameState |
| `src/powerups.ts` | Update `collectCrate` return type, add `powerUpShortName()` |
| `src/sound.ts` | Add `"crate_destroy"`, randomize `"crate_collect"` |
| `src/ui.ts` | Jump as permanent HUD item, divider, blocked state, floating text draw |
| `src/sketch.ts` | HUD navigation rework, crate collision rework, auto-collect, floating text updates, config screen row, starting items |

---

### Task 1: Config & Types Foundation

**Files:**
- Modify: `src/config.ts:98` (MAX_INVENTORY), `src/config.ts:125-131` (ALL_POWERUP_TYPES)
- Modify: `src/types.ts:126-170` (GameState)

- [ ] **Step 1: Set MAX_INVENTORY to 5 and add STARTING_ITEMS_OPTIONS**

In `src/config.ts`, change:
```typescript
export const MAX_INVENTORY = 20; // TODO: revert to 3 after testing
```
to:
```typescript
export const MAX_INVENTORY = 5;
```

Add after `JUMP_ARC_HEIGHT`:
```typescript
export const STARTING_ITEMS_OPTIONS = [0, 1, 2, 3, 5];
```

- [ ] **Step 2: Remove "jump" from ALL_POWERUP_TYPES**

In `src/config.ts`, change the `ALL_POWERUP_TYPES` array to remove `"jump"` from the last line:
```typescript
export const ALL_POWERUP_TYPES: PowerUpType[] = [
  "big_banana", "two_bananas", "ricochet", "wrap_around",
  "cluster_bomb", "teleportation", "portal", "confetti", "poison",
  "ice", "mirror", "gravity_flip", "shield", "rubber", "homing",
  "ghost", "giant", "boomerang", "drunk", "earthquake",
  "demolition", "construction",
];
```

Note: `"jump"` stays in the `PowerUpType` union type in `types.ts` — it's still used as a `selectedPowerUp` value.

- [ ] **Step 3: Add floatingText and startingItems to GameState**

In `src/types.ts`, update the `selectedSlotIndex` comment from `// -1 = no selection, 0-2 = inventory slot` to `// -1 = jump (permanent), 0+ = inventory slot`.

Also add these fields to the `GameState` interface (before the closing `}`):
```typescript
  floatingText: { x: number; y: number; label: string; color: "red" | "green"; timer: number } | null;
  startingItems: number;
```

- [ ] **Step 4: Initialize new fields in createInitialState**

In `src/sketch.ts`, in `createInitialState()` (around line 87), add before the closing `};`:
```typescript
    floatingText: null,
    startingItems: 0,
```

- [ ] **Step 5: Verify build**

Run: `bun run build`
Expected: Build succeeds (TS may warn about unused fields, that's fine for now).

- [ ] **Step 6: Commit**

```bash
git add src/config.ts src/types.ts src/sketch.ts
git commit -m "feat: config & types foundation for jump rework and crate mechanics"
```

---

### Task 2: Sounds — crate_destroy and crate_collect randomization

**Files:**
- Modify: `src/sound.ts:9` (SoundName type), `src/sound.ts:356-370` (playCrateCollect)

- [ ] **Step 1: Add "crate_destroy" to SoundName type**

In `src/sound.ts`, add `"crate_destroy"` to the `SoundName` type union (line 9). Insert it after `"crate_collect"`.

- [ ] **Step 2: Add crate_destroy case to playSound switch**

In the `playSound` switch (around line 25), add:
```typescript
      case "crate_destroy": playCrateDestroy(); break;
```

- [ ] **Step 3: Implement playCrateDestroy**

Add after `playCrateCollect`:
```typescript
function playCrateDestroy() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(300, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, c.currentTime + 0.2);
  gain.gain.setValueAtTime(0.15, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.25);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.25);
}
```

- [ ] **Step 4: Randomize playCrateCollect**

Replace the existing `playCrateCollect` function with:
```typescript
function playCrateCollect() {
  const c = getCtx();
  const variants: number[][] = [
    [600, 800, 1000, 1200],
    [500, 700, 900, 1100],
    [700, 900, 1100, 1400],
  ];
  const notes = variants[Math.floor(Math.random() * variants.length)];
  notes.forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    const t = c.currentTime + i * 0.08;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.12);
  });
}
```

- [ ] **Step 5: Verify build**

Run: `bun run build`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/sound.ts
git commit -m "feat: add crate_destroy sound and randomize crate_collect"
```

---

### Task 3: powerUpShortName and collectCrate return type

**Files:**
- Modify: `src/powerups.ts:54-65` (collectCrate)

- [ ] **Step 1: Add powerUpShortName function**

Add to `src/powerups.ts` after the existing imports, before `trySpawnCrate`:
```typescript
export function powerUpShortName(type: PowerUpType): string {
  switch (type) {
    case "big_banana": return "BIG";
    case "two_bananas": return "x2";
    case "ricochet": return "RICOCHET";
    case "wrap_around": return "WRAP";
    case "cluster_bomb": return "CLUSTER";
    case "teleportation": return "TELEPORT";
    case "portal": return "PORTAL";
    case "confetti": return "CONFETTI";
    case "poison": return "POISON";
    case "ice": return "ICE";
    case "mirror": return "MIRROR";
    case "gravity_flip": return "GRAVITY";
    case "shield": return "SHIELD";
    case "rubber": return "RUBBER";
    case "homing": return "HOMING";
    case "ghost": return "GHOST";
    case "giant": return "GIANT";
    case "boomerang": return "BOOMERANG";
    case "drunk": return "DRUNK";
    case "earthquake": return "QUAKE";
    case "demolition": return "DEMOLISH";
    case "construction": return "BUILD";
    case "jump": return "JUMP";
    default: return (type as string).toUpperCase();
  }
}
```

- [ ] **Step 2: Update collectCrate return type**

Change `collectCrate` signature and body:
```typescript
export function collectCrate(state: GameState, playerIdx: 0 | 1): PowerUpType | "full" | null {
  if (!state.crate) return null;
  const powerUp = state.crate.powerUp;
  state.crate = null;

  if (state.inventory[playerIdx].length < MAX_INVENTORY) {
    state.inventory[playerIdx].push(powerUp);
    return powerUp;
  }
  return "full";
}
```

- [ ] **Step 3: Verify build**

Run: `bun run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/powerups.ts
git commit -m "feat: add powerUpShortName and update collectCrate return type"
```

---

### Task 4: Floating Text State & Rendering

**Files:**
- Modify: `src/sketch.ts` (floating text update logic, helper function)
- Modify: `src/ui.ts` (draw function)

- [ ] **Step 1: Add setFloatingText helper in sketch.ts**

In `src/sketch.ts`, add a helper function after `findBuildingUnderGorilla` (around line 664):
```typescript
  function setFloatingText(x: number, y: number, label: string, color: "red" | "green") {
    state.floatingText = { x, y, label, color, timer: 60 };
  }
```

- [ ] **Step 2: Add floating text timer update in drawGameplay**

In `src/sketch.ts`, in the `drawGameplay` function, after the crate drawing section (around line 1909 — note: Task 6 will later replace this section, and the floating text code should be placed after the new crate block), add:
```typescript
    // Update and draw floating text
    if (state.floatingText) {
      state.floatingText.timer--;
      if (state.floatingText.timer <= 0) {
        state.floatingText = null;
      }
    }
```

- [ ] **Step 3: Add drawFloatingText to ui.ts**

In `src/ui.ts`, add a new exported function (before or after `drawInventoryHUD`):
```typescript
export function drawFloatingText(p: p5, ft: { x: number; y: number; label: string; color: "red" | "green"; timer: number }): void {
  const progress = 1 - ft.timer / 60;
  const alpha = Math.floor(255 * (1 - progress));
  const yOffset = progress * 20;

  p.textSize(6);
  p.textAlign(p.CENTER, p.CENTER);
  p.noStroke();
  if (ft.color === "red") {
    p.fill(255, 0, 0, alpha);
  } else {
    p.fill(0, 255, 0, alpha);
  }
  p.text(ft.label, ft.x, ft.y - yOffset);
}
```

- [ ] **Step 4: Import and call drawFloatingText in sketch.ts**

Add `drawFloatingText` to the import from `"./ui"` in `src/sketch.ts` (line 32).

In `drawGameplay`, after the floating text timer update, add:
```typescript
    if (state.floatingText) {
      drawFloatingText(p, state.floatingText);
    }
```

- [ ] **Step 5: Verify build**

Run: `bun run build`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/sketch.ts src/ui.ts
git commit -m "feat: floating text state management and rendering"
```

---

### Task 5: Banana-Crate Collision Rework

**Files:**
- Modify: `src/sketch.ts:1078-1093` (case "crate" in flight collision)

- [ ] **Step 1: Import powerUpShortName**

Add `powerUpShortName` to the import from `"./powerups"` in `src/sketch.ts` (line 37).

- [ ] **Step 2: Replace the "crate" collision case**

Replace the `case "crate"` block (lines 1078-1093) with:
```typescript
      case "crate": {
        // Banana destroys crate — no explosion, banana continues or is consumed
        if (state.crate) {
          const shortName = powerUpShortName(state.crate.powerUp);
          setFloatingText(state.crate.x + 5, state.crate.y, shortName, "red");
          playSound("crate_destroy");
          state.crate = null;
        }
        // Don't stop the projectile — it continues its flight
        break;
      }
```

Note: The banana projectile is NOT set to null here. It continues flying. The collision system should be checked to confirm the projectile survives a crate hit. If the collision system already nulls the projectile for crate hits, this needs adjustment — the crate collision should be handled as a "pass-through" in the collision check, or the projectile should be re-activated.

- [ ] **Step 3: Also update sub-projectile crate collision**

There is a second `case "crate"` block for cluster bomb sub-projectiles (around line 1233). Replace it with the same destroy logic:
```typescript
        case "crate": {
          if (state.crate) {
            const shortName = powerUpShortName(state.crate.powerUp);
            setFloatingText(state.crate.x + 5, state.crate.y, shortName, "red");
            playSound("crate_destroy");
            state.crate = null;
          }
          // Sub-projectile continues
          break;
        }
```

- [ ] **Step 4: Verify build and test manually**

Run: `bun run build && bun run dev`
Test: Throw a banana at a crate. It should show red floating text and continue flying (not explode).

- [ ] **Step 5: Commit**

```bash
git add src/sketch.ts
git commit -m "feat: bananas destroy crates instead of collecting them"
```

---

### Task 6: Auto-Collection on Jump Landing & Crate Landing

**Files:**
- Modify: `src/sketch.ts:730-738` (jump landing), `src/sketch.ts:1905-1909` (crate fall)

- [ ] **Step 1: Add auto-collect on jump landing**

In `src/sketch.ts`, in the `updateJump` function, right after `gorilla.y = anim.endY;` (line 733) and before `state.jumpAnim = null;` (line 735), add:
```typescript
      // Auto-collect crate on landing building
      if (state.crate && !state.crate.falling) {
        const landingBldgIdx = findBuildingUnderGorilla(gorilla, state.buildings);
        if (landingBldgIdx >= 0 && landingBldgIdx === state.crate.buildingIdx) {
          const crateX = state.crate.x + 5;
          const crateY = state.crate.y;
          const result = collectCrate(state, anim.playerIdx);
          if (result === "full") {
            setFloatingText(crateX, crateY, "FULL!", "red");
            playSound("crate_destroy");
          } else if (result) {
            setFloatingText(crateX, crateY, powerUpShortName(result), "green");
            playSound("crate_collect");
          }
        }
      }
```

Important: `collectCrate` nulls `state.crate` internally, so crate position must be captured before the call (as shown above with `crateX`/`crateY`).

- [ ] **Step 2: Add auto-collect when crate lands on gorilla's building**

In `src/sketch.ts`, in `drawGameplay`, replace the existing crate section (lines 1906-1909):
```typescript
    if (state.crate) {
      updateCrateFall(state.crate);
      drawCrate(p, state.crate);
    }
```

with this version that detects the falling→landed transition and auto-collects (current player gets priority):
```typescript
    if (state.crate) {
      const wasFalling = state.crate.falling;
      updateCrateFall(state.crate);

      // Auto-collect if crate just landed on a gorilla's building
      if (wasFalling && !state.crate.falling) {
        const checkOrder = [state.currentPlayer - 1, state.currentPlayer === 1 ? 1 : 0];
        for (const gi of checkOrder) {
          if (!state.crate) break;
          const gIdx = findBuildingUnderGorilla(state.gorillas[gi], state.buildings);
          if (gIdx >= 0 && gIdx === state.crate.buildingIdx) {
            const crateX = state.crate.x + 5;
            const crateY = state.crate.y;
            const result = collectCrate(state, gi as 0 | 1);
            if (result === "full") {
              setFloatingText(crateX, crateY, "FULL!", "red");
              playSound("crate_destroy");
            } else if (result) {
              setFloatingText(crateX, crateY, powerUpShortName(result), "green");
              playSound("crate_collect");
            }
            break;
          }
        }
      }

      if (state.crate) drawCrate(p, state.crate);
    }
```

- [ ] **Step 3: Verify build and test**

Run: `bun run build && bun run dev`
Test: Jump to a building with a crate — should auto-collect with green text. Let a crate land on your building — should auto-collect.

- [ ] **Step 4: Commit**

```bash
git add src/sketch.ts
git commit -m "feat: auto-collect crates on jump landing and crate landing"
```

---

### Task 7: Inventory HUD — Jump as Permanent Item

**Files:**
- Modify: `src/ui.ts:566-665` (drawInventoryHUD)
- Modify: `src/sketch.ts:427-511` (updateAim)

- [ ] **Step 1: Rework drawInventoryHUD to show jump above divider**

In `src/ui.ts`, replace the `if (state.inventoryOpen)` block inside `drawInventoryHUD` (starting at line 585) with:

```typescript
  // Selected power-up overlay panel
  if (state.inventoryOpen) {
    const playerIdx = (state.currentPlayer - 1) as 0 | 1;
    const inv = state.inventory[playerIdx];

    // Panel dimensions — jump row + divider + inventory items
    const itemH = 12;
    const jumpRowH = itemH;
    const dividerH = 4;
    const inventoryH = inv.length > 0 ? Math.min(inv.length * itemH, 120 - jumpRowH - dividerH) : 0;
    const panelH = jumpRowH + dividerH + inventoryH + 8;
    const panelW = 80;
    const panelX = state.currentPlayer === 1 ? 4 : WIDTH - panelW - 4;
    const panelY = 20;

    // Semi-transparent background
    p.fill(0, 0, 0, 180);
    p.noStroke();
    p.rect(panelX, panelY, panelW, panelH);

    // Border
    p.stroke(255, 255, 100, 150);
    p.strokeWeight(1);
    p.noFill();
    p.rect(panelX, panelY, panelW, panelH);
    p.noStroke();

    // Jump row (always first)
    const jumpY = panelY + 4;
    const isJumpSelected = state.selectedSlotIndex === -1;
    const isJumpBlocked = state.poisonTurns[playerIdx] > 0 || state.iceTurns[playerIdx] > 0;

    if (isJumpSelected) {
      p.fill(255, 255, 100, 40);
      p.noStroke();
      p.rect(panelX + 2, jumpY - 1, panelW - 4, itemH);
    }

    // Jump icon (yellow triangle)
    if (isJumpBlocked) {
      p.fill(80, 80, 80);
    } else {
      p.fill(255, 255, 0);
    }
    p.noStroke();
    p.triangle(panelX + 6, jumpY + 8, panelX + 10, jumpY + 1, panelX + 14, jumpY + 8);

    // Jump label
    p.textSize(5);
    p.textAlign(p.LEFT, p.TOP);
    if (isJumpBlocked) {
      p.fill(80);
      p.text("JUMP", panelX + 18, jumpY + 2);
      p.fill(255, 60, 60);
      p.text("BLOCKED", panelX + 45, jumpY + 2);
    } else {
      p.fill(isJumpSelected ? 255 : 180);
      p.text("JUMP", panelX + 18, jumpY + 2);
    }

    // Divider line
    const divY = jumpY + itemH + 1;
    p.stroke(255, 255, 100, 80);
    p.strokeWeight(1);
    p.line(panelX + 4, divY, panelX + panelW - 4, divY);
    p.noStroke();

    // Inventory items
    const invStartY = divY + dividerH;
    const maxVisible = Math.floor(inventoryH / itemH);
    const scrollOffset = state.inventoryScrollOffset;

    for (let i = 0; i < Math.min(inv.length, maxVisible); i++) {
      const dataIdx = i + scrollOffset;
      if (dataIdx >= inv.length) break;
      const iy = invStartY + i * itemH;
      const isSelected = dataIdx === state.selectedSlotIndex;

      if (isSelected) {
        p.fill(255, 255, 100, 40);
        p.noStroke();
        p.rect(panelX + 2, iy - 1, panelW - 4, itemH);
      }

      drawPowerUpIcon(p, panelX + 4, iy + 1, 7, inv[dataIdx]);

      p.textSize(5);
      p.textAlign(p.LEFT, p.TOP);
      p.fill(isSelected ? 255 : 180);
      p.noStroke();
      p.text(powerUpDisplayName(inv[dataIdx]), panelX + 15, iy + 2);
    }

    // Scroll indicators
    if (scrollOffset > 0) {
      p.fill(255, 255, 100);
      p.textAlign(p.CENTER, p.TOP);
      p.textSize(4);
      p.text("^", panelX + panelW / 2, invStartY - 2);
    }
    if (maxVisible > 0 && scrollOffset + maxVisible < inv.length) {
      p.fill(255, 255, 100);
      p.textAlign(p.CENTER, p.BOTTOM);
      p.textSize(4);
      p.text("v", panelX + panelW / 2, panelY + panelH - 1);
    }

    // Hint text for focused item
    if (state.selectedPowerUp) {
      const hint = powerUpHint(state.selectedPowerUp);
      p.fill(200, 200, 150);
      p.noStroke();
      p.textSize(4);
      if (state.currentPlayer === 1) {
        p.textAlign(p.LEFT, p.TOP);
        p.text(hint, panelX + 2, panelY + panelH + 3);
      } else {
        p.textAlign(p.RIGHT, p.TOP);
        p.text(hint, panelX + panelW - 2, panelY + panelH + 3);
      }
    } else if (isJumpSelected) {
      // Show hint for jump too
      const hint = isJumpBlocked ? "Poison/ice blocks jumping." : "Leap to next building.";
      p.fill(200, 200, 150);
      p.noStroke();
      p.textSize(4);
      if (state.currentPlayer === 1) {
        p.textAlign(p.LEFT, p.TOP);
        p.text(hint, panelX + 2, panelY + panelH + 3);
      } else {
        p.textAlign(p.RIGHT, p.TOP);
        p.text(hint, panelX + panelW - 2, panelY + panelH + 3);
      }
    }
  }
```

- [ ] **Step 2: Rework updateAim HUD navigation for jump virtual index**

In `src/sketch.ts`, replace the `if (state.inventoryOpen)` block inside `updateAim` (lines 438-481) with:

```typescript
    if (state.inventoryOpen) {
      // Inventory HUD is open — dpad up/down navigates, B confirms, A cancels
      // selectedSlotIndex: -1 = jump (virtual top item), 0+ = inventory slots
      const inv = state.inventory[playerIdx];
      const curUp = input.dpadUp;
      const curDown = input.dpadDown;

      if (curUp && !prevDpadUp) {
        if (state.selectedSlotIndex > 0) {
          state.selectedSlotIndex--;
          state.selectedPowerUp = inv[state.selectedSlotIndex];
          // Scroll up only when selection goes above visible window
          if (state.selectedSlotIndex < state.inventoryScrollOffset) {
            state.inventoryScrollOffset = state.selectedSlotIndex;
          }
        } else if (state.selectedSlotIndex === 0) {
          // Move to jump
          state.selectedSlotIndex = -1;
          state.selectedPowerUp = null;
        }
        playSound("powerup_select");
      }
      if (curDown && !prevDpadDown) {
        if (state.selectedSlotIndex === -1 && inv.length > 0) {
          // Move from jump to first inventory item
          state.selectedSlotIndex = 0;
          state.selectedPowerUp = inv[0];
        } else if (state.selectedSlotIndex >= 0 && state.selectedSlotIndex < inv.length - 1) {
          state.selectedSlotIndex++;
          state.selectedPowerUp = inv[state.selectedSlotIndex];
          // Scroll down only when selection goes below visible window
          const itemH = 12;
          const dividerH = 4;
          const jumpRowH = itemH;
          const inventoryH = inv.length > 0 ? Math.min(inv.length * itemH, 120 - jumpRowH - dividerH) : 0;
          const maxVisible = Math.floor(inventoryH / itemH);
          if (maxVisible > 0 && state.selectedSlotIndex >= state.inventoryScrollOffset + maxVisible) {
            state.inventoryScrollOffset = state.selectedSlotIndex - maxVisible + 1;
          }
        }
        playSound("powerup_select");
      }
      prevDpadUp = curUp;
      prevDpadDown = curDown;

      // B confirms selection and closes
      if (input.b && !prevB) {
        if (state.selectedSlotIndex === -1) {
          // Trying to select jump
          const isBlocked = state.poisonTurns[playerIdx] > 0 || state.iceTurns[playerIdx] > 0;
          if (isBlocked) {
            playSound("crate_destroy"); // denied buzzer
          } else {
            state.selectedPowerUp = "jump";
            state.inventoryOpen = false;
            state.inventoryScrollOffset = 0;
            playSound("powerup_select");
          }
        } else {
          state.inventoryOpen = false;
          state.inventoryScrollOffset = 0;
          playSound("powerup_select");
        }
      }

      // A cancels — deselect and close
      if (input.a && !prevA) {
        state.selectedPowerUp = null;
        state.selectedSlotIndex = -1;
        state.inventoryOpen = false;
        state.inventoryScrollOffset = 0;
      }
    }
```

- [ ] **Step 3: Update HUD open to start at jump (index -1)**

In the `else` branch of `updateAim` (the `!state.inventoryOpen` case), change the B-button handler to always open HUD (not just when items exist), starting at jump:

```typescript
      // B opens inventory HUD (always available — jump is permanent)
      if (input.b && !prevB) {
        state.inventoryOpen = true;
        state.selectedSlotIndex = -1; // Start at jump
        state.selectedPowerUp = null;
        playSound("powerup_select");
      }
```

This replaces the existing B-button handler (lines 484-495).

- [ ] **Step 4: Verify build and test**

Run: `bun run build && bun run dev`
Test: Open inventory with B. Jump should appear at top with divider. Navigate down to items, back up to jump. Select jump with B when not debuffed.

- [ ] **Step 5: Commit**

```bash
git add src/sketch.ts src/ui.ts
git commit -m "feat: jump as permanent first item in inventory HUD"
```

---

### Task 8: Starting Items Config

**Files:**
- Modify: `src/sketch.ts:337-338` (config cursor range), `src/sketch.ts:340-363` (config options), `src/sketch.ts:385-417` (startNewRound)
- Modify: `src/ui.ts:534-540` (config screen settings)
- Modify: `src/config.ts` (import STARTING_ITEMS_OPTIONS — already added in Task 1)

- [ ] **Step 1: Import STARTING_ITEMS_OPTIONS in sketch.ts**

Add `STARTING_ITEMS_OPTIONS` to the import from `"./config"` in `src/sketch.ts` (line 3-23).

- [ ] **Step 2: Expand config cursor range**

In `src/sketch.ts`, change:
```typescript
    if (dpad === "down") configCursor = Math.min(4, configCursor + 1);
```
to:
```typescript
    if (dpad === "down") configCursor = Math.min(5, configCursor + 1);
```

- [ ] **Step 3: Add starting items config option handling**

In `src/sketch.ts`, after the `configCursor === 4` (HP) block (around line 363), add:
```typescript
      } else if (configCursor === 5) {
        const idx = STARTING_ITEMS_OPTIONS.indexOf(state.startingItems);
        const newIdx = (idx + dir + STARTING_ITEMS_OPTIONS.length) % STARTING_ITEMS_OPTIONS.length;
        state.startingItems = STARTING_ITEMS_OPTIONS[newIdx];
      }
```

- [ ] **Step 4: Add starting items row to config screen UI**

In `src/ui.ts`, in `drawConfigScreen`, add to the `settings` array (line 539, after GORILLA HP):
```typescript
    { label: "STARTING ITEMS", value: String(state.startingItems) },
```

- [ ] **Step 5: Update startNewRound to assign starting items**

In `src/sketch.ts`, in `startNewRound`, replace the testing inventory lines:
```typescript
    // TODO: remove after testing — give both players all power-ups each round
    state.inventory[0] = [...ALL_POWERUP_TYPES];
    state.inventory[1] = [...ALL_POWERUP_TYPES];
```
with:
```typescript
    // Assign random starting items
    state.inventory[0] = [];
    state.inventory[1] = [];
    for (let i = 0; i < state.startingItems; i++) {
      state.inventory[0].push(ALL_POWERUP_TYPES[Math.floor(Math.random() * ALL_POWERUP_TYPES.length)]);
      state.inventory[1].push(ALL_POWERUP_TYPES[Math.floor(Math.random() * ALL_POWERUP_TYPES.length)]);
    }
```

- [ ] **Step 6: Also clear floatingText on round start**

In `startNewRound`, add:
```typescript
    state.floatingText = null;
```

- [ ] **Step 7: Verify build and test**

Run: `bun run build && bun run dev`
Test: Config screen shows "STARTING ITEMS: 0". Use dpad to change. Start a game with 3 starting items — both players should have random items in inventory.

- [ ] **Step 8: Commit**

```bash
git add src/sketch.ts src/ui.ts
git commit -m "feat: starting items config option and round start assignment"
```

---

### Task 9: Final Verification & Cleanup

**Files:**
- Review: all modified files

- [ ] **Step 1: Full build check**

Run: `bun run build`
Expected: No errors, no warnings.

- [ ] **Step 2: Manual integration test**

Run: `bun run dev`

Test checklist:
- [ ] Inventory HUD opens with B, jump is at top with divider
- [ ] Can navigate down to power-ups and back up to jump
- [ ] Selecting jump with B sets it as active (yellow triangle aim indicator)
- [ ] Jump is grayed out and blocked when poisoned/frozen
- [ ] Throwing banana at a crate shows red floating text + buzzer, banana continues
- [ ] Jumping to a building with a crate auto-collects (green text + chime)
- [ ] Crate landing on gorilla's building auto-collects
- [ ] "FULL!" appears in red when inventory is full (5 items)
- [ ] Starting items config works (0, 1, 2, 3, 5)
- [ ] Starting items appear in inventory at round start
- [ ] Jump never appears in crate loot or starting items

- [ ] **Step 3: Commit any remaining fixes**

```bash
git add -A
git commit -m "fix: final polish for jump rework and crate mechanics"
```
