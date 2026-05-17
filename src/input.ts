import { PLAYER_1, PLAYER_2, SYSTEM } from "@rcade/plugin-input-classic";
import { PLAYER_1 as SPINNER_1, PLAYER_2 as SPINNER_2 } from "@rcade/plugin-input-spinners";
import { DEGREES_PER_STEP } from "./config";

export interface PlayerInput {
  dpadUp: boolean;
  dpadDown: boolean;
  dpadLeft: boolean;
  dpadRight: boolean;
  a: boolean;
  b: boolean;
  spinnerDelta: number;
}

export interface SystemInput {
  onePlayer: boolean;
  twoPlayer: boolean;
}

// Keyboard fallback for spinner (in case plugin channel isn't connected)
const keyboardSpinnerState = { p1Delta: 0, p2Delta: 0 };

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === "c" || e.key === "C") keyboardSpinnerState.p1Delta -= 1;
  if (e.key === "v" || e.key === "V") keyboardSpinnerState.p1Delta += 1;
  if (e.key === ".") keyboardSpinnerState.p2Delta -= 1;
  if (e.key === "/") keyboardSpinnerState.p2Delta += 1;
}

window.addEventListener("keydown", handleKeyDown);

function consumeKeyboardDelta(player: 1 | 2): number {
  if (player === 1) {
    const d = keyboardSpinnerState.p1Delta;
    keyboardSpinnerState.p1Delta = 0;
    return d;
  } else {
    const d = keyboardSpinnerState.p2Delta;
    keyboardSpinnerState.p2Delta = 0;
    return d;
  }
}

export function getPlayerInput(player: 1 | 2): PlayerInput {
  const classic = player === 1 ? PLAYER_1 : PLAYER_2;
  const spinner = player === 1 ? SPINNER_1 : SPINNER_2;

  const pluginDelta = spinner.SPINNER.consume_step_delta();
  const keyDelta = consumeKeyboardDelta(player);
  const totalDelta = (pluginDelta + keyDelta) * DEGREES_PER_STEP;

  return {
    dpadUp: classic.DPAD.up,
    dpadDown: classic.DPAD.down,
    dpadLeft: classic.DPAD.left,
    dpadRight: classic.DPAD.right,
    a: classic.A,
    b: classic.B,
    spinnerDelta: totalDelta,
  };
}

export function getSystemInput(): SystemInput {
  return {
    onePlayer: SYSTEM.ONE_PLAYER,
    twoPlayer: SYSTEM.TWO_PLAYER,
  };
}
