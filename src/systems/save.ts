import { SAVE_KEY } from '../config';
import type { SaveData } from '../types';
import { START_ROOM } from '../data/world';
import { defaultAttrs, recomputeMaxHp } from './attributes';
import { emptyEquipped } from './items';
import { migrateEquipment, syncDerivedStats } from './inventory';
import { levelFromXp } from './progression';

export function defaultSave(): SaveData {
  const attrs = defaultAttrs();
  return {
    version: 4,
    roomId: START_ROOM,
    hp: 6,
    maxHp: recomputeMaxHp(attrs),
    hasSword: false,
    hasKey: false,
    bossDefeated: false,
    flags: {},
    killed: [],
    collected: [],
    xp: 0,
    level: 1,
    coins: 0,
    stacks: {},
    bag: [],
    nextItemUid: 1,
    equipped: emptyEquipped(),
    attrs,
    attrPoints: 0,
    armor: 0,
  };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw) as Partial<SaveData> & {
      version?: number;
      inventory?: Record<string, number>;
    };
    if (parsed.version != null && parsed.version > 4) return defaultSave();

    const base = defaultSave();
    if ((parsed.version ?? 1) < 4 || !Array.isArray(parsed.bag)) {
      const merged = {
        ...base,
        ...parsed,
        flags: { ...base.flags, ...(parsed.flags ?? {}) },
        killed: Array.isArray(parsed.killed) ? parsed.killed : base.killed,
        collected: Array.isArray(parsed.collected)
          ? parsed.collected
          : base.collected,
        inventory: parsed.inventory ?? {},
      } as SaveData & Record<string, unknown>;
      const migrated = migrateEquipment(merged);
      migrated.level = levelFromXp(migrated.xp);
      return syncDerivedStats(migrated);
    }

    const equipped = { ...emptyEquipped(), ...(parsed.equipped ?? {}) };
    let next: SaveData = {
      ...base,
      ...parsed,
      version: 4,
      flags: { ...base.flags, ...(parsed.flags ?? {}) },
      killed: Array.isArray(parsed.killed) ? parsed.killed : base.killed,
      collected: Array.isArray(parsed.collected)
        ? parsed.collected
        : base.collected,
      stacks: { ...base.stacks, ...(parsed.stacks ?? {}) },
      bag: Array.isArray(parsed.bag) ? parsed.bag : [],
      nextItemUid: parsed.nextItemUid ?? 1,
      equipped,
      attrs: { ...base.attrs, ...(parsed.attrs ?? {}) },
      attrPoints: parsed.attrPoints ?? 0,
      xp: typeof parsed.xp === 'number' ? parsed.xp : 0,
      coins: typeof parsed.coins === 'number' ? parsed.coins : 0,
    };
    next.level = levelFromXp(next.xp);
    return syncDerivedStats(next);
  } catch {
    return defaultSave();
  }
}

export function writeSave(data: SaveData): void {
  const toStore = syncDerivedStats({
    ...data,
    version: 4,
    level: levelFromXp(data.xp),
  });
  localStorage.setItem(SAVE_KEY, JSON.stringify(toStore));
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
}
