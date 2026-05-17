const ADJECTIVES = [
  "Cosmic", "Thunder", "Mighty", "Shadow", "Iron",
  "Golden", "Raging", "Silent", "Neon", "Turbo",
  "Atomic", "Blazing", "Crystal", "Doom", "Electric",
  "Frozen", "Hyper", "Laser", "Mega", "Phantom",
  "Radical", "Steel", "Ultra", "Venom", "Wild",
];

const NOUNS = [
  "Kong", "Ape", "Gorilla", "Chimp", "Primate",
  "Banana", "Monkey", "Yeti", "Beast", "Titan",
  "Crusher", "Slammer", "Blaster", "Hurler", "Champ",
  "Rocket", "Storm", "Fist", "Fury", "Legend",
  "Warrior", "Striker", "Bomber", "Tosser", "Wizard",
];

export function randomName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj} ${noun}`;
}
