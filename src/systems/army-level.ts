/**
 * Army mass level-up — manual packages or AUTO (ridiculous but rule-bound).
 *
 * AUTO package rule:
 * - Most levels: +2 to lowest stat, +1 to 2nd-lowest (ties broken randomly).
 * - Every 5th level (level % 5 === 0 after the gain): +2 primaryStat, +1 secondaryStat.
 * Round-robin flavor: on non-5th levels, if three+ stats tie for lowest, rotate by level.
 */

import type { AttrId, Attributes } from '../types';
import { ATTR_IDS, recomputeMaxHp } from './attributes';
import {
  LEVEL_UP_MAJOR_BONUS,
  LEVEL_UP_MINOR_BONUS,
  grantXp,
  levelFromXp,
  xpToReachLevel,
} from './progression';
import type { ArmyMember, ArmySave } from './army';

export type ArmyLevelMode = 'auto' | 'manual';

export interface AutoPackageResult {
  attrs: Attributes;
  major: AttrId;
  minor: AttrId;
  note: string;
}

function sortedByStat(
  attrs: Attributes,
  rng: () => number,
): AttrId[] {
  const entries = ATTR_IDS.map((id) => ({ id, v: attrs[id] }));
  // Stable-ish: shuffle ties with rng
  entries.sort((a, b) => {
    if (a.v !== b.v) return a.v - b.v;
    return rng() < 0.5 ? -1 : 1;
  });
  return entries.map((e) => e.id);
}

/**
 * Apply one +2/+1 package to attrs using auto rules for a unit at `newLevel`.
 */
export function applyAutoPackage(
  attrs: Attributes,
  newLevel: number,
  primaryStat: AttrId,
  secondaryStat: AttrId,
  rng: () => number = Math.random,
): AutoPackageResult {
  const next = { ...attrs };

  // Every 5th level: player-defined primary / secondary
  if (newLevel > 0 && newLevel % 5 === 0) {
    let major = primaryStat;
    let minor = secondaryStat;
    if (major === minor) {
      minor = ATTR_IDS.find((a) => a !== major) ?? 'vit';
    }
    next[major] += LEVEL_UP_MAJOR_BONUS;
    next[minor] += LEVEL_UP_MINOR_BONUS;
    return {
      attrs: next,
      major,
      minor,
      note: `L${newLevel} FOCUS: +2 ${major.toUpperCase()} / +1 ${minor.toUpperCase()}`,
    };
  }

  // Lowest +2, second-lowest +1 (round-robin among ties via rng + level salt)
  const ordered = sortedByStat(attrs, () => {
    // mix level into tie-break for "round robin every 5"
    return (rng() + (newLevel % 5) * 0.01) % 1;
  });
  const major = ordered[0]!;
  let minor = ordered[1]!;
  if (minor === major) {
    minor = ordered[2] ?? ATTR_IDS.find((a) => a !== major)!;
  }
  next[major] += LEVEL_UP_MAJOR_BONUS;
  next[minor] += LEVEL_UP_MINOR_BONUS;
  return {
    attrs: next,
    major,
    minor,
    note: `L${newLevel} AUTO: +2 ${major.toUpperCase()} (lowest) / +1 ${minor.toUpperCase()}`,
  };
}

export function applyManualPackage(
  attrs: Attributes,
  major: AttrId,
  minor: AttrId,
): Attributes | null {
  if (major === minor) return null;
  if (!ATTR_IDS.includes(major) || !ATTR_IDS.includes(minor)) return null;
  return {
    ...attrs,
    [major]: attrs[major] + LEVEL_UP_MAJOR_BONUS,
    [minor]: attrs[minor] + LEVEL_UP_MINOR_BONUS,
  };
}

function refreshHp(m: ArmyMember): ArmyMember {
  const maxHp = recomputeMaxHp(m.attrs) + Math.max(0, m.level - 1);
  return {
    ...m,
    maxHp,
    hp: maxHp,
  };
}

