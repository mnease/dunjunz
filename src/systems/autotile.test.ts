/**
 * Phase A autotile — drives shipped mask/frame resolution (no Phaser).
 */
import { describe, expect, it } from 'vitest';
import type { TileKind } from '../types';
import {
  EDGE_E,
  EDGE_N,
  EDGE_S,
  EDGE_W,
  allEdgeMasks,
  autotileTextureKey,
  edgeMask4,
  fluidAutotileKey,
  fluidMatch,
  isAutotileFluid,
  isFullFillMask,
  resolveAutotileTextureKey,
} from './autotile';

function grid(rows: string[]): TileKind[][] {
  return rows.map((row) =>
    row.split('').map((c) => {
      if (c === '~') return 'water';
      if (c === '=') return 'lava';
      if (c === '#') return 'wall';
      if (c === 'g') return 'grass';
      if (c === 'd') return 'dirt';
      if (c === '.') return 'floor';
      return 'void';
    }),
  );
}

describe('edgeMask4', () => {
  it('isolated water cell has open edges (mask 0)', () => {
    const g = grid(['...', '.~.', '...']);
    expect(edgeMask4(g, 1, 1, fluidMatch('water'))).toBe(0);
    expect(fluidAutotileKey(g, 1, 1)).toBe('at-water-0');
  });

  it('3×3 pond interior is full-fill mask 15', () => {
    const g = grid([
      '~~~~~',
      '~~~~~',
      '~~~~~',
      '~~~~~',
      '~~~~~',
    ]);
    // Center of 5×5 all-water
    expect(edgeMask4(g, 2, 2, fluidMatch('water'))).toBe(
      EDGE_N | EDGE_E | EDGE_S | EDGE_W,
    );
    expect(isFullFillMask(15)).toBe(true);
    expect(fluidAutotileKey(g, 2, 2)).toBe('at-water-15');
  });

  it('every sample in 3×3 pond interior resolves to fluid full-fill frame', () => {
    // 5×5 water with dirt border; interior 3×3 is pure water neighbors
    const g = grid([
      'ddddd',
      'd~~~d',
      'd~~~d',
      'd~~~d',
      'ddddd',
    ]);
    const interiorKeys: string[] = [];
    for (let y = 1; y <= 3; y++) {
      for (let x = 1; x <= 3; x++) {
        const key = resolveAutotileTextureKey(g, x, y);
        expect(key, `cell ${x},${y}`).toMatch(/^at-water-\d+$/);
        expect(key!.startsWith('at-water-')).toBe(true);
        // Never land/void textures
        expect(key).not.toMatch(/dirt|grass|void|floor|wall/);
        interiorKeys.push(key!);
        // Center of pond (2,2) must be full fill
        if (x === 2 && y === 2) {
          expect(key).toBe('at-water-15');
          expect(isFullFillMask(edgeMask4(g, x, y, fluidMatch('water')))).toBe(
            true,
          );
        }
      }
    }
    // All 9 interior cells are fluid autotile frames (no holes)
    expect(interiorKeys).toHaveLength(9);
    expect(interiorKeys.every((k) => k.startsWith('at-water-'))).toBe(true);
  });

  it('corridor edge only matches along the channel', () => {
    // Horizontal water corridor row 1
    const g = grid(['#####', '~~~~~', '#####']);
    // Middle of corridor: N wall, S wall, E water, W water → E|W = 2|8 = 10
    expect(edgeMask4(g, 2, 1, fluidMatch('water'))).toBe(EDGE_E | EDGE_W);
    expect(fluidAutotileKey(g, 2, 1)).toBe('at-water-10');
  });

  it('water–land boundary: edge cell is still fluid frame, not land', () => {
    const g = grid(['ddd', 'd~d', 'ddd']);
    const key = resolveAutotileTextureKey(g, 1, 1);
    expect(key).toBe('at-water-0');
    // Dirt neighbors do not become water frames
    expect(resolveAutotileTextureKey(g, 0, 1)).toBeNull();
    expect(resolveAutotileTextureKey(g, 1, 0)).toBeNull();
  });

  it('lava only connects to lava, not water', () => {
    const g = grid(['~~~', '~=~', '~~~']);
    // Lava center: neighbors are water → open edges
    expect(edgeMask4(g, 1, 1, fluidMatch('lava'))).toBe(0);
    expect(fluidAutotileKey(g, 1, 1)).toBe('at-lava-0');
    // Water north of lava matches other water
    expect(fluidAutotileKey(g, 1, 0)).toMatch(/^at-water-/);
  });

  it('autotileTextureKey clamps mask to 0..15', () => {
    expect(autotileTextureKey('water', 15)).toBe('at-water-15');
    expect(autotileTextureKey('lava', 0)).toBe('at-lava-0');
    expect(autotileTextureKey('water', 99)).toBe('at-water-15');
    expect(autotileTextureKey('water', -3)).toBe('at-water-0');
  });

  it('allEdgeMasks lists 16 unique masks', () => {
    const m = allEdgeMasks();
    expect(m).toHaveLength(16);
    expect(new Set(m).size).toBe(16);
  });

  it('isAutotileFluid only water and lava', () => {
    expect(isAutotileFluid('water')).toBe(true);
    expect(isAutotileFluid('lava')).toBe(true);
    expect(isAutotileFluid('grass')).toBe(false);
    expect(isAutotileFluid('dirt')).toBe(false);
  });
});
