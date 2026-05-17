export interface Circle {
  cx: number;
  cy: number;
  radius: number;
}

export interface GameWindow {
  x: number;
  y: number;
  lit: boolean;
}

export interface Building {
  x: number;
  y: number; // top of building
  width: number;
  height: number;
  color: string;
  windows: GameWindow[];
  damage: Circle[]; // reserved for future destructibility
}

export interface Gorilla {
  x: number; // top-left of bounding box
  y: number;
  width: number;
  height: number;
  playerNum: 1 | 2;
  armState: ArmState;
}

export type ArmState = "down" | "left_up" | "right_up";

export interface Projectile {
  startX: number;
  startY: number;
  vx: number;
  vy: number;
  t: number;
  active: boolean;
}

export type GamePhase =
  | "title"
  | "config"
  | "round_start"
  | "aim"
  | "power"
  | "flight"
  | "explosion"
  | "victory"
  | "game_over";

export type GravityPreset = "moon" | "earth" | "jupiter";

export interface GameState {
  phase: GamePhase;
  currentPlayer: 1 | 2;
  buildings: Building[];
  gorillas: [Gorilla, Gorilla];
  wind: number;
  gravity: number;
  scores: [number, number];
  targetScore: number;
  gravityPreset: GravityPreset;
  playerNames: [string, string];
  angle: number;
  power: number;
  projectile: Projectile | null;
  explosionTimer: number;
  victoryTimer: number;
  roundStartTimer: number;
  powerMeterValue: number;
  powerMeterDirection: 1 | -1;
  powerDeadZoneTimer: number;
  sunShocked: boolean;
  lastHitPlayer: 1 | 2 | null;
}
