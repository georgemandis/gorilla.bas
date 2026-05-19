import type { PowerUpType } from "./types";

export interface PlayerStats {
  throws: number;
  hits: number;
  selfKills: number;
  jumps: number;
  shieldsUsed: number;
  powerUpsUsed: number;
  fireUsed: number;
  lavaUsed: number;
  stormUsed: number;
  constructionUsed: number;
  demolitionUsed: number;
  earthquakesUsed: number;
  kills: number;
  deathByFire: number;
  deathByLava: number;
  deathByLightning: number;
  totalPower: number;
  firstThrowKills: number;
  throwsThisRound: number;
}

export interface GameStats {
  players: [PlayerStats, PlayerStats];
}

function emptyPlayerStats(): PlayerStats {
  return {
    throws: 0, hits: 0, selfKills: 0, jumps: 0, shieldsUsed: 0,
    powerUpsUsed: 0, fireUsed: 0, lavaUsed: 0, stormUsed: 0,
    constructionUsed: 0, demolitionUsed: 0, earthquakesUsed: 0,
    kills: 0, deathByFire: 0, deathByLava: 0, deathByLightning: 0,
    totalPower: 0, firstThrowKills: 0, throwsThisRound: 0,
  };
}

export function createGameStats(): GameStats {
  return { players: [emptyPlayerStats(), emptyPlayerStats()] };
}

export function recordThrow(stats: GameStats, playerIdx: 0 | 1, power: number): void {
  stats.players[playerIdx].throws++;
  stats.players[playerIdx].throwsThisRound++;
  stats.players[playerIdx].totalPower += power;
}

export function recordHit(stats: GameStats, playerIdx: 0 | 1): void {
  stats.players[playerIdx].hits++;
}

export function recordSelfKill(stats: GameStats, playerIdx: 0 | 1): void {
  stats.players[playerIdx].selfKills++;
}

export function recordKill(stats: GameStats, playerIdx: 0 | 1): void {
  stats.players[playerIdx].kills++;
}

export function recordFirstThrowKill(stats: GameStats, playerIdx: 0 | 1): void {
  stats.players[playerIdx].firstThrowKills++;
}

export function recordDeath(stats: GameStats, playerIdx: 0 | 1, cause: "fire" | "lava" | "lightning"): void {
  if (cause === "fire") stats.players[playerIdx].deathByFire++;
  else if (cause === "lava") stats.players[playerIdx].deathByLava++;
  else stats.players[playerIdx].deathByLightning++;
}

export function recordPowerUp(stats: GameStats, playerIdx: 0 | 1, type: PowerUpType): void {
  stats.players[playerIdx].powerUpsUsed++;
  switch (type) {
    case "fire": stats.players[playerIdx].fireUsed++; break;
    case "lava": stats.players[playerIdx].lavaUsed++; break;
    case "storm": stats.players[playerIdx].stormUsed++; break;
    case "construction": stats.players[playerIdx].constructionUsed++; break;
    case "demolition": stats.players[playerIdx].demolitionUsed++; break;
    case "earthquake": stats.players[playerIdx].earthquakesUsed++; break;
  }
}

export function recordJump(stats: GameStats, playerIdx: 0 | 1): void {
  stats.players[playerIdx].jumps++;
}

export function recordShield(stats: GameStats, playerIdx: 0 | 1): void {
  stats.players[playerIdx].shieldsUsed++;
}

export function resetRoundThrows(stats: GameStats): void {
  stats.players[0].throwsThisRound = 0;
  stats.players[1].throwsThisRound = 0;
}

export interface Award {
  id: string;
  name: string;
  flavorText: string;
}

export interface NameAward {
  id: string;
  name: string;
  flavorText: string;
}

const STAT_AWARDS: { id: string; name: string; flavorText: string; priority: number; check: (s: PlayerStats, opp: PlayerStats, isWinner: boolean, inv: PowerUpType[]) => boolean }[] = [
  { id: "friendly_fire", name: "Friendly Fire", flavorText: "Awarded themselves some damage", priority: 10, check: (s) => s.selfKills > 0 },
  { id: "floor_is_lava", name: "Floor Is Lava", flavorText: "Melted someone into goo", priority: 9, check: (_s, opp) => opp.deathByLava > 0 },
  { id: "thors_cousin", name: "Thor's Cousin", flavorText: "Called down the thunder", priority: 9, check: (_s, opp) => opp.deathByLightning > 0 },
  { id: "the_arsonist", name: "The Arsonist", flavorText: "Some gorillas just want to watch the world burn", priority: 8, check: (s) => s.fireUsed >= 2 },
  { id: "lucky_shot", name: "Lucky Shot", flavorText: "First try!", priority: 8, check: (s) => s.firstThrowKills > 0 },
  { id: "pacifist", name: "Pacifist", flavorText: "Never once hit a gorilla", priority: 7, check: (s) => s.hits === 0 && s.throws > 0 },
  { id: "seismologist", name: "Seismologist", flavorText: "Rearranged the neighborhood", priority: 6, check: (s) => s.earthquakesUsed >= 2 },
  { id: "demolition_derby", name: "Demolition Derby", flavorText: "Buildings feared them", priority: 6, check: (s) => s.demolitionUsed >= 2 },
  { id: "city_planner", name: "City Planner", flavorText: "Made the skyline beautiful", priority: 6, check: (s) => s.constructionUsed >= 2 },
  { id: "bunny", name: "Bunny", flavorText: "Couldn't sit still", priority: 5, check: (s) => s.jumps >= 3 },
  { id: "turtle", name: "Turtle", flavorText: "Played it safe", priority: 5, check: (s) => s.shieldsUsed >= 2 },
  { id: "the_sniper", name: "The Sniper", flavorText: "Deadly accurate", priority: 4, check: (s) => s.throws >= 3 && s.hits / s.throws > 0.5 },
  { id: "stormtrooper", name: "Stormtrooper", flavorText: "Couldn't hit the broad side of a building", priority: 4, check: (s) => s.throws >= 4 && s.hits / s.throws < 0.2 },
  { id: "arms_dealer", name: "Arms Dealer", flavorText: "Loved the crates", priority: 3, check: (s) => s.powerUpsUsed >= 6 },
  { id: "hulk_smash", name: "Hulk Smash", flavorText: "Full send every time", priority: 2, check: (s) => s.throws > 0 && s.totalPower / s.throws > 80 },
  { id: "butterfingers", name: "Butterfingers", flavorText: "Gentle tosser", priority: 2, check: (s) => s.throws >= 3 && s.totalPower / s.throws < 25 },
  { id: "hoarder", name: "Hoarder", flavorText: "Collected but never used", priority: 1, check: (_s, _opp, _w, inv) => inv.length >= 3 },
];

