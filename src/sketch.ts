import p5 from "p5";
import type { GameState, Building } from "./types";
import {
  WIDTH, HEIGHT, INITIAL_ANGLE_P1, INITIAL_ANGLE_P2,
  GRAVITY_VALUES, POWER_CYCLE_MS, POWER_DEAD_ZONE_MS,
  EXPLOSION_EXPAND_MS, EXPLOSION_CONTRACT_MS,
  VICTORY_DURATION_MS, ROUND_START_DELAY_MS,
  TARGET_SCORE_OPTIONS, GRAVITY_PRESET_OPTIONS,
  GORILLA_WIDTH, GORILLA_HEIGHT,
  WINDOW_COLOR_LIT, WINDOW_COLOR_DARK,
} from "./config";
import { getPlayerInput, getSystemInput } from "./input";
import { generateCityscape, placeGorillas, generateWind } from "./city";
import { createProjectile, getProjectilePositionWithGravity, advanceProjectile } from "./physics";
import { checkCollision } from "./collision";
import { drawGorilla } from "./gorilla";
import {
  drawScores, drawAngleIndicator, drawPowerMeter, drawSun,
  drawWindArrow, drawExplosion, drawTitleScreen, drawConfigScreen,
  drawGameOver,
} from "./ui";
import { randomName } from "./names";

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

  p.setup = () => {
    p.createCanvas(WIDTH, HEIGHT);
    state = createInitialState();
  };

  p.draw = () => {
    p.background(20, 20, 40);
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
        drawGameplay(p);
        drawAngleIndicator(p, state);
        break;

      case "power":
        updatePower(activeInput);
        drawGameplay(p);
        drawAngleIndicator(p, state);
        drawPowerMeter(p, state);
        break;

      case "flight":
        updateFlight();
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
  };

  function updateTitle(sys: ReturnType<typeof getSystemInput>) {
    if (sys.onePlayer || sys.twoPlayer) {
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
    if (dpad === "down") configCursor = Math.min(1, configCursor + 1);

    if (dpad === "left" || dpad === "right") {
      const dir = dpad === "right" ? 1 : -1;
      if (configCursor === 0) {
        const idx = TARGET_SCORE_OPTIONS.indexOf(state.targetScore);
        const newIdx = (idx + dir + TARGET_SCORE_OPTIONS.length) % TARGET_SCORE_OPTIONS.length;
        state.targetScore = TARGET_SCORE_OPTIONS[newIdx];
      } else {
        const idx = GRAVITY_PRESET_OPTIONS.indexOf(state.gravityPreset);
        const newIdx = (idx + dir + GRAVITY_PRESET_OPTIONS.length) % GRAVITY_PRESET_OPTIONS.length;
        state.gravityPreset = GRAVITY_PRESET_OPTIONS[newIdx];
        state.gravity = GRAVITY_VALUES[state.gravityPreset];
      }
    }

    if (sys.onePlayer || sys.twoPlayer) {
      startNewRound();
    }
  }

  function startNewRound() {
    state.buildings = generateCityscape();
    const positions = placeGorillas(state.buildings);
    state.gorillas[0].x = positions[0].x;
    state.gorillas[0].y = positions[0].y;
    state.gorillas[1].x = positions[1].x;
    state.gorillas[1].y = positions[1].y;
    state.gorillas[0].armState = "down";
    state.gorillas[1].armState = "down";
    state.wind = generateWind();
    state.sunShocked = false;
    state.phase = "round_start";
    state.roundStartTimer = p.millis();
  }

  function updateRoundStart() {
    if (p.millis() - state.roundStartTimer > ROUND_START_DELAY_MS) {
      state.angle = state.currentPlayer === 1 ? INITIAL_ANGLE_P1 : INITIAL_ANGLE_P2;
      state.phase = "aim";
    }
  }

  function updateAim(input: ReturnType<typeof getPlayerInput>) {
    // Spinner rotates angle
    if (input.spinnerDelta !== 0) {
      state.angle = (state.angle + input.spinnerDelta + 360) % 360;
    }

    // A button pressed (edge detection)
    const prevA = state.currentPlayer === 1 ? prevA1 : prevA2;
    if (input.a && !prevA) {
      state.phase = "power";
      state.powerMeterValue = 0;
      state.powerMeterDirection = 1;
      state.powerDeadZoneTimer = p.millis();

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

    // Check for A release (after dead zone)
    if (!input.a && elapsed > POWER_DEAD_ZONE_MS) {
      state.power = state.powerMeterValue * 100;
      launchBanana();
    }
  }

  function launchBanana() {
    const gorilla = state.gorillas[state.currentPlayer - 1];
    const startX = gorilla.x + GORILLA_WIDTH / 2;
    const startY = gorilla.y;

    state.projectile = createProjectile(startX, startY, state.angle, state.power);
    state.phase = "flight";
    bananaRotation = 0;

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
        state.angle = state.currentPlayer === 1 ? INITIAL_ANGLE_P1 : INITIAL_ANGLE_P2;
        state.phase = "aim";
        break;
      case "building":
        explosionX = pos.x;
        explosionY = pos.y;
        state.projectile = null;
        state.explosionTimer = p.millis();
        state.lastHitPlayer = null;
        state.phase = "explosion";
        break;
      case "gorilla":
        explosionX = pos.x;
        explosionY = pos.y;
        state.projectile = null;
        state.explosionTimer = p.millis();
        state.lastHitPlayer = result.gorilla.playerNum;
        state.phase = "explosion";
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
      } else {
        // Building hit — switch player
        switchPlayer();
        state.angle = state.currentPlayer === 1 ? INITIAL_ANGLE_P1 : INITIAL_ANGLE_P2;
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
    if (sys.onePlayer || sys.twoPlayer) {
      state = createInitialState();
    }
  }

  function switchPlayer() {
    state.currentPlayer = state.currentPlayer === 1 ? 2 : 1;
  }

  function drawGameplay(p: p5) {
    drawCity(p, state.buildings);
    drawGorilla(p, state.gorillas[0]);
    drawGorilla(p, state.gorillas[1]);
    drawSun(p, state.sunShocked);
    drawWindArrow(p, state.wind);
    drawScores(p, state);
  }

  function drawCity(p: p5, buildings: Building[]) {
    for (const b of buildings) {
      p.fill(b.color);
      p.noStroke();
      p.rect(b.x, b.y, b.width, b.height);
      for (const w of b.windows) {
        p.fill(w.lit ? WINDOW_COLOR_LIT : WINDOW_COLOR_DARK);
        p.rect(w.x, w.y, 3, 5);
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
