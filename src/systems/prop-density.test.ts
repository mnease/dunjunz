import { describe, expect, it } from 'vitest';
import type { TileKind } from '../types';
import {
  averageDecosPerOpen3x3,
  decoKindsForLand,
  decoTextureKey,
  isDecoForbiddenKind,
  isDecoWalkableKind,
  placeFloorDecorations,
  placementsOnForbidden,
} from './prop-density';

function gridOf(
  w: number,
  h: number,
  fill: TileKind,
  paint?: Array<{ x: number; y: number; kind: TileKind }>,
): TileKind[][] {
  const g: TileKind[][] = [];
  for (let y = 0; y < h; y++) {
    const row: TileKind[] = [];
    for (let x = 0; x < w; x++) row.push(fill);
    g.push(row);
  }
  for (const p of paint ?? []) {
    if (g[p.y]) g[p.y]![p.x] = p.kind;
  }
  return g;
}

describe('prop density pure placement (Dn2)', () => {
  it('walkable vs forbidden kinds match Style Bible floors', () => {
    expect(isDecoWalkableKind('grass')).toBe(true);
    expect(isDecoWalkableKind('dirt')).toBe(true);
    expect(isDecoWalkableKind('floor')).toBe(true);
    expect(isDecoForbiddenKind('water')).toBe(true);
    expect(isDecoForbiddenKind('door')).toBe(true);
    expect(isDecoForbiddenKind('stairs')).toBe(true);
    expect(isDecoForbiddenKind('wall')).toBe(true);
    expect(isDecoForbiddenKind('lava')).toBe(true);
    expect(isDecoForbiddenKind('pad')).toBe(true);
  });

  it('places 1–3 decos per open walkable 3×3 on meadow-like grid', () => {
    // 12×12 all grass — four 3×3 windows per axis
    const grid = gridOf(12, 12, 'grass');
    const placements = placeFloorDecorations({
      grid,
      roomId: 'meadow_test',
      land: 'woodz',
      seed: 42,
    });
    expect(placements.length).toBeGreaterThan(0);
    const avg = averageDecosPerOpen3x3(grid, placements);
    // Style Bible band ~1–3; allow slight float slack on edges
    expect(avg).toBeGreaterThanOrEqual(1);
    expect(avg).toBeLessThanOrEqual(3.01);
    // Stable under same seed
    const again = placeFloorDecorations({
      grid,
      roomId: 'meadow_test',
      land: 'woodz',
      seed: 42,
    });
    expect(again).toEqual(placements);
  });

  it('never places on door / water / stairs / wall cells', () => {
    const grid = gridOf(9, 9, 'grass', [
      { x: 1, y: 1, kind: 'door' },
      { x: 2, y: 1, kind: 'water' },
      { x: 3, y: 1, kind: 'stairs' },
      { x: 4, y: 1, kind: 'wall' },
      { x: 5, y: 1, kind: 'lava' },
      { x: 6, y: 1, kind: 'pad' },
    ]);
    const placements = placeFloorDecorations({
      grid,
      roomId: 'mixed_test',
      land: 'dunjunz',
      seed: 7,
    });
    expect(placementsOnForbidden(grid, placements)).toEqual([]);
    for (const p of placements) {
      expect(isDecoWalkableKind(grid[p.y]![p.x]!)).toBe(true);
    }
  });

  it('respects occupied cells and maxTotal', () => {
    const grid = gridOf(6, 6, 'floor');
    const occ = new Set(['0,0', '1,0', '2,0', '0,1', '1,1', '2,1']);
    const placements = placeFloorDecorations({
      grid,
      roomId: 'occ_test',
      seed: 99,
      occupied: occ,
      maxTotal: 3,
    });
    expect(placements.length).toBeLessThanOrEqual(3);
    for (const p of placements) {
      expect(occ.has(`${p.x},${p.y}`)).toBe(false);
    }
  });

  it('land tables and texture keys are deco_*', () => {
    expect(decoKindsForLand('woodz')).toContain('mushroom');
    expect(decoKindsForLand('dezertz')).toContain('pebble');
    expect(decoTextureKey('pebble')).toBe('deco_pebble');
    expect(decoTextureKey('ore_crumb')).toBe('deco_ore_crumb');
  });

  it('empty / all-wall grids place nothing', () => {
    expect(
      placeFloorDecorations({
        grid: gridOf(6, 6, 'wall'),
        roomId: 'wall_only',
        seed: 1,
      }),
    ).toEqual([]);
    expect(
      placeFloorDecorations({
        grid: [],
        roomId: 'empty',
        seed: 1,
      }),
    ).toEqual([]);
  });
});
