/**
 * ARMY MODE — graduate heroes into an unlimited ridiculous collective.
 * Party size = how many characters you've developed (min L20 to enlist).
 */

import type { AttrId, Attributes, ClassId, RaceId, SaveData } from '../types';
import { ATTR_IDS, defaultAttrs, recomputeMaxHp } from './attributes';
import { classLabel } from './classes';
import { raceLabel } from './races';
import { levelFromXp, xpToReachLevel } from './progression';

export const ARMY_MIN_LEVEL = 20;
export const ARMY_SAVE_KEY = 'dunjunz-army-save-v1';

/** How they act in battle log / AI flavor. */
export type PersonalityId =
  | 'berserk'
  | 'cowardly_genius'
  | 'polite_murder'
  | 'chaotic_snack'
  | 'dramatic'
  | 'sleepy'
  | 'hype_man'
  | 'accountant'
  | 'cryptid'
  | 'overly_attached';

export interface PersonalityDef {
  id: PersonalityId;
  name: string;
  blurb: string;
  /** Relative aggression 0–1 (higher = prefer attack over support). */
  aggression: number;
  battleCries: string[];
  attackVerbs: string[];
}

export const PERSONALITIES: Record<PersonalityId, PersonalityDef> = {
  berserk: {
    id: 'berserk',
    name: 'BERSERK',
    blurb: 'Screams first. Strategy later. Maybe.',
    aggression: 0.95,
    battleCries: ['RAAAAAGE!', 'I PAID FOR THE WHOLE AXE!', 'WHO TOUCHED MY SNACKS?'],
    attackVerbs: ['PULVERIZES', 'YEETS', 'ABSOLUTELY DECKS'],
  },
  cowardly_genius: {
    id: 'cowardly_genius',
    name: 'COWARDLY GENIUS',
    blurb: 'Hides behind math. Still deadly.',
    aggression: 0.35,
    battleCries: ['TACTICAL RETREAT… FORWARD!', 'I CALCULATED YOUR DOOM', 'PLEASE DON\'T'],
    attackVerbs: ['OUTSMARTS', 'NERFS', 'PEER-REVIEWS INTO OBLIVION'],
  },
  polite_murder: {
    id: 'polite_murder',
    name: 'POLITE MURDER',
    blurb: 'After you. No, after YOU. *stab*',
    aggression: 0.7,
    battleCries: ['PARDON ME', 'EXCUSE THE BLADE', 'LOVELY DAY FOR MAYHEM'],
    attackVerbs: ['COURTEOUSLY EVISCERATES', 'GENTLY ERASES', 'APOLOGIZES WHILE SLAYING'],
  },
  chaotic_snack: {
    id: 'chaotic_snack',
    name: 'CHAOTIC SNACK',
    blurb: 'Fights with cheese. Somehow works.',
    aggression: 0.8,
    battleCries: ['IS THIS EDIBLE?', 'SNACK ATTACK', 'I BROUGHT DIPS'],
    attackVerbs: ['CHEESES', 'CRUMBS', 'HANGERS-ONS'],
  },
  dramatic: {
    id: 'dramatic',
    name: 'DRAMATIC',
    blurb: 'Monologues mid-swing. Still hits.',
    aggression: 0.75,
    battleCries: ['BEHOLD…!', 'THIS IS MY ARC', 'THE PROPHECY WAS ME'],
    attackVerbs: ['SOLILOQUIZES INTO', 'SPOTLIGHTS', 'OSCARs'],
  },
  sleepy: {
    id: 'sleepy',
    name: 'SLEEPY',
    blurb: 'Naps. Wakes up. Critical hit.',
    aggression: 0.4,
    battleCries: ['…five more minutes', 'zzz—WHAM', 'I DREAMED YOU LOST'],
    attackVerbs: ['DROWSILY BONKS', 'SLEEPWALKS THROUGH', 'YAWN-SLAMS'],
  },
  hype_man: {
    id: 'hype_man',
    name: 'HYPE MAN',
    blurb: 'Buffs the squad with pure vibes.',
    aggression: 0.45,
    battleCries: ['LET\'S GOOOOO', 'THAT WAS CLEAN', 'ARMY ENERGY'],
    attackVerbs: ['HYPES INTO', 'CROWD-SURFS OVER', 'POGS UPON'],
  },
  accountant: {
    id: 'accountant',
    name: 'ACCOUNTANT',
    blurb: 'DPS spreadsheets. Lethal decimals.',
    aggression: 0.55,
    battleCries: ['ITEMIZED DESTRUCTION', 'YOUR DEBIT IS DUE', 'ROUNDING ERROR'],
    attackVerbs: ['AUDITS', 'RECONCILES', 'WRITE-OFFS'],
  },
  cryptid: {
    id: 'cryptid',
    name: 'CRYPTID',
    blurb: 'Blurry. Unclear. Effective.',
    aggression: 0.6,
    battleCries: ['(unsettling fog)', 'YOU DIDN\'T SEE THAT', 'BELIEVE'],
    attackVerbs: ['BLURS INTO', 'MYSTERIOUSLY YEETS', 'SIGHTS'],
  },
  overly_attached: {
    id: 'overly_attached',
    name: 'OVERLY ATTACHED',
    blurb: 'Loves the army. Loves the enemy. Confusing.',
    aggression: 0.5,
    battleCries: ['WE\'RE FAMILY NOW', 'DON\'T LEAVE', 'GROUP HUG… OF DOOM'],
    attackVerbs: ['CLINGS TO', 'LOVE-TACKLES', 'ADOPTS VIOLENTLY'],
  },
};

