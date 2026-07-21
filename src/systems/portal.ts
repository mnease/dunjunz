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

/** Boss arena room → land + kill id (for portal eligibility). */
export const BOSS_ROOM_META: Record<
  string,
  { land: LandId; killId: string }
> = {
  b2_boss: { land: 'dunjunz', killId: 'dungeon-master' },
  woodz_deep: { land: 'woodz', killId: 'wolf-lord' },
  dezertz_tower: { land: 'dezertz', killId: 'sand-wraith' },
};

/** Boss arena room ids. */
export const BOSS_ROOMS: ReadonlySet<string> = new Set(
  Object.keys(BOSS_ROOM_META),
);

/** Tile coords for the portal in each boss room (walkable floor, near exit). */
const PORTAL_TILE: Record<string, { x: number; y: number }> = {
  b2_boss: { x: 8, y: 8 },
  woodz_deep: { x: 8, y: 8 },
  // Near north door out to Dezertz Edge
  dezertz_tower: { x: 8, y: 1 },
};

export function isBossRoom(roomId: string): boolean {
  return BOSS_ROOMS.has(roomId);
}

export function landForBossRoom(roomId: string): LandId | null {
  return BOSS_ROOM_META[roomId]?.land ?? null;
}

export function dungeonEntranceForLand(land: LandId | undefined): string | null {
  if (!land || land === 'surface') return null;
  return DUNGEON_ENTRANCE[land] ?? null;
}

/**
 * True when the player has beaten this room's boss (or land-clear flags)
 * and should see a quick exit portal.
 */
export function shouldSpawnBossExitPortal(
  save: SaveData,
  roomId: string,
  land?: LandId,
): boolean {
  if (!isBossRoom(roomId)) return false;
  const meta = BOSS_ROOM_META[roomId];
  if (!meta) return false;
  const effectiveLand = land ?? meta.land;
  if (save.killed.includes(meta.killId)) return true;
  if (save.landsCleared.includes(effectiveLand)) return true;
  // Dezertz rescue flag (talk path / older saves)
  if (roomId === 'dezertz_tower' && save.princessSaved) return true;
  if (roomId === 'b2_boss' && save.bossDefeated) return true;
  return false;
}

/** Build the portal entity for a boss room (or null if not applicable). */
export function bossExitPortalDef(
  roomId: string,
  land: LandId | undefined,
): EntityDef | null {
  if (!isBossRoom(roomId)) return null;
  const effectiveLand = land ?? landForBossRoom(roomId) ?? undefined;
  const target = dungeonEntranceForLand(effectiveLand);
  if (!target || !effectiveLand) return null;
  const pos = PORTAL_TILE[roomId] ?? { x: 8, y: 7 };
  return {
    kind: 'portal',
    id: `exit-portal-${effectiveLand}`,
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
