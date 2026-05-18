import p5 from "p5";
import type { Gorilla, ArmState, GorillaCostume, GorillaTints } from "./types";

const DEFAULT_BODY = "#C8782A";
const DEFAULT_EYE = "#FFFFFF";

export function drawGorilla(p: p5, gorilla: Gorilla, costume?: GorillaCostume | null, tints?: GorillaTints): void {
  const { x, y, armState } = gorilla;
  const bodyColor = costume?.bodyColor ?? DEFAULT_BODY;
  const eyeColor = costume?.eyeColor ?? DEFAULT_EYE;

  p.push();
  p.noStroke();

  // Coat (drawn behind body)
  if (costume?.coat === "yellowraincoat") {
    p.fill("#f5d442");
    p.rect(x + 3, y + 10, 14, 12); // coat body
    p.rect(x + 0, y + 11, 3, 9);   // left sleeve
    p.rect(x + 17, y + 11, 3, 9);  // right sleeve
  } else if (costume?.coat === "cape") {
    p.fill("#cc2222");
    p.triangle(x + 4, y + 10, x + 16, y + 10, x + 10, y + 28);
  } else if (costume?.coat === "vest") {
    p.fill("#3a3a5a");
    p.rect(x + 3, y + 10, 5, 10);
    p.rect(x + 12, y + 10, 5, 10);
  }

  // Body
  p.fill(bodyColor);
  p.rect(x + 4, y + 10, 12, 10); // torso

  // Head
  p.rect(x + 5, y + 2, 10, 9);

  // Debuff tint overlays (all stack)
  if (tints?.poison) {
    p.fill(0, 180, 0, 80);
    p.rect(x + 4, y + 10, 12, 10);
    p.rect(x + 5, y + 2, 10, 9);
  }
  if (tints?.ice) {
    p.fill(100, 200, 255, 80);
    p.rect(x + 4, y + 10, 12, 10);
    p.rect(x + 5, y + 2, 10, 9);
  }
  if (tints?.mirror) {
    p.fill(180, 0, 255, 80);
    p.rect(x + 4, y + 10, 12, 10);
    p.rect(x + 5, y + 2, 10, 9);
  }
  if (tints?.gravity) {
    p.fill(255, 180, 0, 80);
    p.rect(x + 4, y + 10, 12, 10);
    p.rect(x + 5, y + 2, 10, 9);
    // Small down-arrow indicator above head
    p.fill(255, 180, 0);
    p.triangle(x + 8, y - 2, x + 12, y - 2, x + 10, y + 1);
  }
  if (tints?.shield) {
    p.fill(0, 255, 255, 40);
    p.noStroke();
    p.ellipse(x + 10, y + 12, 24, 30);
    p.stroke(0, 255, 255, 80);
    p.strokeWeight(1);
    p.noFill();
    p.ellipse(x + 10, y + 12, 24, 30);
    p.noStroke();
  }

  // Eyes
  if (costume?.accessory === "redeyes") {
    // Glowing red eyes
    p.fill("#ff0000");
    p.rect(x + 7, y + 4, 2, 2);
    p.rect(x + 11, y + 4, 2, 2);
    // Glow
    p.fill(255, 0, 0, 60);
    p.circle(x + 8, y + 5, 5);
    p.circle(x + 12, y + 5, 5);
  } else {
    p.fill(eyeColor);
    p.rect(x + 7, y + 4, 2, 2);
    p.rect(x + 11, y + 4, 2, 2);
  }

  // Sunglasses (drawn over eyes)
  if (costume?.accessory === "sunglasses") {
    p.fill("#111111");
    p.rect(x + 6, y + 3, 4, 3);
    p.rect(x + 10, y + 3, 4, 3);
    p.rect(x + 10, y + 4, 1, 1); // bridge
  }

  // Scar
  if (costume?.accessory === "scar") {
    p.stroke("#aa4444");
    p.strokeWeight(1);
    p.line(x + 12, y + 3, x + 14, y + 8);
    p.noStroke();
  }

  // Bowtie
  if (costume?.accessory === "bowtie") {
    p.fill("#ee3333");
    p.triangle(x + 8, y + 11, x + 10, y + 10, x + 10, y + 12);
    p.triangle(x + 12, y + 11, x + 10, y + 10, x + 10, y + 12);
  }

  // Legs
  p.fill(bodyColor);
  p.rect(x + 5, y + 20, 4, 5);
  p.rect(x + 11, y + 20, 4, 5);

  // Arms
  drawArms(p, x, y, armState, bodyColor, costume);

  // Hats (drawn on top of everything)
  if (costume?.hat === "crown") {
    p.fill("#ffd700");
    p.rect(x + 6, y - 1, 8, 3);
    // Crown points
    p.triangle(x + 6, y - 1, x + 8, y - 1, x + 7, y - 4);
    p.triangle(x + 9, y - 1, x + 11, y - 1, x + 10, y - 5);
    p.triangle(x + 12, y - 1, x + 14, y - 1, x + 13, y - 4);
    // Jewel
    p.fill("#ff0044");
    p.rect(x + 9, y - 1, 2, 1);
  } else if (costume?.hat === "tophat") {
    p.fill("#111111");
    p.rect(x + 5, y, 10, 2);      // brim
    p.rect(x + 6, y - 6, 8, 6);   // tall part
  } else if (costume?.hat === "banana") {
    p.fill("#ffe135");
    // Banana peel on head
    p.arc(x + 10, y + 1, 10, 8, Math.PI, Math.PI * 2);
    p.fill("#c8a800");
    p.rect(x + 9, y - 2, 2, 2); // stem
  } else if (costume?.hat === "cowboy") {
    p.fill("#8B4513");
    p.rect(x + 3, y + 1, 14, 2);   // wide brim
    p.rect(x + 6, y - 3, 8, 4);    // dome
  } else if (costume?.hat === "yellowhat") {
    p.fill("#f5d442");
    p.rect(x + 4, y, 12, 2);      // brim
    p.arc(x + 10, y + 1, 10, 8, Math.PI, Math.PI * 2); // dome
  }

  p.pop();
}

function drawArms(p: p5, x: number, y: number, armState: ArmState, bodyColor: string, costume?: GorillaCostume | null): void {
  // If wearing a raincoat, arm color is yellow
  const armColor = costume?.coat === "yellowraincoat" ? "#f5d442" : bodyColor;
  p.fill(armColor);

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
