/**
 * Bag + multi-slot equip (v4). Pure functions over SaveData.
 */

import type { EquipSlot, ItemInstance, SaveData } from '../types';
import {
  recomputeMaxHp,
  computePotionHeal,
} from './attributes';
import { effectiveAttrs } from './hero-identity';
import {
  ALL_EQUIP_SLOTS,
  DEF_SLOTS,
  displayItemName,
  emptyEquipped,
  findInBag,
  getTemplate,
  mintItem,
} from './items';
import { canHeroEquipGear, effectiveGearDef } from './class-gear';
// class-gear registers compare-hook on load
import { igniteLight, isLightItemId } from './lighting';
import { isScrollOrTomeId, useScrollOrTome } from './scrolls';
import { isLootBoxTemplateId, openLootBox } from './loot-boxes';

export {
  computePlayerDamage,
  computePotionHeal,
} from './attributes';

function weaponAttrBonus(save: SaveData, attr: 'str' | 'dex' | 'vit' | 'int' | 'lck'): number {
  const uid = save.equipped.weapon;
  if (!uid) return 0;
  const inst = findInBag(save, uid);
  return inst?.attrBonuses?.[attr] ?? 0;
}

export function computeArmor(save: SaveData): number {
  let def = 0;
  for (const slot of DEF_SLOTS) {
    const uid = save.equipped[slot];
    if (!uid) continue;
    const inst = findInBag(save, uid);
    // D&D-style: proficiency + class affinity applied per piece
    if (inst) def += effectiveGearDef(save, inst);
  }
  const dex = effectiveAttrs(save).dex + weaponAttrBonus(save, 'dex');
  def += Math.floor(Math.max(0, dex - 1) / 4);
  def += Math.max(0, save.buffDef ?? 0);
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
  const eff = effectiveAttrs(save);
  const vit = eff.vit + weaponAttrBonus(save, 'vit');
  const maxHp = recomputeMaxHp({ ...save.attrs, vit });
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

/** Bag display sort modes (cycle in inventory UI). */
export type InventorySortMode =
  | 'default'
  | 'name'
  | 'type'
  | 'equipped'
  | 'rarity';

export const INVENTORY_SORT_MODES: InventorySortMode[] = [
  'default',
  'name',
  'type',
  'equipped',
  'rarity',
];

export function inventorySortLabel(mode: InventorySortMode): string {
  switch (mode) {
    case 'name':
      return 'NAME';
    case 'type':
      return 'TYPE';
    case 'equipped':
      return 'EQUIPPED';
    case 'rarity':
      return 'RARITY';
    default:
      return 'DEFAULT';
  }
}

export function nextInventorySortMode(
  mode: InventorySortMode,
): InventorySortMode {
  const i = INVENTORY_SORT_MODES.indexOf(mode);
  return INVENTORY_SORT_MODES[(i + 1) % INVENTORY_SORT_MODES.length]!;
}

const SLOT_SORT_ORDER: Record<string, number> = {
  weapon: 0,
  shield: 1,
  helmet: 2,
  breastplate: 3,
  greaves: 4,
  shoes: 5,
  gloves: 6,
  amulet: 7,
  ring: 8,
  key: 9,
};

const RARITY_SORT_ORDER: Record<string, number> = {
  legendary: 0,
  epic: 1,
  rare: 2,
  uncommon: 3,
  common: 4,
};

function typeRank(line: InventoryLine): number {
  if (line.usable) return 0; // potions / consumables first
  if (line.slot) return 10 + (SLOT_SORT_ORDER[line.slot] ?? 20);
  return 30; // mats / junk
}

/**
 * Sort a bag listing for display. Does not mutate the save — pure UI order.
 */
export function sortInventoryLines(
  lines: InventoryLine[],
  mode: InventorySortMode,
): InventoryLine[] {
  if (mode === 'default' || lines.length < 2) return lines.slice();

  const copy = lines.slice();
  copy.sort((a, b) => {
    if (mode === 'name') {
      return a.name.localeCompare(b.name) || a.templateId.localeCompare(b.templateId);
    }
    if (mode === 'type') {
      const tr = typeRank(a) - typeRank(b);
      if (tr !== 0) return tr;
      return a.name.localeCompare(b.name);
    }
    if (mode === 'equipped') {
      if (a.equipped !== b.equipped) return a.equipped ? -1 : 1;
      const tr = typeRank(a) - typeRank(b);
      if (tr !== 0) return tr;
      return a.name.localeCompare(b.name);
    }
    // rarity: best first; stacks (no rarity) after gear
    const ra = a.rarity ? (RARITY_SORT_ORDER[a.rarity] ?? 5) : 6;
    const rb = b.rarity ? (RARITY_SORT_ORDER[b.rarity] ?? 5) : 6;
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name);
  });
  return copy;
}