export const PERSONALITY_IDS = Object.keys(PERSONALITIES) as PersonalityId[];

export interface ArmyMember {
  id: string;
  name: string;
  /** Ridiculous epithet. */
  title: string;
  personality: PersonalityId;
  primaryClass: ClassId | null;
  secondaryClass: ClassId | null;
  race: RaceId;
  level: number;
  xp: number;
  attrs: Attributes;
  /** Used on every 5th auto-level package. */
  primaryStat: AttrId;
  secondaryStat: AttrId;
  hp: number;
  maxHp: number;
  /** Flavor string frozen at graduation. */
  originNote: string;
}

export interface ArmySave {
  version: 1;
  mode: 'army';
  members: ArmyMember[];
  nextId: number;
  /** Shared army XP pool for mass level-ups. */
  armyXp: number;
  battlesWon: number;
  battlesLost: number;
  /** Default auto-level primary/secondary for new recruits if not set. */
  defaultPrimaryStat: AttrId;
  defaultSecondaryStat: AttrId;
  /** Last mass-level mode preference. */
  preferAutoLevel: boolean;
}

const EPITHETS = [
  'THE UNREASONABLE',
  'OF QUESTIONABLE QUESTING',
  'VOID-TOUCHED INTERN',
  'PART-TIME APOCALYPSE',
  'HR DEPARTMENT OF WAR',
  'SNACK LORD',
  'PROFESSIONAL MENACE',
  'SIDE-QUEST CATASTROPHE',
  'TAX-EXEMPT CHAOS',
  'LEGENDARY MIDDLE MANAGEMENT',
  'BARD OF BAD IDEAS',
  'FINAL BOSS ENERGY (INTERN)',
];

const NAMES = [
  'GLOM',
  'PRICKLE',
  'MOSSY',
  'CLANG',
  'WEEVIL',
  'FANGLESS',
  'BOOTY',
  'SQUIRE BAGEL',
  'LORD SNORP',
  'CAPTAIN YEET',
  'DUCHESS CRUMB',
  'SIR REGRETS',
  'NIB',
  'THUNK',
  'PRINCESS PRIZELLA-B-GONE',
];

