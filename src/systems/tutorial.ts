/**
 * Training Guild — pure helpers.
 * Weapon drill sequence in guild_hall; east door + dungeon stairs unlock on graduate.
 * Each weapon stage requires dealing a % of dummy drill HP (not a single tap).
 */

import type { SaveData } from '../types';
import { displayItemName, getTemplate, mintItem } from './items';
import { grantCrawlerStarterBox } from './loot-boxes';
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

/**
 * Real in-game weapon templates displayed on each guild rack.
 * Looks map to distinct silhouettes (sword / iron / saber / cleaver / …).
 */
export const RACK_CATALOG: Record<TutorialWeapon, readonly string[]> = {
  sword: ['mild_sword', 'iron_blade', 'sand_saber', 'dunjun_cleaver'],
  axe: ['training_axe', 'battle_axe', 'iron_hatchet', 'great_axe'],
  bow: ['short_bow', 'long_bow', 'hunter_crossbow', 'magic_bow'],
  staff: ['wizard_staff', 'staff_lightning', 'staff_fire', 'staff_ice'],
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
  if (
    tid.includes('axe') ||
    tid.includes('hatchet') ||
    lk === 'axe' ||
    lk === 'battle_axe' ||
    lk === 'iron_axe' ||
    lk === 'greataxe'
  )
    return 'axe';
  if (
    tid.includes('bow') ||
    tid.includes('crossbow') ||
    lk === 'bow' ||
    lk === 'longbow' ||
    lk === 'crossbow' ||
    lk === 'magic_bow'
  )
    return 'bow';
  if (
    tid.includes('staff') ||
    lk === 'staff' ||
    lk === 'staff_lightning' ||
    lk === 'staff_fire' ||
    lk === 'staff_ice'
  )
    return 'staff';
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
  // Bronze Crawler Starter Box — leather kit + mild sword + wood shield
  let next: SaveData = { ...save, flags, stacks };
  next = grantCrawlerStarterBox(next).save;
  return next;
}

export function skipTutorial(save: SaveData): SaveData {
  return completeTutorial(save);
}

/** Currently equipped weapon template id, or null. */
export function equippedWeaponTemplateId(save: SaveData): string | null {
  const uid = save.equipped?.weapon;
  if (!uid) return null;
  const inst = save.bag.find((b) => b.uid === uid);
  return inst?.templateId ?? null;
}

/**
 * Catalog templates still hanging on the rack (not the equipped piece).
 * Equipping one weapon removes only that silhouette; siblings stay.
 */
export function rackPresentTemplates(
  save: SaveData,
  family: TutorialWeapon,
): string[] {
  const eq = equippedWeaponTemplateId(save);
  return RACK_CATALOG[family].filter((tid) => tid !== eq);
}

/** True when no catalog weapons remain on the pegs (usually sole item equipped). */
export function isRackEmpty(save: SaveData, family: TutorialWeapon): boolean {
  return rackPresentTemplates(save, family).length === 0;
}

export function isRackStocked(save: SaveData, family: TutorialWeapon): boolean {
  return !isRackEmpty(save, family);
}

/**
 * Legacy helper — true when the default training piece is currently equipped.
 */
export function isTrainingWeaponTaken(
  save: SaveData,
  weapon: TutorialWeapon,
): boolean {
  return equippedWeaponTemplateId(save) === TRAINING_TEMPLATES[weapon];
}

/** Mint every catalog template for this family into the bag (no equip). */
export function ensureCatalogInBag(
  save: SaveData,
  family: TutorialWeapon,
): SaveData {
  let next = save;
  for (const tid of RACK_CATALOG[family]) {
    if (next.bag.some((b) => b.templateId === tid)) continue;
    next = mintItem(next, tid, 'common', 0).save;
  }
  return next;
}

/** Ensure the default training template exists in the bag (no equip). */
export function ensureTrainingWeaponInBag(
  save: SaveData,
  weapon: TutorialWeapon,
): SaveData {
  return ensureCatalogInBag(save, weapon);
}

