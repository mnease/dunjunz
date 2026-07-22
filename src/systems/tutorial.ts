/**
 * Training Guild — pure helpers.
 * Weapon drill sequence in guild_hall; east door + dungeon stairs unlock on graduate.
 * Each weapon stage requires dealing a % of dummy drill HP (not a single tap).
 */

import type { SaveData } from '../types';
import { displayItemName, getTemplate, mintItem } from './items';
import { syncDerivedStats } from './inventory';

export const FLAG_TUTORIAL_COMPLETE = 'tutorial_complete';
export const FLAG_TUTORIAL_INTRO = 'tutorial_intro_seen';

/** Ordered weapon drills (damage threshold with each, in order). */
export const TUTORIAL_WEAPONS = [
  'sword',
  'axe',
  'bow',
  'staff',
] as const;

export type TutorialWeapon = (typeof TUTORIAL_WEAPONS)[number];

export const GUILD_MASTER_ID = 'guild-master';
export const GUILD_HALL_ID = 'guild_hall';

/**
 * Virtual dummy HP for each weapon stage.
 * Starter melee (~2 dmg) needs several swings; bow/staff fewer.
 */
export const DUMMY_DRILL_HP = 20;

/** Fraction of dummy HP that must be dealt with that weapon (100 = full clear). */
export const DUMMY_DRILL_REQUIRED_PCT = 100;

const FLAG_HIT: Record<TutorialWeapon, string> = {
  sword: 'tutorial_hit_sword',
  axe: 'tutorial_hit_axe',
  bow: 'tutorial_hit_bow',
  staff: 'tutorial_hit_staff',
};

const STACK_DMG: Record<TutorialWeapon, string> = {
  sword: 'tutorial_dmg_sword',
  axe: 'tutorial_dmg_axe',
  bow: 'tutorial_dmg_bow',
  staff: 'tutorial_dmg_staff',
};

export const TRAINING_TEMPLATES: Record<TutorialWeapon, string> = {
  sword: 'mild_sword',
  axe: 'training_axe',
  bow: 'short_bow',
  staff: 'wizard_staff',
};

/** Damage that must be dealt with a weapon to clear its drill stage. */
export function drillDamageRequired(): number {
  return Math.max(
    1,
    Math.ceil((DUMMY_DRILL_HP * DUMMY_DRILL_REQUIRED_PCT) / 100),
  );
}

export function isTutorialComplete(save: SaveData): boolean {
  return !!save.flags?.[FLAG_TUTORIAL_COMPLETE];
}

export function weaponHitDone(save: SaveData, w: TutorialWeapon): boolean {
  return !!save.flags?.[FLAG_HIT[w]];
}

/** Cumulative damage already applied toward this weapon's stage. */
export function weaponDamageDealt(
  save: SaveData,
  w: TutorialWeapon,
): number {
  return Math.max(0, Math.floor(save.stacks?.[STACK_DMG[w]] ?? 0));
}

/** 0–100 progress for a weapon stage (or 100 if flagged done). */
export function weaponProgressPct(
  save: SaveData,
  w: TutorialWeapon,
): number {
  if (weaponHitDone(save, w)) return 100;
  const req = drillDamageRequired();
  return Math.min(
    100,
    Math.floor((weaponDamageDealt(save, w) / req) * 100),
  );
}

export function nextTutorialWeapon(save: SaveData): TutorialWeapon | null {
  if (isTutorialComplete(save)) return null;
  for (const w of TUTORIAL_WEAPONS) {
    if (!weaponHitDone(save, w)) return w;
  }
  return null; // all stages done — ready to graduate via GM talk
}

export function allWeaponHitsDone(save: SaveData): boolean {
  return TUTORIAL_WEAPONS.every((w) => weaponHitDone(save, w));
}

export function canExitGuildEast(save: SaveData): boolean {
  return isTutorialComplete(save);
}

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

export function needsTutorialIntro(save: SaveData): boolean {
  return !isTutorialComplete(save) && !save.flags?.[FLAG_TUTORIAL_INTRO];
}

