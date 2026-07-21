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
  /** Combat ability label (magical Jake energy — they fight). */
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
      'I SLAP MONSTERS FROM WAY OVER HERE. ELASTIC JUSTICE.',
    ],
    banterDialog: [
      'GLOOP: I\'LL GO WHERE YOU GO.',
      'ALSO I\'M STICKY. SORRY IN ADVANCE. MOSTLY TO CREEPS.',
    ],
    abilityStub: 'STRETCH LASH — long slap',
  },
  {
    id: 'nub',
    name: 'NUB',
    species: 'stubby midnight badger',
    tint: 0x5a5a6a,
    meetDialog: [
      'NUB: ...TOOK YOU LONG ENOUGH.',
      'PRIZELLA SAID SOME CHAMPION WOULD SHOW.',
      'I FIGHT. I CLAW. I JUDGE YOUR FORM.',
      'BEST BUDS. FINE. DON\'T MAKE IT WEIRD.',
    ],
    banterDialog: [
      'NUB: I\'M NOT FOLLOWING YOU.',
      'I\'M SCOUTING. WITH CLAWS. YEAH.',
    ],
    abilityStub: 'MIDNIGHT CLAW — fast melee',
  },
  {
    id: 'whisp',
    name: 'WHISP',
    species: 'fog-cat cloud critter',
    tint: 0xe8f0ff,
    meetDialog: [
      'WHISP: MMM. YOU FEEL LIKE SNACKS AND DESTINY.',
      'I RAIN SNACKS. ALSO FOG THAT BITES BAD GUYS.',
      'BEST BUDS? I\'M VERY SOFT ABOUT FRIENDSHIP.',
      'AND VERY SHARP ABOUT CREEPS. FLOATY MURDER.',
    ],
    banterDialog: [
      'WHISP: I\'M STILL HERE. FLOATY. LOYAL.',
      'FOG HUG FOR YOU. FOG BITE FOR THEM.',
    ],
    abilityStub: 'FOG BITE + cozy heal aura',
  },
  {
    id: 'tater',
    name: 'TATER',
    species: 'sentient tuber beetle',
    tint: 0xc4a06a,
    meetDialog: [
      'TATER: I\'M A ROOT VEGETABLE WITH OPINIONS.',
      'AND A ROAST SPIT. FOR SCIENCE. AND COMBAT.',
      'BEST BUDS? I ROAST CREEPS. YOU SWING. LOVE.',
      'PLATONIC. CRISPY. COOL.',
    ],
    banterDialog: [
      'TATER: STILL NOT A SIDE DISH.',
      'I\'M ARTILLERY. WITH LEGS. KIND OF.',
    ],
    abilityStub: 'ROAST SPIT — mid-range fire',
  },
  {
    id: 'zorp',
    name: 'ZORP',
    species: 'pocket space-frog',
    tint: 0x7d5cff,
    meetDialog: [
      'ZORP: I FELL OUT OF A WEIRD SKY.',
      'I BLINK-SLAP THINGS. DIMENSIONAL VIOLENCE.',
      'BEST BUDS ACROSS DIMENSIONS? RAD.',
      'I DON\'T DO ORDERS. I DO HOPS. ONTO FACES.',
    ],
    banterDialog: [
      'ZORP: THE UNIVERSE IS BIG.',
      'WE\'RE SMALL. BUT WE HIT HARD. BLOOP.',
    ],
    abilityStub: 'POCKET HOP — blink strike',
  },
  {
    id: 'pebbo',
    name: 'PEBBO',
    species: 'living pebble-snake',
    tint: 0x8a8070,
    meetDialog: [
      'PEBBO: I COIL INTO A CHAIR. ALSO A SHIELD.',
      'I\'LL EAT A HIT FOR YOU. WHEN I FEEL LIKE IT.',
      'BEST BUDS? I COIL-SLAM DANGER. LAZY LOYALTY.',
      'DON\'T STEP ON ME. THAT\'S RUDE GEOLOGY.',
    ],
    banterDialog: [
      'PEBBO: STILL COILED. STILL YOUR BUD.',
      'STILL BLOCKING STUFF. SOMETIMES. ROCK ON.',
    ],
    abilityStub: 'COIL SLAM + guard block',
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

/**
 * Den creature is visible until recruited.
 * (Previously required stage === 'accepted', which left the hollow empty
 * after Prizella's first pitch (stage 'offered') or before talking to her.)
 */
export function shouldSpawnDenBud(save: SaveData): boolean {
  const stage = save.bestBudStage ?? 'none';
  return stage !== 'found' && stage !== 'complete';
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

  // Already recruited — den should be empty; keep dialog safe
  if (next.bestBudStage === 'found' || next.bestBudStage === 'complete') {
    return {
      save: next,
      dialog: bestBudBanter(next),
    };
  }

  // Pre-rescue: creature is napping; quest not open yet
  if (!next.princessSaved) {
    return {
      save: next,
      dialog: [
        '...A WEIRD CREATURE NAPS IN THE HOLLOW.',
        'IT OPENS ONE EYE. "SAVE SOMEONE COOL FIRST."',
        'PROBABLY THE PRINCESZ. YEAH.',
        'THEN COME BACK. OR TALK TO HER ABOUT CHAMPION JOBS.',
      ],
    };
  }

  // Auto-accept: den visit or second chance if player only got the pitch
  if (!next.bestBudId) {
    next = {
      ...next,
      bestBudId: rollBestBudId(next.runSeed),
    };
  }
  if (next.bestBudStage === 'none' || next.bestBudStage === 'offered') {
    next = withFlags(next, 'accepted');
  }

  const bud = getBestBud(next.bestBudId);
  next = withFlags(next, 'found');
  return {
    save: next,
    dialog: [
      ...(bud?.meetDialog ?? ['A WEIRD CREATURE NODS. BEST BUDS.']),
      '',
      `${bud?.name ?? 'BUD'} JOINS YOU!`,
      'THEY\'LL FOLLOW AND FIGHT. MAGICAL BUD ENERGY.',
      bud
        ? `ABILITY: ${bud.abilityStub.toUpperCase()}.`
        : 'ABILITY: BEING COOL IN COMBAT.',
      'TALK ANYTIME. DON\'T BE RUDE WITH YOUR SWORD.',
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
    // One talk: pitch + accept so the den is never empty after this.
    // (Old flow was offer → empty den until a second talk.)
    const pitch =
      stage === 'none'
        ? [
            'PRIZELLA: CHAMPION JOB #1. REAL ONE.',
            'EVERY HERO NEEDS A BEST BUD.',
            'NOT A SIDEKICK. A BUD. WEIRD. LOYAL.',
            'ONE HANGS IN A WOODZ HOLLOW — EAST OF EDGE.',
            '',
          ]
        : [
            'PRIZELLA: STILL HERE? COOL. LET\'S LOCK IT IN.',
            '',
          ];
    const accepted = acceptBestBudQuest(next);
    return {
      save: accepted.save,
      dialog: [...pitch, ...accepted.dialog],
    };
  }
  if (stage === 'accepted') {
    return {
      save: next,
      dialog: [
        'PRIZELLA: STILL NO BUD? WOODZ. EAST OF EDGE.',
        'HOLLOW. COZY. SMELLS LIKE SNACKS AND DESTINY.',
        'THE BUD IS WAITING THERE. GO BE COOL.',
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
