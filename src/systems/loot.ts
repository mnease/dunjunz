/**
 * Chest + enemy loot → stacks + bag instances.
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

const ARMOR_POOL = [
  'leather_helmet',
  'leather_armor',
  'leather_greaves',
  'leather_shoes',
  'leather_gloves',
  'wood_shield',
  'iron_shield',
];

const WEAPON_POOL = ['mild_sword', 'iron_blade'];

const JEWEL_POOL = [
  'gold_trinket',
  'shiny_bauble',
  'copper_ring',
  'silver_ring',
  'luck_ring',
];

const GEAR_POOL = [...ARMOR_POOL, ...WEAPON_POOL, ...JEWEL_POOL];

function pick<T>(rng: Rng, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)] ?? arr[0];
}

function randomGear(rng: Rng): string {
  return pick(rng, GEAR_POOL);
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
        label: `GEAR: ${tid.toUpperCase().replace(/_/g, ' ')}`,
        templateId: tid,
      });
    }
    // Chance of shield / ring specifically
    if (rng() < 0.35) {
      const tid = rng() < 0.55 ? pick(rng, ['wood_shield', 'iron_shield']) : pick(rng, JEWEL_POOL);
      drops.push({
        kind: 'treasure',
        label: tid.toUpperCase().replace(/_/g, ' '),
        templateId: tid,
      });
    } else {
      const trinket = rng() < 0.5 ? 'gold_trinket' : 'shiny_bauble';
      drops.push({
        kind: 'treasure',
        label: trinket === 'gold_trinket' ? 'GOLD TRINKET' : 'SHINY BAUBLE',
        templateId: trinket,
      });
    }
    return drops;
  },
  boss: (_rng) => [
    { kind: 'coins', label: '80 COINS', coins: 80 },
    {
      kind: 'potion',
      label: 'HEALING POTION x3',
      stackId: 'potion',
      stackCount: 3,
      heal: 8,
    },
    {
      kind: 'gear',
      label: 'REINFORCED BREASTPLATE',
      templateId: 'reinforced_leather',
    },
    {
      kind: 'gear',
      label: 'DUNJUN CLEAVER',
      templateId: 'dunjun_cleaver',
    },
    {
      kind: 'gear',
      label: 'TOWER SHIELD',
      templateId: 'tower_shield',
    },
    {
      kind: 'gear',
      label: 'SILVER RING',
      templateId: 'silver_ring',
    },
    {
      kind: 'treasure',
      label: 'SPARK ORE x3',
      stackId: 'ore_spark',
      stackCount: 3,
    },
    {
      kind: 'treasure',
      label: 'IRON ORE x2',
      stackId: 'ore_iron',
      stackCount: 2,
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

/**
 * Creature-specific parts — each enemy kind can drop its signature mat.
 * Blacksmith salvage/craft recipes can consume these later.
 */
export interface SpeciesLootDef {
  stackId: string;
  label: string;
  /** Base chance before LCK bonus. */
  chance: number;
  countMin?: number;
  countMax?: number;
}

export const ENEMY_SPECIES_LOOT: Record<string, SpeciesLootDef> = {
  slime: { stackId: 'slime_gel', label: 'SLIME GEL', chance: 0.42 },
  skeleton: { stackId: 'bone', label: 'BONE', chance: 0.48, countMax: 2 },
  wolf: { stackId: 'wolf_pelt', label: 'WOLF PELT', chance: 0.45 },
  cactus: {
    stackId: 'cactus_spine',
    label: 'CACTUS SPINE',
    chance: 0.45,
    countMax: 2,
  },
  redshirt: { stackId: 'ensign_badge', label: 'ENSIGN BADGE', chance: 0.38 },
  cube: { stackId: 'slime_gel', label: 'CUBE GOO', chance: 0.55, countMax: 2 },
  boss: {
    stackId: 'ore_spark',
    label: 'SPARK ORE',
    chance: 0.7,
    countMin: 1,
    countMax: 2,
  },
};

/** Optional land / biome mats on top of species parts. */
const ENEMY_BONUS_MAT: Partial<Record<string, string>> = {
  wolf: 'wood_shard',
  cactus: 'sand_crystal',
  skeleton: 'ore_iron',
  slime: 'ore_spark',
};

/**
 * Enemy death drops — coins, occasional gear, and kind-specific parts.
 * LCK increases chance of non-coin loot slightly.
 */
export function rollEnemyLoot(
  kind: string,
  rng: Rng = Math.random,
  lck = 1,
): LootDrop[] {
  const drops: LootDrop[] = [];
  const luck = Math.max(0, lck - 1);

  const coinBase: Record<string, [number, number]> = {
    redshirt: [1, 4],
    slime: [3, 8],
    skeleton: [5, 12],
    wolf: [7, 16],
    cactus: [7, 16],
    cube: [12, 26],
    boss: [30, 60],
  };
  const [lo, hi] = coinBase[kind] ?? [2, 8];
  // ~80% coin drop
  if (rng() < 0.82) {
    const coins = lo + Math.floor(rng() * (hi - lo + 1));
    drops.push({ kind: 'coins', label: `${coins} COINS`, coins });
  }

  // Signature creature part (skeletons → bones, wolves → pelts, …)
  const species = ENEMY_SPECIES_LOOT[kind];
  if (species) {
    const chance = Math.min(0.85, species.chance + luck * 0.03);
    if (rng() < chance) {
      const cMin = species.countMin ?? 1;
      const cMax = species.countMax ?? cMin;
      const stackCount =
        cMin + Math.floor(rng() * (Math.max(cMax, cMin) - cMin + 1));
      drops.push({
        kind: 'treasure',
        label:
          stackCount > 1
            ? `${species.label} x${stackCount}`
            : species.label,
        stackId: species.stackId,
        stackCount,
      });
    }
  }

  // Gear chance scales with threat + LCK
  let gearChance =
    kind === 'boss'
      ? 0.55
      : kind === 'cube'
        ? 0.28
        : kind === 'skeleton' || kind === 'wolf' || kind === 'cactus'
          ? 0.14
          : kind === 'slime'
            ? 0.08
            : 0.05;
  gearChance = Math.min(0.65, gearChance + luck * 0.02);

  if (rng() < gearChance) {
    // Weighted: armor/shield > jewels > weapons
    const roll = rng();
    let tid: string;
    if (roll < 0.28) {
      tid = pick(rng, ['wood_shield', 'iron_shield', 'wood_shield']);
    } else if (roll < 0.48) {
      tid = pick(rng, JEWEL_POOL);
    } else if (roll < 0.68) {
      tid = pick(rng, ARMOR_POOL.filter((id) => !id.includes('shield')));
    } else if (roll < 0.85) {
      tid = pick(rng, WEAPON_POOL);
    } else {
      tid = pick(rng, GEAR_POOL);
    }
    drops.push({
      kind: 'gear',
      label: tid.toUpperCase().replace(/_/g, ' '),
      templateId: tid,
    });
  }

  // Small extra biome / ore chance (on top of species parts)
  if (rng() < 0.12 + luck * 0.02) {
    const mat =
      ENEMY_BONUS_MAT[kind] ?? (rng() < 0.5 ? 'ore_iron' : 'ore_spark');
    drops.push({
      kind: 'treasure',
      label: mat.toUpperCase().replace(/_/g, ' '),
      stackId: mat,
      stackCount: 1,
    });
  }

  // Bosses always leave something if somehow empty
  if (kind === 'boss' && !drops.length) {
    drops.push({ kind: 'coins', label: '20 COINS', coins: 20 });
  }

  return drops;
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
