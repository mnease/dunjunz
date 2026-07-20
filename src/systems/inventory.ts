/**
 * Bag + multi-slot equip (v4). Pure functions over SaveData.
 */

import type { EquipSlot, ItemInstance, SaveData } from '../types';
import {
  recomputeMaxHp,
  computePotionHeal,
} from './attributes';
import {
  ALL_EQUIP_SLOTS,
  DEF_SLOTS,
  displayItemName,
  emptyEquipped,
  findInBag,
  getTemplate,
  instanceDef,
  mintItem,
} from './items';

export {
  computePlayerDamage,
  computePotionHeal,
} from './attributes';

export function computeArmor(save: SaveData): number {
  let def = 0;
  for (const slot of DEF_SLOTS) {
    const uid = save.equipped[slot];
    if (!uid) continue;
    const inst = findInBag(save, uid);
    if (inst) def += instanceDef(inst);
  }
  def += Math.floor(Math.max(0, save.attrs.dex - 1) / 4);
  return def;
}

export function hasWeaponEquipped(save: SaveData): boolean {
  const uid = save.equipped.weapon;
  if (!uid) return false;
  return !!findInBag(save, uid);
}

export function hasKeyEquipped(save: SaveData): boolean {
  const uid = save.equipped.key;
  if (!uid) return false;
  return !!findInBag(save, uid);
}

export function syncDerivedStats(save: SaveData): SaveData {
  const maxHp = recomputeMaxHp(save.attrs);
  return {
    ...save,
    maxHp,
    hp: Math.min(save.hp, maxHp),
    armor: computeArmor(save),
    hasSword: hasWeaponEquipped(save),
    hasKey: hasKeyEquipped(save),
  };
}

export interface InventoryLine {
  uid?: string;
  templateId: string;
  name: string;
  count: number;
  blurb: string;
  usable: boolean;
  slot?: EquipSlot;
  equipped: boolean;
  rarity?: string;
}

export function listInventory(save: SaveData): InventoryLine[] {
  const lines: InventoryLine[] = [];

  for (const [id, count] of Object.entries(save.stacks)) {
    if (!count || count <= 0) continue;
    const t = getTemplate(id);
    lines.push({
      templateId: id,
      name: t.name,
      count,
      blurb: t.blurb,
      usable: !!t.usable,
      equipped: false,
    });
  }

  for (const inst of save.bag) {
    const t = getTemplate(inst.templateId);
    const equipped = ALL_EQUIP_SLOTS.some(
      (s) => save.equipped[s] === inst.uid,
    );
    lines.push({
      uid: inst.uid,
      templateId: inst.templateId,
      name: displayItemName(inst),
      count: 1,
      blurb: t.blurb,
      usable: false,
      slot: t.slot,
      equipped,
      rarity: inst.rarity,
    });
  }

  return lines;
}

export type UseItemResult =
  | { ok: true; save: SaveData; message: string }
  | { ok: false; save: SaveData; reason: string };

export type EquipResult =
  | { ok: true; save: SaveData; message: string }
  | { ok: false; save: SaveData; reason: string };

export function useInventoryItem(
  save: SaveData,
  templateId: string,
): UseItemResult {
  const count = save.stacks[templateId] ?? 0;
  if (count <= 0) {
    return { ok: false, save, reason: 'YOU DO NOT HAVE THAT' };
  }
  const t = getTemplate(templateId);
  if (!t.usable) {
    return { ok: false, save, reason: 'CANNOT USE THAT HERE' };
  }
  if (templateId === 'potion') {
    if (save.hp >= save.maxHp) {
      return { ok: false, save, reason: 'ALREADY AT FULL HEALTH' };
    }
    const heal = computePotionHeal(save, t.heal ?? 4);
    const stacks = { ...save.stacks };
    stacks.potion = count - 1;
    if (stacks.potion <= 0) delete stacks.potion;
    const hp = Math.min(save.maxHp, save.hp + heal);
    const next = syncDerivedStats({ ...save, stacks, hp });
    return {
      ok: true,
      save: next,
      message: `USED POTION (+${hp - save.hp} HP)`,
    };
  }
  return { ok: false, save, reason: 'UNKNOWN ITEM' };
}

