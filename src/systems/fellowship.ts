/**
 * The Fellowship Of The Few — post–Wood Elf queen epic beat.
 * Pure helpers; GameScene owns cutscenes / gates / NPC talk wiring.
 * @see docs/fellowship-of-the-few-roads-lands-v1.md
 */

import type { SaveData } from '../types';
import { mintItem, findInBag } from './items';
import { markLandCleared } from './quest';

export const GLAMDOLPH_ID = 'glamdolph';
export const GLAMDOLPH_ROOM = 'elfwood_court';

/** Spawn tile in queen's court (south of queen, on dirt aisle). */
export const GLAMDOLPH_TILE = { x: 8, y: 7 } as const;

export const FLAG_FELLOWSHIP_STARTED = 'fellowship_of_the_few';
export const FLAG_GLAMDOLPH_MET = 'glamdolph_met';
export const FLAG_DWARVES_RECRUITED = 'fellowship_dwarves';
export const FLAG_ROARHIMZ_RECRUITED = 'fellowship_roarhimz';
export const FLAG_ELF_WARRIOR_JOINED = 'fellowship_elf_warrior';
export const FLAG_ZORON_DEFEATED = 'zoron_defeated';
export const FLAG_WHITE_SWORD = 'sword_of_many_livez';
export const FLAG_BLACK_SWORD = 'black_sword_held';

export const FLAG_DWARVEZ_KING_MET = 'dwarvez_king_met';
export const FLAG_DWARVEZ_TRIAL_DONE = 'dwarvez_trial_done';
export const FLAG_ROARHIMZ_MARSHAL_MET = 'roarhimz_marshal_met';
export const FLAG_ROARHIMZ_TRIAL_DONE = 'roarhimz_trial_done';

/** Named cast / entity ids */
export const UNDER_KING_ID = 'under-king-bramli';
export const THRAIN_ID = 'thrain-ironlaugh';
export const MARSHAL_ID = 'marshal-eorik';
export const ROFA_ID = 'rofa-spearhymn';
export const LIRAEL_ID = 'lirael-leaf-guard';
export const ZORON_ID = 'zoron';
export const VOLCANO_FORJE_ID = 'doom-forje-pad';
export const CAVE_FOREMAN_ID = 'cave-foreman';

export const BLACK_SWORD_TEMPLATE = 'black_sword';
export const WHITE_SWORD_TEMPLATE = 'sword_of_many_livez';

/** Mine trial kill targets (any one set cleared counts with mats path). */
export const DWARVEZ_MINE_HOSTILE_IDS = [
  'dwarvez-mine-skel-1',
  'dwarvez-mine-skel-2',
  'dwarvez-mine-skel-3',
] as const;

export const ROARHIMZ_CAMP_HOSTILE_IDS = [
  'roarhimz-raid-1',
  'roarhimz-raid-2',
  'roarhimz-raid-3',
] as const;

function flag(save: SaveData, key: string): boolean {
  return !!save.flags?.[key];
}

function setFlags(
  save: SaveData,
  patch: Record<string, boolean>,
): SaveData {
  return { ...save, flags: { ...save.flags, ...patch } };
}

function grantStack(save: SaveData, id: string, n: number): SaveData {
  const stacks = { ...save.stacks };
  stacks[id] = (stacks[id] ?? 0) + n;
  return { ...save, stacks };
}

// ── Cutscene / active ──────────────────────────────────────────────

/** True when queen reward is done but Glamdolph has not yet appeared. */
export function shouldTriggerFellowshipCutscene(save: SaveData): boolean {
  const queenDone =
    flag(save, 'elf_queen_complete') || flag(save, 'got_legendary_elven_box');
  return queenDone && !flag(save, FLAG_FELLOWSHIP_STARTED);
}

export function markFellowshipStarted(save: SaveData): SaveData {
  return setFlags(save, {
    [FLAG_FELLOWSHIP_STARTED]: true,
    [FLAG_GLAMDOLPH_MET]: true,
  });
}

export function isFellowshipActive(save: SaveData): boolean {
  return (
    flag(save, FLAG_FELLOWSHIP_STARTED) && !flag(save, FLAG_ZORON_DEFEATED)
  );
}