export function listInventory(
  save: SaveData,
  sortMode: InventorySortMode = 'default',
): InventoryLine[] {
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
    const onHero = ALL_EQUIP_SLOTS.some((s) => save.equipped[s] === inst.uid);
    const onBud = ALL_EQUIP_SLOTS.some(
      (s) => (save.budEquipped?.[s] ?? null) === inst.uid,
    );
    lines.push({
      uid: inst.uid,
      templateId: inst.templateId,
      name: displayItemName(inst),
      count: 1,
      blurb: onBud ? `${t.blurb} [BUD]` : t.blurb,
      usable: false,
      slot: t.slot,
      equipped: onHero || onBud,
      rarity: inst.rarity,
    });
  }

  return sortInventoryLines(lines, sortMode);
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
  // Loot boxes (starter + tiered)
  if (isLootBoxTemplateId(templateId)) {
    const r = openLootBox(save, templateId);
    if (!r.ok) {
      return { ok: false, save: r.save, reason: r.reason };
    }
    return {
      ok: true,
      save: syncDerivedStats(r.save),
      message: r.message,
    };
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
  if (templateId === 'beam_me_up') {
    // Scene handles actual teleport; we only consume stack here when requested.
    const stacks = { ...save.stacks };
    stacks.beam_me_up = count - 1;
    if (stacks.beam_me_up <= 0) delete stacks.beam_me_up;
    return {
      ok: true,
      save: syncDerivedStats({ ...save, stacks }),
      message: 'BEAM ME UP — ENERGIZE!',
    };
  }
  // Light ladder — ignite carried light
  if (isLightItemId(templateId)) {
    const stacks = { ...save.stacks };
    stacks[templateId] = count - 1;
    if (stacks[templateId]! <= 0) delete stacks[templateId];
    const lit = igniteLight({ ...save, stacks }, templateId);
    return {
      ok: true,
      save: syncDerivedStats(lit),
      message: `LIT ${t.name.toUpperCase()}`,
    };
  }
  // Scrolls / tomes
  if (isScrollOrTomeId(templateId)) {
    const r = useScrollOrTome(save, templateId);
    if (!r.ok) {
      return { ok: false, save: r.save, reason: r.reason ?? 'CANNOT USE' };
    }
    return {
      ok: true,
      save: syncDerivedStats(r.save),
      message: r.message ?? 'USED SCROLL',
    };
  }
  return { ok: false, save, reason: 'UNKNOWN ITEM' };
}

/** True if equipped weapon fires projectiles instead of sword swing. */
export function equippedWeaponIsRanged(save: SaveData): boolean {
  const uid = save.equipped.weapon;
  if (!uid) return false;
  const inst = findInBag(save, uid);
  if (!inst) return false;
  const t = getTemplate(inst.templateId);
  return t.weaponStyle === 'ranged' || t.weaponStyle === 'magic';
}

/** Consume one ammo if weapon requires it. */
export function consumeWeaponAmmo(
  save: SaveData,
): { ok: true; save: SaveData } | { ok: false; reason: string; save: SaveData } {
  const uid = save.equipped.weapon;
  if (!uid) return { ok: true, save };
  const inst = findInBag(save, uid);
  if (!inst) return { ok: true, save };
  const t = getTemplate(inst.templateId);
  if (!t.ammoId) return { ok: true, save };
  const have = save.stacks[t.ammoId] ?? 0;
  if (have <= 0) {
    return { ok: false, save, reason: `OUT OF ${t.ammoId.toUpperCase()}` };
  }
  const stacks = { ...save.stacks };
  stacks[t.ammoId] = have - 1;
  if (stacks[t.ammoId]! <= 0) delete stacks[t.ammoId];
  return { ok: true, save: { ...save, stacks } };
}

export function equipUid(save: SaveData, uid: string): EquipResult {
  const inst = findInBag(save, uid);
  if (!inst) return { ok: false, save, reason: 'NOT IN BAG' };
  const t = getTemplate(inst.templateId);
  if (!t.slot) return { ok: false, save, reason: 'CANNOT EQUIP THAT' };
  if (t.buddyOnly) {
    return {
      ok: false,
      save,
      reason: 'BUDDY ONLY — PRESS Y IN BAG FOR BUD GEAR',
    };
  }
  const gate = canHeroEquipGear(save, inst.templateId);
  if (!gate.ok) {
    return { ok: false, save, reason: gate.reason };
  }
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
  // Hero equip cycles skip critter-only kit
  return save.bag.filter((i) => {
    const t = getTemplate(i.templateId);
    return t.slot === slot && !t.buddyOnly;
  });
}

