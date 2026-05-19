let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export type SoundName = "throw" | "explosion" | "victory" | "hit" | "aim_tick" | "power_lock" | "taunt_dance" | "taunt_bubble" | "bananality_omen" | "bananality_impact" | "bananality_reveal" | "crate_collect" | "crate_destroy" | "crate_land" | "powerup_select" | "cluster_split" | "confetti_pop" | "teleport_zap" | "poison_hit" | "portal_whoosh" | "portal_place" | "ice_hit" | "mirror_hit" | "gravity_hit" | "shield_deploy" | "shield_break" | "rubber_bounce" | "homing_lock" | "ghost_whoosh" | "giant_thud" | "boomerang_return" | "drunk_wobble" | "earthquake_rumble" | "demolition" | "construction" | "jump_launch" | "jump_land" | "fire_ignite" | "fire_damage" | "lava_activate" | "lava_death" | "thunder" | "fizzle" | "award_reveal_1" | "award_reveal_2" | "award_bonus";

export function playSound(name: SoundName): void {
  try {
    switch (name) {
      case "throw": playThrow(); break;
      case "explosion": playExplosion(); break;
      case "victory": playVictory(); break;
      case "hit": playHit(); break;
      case "aim_tick": playAimTick(); break;
      case "power_lock": playPowerLock(); break;
      case "taunt_dance": playTauntDance(); break;
      case "taunt_bubble": playTauntBubble(); break;
      case "bananality_omen": playBanalityOmen(); break;
      case "bananality_impact": playBanalityImpact(); break;
      case "bananality_reveal": playBanalityReveal(); break;
      case "crate_collect": playCrateCollect(); break;
      case "crate_destroy": playCrateDestroy(); break;
      case "crate_land": playCrateLand(); break;
      case "powerup_select": playPowerupSelect(); break;
      case "cluster_split": playClusterSplit(); break;
      case "confetti_pop": playConfettiPop(); break;
      case "teleport_zap": playTeleportZap(); break;
      case "poison_hit": playPoisonHit(); break;
      case "portal_whoosh": playPortalWhoosh(); break;
      case "portal_place": playPortalPlace(); break;
      case "ice_hit": playIceHit(); break;
      case "mirror_hit": playMirrorHit(); break;
      case "gravity_hit": playGravityHit(); break;
      case "shield_deploy": playShieldDeploy(); break;
      case "shield_break": playShieldBreak(); break;
      case "rubber_bounce": playRubberBounce(); break;
      case "homing_lock": playHomingLock(); break;
      case "ghost_whoosh": playGhostWhoosh(); break;
      case "giant_thud": playGiantThud(); break;
      case "boomerang_return": playBoomerangReturn(); break;
      case "drunk_wobble": playDrunkWobble(); break;
      case "earthquake_rumble": playEarthquakeRumble(); break;
      case "demolition": playDemolition(); break;
      case "construction": playConstruction(); break;
      case "jump_launch": playJumpLaunch(); break;
      case "jump_land": playJumpLand(); break;
      case "fire_ignite": playFireIgnite(); break;
      case "fire_damage": playFireDamage(); break;
      case "lava_activate": playLavaActivate(); break;
      case "lava_death": playLavaDeath(); break;
      case "thunder": playThunder(); break;
      case "fizzle": playFizzle(); break;
      case "award_reveal_1": playAwardReveal1(); break;
      case "award_reveal_2": playAwardReveal2(); break;
      case "award_bonus": playAwardBonus(); break;
    }
  } catch {
    // Audio not available — fail silently
  }
}

// --- Power meter hum (continuous, pitch follows power level) ---

let powerOsc: OscillatorNode | null = null;
let powerGain: GainNode | null = null;

