import { describe, expect, it } from 'vitest';
import { defaultSave } from './save';
import {
  FLAG_BLACK_SWORD,
  FLAG_DWARVES_RECRUITED,
  FLAG_ELF_WARRIOR_JOINED,
  FLAG_FELLOWSHIP_STARTED,
  FLAG_ROARHIMZ_RECRUITED,
  FLAG_WHITE_SWORD,
  FLAG_ZORON_DEFEATED,
  DWARVEZ_MINE_HOSTILE_IDS,
  ROARHIMZ_CAMP_HOSTILE_IDS,
  applyZoronDefeat,
  canForgeWhiteSword,
  canGrantElfWarrior,
  fellowshipAtkBonus,
  fellowshipDefBonus,
  fellowshipPartyChips,
  forgeWhiteSword,
  glamdolphArrivalDialog,
  grantElfWarrior,
  isFellowshipActive,
  isNorthRoadOpen,
  isNwRoadOpen,
  isRoadOpen,
  isSouthRoadOpen,
  markFellowshipStarted,
  shouldSpawnFellowshipBarrier,
  shouldTriggerFellowshipCutscene,
  talkMarshal,
  talkUnderKing,
} from './fellowship';
import { talkQueen } from './elfwood';
import { BLIGHT_WOLF_IDS, FLAG_HEAL_ONCE } from './elfwood';
import { LAND_THREAT } from './threat';
import { LANDS } from './mapz';
import { ENEMY_BASE_HP, ENEMY_CONTACT_DAMAGE } from './enemies';
import { ROOMS } from '../data/world';
import { validateRooms } from './room-validate';
import { listQuests } from './quest-log';
import type { SaveData } from '../types';
import { computePlayerDamage } from './attributes';
import { computeArmor } from './inventory';

function withFellowship(save: SaveData): SaveData {
  return markFellowshipStarted({
    ...save,
    flags: {
      ...save.flags,
      elf_queen_complete: true,
      got_legendary_elven_box: true,
    },
  });
}

describe('fellowship of the few', () => {
  it('triggers after queen box grant', () => {
    let s = defaultSave();
    s = {
      ...s,
      stacks: { wood_shard: 5 },
      killed: [...BLIGHT_WOLF_IDS],
      flags: {
        elf_queen_met: true,
        elf_q_wolves: true,
        elf_q_shards: true,
        elf_q_waters: true,
        elf_q_wolves_done: true,
        elf_q_shards_done: true,
        [FLAG_HEAL_ONCE]: true,
      },
      maxHp: 10,
      hp: 10,
      coins: 0,
    };
    let r = talkQueen(s);
    s = r.save;
    expect(s.flags.elf_q_waters_done).toBe(true);

    r = talkQueen(s);
    s = r.save;
    expect(s.flags.got_legendary_elven_box).toBe(true);
    expect(r.triggerFellowshipCutscene).toBe(true);
    expect(shouldTriggerFellowshipCutscene(s)).toBe(true);

    s = markFellowshipStarted(s);
    expect(s.flags[FLAG_FELLOWSHIP_STARTED]).toBe(true);
    expect(shouldTriggerFellowshipCutscene(s)).toBe(false);
    expect(isFellowshipActive(s)).toBe(true);
  });

  it('glamdolph speech names Zoron, Moredorkz, Roarhimz, Fellowship', () => {
    const text = glamdolphArrivalDialog().join(' ');
    expect(text).toMatch(/GLAMDOLPH/);
    expect(text).toMatch(/ZORON/);
    expect(text).toMatch(/MOREDORKZ/);
    expect(text).toMatch(/ROARHIMZ/);
    expect(text).toMatch(/DWARVEZ/);
    expect(text).toMatch(/FELLOWSHIP OF THE FEW/);
    expect(text).toMatch(/SWORD.*MANY LIVEZ|MANY LIVEZ/i);
  });
});

