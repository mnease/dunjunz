/**
 * Princess Prizella quest + land clear flags.
 * Dialogue voice: earnest, weird, Adventure-Time-adjacent.
 */

import type { LandId, SaveData } from '../types';
import { bestBudQuestHint } from './best-bud';
import { championQuestHint } from './champion-quests';
import { discoverMapz } from './mapz';
import { mintItem } from './items';
import { autoEquipEmptySlots, syncDerivedStats } from './inventory';

export const PRINCESS_NAME = 'PRINCESS PRIZELLA';

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
      'THE DUNJUN MASTER HITS THE FLOOR.',
      'HE MUTTERS: "SHE WAS NEVER HERE…"',
      'WAIT.',
      `HE SHIPPED ${PRINCESS_NAME} TO THE DEZERTZ.`,
      '',
      'YOU LOOT: DUNJUN CLEAVER (LEGENDARY).',
      'MAPZ UNFURL: WOODZ + DEZERTZ.',
      'EXIT PORTAL OPEN — STEP ON IT FOR THE MOUTH.',
      'PRESS M FOR MAPZ. SOUTH TRAIL LEADS TO HER.',
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
      'THE WOLF LORD DROPS.',
      'A DISTANT TREE DOES A SLOW CLAP. PROBABLY.',
      '',
      'YOU GAIN WOOD SHARDZ + ORE.',
      'EXIT PORTAL → WOODZ EDGE.',
      'PRINCESS PRIZELLA IS STILL IN THE DEZERTZ (SOUTH OF THE TRAIL).',
    ],
  };
}

/**
 * Post-rescue Princess Prizella voice — kingdom duty + champion (not "personal hero").
 */
export function princessChampionDialog(): string[] {
  return [
    'PRINCESS PRIZELLA: OKAY. REAL TALK.',
    'I HAVE TO GO RULE MY KINGDOM. SCROLLS. TAXES. THE WORKS.',
    '',
    'IF YOU WANT MORE WORK — BE MY CHAMPION.',
    'NOT MY PERSONAL HERO. JUST… THE COOL QUESTS.',
    'GOOSE PROBLEMS. LOST RECIPES. ACTUAL DRAGONS MAYBE.',
    '',
    'FIND ME ON THE THRONE WHEN YOU\'RE READY.',
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
  next = unlockKingdomOnRescue(next);
  const m = mintItem(next, 'sand_saber', 'epic', 1);
  next = m.save;
  next = syncDerivedStats(next);
  return {
    save: next,
    dialog: [
      'THE SAND WRAITH COLLAPSES INTO… MORE SAND.',
      `${PRINCESS_NAME} STEPS OUT, BRUSHING DUNES OFF HER CROWN.`,
      'PRINCESS PRIZELLA: YOU CAME. THAT RULES.',
      'YOU GOT: SAND SABER.',
      'I\'M HEADING HOME — CASTLE EAST OF THE TRAIL.',
      'CYAN PORTAL OUT, OR WALK NORTH TO THE EDGE.',
      'TALK TO ME ON THE THRONE FOR CHAMPION WORK.',
    ],
  };
}

export function questHint(save: SaveData): string[] {
  if (save.princessSaved) {
    // Best Bud first; then kingdom board
    if (save.bestBudStage !== 'complete') {
      return bestBudQuestHint(save);
    }
    const champ = championQuestHint(save);
    if (champ.length) return champ;
    return [
      'PRINCESS PRIZELLA RULES FROM THE KINGDOMZ.',
      'EAST OF THE TRAIL. CHECK THE THRONE.',
    ];
  }
  if (!save.landsCleared.includes('dunjunz')) {
    return [
      'MAIN QUEST: SAVE PRINCESS PRIZELLA.',
      'STAIRS IN THE MEADOW = DUNJUNZ.',
      'BONK THE DUNJUN MASTER. POLITELY.',
    ];
  }
  if (!save.landsCleared.includes('woodz')) {
    return [
      'PRINCESS PRIZELLA GOT MOVED TO THE DEZERTZ.',
      'OPTIONAL SIDE ADVENTURE: WOODZ NORTH.',
      'OR GO SOUTH IF YOU\'RE FEELING BRAVE.',
    ];
  }
  if (!save.landsCleared.includes('dezertz')) {
    return [
      'DEZERTZ = SOUTH OF THE TRAIL.',
      'TOWER. WRAITH. PRINCESS PRIZELLA. PROBABLY SAND.',
      'FORJE FIRST IF YOU FEEL SQUISHY.',
    ];
  }
  return ['FIND THE PRINCESS. SHE\'S COUNTING ON YOU!'];
}

/** Unlock kingdom on rescue. */
export function unlockKingdomOnRescue(save: SaveData): SaveData {
  let next = discoverMapz(save, 'kingdomz');
  next = {
    ...next,
    flags: { ...next.flags, kingdom_unlocked: true },
  };
  return next;
}
