/**
 * Phase B shore — drives shipped adjacency + land-aware resolve (no Phaser).
 */
import { describe, expect, it } from 'vitest';
import type { TileKind } from '../types';
import { resolveAutotileTextureKey } from './autotile';
import {
  hasWaterNeighbor4,
  isShoreBlockedKind,
  isShoreEligibleLand,
  resolveShoreTextureKey,
  shoreMaterialForContext,
  shoreTextureKey,
} from './shore';

function grid(rows: string[]): TileKind[][] {
  return rows.map((row) =>
    row.split('').map((c) => {
      if (c === '~') return 'water';
      if (c === '=') return 'lava';
      if (c === '#') return 'wall';
      if (c === 'D') return 'door';
      if (c === 'g') return 'grass';
      if (c === 'd') return 'dirt';
      if (c === 's') return 'sand';
      if (c === 'n') return 'snow';
      if (c === '.') return 'floor';
      return 'void';
    }),
  );
}

describe('shore Phase B', () => {
  it('1-cell rim around pond gets shore; interior land away from water does not', () => {
    //  d d d d d
    //  d ~ ~ ~ d
    //  d ~ ~ ~ d
    //  d ~ ~ ~ d
    //  d d d d d
    const g = grid([
      'ddddd',
      'd~~~d',
      'd~~~d',
      'd~~~d',
      'ddddd',
    ]);
    // Rim land adjacent to water
    expect(resolveShoreTextureKey(g, 0, 1, 'surface')).toBe('at-shore-dirt');
    expect(resolveShoreTextureKey(g, 1, 0, 'surface')).toBe('at-shore-dirt');
    expect(resolveShoreTextureKey(g, 4, 2, 'surface')).toBe('at-shore-dirt');
    // Corner of rim (diagonal-only to water at 1,1) — 4-neigh only: (0,0) neighbors are (1,0)d and (0,1)d — neither water
    // (0,0) is diagonal to water → must NOT be shore (no fatten)
    expect(hasWaterNeighbor4(g, 0, 0)).toBe(false);
    expect(resolveShoreTextureKey(g, 0, 0, 'surface')).toBeNull();
    // Far exterior if we had more dirt — use center of top row which touches water below
    // Interior water stays fluid autotile, never shore
    expect(resolveShoreTextureKey(g, 2, 2, 'surface')).toBeNull();
    expect(resolveAutotileTextureKey(g, 2, 2)).toBe('at-water-15');
  });

  it('water cells never resolve to shore keys', () => {
    const g = grid(['ddd', 'd~d', 'ddd']);
    expect(resolveShoreTextureKey(g, 1, 1, 'surface')).toBeNull();
    expect(resolveAutotileTextureKey(g, 1, 1)).toMatch(/^at-water-/);
  });

  it('walls and doors adjacent to water never get shore', () => {
    const g = grid(['#~#', 'D~d', '###']);
    expect(isShoreBlockedKind('wall')).toBe(true);
    expect(isShoreBlockedKind('door')).toBe(true);
    expect(resolveShoreTextureKey(g, 0, 0, 'surface')).toBeNull();
    expect(resolveShoreTextureKey(g, 0, 1, 'surface')).toBeNull();
    // dirt next to water still shores
    expect(resolveShoreTextureKey(g, 2, 1, 'surface')).toBe('at-shore-dirt');
  });

  it('land-aware materials: beach sand, dwarvez snow, dunjunz cave, woodz dirt', () => {
    expect(shoreMaterialForContext('surface', 'beach_start')).toBe('sand');
    expect(shoreMaterialForContext('dezertz')).toBe('sand');
    expect(shoreMaterialForContext('dwarvez')).toBe('snow');
    expect(shoreMaterialForContext('dunjunz')).toBe('cave');
    expect(shoreMaterialForContext('woodz')).toBe('dirt');
    expect(shoreTextureKey('sand')).toBe('at-shore-sand');
    const g = grid(['sss', 's~s', 'sss']);
    expect(resolveShoreTextureKey(g, 0, 1, 'surface', 'beach_start')).toBe(
      'at-shore-sand',
    );
    expect(resolveShoreTextureKey(g, 0, 1, 'dwarvez')).toBe('at-shore-snow');
    expect(resolveShoreTextureKey(g, 0, 1, 'dunjunz')).toBe('at-shore-cave');
  });

  it('isolated water with grass ring: only N4 land is shore', () => {
    const g = grid(['ggg', 'g~g', 'ggg']);
    expect(resolveShoreTextureKey(g, 1, 0, 'woodz')).toBe('at-shore-dirt');
    expect(resolveShoreTextureKey(g, 0, 1, 'woodz')).toBe('at-shore-dirt');
    // corner grass diagonal-only → no shore
    expect(resolveShoreTextureKey(g, 0, 0, 'woodz')).toBeNull();
    expect(isShoreEligibleLand('grass')).toBe(true);
  });

  it('lava does not create water-shore adjacency', () => {
    const g = grid(['ddd', 'd=d', 'ddd']);
    // no water → no shore
    expect(hasWaterNeighbor4(g, 1, 0)).toBe(false);
    expect(resolveShoreTextureKey(g, 1, 0, 'surface')).toBeNull();
  });
});
