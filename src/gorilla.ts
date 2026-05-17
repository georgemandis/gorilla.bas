import p5 from "p5";
import type { Gorilla, ArmState } from "./types";

const GORILLA_COLOR = "#8B4513";
const EYE_COLOR = "#FFFFFF";

export function drawGorilla(p: p5, gorilla: Gorilla): void {
  const { x, y, armState } = gorilla;

  p.push();
  p.noStroke();

  // Body
  p.fill(GORILLA_COLOR);
  p.rect(x + 4, y + 10, 12, 10); // torso

  // Head
  p.rect(x + 5, y + 2, 10, 9);

  // Eyes
  p.fill(EYE_COLOR);
  p.rect(x + 7, y + 4, 2, 2);
  p.rect(x + 11, y + 4, 2, 2);

  // Legs
  p.fill(GORILLA_COLOR);
  p.rect(x + 5, y + 20, 4, 5);
  p.rect(x + 11, y + 20, 4, 5);

  // Arms
  drawArms(p, x, y, armState);

  p.pop();
}

function drawArms(p: p5, x: number, y: number, armState: ArmState): void {
  p.fill(GORILLA_COLOR);

  switch (armState) {
    case "down":
      p.rect(x + 1, y + 11, 3, 8);
      p.rect(x + 16, y + 11, 3, 8);
      break;
    case "left_up":
      p.rect(x + 1, y + 2, 3, 8);
      p.rect(x + 16, y + 11, 3, 8);
      break;
    case "right_up":
      p.rect(x + 1, y + 11, 3, 8);
      p.rect(x + 16, y + 2, 3, 8);
      break;
  }
}
