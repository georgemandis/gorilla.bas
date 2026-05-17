import type { Projectile, PowerUpType } from "./types";
import {
  BIG_BANANA_EXPLOSION_MULT, EXPLOSION_RADIUS,
  RICOCHET_MAX_BOUNCES, WRAP_MAX_WRAPS, PORTAL_MAX_PASSES,
  CLUSTER_SPLIT_MS, WIDTH,
  CLUSTER_SUB_COUNT, CLUSTER_FAN_DEGREES, CLUSTER_EXPLOSION_MULT, Y_SCALE,
} from "./config";
import { restartProjectile } from "./physics";

export function applyPowerUpToProjectile(
  proj: Projectile,
  powerUp: PowerUpType | null,
  launchTime: number
): void {
  if (!powerUp) return;

  proj.powerUpType = powerUp;

  switch (powerUp) {
    case "big_banana":
      proj.explosionRadius = EXPLOSION_RADIUS * BIG_BANANA_EXPLOSION_MULT;
      break;
    case "ricochet":
      proj.bouncesRemaining = RICOCHET_MAX_BOUNCES;
      break;
    case "wrap_around":
      proj.wrapsRemaining = WRAP_MAX_WRAPS;
      break;
    case "cluster_bomb":
      proj.splitTimer = launchTime + CLUSTER_SPLIT_MS;
      break;
    case "portal":
      proj.portalPassesRemaining = PORTAL_MAX_PASSES;
      break;
    // two_bananas, teleportation, confetti, poison: no projectile mods needed
  }
}

export function splitClusterBomb(
  x: number,
  y: number,
  vx: number,
  vy: number,
  _wind: number,
  gravity: number,
  projT: number
): Projectile[] {
  const subs: Projectile[] = [];

  // Calculate current velocity at split time (physics-convention)
  // vy in physics = positive up; screen-space vy = (-vy + gravity * t) * Y_SCALE
  const currentVyPhysics = -vy + gravity * projT;
  const screenVy = currentVyPhysics * Y_SCALE;

  // Work in screen space for angle/speed to avoid Y_SCALE distortion
  const baseAngle = Math.atan2(-screenVy, vx);
  const fanRad = (CLUSTER_FAN_DEGREES * Math.PI) / 180;
  const speed = Math.sqrt(vx * vx + screenVy * screenVy) * 0.7;

  const subCount = CLUSTER_SUB_COUNT as number;
  for (let i = 0; i < subCount; i++) {
    const frac = subCount === 1 ? 0 : (i / (subCount - 1)) - 0.5;
    const angle = baseAngle + frac * fanRad;

    const screenVxSub = Math.cos(angle) * speed;
    const screenVySub = Math.sin(angle) * speed;
    const sub: Projectile = {
      startX: x,
      startY: y,
      vx: screenVxSub,
      vy: screenVySub / Y_SCALE,
      t: 0,
      active: true,
      isSubProjectile: true,
      explosionRadius: EXPLOSION_RADIUS * CLUSTER_EXPLOSION_MULT,
    };
    subs.push(sub);
  }

  return subs;
}

export function handleRicochet(
  proj: Projectile,
  x: number,
  y: number,
  _wind: number,
  gravity: number
): Projectile | null {
  if (!proj.bouncesRemaining || proj.bouncesRemaining <= 0) return null;

  // Calculate current vertical velocity in screen coords (positive = downward)
  // Physics: y = startY - vy * t * Y_SCALE + 0.5 * gravity * t^2 * Y_SCALE
  // So screen vy = -vy + gravity * t (before Y_SCALE multiplication)
  const currentVy = -proj.vy + gravity * proj.t;

  let newVx: number;
  let newVy: number;

  if (x <= 0 || x >= WIDTH) {
    // Horizontal edge: flip horizontal, preserve vertical
    // Use wind-free vx (physics re-applies wind via parametric formula)
    newVx = -proj.vx;
    // Convert screen-vy back to launch convention (positive = up)
    newVy = -currentVy;
  } else if (y <= 0) {
    // Top edge: preserve horizontal, flip vertical
    newVx = proj.vx;
    // currentVy is negative (going up), flip to positive (going down in screen = up in launch convention... wait)
    // At top edge, banana is moving upward, so currentVy is negative (screen coords).
    // Bounce means it should now move downward. Negate currentVy: becomes positive (downward in screen).
    // Convert to launch convention: negate again. So newVy = currentVy (which is negative = downward in launch).
    newVy = currentVy;
  } else {
    return null;
  }

  const restarted = restartProjectile(proj, x, y, newVx, newVy);
  restarted.bouncesRemaining = proj.bouncesRemaining - 1;
  return restarted;
}

export function handleWrapAround(
  proj: Projectile,
  x: number,
  y: number,
  _wind: number,
  gravity: number
): Projectile | null {
  if (!proj.wrapsRemaining || proj.wrapsRemaining <= 0) return null;

  if (x <= 0 || x >= WIDTH) {
    const newX = x <= 0 ? WIDTH - 1 : 1;
    // Preserve trajectory direction. Use wind-free vx (physics re-applies wind).
    // Convert current screen-vy back to launch convention.
    const currentVy = -proj.vy + gravity * proj.t;

    const restarted = restartProjectile(proj, newX, y, proj.vx, -currentVy);
    restarted.wrapsRemaining = proj.wrapsRemaining - 1;
    return restarted;
  }

  return null;
}
