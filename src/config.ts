import type { GravityPreset } from "./types";

export const WIDTH = 336;
export const HEIGHT = 262;

// Physics
export const GRAVITY_VALUES: Record<GravityPreset, number> = {
  moon: 1.6,
  earth: 9.8,
  jupiter: 24.8,
};
export const PHYSICS_DT = 0.1;
export const MAX_FLIGHT_T = 50.0;
export const VELOCITY_SCALE = 1.2;
export const Y_SCALE = HEIGHT / 350;

// Power meter
export const POWER_CYCLE_MS = 1500;
export const POWER_DEAD_ZONE_MS = 300;

// Spinner
export const DEGREES_PER_STEP = 5;
export const INITIAL_ANGLE_P1 = 45;
export const INITIAL_ANGLE_P2 = 135;

// Gorilla
export const GORILLA_WIDTH = 20;
export const GORILLA_HEIGHT = 25;

// Explosion
export const EXPLOSION_EXPAND_MS = 300;
export const EXPLOSION_CONTRACT_MS = 200;
export const EXPLOSION_RADIUS = 15;

// Victory
export const VICTORY_DURATION_MS = 2000;
export const ROUND_START_DELAY_MS = 1500;

// UI
export const POWER_METER_WIDTH = 15;
export const POWER_METER_HEIGHT = 80;
export const ANGLE_ARROW_LENGTH = 20;

// Wind
export const WIND_BASE_RANGE = 5;
export const WIND_STRONG_EXTRA = 10;
export const WIND_STRONG_CHANCE = 1 / 3;

// City
export const BUILDING_COLORS = ["#4a3a6b", "#3a5a4b", "#5a3a3a", "#3a4a5a"];
export const WINDOW_COLOR_LIT = "#ffd700";
export const WINDOW_COLOR_DARK = "#1a1a2a";
export const BOTTOM_LINE = HEIGHT - 20;
export const MIN_BUILDING_WIDTH = 25;
export const MAX_BUILDING_WIDTH = 50;

// Target scores
export const TARGET_SCORE_OPTIONS = [1, 3, 5, 7];
export const GRAVITY_PRESET_OPTIONS: GravityPreset[] = ["moon", "earth", "jupiter"];

// Sun
export const SUN_X = WIDTH / 2;
export const SUN_Y = 25;
export const SUN_RADIUS = 12;