/** Hero cycle candidates: correct slot + class/type allowed. */
export function bagItemsForHeroEquipSlot(
  save: SaveData,
  slot: EquipSlot,
): ItemInstance[] {
  return bagItemsForSlot(save, slot).filter((i) =>
    canHeroEquipGear(save, i.templateId).ok,
  );
}

export function cycleSlotEquip(save: SaveData, slot: EquipSlot): EquipResult {
  const options = bagItemsForHeroEquipSlot(save, slot);
  if (options.length === 0) {
    // Still allow unequip if something wrong-class is stuck on
    if (save.equipped[slot]) return unequipSlot(save, slot);
    return { ok: false, save, reason: `NO ${slot.toUpperCase()} YOU CAN WEAR` };
  }
  const cur = save.equipped[slot];
  if (!cur) return equipUid(save, options[0]!.uid);
  const idx = options.findIndex((i) => i.uid === cur);
  if (idx < 0) return equipUid(save, options[0]!.uid);
  if (idx >= options.length - 1) return unequipSlot(save, slot);
  return equipUid(save, options[idx + 1]!.uid);
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
      const opts = bagItemsForHeroEquipSlot(next, slot);
      if (opts.length) next.equipped[slot] = opts[0]!.uid;
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
 * Migrate any save-like blob to v5 shape (also normalizes v4/v5).
 */
export function migrateEquipment(save: SaveData & Record<string, unknown>): SaveData {
  // Already bag+equip shape
  if (Array.isArray(save.bag) && save.equipped && typeof save.equipped === 'object') {
    const equipped = { ...emptyEquipped(), ...save.equipped };
    let next: SaveData = {
      ...save,
      version: 5,
      stacks: save.stacks ?? {},
      bag: save.bag,
      nextItemUid: save.nextItemUid ?? save.bag.length + 1,
      equipped,
      attrs: save.attrs ?? { str: 1, dex: 1, vit: 1, int: 1, lck: 1 },
      attrPoints: save.attrPoints ?? 0,
      discoveredMapz: save.discoveredMapz?.length
        ? save.discoveredMapz
        : (['surface'] as SaveData['discoveredMapz']),
      visitedRooms: save.visitedRooms ?? [],
      princessSaved: save.princessSaved ?? false,
      landsCleared: save.landsCleared ?? [],
      runSeed:
        typeof save.runSeed === 'number'
          ? save.runSeed
          : (Math.floor(Math.random() * 0xffffffff) ^
              (Date.now() & 0xffffffff)) >>> 0 || 1,
      bestBudId: save.bestBudId ?? null,
      bestBudStage: save.bestBudStage ?? 'none',
      budXp: typeof save.budXp === 'number' ? save.budXp : 0,
      budLevel: typeof save.budLevel === 'number' ? save.budLevel : 1,
      budEquipped: {
        ...emptyEquipped(),
        ...(save.budEquipped ?? {}),
        key: null,
      },
      activeQuestId: save.activeQuestId ?? null,
      questsCompleted: Array.isArray(save.questsCompleted)
        ? save.questsCompleted
        : [],
      achievementsUnlocked: Array.isArray(save.achievementsUnlocked)
        ? save.achievementsUnlocked
        : [],
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
    version: 5,
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
    discoveredMapz: ['surface'],
    visitedRooms: [],
    princessSaved: false,
    landsCleared: legacy.bossDefeated ? ['dunjunz'] : [],
    runSeed:
      (Math.floor(Math.random() * 0xffffffff) ^ (Date.now() & 0xffffffff)) >>>
        0 || 1,
    bestBudId: null,
    bestBudStage: 'none',
    budXp: 0,
    budLevel: 1,
    budEquipped: emptyEquipped(),
    activeQuestId: null,
    questsCompleted: [],
    achievementsUnlocked: [],
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

  // Retroactive packages: 1 package per level after 1 (+2 then +1 each)
  const level = Math.max(1, legacy.level ?? 1);
  next.attrPoints = Math.max(0, level - 1);
  next.pendingAttrMajor = null;
  next.flags = { ...next.flags, attr_rule_2plus1: true };

  next = autoEquipEmptySlots(next);
  return syncDerivedStats(next);
}

export function formatInventoryPanel(save: SaveData): string {
  const lines = [
    '=== INVENTORY ===',
    `COINS ${save.coins}c  HP ${save.hp}/${save.maxHp}  DEF ${save.armor}`,
    `ATTR PKG: ${save.attrPoints} (+2 then +1)${save.pendingAttrMajor ? ` · +1 pending` : ''}`,
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
