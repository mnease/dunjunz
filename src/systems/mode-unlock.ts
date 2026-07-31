/**
 * Title-screen mode gates — new players only start Dunjunz.
 * Humanz unlocks after Tutorial Guild graduation.
 * Army unlocks at L20+ (or if an army already exists).
 */

import type { SaveData } from '../types';
import { ARMY_MIN_LEVEL, canGraduateToArmy } from './army';
import type { GameModeId } from './humanz-save';
import { isTutorialComplete } from './tutorial';

export type ModeUnlockContext = {
  save: SaveData;
  hasHumanzProgress: boolean;
  armyMemberCount: number;
};

/** Dunjunz always; Humanz after guild; Army with roster or L20+ graduate. */
export function isGameModeUnlocked(
  mode: GameModeId,
  ctx: ModeUnlockContext,
): boolean {
  if (mode === 'dunjunz') return true;
  if (mode === 'humanz') {
    if (ctx.hasHumanzProgress) return true;
    return isTutorialComplete(ctx.save);
  }
  if (mode === 'army') {
    if (ctx.armyMemberCount > 0) return true;
    return canGraduateToArmy(ctx.save);
  }
  return false;
}

export function gameModeLockedToast(mode: GameModeId): string {
  if (mode === 'humanz') {
    return 'LOCKED — FINISH THE TUTORIAL GUILD FIRST';
  }
  if (mode === 'army') {
    return `LOCKED — GRADUATE A HERO AT LV${ARMY_MIN_LEVEL}+ (PRESS P IN CRAWL)`;
  }
  return 'MODE LOCKED';
}

export function gameModeLockHint(mode: GameModeId): string {
  if (mode === 'humanz') {
    return 'LOCKED · finish Tutorial Guild in Dunjunz first';
  }
  if (mode === 'army') {
    return `LOCKED · train a hero to Lv${ARMY_MIN_LEVEL}+ then press P`;
  }
  return 'LOCKED';
}

/** Move cursor to next unlocked mode (wraps). */
export function nextUnlockedModeIndex(
  from: number,
  dir: 1 | -1,
  unlocked: boolean[],
): number {
  const n = unlocked.length;
  if (n === 0) return 0;
  let i = from;
  for (let step = 0; step < n; step++) {
    i = (i + dir + n) % n;
    if (unlocked[i]) return i;
  }
  return unlocked.findIndex(Boolean) >= 0 ? unlocked.findIndex(Boolean) : 0;
}
