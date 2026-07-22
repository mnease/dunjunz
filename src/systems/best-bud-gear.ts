/**
 * Best Bud progression + gear (shared bag, separate equip slots).
 */

import type { EquipSlot, EquippedMap, SaveData } from '../types';
import {
  ALL_EQUIP_SLOTS,
  DEF_SLOTS,
  displayItemName,
  emptyEquipped,
  findInBag,
  getTemplate,
  instanceAtk,
} from './items';
import { effectiveGearDef } from './class-gear';
import { levelFromXp, xpToAdvanceFrom, xpToReachLevel } from './progression';
import { budAttackDamage, budCombatProfile } from './best-bud-combat';
import { getBestBud, isCompanionActive } from './best-bud';
import { syncDerivedStats } from './inventory';

/** Buddy cannot wear the keyring. */
export const BUD_EQUIP_SLOTS: EquipSlot[] = ALL_EQUIP_SLOTS.filter(
  (s) => s !== 'key',
);

export type EquipTarget = 'hero' | 'bud';

export type BudEquipResult =
  | { ok: true; save: SaveData; message: string }
  | { ok: false; save: SaveData; reason: string };

export function emptyBudEquipped(): EquippedMap {
  return emptyEquipped();
}

/** Ensure bud progress fields exist (migration-safe). */
export function ensureBudProgress(save: SaveData): SaveData {
  const budEquipped = {
    ...emptyBudEquipped(),
    ...(save.budEquipped ?? {}),
  };
  // Drop key if somehow set
  budEquipped.key = null;
  let budXp = typeof save.budXp === 'number' ? Math.max(0, save.budXp) : 0;
  let budLevel =
    typeof save.budLevel === 'number' && save.budLevel >= 1
      ? save.budLevel
      : levelFromXp(budXp);
  // Keep level in sync with xp
  budLevel = levelFromXp(budXp);
  return {
    ...save,
    budXp,
    budLevel,
    budEquipped,
  };
}

export function budXpProgress(save: SaveData): {
  level: number;
  xp: number;
  into: number;
  need: number;
} {
  const s = ensureBudProgress(save);
  const level = s.budLevel;
  const xp = s.budXp;
  const at = xpToReachLevel(level);
  const need = xpToAdvanceFrom(level);
  const into = Math.max(0, xp - at);
  return { level, xp, into, need };
}

/**
 * Grant XP to the bud (same curve as the hero).
 * Only while companion is active.
 */
export function grantBudXp(
  save: SaveData,
  amount: number,
): {
  save: SaveData;
  leveledUp: boolean;
  levelsGained: number;
  prevLevel: number;
} {
  if (!isCompanionActive(save) || !save.bestBudId) {
    return {
      save,
      leveledUp: false,
      levelsGained: 0,
      prevLevel: save.budLevel ?? 1,
    };
  }
  let next = ensureBudProgress(save);
  const prevLevel = next.budLevel;
  const gain = Math.max(0, Math.floor(amount));
  next = {
    ...next,
    budXp: next.budXp + gain,
  };
  next.budLevel = levelFromXp(next.budXp);
  const levelsGained = Math.max(0, next.budLevel - prevLevel);
  return {
    save: next,
    leveledUp: levelsGained > 0,
    levelsGained,
    prevLevel,
  };
}

/** Weapon ATK on bud. */
export function budWeaponAtk(save: SaveData): number {
  const s = ensureBudProgress(save);
  const uid = s.budEquipped.weapon;
  if (!uid) return 0;
  const inst = findInBag(s, uid);
  return inst ? instanceAtk(inst) : 0;
}

/** Total DEF from bud armor pieces. */
export function budArmorDef(save: SaveData): number {
  const s = ensureBudProgress(save);
  let def = 0;
  for (const slot of DEF_SLOTS) {
    const uid = s.budEquipped[slot];
    if (!uid) continue;
    const inst = findInBag(s, uid);
    if (inst) def += effectiveGearDef(save, inst);
  }
  return def;
}

/** Full strike damage: profile + bud level + weapon + half armor. */
export function computeBudStrikeDamage(save: SaveData): number {
  const s = ensureBudProgress(save);
  if (!s.bestBudId) return 0;
  const base = budAttackDamage(s.bestBudId, s.budLevel);
  const weapon = budWeaponAtk(s);
  const armorBonus = Math.floor(budArmorDef(s) / 2);
  return Math.max(1, base + weapon + armorBonus);
}

/** Whisp heal scales with bud level + a little armor. */
export function computeBudHealAmount(save: SaveData): number {
  const s = ensureBudProgress(save);
  const L = s.budLevel;
  let heal = L >= 10 ? 3 : L >= 5 ? 2 : 1;
  if (budArmorDef(s) >= 4) heal += 1;
  return heal;
}

function clearUidFromEquipped(
  map: EquippedMap,
  uid: string,
): EquippedMap {
  const next = { ...map };
  for (const slot of ALL_EQUIP_SLOTS) {
    if (next[slot] === uid) next[slot] = null;
  }
  return next;
}

