/**
 * Auto vs manual level-up stat packages for the hero.
 * Auto: +2 lowest, +1 second-lowest (ties broken randomly).
 * Every 5th level: prefer class-flavored focus if available.
 */

import type { AttrId, Attributes, SaveData } from '../types';
import { ATTR_IDS, recomputeMaxHp } from './attributes';
import { LEVEL_UP_MINOR_BONUS } from './progression';
import { applyAutoPackage } from './army-level';
import { CLASSES, type ClassId } from './classes';

/** Infer focus stats from primary class bonuses (highest bonus attrs). */
export function classFocusStats(
  primaryClass: ClassId | null | undefined,
): { primary: AttrId; secondary: AttrId } {
  if (!primaryClass || !CLASSES[primaryClass]) {
    return { primary: 'str', secondary: 'vit' };
  }
  const bonuses = CLASSES[primaryClass].bonuses;
  const ranked = ATTR_IDS.map((id) => ({
    id,
    v: bonuses[id] ?? 0,
  })).sort((a, b) => b.v - a.v || a.id.localeCompare(b.id));
  const primary = ranked[0]!.id;
  const secondary =
    ranked.find((r) => r.id !== primary && r.v > 0)?.id ??
    ATTR_IDS.find((a) => a !== primary) ??
    'vit';
  return { primary, secondary };
}

function withAttrs(save: SaveData, attrs: Attributes): SaveData {
  const maxHp = recomputeMaxHp(attrs);
  return {
    ...save,
    attrs,
    maxHp,
    hp: Math.min(save.hp, maxHp),
  };
}

/**
 * Spend all pending packages with auto rules.
 * Completes mid-package (pendingAttrMajor) first.
 */
export function flushAutoStatPackages(
  save: SaveData,
  rng: () => number = Math.random,
): { save: SaveData; notes: string[] } {
  let next = { ...save, attrs: { ...save.attrs } };
  const notes: string[] = [];
  const focus = classFocusStats(next.primaryClass);

  // Finish open package: +1 on second-lowest that isn't pending major
  if (next.pendingAttrMajor) {
    const pending = next.pendingAttrMajor;
    const ordered = ATTR_IDS.map((id) => ({ id, v: next.attrs[id] })).sort(
      (a, b) => a.v - b.v || (rng() < 0.5 ? -1 : 1),
    );
    const minor =
      ordered.find((o) => o.id !== pending)?.id ??
      ATTR_IDS.find((a) => a !== pending)!;
    next.attrs = {
      ...next.attrs,
      [minor]: next.attrs[minor] + LEVEL_UP_MINOR_BONUS,
    };
    next.attrPoints = Math.max(0, next.attrPoints - 1);
    next.pendingAttrMajor = null;
    notes.push(`+${LEVEL_UP_MINOR_BONUS} ${minor.toUpperCase()} (auto finish)`);
  }

  while (next.attrPoints > 0) {
    const r = applyAutoPackage(
      next.attrs,
      next.level,
      focus.primary,
      focus.secondary,
      rng,
    );
    next.attrs = r.attrs;
    next.attrPoints -= 1;
    next.pendingAttrMajor = null;
    notes.push(r.note);
  }

  next = withAttrs(next, next.attrs);
  // Growing maxHp: allow a bit of heal on auto vit bumps
  if (next.maxHp > save.maxHp) {
    next = {
      ...next,
      hp: Math.min(next.maxHp, next.hp + (next.maxHp - save.maxHp)),
    };
  }
  return { save: next, notes };
}

/** True when there is something auto-allocate can spend. */
export function hasUnspentStatPackages(save: SaveData): boolean {
  return save.attrPoints > 0 || !!save.pendingAttrMajor;
}
