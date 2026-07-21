import type { EquipSlot, ItemInstance, Rarity, SaveData } from '../types';
import { effectivePrimary, rarityLabel } from './rarity';

export type WeaponStyle = 'melee' | 'ranged' | 'magic';

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
  /** Melee swing (default), ranged bolt, or magic bolt. */
  weaponStyle?: WeaponStyle;
  /** Stack template consumed per ranged shot (e.g. arrows). */
  ammoId?: string;
  /** Projectile visual key for player shots. */
  projectile?: 'arrow' | 'phaser' | 'fireball' | 'bolt';
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
  ore_iron: {
    id: 'ore_iron',
    name: 'IRON ORE',
    blurb: 'Forjing material.',
    kind: 'consumable',
    stackable: true,
  },
  ore_spark: {
    id: 'ore_spark',
    name: 'SPARK ORE',
    blurb: 'Magic forjing dust.',
    kind: 'consumable',
    stackable: true,
  },
  wood_shard: {
    id: 'wood_shard',
    name: 'WOOD SHARD',
    blurb: 'From the woodz.',
    kind: 'consumable',
    stackable: true,
  },
  sand_crystal: {
    id: 'sand_crystal',
    name: 'SAND CRYSTAL',
    blurb: 'Dezertz glass.',
    kind: 'consumable',
    stackable: true,
  },
  /** Creature parts — occasional enemy drops (blacksmith salvage later). */
  slime_gel: {
    id: 'slime_gel',
    name: 'SLIME GEL',
    blurb: 'Wobbly. Stickier than pride.',
    kind: 'consumable',
    stackable: true,
  },
  bone: {
    id: 'bone',
    name: 'BONE',
    blurb: 'Skeleton spare. Still rattles.',
    kind: 'consumable',
    stackable: true,
  },
  wolf_pelt: {
    id: 'wolf_pelt',
    name: 'WOLF PELT',
    blurb: 'Warm. Smells like woodz.',
    kind: 'consumable',
    stackable: true,
  },
  cactus_spine: {
    id: 'cactus_spine',
    name: 'CACTUS SPINE',
    blurb: 'Pointy. Do not sit on it.',
    kind: 'consumable',
    stackable: true,
  },
  ensign_badge: {
    id: 'ensign_badge',
    name: 'ENSIGN BADGE',
    blurb: 'Redshirt memorabilia. Tragic chic.',
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
  iron_blade: {
    id: 'iron_blade',
    name: 'IRON BLADE',
    blurb: 'Forjed weapon. Solid.',
    kind: 'gear',
    slot: 'weapon',
    baseAtk: 2,
    look: 'iron',
  },
  sand_saber: {
    id: 'sand_saber',
    name: 'SAND SABER',
    blurb: 'Dezertz steel.',
    kind: 'gear',
    slot: 'weapon',
    baseAtk: 3,
    look: 'saber',
  },
  dunjun_cleaver: {
    id: 'dunjun_cleaver',
    name: 'DUNJUN CLEAVER',
    blurb: 'Legendary dunjun loot.',
    kind: 'gear',
    slot: 'weapon',
    baseAtk: 4,
    look: 'cleaver',
  },
  honk_blade: {
    id: 'honk_blade',
    name: 'HONK BLADE',
    blurb: 'Epic. Smells like sewerz and victory.',
    kind: 'gear',
    slot: 'weapon',
    baseAtk: 4,
    look: 'honk',
  },
  /** Hard-mode captain reward — redshirt sidearm. */
  phaser: {
    id: 'phaser',
    name: 'PHASER',
    blurb: 'Set to fun. Space/Z fires a beam. [W]',
    kind: 'gear',
    slot: 'weapon',
    baseAtk: 3,
    look: 'phaser',
    weaponStyle: 'ranged',
    projectile: 'phaser',
  },
  /** Hard-mode captain reward — emergency teleport. */
  beam_me_up: {
    id: 'beam_me_up',
    name: 'BEAM ME UP',
    blurb: 'Scotty energy. [U] from inventory or assign use. Teleports to dunjun mouth.',
    kind: 'consumable',
    usable: true,
    stackable: true,
  },
  /** Hard-mode king (Dungeon Master) reward. */
  short_bow: {
    id: 'short_bow',
    name: 'SHORT BOW',
    blurb: 'Needs ARROWS. Space/Z looses a shot. [W]',
    kind: 'gear',
    slot: 'weapon',
    baseAtk: 3,
    look: 'bow',
    weaponStyle: 'ranged',
    ammoId: 'arrows',
    projectile: 'arrow',
  },
  hunter_crossbow: {
    id: 'hunter_crossbow',
    name: 'HUNTER CROSSBOW',
    blurb: 'Heavy prod. Needs ARROWS. Space/Z fires a bolt. [W]',
    kind: 'gear',
    slot: 'weapon',
    baseAtk: 4,
    look: 'crossbow',
    weaponStyle: 'ranged',
    ammoId: 'arrows',
    projectile: 'arrow',
  },
  arrows: {
    id: 'arrows',
    name: 'ARROWS',
    blurb: 'Pointy sticks. Ammo for bows and crossbows.',
    kind: 'consumable',
    stackable: true,
  },
  wizard_staff: {
    id: 'wizard_staff',
    name: 'WIZARD STAFF',
    blurb: 'INT-powered sparkles. Space/Z casts. [W]',
    kind: 'gear',
    slot: 'weapon',
    baseAtk: 2,
    look: 'staff',
    weaponStyle: 'magic',
    projectile: 'bolt',
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
  sorry_boots: {
    id: 'sorry_boots',
    name: 'BOOTS OF APOLOGY',
    blurb: 'Gift from the cube. Won\'t dissolve. [F]',
    kind: 'gear',
    slot: 'shoes',
    baseDef: 2,
    look: 'apology',
  },
  cube_core: {
    id: 'cube_core',
    name: 'GELATINOUS CORE',
    blurb: 'Looted cube heart. Amulet. +DEF. [N]',
    kind: 'gear',
    slot: 'amulet',
    baseDef: 2,
    potionHealBonus: 1,
    look: 'cube',
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
  wood_shield: {
    id: 'wood_shield',
    name: 'WOOD SHIELD',
    blurb: 'Shield slot. Blocks regret. [O]',
    kind: 'gear',
    slot: 'shield',
    baseDef: 1,
    look: 'wood',
  },
  iron_shield: {
    id: 'iron_shield',
    name: 'IRON SHIELD',
    blurb: 'Shield slot. Sturdier. [O]',
    kind: 'gear',
    slot: 'shield',
    baseDef: 2,
    look: 'iron',
  },
  tower_shield: {
    id: 'tower_shield',
    name: 'TOWER SHIELD',
    blurb: 'Shield slot. Door with a handle. [O]',
    kind: 'gear',
    slot: 'shield',
    baseDef: 3,
    look: 'tower',
  },
  copper_ring: {
    id: 'copper_ring',
    name: 'COPPER RING',
    blurb: 'Ring slot. +DEF. [R]',
    kind: 'gear',
    slot: 'ring',
    baseDef: 1,
    look: 'copper',
  },
  silver_ring: {
    id: 'silver_ring',
    name: 'SILVER RING',
    blurb: 'Ring slot. Fancy +DEF. [R]',
    kind: 'gear',
    slot: 'ring',
    baseDef: 2,
    look: 'silver',
  },
  luck_ring: {
    id: 'luck_ring',
    name: 'RING OF MILD LUCK',
    blurb: 'Ring slot. Feels lucky. [R]',
    kind: 'gear',
    slot: 'ring',
    baseDef: 1,
    look: 'luck',
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
  if (inst.attrBonuses) {
    for (const [k, v] of Object.entries(inst.attrBonuses)) {
      if (v) bits.push(`+${v}${k.toUpperCase()}`);
    }
  }
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
  'shield',
  'helmet',
  'breastplate',
  'greaves',
  'shoes',
  'gloves',
  'amulet',
  'ring',
  'key',
];

export const DEF_SLOTS: EquipSlot[] = [
  'shield',
  'helmet',
  'breastplate',
  'greaves',
  'shoes',
  'gloves',
  'amulet',
  'ring',
];

export function emptyEquipped(): Record<EquipSlot, string | null> {
  return {
    weapon: null,
    shield: null,
    helmet: null,
    breastplate: null,
    greaves: null,
    shoes: null,
    gloves: null,
    amulet: null,
    ring: null,
    key: null,
  };
}