/** Equip bag item onto the bud (not key). Removes from hero if worn. */
export function equipBudUid(save: SaveData, uid: string): BudEquipResult {
  if (!isCompanionActive(save)) {
    return { ok: false, save, reason: 'NO BUDDY OUT' };
  }
  let next = ensureBudProgress(save);
  const inst = findInBag(next, uid);
  if (!inst) return { ok: false, save: next, reason: 'NOT IN BAG' };
  const t = getTemplate(inst.templateId);
  if (!t.slot) return { ok: false, save: next, reason: 'CANNOT EQUIP THAT' };
  if (t.slot === 'key') {
    return { ok: false, save: next, reason: 'BUDDY CAN\'T HOLD KEYS' };
  }
  // Item can't be on both
  const heroEq = clearUidFromEquipped(next.equipped, uid);
  const budEq = {
    ...clearUidFromEquipped(next.budEquipped, uid),
    [t.slot]: uid,
  };
  next = syncDerivedStats({
    ...next,
    equipped: heroEq,
    budEquipped: budEq,
  });
  const bud = getBestBud(next.bestBudId);
  return {
    ok: true,
    save: next,
    message: `${bud?.name ?? 'BUD'} EQUIPPED ${displayItemName(inst)}`,
  };
}

export function unequipBudSlot(save: SaveData, slot: EquipSlot): BudEquipResult {
  if (!isCompanionActive(save)) {
    return { ok: false, save, reason: 'NO BUDDY OUT' };
  }
  let next = ensureBudProgress(save);
  if (slot === 'key') {
    return { ok: false, save: next, reason: 'BUDDY HAS NO KEY SLOT' };
  }
  if (!next.budEquipped[slot]) {
    return { ok: false, save: next, reason: `NO BUDDY ${slot.toUpperCase()}` };
  }
  next = {
    ...next,
    budEquipped: { ...next.budEquipped, [slot]: null },
  };
  return {
    ok: true,
    save: next,
    message: `BUDDY ${slot.toUpperCase()} OFF`,
  };
}

export function bagItemsForBudSlot(save: SaveData, slot: EquipSlot) {
  if (slot === 'key') return [];
  return save.bag.filter((i) => getTemplate(i.templateId).slot === slot);
}

export function cycleBudSlotEquip(
  save: SaveData,
  slot: EquipSlot,
): BudEquipResult {
  if (slot === 'key') {
    return { ok: false, save, reason: 'BUDDY CAN\'T HOLD KEYS' };
  }
  const options = save.bag.filter(
    (i) => getTemplate(i.templateId).slot === slot,
  );
  if (!options.length) {
    return { ok: false, save, reason: `NO ${slot.toUpperCase()} IN BAG` };
  }
  const s = ensureBudProgress(save);
  const cur = s.budEquipped[slot];
  if (!cur) return equipBudUid(s, options[0]!.uid);
  const idx = options.findIndex((i) => i.uid === cur);
  if (idx < 0) return equipBudUid(s, options[0]!.uid);
  if (idx >= options.length - 1) return unequipBudSlot(s, slot);
  return equipBudUid(s, options[idx + 1]!.uid);
}

/** Hero equip that also clears the uid from bud. */
export function equipHeroUid(save: SaveData, uid: string): BudEquipResult {
  const inst = findInBag(save, uid);
  if (!inst) return { ok: false, save, reason: 'NOT IN BAG' };
  const t = getTemplate(inst.templateId);
  if (!t.slot) return { ok: false, save, reason: 'CANNOT EQUIP THAT' };
  let next = ensureBudProgress(save);
  const budEq = clearUidFromEquipped(next.budEquipped, uid);
  const equipped = { ...next.equipped, [t.slot]: uid };
  next = syncDerivedStats({
    ...next,
    equipped,
    budEquipped: budEq,
  });
  return {
    ok: true,
    save: next,
    message: `EQUIPPED ${displayItemName(inst)}`,
  };
}

export function cycleHeroSlotEquip(
  save: SaveData,
  slot: EquipSlot,
): BudEquipResult {
  const options = save.bag.filter(
    (i) => getTemplate(i.templateId).slot === slot,
  );
  if (!options.length) {
    return { ok: false, save, reason: `NO ${slot.toUpperCase()} IN BAG` };
  }
  const cur = save.equipped[slot];
  if (!cur) return equipHeroUid(save, options[0]!.uid);
  const idx = options.findIndex((i) => i.uid === cur);
  if (idx < 0) return equipHeroUid(save, options[0]!.uid);
  if (idx >= options.length - 1) {
    const equipped = { ...save.equipped, [slot]: null };
    const next = syncDerivedStats({ ...save, equipped });
    return { ok: true, save: next, message: `${slot.toUpperCase()} UNEQUIPPED` };
  }
  return equipHeroUid(save, options[idx + 1]!.uid);
}

export function equipForTarget(
  save: SaveData,
  uid: string,
  target: EquipTarget,
): BudEquipResult {
  return target === 'bud' ? equipBudUid(save, uid) : equipHeroUid(save, uid);
}

export function cycleEquipForTarget(
  save: SaveData,
  slot: EquipSlot,
  target: EquipTarget,
): BudEquipResult {
  return target === 'bud'
    ? cycleBudSlotEquip(save, slot)
    : cycleHeroSlotEquip(save, slot);
}

export function budGearSummary(save: SaveData): string {
  if (!isCompanionActive(save)) return '';
  const s = ensureBudProgress(save);
  const bud = getBestBud(s.bestBudId);
  const name = bud?.name ?? 'BUD';
  const prof = budCombatProfile(s.bestBudId);
  const dmg = computeBudStrikeDamage(s);
  const def = budArmorDef(s);
  const xp = budXpProgress(s);
  return [
    `${name}  LV${xp.level}`,
    `XP ${xp.into}/${xp.need}`,
    `ATK ${dmg}  DEF ${def}`,
    prof ? prof.abilityName : '',
  ]
    .filter(Boolean)
    .join('\n');
}