/**
 * Map equipped template / look → tutorial weapon family.
 */
export function tutorialWeaponFromEquip(
  templateId: string | undefined,
  look: string | undefined,
): TutorialWeapon | null {
  const tid = (templateId ?? '').toLowerCase();
  const lk = (look ?? '').toLowerCase();
  if (tid.includes('axe') || lk === 'axe') return 'axe';
  if (tid.includes('bow') || tid.includes('crossbow') || lk === 'bow' || lk === 'crossbow')
    return 'bow';
  if (tid.includes('staff') || lk === 'staff') return 'staff';
  if (
    tid.includes('sword') ||
    tid.includes('blade') ||
    tid.includes('saber') ||
    tid.includes('cleaver') ||
    tid.includes('honk') ||
    lk === 'sword' ||
    lk === 'iron' ||
    lk === 'saber' ||
    lk === 'cleaver' ||
    lk === 'honk'
  )
    return 'sword';
  return null;
}

export type DummyDamageResult = {
  save: SaveData;
  accepted: boolean;
  advanced: boolean;
  next: TutorialWeapon | null;
  /** Damage applied this swing (0 if rejected). */
  dealt: number;
  /** Cumulative damage toward the current weapon stage. */
  total: number;
  /** Damage required to clear the stage. */
  required: number;
  /** 0–100 after this hit. */
  pct: number;
};

/**
 * Apply damage to the current weapon drill if the equipped family matches.
 * Stage completes when cumulative damage ≥ required % of dummy HP.
 */
export function recordDummyDamage(
  save: SaveData,
  weapon: TutorialWeapon | null,
  damage: number,
): DummyDamageResult {
  const required = drillDamageRequired();
  const empty = (
    partial: Partial<DummyDamageResult> &
      Pick<DummyDamageResult, 'accepted' | 'advanced' | 'next'>,
  ): DummyDamageResult => ({
    save,
    dealt: 0,
    total: weapon ? weaponDamageDealt(save, weapon) : 0,
    required,
    pct: weapon ? weaponProgressPct(save, weapon) : 0,
    ...partial,
  });

  if (isTutorialComplete(save) || !weapon) {
    return empty({
      accepted: false,
      advanced: false,
      next: nextTutorialWeapon(save),
    });
  }
  const need = nextTutorialWeapon(save);
  if (!need) {
    return empty({ accepted: false, advanced: false, next: null });
  }
  if (weapon !== need) {
    return empty({
      accepted: false,
      advanced: false,
      next: need,
      total: weaponDamageDealt(save, need),
      pct: weaponProgressPct(save, need),
    });
  }
  if (weaponHitDone(save, weapon)) {
    return empty({
      accepted: true,
      advanced: false,
      next: nextTutorialWeapon(save),
      total: required,
      pct: 100,
    });
  }

  const dealt = Math.max(0, Math.floor(damage));
  const prev = weaponDamageDealt(save, weapon);
  const total = Math.min(required, prev + dealt);
  const stacks = { ...save.stacks, [STACK_DMG[weapon]]: total };
  let nextSave: SaveData = { ...save, stacks };
  const advanced = total >= required;
  if (advanced) {
    nextSave = {
      ...nextSave,
      flags: { ...nextSave.flags, [FLAG_HIT[weapon]]: true },
    };
  }
  const pct = Math.min(100, Math.floor((total / required) * 100));
  return {
    save: nextSave,
    accepted: true,
    advanced,
    next: nextTutorialWeapon(nextSave),
    dealt,
    total,
    required,
    pct,
  };
}

/**
 * Legacy helper: one “hit” that applies full stage damage (tests / skip).
 */
export function recordDummyHit(
  save: SaveData,
  weapon: TutorialWeapon | null,
): DummyDamageResult {
  return recordDummyDamage(save, weapon, drillDamageRequired());
}

