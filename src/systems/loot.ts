/**
 * Pure chest loot resolution + application to save-like inventory state.
 */

import type { ItemId, LootKind, SaveData } from '../types';

export interface LootDrop {
  kind: LootKind;
  label: string;
  coins?: number;
  itemId?: ItemId;
  /** Added to save.armor when kind is armor. */
  armorBonus?: number;
  /** HP restored when kind is potion (also adds potion item). */
  heal?: number;
}

export type Rng = () => number;

/** Deterministic RNG from a seed (mulberry32). */
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

/**
 * Loot tables return 2–4 drops. Every table includes at least one path for
 * coins, potion, armor, and treasure across the multi-type set.
 */
const TABLES: Record<string, (rng: Rng) => LootDrop[]> = {
  /** Standard dungeon chest — always multi-type sample. */
  dungeon: (rng) => {
    const coins = 5 + Math.floor(rng() * 12); // 5–16
    const drops: LootDrop[] = [
      { kind: 'coins', label: `${coins} COINS`, coins },
    ];
    // potion or armor weighted
    if (rng() < 0.55) {
      drops.push({
        kind: 'potion',
        label: 'HEALING POTION',
        itemId: 'potion',
        heal: 4,
      });
    } else {
      drops.push({
        kind: 'armor',
        label: 'LEATHER ARMOR (+1 DEF)',
        itemId: 'leather_armor',
        armorBonus: 1,
      });
    }
    // always a treasure trinket
    const trinket: ItemId = rng() < 0.5 ? 'gold_trinket' : 'shiny_bauble';
    drops.push({
      kind: 'treasure',
      label: trinket === 'gold_trinket' ? 'GOLD TRINKET' : 'SHINY BAUBLE',
      itemId: trinket,
    });
    return drops;
  },

  /** Boss chest — richer, guarantees all four kinds. */
  boss: (_rng) => [
    { kind: 'coins', label: '40 COINS', coins: 40 },
    {
      kind: 'potion',
      label: 'HEALING POTION x2',
      itemId: 'potion',
      heal: 6,
    },
    {
      kind: 'armor',
      label: 'REINFORCED LEATHER (+2 DEF)',
      itemId: 'leather_armor',
      armorBonus: 2,
    },
    {
      kind: 'treasure',
      label: 'DENTED CROWN (TREASURE)',
      itemId: 'gold_trinket',
    },
  ],

  /** Fixed table for unit tests — always the same four kinds. */
  test_fixed: (_rng) => [
    { kind: 'coins', label: '10 COINS', coins: 10 },
    {
      kind: 'potion',
      label: 'HEALING POTION',
      itemId: 'potion',
      heal: 4,
    },
    {
      kind: 'armor',
      label: 'LEATHER ARMOR (+1 DEF)',
      itemId: 'leather_armor',
      armorBonus: 1,
    },
    {
      kind: 'treasure',
      label: 'GOLD TRINKET',
      itemId: 'gold_trinket',
    },
  ],
};

export function openChest(
  tableId: string,
  rng: Rng = Math.random,
): LootDrop[] {
  const table = TABLES[tableId] ?? TABLES.dungeon;
  return table(rng);
}

export interface LootableState {
  coins: number;
  inventory: Record<string, number>;
  armor: number;
  hp: number;
  maxHp: number;
}

/** Apply drops to a plain state object (immutable-style return). */
export function applyLootDrops(
  state: LootableState,
  drops: LootDrop[],
): LootableState {
  let coins = state.coins;
  let armor = state.armor;
  let hp = state.hp;
  const maxHp = state.maxHp;
  const inventory = { ...state.inventory };

  for (const d of drops) {
    if (d.coins && d.coins > 0) coins += d.coins;
    if (d.armorBonus && d.armorBonus > 0) armor += d.armorBonus;
    if (d.heal && d.heal > 0) hp = Math.min(maxHp, hp + d.heal);
    if (d.itemId) {
      inventory[d.itemId] = (inventory[d.itemId] ?? 0) + 1;
    }
  }

  return { coins, inventory, armor, hp, maxHp };
}

/** Convenience for full SaveData. */
export function applyLootToSave(save: SaveData, drops: LootDrop[]): SaveData {
  const next = applyLootDrops(
    {
      coins: save.coins,
      inventory: save.inventory,
      armor: save.armor,
      hp: save.hp,
      maxHp: save.maxHp,
    },
    drops,
  );
  return {
    ...save,
    coins: next.coins,
    inventory: next.inventory,
    armor: next.armor,
    hp: next.hp,
    maxHp: next.maxHp,
  };
}

export function lootSummary(drops: LootDrop[]): string[] {
  return drops.map((d) => d.label);
}
