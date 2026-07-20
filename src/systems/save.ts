import { SAVE_KEY } from '../config';
import type { SaveData } from '../types';
import { START_ROOM } from '../data/world';
import { levelFromXp } from './progression';
import { migrateEquipment, syncDerivedStats } from './inventory';

export function defaultSave(): SaveData {
  return {
    version: 3,
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
    equippedWeapon: null,
    equippedArmor: null,
    equippedAmulet: null,
  };
}

/**
 * Load save, merging defaults so older blobs gain equip fields
 * without wiping killed/collected/flags progress.
 */
export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw) as Partial<SaveData> & { version?: number };
    if (parsed.version != null && parsed.version > 3) return defaultSave();

    const base = defaultSave();
    const merged: SaveData = {
      ...base,
      ...parsed,
      version: 3,
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
      equippedWeapon:
        typeof parsed.equippedWeapon === 'string'
          ? parsed.equippedWeapon
          : parsed.equippedWeapon === null
            ? null
            : base.equippedWeapon,
      equippedArmor:
        typeof parsed.equippedArmor === 'string'
          ? parsed.equippedArmor
          : parsed.equippedArmor === null
            ? null
            : base.equippedArmor,
      equippedAmulet:
        typeof parsed.equippedAmulet === 'string'
          ? parsed.equippedAmulet
          : parsed.equippedAmulet === null
            ? null
            : base.equippedAmulet,
      level: 1,
    };
    merged.level = levelFromXp(merged.xp);
    return migrateEquipment(merged);
  } catch {
    return defaultSave();
  }
}

export function writeSave(data: SaveData): void {
  // Do not auto-equip on every write (would undo intentional unequip)
  const toStore = syncDerivedStats({
    ...data,
    version: 3,
    level: levelFromXp(data.xp),
  });
  localStorage.setItem(SAVE_KEY, JSON.stringify(toStore));
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
}
