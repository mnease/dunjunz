/**
 * Persistent game settings (localStorage).
 */

export const SETTINGS_KEY = 'dunjunz-settings-v1';

export interface GameSettings {
  /** Master mute — silences everything. */
  muted: boolean;
  musicEnabled: boolean;
  sfxEnabled: boolean;
  /** 0–1 */
  musicVolume: number;
  /** 0–1 */
  sfxVolume: number;
  /** Reduce screen shake / flash if desired later */
  reduceMotion: boolean;
  /**
   * When true, level-up stat packages auto-apply (+2 lowest / +1 2nd-lowest;
   * every 5th level uses class focus). When false, spend manually in inventory (1–5).
   */
  autoStatAllocate: boolean;
}

const DEFAULTS: GameSettings = {
  muted: false,
  musicEnabled: true,
  sfxEnabled: true,
  musicVolume: 0.35,
  sfxVolume: 0.55,
  reduceMotion: false,
  autoStatAllocate: false,
};

let cached: GameSettings | null = null;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export function defaultSettings(): GameSettings {
  return { ...DEFAULTS };
}

export function loadSettings(): GameSettings {
  if (cached) return { ...cached };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      cached = defaultSettings();
      return { ...cached };
    }
    const p = JSON.parse(raw) as Partial<GameSettings>;
    cached = {
      muted: !!p.muted,
      musicEnabled: p.musicEnabled !== false,
      sfxEnabled: p.sfxEnabled !== false,
      musicVolume: clamp01(
        typeof p.musicVolume === 'number' ? p.musicVolume : DEFAULTS.musicVolume,
      ),
      sfxVolume: clamp01(
        typeof p.sfxVolume === 'number' ? p.sfxVolume : DEFAULTS.sfxVolume,
      ),
      reduceMotion: !!p.reduceMotion,
      autoStatAllocate: !!p.autoStatAllocate,
    };
    return { ...cached };
  } catch {
    cached = defaultSettings();
    return { ...cached };
  }
}

export function saveSettings(next: GameSettings): GameSettings {
  const clean: GameSettings = {
    muted: !!next.muted,
    musicEnabled: !!next.musicEnabled,
    sfxEnabled: !!next.sfxEnabled,
    musicVolume: clamp01(next.musicVolume),
    sfxVolume: clamp01(next.sfxVolume),
    reduceMotion: !!next.reduceMotion,
    autoStatAllocate: !!next.autoStatAllocate,
  };
  cached = clean;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(clean));
  } catch {
    /* ignore quota */
  }
  return { ...clean };
}

export function patchSettings(partial: Partial<GameSettings>): GameSettings {
  return saveSettings({ ...loadSettings(), ...partial });
}

export function effectiveMusicVolume(s = loadSettings()): number {
  if (s.muted || !s.musicEnabled) return 0;
  return s.musicVolume;
}

export function effectiveSfxVolume(s = loadSettings()): number {
  if (s.muted || !s.sfxEnabled) return 0;
  return s.sfxVolume;
}