export function pickStatAward(stats: PlayerStats, opponentStats: PlayerStats, isWinner: boolean, inventory: PowerUpType[]): Award {
  const sorted = [...STAT_AWARDS].sort((a, b) => b.priority - a.priority);
  for (const award of sorted) {
    if (award.check(stats, opponentStats, isWinner, inventory)) {
      return { id: award.id, name: award.name, flavorText: award.flavorText };
    }
  }
  if (isWinner) {
    return { id: "champion", name: "Champion", flavorText: "Undisputed gorilla" };
  }
  return { id: "participant", name: "Participant", flavorText: "Showed up" };
}

const NAME_AWARDS: { id: string; name: string; flavorText: string; check: (names: [string, string], stats: GameStats, winnerIdx: 0 | 1) => boolean }[] = [
  {
    id: "kong_vs_kong", name: "Kong vs Kong", flavorText: "The ultimate showdown",
    check: (names) => names[0].includes("Kong") && names[1].includes("Kong"),
  },
  {
    id: "royal_rumble", name: "Royal Rumble", flavorText: "A clash of crowns",
    check: (names) => {
      const hasRoyal = (n: string) => n.includes("King") || n.includes("Queen");
      return hasRoyal(names[0]) && hasRoyal(names[1]);
    },
  },
  {
    id: "identity_crisis", name: "Identity Crisis", flavorText: "Are you two related?",
    check: (names) => {
      const adj0 = names[0].split(" ")[0];
      const adj1 = names[1].split(" ")[0];
      return adj0 === adj1;
    },
  },
  {
    id: "return_of_the_king", name: "Return of the King", flavorText: "Long live the king",
    check: (names, _stats, winnerIdx) => names[winnerIdx].includes("King"),
  },
  {
    id: "curious_indeed", name: "Curious Indeed", flavorText: "The hat stays on",
    check: (names, _stats, winnerIdx) => names[winnerIdx].includes("Curious"),
  },
  {
    id: "the_yeti_abides", name: "The Yeti Abides", flavorText: "Cool as ice",
    check: (names, _stats, winnerIdx) => names[winnerIdx].includes("Yeti"),
  },
  {
    id: "monkeying_around", name: "Monkeying Around", flavorText: "Classic monkey business",
    check: (names, stats) => {
      const misses0 = stats.players[0].throws - stats.players[0].hits;
      const misses1 = stats.players[1].throws - stats.players[1].hits;
      return (names[0].includes("Monkey") && misses0 >= misses1) ||
             (names[1].includes("Monkey") && misses1 >= misses0);
    },
  },
  {
    id: "beauty_and_beast", name: "Beauty & The Beast", flavorText: "An unlikely matchup",
    check: (names) => {
      const hasBeast = (n: string) => n.includes("Feral") || n.includes("Wild") || n.includes("Raging");
      return (names[0].includes("Queen") && hasBeast(names[1])) ||
             (names[1].includes("Queen") && hasBeast(names[0]));
    },
  },
  {
    id: "literally_just_vibing", name: "Literally Just Vibing", flavorText: "Didn't need 'em",
    check: (names, stats) => {
      return (names[0].includes("Funky") && stats.players[0].powerUpsUsed === 0) ||
             (names[1].includes("Funky") && stats.players[1].powerUpsUsed === 0);
    },
  },
  {
    id: "ape_escape", name: "Ape Escape", flavorText: "Couldn't get out of this one",
    check: (names, stats, winnerIdx) => {
      const loserIdx = winnerIdx === 0 ? 1 : 0;
      return names[loserIdx].includes("Ape") && stats.players[loserIdx].kills === 0;
    },
  },
];

export function pickNameAward(names: [string, string], stats: GameStats, winnerIdx: 0 | 1): NameAward | null {
  for (const award of NAME_AWARDS) {
    if (award.check(names, stats, winnerIdx)) {
      return { id: award.id, name: award.name, flavorText: award.flavorText };
    }
  }
  return null;
}
