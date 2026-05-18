import p5 from "p5";
import type { GameState, TimeOfDay, PowerUpType, Portal } from "./types";
import {
  WIDTH,
  HEIGHT,
  POWER_METER_WIDTH,
  POWER_METER_HEIGHT,
  ANGLE_ARROW_LENGTH,
  SUN_X,
  SUN_Y,
  SUN_RADIUS,
  BOTTOM_LINE,
  GORILLA_WIDTH,
  GORILLA_HEIGHT,
} from "./config";
import { drawGorilla } from "./gorilla";

export function drawScores(p: p5, state: GameState): void {
  p.fill(255);
  p.textSize(6);
  p.noStroke();

  p.textAlign(p.LEFT, p.TOP);
  p.text(`${state.playerNames[0]}: ${state.scores[0]}`, 4, 3);

  p.textAlign(p.RIGHT, p.TOP);
  p.text(`${state.playerNames[1]}: ${state.scores[1]}`, WIDTH - 4, 3);
}

export function drawAngleIndicator(p: p5, state: GameState): void {
  const gorilla = state.gorillas[state.currentPlayer - 1];
  const centerX = gorilla.x + GORILLA_WIDTH / 2;
  const centerY = gorilla.y + GORILLA_HEIGHT / 2;

  const angleRad = (state.angle * Math.PI) / 180;
  // Mirror debuff: invert the displayed aim arrow horizontally
  const playerIdx = state.currentPlayer - 1;
  const effectiveAngle = state.mirrorTurns[playerIdx] > 0
    ? Math.PI - angleRad  // mirror horizontally
    : angleRad;
  const endX = centerX + Math.cos(effectiveAngle) * ANGLE_ARROW_LENGTH;
  const endY = centerY - Math.sin(effectiveAngle) * ANGLE_ARROW_LENGTH;

  // Faint halo around gorilla
  p.noFill();
  p.stroke(255, 200, 50, 50);
  p.strokeWeight(1);
  p.circle(centerX, centerY, ANGLE_ARROW_LENGTH * 2);

  // Pulsating banana on the halo showing aim direction
  const pulse = (Math.sin(p.millis() / 300) + 1) / 2; // 0..1
  const scale = 1 + pulse * 0.3;
  p.push();
  p.translate(endX, endY);
  p.rotate(-effectiveAngle);
  p.scale(scale);
  p.noStroke();
  switch (state.selectedPowerUp) {
    case "big_banana":
      p.fill(255, 255, 0);
      p.arc(0, 0, 12, 9, 0, Math.PI);
      break;
    case "two_bananas":
      p.fill(255, 255, 0);
      p.arc(-3, 0, 6, 4, 0, Math.PI);
      p.arc(3, 0, 6, 4, 0, Math.PI);
      break;
    case "ricochet":
      p.fill(0, 200, 255);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      break;
    case "wrap_around":
      p.fill(200, 0, 255);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      break;
    case "cluster_bomb":
      p.fill(255, 100, 0);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      p.fill(255, 255, 0);
      p.circle(-3, -3, 2);
      p.circle(3, -3, 2);
      break;
    case "teleportation":
      p.fill(0, 255, 200);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      break;
    case "portal":
      p.fill(255, 140, 0);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      p.noFill();
      p.stroke(0, 140, 255);
      p.strokeWeight(1);
      p.circle(0, 0, 10);
      p.noStroke();
      break;
    case "poison":
      p.fill(0, 200, 0);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      break;
    case "ice":
      p.fill(100, 200, 255);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      break;
    case "mirror":
      p.fill(180, 0, 255);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      break;
    case "gravity_flip":
      p.fill(255, 180, 0);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      break;
    case "shield":
      p.fill(0, 255, 255);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      break;
    case "rubber":
      p.fill(0, 220, 255);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      break;
    case "homing":
      p.fill(255, 80, 50);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      break;
    case "ghost":
      p.fill(255, 255, 255, 150);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      break;
    case "giant":
      p.fill(255, 255, 0);
      p.arc(0, 0, 12, 9, 0, Math.PI);
      break;
    case "boomerang":
      p.fill(255, 200, 100);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      break;
    case "drunk":
      p.fill(200, 100, 255);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      break;
    case "earthquake":
      p.fill(139, 90, 43);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      break;
    case "confetti":
    case null:
    default:
      p.fill(255, 255, 0);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      break;
  }
  p.pop();
}