/** Grant enough XP for one level and apply one package (auto or manual). */
export function levelMemberOnce(
  m: ArmyMember,
  mode: ArmyLevelMode,
  manual?: { major: AttrId; minor: AttrId },
  rng: () => number = Math.random,
): { member: ArmyMember; note: string } | { error: string } {
  const need = xpToReachLevel(m.level + 1);
  // Force exactly one level band (army mass-level ignores partial XP)
  void grantXp({ xp: m.xp, level: m.level }, Math.max(1, need - m.xp));
  const newLevel = m.level + 1;
  const newXp = xpToReachLevel(newLevel);

  if (mode === 'manual') {
    if (!manual) return { error: 'PICK +2 AND +1 STATS' };
    const attrs = applyManualPackage(m.attrs, manual.major, manual.minor);
    if (!attrs) return { error: 'MAJOR AND MINOR MUST DIFFER' };
    const member = refreshHp({
      ...m,
      level: newLevel,
      xp: newXp,
      attrs,
    });
    return {
      member,
      note: `${m.name}: L${newLevel} MANUAL +2 ${manual.major.toUpperCase()} / +1 ${manual.minor.toUpperCase()}`,
    };
  }

  const auto = applyAutoPackage(
    m.attrs,
    newLevel,
    m.primaryStat,
    m.secondaryStat,
    rng,
  );
  const member = refreshHp({
    ...m,
    level: newLevel,
    xp: newXp,
    attrs: auto.attrs,
  });
  return { member, note: `${m.name}: ${auto.note}` };
}

/**
 * Level the entire army by one level each (endgame absurdity).
 * Costs nothing but dignity.
 */
export function levelEntireArmy(
  army: ArmySave,
  mode: ArmyLevelMode,
  manual?: { major: AttrId; minor: AttrId },
  rng: () => number = Math.random,
): { army: ArmySave; log: string[] } | { error: string } {
  if (!army.members.length) {
    return { error: 'ARMY EMPTY — GRADUATE A L20+ HERO FIRST' };
  }
  if (mode === 'manual' && !manual) {
    return { error: 'MANUAL MODE NEEDS +2 AND +1 STATS' };
  }

  const log: string[] = [`ARMY MASS LEVEL-UP (${mode.toUpperCase()})`];
  const members: ArmyMember[] = [];
  for (const m of army.members) {
    const r = levelMemberOnce(m, mode, manual, rng);
    if ('error' in r) return { error: r.error };
    members.push(r.member);
    log.push(r.note);
  }
  return {
    army: {
      ...army,
      members,
      preferAutoLevel: mode === 'auto',
    },
    log,
  };
}

/** Level a single member by id. */
export function levelOneInArmy(
  army: ArmySave,
  memberId: string,
  mode: ArmyLevelMode,
  manual?: { major: AttrId; minor: AttrId },
  rng: () => number = Math.random,
): { army: ArmySave; note: string } | { error: string } {
  const idx = army.members.findIndex((m) => m.id === memberId);
  if (idx < 0) return { error: 'UNIT NOT FOUND' };
  const r = levelMemberOnce(army.members[idx]!, mode, manual, rng);
  if ('error' in r) return r;
  const members = [...army.members];
  members[idx] = r.member;
  return { army: { ...army, members }, note: r.note };
}

export function memberLevelLabel(m: ArmyMember): string {
  return `Lv${m.level} ${m.primaryClass ?? 'adventurer'}`;
}

/** XP still needed — for UI. */
export function memberXpIntoLevel(m: ArmyMember): { into: number; need: number } {
  const floor = xpToReachLevel(m.level);
  const ceil = xpToReachLevel(m.level + 1);
  return { into: Math.max(0, m.xp - floor), need: ceil - floor };
}

export function levelsFromXpSafe(xp: number): number {
  return levelFromXp(xp);
}
