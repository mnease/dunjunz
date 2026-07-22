/**
 * Mid-tier wardens (minibosses) — permanent kills, mid loot/XP,
 * never land ceremony (bossDefeated, landsCleared, exit portal).
 * Pure helpers for tests + GameScene kill path.
 */

import type { LandId, SaveData } from '../types';
import { recordKill } from './hard-mode';
import { isBossRoom } from './portal';

/** Dunjunz B4 main mid-warden. */
export const FLOOR_CAPTAIN_ID = 'floor-captain';

/** Room where Floor Captain is placed (soft — stairs stay free). */
export const FLOOR_CAPTAIN_ROOM_ID = 'b4_side';

/** Authored base HP before threat scale (plan band ~40). */
export const FLOOR_CAPTAIN_BASE_HP = 40;

/** Known mid-warden entity ids (kind miniboss preferred). */
export const MINIBOSS_IDS: ReadonlySet<string> = new Set([FLOOR_CAPTAIN_ID]);

export function isMinibossKind(kind: string): boolean {
  return kind === 'miniboss';
}

export function isMinibossEntity(kind: string, id: string): boolean {
  return kind === 'miniboss' || MINIBOSS_IDS.has(id);
}

/**
 * Mid kill must never open a land-exit portal.
 * Mid rooms are not in BOSS_ROOM_META; double-check anyway.
 */
export function midBossOpensLandExitPortal(roomId: string): boolean {
  if (isBossRoom(roomId)) return false; // land bosses only via shouldSpawnBossExitPortal
  return false;
}

export interface MinibossKillResult {
  save: SaveData;
  /** Always false for mid path — land ceremony reserved for finals. */
  setsBossDefeated: false;
  /** Always empty — mid never land-clears. */
  landsClearedAdded: LandId[];
  opensLandExitPortal: false;
  toast: string;
  dialog: string[];
}

/**
 * Apply permanent kill + mid feedback flags. Does not mutate land ceremony.
 * Callers must NOT also run applyBossReward / reward*Clear for this entity.
 */
export function applyMinibossKill(
  save: SaveData,
  id: string,
  land?: LandId,
): MinibossKillResult {
  const beforeBoss = save.bossDefeated;
  const beforeLands = [...(save.landsCleared ?? [])];
  let next = recordKill(save, id, land);
  // Hard guarantee: restore ceremony flags if anything else ever touches them
  next = {
    ...next,
    bossDefeated: beforeBoss,
    landsCleared: beforeLands,
  };

  const name =
    id === FLOOR_CAPTAIN_ID ? 'FLOOR CAPTAIN' : id.toUpperCase().replace(/-/g, ' ');

  return {
    save: next,
    setsBossDefeated: false,
    landsClearedAdded: [],
    opensLandExitPortal: false,
    toast: `${name} DOWN — MIDDLE MANAGEMENT CLEARED`,
    dialog:
      id === FLOOR_CAPTAIN_ID
        ? [
            'THE FLOOR CAPTAIN DROPS HIS CLIPBOARD.',
            '"I WAS ONLY SCHEDULING THE DM\'S CALENDAR…"',
            'NO EXIT PORTAL. STAIRS STILL WORK. GO DEEPER.',
          ]
        : [
            'A WARDEN FALLS.',
            'NOT THE LAND BOSS. KEEP GOING.',
          ],
  };
}

/** True when kill handling should use mid path (not land-boss ceremony). */
export function shouldApplyMinibossReward(kind: string, id: string): boolean {
  return isMinibossEntity(kind, id);
}
