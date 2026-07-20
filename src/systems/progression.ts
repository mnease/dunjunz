/**
 * Pure XP / level rules for DUNJUNZ.
 * Formula curve: harder each level, still slice-friendly.
 */

export const MAX_LEVEL = 20;
export const ATTR_POINTS_PER_LEVEL = 2;

/** XP required to go from level L → L+1. */
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

export function levelFromXp(xp: number): number {
  const safe = Math.max(0, Math.floor(xp));
  let level = 1;
  for (let L = 2; L <= MAX_LEVEL; L++) {
    if (safe >= xpToReachLevel(L)) level = L;
    else break;
  }
  return level;
}

export function xpToNext(xp: number): number {
  const level = levelFromXp(xp);
  if (level >= MAX_LEVEL) return 0;
  return xpToReachLevel(level + 1) - xp;
}

export function xpProgressInLevel(xp: number): { into: number; need: number } {
  const level = levelFromXp(xp);
  if (level >= MAX_LEVEL) return { into: 0, need: 0 };
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
  const attrPointsGained = levelsGained * ATTR_POINTS_PER_LEVEL;
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

export function enemyXpReward(kind: string): number {
  return ENEMY_XP[kind] ?? 1;
}

/** Sample cumulative thresholds for docs/tests (levels 1–10). */
export function sampleXpTable(max = 10): { level: number; cumulative: number; band: number }[] {
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