export function drawActivePlayerIndicator(p: p5, state: GameState): void {
  const gorilla = state.gorillas[state.currentPlayer - 1];
  const centerX = gorilla.x + GORILLA_WIDTH / 2;
  const topY = gorilla.y - 12;

  // Blinking triangle arrow pointing down at active gorilla
  const blink = Math.sin(p.millis() / 200) > 0;
  if (blink) {
    p.fill(state.currentPlayer === 1 ? [100, 150, 255] : [255, 100, 100]);
    p.noStroke();
    p.triangle(
      centerX - 5, topY - 8,
      centerX + 5, topY - 8,
      centerX, topY
    );
  }

  // Player name label above
  p.fill(state.currentPlayer === 1 ? [100, 150, 255] : [255, 100, 100]);
  p.textSize(5);
  p.textAlign(p.CENTER, p.BOTTOM);
  p.noStroke();
  p.text(state.playerNames[state.currentPlayer - 1], centerX, topY - 10);
}

export function drawPowerMeter(p: p5, state: GameState): void {
  const meterX = state.currentPlayer === 1 ? 8 : WIDTH - 8 - POWER_METER_WIDTH;
  const meterY = HEIGHT / 2 - POWER_METER_HEIGHT / 2;

  p.fill(20, 20, 30);
  p.stroke(100);
  p.strokeWeight(1);
  p.rect(meterX, meterY, POWER_METER_WIDTH, POWER_METER_HEIGHT);

  const fillHeight = state.powerMeterValue * POWER_METER_HEIGHT;
  for (let i = 0; i < fillHeight; i++) {
    const ratio = i / POWER_METER_HEIGHT;
    const r = Math.min(255, ratio * 2 * 255);
    const g = Math.min(255, (1 - ratio) * 2 * 255);
    p.stroke(r, g, 0);
    p.line(
      meterX + 1,
      meterY + POWER_METER_HEIGHT - i,
      meterX + POWER_METER_WIDTH - 1,
      meterY + POWER_METER_HEIGHT - i
    );
  }

  const markerY = meterY + POWER_METER_HEIGHT - fillHeight;
  p.stroke(255);
  p.strokeWeight(2);
  p.line(meterX - 2, markerY, meterX + POWER_METER_WIDTH + 2, markerY);
}

export function drawSun(p: p5, shocked: boolean, timeOfDay: TimeOfDay = "day"): void {
  if (timeOfDay === "night") {
    drawMoon(p, shocked);
    drawStars(p);
    return;
  }

  p.fill(255, 220, 50);
  p.noStroke();
  p.circle(SUN_X, SUN_Y, SUN_RADIUS * 2);

  p.stroke(255, 220, 50);
  p.strokeWeight(1);
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    p.line(
      SUN_X + Math.cos(angle) * (SUN_RADIUS + 2),
      SUN_Y + Math.sin(angle) * (SUN_RADIUS + 2),
      SUN_X + Math.cos(angle) * (SUN_RADIUS + 6),
      SUN_Y + Math.sin(angle) * (SUN_RADIUS + 6)
    );
  }

  p.fill(0);
  p.noStroke();
  p.circle(SUN_X - 3, SUN_Y - 2, 3);
  p.circle(SUN_X + 3, SUN_Y - 2, 3);

  if (shocked) {
    p.circle(SUN_X, SUN_Y + 4, 5);
  } else {
    p.noFill();
    p.stroke(0);
    p.strokeWeight(1);
    p.arc(SUN_X, SUN_Y + 2, 8, 6, 0, Math.PI);
  }
}

function drawMoon(p: p5, shocked: boolean): void {
  // Full moon body
  p.fill(220, 220, 240);
  p.noStroke();
  p.circle(SUN_X, SUN_Y, SUN_RADIUS * 2);

  // Subtle craters for texture
  p.fill(200, 200, 220);
  p.circle(SUN_X - 4, SUN_Y - 3, 4);
  p.circle(SUN_X + 3, SUN_Y + 2, 3);
  p.circle(SUN_X + 5, SUN_Y - 4, 2);

  // Face — centered on the moon
  p.fill(80, 80, 100);
  p.noStroke();
  p.circle(SUN_X - 3, SUN_Y - 2, 2);
  p.circle(SUN_X + 3, SUN_Y - 2, 2);

  if (shocked) {
    p.circle(SUN_X, SUN_Y + 4, 5);
  } else {
    p.noFill();
    p.stroke(80, 80, 100);
    p.strokeWeight(1);
    p.arc(SUN_X, SUN_Y + 2, 8, 6, 0, Math.PI);
  }
}

