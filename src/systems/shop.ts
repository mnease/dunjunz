/**
 * Merchant buy/sell — dual-pane stock (left) + player bag (right).
 * Graphic shop grid uses iconId for UI cells.
 * Blacksmith salvage/parts is a future merchant type (not here).
 */

import type { SaveData } from '../types';
import {
  autoEquipEmptySlots,
  listInventory,
  syncDerivedStats,
  type InventoryLine,
} from './inventory';
import {
  ALL_EQUIP_SLOTS,
  displayItemName,
  getTemplate,
  mintItem,
} from './items';

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
  /** Min hero level to list this SKU (default 1). */
  minLevel?: number;
  /** Critter-only gear (same as template.buddyOnly). */
  buddyOnly?: boolean;
}

export interface ShopDef {
  id: string;
  name: string;
  greeting: string[];
  stock: ShopItem[];
}

/** Catalog row for level-gated stock. */
interface CatalogEntry extends ShopItem {
  minLevel: number;
}

/** Which dual-pane side has keyboard focus. */
export type ShopPane = 'stock' | 'bag';

/** One sellable cell on the player bag side (stacks + bag gear, incl. equipped). */
export interface SellTarget {
  kind: 'stack' | 'instance';
  templateId: string;
  /** Present for gear instances. */
  uid?: string;
  name: string;
  iconId: string;
  count: number;
  /** Coins for selling one unit / this instance. */
  sellPrice: number;
  equipped: boolean;
  blurb: string;
}

/**
 * Full tinkerer catalog. Rows unlock when hero level ≥ minLevel.
 * Buddy SKUs always tag BUD ONLY (heroes cannot wear them).
 */
