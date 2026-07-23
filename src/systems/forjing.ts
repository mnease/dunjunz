/**
 * Forjing — craft and enhance gear (intentional spelling).
 * Graphic dual-pane UI: actions left, materials right.
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

/** Core forje mats always shown + creature parts when owned. */
export const FORJING_PANEL_MATS = [
  ...FORJING_MATERIALS,
  'slime_gel',
  'bone',
  'wolf_pelt',
  'cactus_spine',
  'ensign_badge',
  'torch',
  'lantern',
  'flashlight',
] as const;

export const FORJING_ACTION_COLS = 3;

export interface CraftRecipe {
  id: string;
  name: string;
  /** Result weapon/armor template (gear) OR stack id when stackResult is set. */
  resultTemplateId: string;
  cost: Partial<Record<string, number>>;
  coins?: number;
  blurb: string;
  /** When set, craft adds stacks instead of bag gear. */
  stackResult?: boolean;
  stackCount?: number;
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
  // ── Light ladder ──────────────────────────────────────
  {
    id: 'craft_torch',
    name: 'TORCH',
    resultTemplateId: 'torch',
    cost: { wood_shard: 1, slime_gel: 1 },
    coins: 5,
    blurb: 'Stick + gel. ~90s of light. [U]',
    stackResult: true,
    stackCount: 2,
  },
  {
    id: 'craft_lantern',
    name: 'LANTERN',
    resultTemplateId: 'lantern',
    cost: { ore_iron: 1, wood_shard: 1, ore_spark: 1 },
    coins: 25,
    blurb: 'Oil lamp. Outlasts a torch. [U]',
    stackResult: true,
    stackCount: 1,
  },
  {
    id: 'craft_flashlight',
    name: 'FLASHLIGHT',
    resultTemplateId: 'flashlight',
    cost: { ore_spark: 3, sand_crystal: 2, ore_iron: 1 },
    coins: 80,
    blurb: 'Electric torch. Bright science. [U]',
    stackResult: true,
    stackCount: 1,
  },
  {
    id: 'craft_staff_lightning',
    name: 'LIGHTNING STAFF',
    resultTemplateId: 'staff_lightning',
    cost: { ore_spark: 3, wood_shard: 2, sand_crystal: 1 },
    coins: 55,
    blurb: 'Light-blue crystal. FORJE ENHANCE for chain lightning (+1 hop per +).',
  },
];

/** One cell in the forje action grid (left pane). */
export interface ForjingAction {
  id: string;
  kind: 'enhance' | 'imbue' | 'craft';
  name: string;
  /** Texture key fragment: icon_${iconId} */
  iconId: string;
  cost: Partial<Record<string, number>>;
  coins: number;
  blurb: string;
  attr?: AttrId;
  recipeId?: string;
}

/** Material cell for the right pane. */
export interface ForjingMatCell {
  stackId: string;
  name: string;
  count: number;
  iconId: string;
}

export interface ForjingOpenPayload {
  save: SaveData;
  selectedIndex?: number;
}

export function listForjingActions(): ForjingAction[] {
  const ops: ForjingAction[] = [
    {
      id: 'enhance',
      kind: 'enhance',
      name: 'ENHANCE',
      iconId: 'ore_iron',
      cost: { ore_iron: 1, ore_spark: 1 },
      coins: 15,
      blurb:
        '+1 weapon enhancement (max +3). Lightning staff: each + unlocks another chain hop.',
    },
    {
      id: 'imbue_str',
      kind: 'imbue',
      name: 'IMBUE STR',
      iconId: 'ore_spark',
      cost: { ore_spark: 2, sand_crystal: 1 },
      coins: 25,
      blurb: '+1 STR on equipped weapon.',
      attr: 'str',
    },
    {
      id: 'imbue_dex',
      kind: 'imbue',
      name: 'IMBUE DEX',
      iconId: 'ore_spark',
      cost: { ore_spark: 2, sand_crystal: 1 },
      coins: 25,
      blurb: '+1 DEX on equipped weapon.',
      attr: 'dex',
    },
    {
      id: 'imbue_vit',
      kind: 'imbue',
      name: 'IMBUE VIT',
      iconId: 'ore_spark',
      cost: { ore_spark: 2, sand_crystal: 1 },
      coins: 25,
      blurb: '+1 VIT on equipped weapon.',
      attr: 'vit',
    },
  ];
  for (const r of CRAFT_RECIPES) {
    ops.push({
      id: r.id,
      kind: 'craft',
      name: r.name,
      iconId: r.resultTemplateId,
      cost: r.cost,
      coins: r.coins ?? 0,
      blurb: r.blurb,
      recipeId: r.id,
    });
  }
  return ops;
}

