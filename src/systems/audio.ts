/**
 * Procedural Web Audio SFX + multi-voice looping music beds.
 * No external audio files required (retro synth adventure score).
 */

import {
  effectiveMusicVolume,
  effectiveSfxVolume,
  loadSettings,
  type GameSettings,
} from './settings';

export type SfxId =
  | 'ui_click'
  | 'ui_open'
  | 'ui_close'
  | 'attack'
  | 'hit_enemy'
  | 'hit_player'
  | 'pickup'
  | 'coin'
  | 'dialog'
  | 'door'
  | 'stairs'
  | 'death'
  | 'level_up'
  | 'shop'
  | 'heal'
  | 'error'
  | 'success';

export type MusicId = 'title' | 'overworld' | 'dungeon' | 'none';

type AudioCtx = AudioContext;

let ctx: AudioCtx | null = null;
let unlocked = false;
let musicGain: GainNode | null = null;
let sfxGain: GainNode | null = null;
let masterGain: GainNode | null = null;
let musicNodes: AudioNode[] = [];
let musicTimer: number | null = null;
let currentMusic: MusicId = 'none';
let step = 0;
/** Soft low-pass on music bus for less harsh square leads. */
let musicFilter: BiquadFilterNode | null = null;

function ensureCtx(): AudioCtx | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    masterGain = ctx.createGain();
    musicGain = ctx.createGain();
    sfxGain = ctx.createGain();
    musicFilter = ctx.createBiquadFilter();
    musicFilter.type = 'lowpass';
    musicFilter.frequency.value = 2400;
    musicFilter.Q.value = 0.7;
    musicGain.connect(musicFilter);
    musicFilter.connect(masterGain);
    sfxGain.connect(masterGain);
    masterGain.connect(ctx.destination);
    applyVolumes(loadSettings());
  }
  return ctx;
}

/** Call on first user gesture (required by browsers). */
export async function unlockAudio(): Promise<void> {
  const c = ensureCtx();
  if (!c) return;
  if (c.state === 'suspended') {
    try {
      await c.resume();
    } catch {
      /* ignore */
    }
  }
  unlocked = c.state === 'running';
}

export function isAudioUnlocked(): boolean {
  return unlocked;
}

