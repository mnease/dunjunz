/**
 * One-time hard-mode boss loot — captain + king (Dungeon Master).
 */

import type { SaveData } from '../types';
import { mintItem } from './items';
import { autoEquipEmptySlots, syncDerivedStats } from './inventory';
import { markHardLandCleared } from './hard-mode';

export function rewardHardCaptain(save: SaveData): {
  save: SaveData;
  dialog: string[];
} {
  let next = save;
  const hasPhaser = next.bag.some((b) => b.templateId === 'phaser');
  if (!hasPhaser) {
    next = mintItem(next, 'phaser', 'rare', 1).save;
  }
  next = {
    ...next,
    stacks: {
      ...next.stacks,
      beam_me_up: (next.stacks.beam_me_up ?? 0) + 3,
    },
    flags: { ...next.flags, hard_captain_loot: true },
  };
  next = autoEquipEmptySlots(next);
  next = syncDerivedStats(next);
  return {
    save: next,
    dialog: [
      'THE CAPTAIN GOES DOWN WITH THE PLOT HOLE.',
      '"TELL STARFLEET… THE GOLD SHIRT… LOST…"',
      '',
      'YOU LOOT: PHASER (RANGED WEAPON)',
      'AND BEAM ME UP ×3 — [U] TO ENERGIZE',
      'TELEPORTS YOU TO THE DUNJUN MOUTH.',
      'HARD MODE STILL ON. STAY SHARP.',
    ],
  };
}

/** Hard clear of Dungeon Master ("the king" of the dunjun). */
export function rewardHardKing(save: SaveData): {
  save: SaveData;
  dialog: string[];
} {
  let next = markHardLandCleared(save, 'dunjunz');
  if (!next.bag.some((b) => b.templateId === 'short_bow')) {
    next = mintItem(next, 'short_bow', 'rare', 1).save;
  }
  if (!next.bag.some((b) => b.templateId === 'wizard_staff')) {
    next = mintItem(next, 'wizard_staff', 'rare', 1).save;
  }
  next = {
    ...next,
    stacks: {
      ...next.stacks,
      arrows: (next.stacks.arrows ?? 0) + 24,
      ore_spark: (next.stacks.ore_spark ?? 0) + 2,
    },
    flags: { ...next.flags, hard_king_loot: true },
  };
  next = autoEquipEmptySlots(next);
  next = syncDerivedStats(next);
  return {
    save: next,
    dialog: [
      'THE DUNJUN MASTER — THE KING OF THIS HOLE —',
      'DROPS HIS DICE. FOREVER. (HARD MODE.)',
      '',
      'YOU LOOT: SHORT BOW + ARROWS ×24',
      'AND AN EMERALD STAFF (MAGIC BOLTS)',
      'HARD DUNJUNZ: CLEARED. YOU MONSTER.',
    ],
  };
}
