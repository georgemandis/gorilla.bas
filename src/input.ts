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

export function getPlayerInput(player: 1 | 2): PlayerInput {
  const classic = player === 1 ? PLAYER_1 : PLAYER_2;
  const spinner = player === 1 ? SPINNER_1 : SPINNER_2;

  return {
    dpadUp: classic.DPAD.up,
    dpadDown: classic.DPAD.down,
    dpadLeft: classic.DPAD.left,
    dpadRight: classic.DPAD.right,
    a: classic.A,
    b: classic.B,
    spinnerDelta: spinner.SPINNER.consume_step_delta() * DEGREES_PER_STEP,
  };
}

export function getSystemInput(): SystemInput {
  return {
    onePlayer: SYSTEM.ONE_PLAYER,
    twoPlayer: SYSTEM.TWO_PLAYER,
  };
}