// ── Road gates (PR1) ───────────────────────────────────────────────

/** North + NW roads open after Glamdolph briefing. */
export function isNorthRoadOpen(save: SaveData): boolean {
  return flag(save, FLAG_FELLOWSHIP_STARTED);
}

export function isNwRoadOpen(save: SaveData): boolean {
  return flag(save, FLAG_FELLOWSHIP_STARTED);
}

/** South ash road only after full fellowship (elf warrior joined). */
export function isSouthRoadOpen(save: SaveData): boolean {
  return flag(save, FLAG_ELF_WARRIOR_JOINED);
}

export function isRoadOpen(
  save: SaveData,
  road: 'north' | 'nw' | 'south',
): boolean {
  if (road === 'north') return isNorthRoadOpen(save);
  if (road === 'nw') return isNwRoadOpen(save);
  return isSouthRoadOpen(save);
}

/** Barrier entity ids spawn only while the matching road is closed. */
export function shouldSpawnFellowshipBarrier(
  save: SaveData,
  entityId: string | undefined,
): boolean {
  if (!entityId) return true;
  if (entityId.startsWith('gate-block-north-')) return !isNorthRoadOpen(save);
  if (entityId.startsWith('gate-block-nw-')) return !isNwRoadOpen(save);
  if (entityId.startsWith('gate-block-south-')) return !isSouthRoadOpen(save);
  return true;
}

export function northGatekeeperDialog(save: SaveData): string[] {
  if (isNorthRoadOpen(save)) {
    return [
      'NORTH WARDEN: PASS, CRAWLER. THE DWARVEZ HATE SURPRISES.',
      'KNOCK LOUD. BRING SNACKS.',
    ];
  }
  return [
    'NORTH WARDEN: THE NORTH ROAD IS SEALED BY TREATY AND FEAR.',
    'GLAMDOLPH HAS NOT SPOKEN. GO BACK.',
  ];
}

export function nwGatekeeperDialog(save: SaveData): string[] {
  if (isNwRoadOpen(save)) {
    return [
      'NW SCOUT: WIND FAVORS YOU. ROARHIMZ RIDE TRUE.',
      'DO NOT INSULT THEIR HORSES. THEY NOTICE.',
    ];
  }
  return [
    'NW SCOUT: THE GRASS SEA IS CLOSED.',
    'NO FELLOWSHIP, NO PASS. GLAMDOLPH FIRST.',
  ];
}

export function southGatekeeperDialog(save: SaveData): string[] {
  if (isSouthRoadOpen(save)) {
    return [
      'ASH WATCH: THE FELLOWSHIP IS FEW. ENOUGH.',
      'SOUTH: MOREDORKZ. DO NOT PET THE LAVA.',
    ];
  }
  return [
    'ASH WATCH: ASH CREEPS NORTH. YOU ARE NOT ENOUGH.',
    'RETURN WITH THE FELLOWSHIP OF THE FEW.',
  ];
}

// ── Party passives (flags only — Best Bud remains sole follower) ───

export function fellowshipAtkBonus(save: SaveData): number {
  return flag(save, FLAG_DWARVES_RECRUITED) ? 1 : 0;
}

export function fellowshipDefBonus(save: SaveData): number {
  let d = 0;
  if (flag(save, FLAG_ROARHIMZ_RECRUITED)) d += 1;
  if (flag(save, FLAG_ELF_WARRIOR_JOINED)) d += 1;
  return d;
}

export function fellowshipPartyChips(save: SaveData): string[] {
  const chips: string[] = [];
  if (flag(save, FLAG_DWARVES_RECRUITED)) chips.push('THRAIN');
  if (flag(save, FLAG_ROARHIMZ_RECRUITED)) chips.push('ROFA');
  if (flag(save, FLAG_ELF_WARRIOR_JOINED)) chips.push('LIRAEL');
  return chips;
}

export function fellowshipPartyHudLine(save: SaveData): string | null {
  if (!flag(save, FLAG_FELLOWSHIP_STARTED)) return null;
  if (flag(save, FLAG_WHITE_SWORD) || flag(save, FLAG_ZORON_DEFEATED)) {
    const chips = fellowshipPartyChips(save);
    return chips.length
      ? `FELLOWSHIP: ${chips.join(' · ')} · DONE`
      : 'FELLOWSHIP: DONE';
  }
  const chips = fellowshipPartyChips(save);
  if (!chips.length) return 'FELLOWSHIP: RECRUIT ALLIES';
  return `FELLOWSHIP: ${chips.join(' · ')}`;
}

