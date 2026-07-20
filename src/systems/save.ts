import { SAVE_KEY } from '../config';
import type { LandId, SaveData } from '../types';
import { START_ROOM } from '../data/world';
import { defaultAttrs, recomputeMaxHp } from './attributes';
import { emptyEquipped } from './items';
import { migrateEquipment, syncDerivedStats } from './inventory';
import { levelFromXp } from './progression';
import { reconcileMapzFromCollected } from './mapz';

export function defaultSave(): SaveData {
  const attrs = defaultAttrs();
  return {
    version: 5,
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
    discoveredMapz: ['surface'],
    visitedRooms: [],
    princessSaved: false,
    landsCleared: [],
  };
}

function withV5Fields(s: SaveData): SaveData {
  return {
    ...s,
    version: 5,
    discoveredMapz: s.discoveredMapz?.length
      ? s.discoveredMapz
      : (['surface'] as LandId[]),
    visitedRooms: s.visitedRooms ?? [],
    princessSaved: s.princessSaved ?? false,
    landsCleared: s.landsCleared ?? [],
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
    if (parsed.version != null && parsed.version > 5) return defaultSave();

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
      const migrated = withV5Fields(migrateEquipment(merged));
      migrated.level = levelFromXp(migrated.xp);
      return syncDerivedStats(migrated);
    }

    const equipped = { ...emptyEquipped(), ...(parsed.equipped ?? {}) };
    let next: SaveData = withV5Fields({
      ...base,
      ...parsed,
      version: 5,
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
      discoveredMapz: Array.isArray(parsed.discoveredMapz)
        ? (parsed.discoveredMapz as LandId[])
        : base.discoveredMapz,
      visitedRooms: Array.isArray(parsed.visitedRooms)
        ? parsed.visitedRooms
        : [],
      princessSaved: !!parsed.princessSaved,
      landsCleared: Array.isArray(parsed.landsCleared)
        ? (parsed.landsCleared as LandId[])
        : [],
    });
    next.level = levelFromXp(next.xp);
    // Boss already beaten → ensure dunjunz land flagged
    if (next.bossDefeated && !next.landsCleared.includes('dunjunz')) {
      next.landsCleared = [...next.landsCleared, 'dunjunz'];
    }
    // Scroll pickups must unlock mapz even if an older save blanked discoveredMapz
    next = reconcileMapzFromCollected(next);
    return syncDerivedStats(next);
  } catch {
    return defaultSave();
  }
}

export function writeSave(data: SaveData): void {
  const toStore = syncDerivedStats({
    ...data,
    version: 5,
    level: levelFromXp(data.xp),
  });
  localStorage.setItem(SAVE_KEY, JSON.stringify(toStore));
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
}
