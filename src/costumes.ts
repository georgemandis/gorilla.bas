import type { GorillaCostume } from "./types";

// Exact full-name matches (highest priority)
const EXACT_COSTUMES: Record<string, GorillaCostume> = {
  // Pop culture references
  "Curious George": { coat: "yellowraincoat", hat: "yellowhat" },
  "King Kong": { bodyColor: "#3a2a1a", accessory: "scar" },
  "Mighty Joe Young": { bodyColor: "#2a2a2a" },
  "Grape Ape": { bodyColor: "#8844aa", eyeColor: "#ddaaff" },
  "Furious George": { eyeColor: "#ff0000", accessory: "redeyes" },
  "Funky Monkey": { accessory: "sunglasses", hat: "cowboy" },
  "King Louie": { hat: "crown", coat: "cape" },
  "Queen Kong": { hat: "crown", bodyColor: "#3a2a1a" },
  "Golden Kong": { bodyColor: "#c8a832", eyeColor: "#ffe066" },
  "Iron Gorilla": { bodyColor: "#888899", eyeColor: "#aaccff" },
  "Mega Kong": { bodyColor: "#2a2a2a", eyeColor: "#ff4444" },
  "Alpha Silverback": { bodyColor: "#666677" },
  "Hyper Chimp": { eyeColor: "#00ffff", accessory: "sunglasses" },
  "Jungle George": { hat: "yellowhat" },
  "Banana Kong": { hat: "banana", bodyColor: "#d4952a" },
  "Cheeky Monkey": { accessory: "bowtie" },
  "Grumpy Gorilla": { eyeColor: "#ff6666" },
  "Swole Kong": { bodyColor: "#2a2a2a" },
  "Wild Bigfoot": { bodyColor: "#5a3a2a", eyeColor: "#ffaa00" },
  "Feral Yeti": { bodyColor: "#ddeeff", eyeColor: "#88bbdd" },
  "Atomic Ape": { eyeColor: "#44ff44", bodyColor: "#334433" },
  "Turbo Gibbon": { accessory: "sunglasses", eyeColor: "#00ff88" },
  "Rowdy Baboon": { eyeColor: "#ff4444", accessory: "scar" },
  "Raging Punch": { eyeColor: "#ff0000", accessory: "redeyes" },
  "Treetop Lemur": { bodyColor: "#887766", eyeColor: "#ffcc00" },
  "Howlin Howler": { eyeColor: "#ff6600" },
  "Bonkers Bubbles": { accessory: "bowtie", eyeColor: "#ff88cc" },
  "Chunky Monkey": { bodyColor: "#8B6914" },
  "Mighty Gigantopithecus": { bodyColor: "#2a2a2a" },
  "King Baboon": { hat: "crown" },
  "Queen Mandrill": { hat: "crown", bodyColor: "#886644" },
  "Golden Tamarin": { bodyColor: "#e8a020", eyeColor: "#ffdd44" },
  "Alpha Gorilla": { bodyColor: "#555566", accessory: "scar" },
  "Silverback Gorilla": { bodyColor: "#666677" },
  "Mega Gigantopithecus": { bodyColor: "#1a1a1a", eyeColor: "#ff4444" },
  "Funky Gibbon": { accessory: "sunglasses" },
  "Wild Sasquatch": { bodyColor: "#5a3a2a" },
  "Iron Knuckles": { bodyColor: "#888899" },
  "Hairy Bigfoot": { bodyColor: "#5a4a3a" },
  "Hairy Yeti": { bodyColor: "#ccddee" },
  "Knuckle Punch": { accessory: "scar", eyeColor: "#ff4444" },
};

// Noun-only matches (any adjective + this noun)
const NOUN_COSTUMES: Record<string, GorillaCostume> = {
  "Yeti": { bodyColor: "#ddeeff", eyeColor: "#88bbdd" },
  "Bigfoot": { bodyColor: "#5a3a2a" },
  "Sasquatch": { bodyColor: "#6a4a3a" },
  "Orangutan": { bodyColor: "#cc5500" },
};

// Adjective-only matches (this adjective + any noun)
const ADJ_COSTUMES: Record<string, GorillaCostume> = {
  "Golden": { bodyColor: "#c8a832" },
  "Silverback": { bodyColor: "#666677" },
  "Grape": { bodyColor: "#8844aa" },
};

export function getCostume(name: string): GorillaCostume | null {
  // Check exact match first
  if (EXACT_COSTUMES[name]) return EXACT_COSTUMES[name];

  // Split and check partial matches
  const spaceIdx = name.indexOf(" ");
  if (spaceIdx === -1) return null;

  const adj = name.substring(0, spaceIdx);
  const noun = name.substring(spaceIdx + 1);

  // Noun matches take priority over adjective matches
  if (NOUN_COSTUMES[noun]) return NOUN_COSTUMES[noun];
  if (ADJ_COSTUMES[adj]) return ADJ_COSTUMES[adj];

  return null;
}