// ── Dwarvez recruit ────────────────────────────────────────────────

export function dwarvezMineCleared(save: SaveData): boolean {
  return DWARVEZ_MINE_HOSTILE_IDS.every((id) => save.killed.includes(id));
}

export function dwarvezTrialMatsReady(save: SaveData): boolean {
  const gold = save.stacks?.['ore_gold'] ?? 0;
  const mithril = save.stacks?.['ore_mithril'] ?? 0;
  return gold >= 3 || mithril >= 1;
}

export function isDwarvezTrialComplete(save: SaveData): boolean {
  return (
    flag(save, FLAG_DWARVEZ_TRIAL_DONE) ||
    dwarvezMineCleared(save) ||
    dwarvezTrialMatsReady(save)
  );
}

export type NpcTalkResult = {
  save: SaveData;
  dialog: string[];
  toast?: string;
};

export function talkUnderKing(save: SaveData): NpcTalkResult {
  let next = save;

  if (flag(next, FLAG_DWARVES_RECRUITED)) {
    return {
      save: next,
      dialog: [
        'UNDER-KING BRAMLI: THRAIN RIDES WITH YOU.',
        'BRING GOLD STORIES BACK. OR GOLD. PREFER GOLD.',
      ],
    };
  }

  if (!flag(next, FLAG_DWARVEZ_KING_MET)) {
    next = setFlags(next, { [FLAG_DWARVEZ_KING_MET]: true });
    return {
      save: next,
      dialog: [
        'UNDER-KING BRAMLI DEEPVAULT: A SURFACE CRAWLER.',
        'GLAMDOLPH SENT WORD. ZORON. BLACK SWORD. UGLY BUSINESS.',
        'PROVE YOU DIG TRUE:',
        'CLEAR THE GOLD VEIN BELOW — OR BRING ORE GOLD×3 / MITHRIL×1.',
        'THEN I SEND THRAIN IRONLAUGH.',
      ],
      toast: 'TRIAL: DWARVEZ MINES',
    };
  }

  if (!isDwarvezTrialComplete(next)) {
    return {
      save: next,
      dialog: [
        'BRAMLI: STILL WAITING.',
        'GOLD VEIN HOSTILES — OR ORE GOLD×3 — OR ORE MITHRIL×1.',
        'WE DIG. WE EAT. WE HIT ROCKS THAT LOOK AT US.',
      ],
    };
  }

  // Complete trial + recruit
  if (!flag(next, FLAG_DWARVEZ_TRIAL_DONE)) {
    next = setFlags(next, { [FLAG_DWARVEZ_TRIAL_DONE]: true });
  }
  // Prefer mat spend only if mine not cleared and they have mats
  if (!dwarvezMineCleared(next) && dwarvezTrialMatsReady(next)) {
    const stacks = { ...next.stacks };
    if ((stacks.ore_mithril ?? 0) >= 1) {
      stacks.ore_mithril = (stacks.ore_mithril ?? 0) - 1;
      if (stacks.ore_mithril <= 0) delete stacks.ore_mithril;
    } else {
      stacks.ore_gold = (stacks.ore_gold ?? 0) - 3;
      if ((stacks.ore_gold ?? 0) <= 0) delete stacks.ore_gold;
    }
    next = { ...next, stacks };
  }

  next = setFlags(next, { [FLAG_DWARVES_RECRUITED]: true });
  next = markLandCleared(next, 'dwarvez');
  next = grantStack(next, 'ore_mithril', 1);
  next = { ...next, coins: next.coins + 50 };

  return {
    save: next,
    dialog: [
      'BRAMLI: DONE. MATHEMATICAL.',
      'THRAIN IRONLAUGH JOINS THE FELLOWSHIP OF THE FEW.',
      'HE WILL NOT FOLLOW YOUR BOOTS — HE FIGHTS IN SPIRIT.',
      '(+1 ATK WHILE HE STANDS WITH YOU.)',
      'YOU GOT: ORE MITHRIL×1 + 50c.',
    ],
    toast: 'THRAIN JOINED · DWARVEZ CLEARED',
  };
}

