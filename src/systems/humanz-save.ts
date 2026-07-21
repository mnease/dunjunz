/**
 * Humanz & Villagez campaign save (separate from Dunjunz crawl).
 */

import type { HumanzCampaign } from './village-battle';
import { defaultCampaign } from './village-battle';

export const HUMANZ_SAVE_KEY = 'dunjunz-humanz-save-v1';
export const LAST_MODE_KEY = 'dunjunz-last-mode';

export type GameModeId = 'dunjunz' | 'humanz';

export function getLastMode(): GameModeId {
  try {
    const m = localStorage.getItem(LAST_MODE_KEY);
    if (m === 'humanz' || m === 'dunjunz') return m;
  } catch {
    /* ignore */
  }
  return 'dunjunz';
}

export function setLastMode(mode: GameModeId): void {
  try {
    localStorage.setItem(LAST_MODE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function loadHumanzSave(): HumanzCampaign {
  try {
    const raw = localStorage.getItem(HUMANZ_SAVE_KEY);
    if (!raw) return defaultCampaign();
    const parsed = JSON.parse(raw) as Partial<HumanzCampaign>;
    const base = defaultCampaign();
    return {
      ...base,
      ...parsed,
      version: 1,
      mode: 'humanz',
      dragonHp: typeof parsed.dragonHp === 'number' ? parsed.dragonHp : base.dragonHp,
      dragonMaxHp:
        typeof parsed.dragonMaxHp === 'number' ? parsed.dragonMaxHp : base.dragonMaxHp,
      gold: typeof parsed.gold === 'number' ? Math.max(0, parsed.gold) : base.gold,
      wave: typeof parsed.wave === 'number' ? Math.max(1, parsed.wave) : 1,
      victories: typeof parsed.victories === 'number' ? parsed.victories : 0,
      bestWave: typeof parsed.bestWave === 'number' ? parsed.bestWave : 0,
      dragonName:
        typeof parsed.dragonName === 'string' && parsed.dragonName.trim()
          ? parsed.dragonName
          : base.dragonName,
    };
  } catch {
    return defaultCampaign();
  }
}

export function writeHumanzSave(data: HumanzCampaign): void {
  try {
    localStorage.setItem(
      HUMANZ_SAVE_KEY,
      JSON.stringify({ ...data, version: 1, mode: 'humanz' }),
    );
    setLastMode('humanz');
  } catch {
    /* ignore */
  }
}

export function clearHumanzSave(): void {
  try {
    localStorage.removeItem(HUMANZ_SAVE_KEY);
  } catch {
    /* ignore */
  }
}

export function hasHumanzProgress(): boolean {
  try {
    const raw = localStorage.getItem(HUMANZ_SAVE_KEY);
    if (!raw) return false;
    const p = JSON.parse(raw) as Partial<HumanzCampaign>;
    return (p.victories ?? 0) > 0 || (p.wave ?? 1) > 1 || (p.bestWave ?? 0) > 0;
  } catch {
    return false;
  }
}
