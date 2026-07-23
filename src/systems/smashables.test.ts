import { describe, expect, it } from 'vitest';
import {
  cornerSmashSlots,
  isSmashableKind,
  rollSmashLoot,
  smashableHp,
  smashableEntityDefs,
} from './smashables';

describe('smashables', () => {
  it('recognizes barrel crate vase', () => {
    expect(isSmashableKind('barrel')).toBe(true);
    expect(isSmashableKind('crate')).toBe(true);
    expect(isSmashableKind('vase')).toBe(true);
    expect(isSmashableKind('chest')).toBe(false);
  });

  it('vase is fragile; barrel tougher', () => {
    expect(smashableHp('vase')).toBe(1);
    expect(smashableHp('crate')).toBe(2);
    expect(smashableHp('barrel')).toBe(3);
  });

  it('loot always coins; sometimes potion', () => {
    let potions = 0;
    for (let i = 0; i < 80; i++) {
      const drops = rollSmashLoot('barrel', () => (i % 5 === 0 ? 0.1 : 0.9));
      expect(drops.some((d) => d.coins)).toBe(true);
      if (drops.some((d) => d.stackId === 'potion')) potions++;
    }
    expect(potions).toBeGreaterThan(0);
  });

  it('corners skip occupied and blocked tiles', () => {
    const walk = (x: number, y: number) => !(x === 1 && y === 1);
    const occ = new Set(['14,1']);
    const slots = cornerSmashSlots(walk, occ, () => 0.2, 4);
    expect(slots.every((s) => !(s.x === 1 && s.y === 1))).toBe(true);
    expect(slots.every((s) => !(s.x === 14 && s.y === 1))).toBe(true);
  });

  it('entity defs use stable room ids and honor collected', () => {
    const walk = () => true;
    const defs = smashableEntityDefs(
      'b1_entrance',
      42,
      walk,
      new Set(),
      new Set(),
      [],
    );
    expect(defs.length).toBeGreaterThan(0);
    expect(defs.every((d) => d.id?.startsWith('b1_entrance-smash-'))).toBe(
      true,
    );
    const blocked = smashableEntityDefs(
      'b1_entrance',
      42,
      walk,
      new Set(),
      new Set(),
      defs.map((d) => d.id!),
    );
    expect(blocked.length).toBe(0);
  });
});
