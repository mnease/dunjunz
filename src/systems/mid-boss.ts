/**
 * Mid-tier wardens (minibosses) — permanent kills, mid loot/XP,
 * never land ceremony (bossDefeated, landsCleared, exit portal).
 * Pure helpers for tests + GameScene kill/forgive paths.
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

/** Dunjunz B6 optional den — dual talk/fight. */
export const RULES_LAWYER_ID = 'rules-lawyer';

/** Room where Rules Lawyer is placed (optional — stairs free via hall). */
export const RULES_LAWYER_ROOM_ID = 'b6_side';

/** Authored base HP before threat scale (plan band ~46). */
export const RULES_LAWYER_BASE_HP = 46;

/** Durable flag: talk path resolved den without a kill. */
export const RULES_LAWYER_FORGIVEN_FLAG = 'rules_lawyer_forgiven';

/** Small heal on forgive talk. */
export const RULES_LAWYER_FORGIVE_HEAL = 5;

/** Joke forjing mat on forgive. */
export const RULES_LAWYER_FORGIVE_MAT = 'bone';

/** Sewerz B2 optional den — goose intern. */
export const ASSISTANT_HONK_ID = 'assistant-honk';
export const ASSISTANT_HONK_ROOM_ID = 'sewerz_b2_side';
export const ASSISTANT_HONK_BASE_HP = 50;

/** Woodz deep B2 optional den — wolf intern. */
export const DEPUTY_HOWL_ID = 'deputy-howl';
export const DEPUTY_HOWL_ROOM_ID = 'woodz_b2_side';
export const DEPUTY_HOWL_BASE_HP = 32;

/** Dezertz deep B2 optional den — property manager. */
export const LEASE_WIGHT_ID = 'lease-wight';
export const LEASE_WIGHT_ROOM_ID = 'dezertz_b2_side';
export const LEASE_WIGHT_BASE_HP = 36;

/** P6 ecology elites (non-manager job titles). */
export const ROOT_ALPHA_ID = 'root-alpha';
export const ROOT_ALPHA_ROOM_ID = 'woodz_b1_side';
export const ROOT_ALPHA_BASE_HP = 38;

export const DUNE_STALKER_ID = 'dune-stalker';
export const DUNE_STALKER_ROOM_ID = 'dezertz_b3_side';
export const DUNE_STALKER_BASE_HP = 34;

export const BILGE_BRUTE_ID = 'bilge-brute';
export const BILGE_BRUTE_ROOM_ID = 'sewerz_b3_secret';
export const BILGE_BRUTE_BASE_HP = 42;

/** Known mid-warden entity ids (kind miniboss preferred). */
export const MINIBOSS_IDS: ReadonlySet<string> = new Set([
  FLOOR_CAPTAIN_ID,
  RULES_LAWYER_ID,
  ASSISTANT_HONK_ID,
  DEPUTY_HOWL_ID,
  LEASE_WIGHT_ID,
  ROOT_ALPHA_ID,
  DUNE_STALKER_ID,
  BILGE_BRUTE_ID,
]);

export function isMinibossKind(kind: string): boolean {
  return kind === 'miniboss';
}

export function isMinibossEntity(kind: string, id: string): boolean {
  return kind === 'miniboss' || MINIBOSS_IDS.has(id);
}

/**
 * Dual-path dens (cube-style): idle until hit or chest open.
 * Floor Captain is chase-on-sight — not in this set.
 */
export function isPeacefulMinibossUntilProvoked(id: string): boolean {
  return id === RULES_LAWYER_ID;
}

export function isRulesLawyerForgiven(save: SaveData): boolean {
  return !!save.flags?.[RULES_LAWYER_FORGIVEN_FLAG];
}

/**
 * Skip spawning a mid den entity when already resolved by talk or kill.
 * Kill path uses killListForSpawn; forgive uses this flag check.
 */
