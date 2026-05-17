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
} from "./config";
import { getPlayerInput, getSystemInput } from "./input";
import { generateCityscape, placeGorillas, generateWind } from "./city";
import { createProjectile, getProjectilePositionWithGravity, advanceProjectile } from "./physics";
import { checkCollision } from "./collision";
import { drawGorilla } from "./gorilla";
import {
  drawScores, drawAngleIndicator, drawActivePlayerIndicator, drawPowerMeter,
  drawSun, drawExplosion, drawTitleScreen, drawConfigScreen,
  drawGameOver,
} from "./ui";
import { randomName } from "./names";
import { playSound, startPowerHum, updatePowerHum, stopPowerHum } from "./sound";

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
  let bananaRotation = 0;
  let lastAngles: [number, number] = [INITIAL_ANGLE_P1, INITIAL_ANGLE_P2];
  let loserFallOffset = 0;
  let clouds: { x: number; y: number; w: number; h: number }[] = [];
  let prevB1 = false;
  let prevB2 = false;
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
  const TAUNTS = [
    "LOL", "Nice try!", "GG EZ", "Haha!", "Oops!",
    "Missed!", "Too slow!", "Wow...", "Really?", "Yikes!",
    "Bruh", "Come on!", "So close!", "Nope!", "Try again!",
    "Bonk!", ":)", "RIP", "Oof!", "Get rekt!",
    "Banana breath!", "U mad?", "Skill issue", "LMAO",
    "Hold this L", "Do over!", "Tragic", "Cope",
    "EZ clap", "Whiff!", "*yawns*", "Snooze!", "Oh no...",
    "Git gud", "Weak!", "Lol wut", "Srsly?", "kthxbye",
    "Ape mode!", "No way!", "BYE BYE", "Later!",
  ];
  let arcadeFont: p5.Font;

  p.preload = () => {
    arcadeFont = p.loadFont("PressStart2P.ttf");
  };

  p.setup = () => {
    p.createCanvas(WIDTH, HEIGHT);
    p.textFont(arcadeFont);
    state = createInitialState();
  };

  p.draw = () => {
    const sky = SKY_COLORS[state.timeOfDay];
    p.background(sky[0], sky[1], sky[2]);
    const sys = getSystemInput();
    const p1Input = getPlayerInput(1);
    const p2Input = getPlayerInput(2);
    const activeInput = state.currentPlayer === 1 ? p1Input : p2Input;

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
        updateTaunts(p1Input, p2Input);
        drawGameplay(p);
        if (!isActiveTaunting()) {
          drawActivePlayerIndicator(p, state);
          drawAngleIndicator(p, state);
        }
        break;

      case "power":
        updatePower(activeInput);
        updateTaunts(p1Input, p2Input);
        drawGameplay(p);
        if (!isActiveTaunting()) {
          drawActivePlayerIndicator(p, state);
          drawAngleIndicator(p, state);
        }
        drawPowerMeter(p, state);
        break;

      case "flight":
        updateFlight();
        updateTaunts(p1Input, p2Input);
        drawGameplay(p);
        drawBanana(p);
        break;

      case "explosion":
        updateExplosion();
        drawGameplay(p);
        drawExplosion(p, explosionX, explosionY, getExplosionProgress());
        break;

      case "victory":
        updateVictory();
        drawGameplay(p);
        break;

      case "game_over":
        updateGameOver(sys);
        drawGameOver(p, state);
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
    }
    if (p2.spinnerDelta !== 0) {
      state.playerNames[1] = randomName();
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
    if (dpad === "down") configCursor = Math.min(3, configCursor + 1);

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
    state.phase = "round_start";
    state.roundStartTimer = p.millis();
  }

  function updateRoundStart() {
    if (p.millis() - state.roundStartTimer > ROUND_START_DELAY_MS) {
      state.angle = lastAngles[state.currentPlayer - 1];
      state.phase = "aim";
    }
  }

  function updateAim(input: ReturnType<typeof getPlayerInput>) {
    // Spinner rotates angle
    if (input.spinnerDelta !== 0) {
      state.angle = (state.angle + input.spinnerDelta + 360) % 360;
      playSound("aim_tick");
    }

    // A button pressed (edge detection)
    const prevA = state.currentPlayer === 1 ? prevA1 : prevA2;
    if (input.a && !prevA) {
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

  function updatePower(input: ReturnType<typeof getPlayerInput>) {
    // Oscillate power meter using sine wave
    const elapsed = p.millis() - state.powerDeadZoneTimer;
    const activeTime = Math.max(0, elapsed - POWER_DEAD_ZONE_MS);
    const cycleProgress = (activeTime % POWER_CYCLE_MS) / POWER_CYCLE_MS;
    state.powerMeterValue = Math.abs(Math.sin(cycleProgress * Math.PI));
    updatePowerHum(state.powerMeterValue);

    // Check for A release (after dead zone)
    if (!input.a && elapsed > POWER_DEAD_ZONE_MS) {
      state.power = state.powerMeterValue * 100;
      stopPowerHum();
      launchBanana();
    }
  }

  function launchBanana() {
    // Remember this player's angle for their next turn
    lastAngles[state.currentPlayer - 1] = state.angle;

    const gorilla = state.gorillas[state.currentPlayer - 1];
    // Launch from above the gorilla's head, offset in throw direction
    const angleRad = (state.angle * Math.PI) / 180;
    const launchOffset = GORILLA_HEIGHT / 2 + 5;
    const startX = gorilla.x + GORILLA_WIDTH / 2 + Math.cos(angleRad) * launchOffset;
    const startY = gorilla.y - Math.sin(angleRad) * launchOffset;

    state.projectile = createProjectile(startX, startY, state.angle, state.power);
    state.phase = "flight";
    bananaRotation = 0;
    playSound("throw");

    // Reset arm
    gorilla.armState = "down";
  }

  function updateFlight() {
    if (!state.projectile) return;

    advanceProjectile(state.projectile);
    bananaRotation = (bananaRotation + 0.3) % (Math.PI * 2);

    const pos = getProjectilePositionWithGravity(state.projectile, state.wind, state.gravity);
    const result = checkCollision(pos.x, pos.y, state.projectile.t, state.buildings, state.gorillas);

    switch (result.type) {
      case "none":
        break;
      case "sun":
        state.sunShocked = true;
        break;
      case "miss":
        state.projectile = null;
        switchPlayer();
        state.angle = lastAngles[state.currentPlayer - 1];
        state.phase = "aim";
        break;
      case "building":
        explosionX = pos.x;
        explosionY = pos.y;
        state.projectile = null;
        state.explosionTimer = p.millis();
        state.lastHitPlayer = null;
        state.phase = "explosion";
        // Carve damage hole in the building
        result.building.damage.push({ cx: pos.x, cy: pos.y, radius: EXPLOSION_RADIUS });
        playSound("explosion");
        break;
      case "gorilla":
        explosionX = pos.x;
        explosionY = pos.y;
        state.projectile = null;
        state.explosionTimer = p.millis();
        state.lastHitPlayer = result.gorilla.playerNum;
        state.phase = "explosion";
        playSound("hit");
        break;
    }
  }

  function updateExplosion() {
    const elapsed = p.millis() - state.explosionTimer;
    const totalDuration = EXPLOSION_EXPAND_MS + EXPLOSION_CONTRACT_MS;

    if (elapsed > totalDuration) {
      if (state.lastHitPlayer !== null) {
        // A gorilla was hit — score point
        if (state.lastHitPlayer === state.currentPlayer) {
          // Self-hit: opponent scores
          const opponentIdx = state.currentPlayer === 1 ? 1 : 0;
          state.scores[opponentIdx]++;
        } else {
          // Hit opponent: thrower scores
          state.scores[state.currentPlayer - 1]++;
        }
        state.victoryTimer = p.millis();
        state.phase = "victory";
        loserFallOffset = 0;
        playSound("victory");
      } else {
        // Building hit — switch player
        switchPlayer();
        state.angle = lastAngles[state.currentPlayer - 1];
        state.phase = "aim";
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
      } else {
        // Loser goes first next round
        if (state.lastHitPlayer !== null) {
          state.currentPlayer = state.lastHitPlayer as 1 | 2;
        }
        startNewRound();
      }
    }
  }

  function updateGameOver(sys: ReturnType<typeof getSystemInput>) {
    if ((sys.onePlayer && !prevStart1P) || (sys.twoPlayer && !prevStart2P)) {
      state = createInitialState();
      lastAngles = [INITIAL_ANGLE_P1, INITIAL_ANGLE_P2];
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

  function triggerBubble(player: 1 | 2) {
    const now = p.millis();
    if (now - tauntBubbleTimer > TAUNT_BUBBLE_MS) {
      tauntBubbleTimer = now;
      tauntBubblePlayer = player;
      tauntBubbleText = TAUNTS[Math.floor(Math.random() * TAUNTS.length)];
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

  function switchPlayer() {
    state.currentPlayer = state.currentPlayer === 1 ? 2 : 1;
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

    // Determine loser index during victory phase
    const loserIdx = state.phase === "victory" && state.lastHitPlayer !== null
      ? state.lastHitPlayer - 1
      : -1;

    for (let i = 0; i < 2; i++) {
      if (i === loserIdx) {
        // Draw loser flipped upside down, falling
        const g = state.gorillas[i];
        p.push();
        p.translate(g.x + GORILLA_WIDTH / 2, g.y + GORILLA_HEIGHT / 2 + loserFallOffset);
        p.scale(1, -1);
        p.translate(-(g.x + GORILLA_WIDTH / 2), -(g.y + GORILLA_HEIGHT / 2));
        drawGorilla(p, g);
        p.pop();
      } else if (tauntDancePlayer !== null && i === tauntDancePlayer - 1 && tauntDanceHop !== 0) {
        // Draw dancing gorilla with hop offset
        p.push();
        p.translate(0, tauntDanceHop);
        drawGorilla(p, state.gorillas[i]);
        p.pop();
      } else {
        drawGorilla(p, state.gorillas[i]);
      }
    }

    drawTauntBubble(p);
    drawSun(p, state.sunShocked, state.timeOfDay);
    drawScores(p, state);
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
    const pos = getProjectilePositionWithGravity(state.projectile, state.wind, state.gravity);

    // Only draw if reasonably on screen
    if (pos.y < -50 || pos.x < -10 || pos.x > WIDTH + 10) return;

    p.push();
    p.translate(pos.x, pos.y);
    p.rotate(bananaRotation);
    p.fill(255, 255, 0);
    p.noStroke();
    p.arc(0, 0, 8, 6, 0, Math.PI);
    p.pop();
  }
};

new p5(sketch, document.getElementById("sketch")!);
