/**
 * Princess Prizella quest + land clear flags.
 * Dialogue voice: earnest, weird, Adventure-Time-adjacent.
 */

import type { LandId, SaveData } from '../types';
import { bestBudQuestHint } from './best-bud';
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
      'THE DUNJUN MASTER FACEPLANTS.',
      'HE WHISPERS: "SHE\'S NOT EVEN HERE..."',
      'WAIT. WHAT.',
      `${PRINCESS_NAME} GOT YEETED TO THE DEZERTZ!`,
      '',
      'YOU LOOT: DUNJUN CLEAVER — LEGENDARY!',
      'MAPZ OF WOODZ + DEZERTZ UNFURL LIKE BAD NEWS.',
      'A SHIMMERING EXIT PORTAL OPENS HERE.',
      'STEP ON IT TO ZIP TO THE DUNJUN MOUTH.',
      'PRESS M. FORJE UP. GO EAST. BE COOL ABOUT IT.',
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
      'THE WOLF LORD HITS THE DIRT.',
      'SOMEWHERE A TREE DOES A LITTLE CLAP.',
      'WOODZ: LESS BITING. STILL WEIRD.',
      '',
      'YOU SCORE WOOD SHARDZ + ORE.',
      'EXIT PORTAL: ZIP TO WOODZ EDGE.',
      'DEZERTZ IS SOUTH OF THE TRAIL.',
      'PRIZELLA\'S PROBABLY SANDY AND MAD.',
    ],
  };
}

/**
 * Post-rescue Prizella voice — kingdom duty + champion (not "personal hero").
 */
export function princessChampionDialog(): string[] {
  return [
    'PRIZELLA: OKAY. REAL TALK.',
    'I GOTTA GO RULE MY KINGDOM NOW.',
    'DECREES. PARADES. WEIRD TAXES ON LAVA.',
    'SOMEBODY\'S GOTTA SIGN THE SCROLLS.',
    '',
    'BUT IF YOU WANT EXTRA QUESTS...',
    'COME BE MY CHAMPION HERO.',
    'NOT MY PERSONAL HERO. GROSS. NO.',
    'LIKE... MY CHAMPION. THE ONE WHO',
    'GOES ON COOL QUESTS FOR STUFF',
    'THE KINGDOM ACTUALLY NEEDS.',
    'DRAGONS. LOST RECIPES. MAYBE A GOOSE.',
    '',
    'FIND ME WHEN YOU\'RE READY.',
    'I\'LL HAVE SOMETHING RAD LINED UP.',
  ];
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
      'THE SAND WRAITH GOES *POOF* — SANDY POOF.',
      `${PRINCESS_NAME} STEPS OUT, BRUSHING DUNES OFF HER CROWN.`,
      'PRIZELLA: YOU CAME. THAT RULES.',
      'YOU GOT: SAND SABER. SHINY. HISSY.',
      'CYAN EXIT PORTAL — STEP ON IT FOR EDGE.',
      'OR WALK NORTH OUT THE DOOR.',
      'TALK TO ME FOR CHAMPION JOB STUFF.',
    ],
  };
}

export function questHint(save: SaveData): string[] {
  if (save.princessSaved) {
    return bestBudQuestHint(save);
  }
  if (!save.landsCleared.includes('dunjunz')) {
    return [
      'MAIN QUEST: SAVE PRIZELLA.',
      'STAIRS IN THE MEADOW = DUNJUNZ.',
      'BONK THE DUNJUN MASTER. POLITELY.',
    ];
  }
  if (!save.landsCleared.includes('woodz')) {
    return [
      'PRIZELLA GOT MOVED TO THE DEZERTZ.',
      'OPTIONAL SIDE ADVENTURE: WOODZ NORTH.',
      'OR GO SOUTH IF YOU\'RE FEELING BRAVE.',
    ];
  }
  if (!save.landsCleared.includes('dezertz')) {
    return [
      'DEZERTZ = SOUTH OF THE TRAIL.',
      'TOWER. WRAITH. PRIZELLA. PROBABLY SAND.',
      'FORJE FIRST IF YOU FEEL SQUISHY.',
    ];
  }
  return ['FIND THE PRINCESZ. SHE\'S COUNTING ON YOU!'];
}
