/**
 * Princess Prizella quest + land clear flags.
 */

import type { LandId, SaveData } from '../types';
import { discoverMapz } from './mapz';
import { mintItem } from './items';
import { autoEquipEmptySlots, syncDerivedStats } from './inventory';

export const PRINCESS_NAME = 'PRINCESZ PRIZELLA';

export function markLandCleared(save: SaveData, land: LandId): SaveData {
  if (save.landsCleared.includes(land)) return save;
  return {
    ...save,
    landsCleared: [...save.landsCleared, land],
    bossDefeated: land === 'dunjunz' ? true : save.bossDefeated,
  };
}

/** Reward for beating the Dunjun Master — legendary loot + mapz + unlock lore. */
export function rewardDunjunzClear(save: SaveData): {
  save: SaveData;
  dialog: string[];
} {
  let next = markLandCleared(save, 'dunjunz');
  next = discoverMapz(next, 'dunjunz');
  next = discoverMapz(next, 'woodz');
  next = discoverMapz(next, 'dezertz');
  // Legendary blade of the dunjun
  const m = mintItem(next, 'dunjun_cleaver', 'legendary', 2);
  next = m.save;
  next.stacks = {
    ...next.stacks,
    ore_spark: (next.stacks.ore_spark ?? 0) + 3,
    ore_iron: (next.stacks.ore_iron ?? 0) + 2,
  };
  next = autoEquipEmptySlots(next);
  next = syncDerivedStats(next);
  return {
    save: next,
    dialog: [
      'THE DUNJUN MASTER FALLS!',
      'HE GASPS: "SHE IS NOT HERE..."',
      `${PRINCESS_NAME} WAS TAKEN TO THE DEZERTZ!`,
      'YOU LOOT: DUNJUN CLEAVER (LEGENDARY)!',
      'MAPZ OF WOODZ + DEZERTZ UNFURL.',
      'PRESS M FOR MAPZ. FIND A FORJE.',
    ],
  };
}

export function rewardWoodzClear(save: SaveData): {
  save: SaveData;
  dialog: string[];
} {
  let next = markLandCleared(save, 'woodz');
  next = discoverMapz(next, 'woodz');
  next.stacks = {
    ...next.stacks,
    wood_shard: (next.stacks.wood_shard ?? 0) + 4,
    ore_iron: (next.stacks.ore_iron ?? 0) + 2,
  };
  next = syncDerivedStats(next);
  return {
    save: next,
    dialog: [
      'THE WOLF LORD FALLS!',
      'WOODZ ARE SAFE...ISH.',
      'YOU GAIN WOOD SHARDZ + ORE.',
      'DEZERTZ LIES SOUTH OF THE TRAIL.',
    ],
  };
}

export function rewardDezertzClear(save: SaveData): {
  save: SaveData;
  dialog: string[];
} {
  let next = markLandCleared(save, 'dezertz');
  next = {
    ...next,
    princessSaved: true,
    flags: { ...next.flags, princess_saved: true },
  };
  const m = mintItem(next, 'sand_saber', 'epic', 1);
  next = m.save;
  next = syncDerivedStats(next);
  return {
    save: next,
    dialog: [
      'THE SAND WRAITH CRUMBLES!',
      `${PRINCESS_NAME} IS FREE!`,
      'SHE SAYS: "TOOK YOU LONG ENOUGH."',
      'THEN: "THANKS. ALSO, NICE SWORD."',
      'QUEST COMPLETE... FOR NOW.',
    ],
  };
}

export function questHint(save: SaveData): string[] {
  if (save.princessSaved) {
    return ['PRINCESZ SAVED. GO FORJE MORE STUFF.'];
  }
  if (!save.landsCleared.includes('dunjunz')) {
    return [
      'QUEST: SAVE PRIZELLA',
      'THE DUNJUN STAIRS ARE IN THE MEADOW.',
      'BEAT THE DUNJUN MASTER.',
    ];
  }
  if (!save.landsCleared.includes('woodz')) {
    return [
      'PRIZELLA WAS MOVED TO DEZERTZ.',
      'OPTIONAL: CLEAR THE WOODZ FIRST.',
      'EAST TRAIL → NORTH INTO WOODZ.',
    ];
  }
  if (!save.landsCleared.includes('dezertz')) {
    return [
      'CROSS THE DEZERTZ SOUTH OF THE TRAIL.',
      'THE TOWER HOLDS PRIZELLA.',
      'FORJE GEAR IF YOU ARE WEAK.',
    ];
  }
  return ['FIND THE PRINCESZ!'];
}
