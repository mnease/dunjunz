/**
 * Hard mode — re-enter cleared dungeons with tougher, shooting creeps.
 * Pure helpers; GameScene owns projectiles + captain promotion.
 */

import type { EntityDef, LandId, SaveData } from '../types';
import { DUNGEON_ENTRANCE } from './portal';

/** Extra threat stacked onto room threat while hard run is active. */
export const HARD_THREAT_BONUS = 5;

/** Lands that support hard mode (must be in landsCleared to unlock). */
export const HARD_MODE_LANDS: LandId[] = [
  'dunjunz',
  'woodz',
  'dezertz',
  'sewerz',
];

/** Where the hard-mode gate spawns (entrance rooms). */
export const HARD_GATE_TILE: Partial<
  Record<LandId, { roomId: string; x: number; y: number }>
> = {
  dunjunz: { roomId: 'b1_entrance', x: 12, y: 5 },
  woodz: { roomId: 'woodz_edge', x: 12, y: 5 },
  dezertz: { roomId: 'dezertz_edge', x: 12, y: 5 },
  sewerz: { roomId: 'sewerz_mouth', x: 12, y: 5 },
};

/** Special portalTarget prefix — not a real room id. */
export const HARD_PORTAL_PREFIX = '__HARD__';
export const HARD_EXIT_TARGET = '__HARD_EXIT__';

export function isHardModeLand(land: LandId | undefined): land is LandId {
  return !!land && HARD_MODE_LANDS.includes(land);
}

/** Land is cleared once → hard mode unlocked for re-entry. */
export function hardModeUnlocked(save: SaveData, land: LandId): boolean {
  if (!isHardModeLand(land)) return false;
  if (land === 'dunjunz' && save.bossDefeated) return true;
  return (save.landsCleared ?? []).includes(land);
}

/** Currently replaying this land on hard. */
export function isHardRunActive(
  save: SaveData,
  land?: LandId | null,
): boolean {
  if (!save.hardRunLand) return false;
  if (land == null) return true;
  return save.hardRunLand === land;
}

export function hardThreatBonus(
  save: SaveData,
  land?: LandId | null,
): number {
  return isHardRunActive(save, land) ? HARD_THREAT_BONUS : 0;
}

/** Kill list used for spawn skip (hard runs use a separate list so rooms re-fill). */
export function killListForSpawn(save: SaveData, land?: LandId): string[] {
  if (isHardRunActive(save, land)) {
    return save.hardKilled ?? [];
  }
  return save.killed ?? [];
}

export function recordKill(save: SaveData, id: string, land?: LandId): SaveData {
  if (isHardRunActive(save, land)) {
    const hardKilled = save.hardKilled ?? [];
    if (hardKilled.includes(id)) return save;
    return { ...save, hardKilled: [...hardKilled, id] };
  }
  if (save.killed.includes(id)) return save;
  return { ...save, killed: [...save.killed, id] };
}

export function startHardRun(save: SaveData, land: LandId): SaveData {
  return {
    ...save,
    hardRunLand: land,
    hardKilled: [],
  };
}

export function endHardRun(save: SaveData): SaveData {
  return {
    ...save,
    hardRunLand: null,
  };
}

export function markHardLandCleared(save: SaveData, land: LandId): SaveData {
  const list = save.hardLandsCleared ?? [];
  if (list.includes(land)) return save;
  return {
    ...save,
    hardLandsCleared: [...list, land],
  };
}

export function hardLandCleared(save: SaveData, land: LandId): boolean {
  return (save.hardLandsCleared ?? []).includes(land);
}

/** Portal entity for hard gate (step-on to start hard run). */
export function hardGatePortalDef(land: LandId): EntityDef | null {
  const meta = HARD_GATE_TILE[land];
  if (!meta) return null;
  return {
    kind: 'portal',
    id: `hard-gate-${land}`,
    x: meta.x,
    y: meta.y,
    portalTarget: `${HARD_PORTAL_PREFIX}${land}`,
    dialog: [
      'HARD MODE GATE — GLOWS MENACINGLY.',
      'CREEPS SHOOT. CREEPS HIT HARDER.',
      'STEP ON TO COMMIT. NO REFUNDS.',
    ],
  };
}

/** Soft exit from hard run back to normal (same room). */
export function hardExitPortalDef(
  land: LandId,
  x = 4,
  y = 5,
): EntityDef {
  return {
    kind: 'portal',
    id: `hard-exit-${land}`,
    x,
    y,
    portalTarget: HARD_EXIT_TARGET,
    dialog: [
      'SOFT EXIT — LEAVE HARD MODE.',
      'CREEPS GO BACK TO NORMAL POLITENESS.',
    ],
  };
}

