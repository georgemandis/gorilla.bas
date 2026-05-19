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

export interface GorillaCostume {
  bodyColor?: string;
  eyeColor?: string;
  hat?: "crown" | "tophat" | "banana" | "cowboy" | "yellowhat";
  coat?: "yellowraincoat" | "cape" | "vest";
  accessory?: "sunglasses" | "bowtie" | "scar" | "redeyes";
}

export interface GorillaTints {
  poison?: boolean;
  ice?: boolean;
  mirror?: boolean;
  gravity?: boolean;
  shield?: boolean;
}

export interface Projectile {
  startX: number;
  startY: number;
  vx: number;
  vy: number;
  t: number;
  active: boolean;
  // Power-up extensions
  bouncesRemaining?: number;
  wrapsRemaining?: number;
  portalPassesRemaining?: number;
  isSubProjectile?: boolean;
  splitTimer?: number;        // millis() timestamp for cluster bomb
  explosionRadius?: number;   // override for big banana / sub-projectiles
  powerUpType?: PowerUpType;
  boomerangReturned?: boolean;
  rubberBouncesRemaining?: number;
  drunkPerpX?: number;
  drunkPerpY?: number;
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
  | "bananality"
  | "game_over"
  | "jump"
  | "hazard_damage";

export type GravityPreset = "moon" | "earth" | "jupiter";
export type TimeOfDay = "day" | "night";
export type CityTheme = "classic" | "neon" | "brick" | "pastel";

export type PowerUpType = "big_banana" | "two_bananas" | "ricochet" | "wrap_around"
  | "cluster_bomb" | "teleportation" | "portal" | "confetti" | "poison"
  | "ice" | "mirror" | "gravity_flip" | "shield" | "rubber" | "homing"
  | "ghost" | "giant" | "boomerang" | "drunk" | "earthquake"
  | "demolition" | "construction" | "jump" | "fire" | "lava" | "storm";

export interface PowerUpCrate {
  x: number;
  y: number;
  targetY: number;
  buildingIdx: number;
  powerUp: PowerUpType;
  falling: boolean;
  fallY: number;
  fallVx: number;
}

export interface Portal {
  edge: "left" | "right";
  x: number;
  y: number;
  color: "orange" | "blue";
}

export interface FallingAnim {
  targetY: number;
}

export interface JumpAnim {
  playerIdx: 0 | 1;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  startTime: number;
  wrapDirection: "left" | "right" | null;
}

export interface GameState {
  phase: GamePhase;
  currentPlayer: 1 | 2;
  buildings: Building[];
  gorillas: [Gorilla, Gorilla];
  wind: number;
  gravity: number;
  scores: [number, number];
  targetScore: number;
  maxHP: number;
  hp: [number, number];
  gravityPreset: GravityPreset;
  timeOfDay: TimeOfDay;
  cityTheme: CityTheme;
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
  crate: PowerUpCrate | null;
  inventory: [PowerUpType[], PowerUpType[]];
  selectedPowerUp: PowerUpType | null;
  selectedSlotIndex: number;          // -2 = normal banana, -1 = jump, 0+ = inventory slot
  inventoryOpen: boolean;
  inventoryScrollOffset: number;
  extraThrowRemaining: boolean;
  isExtraThrow: boolean;
  portals: [Portal | null, Portal | null];
  activeSubProjectiles: Projectile[];
  poisonTurns: [number, number];
  iceTurns: [number, number];
  mirrorTurns: [number, number];
  gravityTurns: [number, number];
  shield: [boolean, boolean];
  earthquakeTimer: number;
  fallingGorillas: [FallingAnim | null, FallingAnim | null];
  jumpAnim: JumpAnim | null;
  floatingText: { x: number; y: number; label: string; color: "red" | "green"; timer: number } | null;
  startingItems: number;
  burningBuildings: Set<number>;
  lavaActive: boolean;
  lavaHeight: number;
  stormActive: boolean;
  fizzleTimer: number;
  fizzlePlayerIdx: 0 | 1;
  hazardDamageStep: number;
  hazardDamageTimer: number;
  lightningTarget: number;
  gameOverEnteredAt: number;
}