const TINKERER_CATALOG: CatalogEntry[] = [
  // —— Always (L1) ——
  {
    id: 'buy_potion',
    minLevel: 1,
    name: 'HEALING POTION',
    price: 15,
    stackId: 'potion',
    heal: 4,
    iconId: 'potion',
    description: 'Restores a few hearts. Smells like mint.',
  },
  {
    id: 'buy_torch_pack',
    minLevel: 1,
    name: 'TORCH PACK',
    price: 12,
    stackId: 'torch',
    stackCount: 3,
    iconId: 'torch',
    description:
      'Three sticks. [U] carry light. [T] hang on a wall forever.',
  },
  {
    id: 'buy_lantern',
    minLevel: 5,
    name: 'LANTERN',
    price: 50,
    stackId: 'lantern',
    stackCount: 1,
    iconId: 'lantern',
    description: 'Long burn carry light. [U] only — cannot place.',
  },
  {
    id: 'buy_flashlight',
    minLevel: 10,
    name: 'FLASHLIGHT',
    price: 100,
    stackId: 'flashlight',
    stackCount: 1,
    iconId: 'flashlight',
    description: 'Bright electric carry light. Forjed science. [U]',
  },
  {
    id: 'buy_oil',
    minLevel: 1,
    name: 'TINKER OIL',
    price: 20,
    stackId: 'tinker_oil',
    iconId: 'tinker_oil',
    description: 'Keeps hinges quiet and skelebones squeaky.',
  },
  {
    id: 'buy_gloves',
    minLevel: 1,
    name: 'LEATHER GLOVES',
    price: 35,
    templateId: 'leather_gloves',
    iconId: 'leather_gloves',
    description: 'One more layer between you and regret.',
  },
  {
    id: 'buy_helmet',
    minLevel: 1,
    name: 'LEATHER CAP',
    price: 30,
    templateId: 'leather_helmet',
    iconId: 'leather_helmet',
    description: 'Stops light bonks. Heavy ones still hurt.',
  },
  {
    id: 'buy_shoes',
    minLevel: 1,
    name: 'LEATHER BOOTS',
    price: 28,
    templateId: 'leather_shoes',
    iconId: 'leather_shoes',
    description: 'Better than bare feet in a dunjun.',
  },
  {
    id: 'buy_armor',
    minLevel: 1,
    name: 'LEATHER BREASTPLATE',
    price: 45,
    templateId: 'leather_armor',
    iconId: 'leather_armor',
    description: 'Fashionable protection. Mostly.',
  },
  {
    id: 'buy_wood_shield',
    minLevel: 1,
    name: 'WOOD SHIELD',
    price: 32,
    templateId: 'wood_shield',
    iconId: 'wood_shield',
    description: 'Shield slot. Better than blocking with your face.',
  },
  {
    id: 'buy_copper_ring',
    minLevel: 1,
    name: 'COPPER RING',
    price: 28,
    templateId: 'copper_ring',
    iconId: 'copper_ring',
    description: 'Ring slot. Cheap shine, real DEF.',
  },
  {
    id: 'buy_wood',
    minLevel: 1,
    name: 'WOOD SHARD',
    price: 18,
    stackId: 'wood_shard',
    iconId: 'wood_shard',
    description: 'From the woodz. Good kindling / handles.',
  },
  {
    id: 'buy_bud_collar',
    minLevel: 1,
    name: 'BEST BUD COLLAR',
    price: 22,
    templateId: 'bud_collar',
    iconId: 'bud_collar',
    buddyOnly: true,
    description: 'BUD ONLY. Amulet for your Best Bud. [Y gear mode]',
  },
  {
    id: 'buy_bud_paws',
    minLevel: 1,
    name: 'PADDED PAWS',
    price: 24,
    templateId: 'bud_paws',
    iconId: 'bud_paws',
    buddyOnly: true,
    description: 'BUD ONLY. Soft paw gloves. Heroes cannot wear.',
  },
  // —— L3 ——
  {
    id: 'buy_potion_3',
    minLevel: 3,
    name: 'POTION PACK x3',
    price: 40,
    stackId: 'potion',
    stackCount: 3,
    iconId: 'potion',
    description: 'Three potions. Bulk discount, kind of.',
  },
  {
    id: 'buy_iron',
    minLevel: 3,
    name: 'IRON ORE',
    price: 25,
    stackId: 'ore_iron',
    iconId: 'ore_iron',
    description: 'Forjing material. Heavy for its size.',
  },
  {
    id: 'buy_trinket',
    minLevel: 3,
    name: 'GOLD TRINKET',
    price: 50,
    templateId: 'gold_trinket',
    iconId: 'gold_trinket',
    description: 'Amulet. +DEF. Shiny enough to distract wolves.',
  },
  {
    id: 'buy_iron_shield',
    minLevel: 3,
    name: 'IRON SHIELD',
    price: 55,
    templateId: 'iron_shield',
    iconId: 'iron_shield',
    description: 'Shield slot. Proper iron. Heavy pride.',
  },
  {
    id: 'buy_silver_ring',
    minLevel: 3,
    name: 'SILVER RING',
    price: 48,
    templateId: 'silver_ring',
    iconId: 'silver_ring',
    description: 'Ring slot. Tinkerer swears it is real silver.',
  },
  {
    id: 'buy_reinforced',
    minLevel: 3,
    name: 'REINFORCED BREASTPLATE',
    price: 70,
    templateId: 'reinforced_leather',
    iconId: 'reinforced_leather',
    description: 'Medium chest. For heroes who keep dying.',
  },
  {
    id: 'buy_bud_sash',
    minLevel: 3,
    name: 'STRETCH SASH',
    price: 40,
    templateId: 'bud_sash',
    iconId: 'bud_sash',
    buddyOnly: true,
    description: 'BUD ONLY. Elastic chest wrap for stretchy friends.',
  },
  {
    id: 'buy_bud_booties',
    minLevel: 3,
    name: 'CRITTER BOOTIES',
    price: 32,
    templateId: 'bud_booties',
    iconId: 'bud_booties',
    buddyOnly: true,
    description: 'BUD ONLY. Tiny serious shoes.',
  },
  // —— L5 ——
  {
    id: 'buy_spark',
    minLevel: 5,
    name: 'SPARK ORE',
    price: 35,
    stackId: 'ore_spark',
    iconId: 'ore_spark',
    description: 'Magic dust for forjing imbues.',
  },
  {
    id: 'buy_sand',
    minLevel: 5,
    name: 'SAND CRYSTAL',
    price: 30,
    stackId: 'sand_crystal',
    iconId: 'sand_crystal',
    description: 'Dezertz glass. Hisses near forjes.',
  },
  {
    id: 'buy_mild_sword',
    minLevel: 5,
    name: 'SWORD OF MILD ENTHUSIASM',
    price: 65,
    templateId: 'mild_sword',
    iconId: 'mild_sword',
    description: 'Backup blade. Mild. Enthusiastic enough.',
  },
  {
    id: 'buy_studded',
    minLevel: 5,
    name: 'STUDDED LEATHER',
    price: 80,
    templateId: 'studded_leather',
    iconId: 'studded_leather',
    description: 'Light chest with attitude studs.',
  },
  {
    id: 'buy_greaves',
    minLevel: 5,
    name: 'LEATHER GREAVES',
    price: 45,
    templateId: 'leather_greaves',
    iconId: 'leather_greaves',
    description: 'Leg slot. Stops shin regret.',
  },
  {
    id: 'buy_bud_spike',
    minLevel: 5,
    name: 'BUDDY SPIKE HAT',
    price: 55,
    templateId: 'bud_spike',
    iconId: 'bud_spike',
    buddyOnly: true,
    description: 'BUD ONLY. Horned hat. Looks intimidating on a slime.',
  },
  {
    id: 'buy_bud_claw',
    minLevel: 5,
    name: 'BUDDY CLAW',
    price: 60,
    templateId: 'bud_claw',
    iconId: 'bud_claw',
    buddyOnly: true,
    description: 'BUD ONLY. Weapon. Friendship with edges.',
  },
  // —— L8 ——
  {
    id: 'buy_iron_blade',
    minLevel: 8,
    name: 'IRON BLADE',
    price: 95,
    templateId: 'iron_blade',
    iconId: 'iron_blade',
    description: 'Real iron. Realer than your first sword.',
  },
  {
    id: 'buy_plate_helm',
    minLevel: 8,
    name: 'PLATE HELM',
    price: 90,
    templateId: 'plate_helm',
    iconId: 'plate_helm',
    description: 'Heavy head. Comes with horns energy.',
  },
  {
    id: 'buy_bauble',
    minLevel: 8,
    name: 'SHINY BAUBLE',
    price: 75,
    templateId: 'shiny_bauble',
    iconId: 'shiny_bauble',
    description: 'Amulet. Better potions. Pink.',
  },
  {
    id: 'buy_luck_ring',
    minLevel: 8,
    name: 'RING OF MILD LUCK',
    price: 70,
    templateId: 'luck_ring',
    iconId: 'luck_ring',
    description: 'Ring. Feels lucky. Probably is not.',
  },
  {
    id: 'buy_bud_shell',
    minLevel: 8,
    name: 'BUDDY SHELL',
    price: 70,
    templateId: 'bud_shell',
    iconId: 'bud_shell',
    buddyOnly: true,
    description: 'BUD ONLY. Tiny shield for tiny heroes.',
  },
  {
    id: 'buy_bud_charm',
    minLevel: 8,
    name: 'BUDDY CHARM RING',
    price: 55,
    templateId: 'bud_charm',
    iconId: 'bud_charm',
    buddyOnly: true,
    description: 'BUD ONLY. Lucky paw ring.',
  },
  // —— L12 ——
  {
    id: 'buy_fighter_plate',
    minLevel: 12,
    name: 'FIGHTER PLATE',
    price: 140,
    templateId: 'fighter_plate',
    iconId: 'fighter_plate',
    description: 'Heavy chest. Clanks of confidence.',
  },
  {
    id: 'buy_tower_shield',
    minLevel: 12,
    name: 'TOWER SHIELD',
    price: 120,
    templateId: 'tower_shield',
    iconId: 'tower_shield',
    description: 'Shield. Door energy. Carry with pride.',
  },
  {
    id: 'buy_plate_greaves',
    minLevel: 12,
    name: 'PLATE GREAVES',
    price: 100,
    templateId: 'plate_greaves',
    iconId: 'plate_greaves',
    description: 'Heavy legs. Slow but shiny.',
  },
  {
    id: 'buy_ranger_cloak',
    minLevel: 12,
    name: 'RANGER CLOAK',
    price: 110,
    templateId: 'ranger_cloak',
    iconId: 'ranger_cloak',
    description: 'Trail cloak. Leaves optional.',
  },
  {
    id: 'buy_bud_mail',
    minLevel: 12,
    name: 'BUDDY MAIL',
    price: 110,
    templateId: 'bud_mail',
    iconId: 'bud_mail',
    buddyOnly: true,
    description: 'BUD ONLY. Fancy plate-ish vest for champions.',
  },
  {
    id: 'buy_bud_fang',
    minLevel: 12,
    name: 'BUDDY FANG BLADE',
    price: 125,
    templateId: 'bud_fang',
    iconId: 'bud_fang',
    buddyOnly: true,
    description: 'BUD ONLY. Serious critter weapon.',
  },
  // —— L15 ——
  {
    id: 'buy_wizard_cloak',
    minLevel: 15,
    name: 'WIZARD CLOAK',
    price: 150,
    templateId: 'wizard_cloak',
    iconId: 'wizard_cloak',
    description: 'Stars included. Spells not.',
  },
  {
    id: 'buy_mage_hat',
    minLevel: 15,
    name: 'POINTED MAGE HAT',
    price: 90,
    templateId: 'mage_hat',
    iconId: 'mage_hat',
    description: 'Very on-brand. Slightly crooked.',
  },
  {
    id: 'buy_cleric_vest',
    minLevel: 15,
    name: 'CLERIC VESTMENTS',
    price: 145,
    templateId: 'cleric_vestments',
    iconId: 'cleric_vestments',
    description: 'Holy cloth-mail. Smells like incense.',
  },
  {
    id: 'buy_potion_5',
    minLevel: 15,
    name: 'POTION CRATE x5',
    price: 70,
    stackId: 'potion',
    stackCount: 5,
    iconId: 'potion',
    description: 'Five potions. Bulk bulk.',
  },
];

