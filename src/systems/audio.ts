/**
 * Procedural Web Audio SFX + simple looping music beds.
 * No external audio files required (retro synth).
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
    musicGain.connect(masterGain);
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

/** Simple arpeggio beds — different roots per zone. */
const MUSIC_SEQ: Record<Exclude<MusicId, 'none'>, number[]> = {
  title: [262, 330, 392, 523, 392, 330],
  overworld: [294, 370, 440, 587, 440, 370, 330, 392],
  dungeon: [196, 233, 262, 311, 262, 233, 220, 196],
};

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

    const seq = MUSIC_SEQ[id];
    const beatMs = id === 'dungeon' ? 280 : id === 'title' ? 220 : 240;

    const tick = () => {
      if (effectiveMusicVolume() <= 0 || currentMusic === 'none') return;
      const c2 = ensureCtx();
      if (!c2 || !musicGain) return;
      const f = seq[step % seq.length]!;
      step += 1;
      const t0 = c2.currentTime;
      const osc = c2.createOscillator();
      const g = c2.createGain();
      osc.type = id === 'dungeon' ? 'triangle' : 'square';
      osc.frequency.setValueAtTime(f, t0);
      // soft pulse
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.08, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + beatMs / 1000 - 0.02);
      osc.connect(g);
      g.connect(musicGain);
      musicNodes.push(osc, g);
      osc.start(t0);
      osc.stop(t0 + beatMs / 1000);
      // prune old nodes
      if (musicNodes.length > 40) {
        musicNodes.splice(0, 20);
      }
    };

    tick();
    musicTimer = window.setInterval(tick, beatMs);
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
