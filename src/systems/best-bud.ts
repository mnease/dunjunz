/**
 * Best Bud champion quest — find a non-human best friend.
 * Jake-the-dog energy without being Jake. Randomized per playthrough.
 */

import type { BestBudId, BestBudStage, SaveData } from '../types';
import { mulberry32 } from './loot';

export const BUD_DEN_ROOM = 'woodz_hollow';

export interface BestBudDef {
  id: BestBudId;
  name: string;
  species: string;
  /** Phaser tint applied to base best_bud texture. */
  tint: number;
  meetDialog: string[];
  banterDialog: string[];
  /** Flavor only in v1 — not wired to combat. */
  abilityStub: string;
}

export const BEST_BUD_ROSTER: readonly BestBudDef[] = [
  {
    id: 'gloop',
    name: 'GLOOP',
    species: 'stretchy gum-hound',
    tint: 0x4ad4c8,
    meetDialog: [
      'GLOOP: OH HEY. YOU SMELL LIKE QUESTS.',
      'I\'VE BEEN STUCK TO THIS LOG FOR... A WHILE.',
      'WANNA BE BEST BUDS? I\'M VERY STRETCHY ABOUT IT.',
      'NOT A SIDEKICK. A BUD. BIG DIFFERENCE.',
    ],
    banterDialog: [
      'GLOOP: I\'LL GO WHERE YOU GO.',
      'ALSO I\'M STICKY. SORRY IN ADVANCE.',
    ],
    abilityStub: 'Stretch-grab distant pickups',
  },
  {
    id: 'nub',
    name: 'NUB',
    species: 'stubby midnight badger',
    tint: 0x5a5a6a,
    meetDialog: [
      'NUB: ...TOOK YOU LONG ENOUGH.',
      'PRIZELLA SAID SOME CHAMPION WOULD SHOW.',
      'I\'M NOT IMPRESSED. I\'M ALSO NOT LEAVING.',
      'BEST BUDS. FINE. DON\'T MAKE IT WEIRD.',
    ],
    banterDialog: [
      'NUB: I\'M NOT FOLLOWING YOU.',
      'THE PATH IS JUST... SHARED. YEAH.',
    ],
    abilityStub: 'Dig for hidden mats',
  },
  {
    id: 'whisp',
    name: 'WHISP',
    species: 'fog-cat cloud critter',
    tint: 0xe8f0ff,
    meetDialog: [
      'WHISP: MMM. YOU FEEL LIKE SNACKS AND DESTINY.',
      'I RAIN SNACKS. EMOTIONALLY. SOMETIMES LITERALLY.',
      'BEST BUDS? I\'M VERY SOFT ABOUT FRIENDSHIP.',
      'NO ATTACK ORDERS. ONLY COZY ONES.',
    ],
    banterDialog: [
      'WHISP: I\'M STILL HERE. FLOATY. LOYAL.',
      'WANT A FOG HUG? TOO LATE. ALREADY HAPPENING.',
    ],
    abilityStub: 'Tiny soft regen aura',
  },
  {
    id: 'tater',
    name: 'TATER',
    species: 'sentient tuber beetle',
    tint: 0xc4a06a,
    meetDialog: [
      'TATER: I\'M A ROOT VEGETABLE WITH OPINIONS.',
      'DEAL WITH IT. ALSO: BEST BUDS?',
      'I ROAST YOU. YOU ROAST ME. THAT\'S LOVE.',
      'PLATONIC. EDIBLE-ADJACENT. COOL.',
    ],
    banterDialog: [
      'TATER: STILL NOT A SIDE DISH.',
      'I\'M A MAIN CHARACTER. WITH LEGS. KIND OF.',
    ],
    abilityStub: 'Extra forjing scrap luck',
  },
  {
    id: 'zorp',
    name: 'ZORP',
    species: 'pocket space-frog',
    tint: 0x7d5cff,
    meetDialog: [
      'ZORP: I FELL OUT OF A WEIRD SKY.',
      'YOU SEEM COOL. STAR-FRECKLE COOL.',
      'BEST BUDS ACROSS DIMENSIONS? RAD.',
      'I DON\'T DO ORDERS. I DO VIBES.',
    ],
    banterDialog: [
      'ZORP: THE UNIVERSE IS BIG.',
      'WE\'RE SMALL. BUT WE\'RE A TEAM. BLOOP.',
    ],
    abilityStub: 'Rare loot sparkle ping',
  },
  {
    id: 'pebbo',
    name: 'PEBBO',
    species: 'living pebble-snake',
    tint: 0x8a8070,
    meetDialog: [
      'PEBBO: I COIL INTO A CHAIR. THAT\'S MY WHOLE DEAL.',
      'ALSO FRIENDSHIP. MOSTLY CHAIRS THOUGH.',
      'BEST BUDS? I\'LL COIL NEAR DANGER. SOMETIMES.',
      'WHEN I FEEL LIKE IT. LAZY LOYALTY.',
    ],
    banterDialog: [
      'PEBBO: STILL COILED. STILL YOUR BUD.',
      'DON\'T STEP ON ME. THAT\'S RUDE GEOLOGY.',
    ],
    abilityStub: 'Block one hit (cooldown)',
  },
];

