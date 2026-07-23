import { describe, expect, it } from 'vitest';
import { defaultSave } from './save';
import {
  FLAG_FELLOWSHIP_STARTED,
  glamdolphArrivalDialog,
  isFellowshipActive,
  markFellowshipStarted,
  shouldTriggerFellowshipCutscene,
} from './fellowship';
import { talkQueen } from './elfwood';
import { BLIGHT_WOLF_IDS, FLAG_HEAL_ONCE } from './elfwood';

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
        // waters not done yet — finish via talk
      },
      maxHp: 10,
      hp: 10,
      coins: 0,
    };
    // turn in waters
    let r = talkQueen(s);
    s = r.save;
    expect(s.flags.elf_q_waters_done).toBe(true);

    // final box
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
