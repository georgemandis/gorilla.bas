import type { Building, CityTheme, GameWindow, TimeOfDay } from "./types";
import {
  WIDTH,
  BOTTOM_LINE,
  MIN_BUILDING_WIDTH,
  MAX_BUILDING_WIDTH,
  CITY_THEME_COLORS,
  GORILLA_HEIGHT,
  EXPLOSION_RADIUS,
} from "./config";

type SlopeType = "up" | "down" | "v" | "inv_v" | "v2" | "inv_v2";

export function generateCityscape(cityTheme: CityTheme = "classic", timeOfDay: TimeOfDay = "day"): Building[] {
  const buildings: Building[] = [];
  let x = 2;

  const slopeTypes: SlopeType[] = ["up", "down", "v", "v", "v", "inv_v"];
  const slope = slopeTypes[Math.floor(Math.random() * slopeTypes.length)];

  let newHt = slope === "down" || slope === "inv_v" ? 100 : 15;
  const htInc = 8;
  const maxBuildingTop = 40 + GORILLA_HEIGHT;

  while (x < WIDTH - 10) {
    switch (slope) {
      case "up":
        newHt += htInc;
        break;
      case "down":
        newHt -= htInc;
        break;
      case "v":
      case "v2":
        if (x > WIDTH / 2) newHt -= 2 * htInc;
        else newHt += 2 * htInc;
        break;
      case "inv_v":
      case "inv_v2":
        if (x > WIDTH / 2) newHt += 2 * htInc;
        else newHt -= 2 * htInc;
        break;
    }

    const bWidth = MIN_BUILDING_WIDTH + Math.floor(Math.random() * (MAX_BUILDING_WIDTH - MIN_BUILDING_WIDTH));
    const actualWidth = Math.min(bWidth, WIDTH - x - 2);

    let bHeight = Math.floor(Math.random() * 80) + newHt;
    if (bHeight < htInc) bHeight = htInc;
    if (BOTTOM_LINE - bHeight < maxBuildingTop) bHeight = BOTTOM_LINE - maxBuildingTop;
    if (bHeight < 20) bHeight = 20;

    const colors = CITY_THEME_COLORS[cityTheme];
    const color = colors[Math.floor(Math.random() * colors.length)];
    // At night, more windows are lit (0.7 vs 0.6)
    const litChance = timeOfDay === "night" ? 0.7 : 0.6;
    const windows = generateWindows(x, BOTTOM_LINE - bHeight, actualWidth, bHeight, litChance);

    buildings.push({
      x,
      y: BOTTOM_LINE - bHeight,
      width: actualWidth,
      height: bHeight,
      color,
      windows,
      damage: [],
    });

    x += actualWidth + 2;
  }

  return buildings;
}

function generateWindows(bx: number, by: number, bw: number, bh: number, litChance = 0.6): GameWindow[] {
  const windows: GameWindow[] = [];
  const hSpacing = 8;
  const vSpacing = 10;

  for (let wx = bx + 4; wx < bx + bw - 4; wx += hSpacing) {
    for (let wy = by + 4; wy < by + bh - 6; wy += vSpacing) {
      windows.push({
        x: wx,
        y: wy,
        lit: Math.random() < litChance,
      });
    }
  }

  return windows;
}

export function placeGorillas(buildings: Building[]): [{ x: number; y: number }, { x: number; y: number }] {
  const lastIdx = buildings.length - 1;

  const p1Idx = 1 + Math.floor(Math.random() * 2);
  const p2Idx = lastIdx - 1 - Math.floor(Math.random() * 2);

  const p1Building = buildings[Math.min(p1Idx, lastIdx)];
  const p2Building = buildings[Math.max(p2Idx, 0)];

  return [
    {
      x: p1Building.x + p1Building.width / 2 - 10,
      y: p1Building.y - 25,
    },
    {
      x: p2Building.x + p2Building.width / 2 - 10,
      y: p2Building.y - 25,
    },
  ];
}

export function randomGorillaPlacements(
  buildings: Building[],
  currentP1Idx: number,
  currentP2Idx: number
): [{ x: number; y: number; buildingIdx: number }, { x: number; y: number; buildingIdx: number }] | null {
  // Find buildings with at least 50% undamaged roof
  const viable = buildings.map((b, i) => ({ b, i })).filter(({ b, i }) => {
    if (i === currentP1Idx || i === currentP2Idx) return false;
    const roofDamage = b.damage.filter(d => d.cy <= b.y + 5).length;
    return roofDamage < b.width / (EXPLOSION_RADIUS * 2);
  });

  if (viable.length < 2) return null;

  // Pick two buildings at least 3 apart
  for (let attempts = 0; attempts < 20; attempts++) {
    const a = viable[Math.floor(Math.random() * viable.length)];
    const b2 = viable[Math.floor(Math.random() * viable.length)];
    if (a.i !== b2.i && Math.abs(a.i - b2.i) >= 3) {
      return [
        { x: a.b.x + a.b.width / 2 - 10, y: a.b.y - 25, buildingIdx: a.i },
        { x: b2.b.x + b2.b.width / 2 - 10, y: b2.b.y - 25, buildingIdx: b2.i },
      ];
    }
  }

  return null;
}

export function generateWind(): number {
  let wind = Math.floor(Math.random() * 11) - 5;
  if (Math.random() < 1 / 3) {
    if (wind > 0) {
      wind += Math.floor(Math.random() * 10) + 1;
    } else {
      wind -= Math.floor(Math.random() * 10) + 1;
    }
  }
  return wind;
}

export function reshuffleBuildings(buildings: Building[], cityTheme: CityTheme, timeOfDay: TimeOfDay): void {
  const maxBuildingTop = 40 + GORILLA_HEIGHT;

  for (const b of buildings) {
    // Randomize height while preserving x and width
    let newHeight = Math.floor(Math.random() * 120) + 40;
    if (BOTTOM_LINE - newHeight < maxBuildingTop) newHeight = BOTTOM_LINE - maxBuildingTop;
    if (newHeight < 20) newHeight = 20;

    b.height = newHeight;
    b.y = BOTTOM_LINE - newHeight;
    b.damage = []; // clear damage on reshuffled buildings

    // Regenerate windows
    const colors = CITY_THEME_COLORS[cityTheme];
    b.color = colors[Math.floor(Math.random() * colors.length)];
    const litChance = timeOfDay === "night" ? 0.7 : 0.6;
    b.windows = generateWindows(b.x, b.y, b.width, b.height, litChance);
  }
}
