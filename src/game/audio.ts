export type SfxKind = "click" | "exec" | "error" | "burnout" | "laser" | "glitchHit";

let ctx: AudioContext | null = null;
let sfxMutedState = false;
let musicMutedState = false;
let bgmRunning = false;
let bgmTimer: number | null = null;
let bgmMasterGain: GainNode | null = null;
let chordStep = 0;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    try {
      ctx = new AudioCtx();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

export function playSfx(kind: SfxKind): void {
  if (sfxMutedState) return;
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;

  try {
    switch (kind) {
      case "click": {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(920, now);
        osc.frequency.exponentialRampToValueAtTime(480, now + 0.035);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start(now);
        osc.stop(now + 0.04);
        break;
      }

      case "exec": {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.045); // E5
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start(now);
        osc.stop(now + 0.12);
        break;
      }

      case "error": {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(165, now);
        osc.frequency.linearRampToValueAtTime(115, now + 0.18);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      }

      case "burnout": {
        // Electrical spark (filtered noise burst) + descending synth tone
        const bufSize = Math.floor(ac.sampleRate * 0.22);
        const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ac.sampleRate * 0.06));
        }
        const noise = ac.createBufferSource();
        noise.buffer = buf;
        const filter = ac.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(1800, now);
        const nGain = ac.createGain();
        nGain.gain.setValueAtTime(0.11, now);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        noise.connect(filter);
        filter.connect(nGain);
        nGain.connect(ac.destination);
        noise.start(now);

        // Descending tone
        const osc = ac.createOscillator();
        const oGain = ac.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(85, now + 0.34);
        oGain.gain.setValueAtTime(0.08, now);
        oGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(oGain);
        oGain.connect(ac.destination);
        osc.start(now);
        osc.stop(now + 0.36);
        break;
      }

      case "laser": {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(1180, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.16);
        gain.gain.setValueAtTime(0.075, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start(now);
        osc.stop(now + 0.18);
        break;
      }

      case "glitchHit": {
        // Digital static crunch + low thump
        const bufSize = Math.floor(ac.sampleRate * 0.18);
        const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) {
          data[i] = (Math.random() > 0.5 ? 1 : -1) * (1 - i / bufSize);
        }
        const noise = ac.createBufferSource();
        noise.buffer = buf;
        const filter = ac.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(950, now);
        const gain = ac.createGain();
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ac.destination);
        noise.start(now);
        break;
      }
    }
  } catch {
    /* ignore audio errors */
  }
}

const AMBIENT_CHORDS: number[][] = [
  [130.81, 196.0, 246.94, 293.66], // Cmaj9-ish
  [110.0, 164.81, 220.0, 261.63],  // Am7
  [146.83, 220.0, 261.63, 329.63], // Dm9
  [98.0, 146.83, 196.0, 246.94],   // G6
];

function scheduleBgmPad(): void {
  if (!bgmRunning || musicMutedState) return;
  const ac = getCtx();
  if (!ac) return;
  try {
    if (!bgmMasterGain) {
      bgmMasterGain = ac.createGain();
      bgmMasterGain.gain.setValueAtTime(0.025, ac.currentTime);
      bgmMasterGain.connect(ac.destination);
    }
    const chord = AMBIENT_CHORDS[chordStep % AMBIENT_CHORDS.length];
    chordStep++;
    const now = ac.currentTime;
    const dur = 3.8;

    for (const freq of chord) {
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.22, now + 1.1);
      g.gain.linearRampToValueAtTime(0.0001, now + dur);
      osc.connect(g);
      g.connect(bgmMasterGain);
      osc.start(now);
      osc.stop(now + dur + 0.05);
    }
  } catch {
    /* ignore */
  }
}

export function startBgm(): void {
  bgmRunning = true;
  if (musicMutedState) return;
  if (bgmTimer != null) return;
  scheduleBgmPad();
  if (typeof window !== "undefined") {
    bgmTimer = window.setInterval(() => {
      if (!bgmRunning || musicMutedState) return;
      scheduleBgmPad();
    }, 3600);
  }
}

export function stopBgm(): void {
  bgmRunning = false;
  if (bgmTimer != null && typeof window !== "undefined") {
    window.clearInterval(bgmTimer);
    bgmTimer = null;
  }
}

export function syncAudioSettings(sfxMuted: boolean, musicMuted: boolean): void {
  sfxMutedState = sfxMuted;
  musicMutedState = musicMuted;
  if (musicMutedState) {
    if (bgmTimer != null && typeof window !== "undefined") {
      window.clearInterval(bgmTimer);
      bgmTimer = null;
    }
    if (bgmMasterGain && ctx) {
      try {
        bgmMasterGain.gain.setValueAtTime(0.0001, ctx.currentTime);
      } catch {
        /* ignore */
      }
    }
  } else {
    if (bgmMasterGain && ctx) {
      try {
        bgmMasterGain.gain.setValueAtTime(0.025, ctx.currentTime);
      } catch {
        /* ignore */
      }
    }
    if (bgmRunning && bgmTimer == null) {
      startBgm();
    }
  }
}
