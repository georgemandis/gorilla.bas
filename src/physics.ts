import type { Projectile } from "./types";
import { PHYSICS_DT, VELOCITY_SCALE, Y_SCALE } from "./config";

export function createProjectile(
  startX: number,
  startY: number,
  angleDegrees: number,
  power: number
): Projectile {
  const angleRad = (angleDegrees * Math.PI) / 180;
  const velocity = power * VELOCITY_SCALE;

  return {
    startX,
    startY,
    vx: Math.cos(angleRad) * velocity,
    vy: Math.sin(angleRad) * velocity,
    t: 0,
    active: true,
  };
}

export function getProjectilePositionWithGravity(
  proj: Projectile,
  wind: number,
  gravity: number
): { x: number; y: number } {
  const x = proj.startX + proj.vx * proj.t + 0.5 * (wind / 5) * proj.t * proj.t;
  const y = proj.startY - proj.vy * proj.t * Y_SCALE + 0.5 * gravity * proj.t * proj.t * Y_SCALE;
  return { x, y };
}

export function advanceProjectile(proj: Projectile): void {
  proj.t += PHYSICS_DT;
}