describe('fellowship roads (PR1)', () => {
  it('north and nw open only after fellowship_of_the_few', () => {
    const closed = defaultSave();
    expect(isNorthRoadOpen(closed)).toBe(false);
    expect(isNwRoadOpen(closed)).toBe(false);
    expect(isSouthRoadOpen(closed)).toBe(false);
    expect(isRoadOpen(closed, 'north')).toBe(false);

    const open = withFellowship(defaultSave());
    expect(isNorthRoadOpen(open)).toBe(true);
    expect(isNwRoadOpen(open)).toBe(true);
    expect(isSouthRoadOpen(open)).toBe(false);
  });

  it('south road opens only after elf warrior joined', () => {
    let s = withFellowship(defaultSave());
    s = {
      ...s,
      flags: {
        ...s.flags,
        [FLAG_DWARVES_RECRUITED]: true,
        [FLAG_ROARHIMZ_RECRUITED]: true,
        [FLAG_ELF_WARRIOR_JOINED]: true,
      },
    };
    expect(isSouthRoadOpen(s)).toBe(true);
    expect(isRoadOpen(s, 'south')).toBe(true);
  });

  it('barrier spawn toggles with road flags', () => {
    const closed = defaultSave();
    expect(shouldSpawnFellowshipBarrier(closed, 'gate-block-north-1')).toBe(
      true,
    );
    expect(shouldSpawnFellowshipBarrier(closed, 'gate-block-nw-1')).toBe(true);
    expect(shouldSpawnFellowshipBarrier(closed, 'gate-block-south-1')).toBe(
      true,
    );

    const openN = withFellowship(defaultSave());
    expect(shouldSpawnFellowshipBarrier(openN, 'gate-block-north-1')).toBe(
      false,
    );
    expect(shouldSpawnFellowshipBarrier(openN, 'gate-block-nw-2')).toBe(false);
    expect(shouldSpawnFellowshipBarrier(openN, 'gate-block-south-1')).toBe(
      true,
    );
  });

  it('surface road rooms link woodz / dezertz anchors', () => {
    expect(ROOMS.woodz_deep?.north).toBe('road_north_1');
    expect(ROOMS.road_north_1?.south).toBe('woodz_deep');
    expect(ROOMS.road_north_2?.north).toBe('dwarvez_gate');
    expect(ROOMS.woodz_glade?.west).toBe('road_nw_1');
    expect(ROOMS.road_nw_1?.east).toBe('woodz_glade');
    expect(ROOMS.road_nw_2?.north).toBe('roarhimz_gate');
    expect(ROOMS.dezertz_tower?.south).toBe('road_south_ash_1');
    expect(ROOMS.road_south_ash_2?.south).toBe('moredorkz_gate');
  });

  it('journal WHERE never says Road opens later', () => {
    const s = withFellowship(defaultSave());
    const q = listQuests(s).find((x) => x.id === 'side-fellowship');
    expect(q).toBeTruthy();
    expect(q!.hint).not.toMatch(/opens later/i);
    expect(q!.hint).toMatch(/North Road|Dwarvez/i);
  });
});

describe('fellowship lands plumbing (PR2)', () => {
  it('LandId mapz + threat tiers 4/4/7', () => {
    expect(LANDS.dwarvez).toBeTruthy();
    expect(LANDS.roarhimz).toBeTruthy();
    expect(LANDS.moredorkz).toBeTruthy();
    expect(LAND_THREAT.dwarvez).toBe(4);
    expect(LAND_THREAT.roarhimz).toBe(4);
    expect(LAND_THREAT.moredorkz).toBe(7);
    expect(LANDS.dwarvez.blurb).toMatch(/beard/i);
    expect(LANDS.moredorkz.blurb).toMatch(/ash|orc/i);
  });

  it('goblin/orc combat numbers locked', () => {
    expect(ENEMY_BASE_HP.goblin).toBe(16);
    expect(ENEMY_BASE_HP.orc).toBe(30);
    expect(ENEMY_CONTACT_DAMAGE.goblin).toBe(2);
    expect(ENEMY_CONTACT_DAMAGE.orc).toBe(3);
  });
});

describe('fellowship recruit arc (PR3–PR5)', () => {
  it('dwarvez recruit sets flag + land clear + atk passive', () => {
    let s = withFellowship(defaultSave());
    s = {
      ...s,
      killed: [...DWARVEZ_MINE_HOSTILE_IDS],
    };
    let r = talkUnderKing(s);
    s = r.save;
    expect(s.flags.dwarvez_king_met).toBe(true);

    r = talkUnderKing(s);
    s = r.save;
    expect(s.flags[FLAG_DWARVES_RECRUITED]).toBe(true);
    expect(s.landsCleared).toContain('dwarvez');
    expect(fellowshipAtkBonus(s)).toBe(1);
    expect(fellowshipPartyChips(s)).toContain('THRAIN');
    expect(computePlayerDamage(s)).toBeGreaterThanOrEqual(
      computePlayerDamage(withFellowship(defaultSave())),
    );
  });

  it('dwarvez mat path spends ore', () => {
    let s = withFellowship(defaultSave());
    s = { ...s, stacks: { ...s.stacks, ore_gold: 3 } };
    talkUnderKing(s); // meet
    s = talkUnderKing(talkUnderKing(s).save).save;
    // first talk met, second after met with mats
    s = withFellowship(defaultSave());
    s = {
      ...s,
      stacks: { ore_gold: 3 },
      flags: {
        ...s.flags,
        dwarvez_king_met: true,
      },
    };
    const r = talkUnderKing(s);
    expect(r.save.flags[FLAG_DWARVES_RECRUITED]).toBe(true);
    expect(r.save.stacks.ore_gold ?? 0).toBe(0);
  });

  it('roarhimz recruit sets flag + land clear + def passive', () => {
    let s = withFellowship(defaultSave());
    s = {
      ...s,
      killed: [...ROARHIMZ_CAMP_HOSTILE_IDS],
      flags: { ...s.flags, roarhimz_marshal_met: true },
    };
    const r = talkMarshal(s);
    expect(r.save.flags[FLAG_ROARHIMZ_RECRUITED]).toBe(true);
    expect(r.save.landsCleared).toContain('roarhimz');
    expect(fellowshipDefBonus(r.save)).toBe(1);
    expect(computeArmor(r.save)).toBeGreaterThanOrEqual(
      computeArmor(withFellowship(defaultSave())),
    );
  });

  it('queen grants Lirael when both allies recruited', () => {
    let s = withFellowship(defaultSave());
    s = {
      ...s,
      flags: {
        ...s.flags,
        elf_queen_met: true,
        elf_queen_complete: true,
        got_legendary_elven_box: true,
        [FLAG_DWARVES_RECRUITED]: true,
        [FLAG_ROARHIMZ_RECRUITED]: true,
      },
    };
    expect(canGrantElfWarrior(s)).toBe(true);
    const r = grantElfWarrior(s);
    expect(r.save.flags[FLAG_ELF_WARRIOR_JOINED]).toBe(true);
    expect(r.dialog.join(' ')).toMatch(/LIRAEL/);
    expect(isSouthRoadOpen(r.save)).toBe(true);

    // talkQueen path also grants
    const viaQueen = talkQueen(s);
    expect(viaQueen.save.flags[FLAG_ELF_WARRIOR_JOINED]).toBe(true);
  });
});

