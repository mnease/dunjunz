import { describe, expect, it } from 'vitest';
import type { TileKind } from '../types';
import {
  blocksProjectile,
  blocksWalk,
  blocksWalkAt,
  hasAccessNeighbor4,
} from './tile-solidity';

function g(rows: string[]): TileKind[][] {
  return rows.map((row) =>
    row.split('').map((c) => {
      if (c === '~') return 'water';
      if (c === '#') return 'wall';
      if (c === 'D') return 'door';
      if (c === 'S') return 'stairs';
      if (c === 'd') return 'dirt';
      if (c === 'g') return 'grass';
      return 'floor';
    }),
  );
}

describe('tile-solidity universal rules', () => {
  it('water never blocks projectiles (shoot over water)', () => {
    expect(blocksProjectile('water')).toBe(false);
  });

  it('open pond water still blocks walking', () => {
    const grid = g(['ddd', 'd~d', 'ddd']);
    expect(blocksWalk('water')).toBe(true);
    expect(blocksWalkAt(grid, 1, 1)).toBe(true);
  });

  it('water immediately north of a door does NOT block walk (doorway ford)', () => {
    // Door on south edge at (3,2); water approach at (3,1)
    const doorApproach = g([
      'dddd',
      'ddd~',
      '###D',
    ]);
    expect(doorApproach[1]![3]).toBe('water');
    expect(doorApproach[2]![3]).toBe('door');
    expect(hasAccessNeighbor4(doorApproach, 3, 1)).toBe(true);
    expect(blocksWalkAt(doorApproach, 3, 1)).toBe(false);
    // Open pond water (no door neighbor) still blocks
    expect(blocksWalkAt(doorApproach, 1, 1)).toBe(false); // dirt
    const pond = g(['ddd', 'd~d', 'ddd']);
    expect(blocksWalkAt(pond, 1, 1)).toBe(true);
  });

  it('water next to stairs is walkable ford', () => {
    const grid = g([
      'dddd',
      'dd~d',
      'ddSd',
    ]);
    expect(grid[1]![2]).toBe('water');
    expect(grid[2]![2]).toBe('stairs');
    expect(blocksWalkAt(grid, 2, 1)).toBe(false);
  });

  it('walls and void block both walk and projectiles', () => {
    expect(blocksWalk('wall')).toBe(true);
    expect(blocksProjectile('wall')).toBe(true);
    expect(blocksWalk('void')).toBe(true);
    expect(blocksProjectile('void')).toBe(true);
  });

  it('door tiles never block walk or projectiles', () => {
    expect(blocksWalk('door')).toBe(false);
    expect(blocksProjectile('door')).toBe(false);
  });

  it('open land never blocks walk or projectiles', () => {
    for (const k of ['floor', 'grass', 'dirt', 'sand', 'snow', 'carpet'] as const) {
      expect(blocksWalk(k), k).toBe(false);
      expect(blocksProjectile(k), k).toBe(false);
    }
  });

  it('lava blocks walk and projectiles', () => {
    expect(blocksWalk('lava')).toBe(true);
    expect(blocksProjectile('lava')).toBe(true);
  });
});
