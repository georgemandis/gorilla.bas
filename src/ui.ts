import p5 from "p5";
import type { GameState } from "./types";
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

export function drawScores(p: p5, state: GameState): void {
  p.fill(255);
  p.textSize(8);
  p.noStroke();

  p.textAlign(p.LEFT, p.TOP);
  p.text(`${state.playerNames[0]}: ${state.scores[0]}`, 4, 2);

  p.textAlign(p.RIGHT, p.TOP);
  p.text(`${state.playerNames[1]}: ${state.scores[1]}`, WIDTH - 4, 2);
}

export function drawAngleIndicator(p: p5, state: GameState): void {
  const gorilla = state.gorillas[state.currentPlayer - 1];
  const centerX = gorilla.x + GORILLA_WIDTH / 2;
  const centerY = gorilla.y + GORILLA_HEIGHT / 2;

  const angleRad = (state.angle * Math.PI) / 180;
  const endX = centerX + Math.cos(angleRad) * ANGLE_ARROW_LENGTH;
  const endY = centerY - Math.sin(angleRad) * ANGLE_ARROW_LENGTH;

  p.stroke(255, 200, 50);
  p.strokeWeight(2);
  p.line(centerX, centerY, endX, endY);

  p.fill(255, 200, 50);
  p.noStroke();
  p.circle(endX, endY, 4);
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

export function drawSun(p: p5, shocked: boolean): void {
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
  p.textSize(14);
  p.textAlign(p.CENTER, p.CENTER);
  p.noStroke();
  p.text("GORILLAS.BAS", WIDTH / 2, HEIGHT / 3);

  p.fill(180);
  p.textSize(9);
  p.text("A QBasic Classic", WIDTH / 2, HEIGHT / 3 + 20);

  p.fill(255);
  p.textSize(10);
  p.text("Press START", WIDTH / 2, HEIGHT * 2 / 3);
}

export function drawConfigScreen(
  p: p5,
  state: GameState,
  cursorPos: number
): void {
  p.fill(255, 200, 50);
  p.textSize(12);
  p.textAlign(p.CENTER, p.TOP);
  p.noStroke();
  p.text("GORILLAS.BAS", WIDTH / 2, 15);

  const startY = 50;
  const lineH = 28;

  p.textSize(9);
  p.textAlign(p.LEFT, p.TOP);

  p.fill(100, 150, 255);
  p.text(`P1: ${state.playerNames[0]}`, 40, startY);
  p.fill(80, 80, 120);
  p.textSize(7);
  p.text("(spin to re-roll)", 40, startY + 12);

  p.textSize(9);
  p.fill(255, 100, 100);
  p.text(`P2: ${state.playerNames[1]}`, 40, startY + lineH);
  p.fill(80, 80, 120);
  p.textSize(7);
  p.text("(spin to re-roll)", 40, startY + lineH + 12);

  const settingsY = startY + lineH * 3;
  const settings = [
    { label: "POINTS TO WIN", value: String(state.targetScore) },
    { label: "GRAVITY", value: state.gravityPreset.toUpperCase() },
  ];

  p.textSize(9);
  for (let i = 0; i < settings.length; i++) {
    const y = settingsY + i * lineH;
    const isSelected = cursorPos === i;

    if (isSelected) {
      p.fill(255, 200, 50);
      p.text(">", 30, y);
    }

    p.fill(isSelected ? 255 : 150);
    p.text(`${settings[i].label}:`, 40, y);
    if (isSelected) { p.fill(255, 255, 100); } else { p.fill(200); }
    p.textAlign(p.RIGHT, p.TOP);
    p.text(`< ${settings[i].value} >`, WIDTH - 40, y);
    p.textAlign(p.LEFT, p.TOP);
  }

  p.fill(100, 255, 100);
  p.textSize(9);
  p.textAlign(p.CENTER, p.TOP);
  p.text("Press START to play", WIDTH / 2, HEIGHT - 30);
}

export function drawGameOver(p: p5, state: GameState): void {
  p.fill(255, 100, 100);
  p.textSize(14);
  p.textAlign(p.CENTER, p.CENTER);
  p.noStroke();
  p.text("GAME OVER", WIDTH / 2, HEIGHT / 3);

  p.fill(255);
  p.textSize(10);
  p.text(`${state.playerNames[0]}: ${state.scores[0]}`, WIDTH / 2, HEIGHT / 2 - 10);
  p.text(`${state.playerNames[1]}: ${state.scores[1]}`, WIDTH / 2, HEIGHT / 2 + 10);

  const winner = state.scores[0] >= state.targetScore ? state.playerNames[0] : state.playerNames[1];
  p.fill(255, 200, 50);
  p.text(`${winner} wins!`, WIDTH / 2, HEIGHT / 2 + 35);

  p.fill(150);
  p.textSize(8);
  p.text("Press START", WIDTH / 2, HEIGHT * 3 / 4);
}
