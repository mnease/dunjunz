/**
 * Enchanted Woodz + Wood Elf Kingdom (EMA LOCKED design).
 * Pure helpers: statue puzzle, portal spawn, healing spring, queen quests.
 * @see docs/elfwood-kingdom-v1.md
 */

import type { SaveData } from '../types';
import { mintItem, getTemplate } from './items';
import { syncDerivedStats } from './inventory';
import {
  canGrantElfWarrior,
  grantElfWarrior,
  queenFellowshipIdleDialog,
  shouldTriggerFellowshipCutscene,
} from './fellowship';

// ── Room / entity ids ──────────────────────────────────────────────

export const WOODZ_GLADE_ID = 'woodz_glade';
export const WOODZ_ARCH_ID = 'woodz_arch';
export const ELFWOOD_GATE_ID = 'elfwood_gate';
export const ELFWOOD_WATERS_ID = 'elfwood_waters';
export const ELFWOOD_COURT_ID = 'elfwood_court';
export const ELFWOOD_THICKET_ID = 'elfwood_thicket';

export const STATUE_ROOT_ID = 'glade-statue-root';
export const STATUE_TRUNK_ID = 'glade-statue-trunk';
export const STATUE_CROWN_ID = 'glade-statue-crown';
export const QUEEN_ID = 'queen-wood-elves';
export const HEALING_SPRING_ID = 'elf-healing-spring';
export const PORTAL_ELFWOOD_IN_ID = 'portal-elfwood-in';
export const PORTAL_ELFWOOD_OUT_ID = 'portal-elfwood-out';

export const BLIGHT_WOLF_IDS = [
  'elf-blight-wolf-1',
  'elf-blight-wolf-2',
] as const;

export const LEGENDARY_ELVEN_BOX_ID = 'legendary_elven_box';

export const ELVEN_BOX_POOL = [
  'mithril_blade',
  'mithril_bow',
  'mithril_staff',
  'mithril_breastplate',
  'mithril_greaves',
  'mithril_amulet',
  'mithril_ring',
] as const;

export type ElfStatueId =
  | typeof STATUE_ROOT_ID
  | typeof STATUE_TRUNK_ID
  | typeof STATUE_CROWN_ID;

export function isElfStatueId(id: string | undefined): id is ElfStatueId {
  return (
    id === STATUE_ROOT_ID ||
    id === STATUE_TRUNK_ID ||
    id === STATUE_CROWN_ID
  );
}

// ── Flags ──────────────────────────────────────────────────────────

export const FLAG_ROOT_OK = 'elf_statue_root_ok';
export const FLAG_TRUNK_OK = 'elf_statue_trunk_ok';
export const FLAG_DOOR_UNLOCKED = 'elf_door_unlocked';
export const FLAG_ELFWOOD_ENTERED = 'elfwood_entered';
export const FLAG_QUEEN_MET = 'elf_queen_met';
export const FLAG_HEAL_ONCE = 'elf_heal_once';
export const FLAG_Q_WOLVES = 'elf_q_wolves';
export const FLAG_Q_WOLVES_DONE = 'elf_q_wolves_done';
export const FLAG_Q_SHARDS = 'elf_q_shards';
export const FLAG_Q_SHARDS_DONE = 'elf_q_shards_done';
export const FLAG_Q_WATERS = 'elf_q_waters';
export const FLAG_Q_WATERS_DONE = 'elf_q_waters_done';
export const FLAG_QUEEN_COMPLETE = 'elf_queen_complete';
export const FLAG_GOT_ELVEN_BOX = 'got_legendary_elven_box';

function flag(save: SaveData, key: string): boolean {
  return !!save.flags?.[key];
}

function setFlags(
  save: SaveData,
  patch: Record<string, boolean>,
): SaveData {
  return { ...save, flags: { ...save.flags, ...patch } };
}

// ── Portal ─────────────────────────────────────────────────────────

export function shouldSpawnElfwoodPortal(save: SaveData): boolean {
  return flag(save, FLAG_DOOR_UNLOCKED);
}

export function isElfwoodKingdomRoom(roomId: string): boolean {
  return (
    roomId === ELFWOOD_GATE_ID ||
    roomId === ELFWOOD_WATERS_ID ||
    roomId === ELFWOOD_COURT_ID ||
    roomId === ELFWOOD_THICKET_ID
  );
}

