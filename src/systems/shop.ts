/**
 * Merchant purchase — stacks or minted gear (v4).
 * Graphic shop grid uses iconId for UI cells.
 */

import type { SaveData } from '../types';
import { autoEquipEmptySlots, syncDerivedStats } from './inventory';
import { mintItem } from './items';

export interface ShopItem {
  id: string;
  name: string;
  price: number;
  /** Stackable consumable id. */
  stackId?: string;
  /** How many stacks to grant (default 1). */
  stackCount?: number;
  /** Gear template to mint. */
  templateId?: string;
  heal?: number;
  description: string;
  /** Texture key fragment: icon_${iconId} */
  iconId: string;
}

export interface ShopDef {
  id: string;
  name: string;
  greeting: string[];
  stock: ShopItem[];
}

export const SHOPS: Record<string, ShopDef> = {
  tinkerer: {
    id: 'tinkerer',
    name: 'TRAVELING TINKERER',
    greeting: [
      'TINKERER: RARE WARES! FAIR-ISH PRICES!',
      'E OPEN SHOP · CLICK A SLOT · ENTER BUY',
    ],
    stock: [
      {
        id: 'buy_potion',
        name: 'HEALING POTION',
        price: 15,
        stackId: 'potion',
        heal: 4,
        iconId: 'potion',
        description: 'Restores a few hearts. Smells like mint.',
      },
      {
        id: 'buy_potion_3',
        name: 'POTION PACK x3',
        price: 40,
        stackId: 'potion',
        stackCount: 3,
        iconId: 'potion',
        description: 'Three potions. Bulk discount, kind of.',
      },
      {
        id: 'buy_oil',
        name: 'TINKER OIL',
        price: 20,
        stackId: 'tinker_oil',
        iconId: 'tinker_oil',
        description: 'Keeps hinges quiet and skelebones squeaky.',
      },
      {
        id: 'buy_gloves',
        name: 'LEATHER GLOVES',
        price: 35,
        templateId: 'leather_gloves',
        iconId: 'leather_gloves',
        description: 'One more layer between you and regret.',
      },
      {
        id: 'buy_helmet',
        name: 'LEATHER CAP',
        price: 30,
        templateId: 'leather_helmet',
        iconId: 'leather_helmet',
        description: 'Stops light bonks. Heavy ones still hurt.',
      },
      {
        id: 'buy_shoes',
        name: 'LEATHER BOOTS',
        price: 28,
        templateId: 'leather_shoes',
        iconId: 'leather_shoes',
        description: 'Better than bare feet in a dunjun.',
      },
      {
        id: 'buy_armor',
        name: 'LEATHER BREASTPLATE',
        price: 45,
        templateId: 'leather_armor',
        iconId: 'leather_armor',
        description: 'Fashionable protection. Mostly.',
      },
      {
        id: 'buy_trinket',
        name: 'GOLD TRINKET',
        price: 50,
        templateId: 'gold_trinket',
        iconId: 'gold_trinket',
        description: 'Amulet. +DEF. Shiny enough to distract wolves.',
      },
      {
        id: 'buy_wood_shield',
        name: 'WOOD SHIELD',
        price: 32,
        templateId: 'wood_shield',
        iconId: 'wood_shield',
        description: 'Shield slot. Better than blocking with your face.',
      },
      {
        id: 'buy_iron_shield',
        name: 'IRON SHIELD',
        price: 55,
        templateId: 'iron_shield',
        iconId: 'iron_shield',
        description: 'Shield slot. Proper iron. Heavy pride.',
      },
      {
        id: 'buy_copper_ring',
        name: 'COPPER RING',
        price: 28,
        templateId: 'copper_ring',
        iconId: 'copper_ring',
        description: 'Ring slot. Cheap shine, real DEF.',
      },
      {
        id: 'buy_silver_ring',
        name: 'SILVER RING',
        price: 48,
        templateId: 'silver_ring',
        iconId: 'silver_ring',
        description: 'Ring slot. Tinkerer swears it is real silver.',
      },
      {
        id: 'buy_iron',
        name: 'IRON ORE',
        price: 25,
        stackId: 'ore_iron',
        iconId: 'ore_iron',
        description: 'Forjing material. Heavy for its size.',
      },
      {
        id: 'buy_spark',
        name: 'SPARK ORE',
        price: 35,
        stackId: 'ore_spark',
        iconId: 'ore_spark',
        description: 'Magic dust for forjing imbues.',
      },
      {
        id: 'buy_wood',
        name: 'WOOD SHARD',
        price: 18,
        stackId: 'wood_shard',
        iconId: 'wood_shard',
        description: 'From the woodz. Good kindling / handles.',
      },
      {
        id: 'buy_sand',
        name: 'SAND CRYSTAL',
        price: 30,
        stackId: 'sand_crystal',
        iconId: 'sand_crystal',
        description: 'Dezertz glass. Hisses near forjes.',
      },
    ],
  },
};

