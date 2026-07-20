/**
 * Merchant purchase — stacks or minted gear (v4).
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
  /** Gear template to mint. */
  templateId?: string;
  heal?: number;
  description: string;
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
      'PRESS B TO BUY TOP ITEM.',
      'POTION 15c · OIL 20c · GLOVES 35c',
    ],
    stock: [
      {
        id: 'buy_potion',
        name: 'HEALING POTION',
        price: 15,
        stackId: 'potion',
        heal: 4,
        description: 'Restores a few hearts. Smells like mint.',
      },
      {
        id: 'buy_oil',
        name: 'TINKER OIL',
        price: 20,
        stackId: 'tinker_oil',
        description: 'Keeps hinges quiet and skelebones squeaky.',
      },
      {
        id: 'buy_gloves',
        name: 'LEATHER GLOVES',
        price: 35,
        templateId: 'leather_gloves',
        description: 'One more layer between you and regret.',
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
    next.stacks[item.stackId] = (next.stacks[item.stackId] ?? 0) + 1;
  }
  if (item.heal) {
    next.hp = Math.min(next.maxHp, next.hp + item.heal);
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
  for (const s of shop.stock) {
    lines.push(`${s.name}: ${s.price}c`);
  }
  lines.push('B = BUY FIRST ITEM');
  return lines;
}