const BUD_ROLL_SALT = 0xbe57b0d1;

export function getBestBud(id: BestBudId | null | undefined): BestBudDef | null {
  if (!id) return null;
  return BEST_BUD_ROSTER.find((b) => b.id === id) ?? null;
}

export function rollBestBudId(runSeed: number): BestBudId {
  const rng = mulberry32((runSeed ^ BUD_ROLL_SALT) >>> 0);
  const idx = Math.floor(rng() * BEST_BUD_ROSTER.length);
  return BEST_BUD_ROSTER[idx]?.id ?? 'gloop';
}

export function ensureRunSeed(save: SaveData): SaveData {
  if (typeof save.runSeed === 'number' && Number.isFinite(save.runSeed)) {
    return save;
  }
  const seed =
    (Math.floor(Math.random() * 0xffffffff) ^ (Date.now() & 0xffffffff)) >>> 0;
  return { ...save, runSeed: seed || 1 };
}

export function isCompanionActive(save: SaveData): boolean {
  return (
    (save.bestBudStage === 'found' || save.bestBudStage === 'complete') &&
    !!save.bestBudId
  );
}

export function shouldSpawnDenBud(save: SaveData): boolean {
  return save.bestBudStage === 'accepted' && !!save.bestBudId;
}

function withFlags(save: SaveData, stage: BestBudStage): SaveData {
  const flags = { ...save.flags };
  if (stage === 'accepted' || stage === 'found' || stage === 'complete') {
    flags.best_bud_quest = true;
  }
  if (stage === 'found' || stage === 'complete') {
    flags.best_bud_found = true;
  }
  if (stage === 'complete') {
    flags.best_bud_complete = true;
  }
  return { ...save, flags, bestBudStage: stage };
}

/** Pitch Best Bud job; does not roll yet. */
export function offerBestBudQuest(save: SaveData): {
  save: SaveData;
  dialog: string[];
} {
  let next = ensureRunSeed(save);
  if (!next.princessSaved) {
    return {
      save: next,
      dialog: ['PRIZELLA: SAVE ME FIRST. THEN WE TALK JOBS.'],
    };
  }
  if (next.bestBudStage === 'none') {
    next = withFlags(next, 'offered');
  }
  return {
    save: next,
    dialog: [
      'PRIZELLA: CHAMPION JOB #1. REAL ONE.',
      'THE KINGDOM\'S FINE. YOU? LONELY AS A FORJE.',
      'EVERY HERO NEEDS A BEST BUD.',
      'NOT A SIDEKICK. NOT A SERVANT. A BUD.',
      'NON-HUMAN. WEIRD. LOYAL. POSSIBLY STICKY.',
      'I HEARD ONE HANGS IN A WOODZ HOLLOW',
      'EAST OF THE WOODZ EDGE.',
      'GO MAKE A FRIEND. FOR SCIENCE.',
    ],
  };
}

/** Assign bud id once; stage → accepted. */
export function acceptBestBudQuest(save: SaveData): {
  save: SaveData;
  dialog: string[];
} {
  let next = ensureRunSeed(save);
  if (!next.princessSaved) {
    return { save: next, dialog: ['PRIZELLA: YEAH NO. SAVE ME FIRST.'] };
  }
  if (!next.bestBudId) {
    next = {
      ...next,
      bestBudId: rollBestBudId(next.runSeed),
    };
  }
  next = withFlags(next, 'accepted');
  const bud = getBestBud(next.bestBudId);
  return {
    save: next,
    dialog: [
      'PRIZELLA: OKAY YOU\'RE IN. MATHEMATICAL.',
      'WOODZ EDGE → EAST → THE HOLLOW.',
      bud
        ? `SOMETHING ${bud.species.toUpperCase()}-ISH IS WAITING.`
        : 'SOMETHING WEIRD AND LOYAL IS WAITING.',
      'DON\'T MAKE IT A WEDDING. IT\'S A BUD.',
    ],
  };
}

