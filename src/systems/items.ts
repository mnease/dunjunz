import type {
  ClassId,
  EquipSlot,
  ItemInstance,
  Rarity,
  SaveData,
} from '../types';
import { effectivePrimary, rarityLabel } from './rarity';

export type WeaponStyle = 'melee' | 'ranged' | 'magic';

/** D&D-style armor band (see class-gear.ts). */
export type ArmorCategory = 'cloth' | 'light' | 'medium' | 'heavy';

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
  /**
   * Armor category for proficiency (cloth / light / medium / heavy).
   * Weapons omit this.
   */
  armorCategory?: ArmorCategory;
  /**
   * Classes that get affinity DEF bonus when worn (primary or secondary).
   */
  classAffinity?: ClassId[];
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
    blurb: 'Light helm. [H]',
    kind: 'gear',
    slot: 'helmet',
    baseDef: 1,
    look: 'leather',
    armorCategory: 'light',
  },
  leather_armor: {
    id: 'leather_armor',
    name: 'LEATHER BREASTPLATE',
    blurb: 'Light chest. [C]',
    kind: 'gear',
    slot: 'breastplate',
    baseDef: 1,
    look: 'leather',
    armorCategory: 'light',
  },
  reinforced_leather: {
    id: 'reinforced_leather',
    name: 'REINFORCED BREASTPLATE',
    blurb: 'Medium chest. [C]',
    kind: 'gear',
    slot: 'breastplate',
    baseDef: 2,
    look: 'reinforced',
    armorCategory: 'medium',
  },
  leather_greaves: {
    id: 'leather_greaves',
    name: 'LEATHER GREAVES',
    blurb: 'Light legs. [L]',
    kind: 'gear',
    slot: 'greaves',
    baseDef: 1,
    look: 'leather',
    armorCategory: 'light',
  },
  leather_shoes: {
    id: 'leather_shoes',
    name: 'LEATHER BOOTS',
    blurb: 'Light feet. [F]',
    kind: 'gear',
    slot: 'shoes',
    baseDef: 1,
    look: 'leather',
    armorCategory: 'light',
  },
  sorry_boots: {
    id: 'sorry_boots',
    name: 'BOOTS OF APOLOGY',
    blurb: 'Gift from the cube. Light. [F]',
    kind: 'gear',
    slot: 'shoes',
    baseDef: 2,
    look: 'apology',
    armorCategory: 'light',
  },
  /** —— Class clothing (D&D cloth / light / heavy) —— */
  wizard_cloak: {
    id: 'wizard_cloak',
    name: 'WIZARD CLOAK',
    blurb: 'Cloth. Stars optional. Synergy: wizard/sorc/warlock. [C]',
    kind: 'gear',
    slot: 'breastplate',
    baseDef: 1,
    look: 'cloth_arcane',
    armorCategory: 'cloth',
    classAffinity: ['wizard', 'sorcerer', 'warlock'],
    potionHealBonus: 0,
  },
  mage_hat: {
    id: 'mage_hat',
    name: 'POINTED MAGE HAT',
    blurb: 'Cloth hat. Very on-brand. [H]',
    kind: 'gear',
    slot: 'helmet',
    baseDef: 1,
    look: 'cloth_arcane',
    armorCategory: 'cloth',
    classAffinity: ['wizard', 'sorcerer', 'warlock', 'bard'],
  },
  ranger_cloak: {
    id: 'ranger_cloak',
    name: 'RANGER CLOAK',
    blurb: 'Light trail cloak. Synergy: ranger/druid. [C]',
    kind: 'gear',
    slot: 'breastplate',
    baseDef: 2,
    look: 'cloak_ranger',
    armorCategory: 'light',
    classAffinity: ['ranger', 'druid'],
  },
  ranger_sheath: {
    id: 'ranger_sheath',
    name: 'RANGER SHEATH',
    blurb: 'Quiver + blade loops. Light gloves slot. [G]',
    kind: 'gear',
    slot: 'gloves',
    baseDef: 1,
    look: 'sheath',
    armorCategory: 'light',
    classAffinity: ['ranger', 'rogue'],
  },
  fighter_plate: {
    id: 'fighter_plate',
    name: 'FIGHTER PLATE',
    blurb: 'Heavy chest. Synergy: fighter/paladin. [C]',
    kind: 'gear',
    slot: 'breastplate',
    baseDef: 3,
    look: 'plate',
    armorCategory: 'heavy',
    classAffinity: ['fighter', 'paladin'],
  },
  plate_helm: {
    id: 'plate_helm',
    name: 'PLATE HELM',
    blurb: 'Heavy head. Clanky confidence. [H]',
    kind: 'gear',
    slot: 'helmet',
    baseDef: 2,
    look: 'plate',
    armorCategory: 'heavy',
    classAffinity: ['fighter', 'paladin', 'cleric'],
  },
  plate_greaves: {
    id: 'plate_greaves',
    name: 'PLATE GREAVES',
    blurb: 'Heavy legs. [L]',
    kind: 'gear',
    slot: 'greaves',
    baseDef: 2,
    look: 'plate',
    armorCategory: 'heavy',
    classAffinity: ['fighter', 'paladin', 'cleric'],
  },
  studded_leather: {
    id: 'studded_leather',
    name: 'STUDDED LEATHER',
    blurb: 'Light chest. Rogue-friendly. [C]',
    kind: 'gear',
    slot: 'breastplate',
    baseDef: 2,
    look: 'leather',
    armorCategory: 'light',
    classAffinity: ['rogue', 'ranger', 'bard'],
  },
  cleric_vestments: {
    id: 'cleric_vestments',
    name: 'CLERIC VESTMENTS',
    blurb: 'Medium holy cloth-mail. [C]',
    kind: 'gear',
    slot: 'breastplate',
    baseDef: 2,
    look: 'holy',
    armorCategory: 'medium',
    classAffinity: ['cleric', 'paladin'],
    potionHealBonus: 1,
  },
  barbarian_hide: {
    id: 'barbarian_hide',
    name: 'BARBARIAN HIDE',
    blurb: 'Medium rage wrap. [C]',
    kind: 'gear',
    slot: 'breastplate',
    baseDef: 2,
    look: 'hide',
    armorCategory: 'medium',
    classAffinity: ['barbarian', 'druid'],
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
    armorCategory: 'cloth',
  },
  leather_gloves: {
    id: 'leather_gloves',
    name: 'LEATHER GLOVES',
    blurb: 'Light gloves. [G]',
    kind: 'gear',
    slot: 'gloves',
    baseDef: 1,
    look: 'leather',
    armorCategory: 'light',
  },
  gold_trinket: {
    id: 'gold_trinket',
    name: 'GOLD TRINKET',
    blurb: 'Amulet. +DEF. [N]',
    kind: 'gear',
    slot: 'amulet',
    baseDef: 1,
    look: 'gold',
    armorCategory: 'cloth',
  },
  shiny_bauble: {
    id: 'shiny_bauble',
    name: 'SHINY BAUBLE',
    blurb: 'Amulet. Better potions. [N]',
    kind: 'gear',
    slot: 'amulet',
    potionHealBonus: 2,
    look: 'bauble',
    armorCategory: 'cloth',
  },
  wood_shield: {
    id: 'wood_shield',
    name: 'WOOD SHIELD',
    blurb: 'Shield. Light. [O]',
    kind: 'gear',
    slot: 'shield',
    baseDef: 1,
    look: 'wood',
    armorCategory: 'light',
  },
  iron_shield: {
    id: 'iron_shield',
    name: 'IRON SHIELD',
    blurb: 'Shield. Medium. [O]',
    kind: 'gear',
    slot: 'shield',
    baseDef: 2,
    look: 'iron',
    armorCategory: 'medium',
  },
  tower_shield: {
    id: 'tower_shield',
    name: 'TOWER SHIELD',
    blurb: 'Shield. Heavy door energy. [O]',
    kind: 'gear',
    slot: 'shield',
    baseDef: 3,
    look: 'tower',
    armorCategory: 'heavy',
    classAffinity: ['fighter', 'paladin', 'cleric'],
  },
  copper_ring: {
    id: 'copper_ring',
    name: 'COPPER RING',
    blurb: 'Ring. Cloth-tier trinket. [R]',
    kind: 'gear',
    slot: 'ring',
    baseDef: 1,
    look: 'copper',
    armorCategory: 'cloth',
  },
  silver_ring: {
    id: 'silver_ring',
    name: 'SILVER RING',
    blurb: 'Ring. Fancy +DEF. [R]',
    kind: 'gear',
    slot: 'ring',
    baseDef: 2,
    look: 'silver',
    armorCategory: 'cloth',
  },
  luck_ring: {
    id: 'luck_ring',
    name: 'RING OF MILD LUCK',
    blurb: 'Ring. Feels lucky. [R]',
    kind: 'gear',
    slot: 'ring',
    baseDef: 1,
    look: 'luck',
    armorCategory: 'cloth',
    classAffinity: ['rogue', 'bard'],
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

/** Heal bonus from amulet templates (not rarity-scaled). */
export function instanceHealBonus(inst: ItemInstance): number {
  return getTemplate(inst.templateId).potionHealBonus ?? 0;
}

/**
 * Compare candidate gear vs currently equipped in the same slot.
 * Weapons use ATK; armor/accessories use DEF (heal bonus breaks DEF ties).
 */
export type EquipCompareDir = 'up' | 'down' | 'same' | 'none';

export interface EquipCompareResult {
  dir: EquipCompareDir;
  /** ATK or DEF (or empty for non-gear). */
  stat: 'ATK' | 'DEF' | '';
  candidate: number;
  equipped: number;
  /** candidate - equipped (positive = upgrade). */
  delta: number;
  /** Short glyph for UI: ▲ / ▼ / = / '' */
  arrow: string;
}

export function equipCompareArrow(dir: EquipCompareDir): string {
  if (dir === 'up') return '▲';
  if (dir === 'down') return '▼';
  if (dir === 'same') return '=';
  return '';
}

/**
 * Primary combat score for an instance in its slot.
 * Weapon → ATK. Armor uses class-aware DEF when `save` is provided.
 */
export function gearPrimaryScore(
  inst: ItemInstance,
  save?: Pick<SaveData, 'primaryClass' | 'secondaryClass' | 'bag'>,
): {
  stat: 'ATK' | 'DEF' | '';
  value: number;
  display: number;
} {
  const t = getTemplate(inst.templateId);
  if (!t.slot || t.slot === 'key') {
    return { stat: '', value: 0, display: 0 };
  }
  if (t.slot === 'weapon') {
    const atk = instanceAtk(inst);
    return { stat: 'ATK', value: atk, display: atk };
  }
  // Lazy import avoided — class-aware DEF inlined via optional save
  let def = instanceDef(inst);
  const heal = instanceHealBonus(inst);
  if (save) {
    // Mirror class-gear effectiveGearDef without circular import:
    // inventory imports class-gear; class-gear imports items. So we
    // re-export a thin wrapper below after class-gear exists.
    def = _effectiveDefForCompare(save, inst);
  }
  return { stat: 'DEF', value: def + heal * 0.01, display: def };
}

/** Filled by registerEffectiveDefHook from class-gear to avoid cycles. */
let _effectiveDefForCompare: (
  save: Pick<SaveData, 'primaryClass' | 'secondaryClass' | 'bag'>,
  inst: ItemInstance,
) => number = (_s, inst) => instanceDef(inst);

export function registerEffectiveDefHook(
  fn: typeof _effectiveDefForCompare,
): void {
  _effectiveDefForCompare = fn;
}

/**
 * Compare bag item to equipped piece in the same slot on hero or buddy.
 * Already-equipped items return `same`. Stacks / non-gear → `none`.
 * DEF compares use class proficiency + affinity when save has a class.
 */
export function compareToEquipped(
  save: SaveData,
  inst: ItemInstance | undefined,
  target: 'hero' | 'bud' = 'hero',
): EquipCompareResult {
  const empty: EquipCompareResult = {
    dir: 'none',
    stat: '',
    candidate: 0,
    equipped: 0,
    delta: 0,
    arrow: '',
  };
  if (!inst) return empty;
  const t = getTemplate(inst.templateId);
  if (!t.slot || t.slot === 'key') return empty;

  const cand = gearPrimaryScore(inst, save);
  if (!cand.stat) return empty;

  const equipMap = target === 'bud' ? save.budEquipped : save.equipped;
  const eqUid = equipMap?.[t.slot] ?? null;
  if (eqUid === inst.uid) {
    return {
      dir: 'same',
      stat: cand.stat,
      candidate: cand.display,
      equipped: cand.display,
      delta: 0,
      arrow: '=',
    };
  }

  let eqScore = 0;
  let eqDisplay = 0;
  if (eqUid) {
    const eqInst = findInBag(save, eqUid);
    if (eqInst) {
      const s = gearPrimaryScore(eqInst, save);
      eqScore = s.value;
      eqDisplay = s.display;
    }
  }

  const deltaScore = cand.value - eqScore;
  const deltaDisplay = cand.display - eqDisplay;
  let dir: EquipCompareDir = 'same';
  if (deltaScore > 1e-6) dir = 'up';
  else if (deltaScore < -1e-6) dir = 'down';

  return {
    dir,
    stat: cand.stat,
    candidate: cand.display,
    equipped: eqDisplay,
    delta: deltaDisplay,
    arrow: equipCompareArrow(dir),
  };
}

/** One-line blurb for inventory detail, e.g. "ATK 5 ▲ (+2 vs equipped)". */
export function equipCompareDetailLine(cmp: EquipCompareResult): string {
  if (cmp.dir === 'none' || !cmp.stat) return '';
  if (cmp.dir === 'same') {
    return `${cmp.stat} ${cmp.candidate}  =  EQUIPPED`;
  }
  const sign = cmp.delta > 0 ? '+' : '';
  const vs =
    cmp.equipped === 0 && cmp.dir === 'up'
      ? 'empty slot'
      : `equipped ${cmp.equipped}`;
  return `${cmp.stat} ${cmp.candidate}  ${cmp.arrow}  (${sign}${cmp.delta} vs ${vs})`;
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