export function equipUid(save: SaveData, uid: string): EquipResult {
  const inst = findInBag(save, uid);
  if (!inst) return { ok: false, save, reason: 'NOT IN BAG' };
  const t = getTemplate(inst.templateId);
  if (!t.slot) return { ok: false, save, reason: 'CANNOT EQUIP THAT' };
  const equipped = { ...save.equipped, [t.slot]: uid };
  const next = syncDerivedStats({ ...save, equipped });
  return {
    ok: true,
    save: next,
    message: `EQUIPPED ${displayItemName(inst)}`,
  };
}

export function unequipSlot(save: SaveData, slot: EquipSlot): EquipResult {
  if (!save.equipped[slot]) {
    return { ok: false, save, reason: `NO ${slot.toUpperCase()} EQUIPPED` };
  }
  const equipped = { ...save.equipped, [slot]: null };
  const next = syncDerivedStats({ ...save, equipped });
  return {
    ok: true,
    save: next,
    message: `${slot.toUpperCase()} UNEQUIPPED`,
  };
}

export function bagItemsForSlot(save: SaveData, slot: EquipSlot): ItemInstance[] {
  return save.bag.filter((i) => getTemplate(i.templateId).slot === slot);
}

export function cycleSlotEquip(save: SaveData, slot: EquipSlot): EquipResult {
  const options = bagItemsForSlot(save, slot);
  if (options.length === 0) {
    return { ok: false, save, reason: `NO ${slot.toUpperCase()} IN BAG` };
  }
  const cur = save.equipped[slot];
  if (!cur) return equipUid(save, options[0].uid);
  const idx = options.findIndex((i) => i.uid === cur);
  if (idx < 0) return equipUid(save, options[0].uid);
  if (idx >= options.length - 1) return unequipSlot(save, slot);
  return equipUid(save, options[idx + 1].uid);
}

export function cycleWeaponEquip(save: SaveData): EquipResult {
  return cycleSlotEquip(save, 'weapon');
}
export function cycleArmorEquip(save: SaveData): EquipResult {
  return cycleSlotEquip(save, 'breastplate');
}
export function cycleAmuletEquip(save: SaveData): EquipResult {
  return cycleSlotEquip(save, 'amulet');
}

export function autoEquipEmptySlots(save: SaveData): SaveData {
  let next = { ...save, equipped: { ...save.equipped } };
  for (const slot of ALL_EQUIP_SLOTS) {
    const uid = next.equipped[slot];
    if (uid && !findInBag(next, uid)) {
      next.equipped[slot] = null;
    }
  }
  for (const slot of ALL_EQUIP_SLOTS) {
    if (!next.equipped[slot]) {
      const opts = bagItemsForSlot(next, slot);
      if (opts.length) next.equipped[slot] = opts[0].uid;
    }
  }
  return syncDerivedStats(next);
}

/** Grant dungeon key into bag + equip if empty. */
export function grantKey(save: SaveData): SaveData {
  if (bagItemsForSlot(save, 'key').length > 0) {
    return autoEquipEmptySlots(save);
  }
  const minted = mintItem(save, 'dungeon_key', 'common', 0);
  return autoEquipEmptySlots(minted.save);
}

/** Grant starter sword. */
export function grantMildSword(save: SaveData): SaveData {
  if (bagItemsForSlot(save, 'weapon').length > 0) {
    return autoEquipEmptySlots(save);
  }
  const minted = mintItem(save, 'mild_sword', 'common', 0);
  return autoEquipEmptySlots(minted.save);
}

/**
 * Migrate any save-like blob to v4 shape (also normalizes v4).
 */