/**
 * Weapons currently hanging (pickable) — catalog pieces not equipped.
 * Always mints catalog into bag first so each has a uid.
 */
export function listRackWeaponOptions(
  save: SaveData,
  family: TutorialWeapon,
): { uid: string; templateId: string; name: string }[] {
  const next = ensureCatalogInBag(save, family);
  const present = new Set(rackPresentTemplates(next, family));
  const out: { uid: string; templateId: string; name: string }[] = [];
  for (const tid of RACK_CATALOG[family]) {
    if (!present.has(tid)) continue;
    const inst = next.bag.find((b) => b.templateId === tid);
    if (!inst) continue;
    out.push({
      uid: inst.uid,
      templateId: tid,
      name: displayItemName(inst),
    });
  }
  return out;
}

function withBowAmmo(save: SaveData, family: TutorialWeapon): SaveData {
  if (family !== 'bow') return save;
  const arrows = Math.max(save.stacks?.arrows ?? 0, 30);
  return { ...save, stacks: { ...save.stacks, arrows } };
}

/**
 * Equip a hanging rack weapon. Only that piece leaves the stand.
 */
export function takeWeaponFromRack(
  save: SaveData,
  family: TutorialWeapon,
  uid?: string,
): { save: SaveData; ok: boolean; reason?: string; name?: string } {
  let next = ensureCatalogInBag(save, family);
  const opts = listRackWeaponOptions(next, family);
  if (opts.length === 0) {
    return { save, ok: false, reason: 'RACK IS BARE — RETURN YOUR WEAPON' };
  }
  const pick =
    (uid ? opts.find((o) => o.uid === uid) : null) ?? opts[0]!;
  next = {
    ...next,
    equipped: { ...next.equipped, weapon: pick.uid },
  };
  next = withBowAmmo(next, family);
  next = syncDerivedStats(next);
  return { save: next, ok: true, name: pick.name };
}

/** Grant/equip default training weapon for drills. */
export function equipTrainingWeapon(
  save: SaveData,
  weapon: TutorialWeapon,
): SaveData {
  let next = ensureCatalogInBag(save, weapon);
  const tid = TRAINING_TEMPLATES[weapon];
  const inst = next.bag.find((b) => b.templateId === tid);
  if (!inst) return next;
  next = {
    ...next,
    equipped: { ...next.equipped, weapon: inst.uid },
  };
  next = withBowAmmo(next, weapon);
  return syncDerivedStats(next);
}

/**
 * Unequip the family weapon so it reappears on the rack.
 */