// ── Statue puzzle ──────────────────────────────────────────────────

export type TouchStatueResult = {
  save: SaveData;
  dialog: string[];
  toast?: string;
  unlocked?: boolean;
};

const FAIL_DIALOG = [
  'THE WOODZ SNORT.',
  'ORDER: ROOT → TRUNK → CROWN.',
  'TRY AGAIN, LEAF-BRAIN.',
];

const SUCCESS_DIALOG = [
  'THE STUMPS HUM IN THREE-PART HARMONY.',
  'NORTH: A LIVING ARCH OPENS.',
  '(WELL. PORTALS. SAME DIFF.)',
];

export function touchElfStatue(
  save: SaveData,
  statueId: string,
): TouchStatueResult {
  if (flag(save, FLAG_DOOR_UNLOCKED)) {
    return {
      save,
      dialog: [
        'THE STUMPS ARE QUIET NOW.',
        'THE ARCH NORTH ALREADY BREATHES.',
      ],
      toast: 'DOOR ALREADY OPEN',
    };
  }

  const rootOk = flag(save, FLAG_ROOT_OK);
  const trunkOk = flag(save, FLAG_TRUNK_OK);

  if (statueId === STATUE_ROOT_ID) {
    if (rootOk || trunkOk) {
      return failPuzzle(save);
    }
    return {
      save: setFlags(save, { [FLAG_ROOT_OK]: true }),
      dialog: ['ROOT: ...GOOD. DEEP.'],
      toast: 'ROOT ACKNOWLEDGED.',
    };
  }

  if (statueId === STATUE_TRUNK_ID) {
    if (!rootOk || trunkOk) {
      return failPuzzle(save);
    }
    return {
      save: setFlags(save, { [FLAG_TRUNK_OK]: true }),
      dialog: ['TRUNK: ...SOLID.'],
      toast: 'TRUNK ACKNOWLEDGED.',
    };
  }

  if (statueId === STATUE_CROWN_ID) {
    if (!rootOk || !trunkOk) {
      return failPuzzle(save);
    }
    return {
      save: setFlags(save, {
        [FLAG_DOOR_UNLOCKED]: true,
        [FLAG_ROOT_OK]: false,
        [FLAG_TRUNK_OK]: false,
      }),
      dialog: SUCCESS_DIALOG,
      toast: 'ELVEN DOOR UNLOCKED.',
      unlocked: true,
    };
  }

  return { save, dialog: ['...A STUMP. PROBABLY.'] };
}

function failPuzzle(save: SaveData): TouchStatueResult {
  return {
    save: setFlags(save, {
      [FLAG_ROOT_OK]: false,
      [FLAG_TRUNK_OK]: false,
    }),
    dialog: FAIL_DIALOG,
    toast: 'SEQUENCE RESET',
  };
}

export function archSignDialog(save: SaveData): string[] {
  if (flag(save, FLAG_DOOR_UNLOCKED)) {
    return [
      'THE ARCH BREATHES. STEP ON THE PORTAL.',
      'WOOD ELVES AHEAD. BE COOL. PROBABLY.',
    ];
  }
  return [
    'A WOVEN ARCH OF LIVING WOOD.',
    'IT IS VERY CLOSED.',
    'SOMETHING ABOUT ROOTS. GLADE SOUTH.',
  ];
}

// ── Healing spring ─────────────────────────────────────────────────

export type HealSpringResult = {
  save: SaveData;
  dialog: string[];
  toast?: string;
  healed: boolean;
};

/**
 * Once-per-visit enforced by caller (session flag).
 * Always sets `elf_heal_once` on successful heal for quest progress.
 */
export function drinkHealingSpring(
  save: SaveData,
  alreadyUsedThisVisit: boolean,
): HealSpringResult {
  if (alreadyUsedThisVisit) {
    return {
      save,
      dialog: ['THE SPRING: SIP QUIETLY. COME BACK AFTER A WALK.'],
      toast: 'SPRING RESTING',
      healed: false,
    };
  }
  const maxHp = Math.max(1, save.maxHp | 0);
  const next: SaveData = {
    ...save,
    hp: maxHp,
    flags: { ...save.flags, [FLAG_HEAL_ONCE]: true },
  };
  return {
    save: next,
    dialog: [
      'THE SPRING GURGLES. YOU FEEL LESS DEAD.',
      'HEALING WATERS · HP RESTORED.',
    ],
    toast: 'HEALING WATERS · HP RESTORED',
    healed: true,
  };
}

