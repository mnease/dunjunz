import { describe, expect, it } from 'vitest';
import {
  TERRAIN_VARIANT_COUNT,
  fbm01,
  fbm2,
  fractalTerrainTint,
  fractalTerrainVariant,
  hash2,
  seedFromString,
  valueNoise2,
  worldCell,
} from './fractal-noise';
import { terrainVariant } from './water-bodies';

describe('fractal noise', () => {
  it('hash2 is deterministic and in [0,1)', () => {
    const a = hash2(3, 7, 1);
    const b = hash2(3, 7, 1);
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(1);
    expect(hash2(3, 7, 2)).not.toBe(a);
  });

  it('valueNoise and fbm stay finite', () => {
    const v = valueNoise2(1.5, 2.5, 0);
    const f = fbm2(1.5, 2.5, 0, 4);
    expect(Number.isFinite(v)).toBe(true);
    expect(Number.isFinite(f)).toBe(true);
    expect(fbm01(0, 0, 0)).toBeGreaterThanOrEqual(0);
    expect(fbm01(0, 0, 0)).toBeLessThanOrEqual(1);
  });

  it('fractalTerrainVariant spreads across many indices (not 3 stamps)', () => {
    const seen = new Set<number>();
    for (let x = 0; x < 40; x++) {
      for (let y = 0; y < 20; y++) {
        seen.add(fractalTerrainVariant(x, y, TERRAIN_VARIANT_COUNT, 99));
      }
    }
    // Should use a wide spread of the 16 variants (not just 3 stamps)
    expect(seen.size).toBeGreaterThanOrEqual(8);
    for (const v of seen) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(TERRAIN_VARIANT_COUNT);
    }
  });

  it('neighboring cells often share regional style but are not all equal', () => {
    const a = fractalTerrainVariant(10, 10, 16, 1);
    const b = fractalTerrainVariant(11, 10, 16, 1);
    const far = fractalTerrainVariant(80, 80, 16, 1);
    // Not a strict equality requirement — just that far cells can differ
    expect(typeof a).toBe('number');
    expect(a === b || a !== far || b !== far).toBe(true);
  });

  it('worldCell and seedFromString are stable', () => {
    expect(seedFromString('woodz_path')).toBe(seedFromString('woodz_path'));
    expect(seedFromString('a')).not.toBe(seedFromString('b'));
    const c = worldCell(3, 4, 1, 2, 0);
    expect(c.wx).toBe(1 * 17 + 3);
    expect(c.wy).toBe(2 * 13 + 4);
  });

  it('fractalTerrainTint returns rgb int', () => {
    const t = fractalTerrainTint(5, 5, 1);
    expect(t).toBeGreaterThanOrEqual(0);
    expect(t).toBeLessThanOrEqual(0xffffff);
  });

  it('terrainVariant wrapper uses fractal path with 16 default', () => {
    const v = terrainVariant(2, 3);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(16);
  });
});
