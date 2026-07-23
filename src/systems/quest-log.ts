/**
 * Quest journal — unified progress list for main path + champion jobs.
 * Pure: derives status from existing SaveData (no parallel quest state).
 * Tone: earnest, weird, cool. Intentional misspellingz where the world has them.
 */

import type { SaveData } from '../types';
import {
  CHAMPION_QUESTS,
  getQuest,
  isQuestCompleted,
} from './champion-quests';

export type QuestStatus =
  | 'locked'
  | 'available'
  | 'active'
  | 'done';

export type QuestKind = 'main' | 'champion' | 'side';

export interface QuestLogEntry {
  id: string;
  kind: QuestKind;
  /** Short title for the list. */
  title: string;
  /** One-line where/what. */
  blurb: string;
  status: QuestStatus;
  /** Progress label e.g. "2/3" or "FOUND" or "". */
  progress: string;
  /** Sort: main first, then champion, then side; within kind by order. */
  order: number;
}

function hasLand(save: SaveData, land: string): boolean {
  return (save.landsCleared ?? []).includes(land as SaveData['landsCleared'][number]);
}

function mainEntries(save: SaveData): QuestLogEntry[] {
  const rescued = !!save.princessSaved;
  const dunj = hasLand(save, 'dunjunz') || !!save.bossDefeated;
  const woodz = hasLand(save, 'woodz');
  const dez = hasLand(save, 'dezertz') || rescued;

  return [
    {
      id: 'main-dunjunz',
      kind: 'main',
      title: 'THE DUNJUNZ HOLE',
      blurb: 'Meadow stairs → bonk the Dunjun Master. Politely.',
      status: dunj ? 'done' : 'active',
      progress: dunj ? 'CLEARED' : 'IN PROGRESS',
      order: 10,
    },
    {
      id: 'main-woodz',
      kind: 'main',
      title: 'WOODZ SIDE BITE',
      blurb: 'Trail north. Wolf Lord. Optional but cool.',
      status: !dunj ? 'locked' : woodz ? 'done' : 'available',
      progress: woodz ? 'CLEARED' : dunj ? 'OPEN' : 'LOCKED',
      order: 20,
    },
    {
      id: 'main-dezertz',
      kind: 'main',
      title: 'DEZERTZ + PRINCESS PRIZELLA',
      blurb: 'Trail south. Sand Wraith. Save the Princess.',
      status: !dunj ? 'locked' : rescued || dez ? 'done' : 'active',
      progress: rescued ? 'RESCUED' : dunj ? 'FIND HER' : 'LOCKED',
      order: 30,
    },
    {
      id: 'main-kingdom',
      kind: 'main',
      title: 'GO HOME, RULER',
      blurb: 'After rescue: trail east → Kingdomz throne.',
      status: !rescued
        ? 'locked'
        : save.visitedRooms?.some((r) => r.startsWith('kingdom'))
          ? 'done'
          : 'available',
      progress: !rescued
        ? 'LOCKED'
        : save.visitedRooms?.some((r) => r.startsWith('kingdom'))
          ? 'VISITED'
          : 'OPEN',
      order: 40,
    },
  ];
}

function bestBudEntry(save: SaveData): QuestLogEntry {
  const stage = save.bestBudStage ?? 'none';
  const rescued = !!save.princessSaved;
  let status: QuestStatus = 'locked';
  let progress = 'LOCKED';
  if (!rescued) {
    status = 'locked';
    progress = 'SAVE PRINCESS PRIZELLA FIRST';
  } else if (stage === 'complete') {
    status = 'done';
    progress = 'COMPLETE';
  } else if (stage === 'found') {
    status = 'active';
    progress = 'REPORT TO PRINCESS PRIZELLA';
  } else if (stage === 'accepted') {
    status = 'active';
    progress = 'FIND BUD · WOODZ HOLLOW';
  } else if (stage === 'offered') {
    status = 'active';
    progress = 'ACCEPT / FIND BUD';
  } else {
    status = 'available';
    progress = 'TALK TO PRINCESS PRIZELLA';
  }
  return {
    id: 'champ-best-bud',
    kind: 'champion',
    title: 'CHAMPION #1 · BEST BUD',
    blurb: 'Not a sidekick. A bud. Woodz Hollow east of edge.',
    status,
    progress,
    order: 100,
  };
}

function championEntries(save: SaveData): QuestLogEntry[] {
  const out: QuestLogEntry[] = [bestBudEntry(save)];
  const budDone = save.bestBudStage === 'complete';

  CHAMPION_QUESTS.forEach((q, i) => {
    const done = isQuestCompleted(save, q.id);
    const active = save.activeQuestId === q.id;
    let status: QuestStatus = 'locked';
    let progress = 'LOCKED';
    if (done) {
      status = 'done';
      progress = 'DONE';
    } else if (active) {
      status = 'active';
      const bossDead = save.killed.includes(q.bossId);
      progress = bossDead ? 'TURN IN AT THRONE' : 'IN THE FIELD';
    } else if (budDone && save.princessSaved) {
      status = 'available';
      progress = 'ASK PRINCESS PRIZELLA';
    } else {
      status = 'locked';
      progress = budDone ? 'SAVE PRINCESS PRIZELLA' : 'FINISH BEST BUD';
    }
    out.push({
      id: `champ-${q.id}`,
      kind: 'champion',
      title: `CHAMPION · ${q.title}`,
      blurb: q.shortHint,
      status,
      progress,
      order: 110 + i,
    });
  });

  return out;
}

