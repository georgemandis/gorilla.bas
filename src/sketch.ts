import p5 from "p5";
import type { GameState, Building } from "./types";
import {
  WIDTH, HEIGHT, INITIAL_ANGLE_P1, INITIAL_ANGLE_P2,
  GRAVITY_VALUES, POWER_CYCLE_MS, POWER_DEAD_ZONE_MS,
  EXPLOSION_EXPAND_MS, EXPLOSION_CONTRACT_MS,
  VICTORY_DURATION_MS, ROUND_START_DELAY_MS,
  TARGET_SCORE_OPTIONS, GRAVITY_PRESET_OPTIONS,
  GORILLA_WIDTH, GORILLA_HEIGHT,
  EXPLOSION_RADIUS, BOTTOM_LINE,
  CITY_THEME_OPTIONS,
  TIME_OF_DAY_OPTIONS,
  WINDOW_COLORS, NEON_WINDOW_COLORS,
  SKY_COLORS, GROUND_COLORS,
  POISON_TURNS, POISON_POWER_CAP, ICE_TURNS, MIRROR_TURNS, GRAVITY_TURNS,
  ALL_POWERUP_TYPES, GIANT_POWER_MULT, GIANT_HITBOX_MULT, HP_OPTIONS, STARTING_ITEMS_OPTIONS,
  LAVA_HEIGHT_OFFSET, FIZZLE_BUBBLE_MS, STORM_LIGHTNING_DELAY_MS, FIRE_DAMAGE_PER_TURN,
  EARTHQUAKE_SHAKE_MS,
  FALLING_SPEED,
  CONSTRUCTION_HEIGHT_ADD,
  CITY_THEME_COLORS,
  JUMP_ARC_MS,
  JUMP_ARC_HEIGHT,
  AWARD_REVEAL_1_MS, AWARD_REVEAL_2_MS, AWARD_BONUS_MS, AWARD_START_VISIBLE_MS,
} from "./config";
import { getPlayerInput, getSystemInput } from "./input";
import { generateCityscape, placeGorillas, generateWind, randomGorillaPlacements, reshuffleBuildings, checkGorillaGroundSupport, insertBuilding } from "./city";
import { createProjectile, getProjectilePositionWithGravity, advanceProjectile } from "./physics";
import { checkCollision } from "./collision";
import { drawGorilla } from "./gorilla";
import {
  drawScores, drawAngleIndicator, drawActivePlayerIndicator, drawPowerMeter,
  drawSun, drawEvilSun, drawExplosion, drawTitleScreen, drawConfigScreen,
  drawGameOver, drawInventoryHUD, drawPortals, drawHP, drawFloatingText,
  drawBurningBuildings, drawLava, drawStormClouds, drawLightning, drawFizzleBubble,
} from "./ui";
import { randomName } from "./names";
import { getCostume } from "./costumes";
import { playSound, startPowerHum, updatePowerHum, stopPowerHum } from "./sound";
import { trySpawnCrate, updateCrateFall, drawCrate, collectCrate, consumeSelectedPowerUp, powerUpShortName } from "./powerups";
import { applyPowerUpToProjectile, handleRicochet, handleWrapAround, splitClusterBomb, checkPortalEntry, applyHomingNudge, handleRubberBounce, applyDrunkWobble, handleBoomerangReturn } from "./powerup-behaviors";
import {
  createGameStats, recordThrow, recordHit, recordSelfKill, recordKill,
  recordFirstThrowKill, recordDeath, recordPowerUp, recordJump, recordShield,
  resetRoundThrows, pickStatAward, pickNameAward,
} from "./stats";
import type { GameStats, Award, NameAward } from "./stats";

function createInitialState(): GameState {
  return {
    phase: "title",
    currentPlayer: 1,
    buildings: [],
    gorillas: [
      { x: 0, y: 0, width: GORILLA_WIDTH, height: GORILLA_HEIGHT, playerNum: 1, armState: "down" },
      { x: 0, y: 0, width: GORILLA_WIDTH, height: GORILLA_HEIGHT, playerNum: 2, armState: "down" },
    ],
    wind: 0,
    gravity: 9.8,
    scores: [0, 0],
    targetScore: 3,
    maxHP: 1,
    hp: [1, 1],
    gravityPreset: "earth",
    timeOfDay: "day",
    cityTheme: "classic",
    playerNames: [randomName(), randomName()],
    angle: INITIAL_ANGLE_P1,
    power: 0,
    projectile: null,
    explosionTimer: 0,
    victoryTimer: 0,
    roundStartTimer: 0,
    powerMeterValue: 0,
    powerMeterDirection: 1,
    powerDeadZoneTimer: 0,
    sunShocked: false,
    lastHitPlayer: null,
    crate: null,
    inventory: [[], []],
    selectedPowerUp: null,
    selectedSlotIndex: -2,
    inventoryOpen: false,
    inventoryScrollOffset: 0,
    extraThrowRemaining: false,
    isExtraThrow: false,
    portals: [null, null],
    activeSubProjectiles: [],
    poisonTurns: [0, 0],
    iceTurns: [0, 0],
    mirrorTurns: [0, 0],
    gravityTurns: [0, 0],
    shield: [false, false],
    earthquakeTimer: 0,
    fallingGorillas: [null, null],
    jumpAnim: null,
    floatingText: null,
    startingItems: 0,
    burningBuildings: new Set<number>(),
    lavaActive: false,
    lavaHeight: BOTTOM_LINE,
    stormActive: false,
    fizzleTimer: 0,
    fizzlePlayerIdx: 0,
    hazardDamageStep: 0,
    hazardDamageTimer: 0,
    lightningTarget: -1,
    gameOverEnteredAt: 0,
  };
}

