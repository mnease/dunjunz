/**
 * Forjing — craft and enhance gear (intentional spelling).
 */

import type { AttrId, ItemInstance, SaveData } from '../types';
import { findInBag, getTemplate, mintItem } from './items';
import { syncDerivedStats } from './inventory';

export const FORJING_MATERIALS = [
  'ore_iron',
  'ore_spark',
  'wood_shard',
  'sand_crystal',
] as const;

export type ForjingMaterial = (typeof FORJING_MATERIALS)[number];

export interface CraftRecipe {
  id: string;
  name: string;
  /** Result weapon/armor template. */
  resultTemplateId: string;
  cost: Partial<Record<string, number>>;
  coins?: number;
  blurb: string;
}

export const CRAFT_RECIPES: CraftRecipe[] = [
  {
    id: 'craft_iron_blade',
    name: 'IRON BLADE',
    resultTemplateId: 'iron_blade',
    cost: { ore_iron: 2, wood_shard: 1 },
    coins: 20,
    blurb: 'Sturdier than mild enthusiasm.',
  },
  {
    id: 'craft_sand_saber',
    name: 'SAND SABER',
    resultTemplateId: 'sand_saber',
    cost: { sand_crystal: 2, ore_spark: 1 },
    coins: 40,
    blurb: 'Dezertz steel. Hisses when swung.',
  },
  {
    id: 'craft_wood_shield',
    name: 'WOOD SHIELD',
    resultTemplateId: 'wood_shield',
    cost: { wood_shard: 2, ore_iron: 1 },
    coins: 15,
    blurb: 'A plank that means well.',
  },
  {
    id: 'craft_iron_shield',
    name: 'IRON SHIELD',
    resultTemplateId: 'iron_shield',
    cost: { ore_iron: 3, wood_shard: 1 },
    coins: 30,
    blurb: 'Proper blocking iron.',
  },
  {
    id: 'craft_copper_ring',
    name: 'COPPER RING',
    resultTemplateId: 'copper_ring',
    cost: { ore_iron: 1, ore_spark: 1 },
    coins: 18,
    blurb: 'Finger furniture. +DEF.',
  },
];

export type ForjingResult =
  | { ok: true; save: SaveData; message: string }
  | { ok: false; save: SaveData; reason: string };

function hasCosts(
  save: SaveData,
  cost: Partial<Record<string, number>>,
  coins = 0,
): boolean {
  if (save.coins < coins) return false;
  for (const [k, n] of Object.entries(cost)) {
    if ((save.stacks[k] ?? 0) < (n ?? 0)) return false;
  }
  return true;
}

function payCosts(
  save: SaveData,
  cost: Partial<Record<string, number>>,
  coins = 0,
): SaveData {
  const stacks = { ...save.stacks };
  for (const [k, n] of Object.entries(cost)) {
    stacks[k] = (stacks[k] ?? 0) - (n ?? 0);
    if (stacks[k] <= 0) delete stacks[k];
  }
  return { ...save, stacks, coins: save.coins - coins };
}

/** Strengthen equipped (or bag) weapon: +1 enhancement, max 3. */
export function forjeEnhanceWeapon(
  save: SaveData,
  weaponUid?: string | null,
): ForjingResult {
  const uid = weaponUid ?? save.equipped.weapon;
  if (!uid) return { ok: false, save, reason: 'NO WEAPON TO FORJE' };
  const inst = findInBag(save, uid);
  if (!inst) return { ok: false, save, reason: 'WEAPON NOT IN BAG' };
  const t = getTemplate(inst.templateId);
  if (t.slot !== 'weapon') {
    return { ok: false, save, reason: 'ONLY WEAPONZ CAN BE FORJED THIS WAY' };
  }
  if (inst.enhancement >= 3) {
    return { ok: false, save, reason: 'ALREADY MAX ENHANCEMENT (+3)' };
  }
  const cost = { ore_iron: 1, ore_spark: 1 };
  if (!hasCosts(save, cost, 15)) {
    return { ok: false, save, reason: 'NEED 1 IRON + 1 SPARK + 15c' };
  }
  let next = payCosts(save, cost, 15);
  const bag = next.bag.map((b) =>
    b.uid === uid ? { ...b, enhancement: b.enhancement + 1 } : b,
  );
  next = syncDerivedStats({ ...next, bag });
  return {
    ok: true,
    save: next,
    message: `FORJED +1! NOW +${inst.enhancement + 1}`,
  };
}

