import type { GameState, PowerUpCrate, PowerUpType } from "./types";
import {
  WIDTH, CRATE_SPAWN_CHANCE, CRATE_SIZE, ALL_POWERUP_TYPES, MAX_INVENTORY,
} from "./config";
import p5 from "p5";
import { playSound } from "./sound";

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

export function trySpawnCrate(state: GameState, wind: number): void {
  if (state.crate !== null) return;
  if (state.isExtraThrow) return;
  if (Math.random() >= CRATE_SPAWN_CHANCE) return;

  // Pick a building in the middle third
  const minX = WIDTH / 3;
  const maxX = (2 * WIDTH) / 3;
  const candidates = state.buildings
    .map((b, i) => ({ b, i }))
    .filter(({ b }) => {
      const cx = b.x + b.width / 2;
      return cx >= minX && cx <= maxX;
    });

  if (candidates.length === 0) return;

  const { b, i } = candidates[Math.floor(Math.random() * candidates.length)];
  const crateX = b.x + b.width / 2 - CRATE_SIZE / 2;
  const targetY = b.y - CRATE_SIZE;

  state.crate = {
    x: crateX,
    y: targetY,
    targetY,
    buildingIdx: i,
    powerUp: ALL_POWERUP_TYPES[Math.floor(Math.random() * ALL_POWERUP_TYPES.length)],
    falling: true,
    fallY: -20,
    fallVx: wind * 0.3,
  };
}

export function updateCrateFall(crate: PowerUpCrate): void {
  if (!crate.falling) return;

  crate.fallY += 1.5; // fall speed

  if (crate.fallY >= crate.targetY) {
    crate.fallY = crate.targetY;
    crate.falling = false;
    crate.y = crate.targetY;
    playSound("crate_land");
  }
}

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

export function cycleSelectedPowerUp(state: GameState, playerIdx: 0 | 1): void {
  const inv = state.inventory[playerIdx];
  if (inv.length === 0) {
    state.selectedPowerUp = null;
    state.selectedSlotIndex = -1;
    return;
  }

  if (state.selectedSlotIndex === -1 || state.selectedPowerUp === null) {
    state.selectedSlotIndex = 0;
    state.selectedPowerUp = inv[0];
  } else if (state.selectedSlotIndex >= inv.length - 1) {
    state.selectedSlotIndex = -1;
    state.selectedPowerUp = null;
  } else {
    state.selectedSlotIndex++;
    state.selectedPowerUp = inv[state.selectedSlotIndex];
  }
}

export function consumeSelectedPowerUp(state: GameState, playerIdx: 0 | 1): PowerUpType | null {
  const selected = state.selectedPowerUp;
  if (!selected) return null;

  // Jump is permanent — return it without consuming from inventory
  if (selected === "jump") {
    state.selectedPowerUp = null;
    state.selectedSlotIndex = -2;
    return "jump";
  }

  if (state.selectedSlotIndex < 0) return null;

  const inv = state.inventory[playerIdx];
  if (state.selectedSlotIndex < inv.length) {
    inv.splice(state.selectedSlotIndex, 1);
  }
  state.selectedPowerUp = null;
  state.selectedSlotIndex = -2;
  return selected;
}

export function drawCrate(p: p5, crate: PowerUpCrate): void {
  const drawX = crate.x;
  const drawY = crate.falling ? crate.fallY : crate.y;

  // Parachute during fall
  if (crate.falling) {
    p.stroke(200);
    p.strokeWeight(1);
    // Parachute canopy
    p.fill(255, 255, 255, 150);
    p.arc(drawX + CRATE_SIZE / 2, drawY - 8, 16, 10, Math.PI, Math.PI * 2);
    // Lines from canopy to crate
    p.line(drawX + CRATE_SIZE / 2 - 6, drawY - 5, drawX + 1, drawY);
    p.line(drawX + CRATE_SIZE / 2 + 6, drawY - 5, drawX + CRATE_SIZE - 1, drawY);
    p.noStroke();
  }

  // Crate box — flashing
  const flash = Math.floor(p.millis() / 300) % 2 === 0;
  p.fill(flash ? "#e8a020" : "#d06020");
  p.noStroke();
  p.rect(drawX, drawY, CRATE_SIZE, CRATE_SIZE);

  // Border
  p.stroke(flash ? "#ffcc44" : "#ff8844");
  p.strokeWeight(1);
  p.noFill();
  p.rect(drawX, drawY, CRATE_SIZE, CRATE_SIZE);

  // Question mark
  p.fill(255);
  p.noStroke();
  p.textSize(6);
  p.textAlign(p.CENTER, p.CENTER);
  p.text("?", drawX + CRATE_SIZE / 2, drawY + CRATE_SIZE / 2);
}
