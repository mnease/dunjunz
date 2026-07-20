/**
 * Pure inventory catalog, consumables, and equip slots (armor + amulet).
 */

import type { EquipSlot, ItemId, SaveData } from '../types';

export interface ItemInfo {
  id: ItemId | string;
  name: string;
  blurb: string;
  /** Consumable from bag (U). */
  usable: boolean;
  heal?: number;
  /** Which slot this can equip into, if any. */
  slot?: EquipSlot;
  /** DEF contributed while equipped. */
  armorBonus?: number;
  /** Extra heal on potion use while this is the equipped amulet. */
  potionHealBonus?: number;
}

export const ITEM_CATALOG: Record<string, ItemInfo> = {
  potion: {
    id: 'potion',
    name: 'HEALING POTION',
    blurb: 'Minty. Restores hearts. [U]',
    usable: true,
    heal: 4,
  },
  leather_armor: {
    id: 'leather_armor',
    name: 'LEATHER ARMOR',
    blurb: 'Armor slot. +1 DEF when equipped. [A]',
    usable: false,
    slot: 'armor',
    armorBonus: 1,
  },
  reinforced_leather: {
    id: 'reinforced_leather',
    name: 'REINFORCED LEATHER',
    blurb: 'Armor slot. +2 DEF when equipped. [A]',
    usable: false,
    slot: 'armor',
    armorBonus: 2,
  },
  gold_trinket: {
    id: 'gold_trinket',
    name: 'GOLD TRINKET',
    blurb: 'Amulet slot. +1 DEF when worn. [N]',
    usable: false,
    slot: 'amulet',
    armorBonus: 1,
  },
  shiny_bauble: {
    id: 'shiny_bauble',
    name: 'SHINY BAUBLE',
    blurb: 'Amulet slot. Potions heal +2. [N]',
    usable: false,
    slot: 'amulet',
    potionHealBonus: 2,
  },
  tinker_oil: {
    id: 'tinker_oil',
    name: 'TINKER OIL',
    blurb: 'For hinges. Not wearable.',
    usable: false,
  },
};

export interface InventoryLine {
  id: string;
  name: string;
  count: number;
  blurb: string;
  usable: boolean;
  slot?: EquipSlot;
  equipped: boolean;
}

export function getItemInfo(id: string): ItemInfo {
  return (
    ITEM_CATALOG[id] ?? {
      id,
      name: id.toUpperCase().replace(/_/g, ' '),
      blurb: 'Mysterious junk.',
      usable: false,
    }
  );
}

/** DEF from currently equipped pieces. */
export function computeArmor(save: SaveData): number {
  let def = 0;
  if (save.equippedArmor) {
    def += getItemInfo(save.equippedArmor).armorBonus ?? 0;
  }
  if (save.equippedAmulet) {
    def += getItemInfo(save.equippedAmulet).armorBonus ?? 0;
  }
  return def;
}

/** Refresh derived armor field after equip changes. */
export function syncDerivedStats(save: SaveData): SaveData {
  return { ...save, armor: computeArmor(save) };
}

