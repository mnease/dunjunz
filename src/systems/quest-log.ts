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
  /**
   * Where to go / what to do next (shown in journal + HUD tracker).
   * Always fill for active/available; empty ok for locked/done.
   */
  hint: string;
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
      hint: dunj
        ? 'Done. Optional: deeper floors or Woodz / Dezertz.'
        : 'GO: Meadow · stairs down · clear floors · Throne of Meta (B8).',
      status: dunj ? 'done' : 'active',
      progress: dunj ? 'CLEARED' : 'IN PROGRESS',
      order: 10,
    },
    {
      id: 'main-woodz',
      kind: 'main',
      title: 'WOODZ SIDE BITE',
      blurb: 'Trail north. Wolf Lord. Optional but cool.',
      hint: woodz
        ? 'Cleared. Hollow east of Woodz Edge for Best Bud later.'
        : !dunj
          ? 'Locked until Dunjunz is cleared (or just explore north anytime).'
          : 'GO: Trope Trail · north · Woodz · Wolf Lord clearing.',
      status: !dunj ? 'locked' : woodz ? 'done' : 'available',
      progress: woodz ? 'CLEARED' : dunj ? 'OPEN' : 'LOCKED',
      order: 20,
    },
    {
      id: 'main-dezertz',
      kind: 'main',
      title: 'DEZERTZ + PRINCESS PRIZELLA',
      blurb: 'Trail south. Sand Wraith. Save the Princess.',
      hint: rescued
        ? 'Rescued. Talk to her on the throne for champion jobs.'
        : !dunj
          ? 'Finish Dunjunz first (or brave the south early).'
          : 'GO: Trail south · Dezertz · Sand Tower · bonk Sand Wraith.',
      status: !dunj ? 'locked' : rescued || dez ? 'done' : 'active',
      progress: rescued ? 'RESCUED' : dunj ? 'FIND HER' : 'LOCKED',
      order: 30,
    },
    {
      id: 'main-kingdom',
      kind: 'main',
      title: 'GO HOME, RULER',
      blurb: 'After rescue: trail east → Kingdomz throne.',
      hint: !rescued
        ? 'Unlocks after Princess Prizella is saved.'
        : save.visitedRooms?.some((r) => r.startsWith('kingdom'))
          ? 'Throne visited. More jobs from the Princess.'
          : 'GO: Trope Trail · east · Kingdom Gate · Throne.',
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
  let hint = 'Save Princess Prizella first.';
  if (stage === 'complete') {
    hint = 'Bud follows you. Bag Y = buddy gear.';
  } else if (stage === 'found') {
    hint = 'GO: Report to Princess Prizella (tower or Kingdom throne).';
  } else if (stage === 'accepted' || stage === 'offered') {
    hint = 'GO: Woodz Edge · east · Best Bud Hollow · talk (E) to the critter.';
  } else if (rescued) {
    hint = 'GO: Talk to Princess Prizella for Champion Job #1.';
  }
  return {
    id: 'champ-best-bud',
    kind: 'champion',
    title: 'CHAMPION #1 · BEST BUD',
    blurb: 'Not a sidekick. A bud. Woodz Hollow east of edge.',
    hint,
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
    const bossDead = save.killed.includes(q.bossId);
    let status: QuestStatus = 'locked';
    let progress = 'LOCKED';
    if (done) {
      status = 'done';
      progress = 'DONE';
    } else if (active) {
      status = 'active';
      progress = bossDead ? 'TURN IN AT THRONE' : 'IN THE FIELD';
    } else if (budDone && save.princessSaved) {
      status = 'available';
      progress = 'ASK PRINCESS PRIZELLA';
    } else {
      status = 'locked';
      progress = budDone ? 'SAVE PRINCESS PRIZELLA' : 'FINISH BEST BUD';
    }
    let hint = progress;
    if (done) hint = 'Complete.';
    else if (active && bossDead) {
      hint = 'GO: Kingdom throne · turn in to Princess Prizella.';
    } else if (active) hint = q.shortHint;
    else if (status === 'available') {
      hint = 'GO: Kingdom throne · ask Princess Prizella for a job.';
    }
    out.push({
      id: `champ-${q.id}`,
      kind: 'champion',
      title: `CHAMPION · ${q.title}`,
      blurb: q.shortHint,
      hint,
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
  let errandsHint = 'GO: Living Arch portal · Queen\'s Court · talk (E).';
  if (queenDone) {
    errandsStatus = 'done';
    errandsProgress = 'LEGENDARY BOX';
    errandsHint = 'Done. Glamdolph may have more news.';
  } else if (qActive || qDoneN > 0) {
    errandsStatus = 'active';
    errandsProgress = `${qDoneN}/3 DONE`;
    if (!save.flags?.['elf_q_wolves_done']) {
      errandsHint =
        'GO: Elven Gate · south · Blighted Thicket · kill both blight wolves · return to Queen.';
    } else if (!save.flags?.['elf_q_shards_done']) {
      errandsHint =
        'GO: Gather 3 WOOD SHARDS (Woodz creeps / forje leftovers) · return to Queen.';
    } else if (!save.flags?.['elf_q_waters_done']) {
      errandsHint =
        'GO: Healing Waters (east of Gate) · E on the spring · return to Queen.';
    } else {
      errandsHint = 'GO: Queen\'s Court · talk for the Legendary Elven Box.';
    }
  } else if (!queenMet) {
    errandsHint = 'GO: Unlock Living Arch · enter kingdom · talk to the Queen first.';
  }

  // Fellowship of the Few (post–queen reward epic)
  const fellowshipOn = !!save.flags?.['fellowship_of_the_few'];
  const dwarves = !!save.flags?.['fellowship_dwarves'];
  const roarhimz = !!save.flags?.['fellowship_roarhimz'];
  const elfJoin = !!save.flags?.['fellowship_elf_warrior'];
  const zoronDown = !!save.flags?.['zoron_defeated'];
  const whiteSword = !!save.flags?.['sword_of_many_livez'];
  const blackHeld = !!save.flags?.['black_sword_held'];
  let fellowshipStatus: QuestStatus = queenDone ? 'available' : 'locked';
  let fellowshipProgress = 'QUEEN\'S REWARD FIRST';
  let fellowshipHint =
    'Finish the Queen\'s three errands first (Legendary Box).';
  if (whiteSword) {
    fellowshipStatus = 'done';
    fellowshipProgress = 'SWORD OF MANY LIVEZ';
    fellowshipHint = 'Zoron fallen. The white sword of many Livez is yours.';
  } else if (fellowshipOn) {
    fellowshipStatus = 'active';
    const n =
      (dwarves ? 1 : 0) + (roarhimz ? 1 : 0) + (elfJoin ? 1 : 0);
    fellowshipProgress =
      n === 0
        ? 'N: DWARVEZ · NW: ROARHIMZ'
        : n < 3
          ? `${n}/3 ALLIES`
          : zoronDown
            ? 'BLACK SWORD → VOLCANO'
            : 'MOREDORKZ — ZORON';
    if (!dwarves) {
      fellowshipHint =
        "GO: Woodz Deep · North Road · Dwarvez Gate · recruit the Under-King's champion.";
    } else if (!roarhimz) {
      fellowshipHint =
        "GO: Woodz Glade west · NW Road · Roarhimz · recruit the Marshal's fighter.";
    } else if (!elfJoin) {
      fellowshipHint =
        "GO: Queen's Court · receive an elven warrior.";
    } else if (!zoronDown) {
      fellowshipHint =
        'GO: South past Dezertz · Ash Road · Moredorkz · defeat Zoron.';
    } else if (blackHeld || zoronDown) {
      fellowshipHint =
        'GO: Doom Forje west of throne · present the black sword.';
    } else {
      fellowshipHint =
        'GO: Doom Forje west of throne · present the black sword.';
    }
  } else if (queenDone) {
    fellowshipHint =
      'GO: Queen\'s Court · talk again if Glamdolph has not appeared yet.';
  }

  return [
    {
      id: 'side-cube',
      kind: 'side',
      title: 'THE APOLOGY CUBE',
      blurb: 'B1 cube room. Talk or fight. Mixed vibes either way.',
      hint:
        cubeStatus === 'done'
          ? 'Resolved.'
          : 'GO: Dunjunz B1 · east of entrance · cube room · talk or fight.',
      status: cubeStatus,
      progress: cubeProgress,
      order: 200,
    },
    {
      id: 'side-mapz',
      kind: 'side',
      title: 'COLLECT MAPZ',
      blurb: 'Scroll pickups unfurl lands. Press M.',
      hint: 'GO: Find mapz scrolls in each land · press M to open Mapz.',
      status: mapzN >= 4 ? 'done' : mapzN > 1 ? 'active' : 'available',
      progress: `${mapzN} LANDS`,
      order: 210,
    },
    {
      id: 'side-elf-door',
      kind: 'side',
      title: 'LIVING ARCH',
      blurb: 'West of Woodz Edge. Root → Trunk → Crown.',
      hint: doorOpen
        ? 'Door open. GO: Riddle Glade · north · Living Arch · step on cyan portal.'
        : 'GO: Woodz Edge · west · Riddle Glade · E statues Root→Trunk→Crown · north to Arch.',
      status: doorStatus,
      progress: doorProgress,
      order: 220,
    },
    {
      id: 'side-elf-queen',
      kind: 'side',
      title: 'QUEEN OF THE WOOD ELVES',
      blurb: 'Pocket realm via Living Arch portal.',
      hint: queenDone
        ? 'Audience complete.'
        : doorOpen
          ? 'GO: Living Arch portal · east to Waters · north to Court · talk (E).'
          : 'Open the Living Arch first (Riddle Glade west of Woodz Edge).',
      status: queenStatus,
      progress: queenProgress,
      order: 230,
    },
    {
      id: 'side-elf-quests',
      kind: 'side',
      title: 'ELVEN ERRANDS',
      blurb: '3 jobs. Full clear → Legendary Elven Box.',
      hint: errandsHint,
      status: errandsStatus,
      progress: errandsProgress,
      order: 240,
    },
    {
      id: 'side-fellowship',
      kind: 'side',
      title: 'THE FELLOWSHIP OF THE FEW',
      blurb:
        'Glamdolph: recruit Dwarvez (N) + Roarhimz (NW), return for an elven warrior, stop Zoron in Moredorkz.',
      hint: fellowshipHint,
      status: fellowshipStatus,
      progress: fellowshipProgress,
      order: 250,
    },
  ];
}

const STATUS_RANK: Record<QuestStatus, number> = {
  active: 0,
  available: 1,
  done: 2,
  locked: 3,
};

/** Full journal list — active first, then available, then done/locked. */
export function listQuests(save: SaveData): QuestLogEntry[] {
  const all = [
    ...mainEntries(save),
    ...championEntries(save),
    ...sideEntries(save),
  ];
  return all.sort((a, b) => {
    const sr = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (sr !== 0) return sr;
    return a.order - b.order;
  });
}

/** Best active (or ready) quest for HUD tracker. */
export function primaryQuestTracker(
  save: SaveData,
): { title: string; hint: string } | null {
  const list = listQuests(save);
  const pick =
    list.find((q) => q.status === 'active') ??
    list.find((q) => q.status === 'available');
  if (!pick) return null;
  return { title: pick.title, hint: pick.hint || pick.blurb };
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
  const t = primaryQuestTracker(save);
  if (t) return `${t.title} · ${t.hint}`;
  if (save.activeQuestId) {
    const q = getQuest(save.activeQuestId);
    if (q) return q.shortHint;
  }
  return null;
}