// Deterministic stars based on position (so they don't flicker)
function drawStars(p: p5): void {
  p.noStroke();
  // Use a simple seeded approach — fixed star positions
  const stars = [
    [20, 15], [55, 8], [90, 20], [130, 12], [170, 5],
    [210, 18], [250, 10], [290, 22], [320, 8],
    [35, 35], [75, 42], [115, 30], [200, 38], [270, 45],
    [310, 32], [15, 50], [145, 48], [240, 55],
  ];
  for (const [sx, sy] of stars) {
    // Twinkle effect
    const twinkle = Math.sin(p.millis() / 500 + sx * 0.7) * 0.3 + 0.7;
    p.fill(255, 255, 240, twinkle * 255);
    p.circle(sx, sy, 1.5);
  }
}

export function drawEvilSun(p: p5, timeOfDay: TimeOfDay = "day"): void {
  const isNight = timeOfDay === "night";

  if (isNight) {
    drawStars(p);
  }

  // Larger, more menacing orb
  const pulse = Math.sin(p.millis() / 200) * 0.15 + 1;
  const r = SUN_RADIUS * 1.3 * pulse;

  if (isNight) {
    // Evil red moon
    p.fill(180, 40, 40);
    p.noStroke();
    p.circle(SUN_X, SUN_Y, r * 2);
    // Red glow
    p.fill(255, 0, 0, 30);
    p.circle(SUN_X, SUN_Y, r * 3.5);
  } else {
    // Evil red-orange sun
    p.fill(255, 80, 20);
    p.noStroke();
    p.circle(SUN_X, SUN_Y, r * 2);
    // Angry red rays
    p.stroke(255, 50, 0);
    p.strokeWeight(2);
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4 + p.millis() / 800;
      p.line(
        SUN_X + Math.cos(angle) * (r + 2),
        SUN_Y + Math.sin(angle) * (r + 2),
        SUN_X + Math.cos(angle) * (r + 8),
        SUN_Y + Math.sin(angle) * (r + 8)
      );
    }
  }

  // Evil eyes — slanted angry eyebrows + red eyes
  p.noStroke();
  // Eyebrows (angry V shape)
  p.stroke(0);
  p.strokeWeight(1);
  p.line(SUN_X - 5, SUN_Y - 3, SUN_X - 2, SUN_Y - 5); // left eyebrow angled down-in
  p.line(SUN_X + 5, SUN_Y - 3, SUN_X + 2, SUN_Y - 5); // right eyebrow angled down-in
  // Red eyes
  p.noStroke();
  p.fill(255, 0, 0);
  p.circle(SUN_X - 3, SUN_Y - 1, 3);
  p.circle(SUN_X + 3, SUN_Y - 1, 3);
  // Pupils
  p.fill(0);
  p.circle(SUN_X - 3, SUN_Y - 1, 1.5);
  p.circle(SUN_X + 3, SUN_Y - 1, 1.5);

  // Maniacal grin — wide, jagged
  const mouthOpen = Math.sin(p.millis() / 150) * 0.3 + 0.7; // oscillates for laughing
  p.fill(0);
  p.arc(SUN_X, SUN_Y + 3, 10, 6 * mouthOpen, 0, Math.PI);
  // Teeth
  p.fill(255);
  const teethY = SUN_Y + 3;
  for (let tx = SUN_X - 4; tx <= SUN_X + 3; tx += 2) {
    p.rect(tx, teethY - 1, 1.5, 2);
  }
}

export function drawWindArrow(p: p5, wind: number): void {
  if (wind === 0) return;

  const centerX = WIDTH / 2;
  const y = BOTTOM_LINE + 10;
  const endX = centerX + wind * 2;

  p.stroke(255, 100, 100);
  p.strokeWeight(1);
  p.line(centerX, y, endX, y);

  const dir = wind > 0 ? -1 : 1;
  p.line(endX, y, endX + dir * 3, y - 2);
  p.line(endX, y, endX + dir * 3, y + 2);
}