// ── Roarhimz recruit ───────────────────────────────────────────────

export function roarhimzCampCleared(save: SaveData): boolean {
  return ROARHIMZ_CAMP_HOSTILE_IDS.every((id) => save.killed.includes(id));
}

export function isRoarhimzTrialComplete(save: SaveData): boolean {
  return flag(save, FLAG_ROARHIMZ_TRIAL_DONE) || roarhimzCampCleared(save);
}

export function talkMarshal(save: SaveData): NpcTalkResult {
  let next = save;

  if (flag(next, FLAG_ROARHIMZ_RECRUITED)) {
    return {
      save: next,
      dialog: [
        'MARSHAL ÉORIK: ROFA SPEARHYMN RIDES WITH YOUR CAUSE.',
        'MY HORSE HAS BETTER MANNERS THAN ZORON\'S SWORD.',
      ],
    };
  }

  if (!flag(next, FLAG_ROARHIMZ_MARSHAL_MET)) {
    next = setFlags(next, { [FLAG_ROARHIMZ_MARSHAL_MET]: true });
    return {
      save: next,
      dialog: [
        'MARSHAL ÉORIK WINDMANE: GLAMDOLPH\'S CRAWLER.',
        'ROARHIMZ DO NOT JOIN WHISPERS. PROVE COURAGE.',
        'CLEAR THE RIDER CAMP RAIDERS WEST OF THE PLAINZ.',
        'THEN ROFA SPEARHYMN JOINS YOU.',
      ],
      toast: 'TRIAL: RIDER CAMP',
    };
  }

  if (!isRoarhimzTrialComplete(next)) {
    return {
      save: next,
      dialog: [
        'ÉORIK: THE CAMP STILL HOWLS WITH RAIDERS.',
        'WEST PLAINZ → RIDER CAMP. THREE FOES. RIDE TRUE.',
      ],
    };
  }

  next = setFlags(next, {
    [FLAG_ROARHIMZ_TRIAL_DONE]: true,
    [FLAG_ROARHIMZ_RECRUITED]: true,
  });
  next = markLandCleared(next, 'roarhimz');
  next = grantStack(next, 'mead_flask', 2);
  next = { ...next, coins: next.coins + 40 };

  return {
    save: next,
    dialog: [
      'ÉORIK: COURAGE PROVED. ROFA SPEARHYMN JOINS.',
      'SHE IS FEW. SHE IS FAST. (+1 DEF — HORSE-FOLK GUARD.)',
      'MEAD AFTER. ALWAYS MEAD AFTER.',
      'YOU GOT: MEAD FLASK×2 + 40c.',
    ],
    toast: 'ROFA JOINED · ROARHIMZ CLEARED',
  };
}

// ── Elf warrior grant (Queen) ──────────────────────────────────────

export function canGrantElfWarrior(save: SaveData): boolean {
  return (
    flag(save, FLAG_FELLOWSHIP_STARTED) &&
    flag(save, FLAG_DWARVES_RECRUITED) &&
    flag(save, FLAG_ROARHIMZ_RECRUITED) &&
    !flag(save, FLAG_ELF_WARRIOR_JOINED)
  );
}

export function grantElfWarrior(save: SaveData): NpcTalkResult {
  if (flag(save, FLAG_ELF_WARRIOR_JOINED)) {
    return {
      save,
      dialog: [
        'QUEEN: LIRAEL ALREADY RIDES WITH YOU.',
        'SOUTH. ZORON. BLACK SWORD. VOLCANO. GO.',
      ],
    };
  }
  if (!canGrantElfWarrior(save)) {
    return {
      save,
      dialog: queenFellowshipIdleDialog(save),
    };
  }
  const next = setFlags(save, { [FLAG_ELF_WARRIOR_JOINED]: true });
  return {
    save: next,
    dialog: [
      'QUEEN OF THE WOOD ELVES: YOU BROUGHT DWARVEZ AND ROARHIMZ.',
      'IMPRESSED. SLIGHTLY.',
      'I SEND LIRAEL OF THE LEAF-GUARD.',
      'SHE IS FEW. SHE IS ENOUGH. (+1 DEF.)',
      'GO SOUTH. END ZORON. SAVE THE WOODZ.',
    ],
    toast: 'LIRAEL JOINED · FELLOWSHIP COMPLETE',
  };
}

