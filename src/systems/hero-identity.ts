/**
 * Effective hero stats = base attrs + race + class bonuses.
 * Pending pick detection for level-gated class / multiclass / race.
 */

import type { Attributes, SaveData } from '../types';
import {
  canPickPrimaryClass,
  canPickSecondaryClass,
  classBonusAttrs,
  classLabel,
} from './classes';
import {
  canChangeRace,
  raceBonusAttrs,
  raceLabel,
  sumAttrPartials,
} from './races';

export type HeroPickKind = 'class' | 'multiclass' | 'race';

/** Base attrs + identity bonuses (not written back to save.attrs). */
export function effectiveAttrs(save: SaveData): Attributes {
  const bonus = sumAttrPartials(
    raceBonusAttrs(save.race ?? 'human', !!save.raceChosen),
    classBonusAttrs(save.primaryClass, save.secondaryClass),
  );
  return {
    str: save.attrs.str + bonus.str,
    dex: save.attrs.dex + bonus.dex,
    vit: save.attrs.vit + bonus.vit,
    int: save.attrs.int + bonus.int,
    lck: save.attrs.lck + bonus.lck,
  };
}

export function pendingHeroPick(save: SaveData): HeroPickKind | null {
  if (canPickPrimaryClass(save)) return 'class';
  if (canPickSecondaryClass(save)) return 'multiclass';
  if (canChangeRace(save)) return 'race';
  return null;
}

export function heroIdentityLine(save: SaveData): string {
  const race = raceLabel(save);
  const cls = classLabel(save);
  return `${race} ${cls}`;
}
