/**
 * Enemy combat defaults — HP tiers so creeps are not one-shot equal.
 * Player mild sword is ~2 dmg; iron blade ~3; cleaver higher.
 */

export const ENEMY_BASE_HP: Record<string, number> = {
  redshirt: 3, // fragile joke, still 2 hits with mild sword
  slime: 6, // 3 hits mild
  skeleton: 12, // 6 hits mild
  wolf: 14,
  cactus: 16,
  cube: 24, // big gelatinous tank
  boss: 40, // default land-boss floor if room omits hp
};

/** Resolve HP for a spawned enemy (room def may override). */
export function resolveEnemyHp(
  kind: string,
  defHp?: number,
): number {
  if (typeof defHp === 'number' && defHp > 0) return defHp;
  return ENEMY_BASE_HP[kind] ?? 6;
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