export function defaultArmySave(): ArmySave {
  return {
    version: 1,
    mode: 'army',
    members: [],
    nextId: 1,
    armyXp: 0,
    battlesWon: 0,
    battlesLost: 0,
    defaultPrimaryStat: 'str',
    defaultSecondaryStat: 'vit',
    preferAutoLevel: true,
  };
}

export function loadArmySave(): ArmySave {
  try {
    const raw = localStorage.getItem(ARMY_SAVE_KEY);
    if (!raw) return defaultArmySave();
    const p = JSON.parse(raw) as Partial<ArmySave>;
    const base = defaultArmySave();
    return {
      ...base,
      ...p,
      version: 1,
      mode: 'army',
      members: Array.isArray(p.members) ? p.members.map(normalizeMember) : [],
      nextId: typeof p.nextId === 'number' ? p.nextId : 1,
      armyXp: typeof p.armyXp === 'number' ? p.armyXp : 0,
      battlesWon: typeof p.battlesWon === 'number' ? p.battlesWon : 0,
      battlesLost: typeof p.battlesLost === 'number' ? p.battlesLost : 0,
      defaultPrimaryStat: (p.defaultPrimaryStat as AttrId) ?? 'str',
      defaultSecondaryStat: (p.defaultSecondaryStat as AttrId) ?? 'vit',
      preferAutoLevel: p.preferAutoLevel !== false,
    };
  } catch {
    return defaultArmySave();
  }
}

export function writeArmySave(data: ArmySave): void {
  try {
    localStorage.setItem(ARMY_SAVE_KEY, JSON.stringify({ ...data, version: 1 }));
  } catch {
    /* ignore */
  }
}

function normalizeMember(m: Partial<ArmyMember>): ArmyMember {
  const attrs = { ...defaultAttrs(), ...(m.attrs ?? {}) };
  const maxHp = recomputeMaxHp(attrs) + Math.max(0, (m.level ?? 20) - 1);
  return {
    id: m.id ?? 'm0',
    name: m.name ?? 'UNKNOWN',
    title: m.title ?? 'THE MYSTERIOUS',
    personality: (m.personality as PersonalityId) ?? 'berserk',
    primaryClass: m.primaryClass ?? null,
    secondaryClass: m.secondaryClass ?? null,
    race: (m.race as RaceId) ?? 'human',
    level: Math.max(1, m.level ?? 20),
    xp: Math.max(0, m.xp ?? 0),
    attrs,
    primaryStat: (m.primaryStat as AttrId) ?? 'str',
    secondaryStat: (m.secondaryStat as AttrId) ?? 'vit',
    maxHp,
    hp: typeof m.hp === 'number' ? Math.min(m.hp, maxHp) : maxHp,
    originNote: m.originNote ?? 'Fell out of a save file.',
  };
}

export function canGraduateToArmy(save: SaveData): boolean {
  return levelFromXp(save.xp) >= ARMY_MIN_LEVEL || save.level >= ARMY_MIN_LEVEL;
}

export function armySize(army: ArmySave): number {
  return army.members.length;
}

function pickPersonality(seed: number): PersonalityId {
  return PERSONALITY_IDS[Math.abs(seed) % PERSONALITY_IDS.length]!;
}

function randomTitle(seed: number): string {
  return EPITHETS[Math.abs(seed * 3) % EPITHETS.length]!;
}

function randomName(seed: number): string {
  return NAMES[Math.abs(seed * 7) % NAMES.length]!;
}

/**
 * Snapshot a crawl hero into the army (does not clear the crawl save).
 * Requires level ≥ 20.
 */