export function drawExplosion(p: p5, x: number, y: number, progress: number, maxRadius?: number): void {
  const radius = progress * (maxRadius ?? 15);
  p.fill(255, 100, 0, 200);
  p.noStroke();
  p.circle(x, y, radius * 2);
  p.fill(255, 255, 0, 150);
  p.circle(x, y, radius);
}

export function drawTitleScreen(p: p5): void {
  p.fill(255, 200, 50);
  p.textSize(12);
  p.textAlign(p.CENTER, p.CENTER);
  p.noStroke();
  p.text("GORILLA.BAS++", WIDTH / 2, HEIGHT / 3);

  p.fill(180);
  p.textSize(6);
  p.text("A 2P QBasic Classic", WIDTH / 2, HEIGHT / 3 + 22);

  // Dancing gorillas
  const danceFrame = Math.floor(p.millis() / 300) % 2;
  const leftArm = danceFrame === 0 ? "left_up" : "right_up";
  const rightArm = danceFrame === 0 ? "right_up" : "left_up";
  const centerY = HEIGHT / 2 + 10;

  drawGorilla(p, {
    x: WIDTH / 2 - 50, y: centerY,
    width: GORILLA_WIDTH, height: GORILLA_HEIGHT,
    playerNum: 1, armState: leftArm,
  });
  drawGorilla(p, {
    x: WIDTH / 2 + 30, y: centerY,
    width: GORILLA_WIDTH, height: GORILLA_HEIGHT,
    playerNum: 2, armState: rightArm,
  });

  p.fill(255);
  p.textSize(7);
  p.text("Press START", WIDTH / 2, HEIGHT * 3 / 4 + 15);
}

export function drawConfigScreen(
  p: p5,
  state: GameState,
  cursorPos: number
): void {
  p.fill(255, 200, 50);
  p.textSize(10);
  p.textAlign(p.CENTER, p.TOP);
  p.noStroke();
  p.text("GORILLA.BAS++", WIDTH / 2, 15);

  const startY = 45;
  const lineH = 24;

  p.textSize(6);
  p.textAlign(p.LEFT, p.TOP);
  p.fill(100, 150, 255);
  p.text(`P1: ${state.playerNames[0]}`, 30, startY);

  p.textAlign(p.RIGHT, p.TOP);
  p.fill(255, 100, 100);
  p.text(`P2: ${state.playerNames[1]}`, WIDTH - 30, startY);

  p.fill(80, 80, 120);
  p.textSize(5);
  p.textAlign(p.CENTER, p.TOP);
  p.text("(spin to re-roll)", WIDTH / 2, startY + 12);

  p.textAlign(p.LEFT, p.TOP);

  const settingsY = startY + lineH * 1.5;
  const settings = [
    { label: "POINTS TO WIN", value: String(state.targetScore) },
    { label: "GRAVITY", value: state.gravityPreset.toUpperCase() },
    { label: "TIME", value: state.timeOfDay.toUpperCase() },
    { label: "CITY", value: state.cityTheme.toUpperCase() },
    { label: "GORILLA HP", value: String(state.maxHP) },
  ];

  p.textSize(6);
  for (let i = 0; i < settings.length; i++) {
    const y = settingsY + i * lineH;
    const isSelected = cursorPos === i;

    if (isSelected) {
      p.fill(255, 200, 50);
      p.text(">", 20, y);
    }

    p.fill(isSelected ? 255 : 150);
    p.text(`${settings[i].label}:`, 30, y);
    if (isSelected) { p.fill(255, 255, 100); } else { p.fill(200); }
    p.textAlign(p.RIGHT, p.TOP);
    p.text(`< ${settings[i].value} >`, WIDTH - 20, y);
    p.textAlign(p.LEFT, p.TOP);
  }

  p.fill(100, 255, 100);
  p.textSize(6);
  p.textAlign(p.CENTER, p.TOP);
  p.text("Press START to play", WIDTH / 2, HEIGHT - 30);
}

