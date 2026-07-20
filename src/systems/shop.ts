/**
 * Pure merchant / tinkerer purchase rules.
 */

import type { ItemId } from '../types';

export interface ShopItem {
  id: string;
  name: string;
  price: number;
  /** Inventory item granted (count +1). */
  itemId?: ItemId;
  /** Armor bonus on buy. */
  armorBonus?: number;
  /** Immediate heal amount. */
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
      'POTION 15c · OIL 20c · ARMOR 35c',
    ],
    stock: [
      {
        id: 'buy_potion',
        name: 'HEALING POTION',
        price: 15,
        itemId: 'potion',
        heal: 4,
        description: 'Restores a few hearts. Smells like mint.',
      },
      {
        id: 'buy_oil',
        name: 'TINKER OIL',
        price: 20,
        itemId: 'tinker_oil',
        description: 'Keeps hinges quiet and skelebones squeaky.',
      },
      {
        id: 'buy_armor',
        name: 'PATCHED ARMOR',
        price: 35,
        itemId: 'leather_armor',
        armorBonus: 1,
        description: 'One more layer between you and regret.',
      },
    ],
  },
};

export interface ShopperState {
  coins: number;
  inventory: Record<string, number>;
  armor: number;
  hp: number;
  maxHp: number;
}

export type PurchaseResult =
  | { ok: true; state: ShopperState; item: ShopItem }
  | {
      ok: false;
      reason: 'insufficient_funds' | 'not_in_stock' | 'unknown_shop';
      state: ShopperState;
    };

/**
 * Attempt to buy a stock item by id from a shop.
 * On failure, returns the same state reference fields (new object, unchanged values).
 */
export function attemptPurchase(
  state: ShopperState,
  shopId: string,
  itemId: string,
): PurchaseResult {
  const shop = SHOPS[shopId];
  if (!shop) {
    return {
      ok: false,
      reason: 'unknown_shop',
      state: cloneState(state),
    };
  }
  const item = shop.stock.find((s) => s.id === itemId);
  if (!item) {
    return {
      ok: false,
      reason: 'not_in_stock',
      state: cloneState(state),
    };
  }
  if (state.coins < item.price) {
    return {
      ok: false,
      reason: 'insufficient_funds',
      state: cloneState(state),
    };
  }

  const inventory = { ...state.inventory };
  if (item.itemId) {
    inventory[item.itemId] = (inventory[item.itemId] ?? 0) + 1;
  }

  let armor = state.armor;
  if (item.armorBonus) armor += item.armorBonus;

  let hp = state.hp;
  if (item.heal) hp = Math.min(state.maxHp, hp + item.heal);

  return {
    ok: true,
    item,
    state: {
      coins: state.coins - item.price,
      inventory,
      armor,
      hp,
      maxHp: state.maxHp,
    },
  };
}

/** Buy the first (featured) stock item — used by in-game B key. */
export function attemptFeaturedPurchase(
  state: ShopperState,
  shopId: string,
): PurchaseResult {
  const shop = SHOPS[shopId];
  if (!shop || shop.stock.length === 0) {
    return {
      ok: false,
      reason: 'unknown_shop',
      state: cloneState(state),
    };
  }
  return attemptPurchase(state, shopId, shop.stock[0].id);
}

function cloneState(state: ShopperState): ShopperState {
  return {
    coins: state.coins,
    inventory: { ...state.inventory },
    armor: state.armor,
    hp: state.hp,
    maxHp: state.maxHp,
  };
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