export function graduateHeroToArmy(
  army: ArmySave,
  save: SaveData,
  opts?: {
    name?: string;
    personality?: PersonalityId;
    primaryStat?: AttrId;
    secondaryStat?: AttrId;
  },
): { ok: true; army: ArmySave; member: ArmyMember } | { ok: false; reason: string } {
  if (!canGraduateToArmy(save)) {
    return {
      ok: false,
      reason: `NEED LEVEL ${ARMY_MIN_LEVEL}+ TO JOIN THE ARMY (TRAIN HARDER)`,
    };
  }
  const seed =
    (save.runSeed ?? 1) ^
    (save.level * 9973) ^
    (army.nextId * 131) ^
    Date.now();
  const personality = opts?.personality ?? pickPersonality(seed);
  const name =
    opts?.name?.trim() ||
    `${randomName(seed)} ${save.primaryClass ? classLabel(save).split('/')[0] : 'HERO'}`;
  const attrs = { ...save.attrs };
  const level = Math.max(save.level, levelFromXp(save.xp));
  const maxHp = recomputeMaxHp(attrs) + Math.max(0, level - 1) + save.armor;
  const primaryStat = opts?.primaryStat ?? army.defaultPrimaryStat;
  let secondaryStat = opts?.secondaryStat ?? army.defaultSecondaryStat;
  if (secondaryStat === primaryStat) {
    secondaryStat = ATTR_IDS.find((a) => a !== primaryStat) ?? 'vit';
  }

  const member: ArmyMember = {
    id: `army_${army.nextId}`,
    name,
    title: randomTitle(seed),
    personality,
    primaryClass: save.primaryClass ?? null,
    secondaryClass: save.secondaryClass ?? null,
    race: save.race ?? 'human',
    level,
    xp: save.xp,
    attrs,
    primaryStat,
    secondaryStat,
    maxHp,
    hp: maxHp,
    originNote: `Graduated Lv${level} ${raceLabel(save)} ${classLabel(save)}. Lands: ${(save.landsCleared ?? []).join(',') || 'none'}.`,
  };

  const next: ArmySave = {
    ...army,
    nextId: army.nextId + 1,
    members: [...army.members, member],
  };
  return { ok: true, army: next, member };
}

/** Spawn a ridiculous prefab unit (debug / fun barracks button). */
export function enlistPrefab(
  army: ArmySave,
  classId: ClassId,
  personality: PersonalityId,
  level = ARMY_MIN_LEVEL,
): ArmySave {
  const seed = army.nextId * 999 + classId.length * 13;
  const attrs = defaultAttrs();
  // Pad stats to feel graduated
  for (const id of ATTR_IDS) {
    attrs[id] = 3 + (seed % 5) + Math.floor(level / 5);
  }
  const maxHp = recomputeMaxHp(attrs) + level;
  const member: ArmyMember = {
    id: `army_${army.nextId}`,
    name: randomName(seed),
    title: randomTitle(seed + 1),
    personality,
    primaryClass: classId,
    secondaryClass: null,
    race: 'human',
    level,
    xp: xpToReachLevel(level),
    attrs,
    primaryStat: 'str',
    secondaryStat: 'vit',
    maxHp,
    hp: maxHp,
    originNote: `Prefab menace. Class ${classId}. Born in the barracks vending machine.`,
  };
  return {
    ...army,
    nextId: army.nextId + 1,
    members: [...army.members, member],
  };
}

export function memberPower(m: ArmyMember): number {
  const a = m.attrs;
  return (
    m.level * 3 +
    a.str * 2 +
    a.dex * 2 +
    a.vit +
    a.int * 2 +
    a.lck +
    (m.primaryClass ? 5 : 0)
  );
}

export function armyTotalPower(army: ArmySave): number {
  return army.members.reduce((s, m) => s + memberPower(m), 0);
}

export function personalityOf(m: ArmyMember): PersonalityDef {
  return PERSONALITIES[m.personality] ?? PERSONALITIES.berserk;
}

export function setMemberStatsFocus(
  army: ArmySave,
  memberId: string,
  primary: AttrId,
  secondary: AttrId,
): ArmySave {
  if (primary === secondary) return army;
  return {
    ...army,
    members: army.members.map((m) =>
      m.id === memberId
        ? { ...m, primaryStat: primary, secondaryStat: secondary }
        : m,
    ),
  };
}
