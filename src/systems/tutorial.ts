/**
 * Training Guild — pure helpers.
 * Weapon drill sequence in guild_hall; east door + dungeon stairs unlock on graduate.
 * Each weapon stage requires dealing a % of dummy drill HP (not a single tap).
 */

import type { SaveData } from '../types';
import {
  ALL_EQUIP_SLOTS,
  displayItemName,
  emptyEquipped,
  getTemplate,
  mintItem,
} from './items';
import {
  grantCrawlerStarterBox,
  GUILD_PRACTICE_BOX_ID,
  openLootBox,
  type OpenLootBoxResult,
} from './loot-boxes';
import { syncDerivedStats } from './inventory';
import {
  boxOpenBlockedToast,
  canOpenLootBoxInRoom,
  isSafeRoom,
  isSafeRoomDef,
} from './safe-zones';

// Re-export safe-zone helpers so existing tutorial imports keep working
export {
  boxOpenBlockedToast,
  canOpenLootBoxInRoom,
  isSafeRoom,
  isSafeRoomDef,
};

export const FLAG_TUTORIAL_COMPLETE = 'tutorial_complete';
export const FLAG_TUTORIAL_INTRO = 'tutorial_intro_seen';
export const FLAG_TUTORIAL_INVENTORY = 'tutorial_inventory_opened';
export const FLAG_TUTORIAL_BOX = 'tutorial_box_opened';
export const FLAG_TUTORIAL_SAFE_ZONE = 'tutorial_safe_zone_learned';

/** Ordered curriculum phases after intro. */
export type TutorialPhase =
  | 'weapons'
  | 'inventory'
  | 'boxes'
  | 'safe_zone'
  | 'graduate';

export type ChecklistStep = {
  id: string;
  label: string;
  done: boolean;
};

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

/** Flat set of template ids that are guild rack loaners (never leave the hall). */
export function guildLoanerTemplateIds(): Set<string> {
  const s = new Set<string>();
  for (const fam of TUTORIAL_WEAPONS) {
    for (const tid of RACK_CATALOG[fam]) s.add(tid);
  }
  return s;
}

export function isGuildLoanerTemplate(templateId: string): boolean {
  return guildLoanerTemplateIds().has(templateId);
}

/**
 * True if this bag instance is a guild rack loaner.
 * - guildLoaner: true → always loaner
 * - guildLoaner: false → permanent (loot box / drops)
 * - untagged + rack catalog template → legacy loaner
 */
export function isGuildLoanerInstance(
  inst: { templateId: string; guildLoaner?: boolean },
): boolean {
  if (inst.guildLoaner === true) return true;
  if (inst.guildLoaner === false) return false;
  return isGuildLoanerTemplate(inst.templateId);
}

/**
 * Remove rack loaner weapons from bag/equip.
 * Training gear is hall-only — crawlers leave with loot-box gear only.
 * Also strips temporary rack bow ammo so free arrows don't walk out.
 */
export function stripGuildLoanerWeapons(save: SaveData): SaveData {
  const removedUids = new Set(
    save.bag.filter((i) => isGuildLoanerInstance(i)).map((i) => i.uid),
  );
  const hadArrows = (save.stacks?.arrows ?? 0) > 0;
  if (removedUids.size === 0 && !hadArrows) {
    return save;
  }

  const bag = save.bag.filter((i) => !isGuildLoanerInstance(i));
  const equipped = { ...emptyEquipped(), ...save.equipped };
  for (const slot of ALL_EQUIP_SLOTS) {
    const uid = equipped[slot];
    if (uid && removedUids.has(uid)) equipped[slot] = null;
  }
  const budEquipped = {
    ...emptyEquipped(),
    ...(save.budEquipped ?? emptyEquipped()),
  };
  for (const slot of ALL_EQUIP_SLOTS) {
    const uid = budEquipped[slot];
    if (uid && removedUids.has(uid)) budEquipped[slot] = null;
  }

  // Temporary practice ammo for rack bows — does not leave the hall
  const stacks = { ...save.stacks };
  if (removedUids.size > 0 || hadArrows) {
    delete stacks.arrows;
  }

  return syncDerivedStats({
    ...save,
    bag,
    equipped,
    budEquipped,
    stacks,
  });
}

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

