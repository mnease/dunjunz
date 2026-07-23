import { SAVE_KEY } from '../config';
import type { LandId, SaveData } from '../types';
import { START_ROOM } from '../data/world';
import { defaultAttrs, recomputeMaxHp } from './attributes';
import { emptyEquipped } from './items';
import { migrateEquipment, syncDerivedStats } from './inventory';
import { levelFromXp } from './progression';
import { reconcileMapzFromCollected } from './mapz';
import { queueCloudSave } from './cloud-save';
import { ensureBudProgress } from './best-bud-gear';
import { setLastMode } from './humanz-save';
import { migrateTutorial } from './tutorial';

export function defaultSave(): SaveData {
  const attrs = defaultAttrs();
  return {
    version: 6,
    roomId: START_ROOM,
    hp: 6,
    maxHp: recomputeMaxHp(attrs),
    hasSword: false,
    hasKey: false,
    bossDefeated: false,
    flags: { attr_rule_2plus1: true },
    killed: [],
    collected: [],
    xp: 0,
    level: 1,
    coins: 0,
    // Starter light for first dark basements
    stacks: { torch: 3 },
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
    runSeed:
      (Math.floor(Math.random() * 0xffffffff) ^ (Date.now() & 0xffffffff)) >>>
        0 || 1,
    crawlerId: undefined,
    combatMode: 'live',
    bestBudId: null,
    bestBudStage: 'none',
    budXp: 0,
    budLevel: 1,
    budEquipped: emptyEquipped(),
    activeQuestId: null,
    questsCompleted: [],
    achievementsUnlocked: [],
    hardRunLand: null,
    hardKilled: [],
    hardLandsCleared: [],
    primaryClass: null,
    secondaryClass: null,
    gender: null,
    identityChosen: false,
    race: 'human',
    startingRace: undefined,
    pendingRaceId: null,
    raceChosen: false,
    pendingAttrMajor: null,
    activeLight: null,
    lightFuelMs: 0,
    placedTorches: {},
    buffAtk: 0,
    buffDef: 0,
    buffMs: 0,
  };
}

function withV5Fields(s: SaveData): SaveData {
  const runSeed =
    typeof s.runSeed === 'number' && Number.isFinite(s.runSeed)
      ? s.runSeed
      : (Math.floor(Math.random() * 0xffffffff) ^ (Date.now() & 0xffffffff)) >>>
          0 || 1;
  const budXp = typeof s.budXp === 'number' ? Math.max(0, s.budXp) : 0;
  return {
    ...s,
    version: 6,
    discoveredMapz: s.discoveredMapz?.length
      ? s.discoveredMapz
      : (['surface'] as LandId[]),
    visitedRooms: s.visitedRooms ?? [],
    princessSaved: s.princessSaved ?? false,
    landsCleared: s.landsCleared ?? [],
    runSeed,
    bestBudId: s.bestBudId ?? null,
    bestBudStage: s.bestBudStage ?? 'none',
    budXp,
    budLevel: levelFromXp(budXp),
    budEquipped: {
      ...emptyEquipped(),
      ...(s.budEquipped ?? {}),
      key: null,
    },
    activeQuestId: s.activeQuestId ?? null,
    questsCompleted: Array.isArray(s.questsCompleted) ? s.questsCompleted : [],
    achievementsUnlocked: Array.isArray(s.achievementsUnlocked)
      ? s.achievementsUnlocked
      : [],
    hardRunLand: s.hardRunLand ?? null,
    hardKilled: Array.isArray(s.hardKilled) ? s.hardKilled : [],
    hardLandsCleared: Array.isArray(s.hardLandsCleared)
      ? s.hardLandsCleared
      : [],
    primaryClass: s.primaryClass ?? null,
    secondaryClass: s.secondaryClass ?? null,
    gender:
      s.gender === 'male' || s.gender === 'female' ? s.gender : null,
    identityChosen: !!(s.identityChosen || s.flags?.identity_chosen),
    race: s.race ?? 'human',
    startingRace: s.startingRace ?? s.race ?? undefined,
    pendingRaceId: s.pendingRaceId ?? null,
    raceChosen: !!s.raceChosen,
    pendingAttrMajor: s.pendingAttrMajor ?? null,
    activeLight: s.activeLight ?? null,
    lightFuelMs: typeof s.lightFuelMs === 'number' ? Math.max(0, s.lightFuelMs) : 0,
    placedTorches: normalizePlacedTorches(s.placedTorches),
    buffAtk: typeof s.buffAtk === 'number' ? s.buffAtk : 0,
    buffDef: typeof s.buffDef === 'number' ? s.buffDef : 0,
    buffMs: typeof s.buffMs === 'number' ? Math.max(0, s.buffMs) : 0,
  };
}