export function shouldSkipMinibossSpawn(save: SaveData, id: string): boolean {
  if (id === RULES_LAWYER_ID && isRulesLawyerForgiven(save)) return true;
  return false;
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

export interface MinibossForgiveResult {
  save: SaveData;
  setsBossDefeated: false;
  landsClearedAdded: LandId[];
  opensLandExitPortal: false;
  toast: string;
  dialog: string[];
  heal: number;
  matStackId: string;
  alreadyResolved: boolean;
}

function wardenDisplayName(id: string): string {
  if (id === FLOOR_CAPTAIN_ID) return 'FLOOR CAPTAIN';
  if (id === RULES_LAWYER_ID) return 'RULES LAWYER';
  if (id === ASSISTANT_HONK_ID) return 'ASSISTANT HONK';
  if (id === DEPUTY_HOWL_ID) return 'DEPUTY HOWL';
  if (id === LEASE_WIGHT_ID) return 'LEASE WIGHT';
  if (id === ROOT_ALPHA_ID) return 'ROOT ALPHA';
  if (id === DUNE_STALKER_ID) return 'DUNE STALKER';
  if (id === BILGE_BRUTE_ID) return 'BILGE BRUTE';
  return id.toUpperCase().replace(/-/g, ' ');
}

function wardenKillDialog(id: string): string[] {
  if (id === FLOOR_CAPTAIN_ID) {
    return [
      'THE FLOOR CAPTAIN DROPS HIS CLIPBOARD.',
      '"I WAS ONLY SCHEDULING THE DM\'S CALENDAR…"',
      'NO EXIT PORTAL. STAIRS STILL WORK. GO DEEPER.',
    ];
  }
  if (id === RULES_LAWYER_ID) {
    return [
      'THE RULES LAWYER\'S BINDER SCATTERS.',
      '"THAT WAS… NOT IN THE ERRATA."',
      'NO LAND CLEAR. NO EXIT PORTAL. OPTIONAL DEN DONE.',
    ];
  }
  if (id === ASSISTANT_HONK_ID) {
    return [
      'ASSISTANT HONK DEFLATES. TINY BILL. BIG DRAMA.',
      '"THE ROYAL GOOSE WILL HEAR ABOUT THIS. HONK."',
      'NO LAND CLEAR. PIPES STILL LEAD DEEPER.',
    ];
  }
  if (id === DEPUTY_HOWL_ID) {
    return [
      'DEPUTY HOWL COLLAPSES. UNPAID INTERNSHIP ENDED.',
      '"THE WOLF LORD NEVER FILED MY HOURS…"',
      'OPTIONAL ROOT DEN CLEARED. NO LAND PORTAL.',
    ];
  }
  if (id === LEASE_WIGHT_ID) {
    return [
      'LEASE WIGHT FADES. SECURITY DEPOSIT FORFEIT.',
      '"THAT WAS NOT NORMAL WEAR AND TEAR."',
      'OPTIONAL CRYPT DEN DONE. TOWER STAIRS FREE.',
    ];
  }
  if (id === ROOT_ALPHA_ID) {
    return [
      'ROOT ALPHA FALLS. THE PACK LOSES ITS EDGE.',
      'NO LAND CLEAR. THE WOLF LORD STILL RULES ABOVE.',
    ];
  }
  if (id === DUNE_STALKER_ID) {
    return [
      'DUNE STALKER CRACKS. HEAT SHIMMERS FADE.',
      'OPTIONAL CRYPT ELITE. NO PORTAL. NO LAND CLEAR.',
    ];
  }
  if (id === BILGE_BRUTE_ID) {
    return [
      'BILGE BRUTE SINKS. THE PIPE REMEMBERS.',
      'SECRET DEN CLEARED. GOOSE STILL AWAITS B4.',
    ];
  }
  return ['A WARDEN FALLS.', 'NOT THE LAND BOSS. KEEP GOING.'];
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

  const name = wardenDisplayName(id);

  return {
    save: next,
    setsBossDefeated: false,
    landsClearedAdded: [],
    opensLandExitPortal: false,
    toast: `${name} DOWN — MIDDLE MANAGEMENT CLEARED`,
    dialog: wardenKillDialog(id),
  };
}

/**
 * Talk path for Rules Lawyer: small heal + joke bone mat + durable forgive flag.
 * Never records a kill, never touches land ceremony. Den can skip-spawn after.
 */
export function applyRulesLawyerForgive(save: SaveData): MinibossForgiveResult {
  const beforeBoss = save.bossDefeated;
  const beforeLands = [...(save.landsCleared ?? [])];
  const already =
    isRulesLawyerForgiven(save) || save.killed.includes(RULES_LAWYER_ID);

  if (already) {
    return {
      save: {
        ...save,
        bossDefeated: beforeBoss,
        landsCleared: beforeLands,
      },
      setsBossDefeated: false,
      landsClearedAdded: [],
      opensLandExitPortal: false,
      toast: 'ERRATA ALREADY FILED',
      dialog: [
        'RULES LAWYER: WE ALREADY SETTLED THIS.',
        'SECTION 12B: DO NOT BOTHER ME AGAIN.',
        'WEST TO THE HALL. STAIRS STILL WORK.',
      ],
      heal: 0,
      matStackId: RULES_LAWYER_FORGIVE_MAT,
      alreadyResolved: true,
    };
  }

  const heal = RULES_LAWYER_FORGIVE_HEAL;
  const mat = RULES_LAWYER_FORGIVE_MAT;
  let next: SaveData = {
    ...save,
    hp: Math.min(save.maxHp, save.hp + heal),
    stacks: {
      ...save.stacks,
      [mat]: (save.stacks[mat] ?? 0) + 1,
    },
    flags: {
      ...save.flags,
      [RULES_LAWYER_FORGIVEN_FLAG]: true,
    },
    bossDefeated: beforeBoss,
    landsCleared: beforeLands,
  };

  return {
    save: next,
    setsBossDefeated: false,
    landsClearedAdded: [],
    opensLandExitPortal: false,
    toast: 'FORGIVEN — +HP · BONE ERRATA',
    dialog: [
      'RULES LAWYER: FINE. PROCEDURAL CLEMENCY.',
      'TAKE THIS BONE — CITED AS JOKE MAT.',
      `HEALED +${heal} HP. BINDER CLOSED.`,
      'I WON\'T BE HERE IF YOU RETURN. STAIRS ARE FREE.',
      'NO PORTAL. NO LAND CLEAR. THAT WOULD BE A VIOLATION.',
    ],
    heal,
    matStackId: mat,
    alreadyResolved: false,
  };
}

/** True when kill handling should use mid path (not land-boss ceremony). */
export function shouldApplyMinibossReward(kind: string, id: string): boolean {
  return isMinibossEntity(kind, id);
}
