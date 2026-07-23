import { describe, expect, it } from 'vitest';
import { defaultSave } from './save';
import { ROOMS } from '../data/world';
import {
  BLIGHT_WOLF_IDS,
  ELVEN_BOX_POOL,
  FLAG_DOOR_UNLOCKED,
  FLAG_GOT_ELVEN_BOX,
  FLAG_HEAL_ONCE,
  FLAG_Q_SHARDS,
  FLAG_Q_SHARDS_DONE,
  FLAG_Q_WATERS,
  FLAG_Q_WATERS_DONE,
  FLAG_Q_WOLVES,
  FLAG_Q_WOLVES_DONE,
  FLAG_QUEEN_COMPLETE,
  FLAG_QUEEN_MET,
  FLAG_ROOT_OK,
  FLAG_TRUNK_OK,
  LEGENDARY_ELVEN_BOX_ID,
  STATUE_CROWN_ID,
  STATUE_ROOT_ID,
  STATUE_TRUNK_ID,
  drinkHealingSpring,
  openLegendaryElvenBox,
  shouldSpawnElfwoodPortal,
  talkQueen,
  touchElfStatue,
} from './elfwood';

describe('elfwood statue puzzle', () => {
  it('root → trunk → crown unlocks door', () => {
    let s = defaultSave();
    expect(shouldSpawnElfwoodPortal(s)).toBe(false);

    let r = touchElfStatue(s, STATUE_ROOT_ID);
    s = r.save;
    expect(s.flags[FLAG_ROOT_OK]).toBe(true);
    expect(r.unlocked).toBeFalsy();

    r = touchElfStatue(s, STATUE_TRUNK_ID);
    s = r.save;
    expect(s.flags[FLAG_TRUNK_OK]).toBe(true);

    r = touchElfStatue(s, STATUE_CROWN_ID);
    s = r.save;
    expect(s.flags[FLAG_DOOR_UNLOCKED]).toBe(true);
    expect(r.unlocked).toBe(true);
    expect(shouldSpawnElfwoodPortal(s)).toBe(true);
    expect(r.toast).toMatch(/UNLOCKED/i);
  });

  it('wrong order resets progress', () => {
    let s = defaultSave();
    s = touchElfStatue(s, STATUE_ROOT_ID).save;
    // Crown too early
    const fail = touchElfStatue(s, STATUE_CROWN_ID);
    expect(fail.save.flags[FLAG_ROOT_OK]).toBeFalsy();
    expect(fail.save.flags[FLAG_TRUNK_OK]).toBeFalsy();
    expect(fail.save.flags[FLAG_DOOR_UNLOCKED]).toBeFalsy();
    expect(fail.dialog.join(' ')).toMatch(/LEAF-BRAIN|ROOT/i);
  });

  it('trunk before root fails', () => {
    const s = defaultSave();
    const r = touchElfStatue(s, STATUE_TRUNK_ID);
    expect(r.save.flags[FLAG_TRUNK_OK]).toBeFalsy();
    expect(r.dialog.join(' ')).toMatch(/ORDER|LEAF/i);
  });
});

describe('elfwood healing spring', () => {
  it('heals and sets quest flag once per visit', () => {
    let s = { ...defaultSave(), hp: 2, maxHp: 10 };
    const r = drinkHealingSpring(s, false);
    expect(r.healed).toBe(true);
    expect(r.save.hp).toBe(10);
    expect(r.save.flags[FLAG_HEAL_ONCE]).toBe(true);

    const again = drinkHealingSpring(r.save, true);
    expect(again.healed).toBe(false);
    expect(again.dialog.join(' ')).toMatch(/SIP QUIETLY|WALK/i);
  });
});

