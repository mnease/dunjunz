import { SAVE_KEY } from '../config';
import type { SaveData } from '../types';
import { START_ROOM } from '../data/world';
import { levelFromXp } from './progression';

export function defaultSave(): SaveData {
  return {
    version: 2,
    roomId: START_ROOM,
    hp: 6,
    maxHp: 6,
    hasSword: false,
    hasKey: false,
    bossDefeated: false,
    flags: {},
    killed: [],
    collected: [],
    xp: 0,
    level: 1,
    coins: 0,
    inventory: {},
    armor: 0,
  };
}

/**
 * Load save, merging defaults so v1 blobs and partial data gain RPG fields
 * without wiping killed/collected/flags progress.
 */
export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw) as Partial<SaveData> & { version?: number };
    // Reject unknown future major versions only; v1/v2 both merge.
    if (parsed.version != null && parsed.version > 2) return defaultSave();

    const base = defaultSave();
    const merged: SaveData = {
      ...base,
      ...parsed,
      version: 2,
      flags: { ...base.flags, ...(parsed.flags ?? {}) },
      killed: Array.isArray(parsed.killed) ? parsed.killed : base.killed,
      collected: Array.isArray(parsed.collected)
        ? parsed.collected
        : base.collected,
      inventory: {
        ...base.inventory,
        ...(parsed.inventory && typeof parsed.inventory === 'object'
          ? parsed.inventory
          : {}),
      },
      xp: typeof parsed.xp === 'number' ? parsed.xp : base.xp,
      coins: typeof parsed.coins === 'number' ? parsed.coins : base.coins,
      armor: typeof parsed.armor === 'number' ? parsed.armor : base.armor,
      level: 1,
    };
    // Reconcile level from xp (source of truth)
    merged.level = levelFromXp(merged.xp);
    return merged;
  } catch {
    return defaultSave();
  }
}

export function writeSave(data: SaveData): void {
  const toStore: SaveData = {
    ...data,
    version: 2,
    level: levelFromXp(data.xp),
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(toStore));
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
}