/** Imbue weapon with a stat enhancer (+1 to chosen attr, stackable). */
export function forjeImbueWeapon(
  save: SaveData,
  attr: AttrId,
  weaponUid?: string | null,
): ForjingResult {
  const uid = weaponUid ?? save.equipped.weapon;
  if (!uid) return { ok: false, save, reason: 'NO WEAPON TO IMBUE' };
  const inst = findInBag(save, uid);
  if (!inst) return { ok: false, save, reason: 'WEAPON NOT IN BAG' };
  if (getTemplate(inst.templateId).slot !== 'weapon') {
    return { ok: false, save, reason: 'ONLY WEAPONZ' };
  }
  const cost = { ore_spark: 2, sand_crystal: 1 };
  if (!hasCosts(save, cost, 25)) {
    return { ok: false, save, reason: 'NEED 2 SPARK + 1 SAND + 25c' };
  }
  let next = payCosts(save, cost, 25);
  const bag = next.bag.map((b) => {
    if (b.uid !== uid) return b;
    const attrBonuses = { ...(b.attrBonuses ?? {}) };
    attrBonuses[attr] = (attrBonuses[attr] ?? 0) + 1;
    return { ...b, attrBonuses };
  });
  next = syncDerivedStats({ ...next, bag });
  return {
    ok: true,
    save: next,
    message: `IMBUED +1 ${attr.toUpperCase()}!`,
  };
}

/** Craft a new weapon from a recipe. */
export function forjeCraft(
  save: SaveData,
  recipeId: string,
): ForjingResult {
  const recipe = CRAFT_RECIPES.find((r) => r.id === recipeId);
  if (!recipe) return { ok: false, save, reason: 'UNKNOWN RECIPE' };
  if (!hasCosts(save, recipe.cost, recipe.coins ?? 0)) {
    return { ok: false, save, reason: 'MISSING MATERIALZ OR COINZ' };
  }
  let next = payCosts(save, recipe.cost, recipe.coins ?? 0);
  const minted = mintItem(next, recipe.resultTemplateId, 'uncommon', 0);
  next = minted.save;
  // Auto-equip if no weapon
  if (!next.equipped.weapon) {
    next = {
      ...next,
      equipped: { ...next.equipped, weapon: minted.instance.uid },
    };
  }
  next = syncDerivedStats(next);
  return {
    ok: true,
    save: next,
    message: `FORJED ${recipe.name}!`,
  };
}

export function formatForjingPanel(save: SaveData): string {
  const mats = FORJING_MATERIALS.map(
    (m) => `${m}: ${save.stacks[m] ?? 0}`,
  ).join('  ');
  const lines = [
    '=== FORJING ===',
    mats || 'NO MATERIALZ',
    `COINS: ${save.coins}c`,
    '',
    '1 ENHANCE WEAPON  (1 iron + 1 spark + 15c)',
    '2 IMBUE +STR       (2 spark + 1 sand + 25c)',
    '3 IMBUE +DEX',
    '4 IMBUE +VIT',
    '5 CRAFT IRON BLADE (2 iron + 1 wood + 20c)',
    '6 CRAFT SAND SABER (2 sand + 1 spark + 40c)',
    '7 CRAFT WOOD SHIELD (2 wood + 1 iron + 15c)',
    '8 CRAFT IRON SHIELD (3 iron + 1 wood + 30c)',
    '9 CRAFT COPPER RING (1 iron + 1 spark + 18c)',
    '',
    'F CLOSE FORJE',
  ];
  return lines.join('\n');
}

export function getWeaponAttrBonus(inst: ItemInstance, attr: AttrId): number {
  return inst.attrBonuses?.[attr] ?? 0;
}