/** Build level-gated stock (prices fixed per SKU; higher tiers unlock later). */
export function buildTinkererStock(level: number): ShopItem[] {
  const lv = Math.max(1, Math.floor(level || 1));
  return TINKERER_CATALOG.filter((e) => e.minLevel <= lv).map(
    ({ minLevel: _m, ...item }) => ({
      ...item,
      buddyOnly:
        item.buddyOnly ||
        (!!item.templateId && !!getTemplate(item.templateId).buddyOnly),
    }),
  );
}

const SHOP_META: Record<
  string,
  Omit<ShopDef, 'stock'> & { stockBuilder?: (level: number) => ShopItem[] }
> = {
  tinkerer: {
    id: 'tinkerer',
    name: 'TRAVELING TINKERER',
    greeting: [
      'TINKERER: BUY LEFT · SELL RIGHT!',
      'STOCK GROWS WITH YOUR LEVEL.',
      'BUD GEAR = CRITTERS ONLY · Y IN BAG',
      'TAB PANE · [ ] PAGE · ENTER TRADE',
    ],
    stockBuilder: buildTinkererStock,
  },
};

/** @deprecated Prefer getShop(id, level). Static full catalog for tests. */
export const SHOPS: Record<string, ShopDef> = {
  tinkerer: {
    ...SHOP_META.tinkerer!,
    stock: buildTinkererStock(99),
  },
};

