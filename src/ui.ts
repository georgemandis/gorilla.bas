import p5 from "p5";
import type { GameState, TimeOfDay, PowerUpType, Portal } from "./types";
import type { Award, NameAward } from "./stats";
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
  CITY_THEME_COLORS,
  AWARD_REVEAL_1_MS, AWARD_REVEAL_2_MS, AWARD_BONUS_MS,
  AWARD_FADE_MS, AWARD_START_VISIBLE_MS,
} from "./config";
import { drawGorilla } from "./gorilla";

export function drawScores(p: p5, state: GameState): void {
  p.fill(255);
  p.textSize(6);
  p.noStroke();

  p.textAlign(p.LEFT, p.TOP);
  p.text(`${state.playerNames[0]}: ${state.scores[0]}`, 6, 5);

  p.textAlign(p.RIGHT, p.TOP);
  p.text(`${state.playerNames[1]}: ${state.scores[1]}`, WIDTH - 6, 5);
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
      p.stroke(255, 255, 255, 180);
      p.strokeWeight(1);
      p.line(-2, -2, 0, -4);
      p.line(0, -4, 2, -2);
      p.noStroke();
      break;
    case "wrap_around":
      p.fill(200, 0, 255);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      p.stroke(255, 255, 255, 150);
      p.strokeWeight(1);
      p.line(-4, 0, -3, -2);
      p.line(4, 0, 3, -2);
      p.noStroke();
      break;
    case "cluster_bomb":
      p.fill(255, 100, 0);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      p.fill(255, 255, 0);
      p.circle(-2, -2, 2);
      p.circle(2, -2, 2);
      p.circle(0, -3, 2);
      break;
    case "teleportation":
      p.fill(0, 255, 200);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      p.stroke(255, 255, 255, 200);
      p.strokeWeight(1);
      p.line(-1, -3, 1, -1);
      p.line(1, -1, -1, 1);
      p.noStroke();
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
    case "confetti":
      p.fill(255, 100, 200);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      p.fill(255, 255, 0);
      p.circle(-2, -2, 1.5);
      p.fill(0, 255, 200);
      p.circle(2, -1, 1.5);
      p.fill(100, 100, 255);
      p.circle(0, -3, 1.5);
      break;
    case "poison":
      p.fill(0, 200, 0);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      p.fill(0, 255, 0, 180);
      p.circle(0, 2, 2);
      break;
    case "ice":
      p.fill(100, 200, 255);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      p.stroke(255, 255, 255, 200);
      p.strokeWeight(1);
      p.line(0, -3, 0, -1);
      p.line(-1, -2, 1, -2);
      p.noStroke();
      break;
    case "mirror":
      p.fill(180, 0, 255);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      p.stroke(255, 255, 255, 180);
      p.strokeWeight(1);
      p.line(-2, -1, 2, -3);
      p.noStroke();
      break;
    case "gravity_flip":
      p.fill(255, 180, 0);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      p.noFill();
      p.stroke(255, 255, 255, 100);
      p.strokeWeight(1);
      p.arc(0, 0, 6, 4, 0, Math.PI * 1.5);
      p.noStroke();
      break;
    case "shield":
      p.fill(0, 255, 255);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      p.noFill();
      p.stroke(255, 255, 255, 150);
      p.strokeWeight(1);
      p.arc(0, -1, 6, 6, Math.PI + 0.5, -0.5);
      p.noStroke();
      break;
    case "rubber":
      p.fill(0, 220, 255);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      p.fill(255);
      p.circle(0, 0, 2);
      break;
    case "homing":
      p.fill(255, 80, 50);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      p.stroke(255, 255, 255, 180);
      p.strokeWeight(1);
      p.line(0, -3, 0, 1);
      p.line(-2, -1, 2, -1);
      p.noStroke();
      break;
    case "ghost":
      p.fill(255, 255, 255, 150);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      break;
    case "giant":
      p.fill(255, 220, 0);
      p.arc(0, 0, 12, 9, 0, Math.PI);
      p.stroke(200, 150, 0);
      p.strokeWeight(1);
      p.line(-3, 0, 3, 0);
      p.noStroke();
      break;
    case "boomerang":
      p.fill(255, 200, 100);
      p.arc(0, 0, 4, 6, 0, Math.PI);
      p.arc(0, 0, 4, 6, Math.PI, Math.PI * 2);
      break;
    case "drunk":
      p.fill(200, 100, 255);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      p.stroke(255, 255, 255, 120);
      p.strokeWeight(1);
      p.arc(-2, -2, 3, 3, 0, Math.PI);
      p.noStroke();
      break;
    case "earthquake":
      p.fill(139, 90, 43);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      p.stroke(80, 50, 20);
      p.strokeWeight(1);
      p.line(-2, 0, 0, -2);
      p.line(0, -2, 2, 0);
      p.noStroke();
      break;
    case "demolition":
      p.fill(40, 40, 40);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      p.fill(80, 80, 80);
      p.circle(0, 1, 3);
      break;
    case "construction":
      p.fill(50, 200, 50);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      p.stroke(255, 255, 255, 200);
      p.strokeWeight(1);
      p.line(0, -3, 0, -1);
      p.line(-1, -2, 1, -2);
      p.noStroke();
      break;
    case "jump":
      p.fill(50, 200, 80);
      p.rect(-2, -4, 4, 5);
      p.rect(-4, 1, 8, 2);
      break;
    case "fire":
      p.fill(255, 80, 0);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      p.fill(255, 200, 0, 200);
      p.triangle(-2, 0, 2, 0, 0, -4);
      break;
    case "lava":
      p.fill(180, 30, 0);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      p.fill(255, 100, 0);
      p.arc(0, 1, 6, 3, Math.PI, Math.PI * 2);
      break;
    case "storm":
      p.fill(80, 80, 120);
      p.arc(0, 0, 8, 6, 0, Math.PI);
      p.fill(255, 255, 100);
      p.strokeWeight(1);
      p.stroke(255, 255, 100);
      p.line(0, -3, -1, -1);
      p.line(-1, -1, 1, -2);
      p.line(1, -2, 0, 0);
      p.noStroke();
      break;
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

// Generate title screen buildings once (seeded by first call)
let titleBuildings: { x: number; y: number; w: number; h: number; color: string; windows: { x: number; y: number; lit: boolean }[] }[] | null = null;
let titleGorillaPositions: [{ x: number; y: number }, { x: number; y: number }] | null = null;

function generateTitleBuildings(): void {
  titleBuildings = [];
  const colors = CITY_THEME_COLORS.classic;
  const groundY = BOTTOM_LINE;

  // Left cluster: 2-3 buildings in the leftmost ~80px
  const leftBuildings = [
    { x: 2, w: 30 + Math.floor(Math.random() * 10) },
    { x: 36 + Math.floor(Math.random() * 5), w: 25 + Math.floor(Math.random() * 15) },
    { x: 68 + Math.floor(Math.random() * 5), w: 25 + Math.floor(Math.random() * 10) },
  ];
  for (const lb of leftBuildings) {
    const h = 60 + Math.floor(Math.random() * 60);
    const y = groundY - h;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const windows: { x: number; y: number; lit: boolean }[] = [];
    for (let wx = lb.x + 4; wx < lb.x + lb.w - 4; wx += 8) {
      for (let wy = y + 4; wy < y + h - 6; wy += 10) {
        windows.push({ x: wx, y: wy, lit: Math.random() < 0.6 });
      }
    }
    titleBuildings.push({ x: lb.x, y, w: lb.w, h, color, windows });
  }

  // Right cluster: 2-3 buildings in the rightmost ~80px
  const rightStart = WIDTH - 95;
  const rightBuildings = [
    { x: rightStart, w: 25 + Math.floor(Math.random() * 10) },
    { x: rightStart + 30 + Math.floor(Math.random() * 5), w: 25 + Math.floor(Math.random() * 15) },
    { x: rightStart + 62 + Math.floor(Math.random() * 5), w: 25 + Math.floor(Math.random() * 10) },
  ];
  for (const rb of rightBuildings) {
    const h = 60 + Math.floor(Math.random() * 60);
    const y = groundY - h;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const windows: { x: number; y: number; lit: boolean }[] = [];
    for (let wx = rb.x + 4; wx < rb.x + rb.w - 4; wx += 8) {
      for (let wy = y + 4; wy < y + h - 6; wy += 10) {
        windows.push({ x: wx, y: wy, lit: Math.random() < 0.6 });
      }
    }
    titleBuildings.push({ x: rb.x, y, w: rb.w, h, color, windows });
  }

  // Place gorillas on the tallest building in each cluster
  let tallestLeft = titleBuildings[0];
  for (let i = 1; i < 3; i++) {
    if (titleBuildings[i].h > tallestLeft.h) tallestLeft = titleBuildings[i];
  }
  let tallestRight = titleBuildings[3];
  for (let i = 4; i < titleBuildings.length; i++) {
    if (titleBuildings[i].h > tallestRight.h) tallestRight = titleBuildings[i];
  }

  titleGorillaPositions = [
    { x: tallestLeft.x + tallestLeft.w / 2 - GORILLA_WIDTH / 2, y: tallestLeft.y - GORILLA_HEIGHT },
    { x: tallestRight.x + tallestRight.w / 2 - GORILLA_WIDTH / 2, y: tallestRight.y - GORILLA_HEIGHT },
  ];
}

export function drawTitleScreen(p: p5): void {
  if (!titleBuildings) generateTitleBuildings();

  // Draw buildings
  for (const b of titleBuildings!) {
    p.fill(b.color);
    p.noStroke();
    p.rect(b.x, b.y, b.w, b.h);
    for (const w of b.windows) {
      p.fill(w.lit ? "#ffd700" : "#2a2a4a");
      p.rect(w.x, w.y, 3, 5);
    }
  }

  // Ground line
  p.fill(30, 30, 50);
  p.noStroke();
  p.rect(0, BOTTOM_LINE, WIDTH, HEIGHT - BOTTOM_LINE);

  // Dancing gorillas on buildings
  const danceFrame = Math.floor(p.millis() / 300) % 2;
  const leftArm = danceFrame === 0 ? "left_up" : "right_up";
  const rightArm = danceFrame === 0 ? "right_up" : "left_up";

  if (titleGorillaPositions) {
    drawGorilla(p, {
      x: titleGorillaPositions[0].x, y: titleGorillaPositions[0].y,
      width: GORILLA_WIDTH, height: GORILLA_HEIGHT,
      playerNum: 1, armState: leftArm,
    });
    drawGorilla(p, {
      x: titleGorillaPositions[1].x, y: titleGorillaPositions[1].y,
      width: GORILLA_WIDTH, height: GORILLA_HEIGHT,
      playerNum: 2, armState: rightArm,
    });
  }

  // Title text (centered, clear of buildings)
  p.fill(255, 200, 50);
  p.textSize(12);
  p.textAlign(p.CENTER, p.CENTER);
  p.noStroke();
  p.text("GORILLA.BAS++", WIDTH / 2, HEIGHT / 3);

  p.fill(180);
  p.textSize(6);
  p.text("A 2P QBasic Classic", WIDTH / 2, HEIGHT / 3 + 22);

  // Blinking "Press START"
  const blink = Math.floor(p.millis() / 500) % 2 === 0;
  if (blink) {
    p.fill(255);
    p.textSize(7);
    p.text("Press START", WIDTH / 2, HEIGHT * 3 / 4 + 15);
  }
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
    { label: "STARTING ITEMS", value: String(state.startingItems) },
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

export function drawInventoryHUD(p: p5, state: GameState): void {
  const iconSize = 5;
  const spacing = 7;

  // Player 1 inventory dots — below score, left side
  for (let i = 0; i < state.inventory[0].length; i++) {
    const x = 6 + i * spacing;
    const y = 12;
    drawPowerUpIcon(p, x, y, iconSize, state.inventory[0][i]);
  }

  // Player 2 inventory dots — below score, right side
  for (let i = 0; i < state.inventory[1].length; i++) {
    const x = WIDTH - 6 - (state.inventory[1].length - i) * spacing;
    const y = 12;
    drawPowerUpIcon(p, x, y, iconSize, state.inventory[1][i]);
  }

  // Selected power-up overlay panel
  if (state.inventoryOpen) {
    const playerIdx = (state.currentPlayer - 1) as 0 | 1;
    const inv = state.inventory[playerIdx];

    // Panel dimensions — normal + jump rows + divider + inventory items
    const itemH = 12;
    const permanentRowsH = itemH * 2; // normal + jump
    const dividerH = 4;
    const inventoryH = inv.length > 0 ? Math.min(inv.length * itemH, 120 - permanentRowsH - dividerH) : 0;
    const panelH = permanentRowsH + dividerH + inventoryH + 8;
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

    // Normal banana row (always first, index -2)
    const normalY = panelY + 4;
    const isNormalSelected = state.selectedSlotIndex === -2;

    if (isNormalSelected) {
      p.fill(255, 255, 100, 40);
      p.noStroke();
      p.rect(panelX + 2, normalY - 1, panelW - 4, itemH);
    }

    // Normal banana icon (yellow arc)
    p.fill(255, 220, 50);
    p.noStroke();
    p.arc(panelX + 10, normalY + 5, 8, 6, Math.PI, Math.PI * 2);

    // Normal label
    p.textSize(5);
    p.textAlign(p.LEFT, p.TOP);
    p.fill(isNormalSelected ? 255 : 180);
    p.text("BANANA", panelX + 18, normalY + 2);

    // Jump row (index -1)
    const jumpY = normalY + itemH;
    const isJumpSelected = state.selectedSlotIndex === -1;
    const isJumpBlocked = state.poisonTurns[playerIdx] > 0 || state.iceTurns[playerIdx] > 0;

    if (isJumpSelected) {
      p.fill(255, 255, 100, 40);
      p.noStroke();
      p.rect(panelX + 2, jumpY - 1, panelW - 4, itemH);
    }

    // Jump icon (green boot shape, gray if blocked)
    if (isJumpBlocked) {
      p.fill(80, 80, 80);
    } else {
      p.fill(50, 200, 80);
    }
    p.noStroke();
    // Boot: tall part (ankle/leg)
    p.rect(panelX + 7, jumpY + 1, 4, 6);
    // Boot: sole (wider, extends forward)
    p.rect(panelX + 5, jumpY + 7, 9, 2);

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
    let hint = "";
    if (state.selectedSlotIndex === -2) {
      hint = "A good old banana.";
    } else if (isJumpSelected) {
      hint = isJumpBlocked ? "Poison/ice blocks jumping." : "Leap to next building.";
    } else if (state.selectedPowerUp) {
      hint = powerUpHint(state.selectedPowerUp);
    }
    if (hint) {
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
    case "fire": return "FIRE";
    case "lava": return "LAVA";
    case "storm": return "STORM";
    default: return (type as string).toUpperCase();
  }
}

function powerUpHint(type: PowerUpType): string {
  switch (type) {
    case "big_banana": return "Hits hard.";
    case "two_bananas": return "Throw two in a row.";
    case "ricochet": return "Bounces off walls.";
    case "wrap_around": return "Goes through walls.";
    case "cluster_bomb": return "Seems unstable...";
    case "teleportation": return "Everyone moves.";
    case "portal": return "Place two, connect them.";
    case "confetti": return "...what?";
    case "poison": return "Weakens over time.";
    case "ice": return "Freezes their aim.";
    case "mirror": return "Reverses their aim.";
    case "gravity_flip": return "What goes up...";
    case "shield": return "Blocks one hit.";
    case "rubber": return "Bounces off everything.";
    case "homing": return "Seeks its target.";
    case "ghost": return "Passes through buildings.";
    case "giant": return "Feels heavy.";
    case "boomerang": return "Comes back around.";
    case "drunk": return "Hard to aim straight.";
    case "earthquake": return "The ground shakes.";
    case "demolition": return "Levels a building.";
    case "construction": return "Builds things up.";
    case "jump": return "Leap to next building.";
    case "fire": return "Sets buildings ablaze.";
    case "lava": return "Aim at the ground...";
    case "storm": return "Throw it skyward.";
    default: return "";
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
      p.fill(50, 200, 80);
      p.rect(x + size / 4, y, size / 2, size * 0.6);
      p.rect(x, y + size * 0.6, size, size * 0.4);
      break;
    case "fire":
      p.fill(255, 80, 0);
      p.circle(x + size / 2, y + size / 2, size);
      p.fill(255, 200, 0);
      p.circle(x + size / 2, y + size / 3, size * 0.5);
      break;
    case "lava":
      p.fill(180, 30, 0);
      p.circle(x + size / 2, y + size / 2, size);
      p.fill(255, 100, 0);
      p.circle(x + size / 2, y + size / 2, size * 0.5);
      break;
    case "storm":
      p.fill(80, 80, 120);
      p.circle(x + size / 2, y + size / 2, size);
      p.fill(255, 255, 100);
      p.rect(x + size / 3, y + size / 4, size / 4, size / 2);
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

function drawStar(p: p5, cx: number, cy: number, innerR: number, outerR: number, points: number): void {
  p.beginShape();
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * p.PI) / points - p.HALF_PI;
    const r = i % 2 === 0 ? outerR : innerR;
    p.vertex(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
  }
  p.endShape(p.CLOSE);
}

function drawAwardIcon(p: p5, awardId: string, x: number, y: number, alpha: number): void {
  p.push();
  p.noStroke();
  const s = 8;
  const a = alpha;

  switch (awardId) {
    case "friendly_fire":
      p.fill(255, 50, 50, a);
      p.circle(x, y - 1, s * 0.7);
      p.triangle(x - 2, y + 1, x + 2, y + 1, x, y + 4);
      p.fill(0, 0, 0, a);
      p.circle(x - 1.5, y - 1.5, 1.5);
      p.circle(x + 1.5, y - 1.5, 1.5);
      break;
    case "floor_is_lava":
      p.fill(255, 120, 0, a);
      p.beginShape();
      p.vertex(x, y - 4);
      p.vertex(x + 3, y + 1);
      p.vertex(x + 2, y + 3);
      p.vertex(x - 2, y + 3);
      p.vertex(x - 3, y + 1);
      p.endShape(p.CLOSE);
      break;
    case "thors_cousin":
      p.fill(255, 255, 50, a);
      p.beginShape();
      p.vertex(x - 1, y - 4);
      p.vertex(x + 2, y - 1);
      p.vertex(x, y - 1);
      p.vertex(x + 1, y + 4);
      p.vertex(x - 2, y + 1);
      p.vertex(x, y + 1);
      p.endShape(p.CLOSE);
      break;
    case "the_arsonist":
      p.fill(255, 100, 0, a);
      p.triangle(x - 3, y + 3, x + 3, y + 3, x, y - 4);
      p.fill(255, 200, 50, a);
      p.triangle(x - 1.5, y + 3, x + 1.5, y + 3, x, y - 1);
      break;
    case "lucky_shot":
      p.fill(255, 220, 50, a);
      drawStar(p, x, y, 2, 4.5, 5);
      break;
    case "pacifist":
      p.noFill();
      p.stroke(100, 255, 100, a);
      p.strokeWeight(1);
      p.circle(x, y, s);
      p.line(x, y - 4, x, y + 4);
      p.line(x, y, x - 2.5, y + 3);
      p.line(x, y, x + 2.5, y + 3);
      break;
    case "seismologist":
      p.stroke(255, 150, 0, a);
      p.strokeWeight(1);
      p.noFill();
      for (let w = -2; w <= 2; w += 2) {
        p.beginShape();
        for (let wx = -4; wx <= 4; wx++) {
          p.vertex(x + wx, y + w + Math.sin(wx * 1.2) * 1.5);
        }
        p.endShape();
      }
      break;
    case "demolition_derby":
      p.fill(210, 210, 210, a);
      p.circle(x, y + 1, s * 0.6);
      p.stroke(210, 210, 210, a);
      p.strokeWeight(1);
      p.line(x, y - 2, x, y - 5);
      break;
    case "city_planner":
      p.fill(255, 220, 50, a);
      p.arc(x, y, s, s * 0.7, p.PI, 0);
      p.rect(x - 5, y - 1, 10, 2);
      break;
    case "bunny":
      p.fill(255, 150, 180, a);
      p.ellipse(x - 2, y - 2, 3, 7);
      p.ellipse(x + 2, y - 2, 3, 7);
      break;
    case "turtle":
      p.fill(100, 220, 100, a);
      p.arc(x, y, s, s * 0.8, p.PI, 0);
      p.fill(80, 180, 80, a);
      p.line(x, y - 3, x, y);
      break;
    case "the_sniper":
      p.noFill();
      p.stroke(255, 50, 50, a);
      p.strokeWeight(1);
      p.circle(x, y, s * 0.7);
      p.line(x - 4, y, x + 4, y);
      p.line(x, y - 4, x, y + 4);
      break;
    case "stormtrooper":
      p.fill(255, 255, 0, a);
      p.arc(x, y, 6, 4, 0, p.PI);
      p.stroke(255, 0, 0, a);
      p.strokeWeight(1);
      p.line(x - 2, y - 3, x + 2, y + 1);
      p.line(x + 2, y - 3, x - 2, y + 1);
      break;
    case "arms_dealer":
      p.fill(200, 120, 40, a);
      p.rect(x - 4, y - 4, 8, 8);
      p.fill(255, 255, 255, a);
      p.textSize(5);
      p.textAlign(p.CENTER, p.CENTER);
      p.text("?", x, y);
      break;
    case "hulk_smash":
      p.stroke(255, 80, 80, a);
      p.strokeWeight(1.5);
      p.noFill();
      p.line(x - 3, y + 3, x - 1, y);
      p.line(x - 1, y, x + 2, y - 3);
      p.circle(x + 2, y - 3, 3);
      break;
    case "butterfingers":
      p.stroke(210, 210, 210, a);
      p.strokeWeight(1);
      p.noFill();
      p.line(x - 3, y + 2, x, y);
      p.line(x, y, x + 2, y + 1);
      break;
    case "hoarder":
      p.fill(220, 150, 60, a);
      p.circle(x - 2, y + 1, 4);
      p.circle(x + 2, y + 1, 4);
      p.circle(x, y - 2, 4);
      break;
    case "champion":
      p.fill(255, 200, 50, a);
      p.rect(x - 3, y - 2, 6, 5);
      p.rect(x - 1, y + 3, 2, 2);
      p.rect(x - 3, y + 5, 6, 1);
      p.rect(x - 5, y - 2, 2, 3);
      p.rect(x + 3, y - 2, 2, 3);
      break;
    case "participant":
      p.fill(120, 180, 255, a);
      p.rect(x - 2, y - 3, 4, 4);
      p.triangle(x - 2, y + 1, x - 3, y + 5, x, y + 2);
      p.triangle(x + 2, y + 1, x + 3, y + 5, x, y + 2);
      break;
    default:
      p.fill(255, 255, 255, a);
      drawStar(p, x, y, 1.5, 4, 4);
      p.fill(255, 255, 200, a);
      drawStar(p, x, y, 1, 2.5, 4);
      break;
  }

  p.pop();
}

function drawAward(
  p: p5,
  award: Award | NameAward,
  playerName: string | null,
  color: [number, number, number],
  y: number,
  alpha: number,
): void {
  if (playerName) {
    p.fill(color[0], color[1], color[2], alpha * 0.85);
    p.textSize(4);
    p.textAlign(p.CENTER, p.CENTER);
    p.noStroke();
    p.text(playerName, WIDTH / 2, y - 8);
  }

  drawAwardIcon(p, award.id, WIDTH / 2 - 60, y + 4, alpha);

  p.fill(255, 230, 80, alpha);
  p.textSize(6);
  p.textAlign(p.CENTER, p.CENTER);
  p.noStroke();
  p.text(`"${award.name}"`, WIDTH / 2 + 5, y);

  p.fill(200, 200, 200, alpha);
  p.textSize(5);
  p.text(award.flavorText, WIDTH / 2, y + 12);
}

export function drawGameOver(
  p: p5,
  state: GameState,
  awards?: { p1: Award; p2: Award; bonus: NameAward | null },
): void {
  const elapsed = p.millis() - state.gameOverEnteredAt;

  p.fill(255, 80, 80);
  p.textSize(12);
  p.textAlign(p.CENTER, p.CENTER);
  p.noStroke();
  // Top boundary: top edge of sun body (SUN_Y - SUN_RADIUS = 13)
  p.text("GAME OVER", WIDTH / 2, 22);

  p.fill(255);
  p.textSize(5);
  p.text(
    `${state.playerNames[0]}: ${state.scores[0]}  ${state.playerNames[1]}: ${state.scores[1]}`,
    WIDTH / 2, 42,
  );

  const winnerIdx = state.scores[0] >= state.targetScore ? 0 : 1;
  const winner = state.playerNames[winnerIdx];
  p.fill(255, 230, 50);
  p.textSize(7);
  p.text(`${winner} wins!`, WIDTH / 2, 58);

  if (!awards) {
    p.fill(220);
    p.textSize(6);
    p.text("Press START", WIDTH / 2, HEIGHT * 3 / 4);
    return;
  }

  const p1Color: [number, number, number] = [120, 200, 255];
  const p2Color: [number, number, number] = [255, 150, 150];

  let yPos = 85;
  if (elapsed >= AWARD_REVEAL_1_MS) {
    const alpha = Math.min(255, ((elapsed - AWARD_REVEAL_1_MS) / AWARD_FADE_MS) * 255);
    drawAward(p, awards.p1, state.playerNames[0], p1Color, yPos, alpha);
  }

  yPos = 127;
  if (elapsed >= AWARD_REVEAL_2_MS) {
    const alpha = Math.min(255, ((elapsed - AWARD_REVEAL_2_MS) / AWARD_FADE_MS) * 255);
    drawAward(p, awards.p2, state.playerNames[1], p2Color, yPos, alpha);
  }

  yPos = 169;
  if (awards.bonus && elapsed >= AWARD_BONUS_MS) {
    const alpha = Math.min(255, ((elapsed - AWARD_BONUS_MS) / AWARD_FADE_MS) * 255);
    drawAward(p, awards.bonus, null, [255, 255, 255], yPos, alpha);
  }

  if (elapsed >= AWARD_START_VISIBLE_MS) {
    p.fill(220);
    p.textSize(6);
    p.noStroke();
    p.text("Press START", WIDTH / 2, 240);
  }
}

export function drawBurningBuildings(p: p5, buildings: import("./types").Building[], burningSet: Set<number>): void {
  for (const idx of burningSet) {
    const b = buildings[idx];
    if (!b || b.height <= 0) continue;

    p.fill(255, 50, 0, 40);
    p.noStroke();
    p.rect(b.x, b.y, b.width, b.height);

    const flameCount = Math.max(2, Math.floor(b.width / 8));
    for (let i = 0; i < flameCount; i++) {
      const fx = b.x + (i + 0.5) * (b.width / flameCount);
      const flicker = Math.sin(p.millis() / 100 + i * 2.5) * 3;
      const height = 6 + Math.sin(p.millis() / 150 + i * 1.7) * 3;

      p.fill(255, 80 + Math.floor(Math.sin(p.millis() / 120 + i) * 40), 0, 200);
      p.noStroke();
      p.triangle(
        fx - 3, b.y,
        fx + 3, b.y,
        fx + flicker * 0.5, b.y - height
      );

      p.fill(255, 220, 50, 180);
      p.triangle(
        fx - 1.5, b.y,
        fx + 1.5, b.y,
        fx + flicker * 0.3, b.y - height * 0.6
      );
    }
  }
}

export function drawLava(p: p5, lavaHeight: number): void {
  const lavaTop = lavaHeight;
  const lavaBottom = HEIGHT;

  p.fill(200, 40, 0);
  p.noStroke();
  p.rect(0, lavaTop, WIDTH, lavaBottom - lavaTop);

  p.fill(255, 120, 0);
  p.rect(0, lavaTop, WIDTH, 4);

  p.stroke(255, 200, 50);
  p.strokeWeight(1);
  p.noFill();
  p.beginShape();
  for (let x = 0; x <= WIDTH; x += 4) {
    const wave = Math.sin(x * 0.05 + p.millis() / 400) * 2;
    p.vertex(x, lavaTop + wave);
  }
  p.endShape();
  p.noStroke();

  const bubblePhase = p.millis() / 300;
  for (let i = 0; i < 5; i++) {
    const bx = ((i * 73 + Math.floor(bubblePhase) * 37) % WIDTH);
    const bubbleT = (bubblePhase + i * 0.7) % 1;
    if (bubbleT < 0.3) {
      const by = lavaTop + 4 - bubbleT * 10;
      const bSize = 2 + bubbleT * 3;
      p.fill(255, 180, 50, 150 * (1 - bubbleT / 0.3));
      p.circle(bx, by, bSize);
    }
  }
}

export function drawStormClouds(p: p5): void {
  p.noStroke();
  const drift = p.millis() * 0.005;

  for (let layer = 0; layer < 3; layer++) {
    const alpha = 120 + layer * 30;
    p.fill(30, 30, 50, alpha);
    for (let x = -20; x < WIDTH + 20; x += 25) {
      const offsetX = Math.sin(x * 0.02 + drift + layer) * 8;
      const y = 5 + layer * 10;
      const w = 30 + Math.sin(x * 0.05 + layer) * 10;
      const h = 12 + Math.sin(x * 0.03 + drift) * 3;
      p.ellipse(x + offsetX, y, w, h);
    }
  }
}

export function drawLightning(p: p5, targetX: number, targetY: number, progress: number): void {
  if (progress >= 1) return;

  if (progress < 0.2) {
    p.fill(255, 255, 255, Math.floor(80 * (1 - progress / 0.2)));
    p.noStroke();
    p.rect(0, 0, WIDTH, HEIGHT);
  }

  const alpha = Math.floor(255 * (1 - progress));
  p.stroke(255, 255, 200, alpha);
  p.strokeWeight(2);

  const startY = 35;
  const segments = 5;
  let prevX = targetX + (Math.random() - 0.5) * 4;
  let prevY = startY;

  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const nextX = targetX + (Math.random() - 0.5) * 15 * (1 - t);
    const nextY = startY + (targetY - startY) * t;
    p.line(prevX, prevY, nextX, nextY);
    prevX = nextX;
    prevY = nextY;
  }

  p.stroke(255, 255, 255, alpha);
  p.strokeWeight(1);
  prevX = targetX;
  prevY = startY;
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const nextX = targetX + (Math.random() - 0.5) * 8 * (1 - t);
    const nextY = startY + (targetY - startY) * t;
    p.line(prevX, prevY, nextX, nextY);
    prevX = nextX;
    prevY = nextY;
  }

  p.noStroke();
}

export function drawFizzleBubble(p: p5, gorilla: import("./types").Gorilla, progress: number): void {
  if (progress >= 1) return;
  const alpha = Math.floor(255 * (1 - progress));
  const cx = gorilla.x + GORILLA_WIDTH / 2;
  const cy = gorilla.y - 10 - progress * 5;

  p.fill(255, 255, 255, alpha);
  p.noStroke();
  p.textSize(8);
  p.textAlign(p.CENTER, p.CENTER);
  p.text("?", cx, cy);
}
