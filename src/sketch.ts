import p5 from "p5";
import type { GameState } from "./types";
import { WIDTH, HEIGHT } from "./config";

function createInitialState(): GameState {
  return {
    phase: "title",
    currentPlayer: 1,
    buildings: [],
    gorillas: [
      { x: 0, y: 0, width: 20, height: 25, playerNum: 1, armState: "down" },
      { x: 0, y: 0, width: 20, height: 25, playerNum: 2, armState: "down" },
    ],
    wind: 0,
    gravity: 9.8,
    scores: [0, 0],
    targetScore: 3,
    gravityPreset: "earth",
    playerNames: ["Player 1", "Player 2"],
    angle: 45,
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

  p.setup = () => {
    p.createCanvas(WIDTH, HEIGHT);
    state = createInitialState();
  };

  p.draw = () => {
    p.background(20, 20, 40);

    switch (state.phase) {
      case "title":
        drawTitle(p);
        break;
      case "config":
        break;
      case "round_start":
        break;
      case "aim":
        break;
      case "power":
        break;
      case "flight":
        break;
      case "explosion":
        break;
      case "victory":
        break;
      case "game_over":
        break;
    }
  };
};

function drawTitle(p: p5) {
  p.fill(255, 200, 50);
  p.textSize(16);
  p.textAlign(p.CENTER, p.CENTER);
  p.text("GORILLAS.BAS", WIDTH / 2, HEIGHT / 3);
  p.fill(200);
  p.textSize(10);
  p.text("Press START", WIDTH / 2, HEIGHT / 2);
}

new p5(sketch, document.getElementById("sketch")!);
