/**
 * Pure XP / level rules for DUNJUNZ.
 * No design hard cap on level — curve is unbounded for play.
 * LEVEL_SAFETY_CEILING is loop protection only (corrupt XP), not a gameplay max.
 */

/** Loop safety only — not a design cap players should hit in normal play. */
export const LEVEL_SAFETY_CEILING = 9999;

/**
 * Each level awards one spend package:
 * +2 to one stat of your choice, then +1 to a different stat.
 * `attrPoints` on the save is the count of unspent packages.
 */
export const ATTR_PACKAGES_PER_LEVEL = 1;
/** @deprecated alias — packages per level (was free +1 points). */
export const ATTR_POINTS_PER_LEVEL = ATTR_PACKAGES_PER_LEVEL;

/** Major (+2) then minor (+1) within each package. */
export const LEVEL_UP_MAJOR_BONUS = 2;
export const LEVEL_UP_MINOR_BONUS = 1;

/** XP required to go from level L → L+1. Grows with L. */
export function xpToAdvanceFrom(level: number): number {
  const L = Math.max(1, Math.floor(level));
  return Math.floor(6 + 4 * L + 0.5 * L * L);
}

/** Cumulative XP required to *be* level L (level 1 = 0). */
export function xpToReachLevel(level: number): number {
  const target = Math.max(1, Math.floor(level));
  let sum = 0;
  for (let L = 1; L < target; L++) sum += xpToAdvanceFrom(L);
  return sum;
}

export const ENEMY_XP: Record<string, number> = {
  slime: 3,
  skeleton: 5,
  redshirt: 2,
  cube: 8,
  wolf: 6,
  cactus: 4,
  scorpion: 6,
  tarantula: 7,
  hornet: 5,
  miniboss: 18, // ~2× elite pack; well under land boss 40
  boss: 40,
};

export interface ProgressState {
  xp: number;
  level: number;
  attrPoints?: number;
}

export interface GrantXpResult {
  xp: number;
  level: number;
  leveledUp: boolean;
  levelsGained: number;
  prevLevel: number;
  attrPointsGained: number;
  attrPoints: number;
}

/** Highest level whose cumulative XP threshold is <= xp. */
export function levelFromXp(xp: number): number {
  const safe = Math.max(0, Math.floor(xp));
  let level = 1;
  // Walk until next band costs more than remaining XP
  while (level < LEVEL_SAFETY_CEILING) {
    const needForNext = xpToReachLevel(level + 1);
    if (safe >= needForNext) level += 1;
    else break;
  }
  return level;
}

/** XP still needed for next level (always > 0 under safety ceiling). */
export function xpToNext(xp: number): number {
  const level = levelFromXp(xp);
  if (level >= LEVEL_SAFETY_CEILING) return 0;
  return xpToReachLevel(level + 1) - xp;
}

/** Progress within current level band for HUD. */
export function xpProgressInLevel(xp: number): { into: number; need: number } {
  const level = levelFromXp(xp);
  if (level >= LEVEL_SAFETY_CEILING) return { into: 0, need: 0 };
  const floor = xpToReachLevel(level);
  const ceil = xpToReachLevel(level + 1);
  return { into: xp - floor, need: ceil - floor };
}

export function grantXp(state: ProgressState, amount: number): GrantXpResult {
  const gain = Math.max(0, Math.floor(amount));
  const prevLevel = levelFromXp(state.xp);
  const xp = state.xp + gain;
  const level = levelFromXp(xp);
  const levelsGained = Math.max(0, level - prevLevel);
  const attrPointsGained = levelsGained * ATTR_PACKAGES_PER_LEVEL;
  const attrPoints = (state.attrPoints ?? 0) + attrPointsGained;
  return {
    xp,
    level,
    prevLevel,
    leveledUp: levelsGained > 0,
    levelsGained,
    attrPointsGained,
    attrPoints,
  };
}

export function enemyXpReward(kind: string, threat = 0): number {
  const base = ENEMY_XP[kind] ?? 1;
  if (threat <= 0) return base;
  // Light scale so harder zones still pay out
  return Math.max(1, Math.round(base * (1 + 0.1 * threat)));
}

/** Sample cumulative thresholds for docs/tests. */
export function sampleXpTable(
  max = 20,
): { level: number; cumulative: number; band: number }[] {
  const rows = [];
  for (let L = 1; L <= max; L++) {
    rows.push({
      level: L,
      cumulative: xpToReachLevel(L),
      band: L < max ? xpToAdvanceFrom(L) : 0,
    });
  }
  return rows;
}

/** @deprecated Use LEVEL_SAFETY_CEILING — kept so old imports don't break. */
export const MAX_LEVEL = LEVEL_SAFETY_CEILING;
