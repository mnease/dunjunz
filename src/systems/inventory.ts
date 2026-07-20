/**
 * Pure inventory catalog + consumable use rules.
 */

import type { ItemId, SaveData } from '../types';

export interface ItemInfo {
  id: ItemId | string;
  name: string;
  /** Short flavor for the inventory panel. */
  blurb: string;
  /** Can be used from the bag with U / 1. */
  usable: boolean;
  heal?: number;
}

export const ITEM_CATALOG: Record<string, ItemInfo> = {
  potion: {
    id: 'potion',
    name: 'HEALING POTION',
    blurb: 'Minty. Restores hearts.',
    usable: true,
    heal: 4,
  },
  leather_armor: {
    id: 'leather_armor',
    name: 'LEATHER ARMOR',
    blurb: 'Adds DEF when found/bought.',
    usable: false,
  },
  gold_trinket: {
    id: 'gold_trinket',
    name: 'GOLD TRINKET',
    blurb: 'Shiny. Merchants envy it.',
    usable: false,
  },
  shiny_bauble: {
    id: 'shiny_bauble',
    name: 'SHINY BAUBLE',
    blurb: 'Possibly cursed. Cute though.',
    usable: false,
  },
  tinker_oil: {
    id: 'tinker_oil',
    name: 'TINKER OIL',
    blurb: 'For hinges and skelebones.',
    usable: false,
  },
};

export interface InventoryLine {
  id: string;
  name: string;
  count: number;
  blurb: string;
  usable: boolean;
}

/** Build display lines from bag counts (only items with count > 0). */
export function listInventory(inventory: Record<string, number>): InventoryLine[] {
  const lines: InventoryLine[] = [];
  for (const [id, count] of Object.entries(inventory)) {
    if (!count || count <= 0) continue;
    const info = ITEM_CATALOG[id] ?? {
      id,
      name: id.toUpperCase().replace(/_/g, ' '),
      blurb: 'Mysterious junk.',
      usable: false,
    };
    lines.push({
      id,
      name: info.name,
      count,
      blurb: info.blurb,
      usable: info.usable,
    });
  }
  // Stable order: catalog order first, then unknowns alpha
  const order = Object.keys(ITEM_CATALOG);
  lines.sort((a, b) => {
    const ia = order.indexOf(a.id);
    const ib = order.indexOf(b.id);
    if (ia === -1 && ib === -1) return a.id.localeCompare(b.id);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  return lines;
}

export type UseItemResult =
  | { ok: true; save: SaveData; message: string }
  | { ok: false; save: SaveData; reason: string };

/**
 * Use a consumable from inventory. Currently potions only.
 * Returns a new save snapshot (does not mutate input).
 */
export function useInventoryItem(
  save: SaveData,
  itemId: string,
): UseItemResult {
  const count = save.inventory[itemId] ?? 0;
  if (count <= 0) {
    return { ok: false, save, reason: 'YOU DO NOT HAVE THAT' };
  }
  const info = ITEM_CATALOG[itemId];
  if (!info?.usable) {
    return { ok: false, save, reason: 'CANNOT USE THAT HERE' };
  }

  if (itemId === 'potion') {
    if (save.hp >= save.maxHp) {
      return { ok: false, save, reason: 'ALREADY AT FULL HEALTH' };
    }
    const heal = info.heal ?? 4;
    const inventory = { ...save.inventory };
    inventory.potion = count - 1;
    if (inventory.potion <= 0) delete inventory.potion;
    const hp = Math.min(save.maxHp, save.hp + heal);
    const next: SaveData = { ...save, inventory, hp };
    return {
      ok: true,
      save: next,
      message: `USED POTION (+${hp - save.hp} HP)`,
    };
  }

  return { ok: false, save, reason: 'UNKNOWN ITEM' };
}

/** Full panel text body for the inventory UI. */
export function formatInventoryPanel(save: SaveData): string {
  const lines: string[] = [
    '=== INVENTORY ===',
    `COINS: ${save.coins}c`,
    `ARMOR DEF: ${save.armor}`,
    `HP: ${save.hp}/${save.maxHp}`,
    '',
  ];

  const gear: string[] = [];
  if (save.hasSword) gear.push('SWORD OF MILD ENTHUSIASM');
  if (save.hasKey) gear.push('KEY: "FRIEND"');
  if (save.bossDefeated) gear.push('DENTED CROWN');
  if (gear.length) {
    lines.push('EQUIPPED / KEYS:');
    for (const g of gear) lines.push(`  * ${g}`);
    lines.push('');
  }

  const bag = listInventory(save.inventory);
  if (bag.length === 0) {
    lines.push('BAG: (empty)');
  } else {
    lines.push('BAG:');
    for (const item of bag) {
      const useTag = item.usable ? '  [U] USE' : '';
      lines.push(`  ${item.name} x${item.count}${useTag}`);
      lines.push(`    ${item.blurb}`);
    }
  }

  lines.push('');
  lines.push('I CLOSE  ·  U USE POTION  ·  ESC CLOSE');
  return lines.join('\n');
}
