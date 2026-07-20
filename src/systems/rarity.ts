import type { Rarity } from '../types';

export const RARITY_MULT: Record<Rarity, number> = {
  common: 1.0,
  uncommon: 1.25,
  rare: 1.5,
  epic: 1.85,
  legendary: 2.25,
};

export const RARITY_ORDER: Rarity[] = [
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
];

export function effectivePrimary(
  base: number,
  rarity: Rarity,
  enhancement: number,
): number {
  const e = Math.max(0, Math.min(3, Math.floor(enhancement)));
  return Math.max(0, Math.floor(base * RARITY_MULT[rarity] + e));
}

/**
 * Roll rarity. LCK above 1 shifts weight from common toward rare+.
 */
export function rollRarity(rng: () => number, lck: number): Rarity {
  const shift = Math.min(0.2, Math.max(0, lck - 1) * 0.02);
  const weights: [Rarity, number][] = [
    ['common', Math.max(0.05, 0.6 - shift)],
    ['uncommon', 0.25],
    ['rare', 0.12 + shift * 0.6],
    ['epic', 0.025 + shift * 0.3],
    ['legendary', 0.005 + shift * 0.1],
  ];
  const total = weights.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [rarity, w] of weights) {
    r -= w;
    if (r <= 0) return rarity;
  }
  return 'common';
}

/** Enhancement 0–3; rare+ can roll +1 or +2 more often. */
export function rollEnhancement(rng: () => number, rarity: Rarity): number {
  if (rarity === 'common') return 0;
  if (rarity === 'uncommon') return rng() < 0.3 ? 1 : 0;
  if (rarity === 'rare') return rng() < 0.5 ? 1 : rng() < 0.2 ? 2 : 0;
  if (rarity === 'epic') return 1 + (rng() < 0.4 ? 1 : 0);
  return 2 + (rng() < 0.35 ? 1 : 0);
}

export function rarityLabel(r: Rarity): string {
  return r.toUpperCase();
}