export function drawInventoryHUD(p: p5, state: GameState): void {
  const iconSize = 5;
  const spacing = 7;

  // Player 1 inventory dots — below score, left side
  for (let i = 0; i < state.inventory[0].length; i++) {
    const x = 4 + i * spacing;
    const y = 12;
    drawPowerUpIcon(p, x, y, iconSize, state.inventory[0][i]);
  }

  // Player 2 inventory dots — below score, right side
  for (let i = 0; i < state.inventory[1].length; i++) {
    const x = WIDTH - 4 - (state.inventory[1].length - i) * spacing;
    const y = 12;
    drawPowerUpIcon(p, x, y, iconSize, state.inventory[1][i]);
  }

  // Selected power-up overlay panel
  if (state.inventoryOpen) {
    const playerIdx = (state.currentPlayer - 1) as 0 | 1;
    const inv = state.inventory[playerIdx];
    if (inv.length === 0) return;

    // Panel dimensions
    const itemH = 12;
    const panelW = 80;
    const panelH = Math.min(inv.length * itemH + 8, 120);
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

    // Items list (scrollable if too many)
    const maxVisible = Math.floor((panelH - 8) / itemH);
    let scrollOffset = 0;
    if (state.selectedSlotIndex >= maxVisible) {
      scrollOffset = state.selectedSlotIndex - maxVisible + 1;
    }

    for (let i = 0; i < Math.min(inv.length, maxVisible); i++) {
      const dataIdx = i + scrollOffset;
      if (dataIdx >= inv.length) break;
      const iy = panelY + 4 + i * itemH;
      const isSelected = dataIdx === state.selectedSlotIndex;

      // Highlight selected row
      if (isSelected) {
        p.fill(255, 255, 100, 40);
        p.noStroke();
        p.rect(panelX + 2, iy - 1, panelW - 4, itemH);
      }

      // Icon
      drawPowerUpIcon(p, panelX + 4, iy + 1, 7, inv[dataIdx]);

      // Label
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
      p.text("^", panelX + panelW / 2, panelY + 1);
    }
    if (scrollOffset + maxVisible < inv.length) {
      p.fill(255, 255, 100);
      p.textAlign(p.CENTER, p.BOTTOM);
      p.textSize(4);
      p.text("v", panelX + panelW / 2, panelY + panelH - 1);
    }
  }
}

function powerUpDisplayName(type: PowerUpType): string {
  switch (type) {
    case "big_banana": return "BIG BANANA";
    case "two_bananas": return "2x BANANA";
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
    case "earthquake": return "EARTHQUAKE";
    case "demolition": return "DEMOLITION";
    case "construction": return "BUILD";
    case "jump": return "JUMP";
    default: return (type as string).toUpperCase();
  }
}

function drawPowerUpIcon(p: p5, x: number, y: number, size: number, type: PowerUpType): void {
  p.noStroke();
  switch (type) {
    case "big_banana":
      p.fill(255, 255, 0);
      p.circle(x + size / 2, y + size / 2, size);
      break;
    case "two_bananas":
      p.fill(255, 255, 0);
      p.circle(x + 1, y + size / 2, size * 0.7);
      p.circle(x + size - 1, y + size / 2, size * 0.7);
      break;
    case "ricochet":
      p.fill(0, 200, 255);
      p.circle(x + size / 2, y + size / 2, size);
      break;
    case "wrap_around":
      p.fill(200, 0, 255);
      p.circle(x + size / 2, y + size / 2, size);
      break;
    case "cluster_bomb":
      p.fill(255, 100, 0);
      p.circle(x + size / 2, y + size / 2, size);
      break;
    case "teleportation":
      p.fill(0, 255, 200);
      p.circle(x + size / 2, y + size / 2, size);
      break;
    case "portal":
      p.fill(255, 140, 0);
      p.circle(x + size / 2, y + size / 2, size);
      p.fill(0, 140, 255);
      p.circle(x + size / 2, y + size / 2, size * 0.5);
      break;
    case "confetti":
      p.fill(255, 255, 0);
      p.circle(x + size / 2, y + size / 2, size);
      break;
    case "poison":
      p.fill(0, 200, 0);
      p.circle(x + size / 2, y + size / 2, size);
      break;
    case "ice":
      p.fill(100, 200, 255);
      p.circle(x + size / 2, y + size / 2, size);
      break;
    case "mirror":
      p.fill(180, 0, 255);
      p.circle(x + size / 2, y + size / 2, size);
      break;
    case "gravity_flip":
      p.fill(255, 180, 0);
      p.circle(x + size / 2, y + size / 2, size);
      break;
    case "shield":
      p.fill(0, 255, 255);
      p.circle(x + size / 2, y + size / 2, size);
      break;
    case "rubber":
      p.fill(0, 220, 255);
      p.circle(x + size / 2, y + size / 2, size);
      p.fill(255);
      p.circle(x + size / 2, y + size / 2, size * 0.3);
      break;
    case "homing":
      p.fill(255, 80, 50);
      p.circle(x + size / 2, y + size / 2, size);
      break;
    case "ghost":
      p.fill(255, 255, 255, 150);
      p.circle(x + size / 2, y + size / 2, size);
      break;
    case "giant":
      p.fill(255, 255, 0);
      p.circle(x + size / 2, y + size / 2, size * 1.3);
      break;
    case "boomerang":
      p.fill(255, 200, 100);
      p.circle(x + size / 2, y + size / 2, size);
      break;
    case "drunk":
      p.fill(200, 100, 255);
      p.circle(x + size / 2, y + size / 2, size);
      break;
    case "earthquake":
      p.fill(139, 90, 43);
      p.circle(x + size / 2, y + size / 2, size);
      break;
    case "demolition":
      p.fill(40, 40, 40);
      p.circle(x + size / 2, y + size / 2, size);
      p.fill(80, 80, 80);
      p.circle(x + size / 2, y + size / 2, size * 0.4);
      break;
    case "construction":
      p.fill(50, 200, 50);
      p.circle(x + size / 2, y + size / 2, size);
      break;
    case "jump":
      p.fill(255, 255, 0);
      p.triangle(x + size / 2, y, x, y + size, x + size, y + size);
      break;
    default:
      p.fill(150);
      p.circle(x + size / 2, y + size / 2, size);
      break;
  }
}