export type PurchaseResult =
  | { ok: true; save: SaveData; item: ShopItem }
  | {
      ok: false;
      reason: 'insufficient_funds' | 'not_in_stock' | 'unknown_shop';
      save: SaveData;
    };

export type SellResult =
  | { ok: true; save: SaveData; name: string; coins: number }
  | {
      ok: false;
      reason: 'unknown_shop' | 'not_found' | 'nothing_to_sell';
      save: SaveData;
    };

/**
 * Resolve shop definition. Pass hero level so tinkerer stock unlocks
 * better gear as you grow (buddy kit included when minLevel met).
 */
export function getShop(
  shopId: string,
  level: number = 1,
): ShopDef | undefined {
  const meta = SHOP_META[shopId];
  if (meta?.stockBuilder) {
    return {
      id: meta.id,
      name: meta.name,
      greeting: meta.greeting,
      stock: meta.stockBuilder(level),
    };
  }
  return SHOPS[shopId];
}

/**
 * Unit sell price: half the shop's unit buy price when listed, else a modest fallback.
 * Tinkerer buys junk cheap — blacksmith salvage (parts) is later.
 */
export function sellUnitPrice(templateId: string, shopId = 'tinkerer'): number {
  const shop = SHOPS[shopId];
  if (shop) {
    const unitMatch = shop.stock.find(
      (s) => s.stackId === templateId && (s.stackCount ?? 1) === 1,
    );
    const packMatch = shop.stock.find((s) => s.stackId === templateId);
    const gearMatch = shop.stock.find((s) => s.templateId === templateId);
    const match = unitMatch ?? gearMatch ?? packMatch;
    if (match) {
      const units = match.stackCount ?? 1;
      return Math.max(1, Math.floor(match.price / units / 2));
    }
  }
  const t = getTemplate(templateId);
  if (t.kind === 'key') return 8;
  if (t.baseAtk) return Math.max(4, t.baseAtk * 6);
  if (t.baseDef) return Math.max(4, t.baseDef * 8);
  // Creature parts — tinkerer buys cheap for "research"
  const partPrices: Record<string, number> = {
    slime_gel: 3,
    bone: 4,
    wolf_pelt: 6,
    cactus_spine: 5,
    ensign_badge: 2,
  };
  if (partPrices[templateId] != null) return partPrices[templateId];
  if (t.kind === 'consumable') return 4;
  return 3;
}