export function listForjingMats(save: SaveData): ForjingMatCell[] {
  const cells: ForjingMatCell[] = [];
  for (const id of FORJING_PANEL_MATS) {
    const count = save.stacks[id] ?? 0;
    // Always show core forje mats; parts only if owned
    const isCore = (FORJING_MATERIALS as readonly string[]).includes(id);
    if (!isCore && count <= 0) continue;
    const t = getTemplate(id);
    cells.push({
      stackId: id,
      name: t.name,
      count,
      iconId: id,
    });
  }
  return cells;
}

export function canAffordForjing(
  save: SaveData,
  action: ForjingAction,
): boolean {
  return hasCosts(save, action.cost, action.coins);
}

export function formatForjingCost(action: ForjingAction): string {
  const bits: string[] = [];
  for (const [k, n] of Object.entries(action.cost)) {
    if (!n) continue;
    bits.push(`${n} ${getTemplate(k).name}`);
  }
  if (action.coins > 0) bits.push(`${action.coins}c`);
  return bits.join(' + ') || 'FREE';
}

export function runForjingAction(
  save: SaveData,
  actionId: string,
): ForjingResult {
  if (actionId === 'enhance') return forjeEnhanceWeapon(save);
  if (actionId === 'imbue_str') return forjeImbueWeapon(save, 'str');
  if (actionId === 'imbue_dex') return forjeImbueWeapon(save, 'dex');
  if (actionId === 'imbue_vit') return forjeImbueWeapon(save, 'vit');
  if (actionId.startsWith('craft_')) return forjeCraft(save, actionId);
  return { ok: false, save, reason: 'UNKNOWN FORJE ACTION' };
}

export function forjingIconTexture(iconId: string): string {
  return `icon_${iconId}`;
}

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

/**
 * Lightning staff chain hops from enhancement rank.
 * +0 = main bolt only; +1/+2/+3 = 1/2/3 chain jumps to nearby foes.
 */
export function lightningChainHops(enhancement: number): number {
  const e = Math.max(0, Math.min(3, Math.floor(enhancement)));
  return e;
}

/** Damage multiplier for the nth chain hop (0 = primary path hits full). */
export function lightningChainDamageMul(hopIndex: number): number {
  // hop 0 primary = 1; hop 1 = 0.75; hop 2 = 0.6; hop 3 = 0.5
  if (hopIndex <= 0) return 1;
  if (hopIndex === 1) return 0.75;
  if (hopIndex === 2) return 0.6;
  return 0.5;
}

/** Max search radius (world px units use TILE*SCALE externally) in tiles. */
export function lightningChainRangeTiles(enhancement: number): number {
  return 2.8 + lightningChainHops(enhancement) * 0.35;
}

export function isLightningStaffTemplate(templateId: string): boolean {
  return templateId === 'staff_lightning';
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
  // Lightning staff eats more spark (chain power)
  const isBolt = isLightningStaffTemplate(inst.templateId);
  const cost = isBolt
    ? { ore_iron: 1, ore_spark: 2 }
    : { ore_iron: 1, ore_spark: 1 };
  const coins = isBolt ? 20 : 15;
  if (!hasCosts(save, cost, coins)) {
    return {
      ok: false,
      save,
      reason: isBolt
        ? 'NEED 1 IRON + 2 SPARK + 20c (LIGHTNING)'
        : 'NEED 1 IRON + 1 SPARK + 15c',
    };
  }
  let next = payCosts(save, cost, coins);
  const newEnh = inst.enhancement + 1;
  const bag = next.bag.map((b) =>
    b.uid === uid ? { ...b, enhancement: newEnh } : b,
  );
  next = syncDerivedStats({ ...next, bag });
  let message = `FORJED +1! NOW +${newEnh}`;
  if (isBolt) {
    const hops = lightningChainHops(newEnh);
    message =
      hops > 0
        ? `LIGHTNING +${newEnh} — CHAINS ${hops} NEARBY FOE${hops > 1 ? 'S' : ''}`
        : `LIGHTNING +${newEnh}`;
  }
  return {
    ok: true,
    save: next,
    message,
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

/** Craft gear into bag, or stackable lights into stacks. */
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
  if (recipe.stackResult) {
    const n = recipe.stackCount ?? 1;
    const stacks = { ...next.stacks };
    const id = recipe.resultTemplateId;
    stacks[id] = (stacks[id] ?? 0) + n;
    next = syncDerivedStats({ ...next, stacks });
    return {
      ok: true,
      save: next,
      message: `FORJED ${recipe.name}${n > 1 ? ` x${n}` : ''}!`,
    };
  }
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

/** Text fallback / toast helper (graphic UI is primary). */
export function formatForjingPanel(save: SaveData): string {
  const mats = FORJING_MATERIALS.map(
    (m) => `${getTemplate(m).name}: ${save.stacks[m] ?? 0}`,
  ).join(' · ');
  return [
    'FORJE OPEN',
    mats,
    `${save.coins}c`,
    'ARROWS SELECT · ENTER FORJE · F CLOSE',
  ].join('\n');
}

export function getWeaponAttrBonus(inst: ItemInstance, attr: AttrId): number {
  return inst.attrBonuses?.[attr] ?? 0;
}