export function drawHP(p: p5, state: GameState): void {
  if (state.maxHP <= 1) return; // Don't show hearts in classic 1-HP mode

  for (let pi = 0; pi < 2; pi++) {
    const gorilla = state.gorillas[pi];
    const centerX = gorilla.x + GORILLA_WIDTH / 2;
    const startY = gorilla.y - 8;
    const hp = state.hp[pi];
    const maxHP = state.maxHP;
    const heartSize = 4;
    const spacing = heartSize + 1;
    const totalWidth = maxHP * spacing - 1;
    const startX = centerX - totalWidth / 2;

    for (let h = 0; h < maxHP; h++) {
      const hx = startX + h * spacing;
      if (h < hp) {
        p.fill(255, 50, 50);
      } else {
        p.fill(60, 60, 60);
      }
      p.noStroke();
      // Simple heart: two circles + triangle
      const r = heartSize / 4;
      p.circle(hx + r, startY - r * 0.5, r * 2);
      p.circle(hx + heartSize - r, startY - r * 0.5, r * 2);
      p.triangle(hx, startY, hx + heartSize, startY, hx + heartSize / 2, startY + heartSize * 0.6);
    }
  }
}

export function drawPortals(p: p5, portals: [Portal | null, Portal | null]): void {
  for (const portal of portals) {
    if (!portal) continue;
    const pulse = Math.sin(p.millis() / 300) * 0.2 + 0.8;

    if (portal.color === "orange") {
      p.fill(255, 140, 0, 150 * pulse);
      p.stroke(255, 180, 50, 200 * pulse);
    } else {
      p.fill(0, 100, 255, 150 * pulse);
      p.stroke(50, 150, 255, 200 * pulse);
    }
    p.strokeWeight(1);
    p.ellipse(portal.x, portal.y, 12, 18);
  }
}

export function drawGameOver(p: p5, state: GameState): void {
  p.fill(255, 100, 100);
  p.textSize(12);
  p.textAlign(p.CENTER, p.CENTER);
  p.noStroke();
  p.text("GAME OVER", WIDTH / 2, HEIGHT / 3);

  p.fill(255);
  p.textSize(6);
  p.text(`${state.playerNames[0]}: ${state.scores[0]}`, WIDTH / 2, HEIGHT / 2 - 10);
  p.text(`${state.playerNames[1]}: ${state.scores[1]}`, WIDTH / 2, HEIGHT / 2 + 14);

  const winner = state.scores[0] >= state.targetScore ? state.playerNames[0] : state.playerNames[1];
  p.fill(255, 200, 50);
  p.textSize(7);
  p.text(`${winner} wins!`, WIDTH / 2, HEIGHT / 2 + 40);

  p.fill(150);
  p.textSize(6);
  p.text("Press START", WIDTH / 2, HEIGHT * 3 / 4);
}