export function inventoryLineToSellTarget(
  line: InventoryLine,
  shopId: string,
): SellTarget {
  return {
    kind: line.uid ? 'instance' : 'stack',
    templateId: line.templateId,
    uid: line.uid,
    name: line.name,
    iconId: line.templateId,
    count: line.count,
    sellPrice: sellUnitPrice(line.templateId, shopId),
    equipped: line.equipped,
    blurb: line.blurb,
  };
}

/** Player bag side: stacks + all bag gear (equipped shown with flag). */
export function listPlayerSellables(
  save: SaveData,
  shopId: string,
): SellTarget[] {
  return listInventory(save).map((line) =>
    inventoryLineToSellTarget(line, shopId),
  );
}

export function attemptSell(
  save: SaveData,
  shopId: string,
  target:
    | { kind: 'stack'; templateId: string }
    | { kind: 'instance'; uid: string },
): SellResult {
  if (!SHOPS[shopId]) {
    return { ok: false, reason: 'unknown_shop', save };
  }

  if (target.kind === 'stack') {
    const count = save.stacks[target.templateId] ?? 0;
    if (count <= 0) {
      return { ok: false, reason: 'not_found', save };
    }
    const price = sellUnitPrice(target.templateId, shopId);
    const stacks = { ...save.stacks };
    stacks[target.templateId] = count - 1;
    if (stacks[target.templateId] <= 0) delete stacks[target.templateId];
    const t = getTemplate(target.templateId);
    const next = syncDerivedStats({
      ...save,
      stacks,
      coins: save.coins + price,
    });
    return { ok: true, save: next, name: t.name, coins: price };
  }

  const inst = save.bag.find((b) => b.uid === target.uid);
  if (!inst) {
    return { ok: false, reason: 'not_found', save };
  }
  const price = sellUnitPrice(inst.templateId, shopId);
  const equipped = { ...save.equipped };
  for (const slot of ALL_EQUIP_SLOTS) {
    if (equipped[slot] === inst.uid) equipped[slot] = null;
  }
  const bag = save.bag.filter((b) => b.uid !== inst.uid);
  const name = displayItemName(inst);
  const next = syncDerivedStats({
    ...save,
    bag,
    equipped,
    coins: save.coins + price,
  });
  // Deliberate sell does not auto-fill emptied equip slots.
  return { ok: true, save: next, name, coins: price };
}

