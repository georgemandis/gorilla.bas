import type { Projectile, PowerUpType } from "./types";
import {
  BIG_BANANA_EXPLOSION_MULT, EXPLOSION_RADIUS,
  RICOCHET_MAX_BOUNCES, WRAP_MAX_WRAPS, PORTAL_MAX_PASSES,
  CLUSTER_SPLIT_MS, WIDTH,
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
