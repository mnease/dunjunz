/**
 * Progressive creep threat — later lands / deeper floors / more progress = meaner.
 * Pure helpers; GameScene applies at spawn + contact.
 */

import type { LandId, RoomDef, SaveData } from '../types';

/** Base land danger (0 = meadow tutorial). */
export const LAND_THREAT: Record<LandId, number> = {
  surface: 0,
  dunjunz: 1,
  woodz: 2,
  dezertz: 3,
  kingdomz: 4,
  sewerz: 5,
};

/** World progress adds threat on top of land tier. */
export function threatFromSave(save: SaveData): number {
  let t = 0;
  t += Math.min(4, save.landsCleared?.length ?? 0);
  if (save.princessSaved) t += 1;
  if (save.bestBudStage === 'complete') t += 1;
  t += Math.min(3, save.questsCompleted?.length ?? 0);
  if (save.activeQuestId) t += 0; // assigned doesn't buff until complete
  return t;
}

/**
 * Room threat = land tier + depth penalty + half of world progress.
 * Depth: floor 0 = 0, B1 (-1) = +1, B2 (-2) = +2, etc.
 */
export function threatForRoom(
  room: Pick<RoomDef, 'land' | 'floor'> | null | undefined,
  save: SaveData,
): number {
  const land = room?.land ?? 'surface';
  const landTier = LAND_THREAT[land] ?? 0;
  const floor = room?.floor ?? 0;
  const depth = floor < 0 ? Math.abs(floor) : Math.max(0, floor);
  const progress = Math.floor(threatFromSave(save) / 2);
  return landTier + depth + progress;
}

/** Scale base HP by threat. Room overrides are treated as base too. */
export function scaleEnemyHp(baseHp: number, threat: number): number {
  const t = Math.max(0, threat);
  const scaled = baseHp * (1 + 0.18 * t);
  return Math.max(1, Math.round(scaled));
}

/** Contact damage grows slowly with threat. */
export function scaleContactDamage(baseDmg: number, threat: number): number {
  const t = Math.max(0, threat);
  return Math.max(1, baseDmg + Math.floor(t / 2));
}

/** Slight XP bonus in meaner zones so grinding isn't mandatory. */
export function scaleEnemyXp(baseXp: number, threat: number): number {
  const t = Math.max(0, threat);
  return Math.max(1, Math.round(baseXp * (1 + 0.1 * t)));
}
