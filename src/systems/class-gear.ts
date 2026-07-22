/**
 * D&D-inspired armor categories + class proficiency / affinity.
 *
 * - Categories: cloth · light · medium · heavy (5e-style bands).
 * - Proficiency: class can wear the category well (full DEF).
 * - Unproficient: still wearable (Dunjunz is friendly) but DEF is reduced.
 * - Affinity: item tags one or more classes; primary OR secondary match
 *   grants a synergy bonus (dual-class friendly).
 */

import type { ClassId, ItemInstance, SaveData } from '../types';
import {
  findInBag,
  getTemplate,
  instanceDef,
  registerEffectiveDefHook,
} from './items';

/** D&D-style armor bands. Cloth = robes/cloaks (caster gear). */
export type ArmorCategory = 'cloth' | 'light' | 'medium' | 'heavy';

export const ARMOR_CATEGORIES: ArmorCategory[] = [
  'cloth',
  'light',
  'medium',
  'heavy',
];

/**
 * Which armor categories each class wears well (5e-inspired).
 * Dual-class: proficient if primary OR secondary lists the category.
 */
export const CLASS_ARMOR_PROFICIENCY: Record<ClassId, ArmorCategory[]> = {
  // Martial masters of steel
  fighter: ['light', 'medium', 'heavy'],
  paladin: ['light', 'medium', 'heavy'],
  // Rage — medium max in 5e; we allow light+medium well
  barbarian: ['light', 'medium'],
  // Skirmishers
  ranger: ['cloth', 'light', 'medium'],
  rogue: ['cloth', 'light'],
  monk: ['cloth'], // prefers mobility; cloth only
  // Divine / half-casters
  cleric: ['cloth', 'light', 'medium', 'heavy'],
  bard: ['cloth', 'light'],
  druid: ['cloth', 'light', 'medium'], // no heavy metal vibe
  // Full casters — cloth robes
  wizard: ['cloth'],
  sorcerer: ['cloth'],
  warlock: ['cloth', 'light'],
};

/** Flat DEF synergy when item affinity matches a class you have. */
export const CLASS_AFFINITY_DEF_BONUS = 1;
/** Multiplier when not proficient in the category (still usable). */
export const UNPROFICIENT_DEF_MULT = 0.65;

export function classHasArmorProficiency(
  classId: ClassId | null | undefined,
  category: ArmorCategory,
): boolean {
  if (!classId) return false;
  return (CLASS_ARMOR_PROFICIENCY[classId] ?? []).includes(category);
}

/** True if primary or secondary is proficient (multiclass-friendly). */
export function saveProficientInCategory(
  save: Pick<SaveData, 'primaryClass' | 'secondaryClass'>,
  category: ArmorCategory,
): boolean {
  return (
    classHasArmorProficiency(save.primaryClass, category) ||
    classHasArmorProficiency(save.secondaryClass, category)
  );
}

/** True if primary or secondary is in the affinity list. */
export function saveHasClassAffinity(
  save: Pick<SaveData, 'primaryClass' | 'secondaryClass'>,
  affinity: ClassId[] | undefined,
): boolean {
  if (!affinity?.length) return false;
  const p = save.primaryClass;
  const s = save.secondaryClass;
  return (!!p && affinity.includes(p)) || (!!s && affinity.includes(s));
}

export function armorCategoryOf(
  templateId: string,
): ArmorCategory | null {
  const t = getTemplate(templateId);
  return t.armorCategory ?? null;
}

/**
 * Effective DEF for one equipped instance after proficiency + affinity.
 * Weapons return 0 (use ATK path elsewhere).
 */
export function effectiveGearDef(
  save: Pick<SaveData, 'primaryClass' | 'secondaryClass'>,
  inst: ItemInstance,
): number {
  const t = getTemplate(inst.templateId);
  if (!t.slot || t.slot === 'weapon' || t.slot === 'key') return 0;

  let def = instanceDef(inst);
  const cat = t.armorCategory;

  // No class yet → full base DEF (pick class at L5 for synergy / proficiency).
  // With a class, unproficient categories take a D&D-style soft penalty.
  if (cat && save.primaryClass) {
    if (!saveProficientInCategory(save, cat)) {
      def = Math.max(0, Math.floor(def * UNPROFICIENT_DEF_MULT));
    }
  }

  if (saveHasClassAffinity(save, t.classAffinity)) {
    def += CLASS_AFFINITY_DEF_BONUS;
  }

  return def;
}

/**
 * Total armor from DEF_SLOTS using class-aware DEF.
 * Callers still add DEX contribution separately if needed.
 */
export function sumClassAwareGearDef(
  save: SaveData,
  equipMap?: SaveData['equipped'],
): number {
  const map = equipMap ?? save.equipped;
  let def = 0;
  const slots = [
    'shield',
    'helmet',
    'breastplate',
    'greaves',
    'shoes',
    'gloves',
    'amulet',
    'ring',
  ] as const;
  for (const slot of slots) {
    const uid = map[slot];
    if (!uid) continue;
    const inst = findInBag(save, uid);
    if (inst) def += effectiveGearDef(save, inst);
  }
  return def;
}

export type ClassGearHint =
  | { kind: 'synergy'; text: string }
  | { kind: 'proficient'; text: string }
  | { kind: 'unproficient'; text: string }
  | { kind: 'none'; text: string };

/** UI blurb for inventory detail (class pairing). */
export function classGearHint(
  save: Pick<SaveData, 'primaryClass' | 'secondaryClass'>,
  templateId: string,
): ClassGearHint {
  const t = getTemplate(templateId);
  if (!t.slot || t.slot === 'weapon' || t.slot === 'key') {
    return { kind: 'none', text: '' };
  }

  const affinity = t.classAffinity;
  if (affinity?.length && saveHasClassAffinity(save, affinity)) {
    const names = affinity.map((c) => c.toUpperCase()).join('/');
    return {
      kind: 'synergy',
      text: `CLASS SYNERGY (+${CLASS_AFFINITY_DEF_BONUS} DEF) · ${names}`,
    };
  }

  const cat = t.armorCategory;
  if (!cat) return { kind: 'none', text: '' };

  if (saveProficientInCategory(save, cat)) {
    return {
      kind: 'proficient',
      text: `PROFICIENT · ${cat.toUpperCase()} ARMOR`,
    };
  }

  // No class yet — neutral
  if (!save.primaryClass) {
    return {
      kind: 'none',
      text: `${cat.toUpperCase()} ARMOR · pick a class at L5 for bonuses`,
    };
  }

  return {
    kind: 'unproficient',
    text: `NOT PROFICIENT · ${cat.toUpperCase()} (DEF ×${UNPROFICIENT_DEF_MULT})`,
  };
}

export function armorCategoryLabel(cat: ArmorCategory): string {
  switch (cat) {
    case 'cloth':
      return 'CLOTH';
    case 'light':
      return 'LIGHT';
    case 'medium':
      return 'MEDIUM';
    case 'heavy':
      return 'HEAVY';
  }
}

// Wire class-aware DEF into item compare (avoids items ↔ class-gear cycle)
registerEffectiveDefHook((save, inst) =>
  effectiveGearDef(save as SaveData, inst),
);