export function listInventory(save: SaveData): InventoryLine[] {
  const inventory = save.inventory;
  const lines: InventoryLine[] = [];
  for (const [id, count] of Object.entries(inventory)) {
    if (!count || count <= 0) continue;
    const info = getItemInfo(id);
    const equipped =
      (info.slot === 'armor' && save.equippedArmor === id) ||
      (info.slot === 'amulet' && save.equippedAmulet === id);
    lines.push({
      id,
      name: info.name,
      count,
      blurb: info.blurb,
      usable: info.usable,
      slot: info.slot,
      equipped,
    });
  }
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

export type EquipResult =
  | { ok: true; save: SaveData; message: string }
  | { ok: false; save: SaveData; reason: string };

/**
 * Use a consumable from inventory. Potions get amulet heal bonus if equipped.
 */
export function useInventoryItem(
  save: SaveData,
  itemId: string,
): UseItemResult {
  const count = save.inventory[itemId] ?? 0;
  if (count <= 0) {
    return { ok: false, save, reason: 'YOU DO NOT HAVE THAT' };
  }
  const info = getItemInfo(itemId);
  if (!info.usable) {
    return { ok: false, save, reason: 'CANNOT USE THAT HERE' };
  }

  if (itemId === 'potion') {
    if (save.hp >= save.maxHp) {
      return { ok: false, save, reason: 'ALREADY AT FULL HEALTH' };
    }
    let heal = info.heal ?? 4;
    if (save.equippedAmulet) {
      heal += getItemInfo(save.equippedAmulet).potionHealBonus ?? 0;
    }
    const inventory = { ...save.inventory };
    inventory.potion = count - 1;
    if (inventory.potion <= 0) delete inventory.potion;
    const hp = Math.min(save.maxHp, save.hp + heal);
    const next = syncDerivedStats({ ...save, inventory, hp });
    return {
      ok: true,
      save: next,
      message: `USED POTION (+${hp - save.hp} HP)`,
    };
  }

  return { ok: false, save, reason: 'UNKNOWN ITEM' };
}

/** Equip an item from the bag into its slot (must own at least 1). */
export function equipItem(save: SaveData, itemId: string): EquipResult {
  const count = save.inventory[itemId] ?? 0;
  if (count <= 0) {
    return { ok: false, save, reason: 'NOT IN BAG' };
  }
  const info = getItemInfo(itemId);
  if (!info.slot) {
    return { ok: false, save, reason: 'CANNOT EQUIP THAT' };
  }

  let next: SaveData = { ...save };
  if (info.slot === 'armor') {
    next = { ...next, equippedArmor: itemId };
  } else {
    next = { ...next, equippedAmulet: itemId };
  }
  next = syncDerivedStats(next);
  return {
    ok: true,
    save: next,
    message: `EQUIPPED ${info.name}`,
  };
}

/** Clear a slot. Item stays in bag. */
export function unequipSlot(save: SaveData, slot: EquipSlot): EquipResult {
  let next: SaveData = { ...save };
  if (slot === 'armor') {
    if (!save.equippedArmor) {
      return { ok: false, save, reason: 'NO ARMOR EQUIPPED' };
    }
    next = { ...next, equippedArmor: null };
  } else {
    if (!save.equippedAmulet) {
      return { ok: false, save, reason: 'NO AMULET EQUIPPED' };
    }
    next = { ...next, equippedAmulet: null };
  }
  next = syncDerivedStats(next);
  return {
    ok: true,
    save: next,
    message: slot === 'armor' ? 'ARMOR UNEQUIPPED' : 'AMULET UNEQUIPPED',
  };
}

/**
 * Toggle equip for an item: unequip if already worn, else equip.
 */
export function toggleEquipItem(save: SaveData, itemId: string): EquipResult {
  const info = getItemInfo(itemId);
  if (!info.slot) {
    return { ok: false, save, reason: 'CANNOT EQUIP THAT' };
  }
  if (info.slot === 'armor' && save.equippedArmor === itemId) {
    return unequipSlot(save, 'armor');
  }
  if (info.slot === 'amulet' && save.equippedAmulet === itemId) {
    return unequipSlot(save, 'amulet');
  }
  return equipItem(save, itemId);
}

/** All bag item ids that fit a slot (count > 0). */
export function bagItemsForSlot(save: SaveData, slot: EquipSlot): string[] {
  return Object.entries(save.inventory)
    .filter(([id, n]) => n > 0 && getItemInfo(id).slot === slot)
    .map(([id]) => id)
    .sort((a, b) => {
      const order = Object.keys(ITEM_CATALOG);
      return order.indexOf(a) - order.indexOf(b);
    });
}

/**
 * Cycle armor: if none equipped, equip first bag armor;
 * if equipped, move to next armor in bag or unequip after last.
 */
export function cycleArmorEquip(save: SaveData): EquipResult {
  const options = bagItemsForSlot(save, 'armor');
  if (options.length === 0) {
    return { ok: false, save, reason: 'NO ARMOR IN BAG' };
  }
  const cur = save.equippedArmor;
  if (!cur || !options.includes(cur)) {
    return equipItem(save, options[0]);
  }
  const idx = options.indexOf(cur);
  if (idx >= options.length - 1) {
    return unequipSlot(save, 'armor');
  }
  return equipItem(save, options[idx + 1]);
}

/** Cycle amulet the same way. */
export function cycleAmuletEquip(save: SaveData): EquipResult {
  const options = bagItemsForSlot(save, 'amulet');
  if (options.length === 0) {
    return { ok: false, save, reason: 'NO AMULET IN BAG' };
  }
  const cur = save.equippedAmulet;
  if (!cur || !options.includes(cur)) {
    return equipItem(save, options[0]);
  }
  const idx = options.indexOf(cur);
  if (idx >= options.length - 1) {
    return unequipSlot(save, 'amulet');
  }
  return equipItem(save, options[idx + 1]);
}

/**
 * After gaining items (loot/shop): auto-equip empty slots if bag has gear.
 */
export function autoEquipEmptySlots(save: SaveData): SaveData {
  let next = { ...save };
  if (!next.equippedArmor) {
    const armor = bagItemsForSlot(next, 'armor');
    if (armor.length) next = { ...next, equippedArmor: armor[0] };
  }
  // Clear equipped if item missing from bag
  if (next.equippedArmor && (next.inventory[next.equippedArmor] ?? 0) <= 0) {
    next = { ...next, equippedArmor: null };
  }
  if (next.equippedAmulet && (next.inventory[next.equippedAmulet] ?? 0) <= 0) {
    next = { ...next, equippedAmulet: null };
  }
  if (!next.equippedAmulet) {
    const amulets = bagItemsForSlot(next, 'amulet');
    if (amulets.length) next = { ...next, equippedAmulet: amulets[0] };
  }
  return syncDerivedStats(next);
}

/**
 * Migrate older saves: grant phantom leather if they only had free DEF,
 * wire equip slots, recompute armor.
 */
export function migrateEquipment(save: SaveData): SaveData {
  let next: SaveData = {
    ...save,
    equippedArmor: save.equippedArmor ?? null,
    equippedAmulet: save.equippedAmulet ?? null,
    inventory: { ...save.inventory },
  };

  // Old saves applied DEF without equip — if DEF>0 and no armor piece, grant one
  if (
    (next.armor ?? 0) > 0 &&
    !next.equippedArmor &&
    bagItemsForSlot(next, 'armor').length === 0
  ) {
    const bonus = next.armor;
    if (bonus >= 2) {
      next.inventory.reinforced_leather =
        (next.inventory.reinforced_leather ?? 0) + 1;
      next.equippedArmor = 'reinforced_leather';
    } else {
      next.inventory.leather_armor = (next.inventory.leather_armor ?? 0) + 1;
      next.equippedArmor = 'leather_armor';
    }
  }

  // Prefer equipped id if still in bag; else auto-fill empty
  if (
    next.equippedArmor &&
    (next.inventory[next.equippedArmor] ?? 0) <= 0
  ) {
    next.equippedArmor = null;
  }
  if (
    next.equippedAmulet &&
    (next.inventory[next.equippedAmulet] ?? 0) <= 0
  ) {
    next.equippedAmulet = null;
  }

  next = autoEquipEmptySlots(next);
  return syncDerivedStats(next);
}

/** Full panel text for inventory UI. */
export function formatInventoryPanel(save: SaveData): string {
  const armorName = save.equippedArmor
    ? getItemInfo(save.equippedArmor).name
    : '(none)';
  const amuletName = save.equippedAmulet
    ? getItemInfo(save.equippedAmulet).name
    : '(none)';

  const lines: string[] = [
    '=== INVENTORY ===',
    `COINS: ${save.coins}c   HP: ${save.hp}/${save.maxHp}`,
    `DEF: ${save.armor}  (from gear)`,
    '',
    'SLOTS:',
    `  ARMOR  [A]: ${armorName}`,
    `  AMULET [N]: ${amuletName}`,
    '',
  ];

  const gear: string[] = [];
  if (save.hasSword) gear.push('SWORD OF MILD ENTHUSIASM');
  if (save.hasKey) gear.push('KEY: "FRIEND"');
  if (save.bossDefeated) gear.push('DENTED CROWN');
  if (gear.length) {
    lines.push('KEY ITEMS:');
    for (const g of gear) lines.push(`  * ${g}`);
    lines.push('');
  }

  const bag = listInventory(save);
  if (bag.length === 0) {
    lines.push('BAG: (empty)');
  } else {
    lines.push('BAG:');
    for (const item of bag) {
      const tags: string[] = [];
      if (item.equipped) tags.push('WORN');
      if (item.usable) tags.push('U USE');
      if (item.slot === 'armor') tags.push('A');
      if (item.slot === 'amulet') tags.push('N');
      const tag = tags.length ? `  [${tags.join(' ')}]` : '';
      lines.push(`  ${item.name} x${item.count}${tag}`);
      lines.push(`    ${item.blurb}`);
    }
  }

  lines.push('');
  lines.push('A CYCLE ARMOR  ·  N CYCLE AMULET');
  lines.push('U USE POTION  ·  I/ESC CLOSE');
  return lines.join('\n');
}