function normalizePlacedTorches(
  raw: SaveData['placedTorches'],
): NonNullable<SaveData['placedTorches']> {
  if (!raw || typeof raw !== 'object') return {};
  const out: NonNullable<SaveData['placedTorches']> = {};
  for (const [roomId, list] of Object.entries(raw)) {
    if (!Array.isArray(list)) continue;
    out[roomId] = list
      .filter(
        (t) =>
          t &&
          typeof t.x === 'number' &&
          typeof t.y === 'number' &&
          typeof t.id === 'string',
      )
      .map((t) => ({
        id: t.id,
        x: Math.floor(t.x),
        y: Math.floor(t.y),
        dir: ([0, 1, 2, 3] as const).includes(t.dir as 0 | 1 | 2 | 3)
          ? (t.dir as 0 | 1 | 2 | 3)
          : 2,
      }));
  }
  return out;
}

/**
 * One-time: old free +1 points (2/level) → packages (1/level = +2 then +1).
 * Flag attr_rule_2plus1 prevents double conversion.
 */
export function migrateAttrPackages(save: SaveData): SaveData {
  if (save.flags?.attr_rule_2plus1) {
    return {
      ...save,
      pendingAttrMajor: save.pendingAttrMajor ?? null,
    };
  }
  const oldPts = Math.max(0, save.attrPoints ?? 0);
  // 2 old points ≈ one level package under the new rule
  const packages = Math.ceil(oldPts / 2);
  return {
    ...save,
    attrPoints: packages,
    pendingAttrMajor: null,
    flags: { ...save.flags, attr_rule_2plus1: true },
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
    if (parsed.version != null && parsed.version > 6) return defaultSave();

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
      let migrated = migrateAttrPackages(
        withV5Fields(migrateEquipment(merged)),
      );
      migrated.level = levelFromXp(migrated.xp);
      migrated = migrateTutorial(migrated);
      return syncDerivedStats(migrated);
    }

    const equipped = { ...emptyEquipped(), ...(parsed.equipped ?? {}) };
    let next: SaveData = withV5Fields({
      ...base,
      ...parsed,
      version: 6,
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
      runSeed:
        typeof parsed.runSeed === 'number' ? parsed.runSeed : base.runSeed,
      bestBudId: (parsed as SaveData).bestBudId ?? null,
      bestBudStage: (parsed as SaveData).bestBudStage ?? 'none',
      budXp:
        typeof (parsed as SaveData).budXp === 'number'
          ? Math.max(0, (parsed as SaveData).budXp)
          : 0,
      budLevel: 1,
      budEquipped: {
        ...emptyEquipped(),
        ...((parsed as SaveData).budEquipped ?? {}),
        key: null,
      },
      activeQuestId: (parsed as SaveData).activeQuestId ?? null,
      questsCompleted: Array.isArray((parsed as SaveData).questsCompleted)
        ? (parsed as SaveData).questsCompleted!
        : [],
      achievementsUnlocked: Array.isArray(
        (parsed as SaveData).achievementsUnlocked,
      )
        ? (parsed as SaveData).achievementsUnlocked!
        : [],
    });
    next.level = levelFromXp(next.xp);
    next = ensureBudProgress(next);
    // Boss already beaten → ensure dunjunz land flagged
    if (next.bossDefeated && !next.landsCleared.includes('dunjunz')) {
      next.landsCleared = [...next.landsCleared, 'dunjunz'];
    }
    // Scroll pickups must unlock mapz even if an older save blanked discoveredMapz
    next = reconcileMapzFromCollected(next);
    next = migrateAttrPackages(next);
    next = migrateTutorial(next);
    return syncDerivedStats(next);
  } catch {
    return defaultSave();
  }
}

export function writeSave(data: SaveData): void {
  const toStore = syncDerivedStats({
    ...data,
    version: 6,
    level: levelFromXp(data.xp),
  });
  localStorage.setItem(SAVE_KEY, JSON.stringify(toStore));
  setLastMode('dunjunz');
  queueCloudSave(toStore);
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
}