// ── Queen quests ───────────────────────────────────────────────────

export type QueenTalkResult = {
  save: SaveData;
  dialog: string[];
  toast?: string;
  /** After box grant (or re-talk if cutscene missed): run Glamdolph arrival. */
  triggerFellowshipCutscene?: boolean;
};

/**
 * Both blight wolves defeated permanently.
 * Soft-respawn used to skip `killed[]` for kind=wolf — those IDs are now
 * permanent kills; also honor hardKilled + explicit flags for safety.
 */
export function wolvesKilled(save: SaveData): boolean {
  const lists = [save.killed ?? [], save.hardKilled ?? []];
  return BLIGHT_WOLF_IDS.every((id) => {
    if (lists.some((list) => list.includes(id))) return true;
    if (save.flags?.[`killed_${id}`]) return true;
    return false;
  });
}

/** How many of the two blight wolves are recorded dead (0–2). */
export function blightWolvesKillCount(save: SaveData): number {
  return BLIGHT_WOLF_IDS.filter((id) => {
    if ((save.killed ?? []).includes(id)) return true;
    if ((save.hardKilled ?? []).includes(id)) return true;
    if (save.flags?.[`killed_${id}`]) return true;
    return false;
  }).length;
}

function grantStack(
  save: SaveData,
  id: string,
  n: number,
): SaveData {
  const stacks = { ...save.stacks };
  stacks[id] = (stacks[id] ?? 0) + n;
  return { ...save, stacks };
}

function spendStack(
  save: SaveData,
  id: string,
  n: number,
): SaveData | null {
  const have = save.stacks[id] ?? 0;
  if (have < n) return null;
  const stacks = { ...save.stacks };
  stacks[id] = have - n;
  if (stacks[id]! <= 0) delete stacks[id];
  return { ...save, stacks };
}