export function completeTutorial(save: SaveData): SaveData {
  if (isTutorialComplete(save)) return save;
  const flags: Record<string, boolean> = {
    ...save.flags,
    [FLAG_TUTORIAL_COMPLETE]: true,
    [FLAG_TUTORIAL_INTRO]: true,
  };
  const stacks = { ...save.stacks };
  const req = drillDamageRequired();
  for (const w of TUTORIAL_WEAPONS) {
    flags[FLAG_HIT[w]] = true;
    stacks[STACK_DMG[w]] = req;
  }
  return { ...save, flags, stacks };
}

export function skipTutorial(save: SaveData): SaveData {
  return completeTutorial(save);
}

/** Flag: this family's training rack currently has its weapon checked out. */
export function rackOutFlag(weapon: TutorialWeapon): string {
  return `tutorial_rack_out_${weapon}`;
}

/** True when the stand is empty (weapon is out with the hero). */
export function isRackEmpty(save: SaveData, weapon: TutorialWeapon): boolean {
  return !!save.flags?.[rackOutFlag(weapon)];
}

export function isRackStocked(save: SaveData, weapon: TutorialWeapon): boolean {
  return !isRackEmpty(save, weapon);
}

export function setRackEmpty(
  save: SaveData,
  weapon: TutorialWeapon,
  empty: boolean,
): SaveData {
  return {
    ...save,
    flags: { ...save.flags, [rackOutFlag(weapon)]: empty },
  };
}

/**
 * Legacy: bag-owned training template meant "taken".
 * Prefer isRackEmpty for visuals / return flow.
 */
export function isTrainingWeaponTaken(
  save: SaveData,
  weapon: TutorialWeapon,
): boolean {
  if (save.flags?.[rackOutFlag(weapon)] != null) {
    return isRackEmpty(save, weapon);
  }
  const tid = TRAINING_TEMPLATES[weapon];
  return save.bag.some((b) => b.templateId === tid);
}

/** Ensure the default training template exists in the bag (no equip). */
export function ensureTrainingWeaponInBag(
  save: SaveData,
  weapon: TutorialWeapon,
): SaveData {
  const tid = TRAINING_TEMPLATES[weapon];
  if (save.bag.some((b) => b.templateId === tid)) return save;
  return mintItem(save, tid, 'common', 0).save;
}

/** Bag weapons that belong on this rack (sword/axe/bow/staff family). */
export function listRackWeaponOptions(
  save: SaveData,
  weapon: TutorialWeapon,
): { uid: string; templateId: string; name: string }[] {
  const next = ensureTrainingWeaponInBag(save, weapon);
  const out: { uid: string; templateId: string; name: string }[] = [];
  for (const inst of next.bag) {
    const t = getTemplate(inst.templateId);
    if (t.slot !== 'weapon') continue;
    const fam = tutorialWeaponFromEquip(inst.templateId, t.look);
    if (fam !== weapon) continue;
    out.push({
      uid: inst.uid,
      templateId: inst.templateId,
      name: displayItemName(inst),
    });
  }
  // Stable: training template first, then others by name
  const train = TRAINING_TEMPLATES[weapon];
  out.sort((a, b) => {
    if (a.templateId === train && b.templateId !== train) return -1;
    if (b.templateId === train && a.templateId !== train) return 1;
    return a.name.localeCompare(b.name);
  });
  return out;
}

function withBowAmmo(save: SaveData, weapon: TutorialWeapon): SaveData {
  if (weapon !== 'bow') return save;
  const arrows = Math.max(save.stacks?.arrows ?? 0, 30);
  return { ...save, stacks: { ...save.stacks, arrows } };
}

/**
 * Take a specific bag weapon off the rack (equip + empty stand).
 */
export function takeWeaponFromRack(
  save: SaveData,
  weapon: TutorialWeapon,
  uid?: string,
): { save: SaveData; ok: boolean; reason?: string; name?: string } {
  let next = ensureTrainingWeaponInBag(save, weapon);
  const opts = listRackWeaponOptions(next, weapon);
  if (opts.length === 0) {
    return { save, ok: false, reason: 'RACK IS BARE' };
  }
  const pick =
    (uid ? opts.find((o) => o.uid === uid) : null) ?? opts[0]!;
  next = {
    ...next,
    equipped: { ...next.equipped, weapon: pick.uid },
  };
  next = withBowAmmo(next, weapon);
  next = setRackEmpty(next, weapon, true);
  next = syncDerivedStats(next);
  return { save: next, ok: true, name: pick.name };
}

