import { describe, expect, it } from 'vitest';
import type { TileKind } from '../types';
import {
  autoKoiEntities,
  classifyRoomWater,
  classifyWaterComponent,
  terrainVariant,
  waterTextureKey,
} from './water-bodies';

function gridFrom(rows: string[]): TileKind[][] {
  return rows.map((r) =>
    [...r].map((ch) => (ch === '~' ? ('water' as const) : ('floor' as const))),
  );
}

describe('water body classification', () => {
  it('marks all beach water as ocean', () => {
    const g = gridFrom([
      '................',
      '......~~~~......',
      '....~~~~~~~~....',
      '....~~~~~~~~....',
    ]);
    const m = classifyRoomWater('beach_start', g);
    expect([...m.values()].every((v) => v === 'ocean')).toBe(true);
    expect(m.size).toBeGreaterThan(8);
  });

  it('classifies closed blobs as pond', () => {
    const g = gridFrom([
      '................',
      '......~~~~......',
      '.....~~~~~~.....',
      '......~~~~......',
      '................',
    ]);
    const m = classifyRoomWater('woodz_hollow', g);
    expect([...m.values()].every((v) => v === 'pond')).toBe(true);
  });

  it('classifies thin long channels as river', () => {
    const g = gridFrom([
      '................',
      '..~~............',
      '..~~............',
      '..~~............',
      '..~~............',
      '..~~............',
      '................',
    ]);
    const m = classifyRoomWater('woodz_path', g);
    expect([...m.values()].every((v) => v === 'river')).toBe(true);
  });

  it('classifies edge-touching water as river', () => {
    const g = gridFrom([
      '~~..............',
      '~~..............',
      '~~..............',
    ]);
    const m = classifyRoomWater('sewerz_hall', g);
    expect([...m.values()].every((v) => v === 'river')).toBe(true);
  });

  it('auto-spawns koi on ponds only', () => {
    const tiles = [
      '################',
      '#..............#',
      '#....~~~~......#',
      '#...~~~~~~.....#',
      '#....~~~~......#',
      '#..............#',
      '################',
    ];
    const koi = autoKoiEntities('test_pond', tiles, []);
    expect(koi.length).toBeGreaterThanOrEqual(2);
    expect(koi.every((e) => e.kind === 'koi')).toBe(true);
    // No koi on beach
    expect(autoKoiEntities('beach_start', tiles, [])).toEqual([]);
    // No double spawn if authored
    expect(
      autoKoiEntities('test_pond', tiles, [{ kind: 'koi', x: 6, y: 2 }]),
    ).toEqual([]);
  });

  it('water texture keys differ by body', () => {
    expect(waterTextureKey('ocean', 0)).toContain('ocean');
    expect(waterTextureKey('pond', 0)).toContain('pond');
    expect(waterTextureKey('river', 1)).toContain('river');
  });

  it('terrain variants cycle by tile coords', () => {
    const a = terrainVariant(0, 0, 3);
    const b = terrainVariant(1, 0, 3);
    const c = terrainVariant(5, 7, 3);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(3);
    expect([a, b, c].every((v) => v >= 0 && v < 3)).toBe(true);
  });

  it('classifyWaterComponent pond vs river heuristics', () => {
    expect(
      classifyWaterComponent('x', {
        cells: [
          { x: 3, y: 3 },
          { x: 4, y: 3 },
          { x: 3, y: 4 },
          { x: 4, y: 4 },
        ],
        minX: 3,
        maxX: 4,
        minY: 3,
        maxY: 4,
        onEdge: false,
      }),
    ).toBe('pond');
    expect(
      classifyWaterComponent('x', {
        cells: [
          { x: 2, y: 1 },
          { x: 2, y: 2 },
          { x: 2, y: 3 },
          { x: 2, y: 4 },
          { x: 2, y: 5 },
        ],
        minX: 2,
        maxX: 2,
        minY: 1,
        maxY: 5,
        onEdge: false,
      }),
    ).toBe('river');
  });
});