/**
 * Current tutorial phase, or null when finished / graduated.
 */
export function tutorialPhase(save: SaveData): TutorialPhase | null {
  if (isTutorialComplete(save)) return null;
  if (!allWeaponHitsDone(save)) return 'weapons';
  if (!save.flags?.[FLAG_TUTORIAL_INVENTORY]) return 'inventory';
  if (!save.flags?.[FLAG_TUTORIAL_BOX]) return 'boxes';
  if (!save.flags?.[FLAG_TUTORIAL_SAFE_ZONE]) return 'safe_zone';
  return 'graduate';
}

/** Ready for graduation talk (all curriculum flags + weapon drills). */
export function canGraduateTutorial(save: SaveData): boolean {
  return tutorialPhase(save) === 'graduate';
}

export function markTutorialInventoryOpened(save: SaveData): SaveData {
  if (save.flags?.[FLAG_TUTORIAL_INVENTORY]) return save;
  if (isTutorialComplete(save)) return save;
  // Only count once weapons phase is done (or anytime for veterans mid-path)
  return {
    ...save,
    flags: { ...save.flags, [FLAG_TUTORIAL_INVENTORY]: true },
  };
}

export function markTutorialBoxOpened(save: SaveData): SaveData {
  if (save.flags?.[FLAG_TUTORIAL_BOX]) return save;
  return {
    ...save,
    flags: { ...save.flags, [FLAG_TUTORIAL_BOX]: true },
  };
}

export function markTutorialSafeZoneLearned(save: SaveData): SaveData {
  if (save.flags?.[FLAG_TUTORIAL_SAFE_ZONE]) return save;
  return {
    ...save,
    flags: { ...save.flags, [FLAG_TUTORIAL_SAFE_ZONE]: true },
  };
}

/**
 * Ensure a guild practice box stack exists for the hall crate.
 * Uses guild_practice_box (not achievement loot_box_*), so migration cannot strip it.
 * Granted as soon as the player is in the boxes phase (or later, if not yet opened).
 */
export function ensureTutorialPracticeBox(save: SaveData): SaveData {
  if (isTutorialComplete(save)) return save;
  if (save.flags?.[FLAG_TUTORIAL_BOX]) return save;
  // Only materialize once weapons + inventory are done (boxes phase)
  const phase = tutorialPhase(save);
  if (phase !== 'boxes' && phase !== 'safe_zone' && phase !== 'graduate') {
    return save;
  }
  const have = save.stacks?.[GUILD_PRACTICE_BOX_ID] ?? 0;
  if (have > 0) return save;
  return {
    ...save,
    stacks: {
      ...save.stacks,
      [GUILD_PRACTICE_BOX_ID]: 1,
    },
  };
}

export function isGuildPracticeBoxId(id: string | undefined): boolean {
  return id === GUILD_PRACTICE_BOX_ID;
}

/**
 * Pure open path for the guild practice crate.
 * - Does not destroy progress if the stack is missing: re-grants then opens.
 * - Refuses early phases without consuming the crate.
 * - Never uses achievement-tier loot_box_* templates.
 */
