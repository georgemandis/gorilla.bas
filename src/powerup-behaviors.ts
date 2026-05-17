import type { Projectile, PowerUpType } from "./types";
import {
  BIG_BANANA_EXPLOSION_MULT, EXPLOSION_RADIUS,
  RICOCHET_MAX_BOUNCES, WRAP_MAX_WRAPS, PORTAL_MAX_PASSES,
  CLUSTER_SPLIT_MS,
} from "./config";

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