/** Intermediate gifts + final box. */
export function talkQueen(save: SaveData): QueenTalkResult {
  let next = save;

  // 1. First audience
  if (!flag(next, FLAG_QUEEN_MET)) {
    next = setFlags(next, { [FLAG_QUEEN_MET]: true });
    return {
      save: next,
      dialog: [
        'QUEEN OF THE WOOD ELVES: AH. A CRAWLER.',
        'YOU FOUND THE ROOT-TRUNK-CROWN GAG. IMPRESSIVE.',
        'I HAVE THREE ERRANDS. SMALL. ROYAL. SLIGHTLY HAZARDOUS.',
        'TALK TO ME AGAIN TO TAKE WORK.',
      ],
      toast: 'QUEEN AUDIENCE',
    };
  }

  // 2. Turn-ins (check before new accepts so one talk can complete)
  // Auto-accept blight job if they already wiped the pack (pre-accept kill)
  if (
    !flag(next, FLAG_Q_WOLVES) &&
    !flag(next, FLAG_Q_WOLVES_DONE) &&
    wolvesKilled(next)
  ) {
    next = setFlags(next, { [FLAG_Q_WOLVES]: true });
  }

  if (flag(next, FLAG_Q_WOLVES) && !flag(next, FLAG_Q_WOLVES_DONE)) {
    if (wolvesKilled(next)) {
      next = grantStack(next, 'potion', 3);
      next = { ...next, coins: next.coins + 25 };
      next = setFlags(next, { [FLAG_Q_WOLVES_DONE]: true });
      return {
        save: next,
        dialog: [
          'QUEEN: DONE? MATHEMATICAL. TAKE THIS. DO NOT LOSE IT IN A BUSH.',
          'YOU GOT: 3 POTIONS + 25c.',
          'BLIGHT BITE: CLEAR.',
        ],
        toast: '+3 POTIONS · +25c',
      };
    }
  }

  if (flag(next, FLAG_Q_SHARDS) && !flag(next, FLAG_Q_SHARDS_DONE)) {
    const spent = spendStack(next, 'wood_shard', 3);
    if (spent) {
      next = grantStack(spent, 'loot_box_gold', 1);
      next = setFlags(next, { [FLAG_Q_SHARDS_DONE]: true });
      return {
        save: next,
        dialog: [
          'QUEEN: DONE? MATHEMATICAL. TAKE THIS. DO NOT LOSE IT IN A BUSH.',
          'YOU GOT: GOLD LOOT BOX (THREE SHARDS SPENT).',
          'THREE SHARDS: CLEAR.',
        ],
        toast: 'GOLD LOOT BOX',
      };
    }
  }

  if (flag(next, FLAG_Q_WATERS) && !flag(next, FLAG_Q_WATERS_DONE)) {
    if (flag(next, FLAG_HEAL_ONCE)) {
      next = grantStack(next, 'potion', 1);
      next = { ...next, coins: next.coins + 40 };
      next = setFlags(next, { [FLAG_Q_WATERS_DONE]: true });
      const preemptive = true; // drunk before or after accept both ok
      return {
        save: next,
        dialog: [
          preemptive && !flag(save, FLAG_Q_WATERS)
            ? 'QUEEN: PREEMPTIVE HYDRATION. I RESPECT THAT.'
            : 'QUEEN: DONE? MATHEMATICAL. TAKE THIS. DO NOT LOSE IT IN A BUSH.',
          'YOU GOT: 40c + 1 POTION.',
          'DRINK THE QUIET: CLEAR.',
        ].filter(Boolean),
        toast: '+40c · +1 POTION',
      };
    }
  }

  // 3. Final box when all three done → Fellowship of the Few cutscene
  if (
    flag(next, FLAG_Q_WOLVES_DONE) &&
    flag(next, FLAG_Q_SHARDS_DONE) &&
    flag(next, FLAG_Q_WATERS_DONE) &&
    !flag(next, FLAG_GOT_ELVEN_BOX)
  ) {
    next = grantStack(next, LEGENDARY_ELVEN_BOX_ID, 1);
    next = setFlags(next, {
      [FLAG_GOT_ELVEN_BOX]: true,
      [FLAG_QUEEN_COMPLETE]: true,
    });
    return {
      save: next,
      dialog: [
        'QUEEN OF THE WOOD ELVES: YOU DID THE WHOLE LIST.',
        'RARE. USUALLY CRAWLERS STOP AT "ONE WOLF AND A NAP."',
        'TAKE THE LEGENDARY ELVEN BOX.',
        'ONE MITHRIL GIFT. RANDOM. FATE IS A JERK.',
        'OPEN IT FROM INVENTORY. TRY NOT TO CRY ON THE MOSS.',
        '',
        '…WAIT. DO YOU FEEL THAT?',
        'THE ROOTS ARE TREMBLING.',
      ],
      toast: 'LEGENDARY ELVEN BOX!',
      triggerFellowshipCutscene: true,
    };
  }

  if (flag(next, FLAG_QUEEN_COMPLETE) || flag(next, FLAG_GOT_ELVEN_BOX)) {
    // Safety: box already granted but cutscene never fired (old save / reload)
    if (shouldTriggerFellowshipCutscene(next)) {
      return {
        save: next,
        dialog: [
          'QUEEN: THE BOX WAS ONLY THE BEGINNING.',
          'THE ROOTS TREMBLE AGAIN…',
        ],
        toast: 'SOMETHING APPROACHES…',
        triggerFellowshipCutscene: true,
      };
    }
    // Fellowship: grant Lirael when Dwarvez + Roarhimz recruited
    if (canGrantElfWarrior(next)) {
      return grantElfWarrior(next);
    }
    return {
      save: next,
      dialog: queenFellowshipIdleDialog(next),
    };
  }

  // 4. Accept next incomplete quests (parallel-capable; one accept per talk)
  if (!flag(next, FLAG_Q_WOLVES) && !flag(next, FLAG_Q_WOLVES_DONE)) {
    next = setFlags(next, { [FLAG_Q_WOLVES]: true });
    return {
      save: next,
      dialog: [
        'QUEEN: JOB — BLIGHT BITE.',
        'SOUTH OF THE GATE: TWO BLIGHTED WOLVES. END THEM. AWOO OPTIONAL.',
      ],
      toast: 'QUEST: BLIGHT BITE',
    };
  }

  if (!flag(next, FLAG_Q_SHARDS) && !flag(next, FLAG_Q_SHARDS_DONE)) {
    next = setFlags(next, { [FLAG_Q_SHARDS]: true });
    return {
      save: next,
      dialog: [
        'QUEEN: JOB — THREE SHARDS FOR HER MAJESTY.',
        'BRING ME THREE WOOD SHARDS. FORJING LEFTOVERS COUNT. I HAVE STANDARDS.',
      ],
      toast: 'QUEST: THREE SHARDS',
    };
  }

  if (!flag(next, FLAG_Q_WATERS) && !flag(next, FLAG_Q_WATERS_DONE)) {
    next = setFlags(next, { [FLAG_Q_WATERS]: true });
    // If already drank, next talk turn-in will complete
    if (flag(next, FLAG_HEAL_ONCE)) {
      return {
        save: next,
        dialog: [
          'QUEEN: JOB — DRINK THE QUIET.',
          'OH. YOU ALREADY SIPPED. TALK AGAIN TO TURN IN. HYDRATE ROYALLY.',
        ],
        toast: 'QUEST: DRINK THE QUIET',
      };
    }
    return {
      save: next,
      dialog: [
        'QUEEN: JOB — DRINK THE QUIET.',
        'DRINK FROM THE HEALING WATERS WEST-ISH. E ON THE SPRING. HYDRATE ROYALLY.',
      ],
      toast: 'QUEST: DRINK THE QUIET',
    };
  }

  // Active but incomplete — status board
  const wolfN = blightWolvesKillCount(next);
  return {
    save: next,
    dialog: [
      'QUEEN: STILL ON THE LIST:',
      !flag(next, FLAG_Q_WOLVES_DONE)
        ? wolfN >= 2
          ? '· BLIGHT WOLVES (DONE — TALK AGAIN)'
          : `· BLIGHT WOLVES (${wolfN}/2 · SOUTH THICKET)`
        : '',
      !flag(next, FLAG_Q_SHARDS_DONE)
        ? `· WOOD SHARDS (${(next.stacks.wood_shard ?? 0)}/3)`
        : '',
      !flag(next, FLAG_Q_WATERS_DONE)
        ? `· HEALING WATERS (${flag(next, FLAG_HEAL_ONCE) ? 'SIPPED — TALK AGAIN' : 'E ON SPRING'})`
        : '',
    ].filter(Boolean),
  };
}

