import type { GravityPreset, CityTheme, TimeOfDay } from "./types";

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
export const VELOCITY_SCALE = 0.8;
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

// City themes
export const CITY_THEME_COLORS: Record<CityTheme, string[]> = {
  classic: ["#7a60a8", "#5a8a6b", "#8a5a5a", "#5a7a9a"],
  neon: ["#1a1a2e", "#16213e", "#0f3460", "#1a1a2e"],
  brick: ["#8b4513", "#a0522d", "#6b3410", "#7a4a2a"],
  pastel: ["#b5a8d0", "#a8c8b0", "#d0a8a8", "#a8b8c8"],
};
export const CITY_THEME_OPTIONS: CityTheme[] = ["classic", "neon", "brick", "pastel"];

export const WINDOW_COLORS: Record<TimeOfDay, { lit: string; dark: string }> = {
  day: { lit: "#ffd700", dark: "#2a2a4a" },
  night: { lit: "#ffe87c", dark: "#0a0a1a" },
};

// Neon theme gets special bright windows
export const NEON_WINDOW_COLORS: string[] = ["#ff006e", "#00f5d4", "#fee440", "#8338ec", "#3a86ff"];

export const SKY_COLORS: Record<TimeOfDay, [number, number, number]> = {
  day: [50, 50, 120],
  night: [10, 10, 35],
};

export const GROUND_COLORS: Record<TimeOfDay, [number, number, number]> = {
  day: [30, 30, 50],
  night: [8, 8, 20],
};

// Legacy exports for compatibility
export const BUILDING_COLORS = CITY_THEME_COLORS.classic;
export const WINDOW_COLOR_LIT = "#ffd700";
export const WINDOW_COLOR_DARK = "#2a2a4a";
export const BOTTOM_LINE = HEIGHT - 20;
export const MIN_BUILDING_WIDTH = 25;
export const MAX_BUILDING_WIDTH = 50;

// Target scores
export const TARGET_SCORE_OPTIONS = [1, 3, 5, 7];
export const GRAVITY_PRESET_OPTIONS: GravityPreset[] = ["moon", "earth", "jupiter"];
export const TIME_OF_DAY_OPTIONS: TimeOfDay[] = ["day", "night"];

// Sun
export const SUN_X = WIDTH / 2;
export const SUN_Y = 25;
export const SUN_RADIUS = 12;
