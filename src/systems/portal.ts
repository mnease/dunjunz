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
  sewerz: 'sewerz_mouth',
};

/** Boss arena room → land + kill id (for portal eligibility). */
export const BOSS_ROOM_META: Record<
  string,
  { land: LandId; killId: string }
> = {
  /** Deep throne (B8); alias b2_boss kept for older portal checks */
  b8_boss: { land: 'dunjunz', killId: 'dungeon-master' },
  b2_boss: { land: 'dunjunz', killId: 'dungeon-master' },
  woodz_deep: { land: 'woodz', killId: 'wolf-lord' },
  dezertz_tower: { land: 'dezertz', killId: 'sand-wraith' },
  sewerz_boss: { land: 'sewerz', killId: 'royal-goose' },
};

/** Boss arena room ids. */
export const BOSS_ROOMS: ReadonlySet<string> = new Set(
  Object.keys(BOSS_ROOM_META),
);

/**
 * Authored tile coords for the boss-exit portal in each arena.
 * Keep clear of:
 * - south door spawn (~8,9) so re-entry does not auto-whoosh
 * - boss / chest / merchant footprints
 * Open floor south-west of center is the standard pad.
 */
const PORTAL_TILE: Record<string, { x: number; y: number }> = {
  // B8 hazards eat mid tiles — SE open floor (south door spawn is ~8,9–10)
  b8_boss: { x: 11, y: 9 },
  b2_boss: { x: 11, y: 9 },
  // Woodz / tower clearings: mid open aisle (walls at x=5 on lower rows)
  woodz_deep: { x: 5, y: 5 },
  dezertz_tower: { x: 5, y: 5 },
  // Goose chamber: west of boss chest
  sewerz_boss: { x: 4, y: 7 },
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
 *
 * Hard runs: land is already cleared, so we only open the exit after the
 * *hard* boss kill is recorded — otherwise the portal spawns on entry and
 * whooshes you out of Throne of Meta immediately.
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

  // Hard mode: land is already cleared — only open exit after hard boss kill.
  // (Inline hardRunLand check to avoid circular import with hard-mode.ts)
  if (save.hardRunLand && save.hardRunLand === effectiveLand) {
    return (save.hardKilled ?? []).includes(meta.killId);
  }

  if (save.killed.includes(meta.killId)) return true;
  if (save.landsCleared.includes(effectiveLand)) return true;
  // Dezertz rescue flag (talk path / older saves)
  if (roomId === 'dezertz_tower' && save.princessSaved) return true;
  if (
    (roomId === 'b8_boss' || roomId === 'b2_boss') &&
    save.bossDefeated
  ) {
    return true;
  }
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