/**
 * Glamdolph's ominous briefing — Dunjunz tone, intentional misspellings.
 */
export function glamdolphArrivalDialog(): string[] {
  return [
    '…THE GROUND STOPS. THE LIGHT FADES.',
    '',
    'A GREY WIZARD STEPS FROM THE AFTERGLOW.',
    'LONG WHITE BEARD. LONGER WORRIES.',
    '',
    'GLAMDOLPH: CRAWLER. LISTEN WELL.',
    '',
    'A GREAT DARKNESS SPREADS ACROSS THE LAND.',
    'IT THREATENS ALL THAT IS GOOD.',
    'IT THREATENS TO PUSH THE WOOD ELVEZ',
    'FROM THIS REALM FOREVER — UNLESS IT IS STOPPED.',
    '',
    'A SORCEROR NAMED ZORON, ARMORED IN OMINOUS BLACK,',
    'WIELDS AN EVIL BLACK SWORD.',
    'THAT BLADE GIVES HIM IMMENSE POWER —',
    'AND COMMAND OVER HORDES OF GOBLINS AND ORCS',
    'IN THE FAR SOUTH LAND OF MOREDORKZ.',
    '',
    'THERE VOLCANOES SPEW BLACK SMOKE.',
    'NO LIVING THING THRIVES.',
    'MOREDORKZ GROWS NORTH.',
    'IT IS BEGINNING TO CONSUME THE LANDS OF THE LIVING.',
    '',
    'YOU MUST TRAVEL FIRST TO THE FAR NORTH —',
    'THE LAND OF THE DWARVEZ —',
    'AND RECRUIT THEIR GREATEST WARRIORS.',
    '',
    'THEN TO THE FAR NORTH-WEST —',
    'THE LANDS OF MEN —',
    'THE GREAT HORSE-RIDING PEOPLE, THE ROARHIMZ.',
    'RECRUIT THEIR GREATEST FIGHTERS.',
    '',
    'RETURN HERE TO THE QUEEN OF THE WOOD ELVEZ.',
    'SHE WILL SEND ONE OF HER BEST ELVEN WARRIORZ WITH YOU.',
    '',
    'TOGETHER YOU WILL FORM A FELLOWSHIP',
    'TO FIGHT ZORON, TAKE HIS BLACK SWORD,',
    'AND CARRY IT BACK TO THE VOLCANO IN MOREDORKZ',
    'WHERE IT WAS FORGED —',
    'WHERE IT SHALL BECOME THE GREAT WHITE SWORD',
    'OF MANY LIVEZ.',
    '',
    'THIS QUEST SHALL BE KNOWN AS…',
    'THE FELLOWSHIP OF THE FEW.',
    '',
    'GO. THE WOODZ ARE COUNTING ON YOU.',
    'AND SO AM I. MOSTLY YOU. MOSTLY.',
  ];
}