describe('elfwood queen quests', () => {
  it('full board: meet → accept three → turn-in → box once', () => {
    let s = defaultSave();
    // No shards yet so accept talks do not auto-complete the deliver quest
    s = { ...s, stacks: {}, coins: 0, maxHp: 8, hp: 8 };

    // meet
    let r = talkQueen(s);
    s = r.save;
    expect(s.flags[FLAG_QUEEN_MET]).toBe(true);

    // accept wolves
    r = talkQueen(s);
    s = r.save;
    expect(s.flags[FLAG_Q_WOLVES]).toBe(true);

    // accept shards
    r = talkQueen(s);
    s = r.save;
    expect(s.flags[FLAG_Q_SHARDS]).toBe(true);

    // accept waters
    r = talkQueen(s);
    s = r.save;
    expect(s.flags[FLAG_Q_WATERS]).toBe(true);

    // kill wolves + drink + grant shards, then turn-in wolves
    s = {
      ...s,
      killed: [...s.killed, ...BLIGHT_WOLF_IDS],
      stacks: { ...s.stacks, wood_shard: 5 },
      flags: { ...s.flags, [FLAG_HEAL_ONCE]: true },
    };
    r = talkQueen(s);
    s = r.save;
    expect(s.flags[FLAG_Q_WOLVES_DONE]).toBe(true);
    expect(s.stacks.potion).toBeGreaterThanOrEqual(3);

    // turn-in shards
    r = talkQueen(s);
    s = r.save;
    expect(s.flags[FLAG_Q_SHARDS_DONE]).toBe(true);
    expect(s.stacks.wood_shard).toBe(2); // 5-3
    expect(s.stacks.loot_box_gold).toBe(1);

    // turn-in waters
    r = talkQueen(s);
    s = r.save;
    expect(s.flags[FLAG_Q_WATERS_DONE]).toBe(true);

    // final box
    r = talkQueen(s);
    s = r.save;
    expect(s.flags[FLAG_GOT_ELVEN_BOX]).toBe(true);
    expect(s.flags[FLAG_QUEEN_COMPLETE]).toBe(true);
    expect(s.stacks[LEGENDARY_ELVEN_BOX_ID]).toBe(1);

    // idempotent
    const again = talkQueen(s);
    expect(again.save.stacks[LEGENDARY_ELVEN_BOX_ID]).toBe(1);
    expect(again.dialog.join(' ')).toMatch(/FORJE|NAP|FONDLY/i);
  });
});

describe('legendary elven box', () => {
  it('opens one legendary mithril from pool', () => {
    let s = defaultSave();
    s = {
      ...s,
      stacks: { [LEGENDARY_ELVEN_BOX_ID]: 1 },
      bag: [],
      nextItemUid: 1,
    };
    const r = openLegendaryElvenBox(s, () => 0); // first pool entry
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.save.stacks[LEGENDARY_ELVEN_BOX_ID] ?? 0).toBe(0);
    expect(r.save.bag).toHaveLength(1);
    expect(ELVEN_BOX_POOL).toContain(r.save.bag[0]!.templateId);
    expect(r.save.bag[0]!.rarity).toBe('legendary');
    expect(r.save.bag[0]!.enhancement).toBe(1);
  });

  it('pool has exactly 7 mithril gifts', () => {
    expect(ELVEN_BOX_POOL).toHaveLength(7);
  });
});

describe('elfwood world graph', () => {
  it('links glade west of edge and kingdom rooms exist', () => {
    expect(ROOMS.woodz_edge.west).toBe('woodz_glade');
    expect(ROOMS.woodz_glade.east).toBe('woodz_edge');
    expect(ROOMS.woodz_glade.north).toBe('woodz_arch');
    expect(ROOMS.woodz_arch.south).toBe('woodz_glade');
    expect(ROOMS.elfwood_gate).toBeTruthy();
    expect(ROOMS.elfwood_waters).toBeTruthy();
    expect(ROOMS.elfwood_court).toBeTruthy();
    expect(ROOMS.elfwood_thicket).toBeTruthy();
    expect(ROOMS.elfwood_gate.east).toBe('elfwood_waters');
    expect(ROOMS.elfwood_gate.south).toBe('elfwood_thicket');
    expect(ROOMS.elfwood_waters.north).toBe('elfwood_court');
  });

  it('giant trees on surface woodz rooms', () => {
    for (const id of [
      'woodz_path',
      'woodz_edge',
      'woodz_hollow',
      'woodz_deep',
    ] as const) {
      const trees = (ROOMS[id].entities ?? []).filter((e) => e.kind === 'tree');
      expect(trees.length).toBeGreaterThan(0);
      for (const t of trees) {
        expect(t.scale ?? 0).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('elfwood kingdom is dense sky-redwoods with queen + guards', () => {
    for (const id of [
      'elfwood_gate',
      'elfwood_waters',
      'elfwood_court',
      'elfwood_thicket',
    ] as const) {
      const trees = (ROOMS[id].entities ?? []).filter((e) => e.kind === 'tree');
      expect(trees.length, id).toBeGreaterThanOrEqual(10);
      for (const t of trees) {
        expect(t.scale ?? 0, t.id).toBeGreaterThanOrEqual(7);
      }
    }
    const court = ROOMS.elfwood_court.entities ?? [];
    expect(court.some((e) => e.id === 'queen-wood-elves')).toBe(true);
    expect(court.some((e) => e.id === 'elf-courtier')).toBe(true);
    const gate = ROOMS.elfwood_gate.entities ?? [];
    expect(gate.some((e) => e.id === 'elf-sentry')).toBe(true);
  });
});
