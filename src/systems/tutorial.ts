/**
 * First-run Tutorial Guild — pure helpers.
 * Stairs into basements stay locked until the Guild Master graduates you.
 */

import type { SaveData } from '../types';

export const FLAG_TUTORIAL_COMPLETE = 'tutorial_complete';
export const FLAG_TUTORIAL_INTRO = 'tutorial_intro_seen';
export const FLAG_TUTORIAL_SWUNG = 'tutorial_swung';
export const FLAG_TUTORIAL_BAG = 'tutorial_bag';

export const GUILD_MASTER_ID = 'guild-master';

export type TutorialChecklist = {
  complete: boolean;
  hasSword: boolean;
  swung: boolean;
  bag: boolean;
  readyToGraduate: boolean;
};

export function isTutorialComplete(save: SaveData): boolean {
  return !!save.flags?.[FLAG_TUTORIAL_COMPLETE];
}

export function tutorialChecklist(save: SaveData): TutorialChecklist {
  const complete = isTutorialComplete(save);
  const hasSword = !!save.hasSword;
  const swung = !!save.flags?.[FLAG_TUTORIAL_SWUNG];
  const bag = !!save.flags?.[FLAG_TUTORIAL_BAG];
  return {
    complete,
    hasSword,
    swung,
    bag,
    readyToGraduate: !complete && hasSword && swung && bag,
  };
}

/**
 * Block dungeon stairs until graduated.
 * Surface east trail stays open (explore meadow freely).
 */
export function canUseDungeonStairs(save: SaveData): boolean {
  return isTutorialComplete(save);
}

export function markTutorialIntroSeen(save: SaveData): SaveData {
  if (save.flags?.[FLAG_TUTORIAL_INTRO]) return save;
  return {
    ...save,
    flags: { ...save.flags, [FLAG_TUTORIAL_INTRO]: true },
  };
}

export function markTutorialSwung(save: SaveData): SaveData {
  if (isTutorialComplete(save) || save.flags?.[FLAG_TUTORIAL_SWUNG]) return save;
  return {
    ...save,
    flags: { ...save.flags, [FLAG_TUTORIAL_SWUNG]: true },
  };
}

export function markTutorialBag(save: SaveData): SaveData {
  if (isTutorialComplete(save) || save.flags?.[FLAG_TUTORIAL_BAG]) return save;
  return {
    ...save,
    flags: { ...save.flags, [FLAG_TUTORIAL_BAG]: true },
  };
}

export function completeTutorial(save: SaveData): SaveData {
  if (isTutorialComplete(save)) return save;
  return {
    ...save,
    flags: {
      ...save.flags,
      [FLAG_TUTORIAL_COMPLETE]: true,
      [FLAG_TUTORIAL_INTRO]: true,
      [FLAG_TUTORIAL_SWUNG]: true,
      [FLAG_TUTORIAL_BAG]: true,
    },
  };
}

/** Skip for veterans — only after intro has been seen. */
export function skipTutorial(save: SaveData): SaveData {
  return completeTutorial(save);
}

/**
 * Guild Master dialog for current progress.
 * ALL CAPS house style, short lines.
 */