export function parseHardPortalTarget(
  target: string | undefined,
): { kind: 'start'; land: LandId } | { kind: 'exit' } | null {
  if (!target) return null;
  if (target === HARD_EXIT_TARGET) return { kind: 'exit' };
  if (target.startsWith(HARD_PORTAL_PREFIX)) {
    const land = target.slice(HARD_PORTAL_PREFIX.length) as LandId;
    if (isHardModeLand(land)) return { kind: 'start', land };
  }
  return null;
}

/** Room should show hard gate if unlocked and not currently hard. */
export function shouldSpawnHardGate(
  save: SaveData,
  roomId: string,
  land?: LandId,
): boolean {
  if (!land || !isHardModeLand(land)) return false;
  if (!hardModeUnlocked(save, land)) return false;
  if (isHardRunActive(save, land)) return false;
  const meta = HARD_GATE_TILE[land];
  return !!meta && meta.roomId === roomId;
}

/** Room should show hard exit while hard run active at entrance. */
export function shouldSpawnHardExit(
  save: SaveData,
  roomId: string,
  land?: LandId,
): boolean {
  if (!land || !isHardRunActive(save, land)) return false;
  const meta = HARD_GATE_TILE[land];
  return !!meta && meta.roomId === roomId;
}

/** Beam Me Up destination — dungeon mouth for current land, else overworld. */
export function beamMeUpTarget(
  roomLand: LandId | undefined,
): string {
  if (roomLand && roomLand !== 'surface') {
    return DUNGEON_ENTRANCE[roomLand] ?? 'overworld';
  }
  return 'overworld';
}

/** Projectile kind for hard-mode shooters. */
export type HardProjectileKind = 'arrow' | 'phaser' | 'fireball';

export function hardProjectileForActor(
  kind: string,
  id: string,
): HardProjectileKind | null {
  if (kind === 'skeleton') return 'arrow';
  if (kind === 'redshirt') return 'phaser';
  if (id === 'captain' || id === 'captain-hard') return 'phaser';
  // Dungeon Master / "king" of the dunjun + any boss labeled king
  if (
    kind === 'boss' ||
    id === 'dungeon-master' ||
    id === 'king' ||
    id.includes('king')
  ) {
    return 'fireball';
  }
  return null;
}

export interface ProjectileSpec {
  kind: HardProjectileKind;
  speed: number;
  damage: number;
  texture: string;
  tint: number;
  cooldownMs: number;
  range: number;
}

export function projectileSpec(
  kind: HardProjectileKind,
  threat = 0,
): ProjectileSpec {
  const t = Math.max(0, threat);
  const base: Record<HardProjectileKind, Omit<ProjectileSpec, 'damage'>> = {
    arrow: {
      kind: 'arrow',
      speed: 160,
      texture: 'proj-arrow',
      tint: 0xe8e0d0,
      cooldownMs: 1400,
      range: 220,
    },
    phaser: {
      kind: 'phaser',
      speed: 200,
      texture: 'proj-phaser',
      tint: 0xff3344,
      cooldownMs: 1100,
      range: 240,
    },
    fireball: {
      kind: 'fireball',
      speed: 120,
      texture: 'proj-fireball',
      tint: 0xff8a4c,
      cooldownMs: 1600,
      range: 280,
    },
  };
  const b = base[kind];
  const dmg =
    kind === 'fireball'
      ? 3 + Math.floor(t / 3)
      : kind === 'phaser'
        ? 2 + Math.floor(t / 4)
        : 2 + Math.floor(t / 5);
  return { ...b, damage: Math.max(1, dmg) };
}

/** Room b1_trek: after hard redshirts die, captain becomes boss. */
export const CAPTAIN_HARD_ROOM = 'b1_trek';
export const CAPTAIN_ID = 'captain';
export const REDSHIRT_IDS_TREK = ['ensign-1', 'ensign-2', 'ensign-3'];

export function trekRedshirtsCleared(save: SaveData): boolean {
  const list = save.hardKilled ?? [];
  return REDSHIRT_IDS_TREK.every((id) => list.includes(id));
}

export function shouldPromoteCaptain(
  save: SaveData,
  roomId: string,
): boolean {
  return (
    roomId === CAPTAIN_HARD_ROOM &&
    isHardRunActive(save, 'dunjunz') &&
    trekRedshirtsCleared(save) &&
    !(save.hardKilled ?? []).includes(CAPTAIN_ID) &&
    !(save.hardKilled ?? []).includes('captain-hard')
  );
}
