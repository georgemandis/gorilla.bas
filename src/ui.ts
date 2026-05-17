import p5 from "p5";
import type { GameState, TimeOfDay } from "./types";
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
  const endX = centerX + Math.cos(angleRad) * ANGLE_ARROW_LENGTH;
  const endY = centerY - Math.sin(angleRad) * ANGLE_ARROW_LENGTH;

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
  p.rotate(-angleRad);
  p.scale(scale);
  p.fill(255, 255, 0);
  p.noStroke();
  p.arc(0, 0, 8, 6, 0, Math.PI);
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

export function drawExplosion(p: p5, x: number, y: number, progress: number): void {
  const radius = progress * 15;
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
  p.text("GORILLAS.BAS", WIDTH / 2, HEIGHT / 3);

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
  p.text("GORILLAS.BAS", WIDTH / 2, 15);

  const startY = 45;
  const lineH = 24;

  p.textSize(6);
  p.textAlign(p.LEFT, p.TOP);

  p.fill(100, 150, 255);
  p.text(`P1: ${state.playerNames[0]}`, 30, startY);
  p.fill(80, 80, 120);
  p.textSize(5);
  p.text("(spin to re-roll)", 30, startY + 12);

  p.textSize(6);
  p.fill(255, 100, 100);
  p.text(`P2: ${state.playerNames[1]}`, 30, startY + lineH);
  p.fill(80, 80, 120);
  p.textSize(5);
  p.text("(spin to re-roll)", 30, startY + lineH + 12);

  const settingsY = startY + lineH * 2.5;
  const settings = [
    { label: "POINTS TO WIN", value: String(state.targetScore) },
    { label: "GRAVITY", value: state.gravityPreset.toUpperCase() },
    { label: "TIME", value: state.timeOfDay.toUpperCase() },
    { label: "CITY", value: state.cityTheme.toUpperCase() },
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