/** Grant/equip default training weapon and empty its rack. */
export function equipTrainingWeapon(
  save: SaveData,
  weapon: TutorialWeapon,
): SaveData {
  const r = takeWeaponFromRack(save, weapon);
  return r.save;
}

/**
 * Return this family's weapon to the rack: unequip if held, restock stand.
 * Works even if the hero swapped to another weapon (restocks the empty peg).
 */
export function returnWeaponToRack(
  save: SaveData,
  weapon: TutorialWeapon,
): { save: SaveData; ok: boolean; reason?: string; unequipped: boolean } {
  if (isRackStocked(save, weapon)) {
    return {
      save,
      ok: false,
      reason: 'RACK ALREADY STOCKED — E TO BROWSE',
      unequipped: false,
    };
  }
  // Must own at least one weapon of this family to "return"
  let next = ensureTrainingWeaponInBag(save, weapon);
  const opts = listRackWeaponOptions(next, weapon);
  if (opts.length === 0) {
    return {
      save,
      ok: false,
      reason: 'NOTHING TO RETURN',
      unequipped: false,
    };
  }
  let unequipped = false;
  const eqUid = next.equipped.weapon;
  if (eqUid) {
    const inst = next.bag.find((b) => b.uid === eqUid);
    if (inst) {
      const t = getTemplate(inst.templateId);
      const fam = tutorialWeaponFromEquip(inst.templateId, t.look);
      if (fam === weapon) {
        next = {
          ...next,
          equipped: { ...next.equipped, weapon: null },
        };
        unequipped = true;
      }
    }
  }
  next = setRackEmpty(next, weapon, false);
  next = syncDerivedStats(next);
  return { save: next, ok: true, unequipped };
}

/** Map rack actor id → tutorial weapon family. */
export function rackWeaponFromId(id: string | undefined): TutorialWeapon | null {
  switch (id) {
    case 'rack-sword':
      return 'sword';
    case 'rack-axe':
      return 'axe';
    case 'rack-bow':
      return 'bow';
    case 'rack-staff':
      return 'staff';
    default:
      return null;
  }
}

/**
 * Rack canvas texture: full weapon stand, or empty peg after pickup.
 * `empty` true → rack_empty.
 */
export function rackTextureKey(
  weapon: TutorialWeapon,
  empty: boolean,
): string {
  if (empty) return 'rack_empty';
  switch (weapon) {
    case 'sword':
      return 'rack_sword';
    case 'axe':
      return 'rack_axe';
    case 'bow':
      return 'rack_bow';
    case 'staff':
      return 'rack_staff';
  }
}

export function stairsBlockedToast(): string {
  return 'STAIRS LOCKED — FINISH GUILD TRAINING';
}

export function eastDoorBlockedToast(): string {
  return 'EAST DOOR LOCKED — FINISH WEAPON DRILLS';
}

/**
 * First-boot Guild Master monologue:
 * Welcome → game intro → guild identity → drill briefing.
 */
