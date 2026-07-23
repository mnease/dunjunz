/**
 * D&D common races — changeable once the hero hits level 25.
 */

import type { AttrId, Attributes, SaveData } from '../types';

export const RACE_UNLOCK_LEVEL = 25;

export type RaceId =
  | 'human'
  | 'elf'
  | 'dwarf'
  | 'halfling'
  | 'half_orc'
  | 'half_elf'
  | 'gnome'
  | 'dragonborn'
  | 'tiefling'
  | 'construct';

export interface RaceDef {
  id: RaceId;
  name: string;
  blurb: string;
  bonuses: Partial<Attributes>;
}

export const RACES: Record<RaceId, RaceDef> = {
  human: {
    id: 'human',
    name: 'HUMAN',
    blurb: 'Versatile. Default. Still cool.',
    // No free stats pre-L25; choosing Human at 25 grants versatile +1s.
    bonuses: {},
  },
  elf: {
    id: 'elf',
    name: 'ELF',
    blurb: 'Grace, long life, short patience.',
    bonuses: { dex: 2, int: 1 },
  },
  dwarf: {
    id: 'dwarf',
    name: 'DWARF',
    blurb: 'Stout. Forje-approved. Beard optional.',
    bonuses: { vit: 2, str: 1 },
  },
  halfling: {
    id: 'halfling',
    name: 'HALFLING',
    blurb: 'Lucky feet. Big snacks. Small doors.',
    bonuses: { lck: 2, dex: 1 },
  },
  half_orc: {
    id: 'half_orc',
    name: 'HALF-ORC',
    blurb: 'Strong. Loud. Underrated poet.',
    bonuses: { str: 2, vit: 1 },
  },
  half_elf: {
    id: 'half_elf',
    name: 'HALF-ELF',
    blurb: 'Charm + wanderlust. Drama free*',
    bonuses: { lck: 1, dex: 1, int: 1 },
  },
  gnome: {
    id: 'gnome',
    name: 'GNOME',
    blurb: 'Tiny chaos. Big ideas. Bright hair.',
    bonuses: { int: 2, lck: 1 },
  },
  dragonborn: {
    id: 'dragonborn',
    name: 'DRAGONBORN',
    blurb: 'Scales. Pride. Occasional sneeze-fire.',
    bonuses: { str: 2, int: 1 },
  },
  tiefling: {
    id: 'tiefling',
    name: 'TIEFLING',
    blurb: 'Horns, heat, questionable ancestry.',
    bonuses: { int: 1, lck: 1, vit: 1 },
  },
  construct: {
    id: 'construct',
    name: 'CONSTRUCT',
    blurb: 'Forged. Beeps optional. Robot energy.',
    bonuses: { vit: 2, str: 1 },
  },
};

export const RACE_IDS: RaceId[] = [
  'human',
  'elf',
  'dwarf',
  'halfling',
  'half_orc',
  'half_elf',
  'gnome',
  'dragonborn',
  'tiefling',
  'construct',
];

export function getRace(id: RaceId | null | undefined): RaceDef {
  if (id && RACES[id]) return RACES[id]!;
  return RACES.human;
}

export function raceBonusAttrs(
  race: RaceId | null | undefined,
  raceChosen = false,
): Partial<Attributes> {
  // No racial package until L25 pick is spent (keeps early game balance).
  if (!raceChosen) return {};
  const r = getRace(race ?? 'human');
  if (r.id === 'human') {
    return { str: 1, dex: 1, vit: 1, int: 1, lck: 1 };
  }
  return r.bonuses;
}

export function canChangeRace(save: SaveData): boolean {
  return save.level >= RACE_UNLOCK_LEVEL && !save.raceChosen;
}

export function pickRace(
  save: SaveData,
  raceId: RaceId,
): { ok: true; save: SaveData } | { ok: false; reason: string } {
  if (!canChangeRace(save)) {
    return {
      ok: false,
      reason: save.raceChosen
        ? 'RACE ALREADY CHOSEN'
        : `REACH LEVEL ${RACE_UNLOCK_LEVEL} FIRST`,
    };
  }
  if (!RACES[raceId]) return { ok: false, reason: 'UNKNOWN RACE' };
  return {
    ok: true,
    save: { ...save, race: raceId, raceChosen: true },
  };
}

export function raceLabel(save: SaveData): string {
  return getRace(save.race ?? 'human').name;
}

/**
 * Deterministic starting race from run seed (and optional salt).
 * All races including construct are in the pool.
 */
export function rollStartingRace(runSeed: number, salt = 0x51aced): RaceId {
  const x = (Math.imul(runSeed ^ salt, 0x9e3779b1) >>> 0) % RACE_IDS.length;
  return RACE_IDS[x] ?? 'human';
}

export const FLAG_IDENTITY_CHOSEN = 'identity_chosen';

export function needsIdentityPick(save: SaveData): boolean {
  if (save.identityChosen || save.flags?.[FLAG_IDENTITY_CHOSEN]) return false;
  if (save.gender === 'male' || save.gender === 'female') return false;
  // Veterans who already left the beach: don't soft-lock mid-run
  const visited = save.visitedRooms ?? [];
  if (visited.length > 1) return false;
  if ((save.level ?? 1) > 1 || (save.xp ?? 0) > 0) return false;
  return true;
}

/** Apply binary gender + random race. Idempotent if already chosen. */
export function chooseIdentity(
  save: SaveData,
  gender: 'male' | 'female',
): SaveData {
  if (gender !== 'male' && gender !== 'female') {
    return save;
  }
  if (save.identityChosen || save.flags?.[FLAG_IDENTITY_CHOSEN]) {
    return { ...save, gender: save.gender ?? gender };
  }
  const race = rollStartingRace(save.runSeed ?? 1);
  return {
    ...save,
    gender,
    identityChosen: true,
    race,
    startingRace: race,
    // Cosmetic until wizard ritual — do not set raceChosen
    flags: { ...save.flags, [FLAG_IDENTITY_CHOSEN]: true },
  };
}

/** Migrate old saves: if they progressed without identity, default male human. */
export function migrateIdentity(save: SaveData): SaveData {
  if (save.identityChosen || save.flags?.[FLAG_IDENTITY_CHOSEN]) {
    return {
      ...save,
      gender: save.gender === 'female' ? 'female' : 'male',
      identityChosen: true,
    };
  }
  if (needsIdentityPick(save)) return save;
  // Progressed without pick — freeze defaults so we never block
  return {
    ...save,
    gender: save.gender === 'female' ? 'female' : 'male',
    identityChosen: true,
    race: save.race ?? 'human',
    startingRace: save.startingRace ?? save.race ?? 'human',
    flags: { ...save.flags, [FLAG_IDENTITY_CHOSEN]: true },
  };
}

/** Sum partial attribute maps. */
export function sumAttrPartials(
  ...parts: Partial<Attributes>[]
): Attributes {
  const out: Attributes = { str: 0, dex: 0, vit: 0, int: 0, lck: 0 };
  for (const p of parts) {
    for (const k of Object.keys(out) as AttrId[]) {
      out[k] += p[k] ?? 0;
    }
  }
  return out;
}
