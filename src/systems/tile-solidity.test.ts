import { describe, expect, it } from 'vitest';
import { blocksProjectile, blocksWalk } from './tile-solidity';

describe('tile-solidity universal rules', () => {
  it('water never blocks projectiles (shoot over water)', () => {
    expect(blocksProjectile('water')).toBe(false);
  });

  it('water still blocks walking (ponds are not floors)', () => {
    expect(blocksWalk('water')).toBe(true);
  });

  it('walls and void block both walk and projectiles', () => {
    expect(blocksWalk('wall')).toBe(true);
    expect(blocksProjectile('wall')).toBe(true);
    expect(blocksWalk('void')).toBe(true);
    expect(blocksProjectile('void')).toBe(true);
    expect(blocksWalk('locked')).toBe(true);
    expect(blocksProjectile('locked')).toBe(true);
  });

  it('doorways are never walk-blocked or projectile-blocked', () => {
    expect(blocksWalk('door')).toBe(false);
    expect(blocksProjectile('door')).toBe(false);
  });

  it('open land never blocks walk or projectiles', () => {
    for (const k of ['floor', 'grass', 'dirt', 'sand', 'snow', 'carpet'] as const) {
      expect(blocksWalk(k), k).toBe(false);
      expect(blocksProjectile(k), k).toBe(false);
    }
  });

  it('lava blocks walk and projectiles (not water)', () => {
    expect(blocksWalk('lava')).toBe(true);
    expect(blocksProjectile('lava')).toBe(true);
  });

  it('missing kind is solid (OOB safety)', () => {
    expect(blocksWalk(undefined)).toBe(true);
    expect(blocksProjectile(undefined)).toBe(true);
  });
});