export function meetBestBud(save: SaveData): {
  save: SaveData;
  dialog: string[];
} {
  let next = ensureRunSeed(save);
  if (next.bestBudStage !== 'accepted' || !next.bestBudId) {
    return {
      save: next,
      dialog: [
        '...NOBODY\'S HOME.',
        'MAYBE TALK TO PRIZELLA ABOUT CHAMPION STUFF FIRST.',
      ],
    };
  }
  const bud = getBestBud(next.bestBudId);
  next = withFlags(next, 'found');
  return {
    save: next,
    dialog: [
      ...(bud?.meetDialog ?? ['A WEIRD CREATURE NODS. BEST BUDS.']),
      '',
      `${bud?.name ?? 'BUD'} JOINS YOU!`,
      'THEY\'LL FOLLOW. TALK ANYTIME. NO COMBAT. JUST VIBES.',
    ],
  };
}

export function completeBestBudQuest(save: SaveData): {
  save: SaveData;
  dialog: string[];
} {
  let next = ensureRunSeed(save);
  if (next.bestBudStage !== 'found' && next.bestBudStage !== 'complete') {
    return {
      save: next,
      dialog: [
        'PRIZELLA: FIND YOUR BUD FIRST.',
        'WOODZ HOLLOW. EAST OF THE EDGE.',
      ],
    };
  }
  if (next.bestBudStage === 'complete') {
    const bud = getBestBud(next.bestBudId);
    return {
      save: next,
      dialog: [
        'PRIZELLA: STILL BUDDIES. GOOD.',
        bud
          ? `SAY HI TO ${bud.name} FOR ME. NOT IN A WEIRD WAY.`
          : 'SAY HI TO YOUR BUD.',
        'CHAMPION WORK CONTINUES... LATER.',
      ],
    };
  }
  const bud = getBestBud(next.bestBudId);
  next = {
    ...next,
    coins: next.coins + 20,
    stacks: {
      ...next.stacks,
      ore_spark: (next.stacks.ore_spark ?? 0) + 2,
      wood_shard: (next.stacks.wood_shard ?? 0) + 2,
    },
  };
  next = withFlags(next, 'complete');
  return {
    save: next,
    dialog: [
      'PRIZELLA: OFFICIAL — YOU HAVE A BEST BUD.',
      bud ? `${bud.name}. SOLID PICK. (THE UNIVERSE PICKED. WHATEVER.)` : '',
      'CHAMPION QUEST #1: DONE. MATHEMATICAL.',
      'DON\'T MAKE IT WEIRD. IT\'S NOT A WEDDING.',
      'KINGDOM CARE PACKAGE: +20c, SPARK, WOOD SHARDZ.',
      'GO BE COOL. TOGETHER.',
    ].filter(Boolean),
  };
}

/**
 * Single entry for all post-save Prizella talks — advances stages.
 */
export function prizellaChampionTalk(save: SaveData): {
  save: SaveData;
  dialog: string[];
} {
  let next = ensureRunSeed(save);
  if (!next.princessSaved) {
    return {
      save: next,
      dialog: ['PRIZELLA: UH. SAVE ME FIRST? PLEASE?'],
    };
  }

  const stage: BestBudStage = next.bestBudStage ?? 'none';

  if (stage === 'none' || stage === 'offered') {
    // First talk: offer. Second talk (already offered): accept + roll.
    if (stage === 'none') {
      return offerBestBudQuest(next);
    }
    return acceptBestBudQuest(next);
  }
  if (stage === 'accepted') {
    return {
      save: next,
      dialog: [
        'PRIZELLA: STILL NO BUD? WOODZ. EAST OF EDGE.',
        'HOLLOW. COZY. SMELLS LIKE SNACKS AND DESTINY.',
        'GO. MAKE A FRIEND. I\'LL WAIT. RULING IS BUSY.',
      ],
    };
  }
  if (stage === 'found') {
    return completeBestBudQuest(next);
  }
  // complete
  return completeBestBudQuest(next);
}

export function bestBudBanter(save: SaveData): string[] {
  const bud = getBestBud(save.bestBudId);
  if (!bud) return ['...'];
  return bud.banterDialog;
}

export function bestBudQuestHint(save: SaveData): string[] {
  if (!save.princessSaved) return [];
  const stage = save.bestBudStage ?? 'none';
  if (stage === 'none' || stage === 'offered') {
    return [
      'CHAMPION JOB #1: FIND YOUR BEST BUD.',
      'TALK TO PRIZELLA. THEN WOODZ HOLLOW (EAST).',
    ];
  }
  if (stage === 'accepted') {
    return [
      'FIND YOUR BEST BUD IN THE WOODZ HOLLOW.',
      'WOODZ EDGE → EAST. MAKE A FRIEND.',
    ];
  }
  if (stage === 'found') {
    return [
      'YOU FOUND A BEST BUD!',
      'REPORT BACK TO PRIZELLA WHEN READY.',
    ];
  }
  return [
    'BEST BUD QUEST: DONE. RAD.',
    'STAY LOYAL. STAY WEIRD. FORJE MORE STUFF.',
  ];
}
