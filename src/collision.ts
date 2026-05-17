import type { Building, Gorilla } from "./types";
import { WIDTH, MAX_FLIGHT_T, SUN_X, SUN_Y, SUN_RADIUS, BOTTOM_LINE } from "./config";

export type CollisionResult =
  | { type: "none" }
  | { type: "miss" }
  | { type: "building"; building: Building }
  | { type: "gorilla"; gorilla: Gorilla }
  | { type: "sun" };

export function checkCollision(
  x: number,
  y: number,
  t: number,
  buildings: Building[],
  gorillas: [Gorilla, Gorilla]
): CollisionResult {
  if (t >= MAX_FLIGHT_T) {
    return { type: "miss" };
  }

  if (x < 0 || x > WIDTH || y > BOTTOM_LINE) {
    return { type: "miss" };
  }

  if (y < 0) {
    return { type: "none" };
  }

  for (const gorilla of gorillas) {
    if (
      x >= gorilla.x &&
      x <= gorilla.x + gorilla.width &&
      y >= gorilla.y &&
      y <= gorilla.y + gorilla.height
    ) {
      return { type: "gorilla", gorilla };
    }
  }

  for (const building of buildings) {
    if (
      x >= building.x &&
      x <= building.x + building.width &&
      y >= building.y &&
      y <= building.y + building.height
    ) {
      // Check if point falls inside an existing damage hole (pass-through)
      let inDamage = false;
      for (const hole of building.damage) {
        const dx = x - hole.cx;
        const dy = y - hole.cy;
        if (dx * dx + dy * dy <= hole.radius * hole.radius) {
          inDamage = true;
          break;
        }
      }
      if (inDamage) continue;
      return { type: "building", building };
    }
  }

  const dx = x - SUN_X;
  const dy = y - SUN_Y;
  if (dx * dx + dy * dy <= SUN_RADIUS * SUN_RADIUS) {
    return { type: "sun" };
  }

  return { type: "none" };
}