export function guildMasterDialog(save: SaveData): string[] {
  const c = tutorialChecklist(save);

  if (c.complete) {
    return [
      'GUILD MASTER: GRADUATE STATUS — CONFIRMED.',
      'THE STAIRS ARE OPEN. DUNJUNZ AWAITS.',
      'MOVE: ARROWS / WASD. ATTACK: SPACE / Z.',
      'TALK / USE: E. BAG: I. MAPZ: M (LATER).',
      'PRIZELLA IS MISSING. THE DUNJUN MASTER YEETED HER.',
      'EAST = TRAIL. NORTH OF TRAIL: WOODZ. SOUTH: DEZERTZ.',
      'GO BE COOL. MATHEMATICAL!',
    ];
  }

  if (c.readyToGraduate) {
    return [
      'GUILD MASTER: CHECKLIST COMPLETE!',
      'SWORD: YES. SWING: YES. BAG: YES.',
      'BY THE POWER OF THE TUTORIAL GUILD…',
      'I HEREBY GRADUATE YOU.',
      'THE STAIRS ARE OPEN. TRY NOT TO DIE IMMEDIATELY.',
    ];
  }

  // First formal lesson (or mid-checklist)
  const lines: string[] = [
    'GUILD MASTER OF THE TUTORIAL GUILD.',
    'IT IS DANGEROUS TO GO ALONE — ALSO, YOU ARE UNTRAINED.',
    'STAIRS STAY LOCKED UNTIL YOU GRADUATE.',
    '',
    'LESSON PLAN (DO THESE):',
  ];

  if (!c.hasSword) {
    lines.push('1. TAKE THE SWORD OF MILD ENTHUSIASM (TALK TO ME / PICK IT UP).');
  } else {
    lines.push('1. SWORD — DONE.');
  }

  if (!c.swung) {
    lines.push('2. SWING ONCE: SPACE OR Z (OR PAD ATK).');
  } else {
    lines.push('2. SWING — DONE.');
  }

  if (!c.bag) {
    lines.push('3. OPEN YOUR BAG: I (OR PAD BAG).');
  } else {
    lines.push('3. BAG — DONE.');
  }

  lines.push('');
  lines.push('THEN TALK TO ME AGAIN TO GRADUATE.');
  lines.push('MOVE: ARROWS / WASD. TALK: E.');

  return lines;
}

/** Toast when blocked at stairs. */
export function stairsBlockedToast(): string {
  return 'STAIRS LOCKED — FINISH GUILD MASTER TUTORIAL';
}

export function needsTutorialIntro(save: SaveData): boolean {
  return !isTutorialComplete(save) && !save.flags?.[FLAG_TUTORIAL_INTRO];
}

/**
 * Veterans who already crawled should not re-sit orientation.
 * Call from save load/migrate.
 */
export function migrateTutorial(save: SaveData): SaveData {
  if (isTutorialComplete(save)) return save;
  const visited = save.visitedRooms ?? [];
  const leftMeadow = visited.some(
    (id) =>
      id.startsWith('b1_') ||
      id.startsWith('b2_') ||
      id.startsWith('b3_') ||
      id.startsWith('b4_') ||
      id.startsWith('b5_') ||
      id.startsWith('b6_') ||
      id.startsWith('b7_') ||
      id.startsWith('b8_') ||
      id.includes('sewerz') ||
      id.includes('woodz_b') ||
      id.includes('dezertz_b'),
  );
  // Do NOT use hasSword alone — first Guild talk grants the sword mid-tutorial.
  const progressed =
    leftMeadow ||
    (save.level ?? 1) > 1 ||
    (save.xp ?? 0) > 0 ||
    (save.landsCleared?.length ?? 0) > 0 ||
    !!save.bossDefeated ||
    !!save.princessSaved;
  if (!progressed) return save;
  return completeTutorial(save);
}

/**
 * First-boot intro monologue (auto-shown once on meadow).
 */
export function guildMasterIntroDialog(): string[] {
  return [
    'WELCOME TO THE MEADOW, RECRUIT.',
    'I AM THE GUILD MASTER.',
    'BEFORE THE DUNJUN STAIRS OPEN, YOU TRAIN.',
    '',
    'MOVE: ARROWS OR WASD.',
    'TALK / USE: E  ·  ATTACK: SPACE OR Z.',
    'BAG / CHARACTER: I.',
    '',
    'TALK TO ME (E). GET THE SWORD. SWING. OPEN BAG.',
    'THEN TALK AGAIN — I OPEN THE STAIRS.',
    'EAST TRAIL IS OPEN. DUNJUN STAIRS ARE NOT. YET.',
  ];
}
