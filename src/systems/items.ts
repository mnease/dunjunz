import type { EquipSlot, ItemInstance, Rarity, SaveData } from '../types';
import { effectivePrimary, rarityLabel } from './rarity';

export interface ItemTemplate {
  id: string;
  name: string;
  blurb: string;
  kind: 'consumable' | 'gear' | 'key';
  usable?: boolean;
  heal?: number;
  slot?: EquipSlot;
  baseAtk?: number;
  baseDef?: number;
  potionHealBonus?: number;
  /** Appearance fragment for layered draw. */
  look?: string;
  stackable?: boolean;
}

export const ITEM_TEMPLATES: Record<string, ItemTemplate> = {
  potion: {
    id: 'potion',
    name: 'HEALING POTION',
    blurb: 'Minty. Restores hearts. [U]',
    kind: 'consumable',
    usable: true,
    heal: 4,
    stackable: true,
  },
  tinker_oil: {
    id: 'tinker_oil',
    name: 'TINKER OIL',
    blurb: 'For hinges. Not wearable.',
    kind: 'consumable',
    stackable: true,
  },
  mild_sword: {
    id: 'mild_sword',
    name: 'SWORD OF MILD ENTHUSIASM',
    blurb: 'Weapon. Space/Z to swing. [W]',
    kind: 'gear',
    slot: 'weapon',
    baseAtk: 1,
    look: 'sword',
  },
  leather_helmet: {
    id: 'leather_helmet',
    name: 'LEATHER CAP',
    blurb: 'Helmet slot. [H]',
    kind: 'gear',
    slot: 'helmet',
    baseDef: 1,
    look: 'leather',
  },
  leather_armor: {
    id: 'leather_armor',
    name: 'LEATHER BREASTPLATE',
    blurb: 'Breastplate slot. [C]',
    kind: 'gear',
    slot: 'breastplate',
    baseDef: 1,
    look: 'leather',
  },
  reinforced_leather: {
    id: 'reinforced_leather',
    name: 'REINFORCED BREASTPLATE',
    blurb: 'Breastplate slot. [C]',
    kind: 'gear',
    slot: 'breastplate',
    baseDef: 2,
    look: 'reinforced',
  },
  leather_greaves: {
    id: 'leather_greaves',
    name: 'LEATHER GREAVES',
    blurb: 'Legs slot. [L]',
    kind: 'gear',
    slot: 'greaves',
    baseDef: 1,
    look: 'leather',
  },
  leather_shoes: {
    id: 'leather_shoes',
    name: 'LEATHER BOOTS',
    blurb: 'Feet slot. [F]',
    kind: 'gear',
    slot: 'shoes',
    baseDef: 1,
    look: 'leather',
  },
  leather_gloves: {
    id: 'leather_gloves',
    name: 'LEATHER GLOVES',
    blurb: 'Gloves slot. [G]',
    kind: 'gear',
    slot: 'gloves',
    baseDef: 1,
    look: 'leather',
  },
  gold_trinket: {
    id: 'gold_trinket',
    name: 'GOLD TRINKET',
    blurb: 'Amulet. +DEF. [N]',
    kind: 'gear',
    slot: 'amulet',
    baseDef: 1,
    look: 'gold',
  },
  shiny_bauble: {
    id: 'shiny_bauble',
    name: 'SHINY BAUBLE',
    blurb: 'Amulet. Better potions. [N]',
    kind: 'gear',
    slot: 'amulet',
    potionHealBonus: 2,
    look: 'bauble',
  },
  dungeon_key: {
    id: 'dungeon_key',
    name: 'KEY: "FRIEND"',
    blurb: 'Keyring. Opens locked doors. [K]',
    kind: 'key',
    slot: 'key',
    look: 'key',
  },
};

export function getTemplate(id: string): ItemTemplate {
  return (
    ITEM_TEMPLATES[id] ?? {
      id,
      name: id.toUpperCase().replace(/_/g, ' '),
      blurb: 'Mysterious junk.',
      kind: 'gear',
    }
  );
}

export function displayItemName(inst: ItemInstance): string {
  const t = getTemplate(inst.templateId);
  const bits = [t.name];
  if (inst.enhancement > 0) bits.push(`+${inst.enhancement}`);
  if (inst.rarity !== 'common') bits.push(`(${rarityLabel(inst.rarity)})`);
  return bits.join(' ');
}

export function instanceAtk(inst: ItemInstance): number {
  const t = getTemplate(inst.templateId);
  return effectivePrimary(t.baseAtk ?? 0, inst.rarity, inst.enhancement);
}

export function instanceDef(inst: ItemInstance): number {
  const t = getTemplate(inst.templateId);
  return effectivePrimary(t.baseDef ?? 0, inst.rarity, inst.enhancement);
}

export function mintItem(
  save: SaveData,
  templateId: string,
  rarity: Rarity = 'common',
  enhancement = 0,
): { save: SaveData; instance: ItemInstance } {
  const uid = `i_${save.nextItemUid}`;
  const instance: ItemInstance = {
    uid,
    templateId,
    rarity,
    enhancement: Math.max(0, Math.min(3, Math.floor(enhancement))),
  };
  return {
    instance,
    save: {
      ...save,
      nextItemUid: save.nextItemUid + 1,
      bag: [...save.bag, instance],
    },
  };
}

export function findInBag(
  save: SaveData,
  uid: string,
): ItemInstance | undefined {
  return save.bag.find((i) => i.uid === uid);
}

export function findByTemplate(
  save: SaveData,
  templateId: string,
): ItemInstance | undefined {
  return save.bag.find((i) => i.templateId === templateId);
}

export const ALL_EQUIP_SLOTS: EquipSlot[] = [
  'weapon',
  'helmet',
  'breastplate',
  'greaves',
  'shoes',
  'gloves',
  'amulet',
  'key',
];

export const DEF_SLOTS: EquipSlot[] = [
  'helmet',
  'breastplate',
  'greaves',
  'shoes',
  'gloves',
  'amulet',
];

export function emptyEquipped(): Record<EquipSlot, string | null> {
  return {
    weapon: null,
    helmet: null,
    breastplate: null,
    greaves: null,
    shoes: null,
    gloves: null,
    amulet: null,
    key: null,
  };
}
