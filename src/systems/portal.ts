/**
 * Boss-room exit portals — after clearing a land boss, a quick exit
 * takes you back to that dungeon's entrance (not the overworld meadow).
 */

import type { EntityDef, LandId, SaveData } from '../types';

/** Room id of the dungeon mouth for each adventuring land. */
export const DUNGEON_ENTRANCE: Partial<Record<LandId, string>> = {
  dunjunz: 'b1_entrance',
  woodz: 'woodz_edge',
  dezertz: 'dezertz_edge',
};

/** Boss arena room ids. */
export const BOSS_ROOMS: ReadonlySet<string> = new Set([
  'b2_boss',
  'woodz_deep',
  'dezertz_tower',
]);

/** Tile coords for the portal in each boss room (walkable floor). */
const PORTAL_TILE: Record<string, { x: number; y: number }> = {
  b2_boss: { x: 8, y: 8 },
  woodz_deep: { x: 8, y: 5 },
  dezertz_tower: { x: 6, y: 5 },
};

export function isBossRoom(roomId: string): boolean {
  return BOSS_ROOMS.has(roomId);
}

export function dungeonEntranceForLand(land: LandId | undefined): string | null {
  if (!land || land === 'surface') return null;
  return DUNGEON_ENTRANCE[land] ?? null;
}

/**
 * True when the player has cleared this land's boss and is standing
 * in that boss arena — portal should exist.
 */
export function shouldSpawnBossExitPortal(
  save: SaveData,
  roomId: string,
  land?: LandId,
): boolean {
  if (!isBossRoom(roomId)) return false;
  if (!land || land === 'surface') return false;
  return save.landsCleared.includes(land);
}

/** Build the portal entity for a boss room (or null if not applicable). */
export function bossExitPortalDef(
  roomId: string,
  land: LandId | undefined,
): EntityDef | null {
  const target = dungeonEntranceForLand(land);
  if (!target || !isBossRoom(roomId)) return null;
  const pos = PORTAL_TILE[roomId] ?? { x: 8, y: 7 };
  return {
    kind: 'portal',
    id: `exit-portal-${land}`,
    x: pos.x,
    y: pos.y,
    portalTarget: target,
    dialog: [
      'A SHIMMERING EXIT PORTAL HUMS.',
      'STEP ON IT TO ZIP BACK TO THE',
      'START OF THIS DUNJUN. NEAT.',
    ],
  };
}
