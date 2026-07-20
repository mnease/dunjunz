/**
 * Pure XP / level rules for DUNJUNZ.
 * Callers pass plain numbers — no Phaser dependency.
 */

/** Cumulative XP required to *be* each level (index 0 unused; level 1 = 0 XP). */
export const XP_TO_REACH_LEVEL: readonly number[] = [
  0, // unused
  0, // level 1
  10, // level 2
  25, // level 3
  50, // level 4
  80, // level 5
  120, // level 6
  170, // level 7
  230, // level 8
  300, // level 9
  400, // level 10 (cap for thresholds table)
];

export const MAX_LEVEL = XP_TO_REACH_LEVEL.length - 1;

/** XP awarded when defeating each enemy kind. */
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
}

export interface GrantXpResult extends ProgressState {
  leveledUp: boolean;
  levelsGained: number;
  prevLevel: number;
}

/** Highest level whose threshold is <= xp. */
export function levelFromXp(xp: number): number {
  const safe = Math.max(0, Math.floor(xp));
  let level = 1;
  for (let L = 1; L <= MAX_LEVEL; L++) {
    if (safe >= XP_TO_REACH_LEVEL[L]) level = L;
    else break;
  }
  return level;
}

/** XP needed to reach the next level from current total XP (0 if max). */
export function xpToNext(xp: number): number {
  const level = levelFromXp(xp);
  if (level >= MAX_LEVEL) return 0;
  return XP_TO_REACH_LEVEL[level + 1] - xp;
}

/** Progress within current level band for HUD (xp into band / band size). */
export function xpProgressInLevel(xp: number): { into: number; need: number } {
  const level = levelFromXp(xp);
  if (level >= MAX_LEVEL) {
    return { into: 0, need: 0 };
  }
  const floor = XP_TO_REACH_LEVEL[level];
  const ceil = XP_TO_REACH_LEVEL[level + 1];
  return { into: xp - floor, need: ceil - floor };
}

export function grantXp(state: ProgressState, amount: number): GrantXpResult {
  const gain = Math.max(0, Math.floor(amount));
  const prevLevel = levelFromXp(state.xp);
  const xp = state.xp + gain;
  const level = levelFromXp(xp);
  const levelsGained = Math.max(0, level - prevLevel);
  return {
    xp,
    level,
    prevLevel,
    leveledUp: levelsGained > 0,
    levelsGained,
  };
}

export function enemyXpReward(kind: string): number {
  return ENEMY_XP[kind] ?? 1;
}
