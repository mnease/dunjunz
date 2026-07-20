/**
 * Chest loot → stacks + bag instances (v4).
 */

import type { SaveData } from '../types';
import { autoEquipEmptySlots, syncDerivedStats } from './inventory';
import { mintItem } from './items';
import { rollEnhancement, rollRarity } from './rarity';

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface LootDrop {
  kind: string;
  label: string;
  coins?: number;
  stackId?: string;
  stackCount?: number;
  templateId?: string;
  heal?: number;
}

const GEAR_POOL = [
  'leather_helmet',
  'leather_armor',
  'leather_greaves',
  'leather_shoes',
  'leather_gloves',
  'gold_trinket',
  'shiny_bauble',
];

function randomGear(rng: Rng): string {
  return GEAR_POOL[Math.floor(rng() * GEAR_POOL.length)] ?? 'leather_armor';
}

const TABLES: Record<string, (rng: Rng) => LootDrop[]> = {
  dungeon: (rng) => {
    const coins = 5 + Math.floor(rng() * 12);
    const drops: LootDrop[] = [
      { kind: 'coins', label: `${coins} COINS`, coins },
    ];
    if (rng() < 0.55) {
      drops.push({
        kind: 'potion',
        label: 'HEALING POTION',
        stackId: 'potion',
        stackCount: 1,
        heal: 4,
      });
    } else {
      const tid = randomGear(rng);
      drops.push({
        kind: 'gear',
        label: `GEAR: ${tid.toUpperCase()}`,
        templateId: tid,
      });
    }
    const trinket = rng() < 0.5 ? 'gold_trinket' : 'shiny_bauble';
    drops.push({
      kind: 'treasure',
      label: trinket === 'gold_trinket' ? 'GOLD TRINKET' : 'SHINY BAUBLE',
      templateId: trinket,
    });
    return drops;
  },
  boss: (_rng) => [
    { kind: 'coins', label: '40 COINS', coins: 40 },
    {
      kind: 'potion',
      label: 'HEALING POTION x2',
      stackId: 'potion',
      stackCount: 2,
      heal: 6,
    },
    {
      kind: 'gear',
      label: 'REINFORCED BREASTPLATE',
      templateId: 'reinforced_leather',
    },
    {
      kind: 'treasure',
      label: 'GOLD TRINKET',
      templateId: 'gold_trinket',
    },
  ],
  test_fixed: (_rng) => [
    { kind: 'coins', label: '10 COINS', coins: 10 },
    {
      kind: 'potion',
      label: 'HEALING POTION',
      stackId: 'potion',
      stackCount: 1,
      heal: 4,
    },
    {
      kind: 'gear',
      label: 'LEATHER BREASTPLATE',
      templateId: 'leather_armor',
    },
    {
      kind: 'treasure',
      label: 'GOLD TRINKET',
      templateId: 'gold_trinket',
    },
  ],
};

export function openChest(
  tableId: string,
  rng: Rng = Math.random,
): LootDrop[] {
  return (TABLES[tableId] ?? TABLES.dungeon)(rng);
}

export function applyLootToSave(
  save: SaveData,
  drops: LootDrop[],
  rng: Rng = Math.random,
): SaveData {
  let next: SaveData = {
    ...save,
    stacks: { ...save.stacks },
    bag: [...save.bag],
  };
  let coins = next.coins;
  let hp = next.hp;

  for (const d of drops) {
    if (d.coins) coins += d.coins;
    if (d.heal) hp = Math.min(next.maxHp, hp + d.heal);
    if (d.stackId) {
      const n = d.stackCount ?? 1;
      next.stacks[d.stackId] = (next.stacks[d.stackId] ?? 0) + n;
    }
    if (d.templateId) {
      const rarity = rollRarity(rng, next.attrs.lck);
      const enhancement = rollEnhancement(rng, rarity);
      const m = mintItem(next, d.templateId, rarity, enhancement);
      next = m.save;
    }
  }

  next = {
    ...next,
    coins,
    hp,
  };
  next = autoEquipEmptySlots(next);
  return syncDerivedStats(next);
}

export function lootSummary(drops: LootDrop[]): string[] {
  return drops.map((d) => d.label);
}

// Back-compat for tests that still call applyLootDrops shape
export function applyLootDrops(
  state: {
    coins: number;
    inventory?: Record<string, number>;
    stacks?: Record<string, number>;
    armor: number;
    hp: number;
    maxHp: number;
  },
  drops: LootDrop[],
): {
  coins: number;
  stacks: Record<string, number>;
  bagTemplates: string[];
  armor: number;
  hp: number;
  maxHp: number;
} {
  let coins = state.coins;
  let hp = state.hp;
  const stacks = { ...(state.stacks ?? {}) };
  const bagTemplates: string[] = [];
  for (const d of drops) {
    if (d.coins) coins += d.coins;
    if (d.heal) hp = Math.min(state.maxHp, hp + d.heal);
    if (d.stackId) {
      stacks[d.stackId] = (stacks[d.stackId] ?? 0) + (d.stackCount ?? 1);
    }
    if (d.templateId) bagTemplates.push(d.templateId);
  }
  return {
    coins,
    stacks,
    bagTemplates,
    armor: state.armor,
    hp,
    maxHp: state.maxHp,
  };
}