export type PurchaseResult =
  | { ok: true; save: SaveData; item: ShopItem }
  | {
      ok: false;
      reason: 'insufficient_funds' | 'not_in_stock' | 'unknown_shop';
      save: SaveData;
    };

export function getShop(shopId: string): ShopDef | undefined {
  return SHOPS[shopId];
}

export function attemptPurchase(
  save: SaveData,
  shopId: string,
  itemId: string,
): PurchaseResult {
  const shop = SHOPS[shopId];
  if (!shop) return { ok: false, reason: 'unknown_shop', save };
  const item = shop.stock.find((s) => s.id === itemId);
  if (!item) return { ok: false, reason: 'not_in_stock', save };
  if (save.coins < item.price) {
    return { ok: false, reason: 'insufficient_funds', save };
  }

  let next: SaveData = {
    ...save,
    coins: save.coins - item.price,
    stacks: { ...save.stacks },
  };
  if (item.stackId) {
    const n = item.stackCount ?? 1;
    next.stacks[item.stackId] = (next.stacks[item.stackId] ?? 0) + n;
  }
  if (item.heal) {
    // Instant heal only for single potion SKU (pack is inventory only)
    if (!item.stackCount || item.stackCount === 1) {
      next.hp = Math.min(next.maxHp, next.hp + item.heal);
    }
  }
  if (item.templateId) {
    const m = mintItem(next, item.templateId, 'common', 0);
    next = m.save;
  }
  next = autoEquipEmptySlots(next);
  next = syncDerivedStats(next);
  return { ok: true, save: next, item };
}

export function attemptFeaturedPurchase(
  save: SaveData,
  shopId: string,
): PurchaseResult {
  const shop = SHOPS[shopId];
  if (!shop?.stock.length) {
    return { ok: false, reason: 'unknown_shop', save };
  }
  return attemptPurchase(save, shopId, shop.stock[0].id);
}

export function shopCatalogLines(shopId: string): string[] {
  const shop = SHOPS[shopId];
  if (!shop) return ['NO SHOP HERE.'];
  const lines = [...shop.greeting];
  for (const s of shop.stock.slice(0, 6)) {
    lines.push(`${s.name}: ${s.price}c`);
  }
  if (shop.stock.length > 6) lines.push(`...+${shop.stock.length - 6} more`);
  lines.push('E = OPEN SHOP GRID');
  return lines;
}

export function shopIconTexture(item: ShopItem): string {
  return `icon_${item.iconId}`;
}

export function canAfford(save: SaveData, item: ShopItem): boolean {
  return save.coins >= item.price;
}

/** Grid layout helper: cols x rows for N stock items. */
export function shopGridDims(
  count: number,
  cols = 4,
): { cols: number; rows: number } {
  const c = Math.max(1, cols);
  return { cols: c, rows: Math.max(1, Math.ceil(count / c)) };
}

export function shopIndexFromDir(
  index: number,
  count: number,
  cols: number,
  dir: 'up' | 'down' | 'left' | 'right',
): number {
  if (count <= 0) return 0;
  const rows = Math.ceil(count / cols);
  let row = Math.floor(index / cols);
  let col = index % cols;
  if (dir === 'left') col = (col - 1 + cols) % cols;
  if (dir === 'right') col = (col + 1) % cols;
  if (dir === 'up') row = (row - 1 + rows) % rows;
  if (dir === 'down') row = (row + 1) % rows;
  let next = row * cols + col;
  if (next >= count) next = count - 1;
  return next;
}

export interface ShopOpenPayload {
  save: SaveData;
  shopId: string;
  selectedIndex?: number;
}
