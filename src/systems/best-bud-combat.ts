/**
 * Best Bud combat — magical Jake-energy friends that actually fight.
 * Pure helpers; GameScene drives movement / hit application.
 */

import type { BestBudId } from '../types';

export type BudAttackStyle =
  | 'stretch' // Gloop — long melee lash
  | 'slash' // Nub — short, fast, hard
  | 'aura' // Whisp — heal player + soft fog tick
  | 'spit' // Tater — medium roast bolt
  | 'blink' // Zorp — hop-strike
  | 'guard'; // Pebbo — slam + block charge

export interface BudCombatProfile {
  style: BudAttackStyle;
  /** Base damage before level scale. */
  baseDamage: number;
  /** Attack cooldown (ms). */
  cooldownMs: number;
  /** Preferred strike distance (world px, post-scale coords). */
  range: number;
  /** Max chase distance from player. */
  leash: number;
  /** Approach speed while engaging. */
  speed: number;
  /** Aggro radius to notice creeps. */
  aggro: number;
  abilityName: string;
  abilityBlurb: string;
}

const PROFILES: Record<BestBudId, BudCombatProfile> = {
  gloop: {
    style: 'stretch',
    baseDamage: 3,
    cooldownMs: 900,
    range: 90,
    leash: 200,
    speed: 0.14,
    aggro: 170,
    abilityName: 'STRETCH LASH',
    abilityBlurb: 'Long-range slap. Very elastic. Very rude.',
  },
  nub: {
    style: 'slash',
    baseDamage: 4,
    cooldownMs: 550,
    range: 48,
    leash: 160,
    speed: 0.18,
    aggro: 140,
    abilityName: 'MIDNIGHT CLAW',
    abilityBlurb: 'Close, fast, judgmental.',
  },
  whisp: {
    style: 'aura',
    baseDamage: 2,
    cooldownMs: 1100,
    range: 70,
    leash: 150,
    speed: 0.12,
    aggro: 160,
    abilityName: 'FOG BITE + COZY AURA',
    abilityBlurb: 'Soft damage + heals you sometimes.',
  },
  tater: {
    style: 'spit',
    baseDamage: 3,
    cooldownMs: 1000,
    range: 110,
    leash: 190,
    speed: 0.11,
    aggro: 180,
    abilityName: 'ROAST SPIT',
    abilityBlurb: 'Medium range. Crispy opinions.',
  },
  zorp: {
    style: 'blink',
    baseDamage: 4,
    cooldownMs: 1200,
    range: 56,
    leash: 220,
    speed: 0.22,
    aggro: 200,
    abilityName: 'POCKET HOP',
    abilityBlurb: 'Blinks onto creeps. Dimensional slap.',
  },
  pebbo: {
    style: 'guard',
    baseDamage: 3,
    cooldownMs: 1300,
    range: 52,
    leash: 140,
    speed: 0.1,
    aggro: 130,
    abilityName: 'COIL SLAM + GUARD',
    abilityBlurb: 'Hits hard and can eat a hit for you.',
  },
};

export function budCombatProfile(id: BestBudId | null | undefined): BudCombatProfile | null {
  if (!id) return null;
  return PROFILES[id] ?? null;
}

/** Level-scaled damage (gentle curve). */
export function budAttackDamage(
  id: BestBudId | null | undefined,
  playerLevel: number,
): number {
  const p = budCombatProfile(id);
  if (!p) return 0;
  const L = Math.max(1, Math.floor(playerLevel));
  // +1 every 3 levels after 1, cap contribution
  const bonus = Math.min(6, Math.floor((L - 1) / 3));
  return Math.max(1, p.baseDamage + bonus);
}

/** Whisp cozy heal amount. */
export function budHealAmount(playerLevel: number): number {
  const L = Math.max(1, Math.floor(playerLevel));
  return L >= 8 ? 2 : 1;
}

export const BUD_HEAL_COOLDOWN_MS = 6500;
export const BUD_BLOCK_COOLDOWN_MS = 9000;

/** Pebbo (or any guard-style bud) can nullify a hit if block is ready. */
export function budCanBlockHit(
  id: BestBudId | null | undefined,
  blockCooldownMs: number,
): boolean {
  const p = budCombatProfile(id);
  if (!p || p.style !== 'guard') return false;
  return blockCooldownMs <= 0;
}

export function hostileEntityKinds(): readonly string[] {
  return [
    'slime',
    'skeleton',
    'redshirt',
    'cube',
    'boss',
    'miniboss',
    'wolf',
    'cactus',
    'scorpion',
    'tarantula',
    'hornet',
  ];
}

export function isHostileKind(kind: string): boolean {
  return hostileEntityKinds().includes(kind);
}