function sideEntries(save: SaveData): QuestLogEntry[] {
  const cubeForgiven = !!save.flags?.['cube_forgiven'];
  const cubeSlain = !!save.flags?.['cube_slain'] || save.killed.includes('gel-cube');
  let cubeStatus: QuestStatus = 'available';
  let cubeProgress = 'B1 SIDE ROOM';
  if (cubeSlain) {
    cubeStatus = 'done';
    cubeProgress = 'SLIME JUSTICE';
  } else if (cubeForgiven) {
    cubeStatus = 'done';
    cubeProgress = 'FORGIVEN (+ BOOTS?)';
  }

  const mapzN = save.discoveredMapz?.length ?? 0;

  // Wood Elf kingdom side content (flags from elfwood.ts)
  const doorOpen = !!save.flags?.['elf_door_unlocked'];
  const queenMet = !!save.flags?.['elf_queen_met'];
  const queenDone = !!save.flags?.['elf_queen_complete'];
  const qActive =
    !!save.flags?.['elf_q_wolves'] ||
    !!save.flags?.['elf_q_shards'] ||
    !!save.flags?.['elf_q_waters'];
  const qDoneN = [
    save.flags?.['elf_q_wolves_done'],
    save.flags?.['elf_q_shards_done'],
    save.flags?.['elf_q_waters_done'],
  ].filter(Boolean).length;

  let doorStatus: QuestStatus = 'available';
  let doorProgress = 'WOODZ EDGE → WEST';
  if (doorOpen) {
    doorStatus = 'done';
    doorProgress = 'ARCH OPEN';
  }

  let queenStatus: QuestStatus = doorOpen ? 'available' : 'locked';
  let queenProgress = 'LIVING ARCH PORTAL';
  if (queenDone) {
    queenStatus = 'done';
    queenProgress = 'BOX GRANTED';
  } else if (queenMet || qActive) {
    queenStatus = 'active';
    queenProgress = `${qDoneN}/3 ERRANDS`;
  }

  let errandsStatus: QuestStatus = queenMet ? 'available' : 'locked';
  let errandsProgress = 'TALK TO THE QUEEN';
  if (queenDone) {
    errandsStatus = 'done';
    errandsProgress = 'LEGENDARY BOX';
  } else if (qActive || qDoneN > 0) {
    errandsStatus = 'active';
    errandsProgress = `${qDoneN}/3 DONE`;
  }

  return [
    {
      id: 'side-cube',
      kind: 'side',
      title: 'THE APOLOGY CUBE',
      blurb: 'B1 cube room. Talk or fight. Mixed vibes either way.',
      status: cubeStatus,
      progress: cubeProgress,
      order: 200,
    },
    {
      id: 'side-mapz',
      kind: 'side',
      title: 'COLLECT MAPZ',
      blurb: 'Scroll pickups unfurl lands. Press M.',
      status: mapzN >= 4 ? 'done' : mapzN > 1 ? 'active' : 'available',
      progress: `${mapzN} LANDS`,
      order: 210,
    },
    {
      id: 'side-elf-door',
      kind: 'side',
      title: 'LIVING ARCH',
      blurb: 'West of Woodz Edge. Root → Trunk → Crown.',
      status: doorStatus,
      progress: doorProgress,
      order: 220,
    },
    {
      id: 'side-elf-queen',
      kind: 'side',
      title: 'QUEEN OF THE WOOD ELVES',
      blurb: 'Pocket realm via Living Arch portal.',
      status: queenStatus,
      progress: queenProgress,
      order: 230,
    },
    {
      id: 'side-elf-quests',
      kind: 'side',
      title: 'ELVEN ERRANDS',
      blurb: '3 jobs. Full clear → Legendary Elven Box.',
      status: errandsStatus,
      progress: errandsProgress,
      order: 240,
    },
  ];
}

/** Full journal list, sorted. */
export function listQuests(save: SaveData): QuestLogEntry[] {
  const all = [
    ...mainEntries(save),
    ...championEntries(save),
    ...sideEntries(save),
  ];
  return all.sort((a, b) => a.order - b.order);
}

export function questStatusLabel(s: QuestStatus): string {
  switch (s) {
    case 'locked':
      return 'LOCKED';
    case 'available':
      return 'READY';
    case 'active':
      return 'ACTIVE';
    case 'done':
      return 'DONE';
  }
}

export function countQuestProgress(save: SaveData): {
  done: number;
  total: number;
  active: number;
} {
  const list = listQuests(save);
  return {
    done: list.filter((q) => q.status === 'done').length,
    total: list.length,
    active: list.filter((q) => q.status === 'active').length,
  };
}

/** Active blurb for HUD/toast — first active quest. */
export function primaryActiveQuestLine(save: SaveData): string | null {
  if (save.activeQuestId) {
    const q = getQuest(save.activeQuestId);
    if (q) return q.shortHint;
  }
  if (save.princessSaved && save.bestBudStage !== 'complete') {
    return 'CHAMPION #1: BEST BUD · WOODZ HOLLOW';
  }
  if (!save.princessSaved && !hasLand(save, 'dunjunz') && !save.bossDefeated) {
    return 'MAIN: DUNJUNZ · MEADOW STAIRS';
  }
  if (!save.princessSaved) {
    return 'MAIN: SAVE PRINCESS PRIZELLA · DEZERTZ SOUTH';
  }
  return null;
}