describe('fellowship zoron + volcano (PR6–PR8)', () => {
  it('zoron defeat grants black sword + moredorkz clear', () => {
    let s = withFellowship(defaultSave());
    s = {
      ...s,
      flags: {
        ...s.flags,
        [FLAG_ELF_WARRIOR_JOINED]: true,
      },
    };
    const r = applyZoronDefeat(s);
    expect(r.save.flags[FLAG_ZORON_DEFEATED]).toBe(true);
    expect(r.save.flags[FLAG_BLACK_SWORD]).toBe(true);
    expect(r.save.landsCleared).toContain('moredorkz');
    expect(
      r.save.bag.some((i) => i.templateId === 'black_sword'),
    ).toBe(true);
    expect(canForgeWhiteSword(r.save)).toBe(true);
  });

  it('volcano ceremony consumes black sword → white sword of many Livez', () => {
    let s = withFellowship(defaultSave());
    s = applyZoronDefeat(s).save;
    const r = forgeWhiteSword(s);
    expect(r.save.flags[FLAG_WHITE_SWORD]).toBe(true);
    expect(r.save.flags[FLAG_BLACK_SWORD]).toBe(false);
    expect(
      r.save.bag.some((i) => i.templateId === 'sword_of_many_livez'),
    ).toBe(true);
    expect(
      r.save.bag.some((i) => i.templateId === 'black_sword'),
    ).toBe(false);
    expect(isFellowshipActive(r.save)).toBe(false);

    const q = listQuests(r.save).find((x) => x.id === 'side-fellowship');
    expect(q?.status).toBe('done');
    expect(q?.hint).toMatch(/white sword of many Livez/i);
  });

  it('zoron room authored with boss hp 64', () => {
    const z = ROOMS.moredorkz_throne?.entities?.find((e) => e.id === 'zoron');
    expect(z?.kind).toBe('boss');
    expect(z?.hp).toBe(64);
  });
});

describe('fellowship room graph', () => {
  it('room-validate clean for fellowship + anchors', () => {
    const issues = validateRooms(ROOMS);
    const fellowshipIds = Object.keys(ROOMS).filter(
      (id) =>
        id.startsWith('road_') ||
        id.startsWith('dwarvez') ||
        id.startsWith('roarhimz') ||
        id.startsWith('moredorkz'),
    );
    const bad = issues.filter(
      (i) =>
        fellowshipIds.includes(i.id) ||
        i.id === 'woodz_deep' ||
        i.id === 'woodz_glade' ||
        i.id === 'dezertz_tower',
    );
    if (bad.length) {
      // eslint-disable-next-line no-console
      console.error(bad);
    }
    expect(bad).toEqual([]);
  });

  it('dwarvez / roarhimz / moredorkz room packs exist', () => {
    expect(ROOMS.dwarvez_hall?.land).toBe('dwarvez');
    expect(ROOMS.dwarvez_forje?.entities?.some((e) => e.kind === 'forje')).toBe(
      true,
    );
    expect(ROOMS.dwarvez_treasury).toBeTruthy();
    expect(ROOMS.roarhimz_mead).toBeTruthy();
    expect(ROOMS.roarhimz_marshal).toBeTruthy();
    expect(ROOMS.moredorkz_volcano).toBeTruthy();
    expect(
      ROOMS.moredorkz_gate?.entities?.some((e) => e.kind === 'goblin'),
    ).toBe(true);
  });
});
