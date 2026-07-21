/**
 * Enemy combat defaults — HP tiers so creeps are not one-shot equal.
 * Player mild sword is ~2 dmg; iron blade ~3; cleaver ~5; land creeps
 * (trail / woodz / dezertz) are meant to stay scary after the first dunjun.
 */

export const ENEMY_BASE_HP: Record<string, number> = {
  redshirt: 4, // fragile joke; still dies quick
  slime: 12, // trail + halls — several hits even with mid gear
  skeleton: 18, // dungeon mid-tier
  wolf: 26, // woodz — post-dunjun threat
  cactus: 28, // dezertz — tanky spines
  cube: 30, // gelatinous tank
  boss: 48, // default land-boss floor if room omits hp
};

/** Contact damage before armor reduction (min 1 heart after armor). */
export const ENEMY_CONTACT_DAMAGE: Record<string, number> = {
  redshirt: 1,
  slime: 2,
  skeleton: 2,
  wolf: 3,
  cactus: 3,
  cube: 3,
  boss: 4,
};

/** Resolve HP for a spawned enemy (room def may override). */
export function resolveEnemyHp(
  kind: string,
  defHp?: number,
): number {
  if (typeof defHp === 'number' && defHp > 0) return defHp;
  return ENEMY_BASE_HP[kind] ?? 8;
}

export function resolveEnemyContactDamage(kind: string): number {
  return ENEMY_CONTACT_DAMAGE[kind] ?? 2;
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
    case 'boss':
      return 'BOSS';
    default:
      return kind.toUpperCase();
  }
}