export function glamdolphBanterDialog(save: SaveData): string[] {
  if (flag(save, FLAG_WHITE_SWORD) || flag(save, FLAG_ZORON_DEFEATED)) {
    if (flag(save, FLAG_WHITE_SWORD)) {
      return [
        'GLAMDOLPH: THE SWORD OF MANY LIVEZ SHINES.',
        'YOU DID THE THING. MATHEMATICAL.',
        'TRY NOT TO LOSE IT IN A BUSH.',
      ];
    }
    return [
      'GLAMDOLPH: ZORON IS DOWN. TAKE THE BLACK SWORD',
      'WEST TO THE DOOM FORJE. FINISH IT.',
    ];
  }
  if (flag(save, FLAG_ELF_WARRIOR_JOINED)) {
    return [
      'GLAMDOLPH: THE FELLOWSHIP IS ASSEMBLED.',
      'SOUTH TO MOREDORKZ. BLACK SWORD. VOLCANO.',
      'DO NOT PET THE LAVA.',
    ];
  }
  const steps: string[] = ['GLAMDOLPH: THE FELLOWSHIP OF THE FEW — REMINDER:'];
  if (!flag(save, FLAG_DWARVES_RECRUITED)) {
    steps.push('· FAR NORTH: DWARVEZ — RECRUIT THEIR GREATEST WARRIORS.');
  } else {
    steps.push('· DWARVEZ: RECRUITED. GOOD.');
  }
  if (!flag(save, FLAG_ROARHIMZ_RECRUITED)) {
    steps.push('· FAR NORTH-WEST: ROARHIMZ — HORSE FOLK. BEST FIGHTERS.');
  } else {
    steps.push('· ROARHIMZ: RECRUITED. GOOD.');
  }
  if (
    flag(save, FLAG_DWARVES_RECRUITED) &&
    flag(save, FLAG_ROARHIMZ_RECRUITED)
  ) {
    steps.push('· RETURN TO THE QUEEN. SHE WILL SEND AN ELVEN WARRIOR.');
  } else {
    steps.push('· THEN BACK TO THE QUEEN FOR AN ELVEN WARRIOR.');
  }
  steps.push('· THEN: ZORON. BLACK SWORD. MOREDORKZ VOLCANO.');
  return steps;
}

export function queenFellowshipIdleDialog(save: SaveData): string[] {
  if (!flag(save, FLAG_FELLOWSHIP_STARTED)) {
    return [
      'QUEEN: THE WOODZ REMEMBER YOU. MOSTLY FONDLY.',
      'GO FORJE. OR NAP. BOTH VALID.',
    ];
  }
  if (flag(save, FLAG_ELF_WARRIOR_JOINED)) {
    return [
      'QUEEN: LIRAEL GOES WITH YOU. THE FELLOWSHIP IS FORMED.',
      'SOUTH PAST DEZERTZ. ASH ROAD. MOREDORKZ.',
      'END ZORON. BRING BACK THE LIGHT.',
    ];
  }
  if (canGrantElfWarrior(save)) {
    return [
      'QUEEN OF THE WOOD ELVES: YOU BROUGHT DWARVEZ AND ROARHIMZ.',
      'IMPRESSED. SLIGHTLY.',
      'TALK AGAIN — I SEND LIRAEL OF THE LEAF-GUARD.',
    ];
  }
  return [
    'QUEEN: GLAMDOLPH SPOKE TRUE.',
    'DARKNESS FROM MOREDORKZ. ZORON. BLACK SWORD.',
    'FAR NORTH: DWARVEZ. FAR NORTH-WEST: ROARHIMZ.',
    'RETURN WHEN BOTH STAND WITH YOU.',
    'THEN I SEND AN ELVEN WARRIOR. FELLOWSHIP OF THE FEW.',
  ];
}

// ── Zoron + black sword + volcano ──────────────────────────────────

export function applyZoronDefeat(save: SaveData): NpcTalkResult {
  if (flag(save, FLAG_ZORON_DEFEATED) && flag(save, FLAG_BLACK_SWORD)) {
    return {
      save,
      dialog: [
        'ZORON IS ALREADY FALLEN.',
        'TAKE THE BLACK SWORD WEST TO THE DOOM FORJE.',
      ],
    };
  }
  let next = setFlags(save, {
    [FLAG_ZORON_DEFEATED]: true,
    [FLAG_BLACK_SWORD]: true,
  });
  next = markLandCleared(next, 'moredorkz');
  const minted = mintItem(next, BLACK_SWORD_TEMPLATE, 'rare', 0);
  next = { ...minted.save, coins: minted.save.coins + 100 };
  return {
    save: next,
    dialog: [
      'ZORON: YOU BROUGHT A BUD? …FINE.',
      'THE DARK SORCEROR FALLS. THE BLACK SWORD IS YOURS.',
      'IT IS EVIL. HEAVY. TEMPORARY.',
      'WEST — DOOM FORJE. PRESENT THE BLADE. MAKE IT WHITE.',
      'YOU GOT: BLACK SWORD OF ZORON + 100c.',
    ],
    toast: 'ZORON DEFEATED · BLACK SWORD',
  };
}