export function applyVolumes(s: GameSettings = loadSettings()): void {
  if (!musicGain || !sfxGain || !masterGain || !ctx) return;
  const now = ctx.currentTime;
  masterGain.gain.cancelScheduledValues(now);
  masterGain.gain.setValueAtTime(s.muted ? 0 : 1, now);
  musicGain.gain.cancelScheduledValues(now);
  musicGain.gain.setValueAtTime(effectiveMusicVolume(s), now);
  sfxGain.gain.cancelScheduledValues(now);
  sfxGain.gain.setValueAtTime(effectiveSfxVolume(s), now);
  if (effectiveMusicVolume(s) <= 0) {
    // keep track but silence
  }
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType,
  gain: number,
  when = 0,
  dest?: GainNode | null,
): void {
  const c = ensureCtx();
  if (!c || !unlocked || !sfxGain) return;
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(dest ?? sfxGain);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

const SFX: Record<SfxId, () => void> = {
  ui_click: () => {
    tone(880, 0.05, 'square', 0.12);
  },
  ui_open: () => {
    tone(440, 0.06, 'triangle', 0.1);
    tone(660, 0.08, 'triangle', 0.08, 0.05);
  },
  ui_close: () => {
    tone(660, 0.05, 'triangle', 0.08);
    tone(330, 0.07, 'triangle', 0.06, 0.04);
  },
  attack: () => {
    tone(220, 0.04, 'sawtooth', 0.15);
    tone(180, 0.08, 'square', 0.1, 0.02);
  },
  hit_enemy: () => {
    tone(150, 0.06, 'square', 0.18);
    tone(90, 0.1, 'sawtooth', 0.1, 0.03);
  },
  hit_player: () => {
    tone(120, 0.12, 'sawtooth', 0.2);
    tone(80, 0.15, 'square', 0.12, 0.04);
  },
  pickup: () => {
    tone(523, 0.06, 'triangle', 0.12);
    tone(784, 0.1, 'triangle', 0.1, 0.05);
  },
  coin: () => {
    tone(988, 0.05, 'square', 0.1);
    tone(1319, 0.08, 'square', 0.08, 0.04);
  },
  dialog: () => {
    tone(400 + Math.random() * 80, 0.04, 'triangle', 0.06);
  },
  door: () => {
    tone(200, 0.08, 'square', 0.12);
    tone(140, 0.12, 'triangle', 0.1, 0.05);
  },
  stairs: () => {
    tone(300, 0.05, 'triangle', 0.1);
    tone(360, 0.05, 'triangle', 0.09, 0.05);
    tone(420, 0.08, 'triangle', 0.08, 0.1);
  },
  death: () => {
    tone(220, 0.15, 'sawtooth', 0.15);
    tone(165, 0.2, 'sawtooth', 0.12, 0.1);
    tone(110, 0.35, 'triangle', 0.1, 0.2);
  },
  level_up: () => {
    tone(523, 0.08, 'square', 0.12);
    tone(659, 0.08, 'square', 0.11, 0.07);
    tone(784, 0.08, 'square', 0.1, 0.14);
    tone(1047, 0.15, 'triangle', 0.12, 0.22);
  },
  shop: () => {
    tone(600, 0.06, 'triangle', 0.1);
    tone(900, 0.08, 'triangle', 0.08, 0.05);
  },
  heal: () => {
    tone(440, 0.08, 'sine', 0.1);
    tone(554, 0.1, 'sine', 0.09, 0.06);
    tone(659, 0.12, 'sine', 0.08, 0.12);
  },
  error: () => {
    tone(180, 0.1, 'square', 0.12);
    tone(140, 0.12, 'square', 0.1, 0.08);
  },
  success: () => {
    tone(523, 0.07, 'triangle', 0.11);
    tone(784, 0.12, 'triangle', 0.1, 0.06);
  },
};

export function playSfx(id: SfxId): void {
  if (effectiveSfxVolume() <= 0) return;
  void unlockAudio().then(() => {
    try {
      SFX[id]?.();
    } catch {
      /* ignore */
    }
  });
}

function stopMusicInternal(): void {
  if (musicTimer != null) {
    window.clearInterval(musicTimer);
    musicTimer = null;
  }
  for (const n of musicNodes) {
    try {
      n.disconnect();
    } catch {
      /* ignore */
    }
  }
  musicNodes = [];
  step = 0;
}

/** Note helpers (Hz) — equal temperament, A4 = 440. */
const N = {
  C2: 65.41,
  D2: 73.42,
  E2: 82.41,
  F2: 87.31,
  G2: 98.0,
  A2: 110.0,
  B2: 123.47,
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  F3: 174.61,
  Fs3: 185.0,
  G3: 196.0,
  A3: 220.0,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  Fs4: 369.99,
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  Fs5: 739.99,
  G5: 783.99,
  A5: 880.0,
  B5: 987.77,
} as const;

/** 0 = rest. */
type Note = number;

interface MusicVoice {
  /** Pitch sequence (Hz); 0 = rest. */
  seq: readonly Note[];
  type: OscillatorType;
  /** Peak gain per note. */
  gain: number;
  /** Play this voice every Nth step (1 = every beat). */
  every: number;
  /** Note length as fraction of beat (0.5 = staccato, 1.4 = legato overlap). */
  sustain: number;
  /** Optional detune cents for chorus thickness. */
  detune?: number;
}

interface MusicBed {
  beatMs: number;
  /** Low-pass cutoff for this bed. */
  filterHz: number;
  voices: readonly MusicVoice[];
}

/**
 * Multi-voice beds — adventurer overworld is the star:
 * walking bass + heroic lead + soft harmony (Zelda/SNES-ish energy, still pure synth).
 */
const MUSIC_BEDS: Record<Exclude<MusicId, 'none'>, MusicBed> = {
  // Title — bright invitation, short loop
  title: {
    beatMs: 200,
    filterHz: 2800,
    voices: [
      {
        // Rising call
        seq: [
          N.G3, N.B3, N.D4, N.G4, N.D4, N.B3, N.G3, 0, N.A3, N.C4, N.E4, N.A4,
          N.E4, N.C4, N.A3, 0,
        ],
        type: 'triangle',
        gain: 0.07,
        every: 1,
        sustain: 0.85,
      },
      {
        seq: [
          N.G2, N.G2, N.G2, N.G2, N.C3, N.C3, N.D3, N.D3, N.G2, N.G2, N.G2, N.G2,
          N.A2, N.A2, N.D3, N.D3,
        ],
        type: 'triangle',
        gain: 0.05,
        every: 1,
        sustain: 1.1,
      },
      {
        seq: [N.D5, 0, 0, N.B4, 0, 0, N.G4, 0, N.E5, 0, 0, N.C5, 0, 0, N.A4, 0],
        type: 'sine',
        gain: 0.035,
        every: 1,
        sustain: 0.6,
      },
    ],
  },

  // Overworld / beach / meadow / guild — adventurous crawler theme
  overworld: {
    beatMs: 210,
    filterHz: 2600,
    voices: [
      {
        // Heroic lead — 32-step phrase in D major
        seq: [
          N.A4, N.Fs4, N.D4, N.Fs4, N.G4, N.A4, N.B4, N.A4, N.Fs4, N.D4, N.E4,
          N.Fs4, N.G4, N.E4, N.A4, 0, N.B4, N.A4, N.G4, N.Fs4, N.E4, N.D4, N.E4,
          N.Fs4, N.G4, N.A4, N.B4, N.A4, N.Fs4, N.D5, N.A4, 0,
        ],
        type: 'triangle',
        gain: 0.075,
        every: 1,
        sustain: 0.9,
        detune: 4,
      },
      {
        // Soft fifth harmony (every other note feel)
        seq: [
          N.D4, 0, N.A3, 0, N.B3, 0, N.D4, 0, N.A3, 0, N.B3, 0, N.C4, 0, N.D4, 0,
          N.E4, 0, N.D4, 0, N.C4, 0, N.B3, 0, N.A3, 0, N.G3, 0, N.A3, 0, N.D4, 0,
        ],
        type: 'sine',
        gain: 0.04,
        every: 1,
        sustain: 1.05,
      },
      {
        // Walking bass — sturdy adventurer boots
        seq: [
          N.D2, N.D2, N.D3, N.D2, N.G2, N.G2, N.G3, N.G2, N.A2, N.A2, N.A3, N.A2,
          N.D2, N.D3, N.A2, N.D2, N.G2, N.G2, N.G3, N.G2, N.E2, N.E2, N.E3, N.E2,
          N.A2, N.A2, N.A3, N.A2, N.D2, N.A2, N.D3, N.D2,
        ],
        type: 'triangle',
        gain: 0.065,
        every: 1,
        sustain: 1.15,
      },
      {
        // Light high sparkle (adventure “shine”)
        seq: [
          0, 0, N.A5, 0, 0, 0, N.Fs5, 0, 0, 0, N.D5, 0, 0, 0, N.A5, 0, 0, 0,
          N.B5, 0, 0, 0, N.A5, 0, 0, 0, N.Fs5, 0, 0, N.D5, 0, 0,
        ],
        type: 'sine',
        gain: 0.028,
        every: 1,
        sustain: 0.45,
      },
    ],
  },

  // Dungeon — darker, minor, slower pulse
  dungeon: {
    beatMs: 260,
    filterHz: 1800,
    voices: [
      {
        seq: [
          N.D3, N.F3, N.A3, N.D4, N.A3, N.F3, N.E3, N.G3, N.C3, N.E3, N.G3, N.C4,
          N.G3, N.E3, N.D3, 0, N.F3, N.A3, N.C4, N.A3, N.F3, N.D3, N.E3, N.F3,
          N.G3, N.A3, N.G3, N.F3, N.E3, N.D3, N.C3, 0,
        ],
        type: 'triangle',
        gain: 0.06,
        every: 1,
        sustain: 1.0,
      },
      {
        seq: [
          N.D2, N.D2, N.D2, N.D2, N.C2, N.C2, N.C2, N.C2, N.A2, N.A2, N.A2, N.A2,
          N.D2, N.D2, N.A2, N.D2, N.F2, N.F2, N.F2, N.F2, N.E2, N.E2, N.E2, N.E2,
          N.G2, N.G2, N.G2, N.G2, N.D2, N.D2, N.D2, N.D2,
        ],
        type: 'sawtooth',
        gain: 0.035,
        every: 1,
        sustain: 1.2,
      },
      {
        seq: [
          0, 0, N.A4, 0, 0, 0, N.F4, 0, 0, 0, N.G4, 0, 0, 0, N.E4, 0, 0, 0, N.F4,
          0, 0, 0, N.D4, 0, 0, 0, N.E4, 0, 0, N.D4, 0, 0,
        ],
        type: 'sine',
        gain: 0.03,
        every: 1,
        sustain: 0.7,
      },
    ],
  },
};

function playMusicNote(
  c: AudioCtx,
  dest: GainNode,
  freq: number,
  type: OscillatorType,
  peak: number,
  durSec: number,
  detune = 0,
): void {
  if (freq <= 0 || peak <= 0) return;
  const t0 = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (detune) osc.detune.setValueAtTime(detune, t0);
  const attack = Math.min(0.03, durSec * 0.15);
  const release = Math.min(0.08, durSec * 0.35);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), t0 + attack);
  g.gain.exponentialRampToValueAtTime(
    Math.max(0.0001, peak * 0.55),
    t0 + Math.max(attack, durSec - release),
  );
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + durSec);
  osc.connect(g);
  g.connect(dest);
  musicNodes.push(osc, g);
  osc.start(t0);
  osc.stop(t0 + durSec + 0.02);
  // Optional slight chorus double for lead richness
  if (detune) {
    const osc2 = c.createOscillator();
    const g2 = c.createGain();
    osc2.type = type;
    osc2.frequency.setValueAtTime(freq, t0);
    osc2.detune.setValueAtTime(-detune, t0);
    g2.gain.setValueAtTime(0.0001, t0);
    g2.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, peak * 0.45),
      t0 + attack,
    );
    g2.gain.exponentialRampToValueAtTime(0.0001, t0 + durSec);
    osc2.connect(g2);
    g2.connect(dest);
    musicNodes.push(osc2, g2);
    osc2.start(t0);
    osc2.stop(t0 + durSec + 0.02);
  }
}