export function startPowerHum(): void {
  try {
    stopPowerHum();
    const c = getCtx();
    powerOsc = c.createOscillator();
    powerGain = c.createGain();
    powerOsc.type = "sawtooth";
    powerOsc.frequency.setValueAtTime(80, c.currentTime);
    powerGain.gain.setValueAtTime(0.07, c.currentTime);
    powerOsc.connect(powerGain).connect(c.destination);
    powerOsc.start();
  } catch {
    // Audio not available
  }
}

export function updatePowerHum(powerValue: number): void {
  if (!powerOsc || !powerGain) return;
  // Pitch rises from 80Hz to 400Hz with power, volume pulses slightly
  const freq = 80 + powerValue * 320;
  const vol = 0.05 + powerValue * 0.08;
  powerOsc.frequency.setTargetAtTime(freq, getCtx().currentTime, 0.02);
  powerGain.gain.setTargetAtTime(vol, getCtx().currentTime, 0.02);
}

export function stopPowerHum(): void {
  try {
    if (powerOsc) {
      powerOsc.stop();
      powerOsc.disconnect();
      powerOsc = null;
    }
    if (powerGain) {
      powerGain.disconnect();
      powerGain = null;
    }
  } catch {
    // Already stopped
  }
}

function playThrow() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(300, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800, c.currentTime + 0.15);
  gain.gain.setValueAtTime(0.15, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.2);
}

function playExplosion() {
  const c = getCtx();
  const bufferSize = c.sampleRate * 0.4;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const noise = c.createBufferSource();
  noise.buffer = buffer;

  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1000, c.currentTime);
  filter.frequency.exponentialRampToValueAtTime(100, c.currentTime + 0.3);

  const gain = c.createGain();
  gain.gain.setValueAtTime(0.3, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4);

  noise.connect(filter).connect(gain).connect(c.destination);
  noise.start();
  noise.stop(c.currentTime + 0.4);
}

function playHit() {
  const c = getCtx();
  // Low thud + noise burst
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(150, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(40, c.currentTime + 0.3);
  gain.gain.setValueAtTime(0.25, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.3);

  playExplosion();
}

function playVictory() {
  const c = getCtx();
  const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "square";
    const t = c.currentTime + i * 0.15;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.12, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  });
}

function playAimTick() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(1200, c.currentTime);
  gain.gain.setValueAtTime(0.06, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.03);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.03);
}

function playPowerLock() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(600, c.currentTime);
  osc.frequency.linearRampToValueAtTime(400, c.currentTime + 0.1);
  gain.gain.setValueAtTime(0.15, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.15);
}

function playTauntDance() {
  const c = getCtx();
  const patterns: number[][] = [
    [260, 330, 390],       // ascending bongo
    [400, 350, 300],       // descending slide
    [330, 440, 330, 440],  // bouncy back-and-forth
    [520, 400, 520],       // high-low-high chirp
    [200, 250, 300, 400],  // climbing run
  ];
  const waves: OscillatorType[] = ["triangle", "square", "sine"];
  const notes = patterns[Math.floor(Math.random() * patterns.length)];
  const wave = waves[Math.floor(Math.random() * waves.length)];
  const tempo = 0.06 + Math.random() * 0.06; // vary speed

  notes.forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = wave;
    const t = c.currentTime + i * tempo;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  });
}

function playTauntBubble() {
  const c = getCtx();
  const variant = Math.floor(Math.random() * 4);

  switch (variant) {
    case 0: {
      // "boop boop" — descending
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, c.currentTime);
      osc.frequency.setValueAtTime(600, c.currentTime + 0.08);
      gain.gain.setValueAtTime(0.1, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
      osc.connect(gain).connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + 0.15);
      break;
    }
    case 1: {
      // "doot doot doot" — quick ascending triplet
      [600, 750, 900].forEach((freq, i) => {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = "sine";
        const t = c.currentTime + i * 0.06;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc.connect(gain).connect(c.destination);
        osc.start(t);
        osc.stop(t + 0.08);
      });
      break;
    }
    case 2: {
      // "wah wah" — slide down
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(700, c.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, c.currentTime + 0.2);
      gain.gain.setValueAtTime(0.1, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.25);
      osc.connect(gain).connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + 0.25);
      break;
    }
    case 3: {
      // "blip!" — short high pop
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(1000, c.currentTime);
      osc.frequency.setValueAtTime(700, c.currentTime + 0.03);
      gain.gain.setValueAtTime(0.08, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.08);
      osc.connect(gain).connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + 0.08);
      break;
    }
  }
}

