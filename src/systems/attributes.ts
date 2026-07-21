import type { AttrId, Attributes, SaveData } from '../types';
import { effectiveAttrs } from './hero-identity';
import { findInBag, getTemplate, instanceAtk } from './items';

export const ATTR_IDS: AttrId[] = ['str', 'dex', 'vit', 'int', 'lck'];

export const ATTR_LABELS: Record<AttrId, string> = {
  str: 'STR',
  dex: 'DEX',
  vit: 'VIT',
  int: 'INT',
  lck: 'LCK',
};

export function defaultAttrs(): Attributes {
  return { str: 1, dex: 1, vit: 1, int: 1, lck: 1 };
}

export const BASE_MAX_HP = 6;

export function recomputeMaxHp(attrs: Attributes): number {
  return BASE_MAX_HP + Math.max(0, attrs.vit - 1);
}

export type SpendResult =
  | { ok: true; save: SaveData }
  | { ok: false; save: SaveData; reason: string };

export function spendAttrPoint(save: SaveData, attr: AttrId): SpendResult {
  if (save.attrPoints <= 0) {
    return { ok: false, save, reason: 'NO ATTRIBUTE POINTS' };
  }
  if (!ATTR_IDS.includes(attr)) {
    return { ok: false, save, reason: 'UNKNOWN ATTR' };
  }
  const attrs = { ...save.attrs, [attr]: save.attrs[attr] + 1 };
  const maxHp = recomputeMaxHp(attrs);
  // Growing maxHp does not auto-heal; only raise ceiling
  const hp = Math.min(save.hp, maxHp);
  return {
    ok: true,
    save: {
      ...save,
      attrs,
      attrPoints: save.attrPoints - 1,
      maxHp,
      hp: Math.max(hp, save.hp > maxHp ? maxHp : save.hp),
    },
  };
}

/** Player damage including weapon + STR/DEX/INT (by style) + class/race + imbues. */
export function computePlayerDamage(save: SaveData): number {
  let weaponAtk = 0;
  let imbueStr = 0;
  let imbueDex = 0;
  let imbueInt = 0;
  let style: 'melee' | 'ranged' | 'magic' = 'melee';
  const wUid = save.equipped.weapon;
  if (wUid) {
    const inst = findInBag(save, wUid);
    if (inst) {
      weaponAtk = instanceAtk(inst);
      imbueStr = inst.attrBonuses?.str ?? 0;
      imbueDex = inst.attrBonuses?.dex ?? 0;
      imbueInt = inst.attrBonuses?.int ?? 0;
      const t = getTemplate(inst.templateId);
      style = t.weaponStyle ?? 'melee';
    }
  }
  const eff = effectiveAttrs(save);
  if (style === 'ranged') {
    const dex = eff.dex + imbueDex;
    const bonus = Math.floor(Math.max(0, dex - 1) / 2);
    return Math.max(1, 1 + weaponAtk + bonus);
  }
  if (style === 'magic') {
    const intel = eff.int + imbueInt;
    const bonus = Math.floor(Math.max(0, intel - 1) / 2);
    return Math.max(1, 1 + weaponAtk + bonus);
  }
  const totalStr = eff.str + imbueStr;
  const strBonus = Math.floor(Math.max(0, totalStr - 1) / 2);
  return Math.max(1, 1 + weaponAtk + strBonus);
}

/** Potion heal including amulet bonus + INT (class/race aware). */
export function computePotionHeal(save: SaveData, baseHeal: number): number {
  let bonus = 0;
  const aUid = save.equipped.amulet;
  if (aUid) {
    const inst = findInBag(save, aUid);
    if (inst) {
      bonus += getTemplate(inst.templateId).potionHealBonus ?? 0;
    }
  }
  const eff = effectiveAttrs(save);
  bonus += Math.floor(Math.max(0, eff.int - 1) / 2);
  return baseHeal + bonus;
}