export function holdsBlackSword(save: SaveData): boolean {
  if (!flag(save, FLAG_BLACK_SWORD)) {
    // also accept bag presence
  }
  return (
    flag(save, FLAG_BLACK_SWORD) ||
    save.bag.some((i) => i.templateId === BLACK_SWORD_TEMPLATE) ||
    Object.values(save.equipped).some((uid) => {
      if (!uid) return false;
      const inst = findInBag(save, uid);
      return inst?.templateId === BLACK_SWORD_TEMPLATE;
    })
  );
}

export function canForgeWhiteSword(save: SaveData): boolean {
  return (
    flag(save, FLAG_ZORON_DEFEATED) &&
    holdsBlackSword(save) &&
    !flag(save, FLAG_WHITE_SWORD)
  );
}

export function forgeWhiteSword(save: SaveData): NpcTalkResult {
  if (flag(save, FLAG_WHITE_SWORD)) {
    return {
      save,
      dialog: [
        'THE DOOM FORJE IS QUIET.',
        'THE WHITE SWORD OF MANY LIVEZ ALREADY SHINES.',
      ],
    };
  }
  if (!flag(save, FLAG_ZORON_DEFEATED)) {
    return {
      save,
      dialog: [
        'THE FORJE ACCEPTS ONLY THE BLACK BLADE.',
        'ZORON STILL STANDS. GO EAST TO THE THRONE.',
      ],
    };
  }
  if (!holdsBlackSword(save)) {
    return {
      save,
      dialog: [
        'THE FORJE ACCEPTS ONLY THE BLACK BLADE.',
        'YOU LACK ZORON\'S SWORD. CHECK YOUR BAG.',
      ],
    };
  }

  // Remove black sword from bag + equip
  let next: SaveData = { ...save, bag: [...save.bag], equipped: { ...save.equipped } };
  const removeUid = (uid: string | null | undefined) => {
    if (!uid) return;
    const inst = findInBag(next, uid);
    if (inst?.templateId === BLACK_SWORD_TEMPLATE) {
      next.bag = next.bag.filter((i) => i.uid !== uid);
      for (const slot of Object.keys(next.equipped) as (keyof typeof next.equipped)[]) {
        if (next.equipped[slot] === uid) next.equipped[slot] = null;
      }
    }
  };
  for (const inst of [...next.bag]) {
    if (inst.templateId === BLACK_SWORD_TEMPLATE) removeUid(inst.uid);
  }
  for (const slot of Object.keys(next.equipped) as (keyof typeof next.equipped)[]) {
    removeUid(next.equipped[slot]);
  }

  const minted = mintItem(next, WHITE_SWORD_TEMPLATE, 'legendary', 0);
  next = {
    ...minted.save,
    flags: {
      ...minted.save.flags,
      [FLAG_WHITE_SWORD]: true,
      [FLAG_BLACK_SWORD]: false,
    },
  };

  return {
    save: next,
    dialog: [
      'THE DOOM FORJE ROARS.',
      'BLACK STEEL WHITENS. EVIL BURNS OFF LIKE BAD GRAVY.',
      'YOU FORGE THE WHITE SWORD OF MANY LIVEZ.',
      'THE FELLOWSHIP OF THE FEW IS COMPLETE.',
      'GLAMDOLPH WILL BE… MOSTLY PROUD.',
    ],
    toast: 'WHITE SWORD OF MANY LIVEZ!',
  };
}

export function volcanoPadDialog(save: SaveData): string[] {
  if (flag(save, FLAG_WHITE_SWORD)) {
    return ['THE FORJE SLEEPS. THE WHITE SWORD IS DONE.'];
  }
  if (canForgeWhiteSword(save)) {
    return [
      'THE DOOM FORJE HUMS.',
      'PRESENT THE BLACK SWORD (E). BECOME THE WHITE SWORD OF MANY LIVEZ.',
    ];
  }
  return [
    'THE FORJE ACCEPTS ONLY THE BLACK BLADE.',
    'DEFEAT ZORON. BRING HIS SWORD. STEP ON THE PAD. E.',
  ];
}

/** Assist phantom count for Zoron fight (non-controllable flavor). */
export function zoronAssistCount(save: SaveData): number {
  return fellowshipPartyChips(save).length;
}
