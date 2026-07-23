/**
 * Loot boxes — achievement drops + tutorial starter kit.
 * Tiers: bronze (common) → silver → gold → platinum → diamond (legendary rare).
 */

import type { Rarity, SaveData } from '../types';
import { mintItem, getTemplate } from './items';
import type { AchievementDef } from './achievements';
import { openLegendaryElvenBox } from './elfwood';

export type LootBoxTier =
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'diamond';

export const LOOT_BOX_TIERS: readonly LootBoxTier[] = [
  'bronze',
  'silver',
  'gold',
  'platinum',
  'diamond',
] as const;

/** Template id for a random-tier loot box. */
export function lootBoxTemplateId(tier: LootBoxTier): string {
  return `loot_box_${tier}`;
}

export const CRAWLER_STARTER_BOX_ID = 'crawler_starter_box';

export const STARTER_BOX_CONTENTS: readonly string[] = [
  'mild_sword',
  'leather_helmet',
  'leather_armor',
  'leather_gloves',
  'leather_greaves',
  'leather_shoes',
  'wood_shield',
];

/** Weighted roll weights (higher = more common). */
export const LOOT_BOX_TIER_WEIGHTS: Record<LootBoxTier, number> = {
  bronze: 55,
  silver: 25,
  gold: 12,
  platinum: 6,
  diamond: 2,
};

/** Gear pools per tier (template ids). */
export const LOOT_BOX_POOLS: Record<LootBoxTier, readonly string[]> = {
  bronze: [
    'mild_sword',
    'training_axe',
    'leather_helmet',
    'leather_armor',
    'leather_greaves',
    'leather_shoes',
    'leather_gloves',
    'wood_shield',
    'potion',
  ],
  silver: [
    'iron_blade',
    'battle_axe',
    'iron_hatchet',
    'short_bow',
    'reinforced_leather',
    'iron_shield',
    'copper_ring',
    'potion',
  ],
  gold: [
    'sand_saber',
    'great_axe',
    'long_bow',
    'hunter_crossbow',
    'wizard_staff',
    'fighter_plate',
    'plate_helm',
    'silver_ring',
    'gold_trinket',
  ],
  platinum: [
    'dunjun_cleaver',
    'magic_bow',
    'staff_lightning',
    'staff_fire',
    'staff_ice',
    'tower_shield',
    'plate_greaves',
    'shiny_bauble',
    'luck_ring',
  ],
  diamond: [
    'honk_blade',
    'phaser',
    'magic_bow',
    'staff_lightning',
    'staff_fire',
    'staff_ice',
    'tower_shield',
    'cube_core',
    'luck_ring',
  ],
};

const TIER_RARITY: Record<LootBoxTier, Rarity> = {
  bronze: 'common',
  silver: 'uncommon',
  gold: 'rare',
  platinum: 'epic',
  diamond: 'legendary',
};

export function isLootBoxTemplateId(id: string): boolean {
  if (id === CRAWLER_STARTER_BOX_ID) return true;
  if (id === 'legendary_elven_box') return true;
  return LOOT_BOX_TIERS.some((t) => lootBoxTemplateId(t) === id);
}

export function lootBoxTierFromTemplate(
  templateId: string,
): LootBoxTier | null {
  for (const t of LOOT_BOX_TIERS) {
    if (lootBoxTemplateId(t) === templateId) return t;
  }
  return null;
}

export type Rng = () => number;

/** Pick a tier from weights. */
export function rollLootBoxTier(rng: Rng = Math.random): LootBoxTier {
  const total = LOOT_BOX_TIERS.reduce(
    (s, t) => s + LOOT_BOX_TIER_WEIGHTS[t],
    0,
  );
  let r = rng() * total;
  for (const t of LOOT_BOX_TIERS) {
    r -= LOOT_BOX_TIER_WEIGHTS[t];
    if (r <= 0) return t;
  }
  return 'bronze';
}

/** Grant one random-tier box into stacks. */
export function grantRandomLootBox(
  save: SaveData,
  rng: Rng = Math.random,
): { save: SaveData; tier: LootBoxTier; templateId: string } {
  const tier = rollLootBoxTier(rng);
  const templateId = lootBoxTemplateId(tier);
  const stacks = { ...save.stacks };
  stacks[templateId] = (stacks[templateId] ?? 0) + 1;
  return {
    save: { ...save, stacks },
    tier,
    templateId,
  };
}

/** Grant the fixed bronze Crawler Starter Box (once per flag). */
export function grantCrawlerStarterBox(save: SaveData): {
  save: SaveData;
  granted: boolean;
} {
  if (save.flags?.got_crawler_starter_box) {
    return { save, granted: false };
  }
  const stacks = { ...save.stacks };
  stacks[CRAWLER_STARTER_BOX_ID] = (stacks[CRAWLER_STARTER_BOX_ID] ?? 0) + 1;
  return {
    granted: true,
    save: {
      ...save,
      stacks,
      flags: { ...save.flags, got_crawler_starter_box: true },
    },
  };
}

