import type { Projectile, PowerUpType, Portal } from "./types";
import {
  BIG_BANANA_EXPLOSION_MULT, EXPLOSION_RADIUS,
  RICOCHET_MAX_BOUNCES, WRAP_MAX_WRAPS, PORTAL_MAX_PASSES,
  CLUSTER_SPLIT_MS, WIDTH,
  CLUSTER_SUB_COUNT, CLUSTER_FAN_DEGREES, CLUSTER_EXPLOSION_MULT, Y_SCALE,
  RUBBER_MAX_BOUNCES, HOMING_NUDGE, DRUNK_WOBBLE_AMP, GIANT_EXPLOSION_MULT,
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
    case "rubber":
      proj.rubberBouncesRemaining = RUBBER_MAX_BOUNCES;
      break;
    case "giant":
      proj.explosionRadius = EXPLOSION_RADIUS * GIANT_EXPLOSION_MULT;
      break;
    case "drunk": {
      // Store perpendicular direction in SCREEN SPACE (not launch convention)
      // proj.vy is launch convention (positive = up), screen vy = -proj.vy * Y_SCALE
      const screenVy = -proj.vy * Y_SCALE;
      const speed = Math.sqrt(proj.vx * proj.vx + screenVy * screenVy);
      if (speed > 0) {
        proj.drunkPerpX = -screenVy / speed;
        proj.drunkPerpY = proj.vx / speed;
      } else {
        proj.drunkPerpX = 0;
        proj.drunkPerpY = 1;
      }
      break;
    }
    // ice, mirror, gravity_flip, shield, homing, ghost, boomerang, earthquake:
    // no projectile mods needed at launch time
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

export function checkPortalEntry(
  proj: Projectile,
  pos: { x: number; y: number },
  portals: [Portal | null, Portal | null],
  gravity: number
): Projectile | null {
  if (!portals[0] || !portals[1]) return null;
  if (proj.portalPassesRemaining !== undefined && proj.portalPassesRemaining <= 0) return null;

  for (let i = 0; i < 2; i++) {
    const portal = portals[i]!;
    const otherPortal = portals[1 - i]!;

    // Check if banana is near this portal (within ~18px)
    const dx = pos.x - portal.x;
    const dy = pos.y - portal.y;
    if (Math.abs(dx) < 18 && Math.abs(dy) < 18) {
      // Use current velocity (wind-free vx, convert screen-vy to launch convention)
      const currentVy = -proj.vy + gravity * proj.t;
      const restarted = restartProjectile(
        proj, otherPortal.x, otherPortal.y,
        proj.vx,      // wind-free (physics re-applies wind)
        -currentVy     // negate screen-vy back to launch convention
      );
      restarted.portalPassesRemaining = (proj.portalPassesRemaining ?? PORTAL_MAX_PASSES) - 1;
      return restarted;
    }
  }
  return null;
}

export function handleRubberBounce(
  proj: Projectile,
  x: number,
  y: number,
  hitSurface: "top" | "side" | "edge_left" | "edge_right" | "edge_top",
  gravity: number
): Projectile | null {
  if (!proj.rubberBouncesRemaining || proj.rubberBouncesRemaining <= 0) return null;

  const currentVy = -proj.vy + gravity * proj.t;
  let newVx = proj.vx;
  let newVy = -currentVy; // convert back to launch convention

  switch (hitSurface) {
    case "top":
      // Bounce off building top: flip vertical
      newVy = currentVy; // reflect: was going down, now going up in launch convention
      break;
    case "side":
    case "edge_left":
    case "edge_right":
      // Bounce off side: flip horizontal
      newVx = -proj.vx;
      newVy = -currentVy;
      break;
    case "edge_top":
      // Bounce off top of screen
      newVy = currentVy;
      break;
  }

  // Chaotic velocity mutations
  newVx *= 0.5 + Math.random(); // 0.5 to 1.5
  newVy += newVy * (Math.random() * 0.6 - 0.3); // +/- 30%
  // Increase speed by 10%
  newVx *= 1.1;
  newVy *= 1.1;

  const restarted = restartProjectile(proj, x, y, newVx, newVy);
  restarted.rubberBouncesRemaining = proj.rubberBouncesRemaining - 1;
  return restarted;
}

export function applyHomingNudge(
  proj: Projectile,
  currentPos: { x: number; y: number },
  targetX: number,
  _wind: number,
  gravity: number
): boolean {
  // Only activate after apex (screen-vy becomes positive = moving downward)
  const screenVy = -proj.vy + gravity * proj.t;
  if (screenVy <= 0) return false; // still going up

  const diff = targetX - currentPos.x;
  if (Math.abs(diff) < 2) return false; // close enough

  // Directly nudge vx toward target (no restart — avoids t=0 reset breaking apex check)
  proj.vx += Math.sign(diff) * HOMING_NUDGE;
  return true;
}

export function applyDrunkWobble(
  pos: { x: number; y: number },
  proj: Projectile
): { x: number; y: number } {
  if (proj.drunkPerpX === undefined || proj.drunkPerpY === undefined) return pos;
  const wobble = Math.sin(proj.t * 8) * DRUNK_WOBBLE_AMP;
  return {
    x: pos.x + proj.drunkPerpX * wobble,
    y: pos.y + proj.drunkPerpY * wobble,
  };
}

export function handleBoomerangReturn(
  proj: Projectile,
  missX: number,
  missY: number,
  throwerX: number,
  throwerY: number
): Projectile | null {
  if (proj.boomerangReturned) return null;

  // Calculate angle from miss position back to thrower
  const dx = throwerX - missX;
  const dy = throwerY - missY;
  const angle = Math.atan2(-dy, dx); // negative dy because screen Y is inverted
  const speed = Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy) * 0.7;

  const newVx = Math.cos(angle) * speed;
  const newVy = Math.sin(angle) * speed;

  const restarted = restartProjectile(proj, missX, missY, newVx, newVy);
  restarted.boomerangReturned = true;
  return restarted;
}