export function guildMasterIntroDialog(): string[] {
  return [
    'WELCOME TO DUNJUNZ…',
    '',
    'THIS IS A LAND OF MEADOWS, CAVES,',
    'AND THINGS THAT BITE BACK.',
    'YOU WILL WALK, SWING, LOOT, AND TALK.',
    'YOU WILL GET LOST. YOU WILL GET BETTER.',
    '',
    'YOUR QUEST: RESCUE PRIZELLA.',
    'SHE IS LOST SOMEWHERE OUT THERE —',
    'PAST THE MEADOW, DOWN THE DUNGEONS,',
    'THROUGH WOODZ AND DEZERTZ AND WORSE.',
    '',
    'THIS IS THE TRAINING GUILD.',
    'I AM THE TUTORIAL GUILD MASTER.',
    'THESE HALLS ARE OLD. THE TORCHES REMEMBER.',
    'BOOKS, LAMPS, SHADOWS — MY LIVING QUARTERS.',
    'BEFORE THE EAST DOOR OPENS,',
    'YOU TRAIN HERE, IN THE CENTER.',
    '',
    'DEAL DAMAGE TO DUMMIES WITH FOUR WEAPONS:',
    'SWORD → AXE → BOW → STAFF.',
    `EACH WEAPON: ${DUMMY_DRILL_REQUIRED_PCT}% OF DUMMY HP.`,
    'RACKS (E): TAKE, RETURN, THEN BROWSE.',
    'EMPTY STAND + E = PUT THE WEAPON BACK.',
    'STOCKED STAND + E = PICK 1-9 FROM THE RACK.',
    'DUMMIES (SPACE / Z) TAKE THE HITS.',
    'WHEN ALL FOUR ARE DONE, TALK TO ME.',
    'THEN: EAST DOOR → MEADOW. MATHEMATICAL!',
  ];
}

export function guildMasterDialog(save: SaveData): string[] {
  if (isTutorialComplete(save)) {
    return [
      'GUILD MASTER: YOU ARE GRADUATED.',
      'EAST = MEADOW. CAVE MOUTH = DUNJUNZ.',
      'TRAIL LEADS TO WOODZ AND DEZERTZ.',
      'MOVE: WASD. ATTACK: SPACE/Z. BAG: I. TALK: E.',
      'GO RESCUE PRIZELLA. MATHEMATICAL!',
    ];
  }

  if (allWeaponHitsDone(save)) {
    return [
      'GUILD MASTER: FOUR WEAPONS. FULL DAMAGE. CLEAN WORK.',
      'BY THE POWER OF THE TRAINING GUILD…',
      'EAST DOOR — OPEN.',
      'THE MEADOW AND THE CAVE AWAIT.',
    ];
  }

  const need = nextTutorialWeapon(save);
  const lines: string[] = [
    'GUILD MASTER: BACK TO DRILLS.',
    `DEAL ${DUMMY_DRILL_REQUIRED_PCT}% DUMMY HP WITH EACH WEAPON.`,
    '',
  ];
  for (const w of TUTORIAL_WEAPONS) {
    const done = weaponHitDone(save, w);
    const pct = weaponProgressPct(save, w);
    const mark = done
      ? 'DONE'
      : w === need
        ? `← ${pct}%`
        : pct > 0
          ? `${pct}%`
          : '…';
    lines.push(`${w.toUpperCase()}: ${mark}`);
  }
  lines.push('');
  if (need) {
    lines.push(`NEXT: EQUIP ${need.toUpperCase()} FROM ITS RACK (E).`);
    lines.push(
      `THEN DAMAGE A DUMMY TO ${DUMMY_DRILL_REQUIRED_PCT}% (${drillDamageRequired()} HP).`,
    );
  }
  return lines;
}

export function dummyHitToast(
  result: Pick<
    DummyDamageResult,
    'accepted' | 'advanced' | 'next' | 'pct' | 'total' | 'required'
  >,
  weapon: TutorialWeapon | null,
): string {
  if (!result.accepted && result.next) {
    return `WRONG WEAPON — NEED ${result.next.toUpperCase()} (RACK + E)`;
  }
  if (!result.accepted) {
    return 'DUMMY THUDS. TRY AGAIN.';
  }
  if (result.advanced && weapon) {
    if (!result.next) {
      return `${weapon.toUpperCase()} 100%! TALK TO GUILD MASTER`;
    }
    return `${weapon.toUpperCase()} 100%! NEXT: ${result.next.toUpperCase()}`;
  }
  if (weapon) {
    return `${weapon.toUpperCase()} ${result.pct}% (${result.total}/${result.required})`;
  }
  return 'DUMMY THUDS. TRY AGAIN.';
}