// --- Bananality sounds ---

function playBanalityOmen() {
  // Ominous low drone that builds
  const c = getCtx();
  const osc1 = c.createOscillator();
  const osc2 = c.createOscillator();
  const gain = c.createGain();
  osc1.type = "sawtooth";
  osc2.type = "sawtooth";
  osc1.frequency.setValueAtTime(55, c.currentTime);
  osc1.frequency.linearRampToValueAtTime(80, c.currentTime + 2);
  osc2.frequency.setValueAtTime(57, c.currentTime); // slight detune for thickness
  osc2.frequency.linearRampToValueAtTime(82, c.currentTime + 2);
  gain.gain.setValueAtTime(0, c.currentTime);
  gain.gain.linearRampToValueAtTime(0.15, c.currentTime + 1);
  gain.gain.linearRampToValueAtTime(0.2, c.currentTime + 1.8);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 2.2);
  osc1.connect(gain).connect(c.destination);
  osc2.connect(gain);
  osc1.start();
  osc2.start();
  osc1.stop(c.currentTime + 2.2);
  osc2.stop(c.currentTime + 2.2);
}

function playBanalityImpact() {
  // Thuddy banana impact
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(120, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(30, c.currentTime + 0.15);
  gain.gain.setValueAtTime(0.2, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.15);
}

function playBanalityReveal() {
  // Dramatic sting for the BANANALITY text
  const c = getCtx();
  const notes = [220, 220, 330, 440, 440, 550, 660];
  notes.forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "square";
    const t = c.currentTime + i * 0.12;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  });
}

function playCrateCollect() {
  const c = getCtx();
  const variants: number[][] = [
    [600, 800, 1000, 1200],
    [500, 700, 900, 1100],
    [700, 900, 1100, 1400],
  ];
  const notes = variants[Math.floor(Math.random() * variants.length)];
  notes.forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    const t = c.currentTime + i * 0.08;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.12);
  });
}

function playCrateDestroy() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(300, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, c.currentTime + 0.2);
  gain.gain.setValueAtTime(0.15, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.25);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.25);
}

function playCrateLand() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(200, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, c.currentTime + 0.15);
  gain.gain.setValueAtTime(0.15, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.15);
}

function playClusterSplit() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(400, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1200, c.currentTime + 0.1);
  gain.gain.setValueAtTime(0.15, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.15);
}

function playConfettiPop() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(300, c.currentTime);
  osc.frequency.linearRampToValueAtTime(600, c.currentTime + 0.1);
  osc.frequency.linearRampToValueAtTime(200, c.currentTime + 0.3);
  gain.gain.setValueAtTime(0.12, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.35);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.35);
}

function playTeleportZap() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(200, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(2000, c.currentTime + 0.15);
  osc.frequency.exponentialRampToValueAtTime(100, c.currentTime + 0.3);
  gain.gain.setValueAtTime(0.15, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.3);
}

function playPowerupSelect() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(500, c.currentTime);
  osc.frequency.setValueAtTime(700, c.currentTime + 0.05);
  gain.gain.setValueAtTime(0.1, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.1);
}

function playPoisonHit() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(150, c.currentTime);
  osc.frequency.linearRampToValueAtTime(100, c.currentTime + 0.3);
  gain.gain.setValueAtTime(0.15, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.4);

  // Bubbles
  [200, 250, 180, 220].forEach((freq, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    const t = c.currentTime + 0.05 + i * 0.08;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + 0.06);
  });
}

