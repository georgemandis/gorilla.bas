# GORILLAS.BAS

A faithful port of the classic QBasic GORILLAS.BAS game, rebuilt for the [RCade](https://rcade.recurse.com) arcade cabinet at the [Recurse Center](https://www.recurse.com/).

Two gorillas stand atop a randomly generated cityscape. Take turns hurling explosive bananas at each other by setting your angle and power. Account for wind, gravity, and the buildings between you.

## How to Play

1. Spin the wheel (or press C/V) to aim your throw direction
2. Press A to lock your angle — the power meter starts oscillating
3. Release A at your desired power level
4. Watch your banana fly!

First to the target score wins.

## Features

- Procedurally generated cityscapes with lit/unlit windows
- Wind and configurable gravity (Moon, Earth, Jupiter)
- Synthesized retro sound effects via Web Audio API
- "Press Start 2P" arcade pixel font
- Random gorilla names (spin to re-roll on the config screen)
- Configurable target score
- Victory dances

## Controls

Designed for the RCade arcade cabinet with spinner wheels, joysticks, and buttons.

### Keyboard Controls (Development)

**Classic Controls (`@rcade/plugin-input-classic`)**

| Player   | Action           | Key |
|----------|------------------|-----|
| Player 1 | D-pad            | W/A/S/D |
| Player 1 | A Button         | F   |
| Player 1 | B Button         | G   |
| Player 2 | D-pad            | I/J/K/L |
| Player 2 | A Button         | ;   |
| Player 2 | B Button         | '   |
| System   | One Player Start | 1   |
| System   | Two Player Start | 2   |

**Spinner Controls (`@rcade/plugin-input-spinners`)**

| Player   | Action        | Key |
|----------|---------------|-----|
| Player 1 | Spinner Left  | C   |
| Player 1 | Spinner Right | V   |
| Player 2 | Spinner Left  | .   |
| Player 2 | Spinner Right | /   |

## Development

```bash
bun install
bun run dev
```

This launches Vite on port 5173 and connects to the RCade cabinet emulator.

## Building

```bash
bun run build
```

Output goes to `dist/`.

## Deployment

Connect to a GitHub repo and push — the included GitHub Actions workflow will automatically deploy to RCade.

## Tech Stack

- TypeScript + P5.js (instance mode)
- Vite + Bun
- RCade SDK (`@rcade/plugin-input-classic`, `@rcade/plugin-input-spinners`)
- Web Audio API (synthesized sound effects — no audio files)

## Future Ideas

- Real-time simultaneous mode — both players throw at the same time, bananas can collide mid-air
- Destructible buildings — explosions carve chunks out of the cityscape
- Custom gorilla skins
- Different banana types (curve ball, cluster bomb, etc.)
- Music and expanded sound design

## Credits

Based on the original [GORILLAS.BAS](https://en.wikipedia.org/wiki/Gorillas_(video_game) by Microsoft, bundled with MS-DOS 5.0 QBasic (1990).

Built by [George Mandis](https://george.mand.is) at the [Recurse Center](https://www.recurse.com/) (Spring 2, 2026).


