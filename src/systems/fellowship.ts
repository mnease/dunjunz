/**
 * The Fellowship Of The Few — post–Wood Elf queen epic beat.
 * Triggered once after Legendary Elven Box is granted.
 * Pure helpers; GameScene owns earthquake / light / wizard spawn.
 */

import type { SaveData } from '../types';

export const GLAMDOLPH_ID = 'glamdolph';
export const GLAMDOLPH_ROOM = 'elfwood_court';

/** Spawn tile in queen's court (south of queen, on dirt aisle). */
export const GLAMDOLPH_TILE = { x: 8, y: 7 } as const;

export const FLAG_FELLOWSHIP_STARTED = 'fellowship_of_the_few';
export const FLAG_GLAMDOLPH_MET = 'glamdolph_met';
/** Future beat flags (stub for later lands). */
export const FLAG_DWARVES_RECRUITED = 'fellowship_dwarves';
export const FLAG_ROARHIMZ_RECRUITED = 'fellowship_roarhimz';
export const FLAG_ELF_WARRIOR_JOINED = 'fellowship_elf_warrior';
export const FLAG_ZORON_DEFEATED = 'zoron_defeated';
export const FLAG_WHITE_SWORD = 'sword_of_many_livez';

function flag(save: SaveData, key: string): boolean {
  return !!save.flags?.[key];
}

function setFlags(
  save: SaveData,
  patch: Record<string, boolean>,
): SaveData {
  return { ...save, flags: { ...save.flags, ...patch } };
}

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
  if (flag(save, FLAG_ZORON_DEFEATED)) {
    return [
      'GLAMDOLPH: THE SWORD OF MANY LIVEZ SHINES.',
      'YOU DID THE THING. MATHEMATICAL.',
      'TRY NOT TO LOSE IT IN A BUSH.',
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
  if (
    flag(save, FLAG_DWARVES_RECRUITED) &&
    flag(save, FLAG_ROARHIMZ_RECRUITED) &&
    !flag(save, FLAG_ELF_WARRIOR_JOINED)
  ) {
    return [
      'QUEEN OF THE WOOD ELVES: YOU BROUGHT DWARVEZ AND ROARHIMZ.',
      'IMPRESSED. SLIGHTLY.',
      'I WILL SEND ONE OF MY BEST ELVEN WARRIORZ…',
      'WHEN THE ROADS NORTH ARE OPEN. (SOON.)',
      'FOR NOW: REST. THE FELLOWSHIP FORMS.',
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