function pickFromPool(
  pool: readonly string[],
  count: number,
  rng: Rng,
): string[] {
  if (!pool.length || count <= 0) return [];
  const out: string[] = [];
  const bag = [...pool];
  for (let i = 0; i < count && bag.length; i++) {
    const idx = Math.floor(rng() * bag.length);
    const [id] = bag.splice(idx, 1);
    if (id) out.push(id);
  }
  // If we need more than unique pool size, allow repeats from original
  while (out.length < count) {
    out.push(pool[Math.floor(rng() * pool.length)]!);
  }
  return out;
}

export interface LootRevealItem {
  templateId: string;
  name: string;
  qty?: number;
}

export type OpenLootBoxResult =
  | {
      ok: true;
      save: SaveData;
      message: string;
      /** Display names (with qty suffix). */
      granted: string[];
      /** Parallel template ids for big-icon reveal UI. */
      grantedItems: LootRevealItem[];
      boxName: string;
      boxTemplateId: string;
    }
  | { ok: false; save: SaveData; reason: string };

/**
 * Open a loot box stack (starter or tiered).
 * Consumes one stack; mints gear into bag (potions as stacks).
 */
export function openLootBox(
  save: SaveData,
  templateId: string,
  rng: Rng = Math.random,
): OpenLootBoxResult {
  const count = save.stacks[templateId] ?? 0;
  if (count <= 0) {
    return { ok: false, save, reason: 'NO LOOT BOX' };
  }
  if (!isLootBoxTemplateId(templateId)) {
    return { ok: false, save, reason: 'NOT A LOOT BOX' };
  }

  // Queen of the Wood Elves — one random legendary mithril
  if (templateId === 'legendary_elven_box') {
    return openLegendaryElvenBox(save, rng);
  }

  const boxName = getTemplate(templateId).name;
  const stacks = { ...save.stacks };
  stacks[templateId] = count - 1;
  if (stacks[templateId]! <= 0) delete stacks[templateId];
  let next: SaveData = { ...save, stacks };

  let grants: string[];
  let rarity: Rarity = 'common';

  if (templateId === CRAWLER_STARTER_BOX_ID) {
    grants = [...STARTER_BOX_CONTENTS];
    rarity = 'common';
  } else {
    const tier = lootBoxTierFromTemplate(templateId)!;
    rarity = TIER_RARITY[tier];
    const pool = LOOT_BOX_POOLS[tier];
    const n = tier === 'bronze' ? 2 : tier === 'silver' ? 2 : tier === 'gold' ? 3 : 3;
    grants = pickFromPool(pool, n, rng);
  }

  const grantedNames: string[] = [];
  const grantedItems: LootRevealItem[] = [];
  for (const tid of grants) {
    const t = getTemplate(tid);
    if (t.stackable || t.kind === 'consumable') {
      const qty = tid === 'potion' ? 2 : 1;
      const st = { ...next.stacks };
      st[tid] = (st[tid] ?? 0) + qty;
      next = { ...next, stacks: st };
      grantedNames.push(t.name + (qty > 1 ? ` x${qty}` : ''));
      grantedItems.push({ templateId: tid, name: t.name, qty });
    } else {
      const minted = mintItem(next, tid, rarity, 0);
      // Permanent loot — never strip as guild rack loaners
      const keep = { ...minted.instance, guildLoaner: false as const };
      next = {
        ...minted.save,
        bag: minted.save.bag.map((b) => (b.uid === keep.uid ? keep : b)),
      };
      grantedNames.push(t.name);
      grantedItems.push({ templateId: tid, name: t.name });
    }
  }

  return {
    ok: true,
    save: next,
    boxName,
    boxTemplateId: templateId,
    granted: grantedNames,
    grantedItems,
    message: `OPENED ${boxName} — ${grantedNames.join(', ')}`,
  };
}

/**
 * On new brag unlocks: grant one weighted-tier loot box per unlock.
 */
export function grantLootBoxesForAchievements(
  save: SaveData,
  newly: readonly AchievementDef[],
  rng: Rng = Math.random,
): {
  save: SaveData;
  boxes: { tier: LootBoxTier; title: string }[];
} {
  if (!newly.length) return { save, boxes: [] };
  let next = save;
  const boxes: { tier: LootBoxTier; title: string }[] = [];
  for (const a of newly) {
    const g = grantRandomLootBox(next, rng);
    next = g.save;
    boxes.push({ tier: g.tier, title: a.title });
  }
  return { save: next, boxes };
}

export function tierLabel(tier: LootBoxTier): string {
  return tier.toUpperCase();
}
