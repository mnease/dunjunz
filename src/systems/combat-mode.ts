/**
 * Combat presentation mode — Mirror of Changing.
 * Live = real-time crawl; turn = classic turn-based battles.
 */

import type { CombatMode, SaveData } from '../types';

export const COMBAT_MODES: {
  id: CombatMode;
  label: string;
  blurb: string;
}[] = [
  {
    id: 'live',
    label: 'LIVE ACTION RPG',
    blurb:
      'Real-time exploration and combat — like classic top-down action RPGs. Swing, dodge, and roam freely.',
  },
  {
    id: 'turn',
    label: 'TURN-BASED RPG',
    blurb:
      'Classic party battles — heroes on the left, enemies on the right. Initiative from speed; Attack, Defend, Item, Flee.',
  },
];

export function getCombatMode(save: SaveData): CombatMode {
  return save.combatMode === 'turn' ? 'turn' : 'live';
}

export function setCombatMode(save: SaveData, mode: CombatMode): SaveData {
  if (mode !== 'live' && mode !== 'turn') return save;
  return { ...save, combatMode: mode };
}

export function combatModeLabel(mode: CombatMode): string {
  return COMBAT_MODES.find((m) => m.id === mode)?.label ?? 'LIVE ACTION RPG';
}
