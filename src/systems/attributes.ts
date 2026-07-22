import type { AttrId, Attributes, SaveData } from '../types';
import { effectiveAttrs } from './hero-identity';
import { findInBag, getTemplate, instanceAtk } from './items';
import {
  LEVEL_UP_MAJOR_BONUS,
  LEVEL_UP_MINOR_BONUS,
} from './progression';

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
  | { ok: true; save: SaveData; message: string; step: 'major' | 'minor' }
  | { ok: false; save: SaveData; reason: string };

function withAttrs(save: SaveData, attrs: Attributes): SaveData {
  const maxHp = recomputeMaxHp(attrs);
  const hp = Math.min(save.hp, maxHp);
  return {
    ...save,
    attrs,
    maxHp,
    hp: Math.max(hp, save.hp > maxHp ? maxHp : save.hp),
  };
}

/**
 * Level-up package spend (inventory 1–5):
 * 1) First pick: +2 to that stat (package not consumed yet).
 * 2) Second pick: +1 to a *different* stat, then consume one package.
 *
 * No hard cap on how high a stat can go.
 */
export function spendAttrPoint(save: SaveData, attr: AttrId): SpendResult {
  if (!ATTR_IDS.includes(attr)) {
    return { ok: false, save, reason: 'UNKNOWN ATTR' };
  }

  const pending = save.pendingAttrMajor ?? null;

  // Step 2: minor +1 on a different stat
  if (pending) {
    if (attr === pending) {
      return {
        ok: false,
        save,
        reason: `+1 MUST BE A DIFFERENT STAT (NOT ${pending.toUpperCase()})`,
      };
    }
    const attrs = {
      ...save.attrs,
      [attr]: save.attrs[attr] + LEVEL_UP_MINOR_BONUS,
    };
    const next = withAttrs(
      {
        ...save,
        attrs,
        attrPoints: Math.max(0, save.attrPoints - 1),
        pendingAttrMajor: null,
      },
      attrs,
    );
    return {
      ok: true,
      save: next,
      step: 'minor',
      message: `+${LEVEL_UP_MINOR_BONUS} ${attr.toUpperCase()} (PACKAGE DONE)`,
    };
  }

  // Step 1: major +2
  if (save.attrPoints <= 0) {
    return { ok: false, save, reason: 'NO LEVEL-UP PACKAGES' };
  }
  const attrs = {
    ...save.attrs,
    [attr]: save.attrs[attr] + LEVEL_UP_MAJOR_BONUS,
  };
  const next = withAttrs(
    {
      ...save,
      attrs,
      pendingAttrMajor: attr,
    },
    attrs,
  );
  return {
    ok: true,
    save: next,
    step: 'major',
    message: `+${LEVEL_UP_MAJOR_BONUS} ${attr.toUpperCase()} — NOW PICK +1 ON ANOTHER (1–5)`,
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
  const buff = Math.max(0, save.buffAtk ?? 0);
  if (style === 'ranged') {
    const dex = eff.dex + imbueDex;
    const bonus = Math.floor(Math.max(0, dex - 1) / 2);
    return Math.max(1, 1 + weaponAtk + bonus + buff);
  }
  if (style === 'magic') {
    const intel = eff.int + imbueInt;
    const bonus = Math.floor(Math.max(0, intel - 1) / 2);
    return Math.max(1, 1 + weaponAtk + bonus + buff);
  }
  const totalStr = eff.str + imbueStr;
  const strBonus = Math.floor(Math.max(0, totalStr - 1) / 2);
  return Math.max(1, 1 + weaponAtk + strBonus + buff);
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