function playPortalPlace() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(300, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800, c.currentTime + 0.2);
  gain.gain.setValueAtTime(0.12, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.25);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.25);
}

function playPortalWhoosh() {
  const c = getCtx();
  const bufferSize = c.sampleRate * 0.2;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize) * 0.5;
  }
  const noise = c.createBufferSource();
  noise.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(1000, c.currentTime);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.15, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);
  noise.connect(filter).connect(gain).connect(c.destination);
  noise.start();
  noise.stop(c.currentTime + 0.2);
}

function playIceHit() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(1200, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(400, c.currentTime + 0.3);
  gain.gain.setValueAtTime(0.12, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.3);
}

function playMirrorHit() {
  const c = getCtx();
  [800, 600, 800].forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "triangle";
    const t = c.currentTime + i * 0.08;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  });
}

function playGravityHit() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(400, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, c.currentTime + 0.4);
  gain.gain.setValueAtTime(0.12, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.4);
}

function playShieldDeploy() {
  const c = getCtx();
  [400, 600, 800, 1000].forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    const t = c.currentTime + i * 0.06;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  });
}

function playShieldBreak() {
  const c = getCtx();
  const bufferSize = c.sampleRate * 0.3;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize) * 0.6;
  }
  const noise = c.createBufferSource();
  noise.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(2000, c.currentTime);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.2, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
  noise.connect(filter).connect(gain).connect(c.destination);
  noise.start();
  noise.stop(c.currentTime + 0.3);
}

function playRubberBounce() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(200 + Math.random() * 400, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, c.currentTime + 0.1);
  gain.gain.setValueAtTime(0.15, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.1);
}

function playHomingLock() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(600, c.currentTime);
  osc.frequency.setValueAtTime(800, c.currentTime + 0.05);
  osc.frequency.setValueAtTime(600, c.currentTime + 0.1);
  gain.gain.setValueAtTime(0.08, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.15);
}

function playGhostWhoosh() {
  const c = getCtx();
  const bufferSize = c.sampleRate * 0.3;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI) * 0.3;
  }
  const noise = c.createBufferSource();
  noise.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(800, c.currentTime);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.1, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
  noise.connect(filter).connect(gain).connect(c.destination);
  noise.start();
  noise.stop(c.currentTime + 0.3);
}

function playGiantThud() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(60, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(30, c.currentTime + 0.3);
  gain.gain.setValueAtTime(0.25, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.35);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.35);
}

function playBoomerangReturn() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(300, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(600, c.currentTime + 0.15);
  osc.frequency.exponentialRampToValueAtTime(300, c.currentTime + 0.3);
  gain.gain.setValueAtTime(0.12, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.3);
}

function playDrunkWobble() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(300 + Math.random() * 200, c.currentTime);
  osc.frequency.linearRampToValueAtTime(200 + Math.random() * 200, c.currentTime + 0.1);
  gain.gain.setValueAtTime(0.06, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.1);
}

function playEarthquakeRumble() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(40, c.currentTime);
  osc.frequency.linearRampToValueAtTime(60, c.currentTime + 0.3);
  osc.frequency.linearRampToValueAtTime(30, c.currentTime + 0.5);
  gain.gain.setValueAtTime(0.2, c.currentTime);
  gain.gain.linearRampToValueAtTime(0.25, c.currentTime + 0.2);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.5);
  // Cracking noise overlay
  const bufferSize = c.sampleRate * 0.3;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize) * 0.4;
  }
  const noise = c.createBufferSource();
  noise.buffer = buffer;
  const g2 = c.createGain();
  g2.gain.setValueAtTime(0.15, c.currentTime + 0.1);
  g2.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4);
  noise.connect(g2).connect(c.destination);
  noise.start(c.currentTime + 0.1);
  noise.stop(c.currentTime + 0.4);
}