const sketch = (p: p5) => {
  let state: GameState;
  let configCursor = 0;
  let prevA1 = false;
  let prevA2 = false;
  let prevDpadUp = false;
  let prevDpadDown = false;
  let prevDpadLeft = false;
  let prevDpadRight = false;
  let explosionX = 0;
  let explosionY = 0;
  let activeExplosionRadius = EXPLOSION_RADIUS;
  let confettiParticles: { x: number; y: number; vx: number; vy: number; color: string }[] = [];
  let confettiTimer = 0;
  const CONFETTI_DURATION_MS = 1500;
  const CONFETTI_REACTIONS = ["...What?", "Huh?!", "Confetti?!", "*blinks*", "Wha...?", "???", "Seriously?!"];
  let teleportAnimTimer = 0;
  let teleportAnimTargets: [{ x: number; y: number }, { x: number; y: number }] | null = null;
  const TELEPORT_ANIM_MS = 800;
  let bananaRotation = 0;
  let lastAngles: [number, number] = [INITIAL_ANGLE_P1, INITIAL_ANGLE_P2];
  let loserFallOffset = 0;
  let clouds: { x: number; y: number; w: number; h: number }[] = [];
  let prevB1 = false;
  let prevB2 = false;
  let savedPowerUp: import("./types").PowerUpType | null = null;
  let savedSlotIndex = -2;
  // Per-player selection memory (persists across turns)
  let playerSelectedPowerUp: [import("./types").PowerUpType | null, import("./types").PowerUpType | null] = [null, null];
  let playerSelectedSlotIndex: [number, number] = [-2, -2];
  let prevStart1P = false;
  let prevStart2P = false;
  let prevTauntUp = false;
  let prevTauntSide = false;
  let tauntDanceTimer = 0;
  let tauntDancePlayer: 1 | 2 | null = null;
  let tauntDanceType = 0;
  let tauntDanceHop = 0;
  let tauntBubbleTimer = 0;
  let tauntBubblePlayer: 1 | 2 | null = null;
  let tauntBubbleText = "";
  const TAUNT_DANCE_MS = 600;
  const TAUNT_BUBBLE_MS = 2000;
  const SELF_HIT_TAUNTS = [
    "LMAOOO", "You hit YOURSELF!", "OOH OOH OOH!", "*dies laughing*",
    "Skill issue!", "Wrong ape!", "Self-bonk!", "*points & hoots*",
    "BIG BRAIN!", "Nice aim LOL", "Thanks free point!", "U ok??",
    "HAHAHAHA!", "*rolls around*", "Wait WHAT", "Classic!",
    "Ape vs Self!", "Banana boomerang!", "*slow clap*", "Pro move!",
  ];
  const TAUNTS = [
    "OOH OOH!", "Nice throw!", "GG EZ", "*beats chest*", "Oops!",
    "Missed!", "OOH AH AH!", "Wow...", "Really?", "*scratches*",
    "Bruh", "Peel this!", "So close!", "Nope!", "Try again!",
    "Bonk!", "*grooms u*", "RIP", "Oof!", "Get rekt!",
    "Go bananas!", "U mad ape?", "Skill issue", "*flings poo*",
    "Hold this L", "No banana!", "Tragic", "*munches*",
    "EZ clap", "Whiff!", "*yawns*", "*picks bugs*", "Oh no...",
    "Git gud", "Weak arm!", "Lol wut", "Srsly?", "KONG MAD",
    "APE STRONG!", "No way!", "BYE BYE", "*hoots*",
    "Top banana!", "Go climb!", "*thumps*", "Ape out!",
  ];
  let costumes: [ReturnType<typeof getCostume>, ReturnType<typeof getCostume>] = [null, null];

  let gameStats = createGameStats();
  let gameOverAwards: { p1: Award; p2: Award; bonus: NameAward | null } | null = null;
  let awardSound1Played = false;
  let awardSound2Played = false;
  let awardBonusSoundPlayed = false;

  // Bananality secret code tracking
  const KONAMI = ["up", "up", "down", "down", "left", "right", "left", "right", "b", "a"];
  const BANANALITY_SPINS = 4; // full rotations needed after code
  let konamiProgress = 0;
  let konamiSpinAccum = 0;
  let konamiPlayer: 1 | 2 | null = null; // who entered the code
  let prevIdleDpadUp = false;
  let prevIdleDpadDown = false;
  let prevIdleDpadLeft = false;
  let prevIdleDpadRight = false;
  let prevIdleA = false;
  let prevIdleB = false;

  // Bananality phase state
  let banalityTimer = 0;
  let banalityBananas: { x: number; y: number; vy: number; rot: number; landed: boolean; explodeTime: number }[] = [];
  let banalityRevealPlayed = false;
  const BANANALITY_OMEN_MS = 2000;     // gray pause before rain
  const BANANALITY_RAIN_MS = 8000;     // banana rain duration
  const BANANALITY_REVEAL_MS = 3000;   // text display after rain
  const BANANALITY_TOTAL_MS = BANANALITY_OMEN_MS + BANANALITY_RAIN_MS + BANANALITY_REVEAL_MS;

  let arcadeFont: p5.Font;

  p.preload = () => {
    arcadeFont = p.loadFont("PressStart2P.ttf");
  };

  p.setup = () => {
    p.createCanvas(WIDTH, HEIGHT);
    p.textFont(arcadeFont);
    state = createInitialState();
    costumes = [getCostume(state.playerNames[0]), getCostume(state.playerNames[1])];
  };

  p.draw = () => {
    const sky = SKY_COLORS[state.timeOfDay];
    p.background(sky[0], sky[1], sky[2]);
    const sys = getSystemInput();
    const p1Input = getPlayerInput(1);
    const p2Input = getPlayerInput(2);
    const activeInput = state.currentPlayer === 1 ? p1Input : p2Input;

    updateFallingGorillas();

    switch (state.phase) {
      case "title":
        updateTitle(sys);
        drawTitleScreen(p);
        break;

      case "config":
        updateConfig(p1Input, p2Input, sys);
        drawConfigScreen(p, state, configCursor);
        break;

      case "round_start":
        updateRoundStart();
        drawGameplay(p);
        break;

      case "aim":
        updateAim(activeInput);
        if (!state.inventoryOpen) updateTaunts(p1Input, p2Input);
        updateKonamiCode(p1Input, p2Input);
        drawGameplay(p);
        break;

      case "power":
        updatePower(activeInput);
        updateTaunts(p1Input, p2Input);
        updateKonamiCode(p1Input, p2Input);
        drawGameplay(p);
        drawPowerMeter(p, state);
        break;

      case "flight":
        if (teleportAnimTargets) {
          updateTeleportAnim(p);
        } else if (state.projectile || state.earthquakeTimer > 0) {
          updateFlight();
        } else if (state.activeSubProjectiles.length > 0) {
          updateSubProjectiles();
        }
        updateTaunts(p1Input, p2Input);
        // Earthquake screen shake visual
        if (state.earthquakeTimer > 0) {
          const shakeElapsed = p.millis() - state.earthquakeTimer;
          if (shakeElapsed < EARTHQUAKE_SHAKE_MS) {
            const intensity = 3 * (1 - shakeElapsed / EARTHQUAKE_SHAKE_MS);
            p.translate((Math.random() - 0.5) * intensity * 2, (Math.random() - 0.5) * intensity * 2);
          }
        }
        drawGameplay(p);
        if (state.projectile) {
          drawBanana(p);
        }
        drawSubProjectiles(p);
        drawConfetti(p);
        drawTeleportAnim(p);
        break;

      case "explosion":
        updateExplosion();
        drawGameplay(p);
        if (confettiParticles.length > 0) {
          drawConfetti(p);
        } else {
          drawExplosion(p, explosionX, explosionY, getExplosionProgress(), activeExplosionRadius);
        }
        break;

      case "jump":
        updateJump();
        drawGameplay(p);
        break;

      case "victory":
        updateVictory();
        drawGameplay(p);
        break;

      case "bananality":
        updateBananality();
        drawBananality(p);
        break;

      case "hazard_damage":
        updateHazardDamage();
        drawGameplay(p);
        // Draw lightning during storm step
        if (state.stormActive && state.lightningTarget >= 0 && state.hazardDamageStep === 1) {
          const targetBuilding = state.buildings[state.lightningTarget];
          if (targetBuilding && targetBuilding.height > 0) {
            const progress = (p.millis() - state.hazardDamageTimer) / STORM_LIGHTNING_DELAY_MS;
            drawLightning(p, targetBuilding.x + targetBuilding.width / 2, targetBuilding.y, progress);
          }
        }
        break;

      case "game_over":
        updateGameOver(sys);
        drawGameOver(p, state, gameOverAwards ?? undefined);
        break;
    }

    prevA1 = p1Input.a;
    prevA2 = p2Input.a;
    prevB1 = p1Input.b;
    prevB2 = p2Input.b;
    prevStart1P = sys.onePlayer;
    prevStart2P = sys.twoPlayer;
  };

  function updateTitle(sys: ReturnType<typeof getSystemInput>) {
    if ((sys.onePlayer && !prevStart1P) || (sys.twoPlayer && !prevStart2P)) {
      state.phase = "config";
    }
  }

  function updateConfig(
    p1: ReturnType<typeof getPlayerInput>,
    p2: ReturnType<typeof getPlayerInput>,
    sys: ReturnType<typeof getSystemInput>
  ) {
    // Spinner re-rolls names
    if (p1.spinnerDelta !== 0) {
      state.playerNames[0] = randomName();
      costumes[0] = getCostume(state.playerNames[0]);
    }
    if (p2.spinnerDelta !== 0) {
      state.playerNames[1] = randomName();
      costumes[1] = getCostume(state.playerNames[1]);
    }

    // DPAD navigation — edge-detected
    const curUp = p1.dpadUp || p2.dpadUp;
    const curDown = p1.dpadDown || p2.dpadDown;
    const curLeft = p1.dpadLeft || p2.dpadLeft;
    const curRight = p1.dpadRight || p2.dpadRight;

    const dpad = (curUp && !prevDpadUp) ? "up"
      : (curDown && !prevDpadDown) ? "down"
      : (curLeft && !prevDpadLeft) ? "left"
      : (curRight && !prevDpadRight) ? "right"
      : null;

    prevDpadUp = curUp;
    prevDpadDown = curDown;
    prevDpadLeft = curLeft;
    prevDpadRight = curRight;

    if (dpad === "up") configCursor = Math.max(0, configCursor - 1);
    if (dpad === "down") configCursor = Math.min(5, configCursor + 1);

    if (dpad === "left" || dpad === "right") {
      const dir = dpad === "right" ? 1 : -1;
      if (configCursor === 0) {
        const idx = TARGET_SCORE_OPTIONS.indexOf(state.targetScore);
        const newIdx = (idx + dir + TARGET_SCORE_OPTIONS.length) % TARGET_SCORE_OPTIONS.length;
        state.targetScore = TARGET_SCORE_OPTIONS[newIdx];
      } else if (configCursor === 1) {
        const idx = GRAVITY_PRESET_OPTIONS.indexOf(state.gravityPreset);
        const newIdx = (idx + dir + GRAVITY_PRESET_OPTIONS.length) % GRAVITY_PRESET_OPTIONS.length;
        state.gravityPreset = GRAVITY_PRESET_OPTIONS[newIdx];
        state.gravity = GRAVITY_VALUES[state.gravityPreset];
      } else if (configCursor === 2) {
        const idx = TIME_OF_DAY_OPTIONS.indexOf(state.timeOfDay);
        const newIdx = (idx + dir + TIME_OF_DAY_OPTIONS.length) % TIME_OF_DAY_OPTIONS.length;
        state.timeOfDay = TIME_OF_DAY_OPTIONS[newIdx];
      } else if (configCursor === 3) {
        const idx = CITY_THEME_OPTIONS.indexOf(state.cityTheme);
        const newIdx = (idx + dir + CITY_THEME_OPTIONS.length) % CITY_THEME_OPTIONS.length;
        state.cityTheme = CITY_THEME_OPTIONS[newIdx];
      } else if (configCursor === 4) {
        const idx = HP_OPTIONS.indexOf(state.maxHP);
        const newIdx = (idx + dir + HP_OPTIONS.length) % HP_OPTIONS.length;
        state.maxHP = HP_OPTIONS[newIdx];
      } else if (configCursor === 5) {
        const idx = STARTING_ITEMS_OPTIONS.indexOf(state.startingItems);
        const newIdx = (idx + dir + STARTING_ITEMS_OPTIONS.length) % STARTING_ITEMS_OPTIONS.length;
        state.startingItems = STARTING_ITEMS_OPTIONS[newIdx];
      }
    }

    if ((sys.onePlayer && !prevStart1P) || (sys.twoPlayer && !prevStart2P)) {
      state.currentPlayer = Math.random() < 0.5 ? 1 : 2;
      startNewRound();
    }
  }

  function generateClouds() {
    clouds = [];
    const count = 2 + Math.floor(Math.random() * 3); // 2-4 clouds
    for (let i = 0; i < count; i++) {
      clouds.push({
        x: Math.random() * WIDTH,
        y: 30 + Math.random() * 50,
        w: 20 + Math.random() * 25,
        h: 8 + Math.random() * 6,
      });
    }
  }

  function startNewRound() {
    state.buildings = generateCityscape(state.cityTheme, state.timeOfDay);
    const positions = placeGorillas(state.buildings);
    state.gorillas[0].x = positions[0].x;
    state.gorillas[0].y = positions[0].y;
    state.gorillas[1].x = positions[1].x;
    state.gorillas[1].y = positions[1].y;
    state.gorillas[0].armState = "down";
    state.gorillas[1].armState = "down";
    state.wind = generateWind();
    state.sunShocked = false;
    generateClouds();
    state.crate = null;
    state.portals = [null, null];
    state.activeSubProjectiles = [];
    state.extraThrowRemaining = false;
    state.isExtraThrow = false;
    state.selectedPowerUp = null;
    state.selectedSlotIndex = -2;
    playerSelectedPowerUp = [null, null];
    playerSelectedSlotIndex = [-2, -2];
    state.inventoryOpen = false;
    state.inventoryScrollOffset = 0;
    state.hp = [state.maxHP, state.maxHP];
    state.shield = [false, false];
    state.earthquakeTimer = 0;
    state.fallingGorillas = [null, null];
    state.jumpAnim = null;
    state.floatingText = null;
    state.burningBuildings = new Set<number>();
    state.lavaActive = false;
    state.lavaHeight = BOTTOM_LINE;
    state.stormActive = false;
    state.fizzleTimer = 0;
    state.hazardDamageStep = 0;
    state.hazardDamageTimer = 0;
    state.lightningTarget = -1;
    // iceTurns, mirrorTurns, gravityTurns persist across rounds (like poisonTurns)
    resetRoundThrows(gameStats);
    // Assign random starting items
    state.inventory[0] = [];
    state.inventory[1] = [];
    for (let i = 0; i < state.startingItems; i++) {
      state.inventory[0].push(ALL_POWERUP_TYPES[Math.floor(Math.random() * ALL_POWERUP_TYPES.length)]);
      state.inventory[1].push(ALL_POWERUP_TYPES[Math.floor(Math.random() * ALL_POWERUP_TYPES.length)]);
    }
    state.phase = "round_start";
    state.roundStartTimer = p.millis();
  }

  function updateRoundStart() {
    if (p.millis() - state.roundStartTimer > ROUND_START_DELAY_MS) {
      enterAimPhase();
    }
  }

  function updateAim(input: ReturnType<typeof getPlayerInput>) {
    // Spinner rotates angle (unless frozen by ice)
    if (state.iceTurns[state.currentPlayer - 1] <= 0 && input.spinnerDelta !== 0) {
      state.angle = (state.angle + input.spinnerDelta + 360) % 360;
      playSound("aim_tick");
    }

    const playerIdx = (state.currentPlayer - 1) as 0 | 1;
    const prevB = state.currentPlayer === 1 ? prevB1 : prevB2;
    const prevA = state.currentPlayer === 1 ? prevA1 : prevA2;

    if (state.inventoryOpen) {
      // HUD navigation: -2 = NORMAL, -1 = JUMP, 0+ = inventory slots
      const inv = state.inventory[playerIdx];
      const curUp = input.dpadUp;
      const curDown = input.dpadDown;

      if (curUp && !prevDpadUp) {
        if (state.selectedSlotIndex > 0) {
          state.selectedSlotIndex--;
          state.selectedPowerUp = inv[state.selectedSlotIndex];
          if (state.selectedSlotIndex < state.inventoryScrollOffset) {
            state.inventoryScrollOffset = state.selectedSlotIndex;
          }
        } else if (state.selectedSlotIndex === 0) {
          // Move from first inventory item to jump
          state.selectedSlotIndex = -1;
          state.selectedPowerUp = null;
        } else if (state.selectedSlotIndex === -1) {
          // Move from jump to normal
          state.selectedSlotIndex = -2;
          state.selectedPowerUp = null;
        }
        playSound("powerup_select");
      }
      if (curDown && !prevDpadDown) {
        if (state.selectedSlotIndex === -2) {
          // Move from normal to jump
          state.selectedSlotIndex = -1;
          state.selectedPowerUp = null;
        } else if (state.selectedSlotIndex === -1 && inv.length > 0) {
          // Move from jump to first inventory item
          state.selectedSlotIndex = 0;
          state.selectedPowerUp = inv[0];
        } else if (state.selectedSlotIndex >= 0 && state.selectedSlotIndex < inv.length - 1) {
          state.selectedSlotIndex++;
          state.selectedPowerUp = inv[state.selectedSlotIndex];
          const itemH = 12;
          const dividerH = 4;
          const permanentRowsH = itemH * 2; // normal + jump
          const inventoryH = inv.length > 0 ? Math.min(inv.length * itemH, 120 - permanentRowsH - dividerH) : 0;
          const maxVisible = Math.floor(inventoryH / itemH);
          if (maxVisible > 0 && state.selectedSlotIndex >= state.inventoryScrollOffset + maxVisible) {
            state.inventoryScrollOffset = state.selectedSlotIndex - maxVisible + 1;
          }
        }
        playSound("powerup_select");
      }
      prevDpadUp = curUp;
      prevDpadDown = curDown;

      // B confirms selection and closes
      if (input.b && !prevB) {
        if (state.selectedSlotIndex === -2) {
          // Normal banana — clear power-up
          state.selectedPowerUp = null;
          state.inventoryOpen = false;
          state.inventoryScrollOffset = 0;
          playSound("powerup_select");
        } else if (state.selectedSlotIndex === -1) {
          // Jump
          const isBlocked = state.poisonTurns[playerIdx] > 0 || state.iceTurns[playerIdx] > 0;
          if (isBlocked) {
            playSound("crate_destroy"); // denied buzzer
          } else {
            state.selectedPowerUp = "jump";
            state.inventoryOpen = false;
            state.inventoryScrollOffset = 0;
            playSound("powerup_select");
          }
        } else {
          // Inventory item
          state.inventoryOpen = false;
          state.inventoryScrollOffset = 0;
          playSound("powerup_select");
        }
      }

      // A cancels — restore previous selection and close
      if (input.a && !prevA) {
        state.selectedPowerUp = savedPowerUp;
        state.selectedSlotIndex = savedSlotIndex;
        state.inventoryOpen = false;
        state.inventoryScrollOffset = 0;
      }
    } else {
      // B opens inventory HUD — resume where we left off
      if (input.b && !prevB) {
        savedPowerUp = state.selectedPowerUp;
        savedSlotIndex = state.selectedSlotIndex;
        const inv = state.inventory[playerIdx];
        // Validate current slot is still valid (item may have been consumed)
        if (state.selectedSlotIndex >= 0 && state.selectedSlotIndex >= inv.length) {
          state.selectedSlotIndex = -2;
          state.selectedPowerUp = null;
        }
        state.inventoryOpen = true;
        playSound("powerup_select");
      }

      // A button pressed — launch (edge detection)
      if (input.a && !prevA) {
        // Instant-action power-ups skip the power meter
        const sel = state.selectedPowerUp;
        if (sel === "jump" || sel === "shield" || sel === "teleportation") {
          state.power = sel === "teleportation" ? 50 : 0;
          launchBanana();
          return;
        }

        state.phase = "power";
        state.powerMeterValue = 0;
        state.powerMeterDirection = 1;
        state.powerDeadZoneTimer = p.millis();
        playSound("power_lock");
        startPowerHum();

        // Throwing arm animation
        const gorilla = state.gorillas[state.currentPlayer - 1];
        gorilla.armState = state.currentPlayer === 1 ? "right_up" : "left_up";
      }
    }
  }

  function updatePower(input: ReturnType<typeof getPlayerInput>) {
    // Oscillate power meter using sine wave
    const elapsed = p.millis() - state.powerDeadZoneTimer;
    const activeTime = Math.max(0, elapsed - POWER_DEAD_ZONE_MS);
    const cycleProgress = (activeTime % POWER_CYCLE_MS) / POWER_CYCLE_MS;
    state.powerMeterValue = Math.abs(Math.sin(cycleProgress * Math.PI));
    // Poison caps power
    if (state.poisonTurns[state.currentPlayer - 1] > 0) {
      state.powerMeterValue = Math.min(state.powerMeterValue, POISON_POWER_CAP);
    }
    updatePowerHum(state.powerMeterValue);

    // Check for A release (after dead zone)
    if (!input.a && elapsed > POWER_DEAD_ZONE_MS) {
      state.power = state.powerMeterValue * 100;
      stopPowerHum();
      launchBanana();
    }
  }

  function launchBanana() {
    lastAngles[state.currentPlayer - 1] = state.angle;
    const gorilla = state.gorillas[state.currentPlayer - 1];
    const playerIdx = (state.currentPlayer - 1) as 0 | 1;

    // Consume power-up first (skip on extra throw)
    const activePowerUp = state.isExtraThrow ? null : consumeSelectedPowerUp(state, playerIdx);

    if (activePowerUp) {
      recordPowerUp(gameStats, playerIdx, activePowerUp);
    }

    // Shield: instant deploy, no projectile
    if (activePowerUp === "shield") {
      state.shield[playerIdx] = true;
      playSound("shield_deploy");
      recordShield(gameStats, playerIdx);
      gorilla.armState = "down";
      resolveThrowEnd();
      return;
    }

    // Jump: instant effect, no projectile
    if (activePowerUp === "jump") {
      recordJump(gameStats, playerIdx);
      // Determine direction from angle
      let jumpRight = state.angle <= 90 || state.angle > 270;
      // Mirror inverts direction
      if (state.mirrorTurns[playerIdx] > 0) jumpRight = !jumpRight;

      const currentBuildingIdx = findBuildingUnderGorilla(gorilla, state.buildings);
      const targetIdx = findJumpTarget(currentBuildingIdx, jumpRight);

      if (targetIdx >= 0 && targetIdx !== currentBuildingIdx) {
        const targetBuilding = state.buildings[targetIdx];
        const endX = targetBuilding.x + targetBuilding.width / 2 - GORILLA_WIDTH / 2;
        const endY = targetBuilding.y - GORILLA_HEIGHT;
        const isWrapping = jumpRight
          ? targetIdx < currentBuildingIdx  // went right but ended up at lower index = wrapped
          : targetIdx > currentBuildingIdx; // went left but ended up at higher index = wrapped

        state.jumpAnim = {
          playerIdx,
          startX: gorilla.x,
          startY: gorilla.y,
          endX,
          endY,
          startTime: p.millis(),
          wrapDirection: isWrapping ? (jumpRight ? "right" : "left") : null,
        };
        state.phase = "jump";
        playSound("jump_launch");
      } else {
        // No valid building — stay put, consume turn
        resolveThrowEnd();
      }
      gorilla.armState = "down";
      return;
    }

    const angleRad = (state.angle * Math.PI) / 180;
    const launchOffset = GORILLA_HEIGHT / 2 + 5;
    const startX = gorilla.x + GORILLA_WIDTH / 2 + Math.cos(angleRad) * launchOffset;
    const startY = gorilla.y - Math.sin(angleRad) * launchOffset;

    // Giant: reduce power
    let effectivePower = state.power;
    if (activePowerUp === "giant") {
      effectivePower *= GIANT_POWER_MULT;
    }

    recordThrow(gameStats, playerIdx, effectivePower);

    state.projectile = createProjectile(startX, startY, state.angle, effectivePower);

    // Mirror: negate horizontal velocity
    if (state.mirrorTurns[playerIdx] > 0) {
      state.projectile.vx = -state.projectile.vx;
    }

    // For portal extra throw, tag projectile as portal
    if (state.isExtraThrow && state.portals[0] !== null && state.portals[1] === null) {
      state.projectile.powerUpType = "portal";
    } else {
      applyPowerUpToProjectile(state.projectile, activePowerUp, p.millis());
    }

    if (activePowerUp === "two_bananas") {
      state.extraThrowRemaining = true;
    }
    if (activePowerUp === "portal") {
      state.extraThrowRemaining = true;
    }

    state.phase = "flight";
    bananaRotation = 0;
    playSound("throw");
    gorilla.armState = "down";
  }

  function generateConfetti(cx: number, cy: number) {
    const colors = ["#ff0066", "#00ccff", "#ffcc00", "#66ff00", "#ff6600", "#cc00ff"];
    const particles = [];
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: cx, y: cy,
        vx: (Math.random() - 0.5) * 4,
        vy: -Math.random() * 3 - 1,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    return particles;
  }

  function drawConfetti(p: p5) {
    if (confettiParticles.length === 0) return;
    const elapsed = p.millis() - confettiTimer;
    if (elapsed > CONFETTI_DURATION_MS) {
      confettiParticles = [];
      return;
    }
    const fade = Math.max(0, 1 - elapsed / CONFETTI_DURATION_MS);
    for (const c of confettiParticles) {
      c.x += c.vx;
      c.y += c.vy;
      c.vy += 0.1; // gravity
      p.fill(p.red(p.color(c.color)), p.green(p.color(c.color)), p.blue(p.color(c.color)), fade * 255);
      p.noStroke();
      p.rect(c.x, c.y, 2, 2);
    }
  }

  function findBuildingUnderGorilla(gorilla: { x: number; width?: number }, buildings: Building[]): number {
    const gCenterX = gorilla.x + GORILLA_WIDTH / 2;
    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      if (gCenterX >= b.x && gCenterX <= b.x + b.width) return i;
    }
    return -1;
  }

  function setFloatingText(x: number, y: number, label: string, color: "red" | "green") {
    state.floatingText = { x, y, label, color, timer: 60 };
  }

  function findJumpTarget(currentIdx: number, goRight: boolean): number {
    const len = state.buildings.length;
    if (currentIdx < 0) return -1;

    const step = goRight ? 1 : -1;
    // Search in the aimed direction, wrapping around
    for (let i = 1; i < len; i++) {
      const idx = ((currentIdx + step * i) % len + len) % len;
      if (state.buildings[idx].height > 0) return idx;
    }
    return -1; // all buildings demolished
  }

  function triggerEarthquake() {
    reshuffleBuildings(state.buildings, state.cityTheme, state.timeOfDay);
    // Reposition gorillas on their (now shorter) buildings
    for (let i = 0; i < 2; i++) {
      const bIdx = findBuildingUnderGorilla(state.gorillas[i], state.buildings);
      if (bIdx >= 0) {
        state.gorillas[i].y = state.buildings[bIdx].y - GORILLA_HEIGHT;
      }
    }
    state.activeSubProjectiles = [];
    state.burningBuildings.clear();
    state.earthquakeTimer = p.millis();
    playSound("earthquake_rumble");
  }

  function checkAndApplyFalling() {
    for (let i = 0; i < 2; i++) {
      if (state.fallingGorillas[i]) continue;
      const g = state.gorillas[i];
      if (!checkGorillaGroundSupport(g.x, g.y, state.buildings)) {
        state.fallingGorillas[i] = { targetY: BOTTOM_LINE - GORILLA_HEIGHT };
      }
    }
  }

  function updateFallingGorillas() {
    for (let i = 0; i < 2; i++) {
      const fall = state.fallingGorillas[i];
      if (!fall) continue;
      state.gorillas[i].y += FALLING_SPEED;
      if (state.gorillas[i].y >= fall.targetY) {
        state.gorillas[i].y = fall.targetY;
        state.fallingGorillas[i] = null;

        // Lava death check
        if (state.lavaActive && state.gorillas[i].y + GORILLA_HEIGHT >= state.lavaHeight) {
          state.hp[i as 0 | 1] = 0;
          recordDeath(gameStats, i as 0 | 1, "lava");
          const killerIdx = (state.currentPlayer - 1) as 0 | 1;
          if (i === state.currentPlayer - 1) {
            recordSelfKill(gameStats, killerIdx);
          } else {
            recordKill(gameStats, killerIdx);
            if (gameStats.players[killerIdx].throwsThisRound === 1) {
              recordFirstThrowKill(gameStats, killerIdx);
            }
          }
          state.lastHitPlayer = (i + 1) as 1 | 2;
          playSound("lava_death");
          state.phase = "victory";
          state.victoryTimer = p.millis();
          return;
        }
      }
    }
  }

  function isFallingComplete(): boolean {
    return state.fallingGorillas[0] === null && state.fallingGorillas[1] === null;
  }

  function updateJump() {
    if (!state.jumpAnim) return;
    const elapsed = p.millis() - state.jumpAnim.startTime;
    const t = Math.min(elapsed / JUMP_ARC_MS, 1);

    const anim = state.jumpAnim;
    const gorilla = state.gorillas[anim.playerIdx];

    // Arms up during jump
    gorilla.armState = t < 1 ? "left_up" : "down";

    if (t >= 1) {
      // Landing
      gorilla.x = anim.endX;
      gorilla.y = anim.endY;
      // Auto-collect crate on landing building
      if (state.crate && !state.crate.falling) {
        const landingBldgIdx = findBuildingUnderGorilla(gorilla, state.buildings);
        if (landingBldgIdx >= 0 && landingBldgIdx === state.crate.buildingIdx) {
          const crateX = state.crate.x + 5;
          const crateY = state.crate.y;
          const result = collectCrate(state, anim.playerIdx);
          if (result === "full") {
            setFloatingText(crateX, crateY, "FULL!", "red");
            playSound("crate_destroy");
          } else if (result) {
            setFloatingText(crateX, crateY, powerUpShortName(result), "green");
            playSound("crate_collect");
          }
        }
      }
      gorilla.armState = "down";
      state.jumpAnim = null;
      playSound("jump_land");

      // Lava death check on landing
      if (state.lavaActive && gorilla.y + GORILLA_HEIGHT >= state.lavaHeight) {
        state.hp[anim.playerIdx] = 0;
        recordDeath(gameStats, anim.playerIdx, "lava");
        recordSelfKill(gameStats, anim.playerIdx);
        const jumpOppIdx = (anim.playerIdx === 0 ? 1 : 0) as 0 | 1;
        recordKill(gameStats, jumpOppIdx);
        state.lastHitPlayer = (anim.playerIdx + 1) as 1 | 2;
        playSound("lava_death");
        state.phase = "victory";
        state.victoryTimer = p.millis();
        return;
      }

      resolveThrowEnd();
      return;
    }

    // Compute animated position
    const peakY = Math.min(anim.startY, anim.endY) - JUMP_ARC_HEIGHT;

    if (!anim.wrapDirection) {
      // Normal jump: lerp X, parabolic Y
      gorilla.x = anim.startX + (anim.endX - anim.startX) * t;
      // Parabolic arc: quadratic through (0, startY), (0.5, peakY), (1, endY)
      const a0 = anim.startY;
      const a1 = anim.endY;
      gorilla.y = a0 * (1 - t) * (1 - 2 * t) + peakY * 4 * t * (1 - t) + a1 * t * (2 * t - 1);
    } else {
      // Wrap-around jump: two segments
      const edge = anim.wrapDirection === "right" ? WIDTH : 0;
      const oppositeEdge = anim.wrapDirection === "right" ? 0 : WIDTH;

      if (t < 0.5) {
        // First half: move toward edge
        const segT = t / 0.5;
        gorilla.x = anim.startX + (edge - anim.startX) * segT;
        // Y arcs up to peak at t=0.5
        gorilla.y = anim.startY + (peakY - anim.startY) * segT;
      } else {
        // Second half: appear from opposite edge, move to target
        const segT = (t - 0.5) / 0.5;
        gorilla.x = oppositeEdge + (anim.endX - oppositeEdge) * segT;
        // Y arcs down from peak to end
        gorilla.y = peakY + (anim.endY - peakY) * segT;
      }
    }
  }

  function updateFlight() {
    // Earthquake shake timer — wait for shake to finish before resolving
    if (state.earthquakeTimer > 0) {
      if (p.millis() - state.earthquakeTimer >= EARTHQUAKE_SHAKE_MS) {
        state.earthquakeTimer = 0;
        resolveThrowEnd();
      }
      return; // don't process flight during shake
    }

    if (!state.projectile) return;

    advanceProjectile(state.projectile);
    const rotSpeed = (state.projectile.powerUpType === "boomerang" && state.projectile.boomerangReturned) ? 0.6 : 0.3;
    bananaRotation = (bananaRotation + rotSpeed) % (Math.PI * 2);

    // Gravity flip: use negative gravity for position calculation
    const playerIdx = (state.currentPlayer - 1) as 0 | 1;
    const effectiveGravity = state.gravityTurns[playerIdx] > 0 ? -state.gravity : state.gravity;

    // Check cluster bomb split timer
    if (state.projectile.splitTimer && p.millis() >= state.projectile.splitTimer) {
      const splitPos = getProjectilePositionWithGravity(state.projectile, state.wind, state.gravity);
      state.activeSubProjectiles = splitClusterBomb(
        splitPos.x, splitPos.y,
        state.projectile.vx, state.projectile.vy,
        state.wind, state.gravity, state.projectile.t
      );
      state.projectile = null;
      playSound("cluster_split");
      return;
    }

    let pos = getProjectilePositionWithGravity(state.projectile, state.wind, effectiveGravity);

    // Drunk wobble — affects both visual and collision position
    if (state.projectile.powerUpType === "drunk") {
      pos = applyDrunkWobble(pos, state.projectile);
    }

    // Homing: nudge toward opponent after apex
    if (state.projectile.powerUpType === "homing") {
      const opponentIdx = state.currentPlayer === 1 ? 1 : 0;
      const targetX = state.gorillas[opponentIdx].x + GORILLA_WIDTH / 2;
      applyHomingNudge(state.projectile, pos, targetX, state.wind, effectiveGravity);
    }

    // Storm: activate when banana exits top of screen
    if (state.projectile!.powerUpType === "storm" && pos.y < 0) {
      if (!state.stormActive) {
        state.stormActive = true;
        playSound("thunder");
      }
      state.projectile = null;
      resolveThrowEnd();
      return;
    }

    // Check if banana enters a portal (only for non-portal bananas when both portals exist)
    if (state.portals[0] && state.portals[1] && state.projectile.powerUpType !== "portal") {
      const portalResult = checkPortalEntry(state.projectile, pos, state.portals, effectiveGravity);
      if (portalResult) {
        state.projectile = portalResult;
        playSound("portal_whoosh");
        return; // continue flight from portal exit
      }
    }

    const collisionOptions = {
      skipBuildings: state.projectile.powerUpType === "ghost",
      gorillaHitboxMult: state.projectile.powerUpType === "giant" && state.projectile.t > 1.0 ? GIANT_HITBOX_MULT : 1,
    };
    const result = checkCollision(pos.x, pos.y, state.projectile.t, state.buildings, state.gorillas, state.crate, collisionOptions);

    // Portal banana — suppress damage, place portal
    if (state.projectile?.powerUpType === "portal") {
      if (result.type === "miss") {
        const pos2 = getProjectilePositionWithGravity(state.projectile, state.wind, effectiveGravity);
        const isEdgeMiss = pos2.x < 0 || pos2.x > WIDTH;

        if (isEdgeMiss) {
          // Place portal at screen edge
          const edge: "left" | "right" = pos2.x < 0 ? "left" : "right";
          placePortal(state, edge, edge === "left" ? 8 : WIDTH - 8, pos2.y);
          state.projectile = null;
          playSound("portal_place");
          resolveThrowEnd();
          return;
        }
        // Ground miss or top miss — place portal at impact point
        placePortal(state, pos2.x < WIDTH / 2 ? "left" : "right", pos2.x, pos2.y);
        state.projectile = null;
        playSound("portal_place");
        resolveThrowEnd();
        return;
      }
      if (result.type === "building" || result.type === "gorilla" || result.type === "crate") {
        // Place portal at impact point, no damage
        const pos2 = getProjectilePositionWithGravity(state.projectile, state.wind, effectiveGravity);
        placePortal(state, pos2.x < WIDTH / 2 ? "left" : "right", pos2.x, pos2.y);
        state.projectile = null;
        playSound("portal_place");
        resolveThrowEnd();
        return;
      }
      // "none" and "sun" fall through to normal handling
    }

    switch (result.type) {
      case "none":
        break;
      case "sun":
        state.sunShocked = true;
        break;
      case "miss": {
        // Earthquake triggers on any miss
        if (state.projectile!.powerUpType === "earthquake") {
          state.projectile = null;
          triggerEarthquake();
          return;
        }
        // Construction: create building if banana hit ground level
        if (state.projectile!.powerUpType === "construction") {
          const cPos = getProjectilePositionWithGravity(state.projectile!, state.wind, effectiveGravity);
          if (cPos.y >= BOTTOM_LINE) {
            const { building: newBuilding, insertIdx } = insertBuilding(
              state.buildings, cPos.x, state.cityTheme, state.timeOfDay
            );
            // Update crate building index if shifted
            if (state.crate && state.crate.buildingIdx >= insertIdx) {
              state.crate.buildingIdx++;
            }
            // Lift ground-level gorillas that are within the new building
            for (let i = 0; i < 2; i++) {
              const g = state.gorillas[i];
              if (g.y >= BOTTOM_LINE - GORILLA_HEIGHT) {
                const gCenter = g.x + GORILLA_WIDTH / 2;
                if (gCenter >= newBuilding.x && gCenter <= newBuilding.x + newBuilding.width) {
                  g.y = newBuilding.y - GORILLA_HEIGHT;
                  state.fallingGorillas[i] = null; // cancel any fall
                }
              }
            }
            state.projectile = null;
            playSound("construction");
            resolveThrowEnd();
            return;
          }
        }
        // Fire: fizzle on ground/off-screen miss
        if (state.projectile!.powerUpType === "fire") {
          state.fizzleTimer = p.millis();
          state.fizzlePlayerIdx = (state.currentPlayer - 1) as 0 | 1;
          playSound("fizzle");
          state.projectile = null;
          resolveThrowEnd();
          return;
        }
        // Lava: activate on ground hit only
        if (state.projectile!.powerUpType === "lava") {
          const lPos = getProjectilePositionWithGravity(state.projectile!, state.wind, effectiveGravity);
          if (lPos.y >= BOTTOM_LINE && !state.lavaActive) {
            state.lavaActive = true;
            state.lavaHeight = BOTTOM_LINE - LAVA_HEIGHT_OFFSET;
            playSound("lava_activate");
            state.projectile = null;
            // Immediately kill any gorilla already in the lava zone
            for (let li = 0; li < 2; li++) {
              if (state.gorillas[li].y + GORILLA_HEIGHT >= state.lavaHeight) {
                state.hp[li as 0 | 1] = 0;
                recordDeath(gameStats, li as 0 | 1, "lava");
                const killerIdx = (state.currentPlayer - 1) as 0 | 1;
                if (li === state.currentPlayer - 1) {
                  recordSelfKill(gameStats, killerIdx);
                } else {
                  recordKill(gameStats, killerIdx);
                  if (gameStats.players[killerIdx].throwsThisRound === 1) {
                    recordFirstThrowKill(gameStats, killerIdx);
                  }
                }
                state.lastHitPlayer = (li + 1) as 1 | 2;
                playSound("lava_death");
                state.phase = "victory";
                state.victoryTimer = p.millis();
                return;
              }
            }
            resolveThrowEnd();
          } else {
            state.fizzleTimer = p.millis();
            state.fizzlePlayerIdx = (state.currentPlayer - 1) as 0 | 1;
            playSound("fizzle");
            state.projectile = null;
            resolveThrowEnd();
          }
          return;
        }
        // Storm: fizzle on ground/side miss
        if (state.projectile!.powerUpType === "storm") {
          state.fizzleTimer = p.millis();
          state.fizzlePlayerIdx = (state.currentPlayer - 1) as 0 | 1;
          playSound("fizzle");
          state.projectile = null;
          resolveThrowEnd();
          return;
        }
        const pos2 = getProjectilePositionWithGravity(state.projectile!, state.wind, effectiveGravity);
        const isEdgeMiss = pos2.x < 0 || pos2.x > WIDTH || pos2.y < 0;
        const isGroundMiss = pos2.y > BOTTOM_LINE;

        if (isEdgeMiss && !isGroundMiss) {
          // Try ricochet
          if (state.projectile!.bouncesRemaining) {
            const bounced = handleRicochet(state.projectile!, pos2.x, pos2.y, state.wind, effectiveGravity);
            if (bounced) {
              state.projectile = bounced;
              playSound("aim_tick");
              return;
            }
          }

          // Try wrap-around
          if (state.projectile!.wrapsRemaining) {
            const wrapped = handleWrapAround(state.projectile!, pos2.x, pos2.y, state.wind, effectiveGravity);
            if (wrapped) {
              state.projectile = wrapped;
              return;
            }
          }

          // Try rubber bounce (screen edges)
          if (state.projectile!.rubberBouncesRemaining) {
            let surface: "edge_left" | "edge_right" | "edge_top" = "edge_left";
            if (pos2.x > WIDTH) surface = "edge_right";
            if (pos2.y < 0) surface = "edge_top";
            const bounced = handleRubberBounce(state.projectile!, pos2.x, pos2.y, surface, effectiveGravity);
            if (bounced) {
              state.projectile = bounced;
              playSound("rubber_bounce");
              return;
            }
          }

          // Try boomerang return (side edges only, not top)
          const isSideEdgeMiss = pos2.x < 0 || pos2.x > WIDTH;
          if (state.projectile!.powerUpType === "boomerang" && !state.projectile!.boomerangReturned && isSideEdgeMiss) {
            const thrower = state.gorillas[state.currentPlayer - 1];
            const throwerCX = thrower.x + GORILLA_WIDTH / 2;
            const throwerCY = thrower.y + GORILLA_HEIGHT / 2;
            const returned = handleBoomerangReturn(state.projectile!, pos2.x, pos2.y, throwerCX, throwerCY);
            if (returned) {
              state.projectile = returned;
              playSound("boomerang_return");
              bananaRotation = 0;
              return;
            }
          }
        }

        // Normal miss
        state.projectile = null;
        resolveThrowEnd();
        break;
      }
      case "building": {
        const projType = state.projectile?.powerUpType;
        // Rubber: bounce off buildings
        if (state.projectile?.rubberBouncesRemaining) {
          const bldg = result.building;
          const hitTop = pos.x >= bldg.x && pos.x <= bldg.x + bldg.width &&
                         Math.abs(pos.y - bldg.y) < 5;
          const surface = hitTop ? "top" : "side";
          const bounced = handleRubberBounce(state.projectile, pos.x, pos.y, surface as "top" | "side", effectiveGravity);
          if (bounced) {
            state.projectile = bounced;
            playSound("rubber_bounce");
            return;
          }
        }
        // Earthquake: reshuffle buildings, no damage
        if (projType === "earthquake") {
          state.projectile = null;
          triggerEarthquake();
          break;
        }
        if (state.projectile?.powerUpType === "confetti") {
          explosionX = pos.x;
          explosionY = pos.y;
          state.projectile = null;
          confettiParticles = generateConfetti(pos.x, pos.y);
          confettiTimer = p.millis();
          playSound("confetti_pop");
          state.explosionTimer = p.millis();
          state.lastHitPlayer = null;
          state.phase = "explosion";
          break;
        }
        if (state.projectile?.powerUpType === "teleportation") {
          state.projectile = null;
          const placements = randomGorillaPlacements(
            state.buildings,
            findBuildingUnderGorilla(state.gorillas[0], state.buildings),
            findBuildingUnderGorilla(state.gorillas[1], state.buildings)
          );
          if (placements) {
            teleportAnimTargets = [placements[0], placements[1]];
            teleportAnimTimer = p.millis();
            playSound("teleport_zap");
          } else {
            resolveThrowEnd();
          }
          break;
        }
        if (projType === "construction") {
          // Repair and extend the hit building
          result.building.damage = [];
          const maxBuildingTop = 40 + GORILLA_HEIGHT;
          result.building.y = Math.max(result.building.y - CONSTRUCTION_HEIGHT_ADD, maxBuildingTop);
          result.building.height = BOTTOM_LINE - result.building.y;
          // Regenerate windows
          const litChance = state.timeOfDay === "night" ? 0.7 : 0.6;
          const colors = CITY_THEME_COLORS[state.cityTheme];
          result.building.color = colors[Math.floor(Math.random() * colors.length)];
          result.building.windows = [];
          for (let wx = result.building.x + 4; wx < result.building.x + result.building.width - 4; wx += 8) {
            for (let wy = result.building.y + 4; wy < result.building.y + result.building.height - 6; wy += 10) {
              result.building.windows.push({ x: wx, y: wy, lit: Math.random() < litChance });
            }
          }
          // Move gorillas on this building up
          for (let i = 0; i < 2; i++) {
            const bIdx = findBuildingUnderGorilla(state.gorillas[i], state.buildings);
            if (bIdx >= 0 && state.buildings[bIdx] === result.building) {
              state.gorillas[i].y = result.building.y - GORILLA_HEIGHT;
            }
          }
          state.projectile = null;
          playSound("construction");
          resolveThrowEnd();
          break;
        }
        if (projType === "demolition") {
          const hitBuildingIdx = state.buildings.indexOf(result.building);
          result.building.height = 0;
          result.building.y = BOTTOM_LINE;
          result.building.windows = [];
          result.building.damage = [];
          state.burningBuildings.delete(hitBuildingIdx);
          if (state.crate && state.crate.buildingIdx === hitBuildingIdx) {
            state.crate = null;
          }
          explosionX = pos.x;
          explosionY = pos.y;
          activeExplosionRadius = EXPLOSION_RADIUS;
          state.projectile = null;
          state.explosionTimer = p.millis();
          state.lastHitPlayer = null;
          state.phase = "explosion";
          playSound("demolition");
          playSound("explosion");
          break;
        }
        if (projType === "fire") {
          const hitBuildingIdx = state.buildings.indexOf(result.building);
          if (hitBuildingIdx >= 0) {
            state.burningBuildings.add(hitBuildingIdx);
            playSound("fire_ignite");
          }
          state.projectile = null;
          resolveThrowEnd();
          break;
        }
        if (projType === "lava") {
          state.fizzleTimer = p.millis();
          state.fizzlePlayerIdx = (state.currentPlayer - 1) as 0 | 1;
          playSound("fizzle");
          state.projectile = null;
          resolveThrowEnd();
          break;
        }
        if (projType === "storm") {
          state.fizzleTimer = p.millis();
          state.fizzlePlayerIdx = (state.currentPlayer - 1) as 0 | 1;
          playSound("fizzle");
          state.projectile = null;
          resolveThrowEnd();
          break;
        }
        explosionX = pos.x;
        explosionY = pos.y;
        const buildingExpRadius = state.projectile!.explosionRadius ?? EXPLOSION_RADIUS;
        activeExplosionRadius = buildingExpRadius;
        state.projectile = null;
        state.explosionTimer = p.millis();
        state.lastHitPlayer = null;
        state.phase = "explosion";
        result.building.damage.push({ cx: pos.x, cy: pos.y, radius: buildingExpRadius });
        if (projType === "giant") playSound("giant_thud");
        playSound("explosion");
        break;
      }
      case "crate": {
        // Banana destroys crate — no explosion, banana continues
        if (state.crate) {
          const shortName = powerUpShortName(state.crate.powerUp);
          setFloatingText(state.crate.x + 5, state.crate.y, shortName, "red");
          playSound("crate_destroy");
          state.crate = null;
        }
        // Don't stop the projectile — it continues its flight
        break;
      }
      case "gorilla": {
        // Shield absorption
        const victimIdx = (result.gorilla.playerNum - 1) as 0 | 1;
        if (state.shield[victimIdx]) {
          state.shield[victimIdx] = false;
          state.projectile = null;
          playSound("shield_break");
          resolveThrowEnd();
          break;
        }
        if (state.projectile?.powerUpType === "earthquake") {
          state.projectile = null;
          triggerEarthquake();
          break;
        }
        if (state.projectile?.powerUpType === "confetti") {
          // Confetti! No damage, no score
          explosionX = pos.x;
          explosionY = pos.y;
          state.projectile = null;
          confettiParticles = generateConfetti(pos.x, pos.y);
          confettiTimer = p.millis();
          playSound("confetti_pop");
          // Confused reaction from victim
          triggerBubble(result.gorilla.playerNum as 1 | 2, CONFETTI_REACTIONS);
          // Thrower dances
          triggerDance(state.currentPlayer);
          // End turn via explosion phase (but no scoring)
          state.explosionTimer = p.millis();
          state.lastHitPlayer = null;
          state.phase = "explosion";
          break;
        }
        if (state.projectile?.powerUpType === "ice") {
          const vidx = (result.gorilla.playerNum - 1) as 0 | 1;
          state.iceTurns[vidx] = ICE_TURNS;
          state.projectile = null;
          playSound("ice_hit");
          explosionX = pos.x;
          explosionY = pos.y;
          state.explosionTimer = p.millis();
          state.lastHitPlayer = result.gorilla.playerNum;
          state.phase = "explosion";
          break;
        }
        if (state.projectile?.powerUpType === "mirror") {
          const vidx = (result.gorilla.playerNum - 1) as 0 | 1;
          state.mirrorTurns[vidx] = MIRROR_TURNS;
          state.projectile = null;
          playSound("mirror_hit");
          explosionX = pos.x;
          explosionY = pos.y;
          state.explosionTimer = p.millis();
          state.lastHitPlayer = result.gorilla.playerNum;
          state.phase = "explosion";
          break;
        }
        if (state.projectile?.powerUpType === "gravity_flip") {
          const vidx = (result.gorilla.playerNum - 1) as 0 | 1;
          state.gravityTurns[vidx] = GRAVITY_TURNS;
          state.projectile = null;
          playSound("gravity_hit");
          explosionX = pos.x;
          explosionY = pos.y;
          state.explosionTimer = p.millis();
          state.lastHitPlayer = result.gorilla.playerNum;
          state.phase = "explosion";
          break;
        }
        if (state.projectile?.powerUpType === "poison") {
          const victimIdx = result.gorilla.playerNum === 1 ? 0 : 1;
          state.poisonTurns[victimIdx] = POISON_TURNS;
          state.projectile = null;
          playSound("poison_hit");
          explosionX = pos.x;
          explosionY = pos.y;
          state.explosionTimer = p.millis();
          state.lastHitPlayer = result.gorilla.playerNum;
          state.phase = "explosion";
          break;
        }
        if (state.projectile?.powerUpType === "fire") {
          const vidx = (result.gorilla.playerNum - 1) as 0 | 1;
          const bIdx = findBuildingUnderGorilla(state.gorillas[vidx], state.buildings);
          if (bIdx >= 0) {
            state.burningBuildings.add(bIdx);
            playSound("fire_ignite");
          } else {
            state.fizzleTimer = p.millis();
            state.fizzlePlayerIdx = (state.currentPlayer - 1) as 0 | 1;
            playSound("fizzle");
          }
          state.projectile = null;
          resolveThrowEnd();
          break;
        }
        if (state.projectile?.powerUpType === "lava") {
          state.fizzleTimer = p.millis();
          state.fizzlePlayerIdx = (state.currentPlayer - 1) as 0 | 1;
          playSound("fizzle");
          state.projectile = null;
          resolveThrowEnd();
          break;
        }
        if (state.projectile?.powerUpType === "storm") {
          state.fizzleTimer = p.millis();
          state.fizzlePlayerIdx = (state.currentPlayer - 1) as 0 | 1;
          playSound("fizzle");
          state.projectile = null;
          resolveThrowEnd();
          break;
        }
        explosionX = pos.x;
        explosionY = pos.y;
        activeExplosionRadius = state.projectile!.explosionRadius ?? EXPLOSION_RADIUS;
        state.projectile = null;
        state.explosionTimer = p.millis();
        state.lastHitPlayer = result.gorilla.playerNum;
        state.phase = "explosion";
        playSound("hit");
        break;
      }
    }
  }

  function updateSubProjectiles() {
    if (state.activeSubProjectiles.length === 0) return;

    for (let i = state.activeSubProjectiles.length - 1; i >= 0; i--) {
      const sub = state.activeSubProjectiles[i];
      if (!sub.active) continue;

      advanceProjectile(sub);
      const subPos = getProjectilePositionWithGravity(sub, state.wind, state.gravity);
      const result = checkCollision(subPos.x, subPos.y, sub.t, state.buildings, state.gorillas, state.crate);

      switch (result.type) {
        case "none":
        case "sun":
          break;
        case "miss":
          sub.active = false;
          break;
        case "building": {
          const radius = sub.explosionRadius ?? EXPLOSION_RADIUS;
          result.building.damage.push({ cx: subPos.x, cy: subPos.y, radius });
          sub.active = false;
          playSound("explosion");
          break;
        }
        case "gorilla": {
          // Shield absorption for sub-projectiles
          const subVictimIdx = (result.gorilla.playerNum - 1) as 0 | 1;
          if (state.shield[subVictimIdx]) {
            state.shield[subVictimIdx] = false;
            playSound("shield_break");
            sub.active = false;
            break;
          }
          // Gorilla hit — end entire cluster, score the hit
          state.activeSubProjectiles = [];
          explosionX = subPos.x;
          explosionY = subPos.y;
          activeExplosionRadius = sub.explosionRadius ?? EXPLOSION_RADIUS;
          state.explosionTimer = p.millis();
          state.lastHitPlayer = result.gorilla.playerNum;
          state.phase = "explosion";
          playSound("hit");
          return;
        }
        case "crate": {
          if (state.crate) {
            const shortName = powerUpShortName(state.crate.powerUp);
            setFloatingText(state.crate.x + 5, state.crate.y, shortName, "red");
            playSound("crate_destroy");
            state.crate = null;
          }
          // Sub-projectile continues
          break;
        }
      }
    }

    // Remove inactive subs
    state.activeSubProjectiles = state.activeSubProjectiles.filter(s => s.active);

    // All resolved — end turn
    if (state.activeSubProjectiles.length === 0) {
      checkAndApplyFalling();
      if (isFallingComplete()) {
        resolveThrowEnd();
      }
    }
  }

  function drawSubProjectiles(p: p5) {
    for (const sub of state.activeSubProjectiles) {
      if (!sub.active) continue;
      const subPos = getProjectilePositionWithGravity(sub, state.wind, state.gravity);
      if (subPos.y < -50 || subPos.x < -10 || subPos.x > WIDTH + 10) continue;
      p.push();
      p.translate(subPos.x, subPos.y);
      p.rotate(bananaRotation);
      p.fill(255, 200, 0);
      p.noStroke();
      p.arc(0, 0, 5, 4, 0, Math.PI);
      p.pop();
    }
  }

  function updateExplosion() {
    const elapsed = p.millis() - state.explosionTimer;
    const totalDuration = EXPLOSION_EXPAND_MS + EXPLOSION_CONTRACT_MS;

    if (elapsed > totalDuration) {
      if (state.lastHitPlayer !== null) {
        // A gorilla was hit — decrement HP
        const hitIdx = (state.lastHitPlayer - 1) as 0 | 1;
        state.hp[hitIdx] = Math.max(0, state.hp[hitIdx] - 1);
        recordHit(gameStats, (state.currentPlayer - 1) as 0 | 1);

        if (state.hp[hitIdx] <= 0) {
          // Gorilla knocked out — score point
          if (state.lastHitPlayer === state.currentPlayer) {
            // Self-hit KO: opponent scores and auto-taunts
            const opponentIdx = state.currentPlayer === 1 ? 1 : 0;
            state.scores[opponentIdx]++;
            recordSelfKill(gameStats, (state.currentPlayer - 1) as 0 | 1);
            recordKill(gameStats, opponentIdx as 0 | 1);
            if (gameStats.players[opponentIdx].throwsThisRound === 1) {
              recordFirstThrowKill(gameStats, opponentIdx as 0 | 1);
            }
            const opponent: 1 | 2 = state.currentPlayer === 1 ? 2 : 1;
            triggerDance(opponent);
            triggerBubble(opponent, SELF_HIT_TAUNTS);
          } else {
            // Hit opponent KO: thrower scores
            state.scores[state.currentPlayer - 1]++;
            recordKill(gameStats, (state.currentPlayer - 1) as 0 | 1);
            if (gameStats.players[state.currentPlayer - 1].throwsThisRound === 1) {
              recordFirstThrowKill(gameStats, (state.currentPlayer - 1) as 0 | 1);
            }
          }
          state.victoryTimer = p.millis();
          state.phase = "victory";
          loserFallOffset = 0;
          playSound("victory");
        } else {
          // Gorilla survived — continue round
          playSound("hit");
          checkAndApplyFalling();
          if (isFallingComplete()) {
            resolveThrowEnd();
          }
        }
      } else {
        // Building hit — check if gorillas need to fall
        checkAndApplyFalling();
        if (isFallingComplete()) {
          resolveThrowEnd();
        }
      }
    }
  }

  function getExplosionProgress(): number {
    const elapsed = p.millis() - state.explosionTimer;
    if (elapsed < EXPLOSION_EXPAND_MS) {
      return elapsed / EXPLOSION_EXPAND_MS;
    } else {
      const contractElapsed = elapsed - EXPLOSION_EXPAND_MS;
      return Math.max(0, 1 - contractElapsed / EXPLOSION_CONTRACT_MS);
    }
  }

  function updateVictory() {
    const elapsed = p.millis() - state.victoryTimer;

    // Victory dance — alternate arms on the winner
    const winnerIdx = state.lastHitPlayer === state.currentPlayer
      ? (state.currentPlayer === 1 ? 1 : 0) // self-hit: opponent wins
      : state.currentPlayer - 1;             // hit opponent: thrower wins
    const danceFrame = Math.floor(elapsed / 250) % 2;
    state.gorillas[winnerIdx].armState = danceFrame === 0 ? "left_up" : "right_up";

    // Loser falls off screen with acceleration
    loserFallOffset += 0.5 + loserFallOffset * 0.05;

    if (elapsed > VICTORY_DURATION_MS) {
      // Reset arms
      state.gorillas[0].armState = "down";
      state.gorillas[1].armState = "down";

      // Check if game over
      if (state.scores[0] >= state.targetScore || state.scores[1] >= state.targetScore) {
        state.phase = "game_over";
        state.gameOverEnteredAt = p.millis();
        const winIdx = (state.scores[0] >= state.targetScore ? 0 : 1) as 0 | 1;
        const p1Award = pickStatAward(gameStats.players[0], gameStats.players[1], winIdx === 0, state.inventory[0]);
        const p2Award = pickStatAward(gameStats.players[1], gameStats.players[0], winIdx === 1, state.inventory[1]);
        const bonusAward = pickNameAward(state.playerNames, gameStats, winIdx);
        gameOverAwards = { p1: p1Award, p2: p2Award, bonus: bonusAward };
        awardSound1Played = false;
        awardSound2Played = false;
        awardBonusSoundPlayed = false;
      } else {
        // Loser goes first next round
        if (state.lastHitPlayer !== null) {
          state.currentPlayer = state.lastHitPlayer as 1 | 2;
        }
        startNewRound();
      }
    }
  }

  // --- Bananality secret code ---

  function updateKonamiCode(p1: ReturnType<typeof getPlayerInput>, p2: ReturnType<typeof getPlayerInput>) {
    const idlePlayer: 1 | 2 = state.currentPlayer === 1 ? 2 : 1;
    const idle = idlePlayer === 1 ? p1 : p2;

    // Edge-detect idle player's dpad and buttons
    const idleUp = idle.dpadUp && !prevIdleDpadUp;
    const idleDown = idle.dpadDown && !prevIdleDpadDown;
    const idleLeft = idle.dpadLeft && !prevIdleDpadLeft;
    const idleRight = idle.dpadRight && !prevIdleDpadRight;
    const idleA = idle.a && !prevIdleA;
    const idleB = idle.b && !prevIdleB;

    prevIdleDpadUp = idle.dpadUp;
    prevIdleDpadDown = idle.dpadDown;
    prevIdleDpadLeft = idle.dpadLeft;
    prevIdleDpadRight = idle.dpadRight;
    prevIdleA = idle.a;
    prevIdleB = idle.b;

    // Determine which input was pressed this frame (if any)
    let pressed: string | null = null;
    if (idleUp) pressed = "up";
    else if (idleDown) pressed = "down";
    else if (idleLeft) pressed = "left";
    else if (idleRight) pressed = "right";
    else if (idleB) pressed = "b";
    else if (idleA) pressed = "a";

    if (pressed !== null) {
      if (konamiProgress < KONAMI.length) {
        if (pressed === KONAMI[konamiProgress]) {
          konamiProgress++;
          konamiPlayer = idlePlayer;
          if (konamiProgress === KONAMI.length) {
            // Code complete — now need spins
            konamiSpinAccum = 0;
          }
        } else {
          // Wrong input — reset
          konamiProgress = 0;
          konamiSpinAccum = 0;
        }
      }
    }

    // After code is complete, accumulate spinner rotation
    if (konamiProgress >= KONAMI.length && konamiPlayer !== null) {
      konamiSpinAccum += Math.abs(idle.spinnerDelta);
      if (konamiSpinAccum >= 360 * BANANALITY_SPINS) {
        triggerBananality();
      }
    }
  }

  function triggerBananality() {
    state.phase = "bananality";
    state.projectile = null;
    stopPowerHum();
    banalityTimer = p.millis();
    banalityBananas = [];
    banalityRevealPlayed = false;
    konamiProgress = 0;
    konamiSpinAccum = 0;
    konamiPlayer = null;
    state.selectedPowerUp = null;
    state.selectedSlotIndex = -2;
    playerSelectedPowerUp = [null, null];
    playerSelectedSlotIndex = [-2, -2];
    state.inventoryOpen = false;
    state.inventoryScrollOffset = 0;
    state.extraThrowRemaining = false;
    state.isExtraThrow = false;
    state.activeSubProjectiles = [];
    state.portals = [null, null];
    state.burningBuildings = new Set<number>();
    state.lavaActive = false;
    state.lavaHeight = BOTTOM_LINE;
    state.stormActive = false;
    state.fizzleTimer = 0;
    state.hazardDamageStep = 0;
    state.hazardDamageTimer = 0;
    state.lightningTarget = -1;
    state.iceTurns = [0, 0];
    state.mirrorTurns = [0, 0];
    state.gravityTurns = [0, 0];
    state.shield = [false, false];
    state.earthquakeTimer = 0;
    confettiParticles = [];
    playSound("bananality_omen");
  }

  function updateBananality() {
    const elapsed = p.millis() - banalityTimer;
    const now = p.millis();

    if (elapsed > BANANALITY_OMEN_MS && elapsed <= BANANALITY_OMEN_MS + BANANALITY_RAIN_MS) {
      // Spawn many bananas per frame — ramps up over time
      const rainElapsed = elapsed - BANANALITY_OMEN_MS;
      const intensity = Math.min(1, rainElapsed / 2000); // ramps up over 2s
      const spawnsPerFrame = 2 + Math.floor(intensity * 6); // 2-8 per frame
      for (let i = 0; i < spawnsPerFrame; i++) {
        if (Math.random() < 0.7) {
          banalityBananas.push({
            x: Math.random() * WIDTH,
            y: -10 - Math.random() * 30,
            vy: 3 + Math.random() * 4,
            rot: Math.random() * Math.PI * 2,
            landed: false,
            explodeTime: 0,
          });
        }
      }
    }

    // Update all bananas
    for (const b of banalityBananas) {
      if (b.landed) continue;
      b.y += b.vy;
      b.vy += 0.15; // gravity acceleration
      b.rot += 0.3;

      let hit = false;

      // Check collision with buildings — carve explosion holes
      // Skip if banana is inside an existing damage hole (already destroyed)
      for (const bld of state.buildings) {
        if (b.x >= bld.x && b.x <= bld.x + bld.width && b.y >= bld.y && b.y <= bld.y + bld.height) {
          let inHole = false;
          for (const hole of bld.damage) {
            const dx = b.x - hole.cx;
            const dy = b.y - hole.cy;
            if (dx * dx + dy * dy < hole.radius * hole.radius) {
              inHole = true;
              break;
            }
          }
          if (!inHole) {
            bld.damage.push({ cx: b.x, cy: b.y, radius: EXPLOSION_RADIUS });
            hit = true;
            break;
          }
          // else: banana falls through the hole, keep going
        }
      }

      // Check collision with gorillas
      if (!hit) {
        for (const g of state.gorillas) {
          if (b.x >= g.x && b.x <= g.x + GORILLA_WIDTH && b.y >= g.y && b.y <= g.y + GORILLA_HEIGHT) {
            g.y += 30;
            hit = true;
            break;
          }
        }
      }

      // Hit the ground
      if (!hit && b.y >= BOTTOM_LINE) {
        hit = true;
      }

      if (hit) {
        b.landed = true;
        b.explodeTime = now;
        // Throttle impact sounds — only play occasionally
        if (Math.random() < 0.15) {
          playSound("bananality_impact");
        }
      }
    }

    // Prune old exploded bananas to avoid unbounded growth
    const EXPLODE_VISIBLE_MS = 300;
    banalityBananas = banalityBananas.filter(
      b => !b.landed || (now - b.explodeTime) < EXPLODE_VISIBLE_MS
    );

    // Reveal phase
    if (elapsed > BANANALITY_OMEN_MS + BANANALITY_RAIN_MS && !banalityRevealPlayed) {
      banalityRevealPlayed = true;
      playSound("bananality_reveal");
    }

    // Done — start a new round, no points awarded
    if (elapsed > BANANALITY_TOTAL_MS) {
      startNewRound();
    }
  }

  function drawBananality(p: p5) {
    const elapsed = p.millis() - banalityTimer;

    // Omen phase: gray tint over the gameplay
    if (elapsed <= BANANALITY_OMEN_MS) {
      // Draw normal gameplay underneath
      drawGameplay(p);

      // Gray overlay that fades in
      const fade = Math.min(1, elapsed / (BANANALITY_OMEN_MS * 0.5));
      p.fill(40, 40, 40, fade * 120);
      p.noStroke();
      p.rect(0, 0, WIDTH, HEIGHT);

      // Ominous text
      if (elapsed > BANANALITY_OMEN_MS * 0.4) {
        const textFade = Math.min(255, ((elapsed - BANANALITY_OMEN_MS * 0.4) / 500) * 255);
        p.fill(255, 200, 0, textFade);
        p.textSize(6);
        p.textAlign(p.CENTER, p.CENTER);
        p.noStroke();
        p.text("Something terrible is coming...", WIDTH / 2, HEIGHT / 2);
      }
      return;
    }

    // Rain phase: draw destroyed city + raining bananas
    if (elapsed <= BANANALITY_OMEN_MS + BANANALITY_RAIN_MS) {
      // Darker sky
      p.background(30, 30, 30);

      // Screen shake during rain
      p.push();
      const shakeX = (Math.random() - 0.5) * 3;
      const shakeY = (Math.random() - 0.5) * 3;
      p.translate(shakeX, shakeY);

      // Draw the city (being destroyed)
      const gnd = GROUND_COLORS[state.timeOfDay];
      p.noStroke();
      p.fill(gnd[0], gnd[1], gnd[2]);
      p.rect(0, BOTTOM_LINE, WIDTH, HEIGHT - BOTTOM_LINE);
      drawCity(p, state.buildings);

      // Draw gorillas (getting battered)
      for (let i = 0; i < 2; i++) {
        drawGorilla(p, state.gorillas[i], costumes[i], {
          poison: state.poisonTurns[i] > 0,
          ice: state.iceTurns[i] > 0,
          mirror: state.mirrorTurns[i] > 0,
          gravity: state.gravityTurns[i] > 0,
          shield: state.shield[i],
        });
      }

      // Evil sun/moon laughing maniacally
      drawEvilSun(p, state.timeOfDay);

      // Draw flying bananas
      p.noStroke();
      for (const b of banalityBananas) {
        if (b.landed) {
          // Draw explosion at impact point
          const explodeElapsed = p.millis() - b.explodeTime;
          const explodeDuration = 300;
          if (explodeElapsed < explodeDuration) {
            const progress = explodeElapsed < explodeDuration / 2
              ? explodeElapsed / (explodeDuration / 2)
              : 1 - (explodeElapsed - explodeDuration / 2) / (explodeDuration / 2);
            const r = progress * EXPLOSION_RADIUS * 2;
            p.fill(255, 100, 0, 200 * progress);
            p.circle(b.x, b.y, r * 2);
            p.fill(255, 255, 0, 150 * progress);
            p.circle(b.x, b.y, r);
          }
        } else {
          if (b.y > HEIGHT + 10) continue;
          p.push();
          p.translate(b.x, b.y);
          p.rotate(b.rot);
          p.fill(255, 255, 0);
          p.arc(0, 0, 8, 6, 0, Math.PI);
          p.pop();
        }
      }

      p.pop();
      return;
    }

    // Reveal phase: BANANALITY!
    p.background(20, 20, 20);

    // Draw the destroyed aftermath
    const gnd = GROUND_COLORS[state.timeOfDay];
    p.noStroke();
    p.fill(gnd[0], gnd[1], gnd[2]);
    p.rect(0, BOTTOM_LINE, WIDTH, HEIGHT - BOTTOM_LINE);
    drawCity(p, state.buildings);

    // Evil sun still cackling
    drawEvilSun(p, state.timeOfDay);

    // Flashing "BANANALITY!" text
    const revealElapsed = elapsed - BANANALITY_OMEN_MS - BANANALITY_RAIN_MS;
    const flash = Math.sin(revealElapsed / 100) > 0;
    if (flash) {
      p.fill(255, 255, 0);
    } else {
      p.fill(255, 100, 0);
    }
    p.textSize(14);
    p.textAlign(p.CENTER, p.CENTER);
    p.noStroke();
    p.text("BANANALITY!", WIDTH / 2, HEIGHT / 2);

    // Subtitle
    p.fill(180);
    p.textSize(6);
    p.text("No points awarded.", WIDTH / 2, HEIGHT / 2 + 20);    
  }

  function updateGameOver(sys: ReturnType<typeof getSystemInput>) {
    const elapsed = p.millis() - state.gameOverEnteredAt;
    if (!awardSound1Played && elapsed >= AWARD_REVEAL_1_MS) {
      playSound("award_reveal_1");
      awardSound1Played = true;
    }
    if (!awardSound2Played && elapsed >= AWARD_REVEAL_2_MS) {
      playSound("award_reveal_2");
      awardSound2Played = true;
    }
    if (!awardBonusSoundPlayed && gameOverAwards?.bonus && elapsed >= AWARD_BONUS_MS) {
      playSound("award_bonus");
      awardBonusSoundPlayed = true;
    }

    if (elapsed >= AWARD_START_VISIBLE_MS && ((sys.onePlayer && !prevStart1P) || (sys.twoPlayer && !prevStart2P))) {
      state = createInitialState();
      gameStats = createGameStats();
      gameOverAwards = null;
      lastAngles = [INITIAL_ANGLE_P1, INITIAL_ANGLE_P2];
      costumes = [getCostume(state.playerNames[0]), getCostume(state.playerNames[1])];
    }
  }

  function isActiveTaunting(): boolean {
    const cp = state.currentPlayer;
    const now = p.millis();
    if (tauntDancePlayer === cp && now - tauntDanceTimer < TAUNT_DANCE_MS) return true;
    if (tauntBubblePlayer === cp && now - tauntBubbleTimer < TAUNT_BUBBLE_MS) return true;
    return false;
  }

  function triggerDance(player: 1 | 2) {
    const now = p.millis();
    if (now - tauntDanceTimer > TAUNT_DANCE_MS) {
      tauntDanceTimer = now;
      tauntDancePlayer = player;
      tauntDanceType = (tauntDanceType + 1) % 4;
      playSound("taunt_dance");
    }
  }

  function triggerBubble(player: 1 | 2, messages?: string[]) {
    const now = p.millis();
    if (now - tauntBubbleTimer > TAUNT_BUBBLE_MS) {
      tauntBubbleTimer = now;
      tauntBubblePlayer = player;
      const pool = messages ?? TAUNTS;
      tauntBubbleText = pool[Math.floor(Math.random() * pool.length)];
      playSound("taunt_bubble");
    }
  }

  function updateTaunts(p1: ReturnType<typeof getPlayerInput>, p2: ReturnType<typeof getPlayerInput>) {
    const idlePlayer: 1 | 2 = state.currentPlayer === 1 ? 2 : 1;
    const idleInput = idlePlayer === 1 ? p1 : p2;
    const idlePrevA = idlePlayer === 1 ? prevA1 : prevA2;
    const idlePrevB = idlePlayer === 1 ? prevB1 : prevB2;

    // Idle player: A = dance, B = taunt bubble
    if (idleInput.a && !idlePrevA) triggerDance(idlePlayer);
    if (idleInput.b && !idlePrevB) triggerBubble(idlePlayer);

    // Active player: dpad up/down = dance, dpad left/right = taunt bubble
    const activeInput = state.currentPlayer === 1 ? p1 : p2;
    const activeUp = activeInput.dpadUp || activeInput.dpadDown;
    const activeSide = activeInput.dpadLeft || activeInput.dpadRight;

    if (activeUp && !prevTauntUp) triggerDance(state.currentPlayer);
    if (activeSide && !prevTauntSide) triggerBubble(state.currentPlayer);

    prevTauntUp = activeUp;
    prevTauntSide = activeSide;

    // Update dance animation
    tauntDanceHop = 0;
    if (tauntDancePlayer !== null) {
      const elapsed = p.millis() - tauntDanceTimer;
      if (elapsed < TAUNT_DANCE_MS) {
        const gorilla = state.gorillas[tauntDancePlayer - 1];
        const frame = Math.floor(elapsed / 150) % 2;
        switch (tauntDanceType) {
          case 0: // Arm wave
            gorilla.armState = frame === 0 ? "left_up" : "right_up";
            break;
          case 1: // Both arms up with hop
            gorilla.armState = frame === 0 ? "left_up" : "right_up";
            tauntDanceHop = frame === 0 ? -2 : 0;
            break;
          case 2: // Fast shimmy — one arm up, hopping
            gorilla.armState = Math.floor(elapsed / 100) % 2 === 0 ? "left_up" : "right_up";
            tauntDanceHop = Math.floor(elapsed / 100) % 2 === 0 ? -1 : 0;
            break;
          case 3: // Big hop, arms down
            gorilla.armState = "down";
            tauntDanceHop = Math.floor(elapsed / 200) % 2 === 0 ? -3 : 0;
            break;
        }
      } else {
        state.gorillas[tauntDancePlayer - 1].armState = "down";
        tauntDancePlayer = null;
      }
    }
  }

  function drawTauntBubble(p: p5) {
    if (tauntBubblePlayer === null) return;
    const elapsed = p.millis() - tauntBubbleTimer;
    if (elapsed > TAUNT_BUBBLE_MS) {
      tauntBubblePlayer = null;
      return;
    }

    const gorilla = state.gorillas[tauntBubblePlayer - 1];
    const bx = gorilla.x + GORILLA_WIDTH / 2;
    const by = gorilla.y - 18;

    // Fade out in the last 500ms
    const alpha = elapsed > TAUNT_BUBBLE_MS - 500
      ? Math.floor(255 * (TAUNT_BUBBLE_MS - elapsed) / 500)
      : 255;

    // Bubble background
    const tw = p.textWidth(tauntBubbleText) + 8;
    p.fill(255, 255, 255, alpha);
    p.noStroke();
    p.rectMode(p.CENTER);
    p.rect(bx, by, tw, 12, 3);
    // Little triangle pointer
    p.triangle(bx - 3, by + 6, bx + 3, by + 6, bx, by + 10);
    p.rectMode(p.CORNER);

    // Text
    p.fill(0, 0, 0, alpha);
    p.textSize(5);
    p.textAlign(p.CENTER, p.CENTER);
    p.noStroke();
    p.text(tauntBubbleText, bx, by - 1);
  }

  function updateTeleportAnim(p: p5) {
    const elapsed = p.millis() - teleportAnimTimer;
    if (elapsed >= TELEPORT_ANIM_MS) {
      // Animation done — move gorillas to targets and resolve
      if (teleportAnimTargets) {
        state.gorillas[0].x = teleportAnimTargets[0].x;
        state.gorillas[0].y = teleportAnimTargets[0].y;
        state.gorillas[1].x = teleportAnimTargets[1].x;
        state.gorillas[1].y = teleportAnimTargets[1].y;
      }
      teleportAnimTargets = null;
      resolveThrowEnd();
    }
  }

  function drawTeleportAnim(p: p5) {
    if (!teleportAnimTargets) return;
    const elapsed = p.millis() - teleportAnimTimer;
    const progress = Math.min(elapsed / TELEPORT_ANIM_MS, 1);

    // Phase 1 (0-0.4): shrink at old position
    // Phase 2 (0.4-0.6): invisible
    // Phase 3 (0.6-1.0): grow at new position
    for (let i = 0; i < 2; i++) {
      const gorilla = state.gorillas[i];
      const target = teleportAnimTargets[i];
      let scale = 1;
      let drawX = gorilla.x;
      let drawY = gorilla.y;

      if (progress < 0.4) {
        // Shrinking at old position
        scale = 1 - (progress / 0.4);
        drawX = gorilla.x;
        drawY = gorilla.y;
      } else if (progress < 0.6) {
        // Invisible
        scale = 0;
      } else {
        // Growing at new position
        scale = (progress - 0.6) / 0.4;
        drawX = target.x;
        drawY = target.y;
      }

      if (scale > 0.01) {
        const cx = drawX + GORILLA_WIDTH / 2;
        const cy = drawY + GORILLA_HEIGHT / 2;
        p.push();
        p.translate(cx, cy);
        p.scale(scale);
        p.translate(-GORILLA_WIDTH / 2, -GORILLA_HEIGHT / 2);
        // Draw sparkle effect
        const sparkle = Math.sin(p.millis() / 50) * 0.5 + 0.5;
        p.fill(0, 255, 200, 100 + sparkle * 100);
        p.noStroke();
        p.circle(GORILLA_WIDTH / 2, GORILLA_HEIGHT / 2, GORILLA_WIDTH * (1.5 - scale));
        p.pop();
      }
    }
  }

  function placePortal(st: GameState, edge: "left" | "right", x: number, y: number) {
    if (st.portals[0] === null) {
      st.portals[0] = { edge, x, y, color: "orange" };
    } else if (st.portals[1] === null) {
      st.portals[1] = { edge, x, y, color: "blue" };
    }
  }

  function switchPlayer() {
    // Save outgoing player's selection
    const outIdx = (state.currentPlayer - 1) as 0 | 1;
    playerSelectedPowerUp[outIdx] = state.selectedPowerUp;
    playerSelectedSlotIndex[outIdx] = state.selectedSlotIndex;

    state.currentPlayer = state.currentPlayer === 1 ? 2 : 1;

    // Restore incoming player's selection
    const inIdx = (state.currentPlayer - 1) as 0 | 1;
    const inv = state.inventory[inIdx];
    const restoredSlot = playerSelectedSlotIndex[inIdx];
    // Validate: if they had an inventory item selected, make sure it's still valid
    if (restoredSlot >= 0 && restoredSlot >= inv.length) {
      // Item was consumed or inventory shrunk — fall back to normal banana
      state.selectedPowerUp = null;
      state.selectedSlotIndex = -2;
    } else {
      state.selectedPowerUp = playerSelectedPowerUp[inIdx];
      state.selectedSlotIndex = restoredSlot;
    }
    state.inventoryOpen = false;
    state.inventoryScrollOffset = 0;
    state.isExtraThrow = false;
  }

  function enterAimPhase() {
    // Check if hazard damage needs to resolve first
    if (state.burningBuildings.size > 0 || state.stormActive) {
      const playerIdx = (state.currentPlayer - 1) as 0 | 1;
      const bIdx = findBuildingUnderGorilla(state.gorillas[playerIdx], state.buildings);
      const onFire = bIdx >= 0 && state.burningBuildings.has(bIdx);
      if (onFire || state.stormActive) {
        state.hazardDamageStep = 0;
        state.hazardDamageTimer = p.millis();
        state.lightningTarget = -1;
        state.phase = "hazard_damage";
        return;
      }
    }
    state.angle = lastAngles[state.currentPlayer - 1];
    state.phase = "aim";
    trySpawnCrate(state, state.wind);
  }

  function updateHazardDamage() {
    const elapsed = p.millis() - state.hazardDamageTimer;
    const playerIdx = (state.currentPlayer - 1) as 0 | 1;

    if (state.hazardDamageStep === 0) {
      // Fire check
      const bIdx = findBuildingUnderGorilla(state.gorillas[playerIdx], state.buildings);
      if (bIdx >= 0 && state.burningBuildings.has(bIdx)) {
        if (elapsed < 200) return; // brief pause before damage
        state.hp[playerIdx] -= FIRE_DAMAGE_PER_TURN;
        setFloatingText(
          state.gorillas[playerIdx].x + GORILLA_WIDTH / 2,
          state.gorillas[playerIdx].y - 5,
          "-1 FIRE", "red"
        );
        playSound("fire_damage");
        state.hazardDamageStep = 1;
        state.hazardDamageTimer = p.millis();
        if (state.hp[playerIdx] <= 0) {
          state.hp[playerIdx] = 0;
          recordDeath(gameStats, playerIdx, "fire");
          const oppIdx = (playerIdx === 0 ? 1 : 0) as 0 | 1;
          recordKill(gameStats, oppIdx);
          state.lastHitPlayer = state.currentPlayer;
          state.phase = "victory";
          state.victoryTimer = p.millis();
        }
        return;
      } else {
        // No fire damage — skip to storm
        state.hazardDamageStep = 1;
        state.hazardDamageTimer = p.millis();
      }
    }

    if (state.hazardDamageStep === 1) {
      // Storm check
      if (state.stormActive) {
        if (state.lightningTarget === -1) {
          // Pick a random non-destroyed building
          const eligible = state.buildings
            .map((b, i) => ({ b, i }))
            .filter(({ b }) => b.height > 0);
          if (eligible.length > 0) {
            state.lightningTarget = eligible[Math.floor(Math.random() * eligible.length)].i;
          }
          state.hazardDamageTimer = p.millis();
          playSound("thunder");
        }

        const stormElapsed = p.millis() - state.hazardDamageTimer;
        if (stormElapsed < STORM_LIGHTNING_DELAY_MS) return; // wait for lightning visual

        // Check if gorilla is on the struck building
        const gBIdx = findBuildingUnderGorilla(state.gorillas[playerIdx], state.buildings);
        if (state.lightningTarget >= 0 && gBIdx === state.lightningTarget) {
          state.hp[playerIdx] -= 1;
          setFloatingText(
            state.gorillas[playerIdx].x + GORILLA_WIDTH / 2,
            state.gorillas[playerIdx].y - 5,
            "-1 ZAP", "red"
          );
          playSound("fire_damage");
          if (state.hp[playerIdx] <= 0) {
            state.hp[playerIdx] = 0;
            recordDeath(gameStats, playerIdx, "lightning");
            const oppIdx = (playerIdx === 0 ? 1 : 0) as 0 | 1;
            recordKill(gameStats, oppIdx);
            state.lastHitPlayer = state.currentPlayer;
            state.phase = "victory";
            state.victoryTimer = p.millis();
            return;
          }
        }

        state.hazardDamageStep = 2;
        state.hazardDamageTimer = p.millis();
      } else {
        state.hazardDamageStep = 2;
      }
    }

    if (state.hazardDamageStep === 2) {
      // Done — transition to aim
      const delay = p.millis() - state.hazardDamageTimer;
      if (delay < 300) return; // brief pause after last damage
      state.lightningTarget = -1;
      state.angle = lastAngles[state.currentPlayer - 1];
      state.phase = "aim";
      trySpawnCrate(state, state.wind);
    }
  }

  function resolveThrowEnd() {
    if (state.extraThrowRemaining) {
      state.extraThrowRemaining = false;
      state.isExtraThrow = true;
      enterAimPhase();
    } else {
      state.isExtraThrow = false;
      // Decrement poison for the player who is about to aim
      const nextPlayerIdx = (state.currentPlayer === 1 ? 1 : 0) as 0 | 1;
      if (state.poisonTurns[nextPlayerIdx] > 0) {
        state.poisonTurns[nextPlayerIdx]--;
      }
      if (state.iceTurns[nextPlayerIdx] > 0) {
        state.iceTurns[nextPlayerIdx]--;
      }
      if (state.mirrorTurns[nextPlayerIdx] > 0) {
        state.mirrorTurns[nextPlayerIdx]--;
      }
      if (state.gravityTurns[nextPlayerIdx] > 0) {
        state.gravityTurns[nextPlayerIdx]--;
      }
      switchPlayer();
      enterAimPhase();
    }
  }

  function drawGameplay(p: p5) {
    // Ground
    const gnd = GROUND_COLORS[state.timeOfDay];
    p.noStroke();
    p.fill(gnd[0], gnd[1], gnd[2]);
    p.rect(0, BOTTOM_LINE, WIDTH, HEIGHT - BOTTOM_LINE);

    // Move and draw clouds (behind everything else, but in front of sky)
    updateAndDrawClouds(p);

    drawCity(p, state.buildings);

    // Draw burning building overlays
    if (state.burningBuildings.size > 0) {
      drawBurningBuildings(p, state.buildings, state.burningBuildings);
    }

    drawPortals(p, state.portals);

    // Draw crate
    if (state.crate) {
      const wasFalling = state.crate.falling;
      updateCrateFall(state.crate);

      // Auto-collect if crate just landed on a gorilla's building
      if (wasFalling && !state.crate.falling) {
        const checkOrder = [state.currentPlayer - 1, state.currentPlayer === 1 ? 1 : 0];
        for (const gi of checkOrder) {
          if (!state.crate) break;
          const gIdx = findBuildingUnderGorilla(state.gorillas[gi], state.buildings);
          if (gIdx >= 0 && gIdx === state.crate.buildingIdx) {
            const crateX = state.crate.x + 5;
            const crateY = state.crate.y;
            const result = collectCrate(state, gi as 0 | 1);
            if (result === "full") {
              setFloatingText(crateX, crateY, "FULL!", "red");
              playSound("crate_destroy");
            } else if (result) {
              setFloatingText(crateX, crateY, powerUpShortName(result), "green");
              playSound("crate_collect");
            }
            break;
          }
        }
      }

      if (state.crate) drawCrate(p, state.crate);
    }

    // Update and draw floating text
    if (state.floatingText) {
      state.floatingText.timer--;
      if (state.floatingText.timer <= 0) {
        state.floatingText = null;
      }
    }
    if (state.floatingText) {
      drawFloatingText(p, state.floatingText);
    }

    // Determine loser index during victory phase
    const loserIdx = state.phase === "victory" && state.lastHitPlayer !== null
      ? state.lastHitPlayer - 1
      : -1;

    for (let i = 0; i < 2; i++) {
      // Hide gorillas during teleport animation (drawTeleportAnim handles visuals)
      if (teleportAnimTargets) continue;
      if (i === loserIdx) {
        // Draw loser flipped upside down, falling
        const g = state.gorillas[i];
        p.push();
        p.translate(g.x + GORILLA_WIDTH / 2, g.y + GORILLA_HEIGHT / 2 + loserFallOffset);
        p.scale(1, -1);
        p.translate(-(g.x + GORILLA_WIDTH / 2), -(g.y + GORILLA_HEIGHT / 2));
        drawGorilla(p, g, costumes[i], {
          poison: state.poisonTurns[i] > 0,
          ice: state.iceTurns[i] > 0,
          mirror: state.mirrorTurns[i] > 0,
          gravity: state.gravityTurns[i] > 0,
          shield: state.shield[i],
        });
        p.pop();
      } else if (tauntDancePlayer !== null && i === tauntDancePlayer - 1 && tauntDanceHop !== 0) {
        // Draw dancing gorilla with hop offset
        p.push();
        p.translate(0, tauntDanceHop);
        drawGorilla(p, state.gorillas[i], costumes[i], {
          poison: state.poisonTurns[i] > 0,
          ice: state.iceTurns[i] > 0,
          mirror: state.mirrorTurns[i] > 0,
          gravity: state.gravityTurns[i] > 0,
          shield: state.shield[i],
        });
        p.pop();
      } else {
        drawGorilla(p, state.gorillas[i], costumes[i], {
          poison: state.poisonTurns[i] > 0,
          ice: state.iceTurns[i] > 0,
          mirror: state.mirrorTurns[i] > 0,
          gravity: state.gravityTurns[i] > 0,
          shield: state.shield[i],
        });
      }
    }

    // Draw lava layer (on top of building bases and gorillas, below UI)
    if (state.lavaActive) {
      drawLava(p, state.lavaHeight);
    }

    drawHP(p, state);
    drawTauntBubble(p);

    if (state.stormActive) {
      drawStormClouds(p);
    } else {
      drawSun(p, state.sunShocked, state.timeOfDay);
    }

    // Draw active player indicator (name + arrow) under HUD
    if ((state.phase === "aim" || state.phase === "power") && !isActiveTaunting()) {
      drawActivePlayerIndicator(p, state);
      drawAngleIndicator(p, state);
    }

    drawScores(p, state);
    drawInventoryHUD(p, state);

    // Draw fizzle "?" bubble
    if (state.fizzleTimer > 0) {
      const fizzleElapsed = p.millis() - state.fizzleTimer;
      if (fizzleElapsed < FIZZLE_BUBBLE_MS) {
        drawFizzleBubble(p, state.gorillas[state.fizzlePlayerIdx], fizzleElapsed / FIZZLE_BUBBLE_MS);
      } else {
        state.fizzleTimer = 0;
      }
    }
  }

  function updateAndDrawClouds(p: p5) {
    const speed = state.wind * 0.15;
    p.noStroke();

    for (const c of clouds) {
      c.x += speed;
      // Wrap around screen
      if (c.x > WIDTH + c.w) c.x = -c.w;
      if (c.x < -c.w) c.x = WIDTH + c.w;

      // Draw a soft cloud shape: overlapping ellipses
      p.fill(200, 200, 220, 40);
      p.ellipse(c.x, c.y, c.w, c.h);
      p.ellipse(c.x - c.w * 0.25, c.y + 1, c.w * 0.6, c.h * 0.7);
      p.ellipse(c.x + c.w * 0.25, c.y + 1, c.w * 0.6, c.h * 0.7);
    }
  }

  function drawCity(p: p5, buildings: Building[]) {
    const winColors = WINDOW_COLORS[state.timeOfDay];
    const isNeon = state.cityTheme === "neon";
    const sky = SKY_COLORS[state.timeOfDay];

    for (const b of buildings) {
      if (b.height <= 0) continue;
      p.fill(b.color);
      p.noStroke();
      p.rect(b.x, b.y, b.width, b.height);

      // Draw windows (skip any inside damage holes)
      for (let wi = 0; wi < b.windows.length; wi++) {
        const w = b.windows[wi];
        let destroyed = false;
        for (const hole of b.damage) {
          const dx = w.x + 1.5 - hole.cx;
          const dy = w.y + 2.5 - hole.cy;
          if (dx * dx + dy * dy <= hole.radius * hole.radius) {
            destroyed = true;
            break;
          }
        }
        if (!destroyed) {
          if (w.lit && isNeon) {
            p.fill(NEON_WINDOW_COLORS[wi % NEON_WINDOW_COLORS.length]);
          } else {
            p.fill(w.lit ? winColors.lit : winColors.dark);
          }
          p.rect(w.x, w.y, 3, 5);
        }
      }

      // Draw damage holes: sky-colored circles
      for (const hole of b.damage) {
        p.noStroke();
        p.fill(sky[0], sky[1], sky[2]);
        p.ellipse(hole.cx, hole.cy, hole.radius * 2, hole.radius * 2);
      }
    }
  }

  function drawBanana(p: p5) {
    if (!state.projectile) return;
    const playerGravIdx = (state.currentPlayer - 1) as 0 | 1;
    const drawGravity = state.gravityTurns[playerGravIdx] > 0 ? -state.gravity : state.gravity;
    let pos = getProjectilePositionWithGravity(state.projectile, state.wind, drawGravity);
    if (state.projectile.powerUpType === "drunk") {
      pos = applyDrunkWobble(pos, state.projectile);
    }

    // Only draw if reasonably on screen
    if (pos.y < -50 || pos.x < -10 || pos.x > WIDTH + 10) return;

    const scale = state.projectile.explosionRadius
      ? (state.projectile.explosionRadius / EXPLOSION_RADIUS)
      : 1;

    // Homing trail (drawn before main banana transform)
    if (state.projectile.powerUpType === "homing") {
      p.noStroke();
      for (let ti = 1; ti <= 3; ti++) {
        const trailT = Math.max(0, state.projectile.t - ti * 0.3);
        const tp = getProjectilePositionWithGravity(
          { ...state.projectile, t: trailT },
          state.wind, drawGravity
        );
        p.fill(255, 80, 50, 80 - ti * 20);
        p.circle(tp.x, tp.y, 3);
      }
    }

    p.push();
    p.translate(pos.x, pos.y);
    p.rotate(bananaRotation);
    p.noStroke();

    switch (state.projectile.powerUpType) {
      case "big_banana":
        p.fill(255, 255, 0);
        p.arc(0, 0, 12 * scale, 9 * scale, 0, Math.PI);
        break;
      case "two_bananas":
        p.fill(255, 255, 0);
        p.arc(-3 * scale, 0, 6 * scale, 4 * scale, 0, Math.PI);
        p.arc(3 * scale, 0, 6 * scale, 4 * scale, 0, Math.PI);
        break;
      case "ricochet":
        p.fill(0, 200, 255);
        p.arc(0, 0, 8 * scale, 6 * scale, 0, Math.PI);
        // Bounce arrow
        p.stroke(255, 255, 255, 180);
        p.strokeWeight(1);
        p.line(-2 * scale, -2 * scale, 0, -4 * scale);
        p.line(0, -4 * scale, 2 * scale, -2 * scale);
        p.noStroke();
        break;
      case "wrap_around":
        p.fill(200, 0, 255);
        p.arc(0, 0, 8 * scale, 6 * scale, 0, Math.PI);
        // Wrap arrows
        p.stroke(255, 255, 255, 150);
        p.strokeWeight(1);
        p.line(-4 * scale, 0, -3 * scale, -2 * scale);
        p.line(4 * scale, 0, 3 * scale, -2 * scale);
        p.noStroke();
        break;
      case "cluster_bomb":
        p.fill(255, 100, 0);
        p.arc(0, 0, 8 * scale, 6 * scale, 0, Math.PI);
        p.fill(255, 255, 0);
        p.circle(-2 * scale, -2 * scale, 2 * scale);
        p.circle(2 * scale, -2 * scale, 2 * scale);
        p.circle(0, -3 * scale, 2 * scale);
        break;
      case "teleportation":
        p.fill(0, 255, 200);
        p.arc(0, 0, 8 * scale, 6 * scale, 0, Math.PI);
        // Zap lines
        p.stroke(255, 255, 255, 200);
        p.strokeWeight(1);
        p.line(-1 * scale, -3 * scale, 1 * scale, -1 * scale);
        p.line(1 * scale, -1 * scale, -1 * scale, 1 * scale);
        p.noStroke();
        break;
      case "portal": {
        const isSecond = state.portals[0] !== null;
        if (isSecond) {
          p.fill(0, 140, 255);
        } else {
          p.fill(255, 140, 0);
        }
        p.arc(0, 0, 8 * scale, 6 * scale, 0, Math.PI);
        p.stroke(255, 255, 255, 150);
        p.strokeWeight(1);
        p.noFill();
        p.arc(0, 0, 10 * scale, 8 * scale, 0.3, Math.PI - 0.3);
        break;
      }
      case "confetti":
        p.fill(255, 100, 200);
        p.arc(0, 0, 8 * scale, 6 * scale, 0, Math.PI);
        // Confetti dots
        p.fill(255, 255, 0);
        p.circle(-2 * scale, -2 * scale, 1.5 * scale);
        p.fill(0, 255, 200);
        p.circle(2 * scale, -1 * scale, 1.5 * scale);
        p.fill(100, 100, 255);
        p.circle(0, -3 * scale, 1.5 * scale);
        break;
      case "poison":
        p.fill(0, 200, 0);
        p.arc(0, 0, 8 * scale, 6 * scale, 0, Math.PI);
        // Drip
        p.fill(0, 255, 0, 180);
        p.circle(0, 2 * scale, 2 * scale);
        break;
      case "ice":
        p.fill(100, 200, 255);
        p.arc(0, 0, 8 * scale, 6 * scale, 0, Math.PI);
        // Crystal sparkle
        p.stroke(255, 255, 255, 200);
        p.strokeWeight(1);
        p.line(0, -3 * scale, 0, -1 * scale);
        p.line(-1 * scale, -2 * scale, 1 * scale, -2 * scale);
        p.noStroke();
        break;
      case "mirror":
        p.fill(180, 0, 255);
        p.arc(0, 0, 8 * scale, 6 * scale, 0, Math.PI);
        // Mirror reflection line
        p.stroke(255, 255, 255, 180);
        p.strokeWeight(1);
        p.line(-2 * scale, -1 * scale, 2 * scale, -3 * scale);
        p.noStroke();
        break;
      case "gravity_flip":
        p.fill(255, 180, 0);
        p.arc(0, 0, 8 * scale, 6 * scale, 0, Math.PI);
        // Swirl effect
        p.noFill();
        p.stroke(255, 255, 255, 100);
        p.strokeWeight(1);
        p.arc(0, 0, 6 * scale, 4 * scale, 0, Math.PI * 1.5);
        p.noStroke();
        break;
      case "shield":
        p.fill(0, 255, 255);
        p.arc(0, 0, 8 * scale, 6 * scale, 0, Math.PI);
        // Shield arc
        p.noFill();
        p.stroke(255, 255, 255, 150);
        p.strokeWeight(1);
        p.arc(0, -1 * scale, 6 * scale, 6 * scale, Math.PI + 0.5, -0.5);
        p.noStroke();
        break;
      case "rubber":
        p.fill(0, 220, 255);
        p.arc(0, 0, 8 * scale, 6 * scale, 0, Math.PI);
        // Inner bounce dot
        p.fill(255);
        p.circle(0, 0, 2 * scale);
        break;
      case "homing":
        p.fill(255, 80, 50);
        p.arc(0, 0, 8 * scale, 6 * scale, 0, Math.PI);
        // Crosshair
        p.stroke(255, 255, 255, 180);
        p.strokeWeight(1);
        p.line(0, -3 * scale, 0, 1 * scale);
        p.line(-2 * scale, -1 * scale, 2 * scale, -1 * scale);
        p.noStroke();
        break;
      case "ghost": {
        const flicker = Math.floor(p.millis() / 100) % 6 !== 0;
        if (flicker) {
          p.fill(255, 255, 255, 120);
          p.arc(0, 0, 8 * scale, 6 * scale, 0, Math.PI);
        }
        break;
      }
      case "giant":
        p.fill(255, 220, 0);
        p.arc(0, 0, 12 * scale, 9 * scale, 0, Math.PI);
        // Heavy lines
        p.stroke(200, 150, 0);
        p.strokeWeight(1);
        p.line(-3 * scale, 0, 3 * scale, 0);
        p.noStroke();
        break;
      case "boomerang":
        p.fill(255, 200, 100);
        p.arc(0, 0, 4 * scale, 6 * scale, 0, Math.PI);
        p.arc(0, 0, 4 * scale, 6 * scale, Math.PI, Math.PI * 2);
        break;
      case "drunk":
        p.fill(200, 100, 255);
        p.arc(0, 0, 8 * scale, 6 * scale, 0, Math.PI);
        // Wobble lines
        p.stroke(255, 255, 255, 120);
        p.strokeWeight(1);
        p.arc(-2 * scale, -2 * scale, 3 * scale, 3 * scale, 0, Math.PI);
        p.noStroke();
        break;
      case "earthquake":
        p.fill(139, 90, 43);
        p.arc(0, 0, 8 * scale, 6 * scale, 0, Math.PI);
        // Crack lines
        p.stroke(80, 50, 20);
        p.strokeWeight(1);
        p.line(-2 * scale, 0, 0, -2 * scale);
        p.line(0, -2 * scale, 2 * scale, 0);
        p.noStroke();
        break;
      case "demolition":
        p.fill(40, 40, 40);
        p.arc(0, 0, 8 * scale, 6 * scale, 0, Math.PI);
        p.fill(80, 80, 80);
        p.circle(0, 1, 3 * scale);
        break;
      case "construction":
        p.fill(50, 200, 50);
        p.arc(0, 0, 8 * scale, 6 * scale, 0, Math.PI);
        // Plus sign
        p.stroke(255, 255, 255, 200);
        p.strokeWeight(1);
        p.line(0, -3 * scale, 0, -1 * scale);
        p.line(-1 * scale, -2 * scale, 1 * scale, -2 * scale);
        p.noStroke();
        break;
      default:
        p.fill(255, 255, 0);
        p.arc(0, 0, 8 * scale, 6 * scale, 0, Math.PI);
        break;
    }
    p.pop();
  }
};

new p5(sketch, document.getElementById("sketch")!);