export function migrateEquipment(save: SaveData & Record<string, unknown>): SaveData {
  // Already v4-ish with bag
  if (Array.isArray(save.bag) && save.equipped && typeof save.equipped === 'object') {
    const equipped = { ...emptyEquipped(), ...save.equipped };
    let next: SaveData = {
      ...save,
      version: 4,
      stacks: save.stacks ?? {},
      bag: save.bag,
      nextItemUid: save.nextItemUid ?? save.bag.length + 1,
      equipped,
      attrs: save.attrs ?? { str: 1, dex: 1, vit: 1, int: 1, lck: 1 },
      attrPoints: save.attrPoints ?? 0,
    };
    return autoEquipEmptySlots(syncDerivedStats(next));
  }

  // v3 path
  const legacy = save as SaveData & {
    inventory?: Record<string, number>;
    equippedWeapon?: string | null;
    equippedArmor?: string | null;
    equippedAmulet?: string | null;
    hasSword?: boolean;
    hasKey?: boolean;
  };

  let next: SaveData = {
    version: 4,
    roomId: legacy.roomId,
    hp: legacy.hp,
    maxHp: legacy.maxHp ?? 6,
    hasSword: false,
    hasKey: false,
    bossDefeated: legacy.bossDefeated,
    flags: { ...legacy.flags },
    killed: [...legacy.killed],
    collected: [...legacy.collected],
    xp: legacy.xp,
    level: legacy.level,
    coins: legacy.coins,
    stacks: {},
    bag: [],
    nextItemUid: 1,
    equipped: emptyEquipped(),
    attrs: { str: 1, dex: 1, vit: 1, int: 1, lck: 1 },
    attrPoints: 0,
    armor: 0,
  };

  const inv = legacy.inventory ?? {};
  if (inv.potion) next.stacks.potion = inv.potion;
  if (inv.tinker_oil) next.stacks.tinker_oil = inv.tinker_oil;

  const gearIds = [
    'mild_sword',
    'leather_armor',
    'reinforced_leather',
    'gold_trinket',
    'shiny_bauble',
    'leather_helmet',
    'leather_greaves',
    'leather_shoes',
    'leather_gloves',
  ];
  for (const id of gearIds) {
    const n = inv[id] ?? 0;
    for (let i = 0; i < n; i++) {
      const m = mintItem(next, id, 'common', 0);
      next = m.save;
    }
  }

  if (legacy.hasSword && bagItemsForSlot(next, 'weapon').length === 0) {
    next = grantMildSword(next);
  }
  if (legacy.hasKey && bagItemsForSlot(next, 'key').length === 0) {
    next = grantKey(next);
  }

  // Map old equipped strings
  const mapLegacy = (templateId: string | null | undefined, slot: EquipSlot) => {
    if (!templateId) return;
    const inst = next.bag.find((b) => b.templateId === templateId);
    if (inst) next.equipped[slot] = inst.uid;
  };
  mapLegacy(legacy.equippedWeapon ?? (legacy.hasSword ? 'mild_sword' : null), 'weapon');
  mapLegacy(legacy.equippedArmor, 'breastplate');
  mapLegacy(legacy.equippedAmulet, 'amulet');

  if ((legacy.armor ?? 0) > 0 && !next.equipped.breastplate) {
    if (bagItemsForSlot(next, 'breastplate').length === 0) {
      const id = (legacy.armor ?? 0) >= 2 ? 'reinforced_leather' : 'leather_armor';
      const m = mintItem(next, id, 'common', 0);
      next = m.save;
    }
  }

  // Retroactive attr points
  const level = Math.max(1, legacy.level ?? 1);
  next.attrPoints = 2 * Math.max(0, level - 1);

  next = autoEquipEmptySlots(next);
  return syncDerivedStats(next);
}

export function formatInventoryPanel(save: SaveData): string {
  const lines = [
    '=== INVENTORY ===',
    `COINS ${save.coins}c  HP ${save.hp}/${save.maxHp}  DEF ${save.armor}`,
    `ATTR PTS: ${save.attrPoints}`,
    `STR ${save.attrs.str} DEX ${save.attrs.dex} VIT ${save.attrs.vit} INT ${save.attrs.int} LCK ${save.attrs.lck}`,
    '',
    'SLOTS:',
  ];
  for (const slot of ALL_EQUIP_SLOTS) {
    const uid = save.equipped[slot];
    const inst = uid ? findInBag(save, uid) : undefined;
    const name = inst ? displayItemName(inst) : '(empty)';
    lines.push(`  ${slot.toUpperCase()}: ${name}`);
  }
  lines.push('', 'BAG:');
  const bag = listInventory(save);
  if (!bag.length) lines.push('  (empty)');
  else for (const b of bag) {
    lines.push(`  ${b.name} x${b.count}${b.equipped ? ' [WORN]' : ''}`);
  }
  lines.push('', 'W H C L F G N K · 1-5 ATTR · U · I/ESC');
  return lines.join('\n');
}
