/**
 * Enemy combat defaults — HP tiers so creeps are not one-shot equal.
 * Player mild sword is ~2 dmg; iron blade ~3; cleaver ~5; land creeps
 * (trail / woodz / dezertz) are meant to stay scary after the first dunjun.
 * Threat scaling (later lands / progress) applied via resolveEnemyHp(…, threat).
 */

import { scaleContactDamage, scaleEnemyHp } from './threat';

export const ENEMY_BASE_HP: Record<string, number> = {
  redshirt: 4, // fragile joke; still dies quick
  slime: 12, // trail + halls — several hits even with mid gear
  skeleton: 18, // dungeon mid-tier
  wolf: 26, // woodz — post-dunjun threat
  cactus: 22, // stationary plant — spiky but not a tank boss
  scorpion: 20, // dezertz — stingy mid
  tarantula: 24, // dezertz — fuzzy threat
  hornet: 14, // dezertz — glass cannon flyer
  cube: 30, // gelatinous tank
  miniboss: 36, // mid-warden default (between cube and land boss)
  boss: 48, // default land-boss floor if room omits hp
};

/** Contact damage before armor reduction (min 1 heart after armor). */
export const ENEMY_CONTACT_DAMAGE: Record<string, number> = {
  redshirt: 1,
  slime: 2,
  skeleton: 2,
  wolf: 3,
  cactus: 2, // bump spines
  scorpion: 3,
  tarantula: 3,
  hornet: 2,
  cube: 3,
  miniboss: 3, // elite tier — not full boss 4
  boss: 4,
};

/**
 * Resolve HP for a spawned enemy.
 * `defHp` is a base override (still scaled by threat).
 * `threat` from threatForRoom — 0 = original balance.
 */
export function resolveEnemyHp(
  kind: string,
  defHp?: number,
  threat = 0,
): number {
  const base =
    typeof defHp === 'number' && defHp > 0
      ? defHp
      : (ENEMY_BASE_HP[kind] ?? 8);
  return scaleEnemyHp(base, threat);
}

export function resolveEnemyContactDamage(
  kind: string,
  threat = 0,
): number {
  const base = ENEMY_CONTACT_DAMAGE[kind] ?? 2;
  return scaleContactDamage(base, threat);
}

/** Display label for floating damage / debug. */
export function enemyTierLabel(kind: string): string {
  switch (kind) {
    case 'redshirt':
      return 'ENSIGN';
    case 'slime':
      return 'SLIME';
    case 'skeleton':
      return 'SKELETON';
    case 'cube':
      return 'CUBE';
    case 'wolf':
      return 'WOLF';
    case 'cactus':
      return 'CACTUS';
    case 'scorpion':
      return 'SCORPION';
    case 'tarantula':
      return 'TARANTULA';
    case 'hornet':
      return 'HORNET';
    case 'miniboss':
      return 'WARDEN';
    case 'boss':
      return 'BOSS';
    default:
      return kind.toUpperCase();
  }
}