// ── Legendary box open (used by loot-boxes) ────────────────────────

export type OpenElvenBoxResult =
  | {
      ok: true;
      save: SaveData;
      message: string;
      granted: string[];
      grantedItems: { templateId: string; name: string; qty?: number }[];
      boxName: string;
      boxTemplateId: string;
    }
  | { ok: false; save: SaveData; reason: string };

export function openLegendaryElvenBox(
  save: SaveData,
  rng: () => number = Math.random,
): OpenElvenBoxResult {
  const count = save.stacks[LEGENDARY_ELVEN_BOX_ID] ?? 0;
  if (count <= 0) {
    return { ok: false, save, reason: 'NO ELVEN BOX' };
  }
  const stacks = { ...save.stacks };
  stacks[LEGENDARY_ELVEN_BOX_ID] = count - 1;
  if (stacks[LEGENDARY_ELVEN_BOX_ID]! <= 0) {
    delete stacks[LEGENDARY_ELVEN_BOX_ID];
  }
  let next: SaveData = { ...save, stacks };
  const tid =
    ELVEN_BOX_POOL[Math.floor(rng() * ELVEN_BOX_POOL.length)] ??
    'mithril_blade';
  const minted = mintItem(next, tid, 'legendary', 1);
  const keep = { ...minted.instance, guildLoaner: false as const };
  next = {
    ...minted.save,
    bag: minted.save.bag.map((b) => (b.uid === keep.uid ? keep : b)),
  };
  next = syncDerivedStats(next);
  const name = getTemplate(tid).name;
  const boxName = getTemplate(LEGENDARY_ELVEN_BOX_ID).name;
  return {
    ok: true,
    save: next,
    boxName,
    boxTemplateId: LEGENDARY_ELVEN_BOX_ID,
    granted: [name],
    grantedItems: [{ templateId: tid, name }],
    message: `OPENED ${boxName} — ${name}`,
  };
}
