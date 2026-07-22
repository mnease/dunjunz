/**
 * Scrolls & tomes — usable bag stacks with class-aware buffs.
 * Pure helpers; no land ceremony side effects.
 */

import type { ClassId, SaveData } from '../types';
import { getTemplate } from './items';

/** Classes that get full magic-item benefit from combat tomes/scrolls. */
export const MAGIC_CLASSES: ReadonlySet<ClassId> = new Set([
  'wizard',
  'sorcerer',
  'warlock',
  'cleric',
  'bard',
  'druid',
]);

export function isMagicClass(save: SaveData): boolean {
  const p = save.primaryClass;
  const s = save.secondaryClass;
  if (p && MAGIC_CLASSES.has(p)) return true;
  if (s && MAGIC_CLASSES.has(s)) return true;
  return false;
}

export type ScrollId =
  | 'scroll_ward'
  | 'scroll_spark'
  | 'scroll_light'
  | 'tome_embers';

export const SCROLL_IDS: readonly ScrollId[] = [
  'scroll_ward',
  'scroll_spark',
  'scroll_light',
  'tome_embers',
] as const;

export function isScrollOrTomeId(id: string): id is ScrollId {
  return (SCROLL_IDS as readonly string[]).includes(id);
}

export interface ScrollUseResult {
  ok: boolean;
  save: SaveData;
  message?: string;
  reason?: string;
  /** Never land ceremony. */
  setsBossDefeated: false;
  landsClearedChanged: false;
}

function consumeStack(save: SaveData, id: string): SaveData | null {
  const n = save.stacks[id] ?? 0;
  if (n <= 0) return null;
  const stacks = { ...save.stacks };
  stacks[id] = n - 1;
  if (stacks[id]! <= 0) delete stacks[id];
  return { ...save, stacks };
}

/**
 * Apply scroll/tome. Pure — no portal/land clear.
 * - scroll_ward: +DEF buff (anyone)
 * - scroll_spark: ATK buff (stronger for magic classes)
 * - scroll_light: temporary carried light fuel (anyone)
 * - tome_embers: magic-class only big ATK+INT-style combat buff
 */
export function useScrollOrTome(
  save: SaveData,
  templateId: string,
): ScrollUseResult {
  if (!isScrollOrTomeId(templateId)) {
    return {
      ok: false,
      save,
      reason: 'NOT A SCROLL',
      setsBossDefeated: false,
      landsClearedChanged: false,
    };
  }
  const t = getTemplate(templateId);
  if (!t.usable) {
    return {
      ok: false,
      save,
      reason: 'CANNOT USE THAT',
      setsBossDefeated: false,
      landsClearedChanged: false,
    };
  }

  const beforeBoss = save.bossDefeated;
  const beforeLands = [...(save.landsCleared ?? [])];

  if (templateId === 'tome_embers' && !isMagicClass(save)) {
    return {
      ok: false,
      save,
      reason: 'TOME REQUIRES A MAGIC CLASS',
      setsBossDefeated: false,
      landsClearedChanged: false,
    };
  }

  const paid = consumeStack(save, templateId);
  if (!paid) {
    return {
      ok: false,
      save,
      reason: 'YOU DO NOT HAVE THAT',
      setsBossDefeated: false,
      landsClearedChanged: false,
    };
  }

  let next: SaveData = { ...paid };
  let message = 'USED SCROLL';

  if (templateId === 'scroll_ward') {
    next = {
      ...next,
      buffDef: 2,
      buffMs: 60_000,
    };
    message = 'SCROLL OF WARD — +2 DEF (60s)';
  } else if (templateId === 'scroll_spark') {
    const mag = isMagicClass(next);
    next = {
      ...next,
      buffAtk: mag ? 3 : 1,
      buffMs: mag ? 75_000 : 45_000,
    };
    message = mag
      ? 'SCROLL OF SPARK — +3 ATK (magic attunement)'
      : 'SCROLL OF SPARK — +1 ATK (muted for non-casters)';
  } else if (templateId === 'scroll_light') {
    // Temporary light without a physical torch stack
    next = {
      ...next,
      activeLight: 'torch',
      lightFuelMs: 45_000,
    };
    message = 'SCROLL OF LIGHT — TORCH FLAME (45s)';
  } else if (templateId === 'tome_embers') {
    next = {
      ...next,
      buffAtk: 4,
      buffDef: 1,
      buffMs: 90_000,
    };
    message = 'TOME OF EMBERS — +4 ATK +1 DEF (90s)';
  }

  // Hard guarantee: ceremony flags untouched
  next = {
    ...next,
    bossDefeated: beforeBoss,
    landsCleared: beforeLands,
  };

  return {
    ok: true,
    save: next,
    message,
    setsBossDefeated: false,
    landsClearedChanged: false,
  };
}

/** Tick temporary combat buffs. */
export function tickCombatBuffs(
  save: SaveData,
  dtMs: number,
): SaveData {
  const ms = save.buffMs ?? 0;
  if (ms <= 0) {
    if (save.buffAtk || save.buffDef) {
      return { ...save, buffAtk: 0, buffDef: 0, buffMs: 0 };
    }
    return save;
  }
  const left = Math.max(0, ms - Math.max(0, dtMs));
  if (left <= 0) {
    return { ...save, buffAtk: 0, buffDef: 0, buffMs: 0 };
  }
  return { ...save, buffMs: left };
}
