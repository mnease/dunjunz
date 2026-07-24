/**
 * Phase A fluids + Phase C land — drives shipped mask/frame resolution.
 */
import { describe, expect, it } from 'vitest';
import type { TileKind } from '../types';
import {
  EDGE_E,
  EDGE_N,
  EDGE_S,
  EDGE_W,
  allEdgeMasks,
  allLandMaterials,
  autotileTextureKey,
  edgeMask4,
  fluidAutotileKey,
  fluidMatch,
  isAutotileFluid,
  isAutotileLand,
  isFullFillMask,
  isStructureVisualKind,
  landAutotileKey,
  landMatch,
  resolveAutotileTextureKey,
  resolveLandAutotileTextureKey,
  structureTextureKey,
} from './autotile';

function grid(rows: string[]): TileKind[][] {
  return rows.map((row) =>
    row.split('').map((c) => {
      if (c === '~') return 'water';
      if (c === '=') return 'lava';
      if (c === '#') return 'wall';
      if (c === 'g') return 'grass';
      if (c === 'd') return 'dirt';
      if (c === 's') return 'sand';
      if (c === 'n') return 'snow';
      if (c === '.') return 'floor';
      if (c === 'D') return 'door';
      if (c === 'S') return 'stairs';
      return 'void';
    }),
  );
}

describe('edgeMask4 fluids (Phase A)', () => {
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
    expect(edgeMask4(g, 2, 2, fluidMatch('water'))).toBe(
      EDGE_N | EDGE_E | EDGE_S | EDGE_W,
    );
    expect(isFullFillMask(15)).toBe(true);
    expect(fluidAutotileKey(g, 2, 2)).toBe('at-water-15');
  });

  it('every sample in 3×3 pond interior resolves to fluid full-fill family', () => {
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
        interiorKeys.push(key!);
        if (x === 2 && y === 2) {
          expect(key).toBe('at-water-15');
        }
      }
    }
    expect(interiorKeys).toHaveLength(9);
  });

  it('corridor edge only matches along the channel', () => {
    const g = grid(['#####', '~~~~~', '#####']);
    expect(edgeMask4(g, 2, 1, fluidMatch('water'))).toBe(EDGE_E | EDGE_W);
    expect(fluidAutotileKey(g, 2, 1)).toBe('at-water-10');
  });

  it('lava only connects to lava, not water', () => {
    const g = grid(['~~~', '~=~', '~~~']);
    expect(edgeMask4(g, 1, 1, fluidMatch('lava'))).toBe(0);
    expect(fluidAutotileKey(g, 1, 1)).toBe('at-lava-0');
  });
});

describe('land edge masks (Phase C)', () => {
  it('interior grass is full-fill at-grass-15', () => {
    const g = grid([
      'ggggg',
      'ggggg',
      'ggggg',
      'ggggg',
      'ggggg',
    ]);
    expect(landAutotileKey(g, 2, 2)).toBe('at-grass-15');
    expect(isFullFillMask(edgeMask4(g, 2, 2, landMatch('grass')))).toBe(true);
  });

  it('grass–dirt edge: grass cell open toward dirt is not full-fill', () => {
    // left grass block, right dirt block
    const g = grid([
      'gggddd',
      'gggddd',
      'gggddd',
    ]);
    // Grass at boundary (2,1) — E is dirt → open E
    const mask = edgeMask4(g, 2, 1, landMatch('grass'));
    expect(mask & EDGE_E).toBe(0);
    expect(isFullFillMask(mask)).toBe(false);
    const key = resolveLandAutotileTextureKey(g, 2, 1);
    expect(key).toMatch(/^at-grass-\d+$/);
    expect(key).not.toBe('at-grass-15');
    // Dirt at (3,1) open toward grass W
    const dKey = resolveLandAutotileTextureKey(g, 3, 1);
    expect(dKey).toMatch(/^at-dirt-\d+$/);
    expect(dKey).not.toBe('at-dirt-15');
  });

  it('wall corridor: side walls have open edges to floor path', () => {
    // #.# corridor vertical strip of floor
    const g = grid([
      '#####',
      '#...#',
      '#...#',
      '#...#',
      '#####',
    ]);
    // Wall left of corridor (0,2) — only E may match wall? actually E is floor
    // Wall at (0,2) neighbors: N wall, S wall, E floor, W OOB
    const mask = edgeMask4(g, 0, 2, landMatch('wall'));
    expect(mask & EDGE_E).toBe(0); // open to floor
    expect(isFullFillMask(mask)).toBe(false);
    expect(landAutotileKey(g, 0, 2)).toMatch(/^at-wall-\d+$/);
    // Interior wall on border row fully matched N-S? use thick wall block
    const thick = grid([
      '#####',
      '#####',
      '#####',
    ]);
    expect(landAutotileKey(thick, 2, 1)).toBe('at-wall-15');
  });

  it('isolated dirt cell is mask 0 full open edges', () => {
    const g = grid(['ggg', 'gdg', 'ggg']);
    expect(edgeMask4(g, 1, 1, landMatch('dirt'))).toBe(0);
    expect(landAutotileKey(g, 1, 1)).toBe('at-dirt-0');
  });

  it('structure kinds are not land autotile', () => {
    const g = grid(['ddd', 'dDd', 'ddd']);
    expect(isStructureVisualKind('door')).toBe(true);
    expect(isAutotileLand('door')).toBe(false);
    expect(landAutotileKey(g, 1, 1)).toBeNull();
    expect(structureTextureKey('door')).toBe('tile-door');
    expect(structureTextureKey('stairs', 0)).toBe('tile-cave-mouth');
    expect(structureTextureKey('stairs', -1)).toBe('tile-stairs');
    expect(structureTextureKey('entrance')).toBe('tile-cave-mouth');
  });

  it('allLandMaterials lists grass dirt wall snow floor sand', () => {
    const m = allLandMaterials();
    expect(m).toContain('grass');
    expect(m).toContain('dirt');
    expect(m).toContain('wall');
    expect(m).toContain('snow');
    expect(m).toContain('floor');
    expect(m).toContain('sand');
  });

  it('autotileTextureKey clamps mask', () => {
    expect(autotileTextureKey('grass', 15)).toBe('at-grass-15');
    expect(autotileTextureKey('dirt', 0)).toBe('at-dirt-0');
    expect(autotileTextureKey('wall', 99)).toBe('at-wall-15');
  });

  it('allEdgeMasks has 16 unique values', () => {
    expect(allEdgeMasks()).toHaveLength(16);
    expect(new Set(allEdgeMasks()).size).toBe(16);
  });

  it('isAutotileFluid / isAutotileLand classification', () => {
    expect(isAutotileFluid('water')).toBe(true);
    expect(isAutotileLand('grass')).toBe(true);
    expect(isAutotileLand('water')).toBe(false);
    expect(isAutotileFluid('dirt')).toBe(false);
  });
});
