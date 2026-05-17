let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export type SoundName = "throw" | "explosion" | "victory" | "hit" | "aim_tick" | "power_lock" | "taunt_dance" | "taunt_bubble";

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