export function rackDialog(
  weapon: TutorialWeapon,
  opts?: { mode?: 'take' | 'return' | 'browse'; name?: string },
): string[] {
  const names: Record<TutorialWeapon, string> = {
    sword: 'SWORD OF MILD ENTHUSIASM',
    axe: 'TRAINING AXE',
    bow: 'SHORT BOW (+ ARROWS)',
    staff: 'WIZARD STAFF',
  };
  const goal = `DEAL ${DUMMY_DRILL_REQUIRED_PCT}% DUMMY HP (${drillDamageRequired()} DMG).`;
  const label = opts?.name ?? names[weapon];
  if (opts?.mode === 'return') {
    return [
      `${weapon.toUpperCase()} RACK — WEAPON RETURNED.`,
      'THE STAND IS STOCKED AGAIN.',
      'PRESS E TO BROWSE THIS RACK\'S WEAPONS.',
    ];
  }
  if (opts?.mode === 'browse') {
    return [
      `${weapon.toUpperCase()} RACK — CHOOSE A WEAPON.`,
      'PRESS 1-9 TO EQUIP FROM THE LIST.',
      'E ON EMPTY STAND RETURNS YOUR WEAPON.',
    ];
  }
  return [
    `YOU TAKE THE ${label}.`,
    'IT LEAVES THE RACK AND RIDES YOUR HIP.',
    'E AGAIN AT THIS RACK TO RETURN IT.',
    goal,
  ];
}

/** Dialog lines listing rack inventory (1-based). */
export function rackInventoryDialog(
  weapon: TutorialWeapon,
  options: { name: string }[],
): string[] {
  const lines = [
    `${weapon.toUpperCase()} RACK — SELECT`,
    '',
  ];
  const max = Math.min(9, options.length);
  for (let i = 0; i < max; i++) {
    lines.push(`${i + 1}. ${options[i]!.name}`);
  }
  if (options.length > 9) {
    lines.push(`… +${options.length - 9} MORE IN BAG`);
  }
  lines.push('');
  lines.push('PRESS 1-9 TO EQUIP.');
  lines.push('ESC CANCELS. E ON EMPTY = RETURN.');
  return lines;
}

/**
 * Seed rack_out flags for mid-run saves that already minted training gear
 * before the return/browse system existed.
 */
export function migrateRackStockFlags(save: SaveData): SaveData {
  let flags = save.flags;
  let changed = false;
  for (const w of TUTORIAL_WEAPONS) {
    const key = rackOutFlag(w);
    if (flags?.[key] != null) continue;
    const tid = TRAINING_TEMPLATES[w];
    const owned = save.bag.some((b) => b.templateId === tid);
    if (!owned) continue;
    // Owned training piece → treat as checked out until returned
    flags = { ...flags, [key]: true };
    changed = true;
  }
  return changed ? { ...save, flags: flags! } : save;
}

/**
 * Veterans who already crawled skip the guild.
 */
export function migrateTutorial(save: SaveData): SaveData {
  let next = migrateRackStockFlags(save);
  if (isTutorialComplete(next)) return next;
  const visited = next.visitedRooms ?? [];
  const leftGuild = visited.some(
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
      id.includes('dezertz_b') ||
      id === 'overworld' ||
      id === 'overworld_east',
  );
  // Only auto-complete if they left the guild path entirely (dungeon or old meadow progress)
  const dungeon =
    visited.some(
      (id) =>
        id.startsWith('b1_') ||
        id.startsWith('b2_') ||
        id.startsWith('b3_') ||
        id.startsWith('b4_') ||
        id.startsWith('b5_') ||
        id.startsWith('b6_') ||
        id.startsWith('b7_') ||
        id.startsWith('b8_') ||
        id.includes('_b1_') ||
        id.includes('_b2_') ||
        id.includes('sewerz'),
    ) ||
    (next.level ?? 1) > 1 ||
    (next.xp ?? 0) > 0 ||
    (next.landsCleared?.length ?? 0) > 0 ||
    !!next.bossDefeated ||
    !!next.princessSaved;
  void leftGuild;
  if (!dungeon) return next;
  return completeTutorial(next);
}