function playDemolition() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(80, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(25, c.currentTime + 0.5);
  gain.gain.setValueAtTime(0.3, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.5);
  const bufferSize = c.sampleRate * 0.4;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize) * 0.5;
  }
  const noise = c.createBufferSource();
  noise.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(500, c.currentTime);
  const g2 = c.createGain();
  g2.gain.setValueAtTime(0.2, c.currentTime + 0.1);
  g2.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5);
  noise.connect(filter).connect(g2).connect(c.destination);
  noise.start(c.currentTime + 0.05);
  noise.stop(c.currentTime + 0.5);
}

function playConstruction() {
  const c = getCtx();
  // Rising build sound — ascending tones
  [300, 400, 500, 650].forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "triangle";
    const t = c.currentTime + i * 0.08;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.12);
  });
}

function playJumpLaunch() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(200, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800, c.currentTime + 0.15);
  gain.gain.setValueAtTime(0.15, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.2);
}

function playJumpLand() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(150, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(60, c.currentTime + 0.15);
  gain.gain.setValueAtTime(0.2, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.15);
}

function playFireIgnite() {
  const c = getCtx();
  const bufferSize = c.sampleRate * 0.4;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() > 0.7 ? (Math.random() * 2 - 1) : 0) * (1 - i / bufferSize) * 0.5;
  }
  const noise = c.createBufferSource();
  noise.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(1000, c.currentTime);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.2, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4);
  noise.connect(filter).connect(gain).connect(c.destination);
  noise.start();
  noise.stop(c.currentTime + 0.4);
}

function playFireDamage() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(400, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, c.currentTime + 0.25);
  gain.gain.setValueAtTime(0.15, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.3);
}

function playLavaActivate() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(50, c.currentTime);
  osc.frequency.linearRampToValueAtTime(80, c.currentTime + 0.3);
  osc.frequency.linearRampToValueAtTime(40, c.currentTime + 0.6);
  gain.gain.setValueAtTime(0.2, c.currentTime);
  gain.gain.linearRampToValueAtTime(0.25, c.currentTime + 0.3);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.7);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.7);
  [180, 220, 160, 200, 140].forEach((freq, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    const t = c.currentTime + 0.1 + i * 0.1;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + 0.08);
  });
}

function playLavaDeath() {
  const c = getCtx();
  const bufferSize = c.sampleRate * 0.5;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize) * 0.6;
  }
  const noise = c.createBufferSource();
  noise.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(2000, c.currentTime);
  filter.frequency.exponentialRampToValueAtTime(500, c.currentTime + 0.5);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.25, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5);
  noise.connect(filter).connect(gain).connect(c.destination);
  noise.start();
  noise.stop(c.currentTime + 0.5);
}

function playThunder() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(100, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(30, c.currentTime + 0.4);
  gain.gain.setValueAtTime(0.3, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.5);
  const bufferSize = c.sampleRate * 0.15;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const noise = c.createBufferSource();
  noise.buffer = buffer;
  const g2 = c.createGain();
  g2.gain.setValueAtTime(0.2, c.currentTime);
  g2.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
  noise.connect(g2).connect(c.destination);
  noise.start();
  noise.stop(c.currentTime + 0.15);
}

function playFizzle() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(120, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(50, c.currentTime + 0.15);
  gain.gain.setValueAtTime(0.15, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.2);
}

function playAwardReveal1() {
  // Short ascending chime
  const c = getCtx();
  [523, 659, 784].forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    const t = c.currentTime + i * 0.1;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  });
}

function playAwardReveal2() {
  // Short descending chime
  const c = getCtx();
  [784, 659, 523].forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    const t = c.currentTime + i * 0.1;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  });
}

function playAwardBonus() {
  // Sparkle chime for name bonus
  const c = getCtx();
  [1047, 1319, 1568, 2093].forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "triangle";
    const t = c.currentTime + i * 0.08;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  });
}