export function returnWeaponToRack(
  save: SaveData,
  family: TutorialWeapon,
): { save: SaveData; ok: boolean; reason?: string; unequipped: boolean } {
  const eqUid = save.equipped?.weapon;
  if (!eqUid) {
    return {
      save,
      ok: false,
      reason: 'NOTHING EQUIPPED TO RETURN',
      unequipped: false,
    };
  }
  const inst = save.bag.find((b) => b.uid === eqUid);
  if (!inst) {
    return { save, ok: false, reason: 'NOTHING TO RETURN', unequipped: false };
  }
  const t = getTemplate(inst.templateId);
  const fam = tutorialWeaponFromEquip(inst.templateId, t.look);
  if (fam !== family) {
    return {
      save,
      ok: false,
      reason: `HOLDING ${fam?.toUpperCase() ?? 'OTHER'} — USE THAT RACK`,
      unequipped: false,
    };
  }
  // Prefer returning catalog pieces; still allow unequip of any family weapon
  const next = syncDerivedStats({
    ...save,
    equipped: { ...save.equipped, weapon: null },
  });
  return { save: next, ok: true, unequipped: true };
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
 * Stable texture key for a multi-weapon rack state.
 * Present template ids sorted → unique canvas texture.
 */
export function rackTextureKey(
  family: TutorialWeapon,
  presentOrEmpty: boolean | string[],
): string {
  // Legacy bool API: empty stand vs full default catalog art
  if (typeof presentOrEmpty === 'boolean') {
    if (presentOrEmpty) return 'rack_empty';
    return `rack_${family}_full`;
  }
  const present = presentOrEmpty;
  if (present.length === 0) return 'rack_empty';
  const sig = [...present].sort().join('+');
  return `rack_${family}__${sig}`;
}

/** Stable key from save for this family's current hanging set. */
export function rackTextureKeyForSave(
  save: SaveData,
  family: TutorialWeapon,
): string {
  return rackTextureKey(family, rackPresentTemplates(save, family));
}

export function stairsBlockedToast(): string {
  return 'STAIRS LOCKED — FINISH GUILD TRAINING';
}

export function eastDoorBlockedToast(): string {
  return 'EAST DOOR LOCKED — FINISH WEAPON DRILLS';
}

/** Voice already sent them north; GM gives the real briefing. */
export function guildEntranceToast(): string {
  return 'SPEAK WITH THE TUTORIAL GUILD MASTER';
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
    'YOUR QUEST: RESCUE PRINCESS PRIZELLA.',
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
    'EACH RACK HOLDS SEVERAL REAL WEAPONS.',
    'E = BROWSE · 1-9 = EQUIP ONE (IT LEAVES THE PEG).',
    'EQUIP ANOTHER OR RETURN (E ON EMPTY) TO PUT IT BACK.',
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
      'GO RESCUE PRINCESS PRIZELLA. MATHEMATICAL!',
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
    staff: 'EMERALD STAFF',
  };
  const goal = `DEAL ${DUMMY_DRILL_REQUIRED_PCT}% DUMMY HP (${drillDamageRequired()} DMG).`;
  const label = opts?.name ?? names[weapon];
  if (opts?.mode === 'return') {
    return [
      `${weapon.toUpperCase()} RACK — WEAPON RETURNED.`,
      'IT HANGS WITH THE OTHERS AGAIN.',
      'PRESS E TO BROWSE THIS RACK\'S WEAPONS.',
    ];
  }
  if (opts?.mode === 'browse') {
    return [
      `${weapon.toUpperCase()} RACK — SEVERAL REAL WEAPONS.`,
      'OPEN THE RACK WINDOW TO PICK ONE.',
      'THAT PIECE LEAVES THE RACK; THE REST STAY.',
    ];
  }
  return [
    `YOU TAKE THE ${label}.`,
    'IT LEAVES ITS PEG. THE OTHER WEAPONS STAY.',
    'RETURN IT (EMPTY STAND + E) OR PICK ANOTHER.',
    goal,
  ];
}

/** Payload for the inventory-style rack weapon picker panel. */
export type RackPickerPayload = {
  family: TutorialWeapon;
  rackId: string;
  options: {
    uid: string;
    templateId: string;
    name: string;
    blurb: string;
  }[];
  selectedIndex: number;
};

/** Build picker payload for hanging catalog weapons. */
export function buildRackPickerPayload(
  save: SaveData,
  family: TutorialWeapon,
  rackId: string,
  selectedIndex = 0,
): RackPickerPayload {
  const opts = listRackWeaponOptions(save, family);
  return {
    family,
    rackId,
    options: opts.map((o) => ({
      uid: o.uid,
      templateId: o.templateId,
      name: o.name,
      blurb: getTemplate(o.templateId).blurb,
    })),
    selectedIndex: Math.max(
      0,
      Math.min(selectedIndex, Math.max(0, opts.length - 1)),
    ),
  };
}

/** @deprecated Prefer the rack picker panel. Kept for tests / fallback copy. */
export function rackInventoryDialog(
  weapon: TutorialWeapon,
  options: { name: string }[],
): string[] {
  const lines = [
    `${weapon.toUpperCase()} RACK — SELECT`,
    `(${options.length} HANGING)`,
    '',
    'OPEN THE WEAPON RACK WINDOW TO CHOOSE.',
    'CLICK A WEAPON OR USE ARROWS + ENTER.',
    'E ON EMPTY PEG = RETURN EQUIPPED.',
  ];
  return lines;
}

/**
 * Veterans who already crawled skip the guild.
 */
export function migrateTutorial(save: SaveData): SaveData {
  let next = save;
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
