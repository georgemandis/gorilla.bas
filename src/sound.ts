let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export type SoundName = "throw" | "explosion" | "victory" | "hit" | "aim_tick" | "power_lock" | "taunt_dance" | "taunt_bubble" | "bananality_omen" | "bananality_impact" | "bananality_reveal" | "crate_collect" | "crate_land" | "powerup_select" | "cluster_split" | "confetti_pop" | "teleport_zap" | "poison_hit" | "portal_whoosh" | "portal_place";

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
      case "crate_land": playCrateLand(); break;
      case "powerup_select": playPowerupSelect(); break;
      case "cluster_split": playClusterSplit(); break;
      case "confetti_pop": playConfettiPop(); break;
      case "teleport_zap": playTeleportZap(); break;
      case "poison_hit": playPoisonHit(); break;
      case "portal_whoosh": playPortalWhoosh(); break;
      case "portal_place": playPortalPlace(); break;
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
  [600, 800, 1000, 1200].forEach((freq, i) => {
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