export function playMusic(id: MusicId): void {
  if (id === currentMusic && musicTimer != null) {
    applyVolumes();
    return;
  }
  stopMusicInternal();
  currentMusic = id;
  if (id === 'none' || effectiveMusicVolume() <= 0) return;

  void unlockAudio().then(() => {
    const c = ensureCtx();
    if (!c || !musicGain || !unlocked) return;
    if (currentMusic !== id) return;

    const bed = MUSIC_BEDS[id];
    if (musicFilter) {
      musicFilter.frequency.setValueAtTime(bed.filterHz, c.currentTime);
    }

    const tick = () => {
      if (effectiveMusicVolume() <= 0 || currentMusic === 'none') return;
      const c2 = ensureCtx();
      if (!c2 || !musicGain) return;
      const i = step;
      step += 1;
      const beatSec = bed.beatMs / 1000;

      for (const voice of bed.voices) {
        if (i % voice.every !== 0) continue;
        const f = voice.seq[i % voice.seq.length] ?? 0;
        if (!f) continue;
        playMusicNote(
          c2,
          musicGain,
          f,
          voice.type,
          voice.gain,
          beatSec * voice.sustain,
          voice.detune ?? 0,
        );
      }

      // Prune disconnected node refs (oscillators finish on their own)
      if (musicNodes.length > 120) {
        musicNodes.splice(0, 60);
      }
    };

    tick();
    musicTimer = window.setInterval(tick, bed.beatMs);
  });
}

export function stopMusic(): void {
  currentMusic = 'none';
  stopMusicInternal();
}

export function getCurrentMusic(): MusicId {
  return currentMusic;
}

/** Re-apply after settings change; restarts music bed if needed. */
export function onSettingsChanged(s: GameSettings = loadSettings()): void {
  applyVolumes(s);
  if (effectiveMusicVolume(s) <= 0) {
    stopMusicInternal();
    // keep currentMusic id so we can resume
  } else if (currentMusic !== 'none' && musicTimer == null) {
    const id = currentMusic;
    currentMusic = 'none';
    playMusic(id);
  }
}

/** Wire global unlock on first interaction. */
export function installAudioUnlock(): void {
  const once = () => {
    void unlockAudio();
    window.removeEventListener('pointerdown', once);
    window.removeEventListener('keydown', once);
  };
  window.addEventListener('pointerdown', once, { passive: true });
  window.addEventListener('keydown', once);
}
