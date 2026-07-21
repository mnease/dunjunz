/**
 * D&D-style classes — pick primary at L5, multiclass secondary at L15.
 * Bonuses are small attr bumps so the rest of the RPG stays coherent.
 */

import type { AttrId, Attributes, SaveData } from '../types';

export const CLASS_UNLOCK_LEVEL = 5;
export const MULTICLASS_UNLOCK_LEVEL = 15;

/** PHB-core + common fantasy roster (readable at SCALE=3 tone). */
export type ClassId =
  | 'fighter'
  | 'wizard'
  | 'rogue'
  | 'cleric'
  | 'ranger'
  | 'barbarian'
  | 'paladin'
  | 'bard'
  | 'monk'
  | 'warlock'
  | 'sorcerer'
  | 'druid';

export interface ClassDef {
  id: ClassId;
  name: string;
  blurb: string;
  /** Flat attr bonuses when primary (full) or secondary (half, floored). */
  bonuses: Partial<Attributes>;
}

export const CLASSES: Record<ClassId, ClassDef> = {
  fighter: {
    id: 'fighter',
    name: 'FIGHTER',
    blurb: 'Hit hard. Hit often. Hit politely.',
    bonuses: { str: 2, vit: 1 },
  },
  wizard: {
    id: 'wizard',
    name: 'WIZARD',
    blurb: 'INT go brrr. Pointy hat energy.',
    bonuses: { int: 3 },
  },
  rogue: {
    id: 'rogue',
    name: 'ROGUE',
    blurb: 'Sneaky. Lucky. Tax-optional.',
    bonuses: { dex: 2, lck: 1 },
  },
  cleric: {
    id: 'cleric',
    name: 'CLERIC',
    blurb: 'Heals + holy vibes. Smite optional.',
    bonuses: { vit: 1, int: 1, str: 1 },
  },
  ranger: {
    id: 'ranger',
    name: 'RANGER',
    blurb: 'Bows, beasts, outdoor opinions.',
    bonuses: { dex: 2, vit: 1 },
  },
  barbarian: {
    id: 'barbarian',
    name: 'BARBARIAN',
    blurb: 'Rage first. Questions later.',
    bonuses: { str: 2, vit: 2 },
  },
  paladin: {
    id: 'paladin',
    name: 'PALADIN',
    blurb: 'Oaths, armor, righteous side-eye.',
    bonuses: { str: 1, vit: 1, int: 1 },
  },
  bard: {
    id: 'bard',
    name: 'BARD',
    blurb: 'Charisma as a weapon. Also lutes.',
    bonuses: { lck: 2, int: 1 },
  },
  monk: {
    id: 'monk',
    name: 'MONK',
    blurb: 'Fists. Focus. Zero inventory drama.',
    bonuses: { dex: 2, vit: 1 },
  },
  warlock: {
    id: 'warlock',
    name: 'WARLOCK',
    blurb: 'Pact magic. Fine print optional.',
    bonuses: { int: 2, lck: 1 },
  },
  sorcerer: {
    id: 'sorcerer',
    name: 'SORCERER',
    blurb: 'Born magic. Drama included free.',
    bonuses: { int: 2, vit: 1 },
  },
  druid: {
    id: 'druid',
    name: 'DRUID',
    blurb: 'Nature. Forms. Leaf-based justice.',
    bonuses: { vit: 1, int: 1, dex: 1 },
  },
};

export const CLASS_IDS = Object.keys(CLASSES) as ClassId[];

export function getClass(id: ClassId | null | undefined): ClassDef | null {
  if (!id) return null;
  return CLASSES[id] ?? null;
}

function scaleBonuses(
  bonuses: Partial<Attributes>,
  mult: number,
): Partial<Attributes> {
  const out: Partial<Attributes> = {};
  for (const [k, v] of Object.entries(bonuses) as [AttrId, number][]) {
    if (v) out[k] = Math.floor(v * mult);
  }
  return out;
}

/** Merge primary (full) + secondary (half) class bonuses into attrs. */
export function classBonusAttrs(
  primary: ClassId | null | undefined,
  secondary: ClassId | null | undefined,
): Partial<Attributes> {
  const acc: Attributes = { str: 0, dex: 0, vit: 0, int: 0, lck: 0 };
  const add = (partial: Partial<Attributes>) => {
    for (const id of Object.keys(acc) as AttrId[]) {
      acc[id] += partial[id] ?? 0;
    }
  };
  const p = getClass(primary);
  if (p) add(p.bonuses);
  const s = getClass(secondary);
  if (s && s.id !== primary) add(scaleBonuses(s.bonuses, 0.5));
  return acc;
}

export function canPickPrimaryClass(save: SaveData): boolean {
  return save.level >= CLASS_UNLOCK_LEVEL && !save.primaryClass;
}

export function canPickSecondaryClass(save: SaveData): boolean {
  return (
    save.level >= MULTICLASS_UNLOCK_LEVEL &&
    !!save.primaryClass &&
    !save.secondaryClass
  );
}

export function pickPrimaryClass(
  save: SaveData,
  classId: ClassId,
): { ok: true; save: SaveData } | { ok: false; reason: string } {
  if (!canPickPrimaryClass(save)) {
    return {
      ok: false,
      reason: save.primaryClass
        ? 'ALREADY HAVE A CLASS'
        : `REACH LEVEL ${CLASS_UNLOCK_LEVEL} FIRST`,
    };
  }
  if (!CLASSES[classId]) return { ok: false, reason: 'UNKNOWN CLASS' };
  return {
    ok: true,
    save: { ...save, primaryClass: classId },
  };
}

export function pickSecondaryClass(
  save: SaveData,
  classId: ClassId,
): { ok: true; save: SaveData } | { ok: false; reason: string } {
  if (!canPickSecondaryClass(save)) {
    return {
      ok: false,
      reason: save.secondaryClass
        ? 'ALREADY MULTICLASSED'
        : `NEED L${MULTICLASS_UNLOCK_LEVEL} + A PRIMARY CLASS`,
    };
  }
  if (!CLASSES[classId]) return { ok: false, reason: 'UNKNOWN CLASS' };
  if (classId === save.primaryClass) {
    return { ok: false, reason: 'PICK A DIFFERENT CLASS' };
  }
  return {
    ok: true,
    save: { ...save, secondaryClass: classId },
  };
}

export function classLabel(save: SaveData): string {
  const p = getClass(save.primaryClass)?.name;
  const s = getClass(save.secondaryClass)?.name;
  if (p && s) return `${p}/${s}`;
  if (p) return p;
  return 'ADVENTURER';
}