export function attemptSellIndex(
  save: SaveData,
  shopId: string,
  bagIndex: number,
): SellResult {
  const list = listPlayerSellables(save, shopId);
  if (!list.length) {
    return { ok: false, reason: 'nothing_to_sell', save };
  }
  const t = list[bagIndex];
  if (!t) {
    return { ok: false, reason: 'not_found', save };
  }
  if (t.kind === 'instance' && t.uid) {
    return attemptSell(save, shopId, { kind: 'instance', uid: t.uid });
  }
  return attemptSell(save, shopId, {
    kind: 'stack',
    templateId: t.templateId,
  });
}

export function attemptPurchase(
  save: SaveData,
  shopId: string,
  itemId: string,
): PurchaseResult {
  const shop = getShop(shopId, save.level);
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
  // Buddy-only gear must not auto-stick to the hero
  next = autoEquipEmptySlots(next);
  next = syncDerivedStats(next);
  return { ok: true, save: next, item };
}

export function attemptFeaturedPurchase(
  save: SaveData,
  shopId: string,
): PurchaseResult {
  const shop = getShop(shopId, save.level);
  if (!shop?.stock.length) {
    return { ok: false, reason: 'unknown_shop', save };
  }
  return attemptPurchase(save, shopId, shop.stock[0]!.id);
}

export function shopCatalogLines(shopId: string, level = 1): string[] {
  const shop = getShop(shopId, level);
  if (!shop) return ['NO SHOP HERE.'];
  const lines = [...shop.greeting];
  for (const s of shop.stock.slice(0, 6)) {
    const tag = s.buddyOnly ? ' [BUD]' : '';
    lines.push(`${s.name}${tag}: ${s.price}c`);
  }
  if (shop.stock.length > 6) lines.push(`...+${shop.stock.length - 6} more`);
  lines.push('E = OPEN SHOP · LEFT BUY · RIGHT SELL');
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
  /** Focused stock index (left pane). */
  selectedIndex?: number;
  /** Active dual-pane side. */
  pane?: ShopPane;
  /** Focused bag index (right pane). */
  bagSelectedIndex?: number;
}

/** Stock (left) and bag (right) grid column counts for dual-pane layout. */
export const SHOP_STOCK_COLS = 3;
export const SHOP_STOCK_ROWS = 4;
export const SHOP_BAG_COLS = 4;
export const SHOP_BAG_ROWS = 4;
/** Visible cells per page (paginated when stock/bag exceeds this). */
export const SHOP_STOCK_PAGE_SIZE = SHOP_STOCK_COLS * SHOP_STOCK_ROWS;
export const SHOP_BAG_PAGE_SIZE = SHOP_BAG_COLS * SHOP_BAG_ROWS;

export function shopPageCount(count: number, pageSize: number): number {
  return Math.max(1, Math.ceil(Math.max(0, count) / Math.max(1, pageSize)));
}

export function clampShopPage(
  page: number,
  count: number,
  pageSize: number,
): number {
  return Math.max(0, Math.min(page, shopPageCount(count, pageSize) - 1));
}

/** Page that contains a global index. */
export function shopPageOf(index: number, pageSize: number): number {
  if (pageSize <= 0) return 0;
  return Math.max(0, Math.floor(Math.max(0, index) / pageSize));
}