export function openGuildPracticeCrate(
  save: SaveData,
  roomId: string | undefined,
  roomSafe?: boolean,
): OpenLootBoxResult & { destroyCrate: boolean; early: boolean } {
  if (!canOpenLootBoxInRoom(roomId, roomSafe)) {
    return {
      ok: false,
      save,
      reason: boxOpenBlockedToast(),
      destroyCrate: false,
      early: false,
    };
  }
  if (save.flags?.[FLAG_TUTORIAL_BOX]) {
    return {
      ok: false,
      save,
      reason: 'ALREADY OPENED',
      destroyCrate: true,
      early: false,
    };
  }
  const phase = tutorialPhase(save);
  if (phase === 'weapons' || phase === 'inventory') {
    return {
      ok: false,
      save,
      reason: 'FINISH EARLIER LESSONS FIRST — THEN OPEN THIS CRATE',
      destroyCrate: false,
      early: true,
    };
  }
  // Boxes / safe_zone / graduate — ensure stack then open
  let next = ensureTutorialPracticeBox(save);
  if ((next.stacks?.[GUILD_PRACTICE_BOX_ID] ?? 0) <= 0) {
    next = {
      ...next,
      stacks: { ...next.stacks, [GUILD_PRACTICE_BOX_ID]: 1 },
    };
  }
  const r = openLootBox(next, GUILD_PRACTICE_BOX_ID);
  if (!r.ok) {
    return { ...r, destroyCrate: false, early: false };
  }
  return {
    ...r,
    save: markTutorialBoxOpened(r.save),
    destroyCrate: true,
    early: false,
  };
}

/**
 * Lower-left checklist for the active phase (null when no checklist).
 */
