/**
 * Prizella's champion quest board — kingdom assigns dungeons after Best Bud.
 */

import type { LandId, SaveData } from '../types';
import { discoverMapz } from './mapz';
import { mintItem } from './items';
import { autoEquipEmptySlots, syncDerivedStats } from './inventory';

export interface ChampionQuestDef {
  id: string;
  title: string;
  /** Short HUD / hint line. */
  shortHint: string;
  land: LandId;
  dungeonEntrance: string;
  bossId: string;
  bossRoomId: string;
  assignDialog: string[];
  reminderDialog: string[];
  completeDialog: string[];
}

export const QUEST_SEWERZ_GOOSE = 'sewerz-goose';

export const CHAMPION_QUESTS: readonly ChampionQuestDef[] = [
  {
    id: QUEST_SEWERZ_GOOSE,
    title: 'ROYAL SEWERZ',
    shortHint: 'SEWERZ UNDER THE CASTLE — BONK THE GOOSE.',
    land: 'sewerz',
    dungeonEntrance: 'sewerz_mouth',
    bossId: 'royal-goose',
    bossRoomId: 'sewerz_boss',
    assignDialog: [
      'PRIZELLA: CHAMPION JOB #2. GROSS ONE.',
      'THE ROYAL SEWERZ ARE... OCCUPIED.',
      'SOMETHING HONKS. SOMETHING BITES.',
      'A GOOSE. PROBABLY MAGICAL. DEFINITELY RUDE.',
      '',
      'EAST OF THE COURTYARD — SEWER MOUTH.',
      'CLEAR IT. BRING BACK THE TAX SCROLLS',
      'IT PROBABLY ATE. OR HONKED AT.',
      'CREEPS DOWN THERE HIT HARDER. PACK SNACKS.',
    ],
    reminderDialog: [
      'PRIZELLA: STILL HONKING DOWN THERE?',
      'COURTYARD → EAST → SEWERZ MOUTH.',
      'GOOSE. SCROLLS. DON\'T BECOME A PUDDLE.',
    ],
    completeDialog: [
      'PRIZELLA: YOU BEAT THE ROYAL GOOSE?!',
      'MATHEMATICAL. THE PLUMBERS WILL WRITE SONGS.',
      'BAD SONGS. BUT SONGS.',
      '',
      'YOU GOT: HONK BLADE (EPIC) + KINGDOM COINZ.',
      'SEWERZ: OFFICIALLY LESS HONKY.',
      'MORE JOBS LATER. GO FORJE. STAY COOL.',
    ],
  },
];

export function getQuest(id: string | null | undefined): ChampionQuestDef | null {
  if (!id) return null;
  return CHAMPION_QUESTS.find((q) => q.id === id) ?? null;
}

export function isQuestCompleted(save: SaveData, id: string): boolean {
  return (save.questsCompleted ?? []).includes(id);
}

export function nextAssignableQuest(save: SaveData): ChampionQuestDef | null {
  if (!save.princessSaved) return null;
  // Job #1 is Best Bud — board opens after friendship is official
  if (save.bestBudStage !== 'complete') return null;
  if (save.activeQuestId && !isQuestCompleted(save, save.activeQuestId)) {
    return null; // already has work in progress
  }
  for (const q of CHAMPION_QUESTS) {
    if (!isQuestCompleted(save, q.id)) return q;
  }
  return null;
}

export function assignQuest(
  save: SaveData,
  questId: string,
): { save: SaveData; dialog: string[] } {
  const q = getQuest(questId);
  if (!q) {
    return { save, dialog: ['PRIZELLA: UH. QUEST MISSING. AWKWARD.'] };
  }
  if (isQuestCompleted(save, questId)) {
    return {
      save,
      dialog: ['PRIZELLA: YOU ALREADY DID THAT ONE. CHILL.'],
    };
  }
  let next: SaveData = {
    ...save,
    activeQuestId: questId,
    flags: { ...save.flags, [`quest_${questId}`]: true },
  };
  next = discoverMapz(next, 'kingdomz');
  next = discoverMapz(next, q.land);
  return { save: next, dialog: q.assignDialog };
}

export function canTurnInQuest(save: SaveData): boolean {
  const q = getQuest(save.activeQuestId);
  if (!q) return false;
  if (isQuestCompleted(save, q.id)) return false;
  return save.killed.includes(q.bossId);
}

export function completeActiveQuest(save: SaveData): {
  save: SaveData;
  dialog: string[];
} {
  const q = getQuest(save.activeQuestId);
  if (!q) {
    return { save, dialog: ['PRIZELLA: NO ACTIVE QUEST. WEIRD.'] };
  }
  if (!save.killed.includes(q.bossId)) {
    return { save, dialog: q.reminderDialog };
  }
  if (isQuestCompleted(save, q.id)) {
    return {
      save,
      dialog: ['PRIZELLA: ALREADY TURNED IN. DOUBLE DIPPING? RUDE.'],
    };
  }

  let next: SaveData = {
    ...save,
    activeQuestId: null,
    questsCompleted: [...(save.questsCompleted ?? []), q.id],
    coins: save.coins + 40,
    landsCleared: save.landsCleared.includes(q.land)
      ? save.landsCleared
      : [...save.landsCleared, q.land],
    flags: { ...save.flags, [`quest_done_${q.id}`]: true },
  };
  next = discoverMapz(next, q.land);
  const m = mintItem(next, 'honk_blade', 'epic', 1);
  next = m.save;
  next = autoEquipEmptySlots(next);
  next = syncDerivedStats(next);
  return { save: next, dialog: q.completeDialog };
}

/**
 * Full post-rescue throne / champion talk after Best Bud is handled by caller.
 * Call when bestBudStage === 'complete' (or for kingdom-only lines).
 */
export function prizellaKingdomTalk(save: SaveData): {
  save: SaveData;
  dialog: string[];
} {
  if (!save.princessSaved) {
    return {
      save,
      dialog: ['PRIZELLA: SAVE ME FIRST. THEN CASTLE STUFF.'],
    };
  }

  if (canTurnInQuest(save)) {
    return completeActiveQuest(save);
  }

  const active = getQuest(save.activeQuestId);
  if (active && !isQuestCompleted(save, active.id)) {
    return { save, dialog: active.reminderDialog };
  }

  const next = nextAssignableQuest(save);
  if (next) {
    return assignQuest(save, next.id);
  }

  return {
    save,
    dialog: [
      'PRIZELLA: NO MORE JOBS ON THE BOARD. YET.',
      'THE KINGDOM IS... RELATIVELY FINE.',
      'FORJE STUFF. PET YOUR BUD. PAY WEIRD TAXES.',
      'I\'LL HONK IF I NEED YOU. METAPHORICALLY.',
    ],
  };
}

export function championQuestHint(save: SaveData): string[] {
  if (!save.princessSaved) return [];
  if (save.bestBudStage !== 'complete') return [];
  if (canTurnInQuest(save)) {
    return [
      'TURN IN AT PRIZELLA\'S THRONE.',
      'CASTLE EAST OF THE TRAIL.',
    ];
  }
  const active = getQuest(save.activeQuestId);
  if (active) {
    return [active.shortHint, 'THRONE REMINDERS IF YOU FORGET.'];
  }
  return [
    'VISIT PRIZELLA\'S KINGDOM (EAST OF TRAIL).',
    'SHE HAS CHAMPION JOBS ON THE THRONE.',
  ];
}