export function tutorialChecklist(save: SaveData): {
  phase: TutorialPhase;
  title: string;
  steps: ChecklistStep[];
} | null {
  const phase = tutorialPhase(save);
  if (!phase || phase === 'graduate') return null;

  if (phase === 'weapons') {
    const need = nextTutorialWeapon(save);
    return {
      phase,
      title: 'Weapons tutorial',
      steps: TUTORIAL_WEAPONS.map((w) => {
        const done = weaponHitDone(save, w);
        const pct = weaponProgressPct(save, w);
        let label = `${w.charAt(0).toUpperCase()}${w.slice(1)}: equip from rack, then damage a dummy to 100%`;
        if (!done && w === need && pct > 0) {
          label = `${w.charAt(0).toUpperCase()}${w.slice(1)}: ${pct}% dummy damage (keep hitting)`;
        }
        return { id: `weapon-${w}`, label, done };
      }),
    };
  }

  if (phase === 'inventory') {
    return {
      phase,
      title: 'Inventory tutorial',
      steps: [
        {
          id: 'open-inventory',
          label: 'Press I to open your inventory bag',
          done: !!save.flags?.[FLAG_TUTORIAL_INVENTORY],
        },
        {
          id: 'read-inventory',
          label: 'Look at your items (then close with I or Esc)',
          done: !!save.flags?.[FLAG_TUTORIAL_INVENTORY],
        },
      ],
    };
  }

  if (phase === 'boxes') {
    const opened = !!save.flags?.[FLAG_TUTORIAL_BOX];
    return {
      phase,
      title: 'Boxes tutorial',
      steps: [
        {
          id: 'safe-only',
          label: 'Rule: boxes open only in safe zones (this Guild is safe)',
          done: true,
        },
        {
          id: 'open-box',
          label: 'Open the practice crate in the Guild hall (walk up, press E)',
          done: opened,
        },
      ],
    };
  }

  // safe_zone
  return {
    phase: 'safe_zone',
    title: 'Safe zones',
    steps: [
      {
        id: 'learn-safe',
        label: 'Talk to the Guild Master about safe zones',
        done: !!save.flags?.[FLAG_TUTORIAL_SAFE_ZONE],
      },
    ],
  };
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
    [FLAG_TUTORIAL_INVENTORY]: true,
    [FLAG_TUTORIAL_BOX]: true,
    [FLAG_TUTORIAL_SAFE_ZONE]: true,
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
  // Rack weapons stay at the guild — strip loaners before graduate walks out
  next = stripGuildLoanerWeapons(next);
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

/** Equipped guild loaner instance, if any. */
export function equippedGuildLoaner(
  save: SaveData,
): { uid: string; templateId: string; family: TutorialWeapon; name: string } | null {
  const uid = save.equipped?.weapon;
  if (!uid) return null;
  const inst = save.bag.find((b) => b.uid === uid);
  if (!inst || !isGuildLoanerInstance(inst)) return null;
  const t = getTemplate(inst.templateId);
  const family = tutorialWeaponFromEquip(inst.templateId, t.look);
  if (!family) return null;
  return {
    uid: inst.uid,
    templateId: inst.templateId,
    family,
    name: displayItemName(inst),
  };
}

/** Family of the currently equipped guild loaner, or null. */
export function equippedGuildLoanerFamily(
  save: SaveData,
): TutorialWeapon | null {
  return equippedGuildLoaner(save)?.family ?? null;
}

/**
 * Catalog templates still hanging on the rack (not the equipped piece).
 * Equipping one weapon removes only that silhouette; siblings stay.
 */
export function rackPresentTemplates(
  save: SaveData,
  family: TutorialWeapon,
): string[] {
  // Only hide the equipped piece when it is a guild loaner of this family
  const loaner = equippedGuildLoaner(save);
  const hide =
    loaner && loaner.family === family ? loaner.templateId : null;
  return RACK_CATALOG[family].filter((tid) => tid !== hide);
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

/**
 * Guild loaners only exist while equipped (or briefly during take).
 * Unequipped loaners are never stored in inventory — they live on racks.
 */
export function purgeUnequippedGuildLoaners(save: SaveData): SaveData {
  const eq = save.equipped?.weapon ?? null;
  const bag = save.bag.filter((b) => {
    if (!isGuildLoanerInstance(b)) return true;
    return eq != null && b.uid === eq;
  });
  if (bag.length === save.bag.length) return save;
  return syncDerivedStats({ ...save, bag });
}

/**
 * @deprecated No longer pre-mints rack catalog into bag.
 * Loaners are virtual on racks; mint only when borrowed.
 */
export function ensureCatalogInBag(
  save: SaveData,
  _family: TutorialWeapon,
): SaveData {
  return purgeUnequippedGuildLoaners(save);
}

/** Ensure the default training template path still works for tests. */
export function ensureTrainingWeaponInBag(
  save: SaveData,
  weapon: TutorialWeapon,
): SaveData {
  return ensureCatalogInBag(save, weapon);
}

/**
 * Weapons currently hanging (pickable) — catalog pieces not equipped.
 * Virtual list (template ids); take mints a loaner on borrow.
 */
export function listRackWeaponOptions(
  save: SaveData,
  family: TutorialWeapon,
): { uid: string; templateId: string; name: string }[] {
  const present = rackPresentTemplates(save, family);
  return present.map((tid) => ({
    // uid is template id until borrowed (takeWeaponFromRack accepts either)
    uid: tid,
    templateId: tid,
    name: getTemplate(tid).name,
  }));
}

function withBowAmmo(save: SaveData, family: TutorialWeapon): SaveData {
  if (family !== 'bow') return save;
  const arrows = Math.max(save.stacks?.arrows ?? 0, 30);
  return { ...save, stacks: { ...save.stacks, arrows } };
}

function clearBowAmmoIfNeeded(save: SaveData): SaveData {
  const stacks = { ...save.stacks };
  delete stacks.arrows;
  return { ...save, stacks };
}

/**
 * Unequip the family loaner and remove it from bag so it reappears on the rack.
 */
export function returnWeaponToRack(
  save: SaveData,
  family: TutorialWeapon,
): {
  save: SaveData;
  ok: boolean;
  reason?: string;
  unequipped: boolean;
  name?: string;
} {
  const holding = equippedGuildLoaner(save);
  if (!holding) {
    return {
      save: purgeUnequippedGuildLoaners(save),
      ok: false,
      reason: 'NOTHING EQUIPPED TO RETURN',
      unequipped: false,
    };
  }
  if (holding.family !== family) {
    return {
      save,
      ok: false,
      reason: `HOLDING ${holding.family.toUpperCase()} — USE THAT RACK`,
      unequipped: false,
    };
  }
  const bag = save.bag.filter((b) => b.uid !== holding.uid);
  let next: SaveData = {
    ...save,
    bag,
    equipped: { ...save.equipped, weapon: null },
  };
  if (family === 'bow') next = clearBowAmmoIfNeeded(next);
  next = purgeUnequippedGuildLoaners(next);
  next = syncDerivedStats(next);
  return {
    save: next,
    ok: true,
    unequipped: true,
    name: holding.name,
  };
}

/** Return whatever guild loaner is equipped (any family). */
export function returnAnyEquippedGuildLoaner(save: SaveData): {
  save: SaveData;
  returned: TutorialWeapon | null;
  name?: string;
} {
  const holding = equippedGuildLoaner(save);
  if (!holding) {
    return { save: purgeUnequippedGuildLoaners(save), returned: null };
  }
  const r = returnWeaponToRack(save, holding.family);
  return {
    save: r.save,
    returned: r.ok ? holding.family : null,
    name: r.name,
  };
}

/**
 * Borrow a hanging rack weapon. Only one loaner at a time —
 * any currently equipped guild weapon is returned first.
 * `pickId` is a template id (or legacy bag uid).
 */
export function takeWeaponFromRack(
  save: SaveData,
  family: TutorialWeapon,
  pickId?: string,
): {
  save: SaveData;
  ok: boolean;
  reason?: string;
  name?: string;
  autoReturned?: string;
} {
  let next = purgeUnequippedGuildLoaners(save);
  let autoReturned: string | undefined;

  // One loaner at a time — return whatever is equipped
  const prior = returnAnyEquippedGuildLoaner(next);
  next = prior.save;
  if (prior.returned && prior.name) {
    autoReturned = prior.name;
  }

  const opts = listRackWeaponOptions(next, family);
  if (opts.length === 0) {
    return {
      save: next,
      ok: false,
      reason: 'RACK IS BARE — RETURN YOUR WEAPON',
      autoReturned,
    };
  }
  const pick =
    (pickId
      ? opts.find((o) => o.uid === pickId || o.templateId === pickId)
      : null) ?? opts[0]!;

  // Mint a hall-only loaner and equip it (not a permanent bag item)
  const minted = mintItem(next, pick.templateId, 'common', 0);
  const loaner = { ...minted.instance, guildLoaner: true as const };
  next = {
    ...minted.save,
    bag: minted.save.bag.map((b) => (b.uid === loaner.uid ? loaner : b)),
    equipped: { ...minted.save.equipped, weapon: loaner.uid },
  };
  next = withBowAmmo(next, family);
  next = purgeUnequippedGuildLoaners(next);
  next = syncDerivedStats(next);
  return {
    save: next,
    ok: true,
    name: displayItemName(loaner),
    autoReturned,
  };
}

/** Grant/equip default training weapon for drills. */
export function equipTrainingWeapon(
  save: SaveData,
  weapon: TutorialWeapon,
): SaveData {
  const tid = TRAINING_TEMPLATES[weapon];
  const r = takeWeaponFromRack(save, weapon, tid);
  return r.save;
}

/** Copy for the return Yes/No prompt. */
export function rackReturnPromptLines(
  family: TutorialWeapon,
  weaponName: string,
): string[] {
  const label = family.toUpperCase();
  return [
    `${label} RACK`,
    `RETURN YOUR ${weaponName}?`,
    '',
    'YES — PUT IT BACK ON THE RACK.',
    'NO — KEEP HOLDING IT.',
  ];
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
 * Welcome to Tutorial Guild → clear weapons tutorial in steps.
 */
export function guildMasterIntroDialog(): string[] {
  return [
    'Welcome to the Tutorial Guild.',
    'I am the Guild Master. I train crawlers so they leave alive.',
    '',
    'Your long quest is to rescue Princess Prizella.',
    'Before the east door opens, you will practice here safely.',
    '',
    'First lesson: weapons. Follow these steps carefully.',
    '',
    'Step 1: Walk to the sword rack on the north wall.',
    'Press E to open the rack, then choose a sword and equip it.',
    '',
    'Step 2: Face a training dummy. Press Space or Z to attack.',
    'Keep hitting until that sword drill reaches one hundred percent.',
    '',
    'Step 3: Return the sword (or switch racks) and equip an axe.',
    'Finish the axe drill on a dummy the same way.',
    '',
    'Step 4: Equip a bow from the bow rack. You will get practice arrows.',
    'Shoot a dummy until the bow drill is complete.',
    '',
    'Step 5: Equip a staff from the staff rack.',
    'Use it on a dummy until the staff drill is complete.',
    '',
    'A checklist in the lower left tracks each step for you.',
    'When all four weapons are done, talk to me again.',
  ];
}

/** Phase-specific coaching after the intro. */
export function guildMasterPhaseDialog(save: SaveData): string[] {
  const phase = tutorialPhase(save);
  if (phase === 'inventory') {
    return [
      'Good work with the weapons.',
      '',
      'Next lesson: your inventory.',
      'Press I on the keyboard to open your bag.',
      'You will see items, gear, and anything you are carrying.',
      'Look around, then close it with I or Escape.',
      'When you have opened it once, talk to me again.',
    ];
  }
  if (phase === 'boxes') {
    return [
      'Next lesson: loot boxes and crates.',
      '',
      'Important rule: you can only open boxes inside a safe zone.',
      'This Tutorial Guild is a safe zone. Enemies cannot hurt you here.',
      '',
      'There is a practice crate in this hall.',
      'Walk up to it and press E to open it.',
      'If you try to open a box in a dangerous room, it will refuse.',
      'Open the practice crate, then talk to me again.',
    ];
  }
  if (phase === 'safe_zone') {
    return [
      'Last lesson for now: safe zones.',
      '',
      'A safe zone is a place where enemies cannot attack you.',
      'You may open boxes only while you stand in a safe zone.',
      'This Tutorial Guild is always a safe zone.',
      'Doors into the Guild always lead to this same hall — like a portal.',
      'You will find more safe rooms later in the dungeons.',
      '',
      'Remember that rule, and you are ready to graduate.',
    ];
  }
  if (phase === 'graduate') {
    return [
      'You finished every lesson in this hall.',
      'By the power of the Training Guild, you are graduated.',
      'The east door is open. A starter crate is yours to claim here.',
      'The meadow and the caves await. Rescue Princess Prizella.',
    ];
  }
  // weapons mid-drill
  const need = nextTutorialWeapon(save);
  const lines: string[] = [
    'Back to the weapons lesson.',
    'Equip the correct weapon from its rack, then damage a dummy to 100%.',
    '',
  ];
  for (const w of TUTORIAL_WEAPONS) {
    const done = weaponHitDone(save, w);
    const pct = weaponProgressPct(save, w);
    const mark = done
      ? 'done'
      : w === need
        ? `${pct}% — do this next`
        : pct > 0
          ? `${pct}%`
          : 'not started';
    lines.push(
      `${w.charAt(0).toUpperCase()}${w.slice(1)}: ${mark}`,
    );
  }
  lines.push('');
  if (need) {
    lines.push(
      `Next: equip a ${need} from the ${need} rack (press E on the rack).`,
    );
    lines.push(
      `Then attack a dummy until you deal full drill damage (${drillDamageRequired()} hit points).`,
    );
  }
  return lines;
}

export function guildMasterDialog(save: SaveData): string[] {
  if (isTutorialComplete(save)) {
    return [
      'You already graduated from this Guild.',
      'East leads to the meadow. The cave mouth leads into Dunjunz.',
      'Move with WASD or the arrows. Attack with Space or Z.',
      'Open your bag with I. Talk or use things with E.',
      'Go rescue Princess Prizella. Come back through any Guild door anytime.',
    ];
  }

  if (canGraduateTutorial(save)) {
    return guildMasterPhaseDialog(save);
  }

  return guildMasterPhaseDialog(save);
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
      'GUILD WEAPONS STAY HERE — LOANERS ONLY.',
    ];
  }
  if (opts?.mode === 'browse') {
    return [
      `${weapon.toUpperCase()} RACK — TRAINING LOANERS.`,
      'OPEN THE RACK WINDOW TO BORROW ONE.',
      'THEY NEVER LEAVE THE GUILD HALL.',
    ];
  }
  return [
    `YOU BORROW THE ${label}.`,
    'TRAINING LOANER — STAYS IN THE GUILD HALL.',
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
