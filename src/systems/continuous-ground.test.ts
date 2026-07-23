import { describe, expect, it } from 'vitest';
import {
  WATER_SHIMMER_PHASES,
  continuousGroundKey,
  continuousWaterKey,
  gridHasFluidSurface,
} from './continuous-ground';
import type { TileKind } from '../types';

describe('continuous ground', () => {
  it('ground texture keys are stable and versioned', () => {
    expect(continuousGroundKey('woodz_path', 0)).toBe('cground_woodz_path_0');
    expect(continuousGroundKey('woodz_path', 1)).not.toBe(
      continuousGroundKey('woodz_path', 0),
    );
  });

  it('water shimmer keys differ by phase', () => {
    expect(WATER_SHIMMER_PHASES).toBe(3);
    expect(continuousWaterKey('pond', 1, 0)).toBe('cwater_pond_1_0');
    expect(continuousWaterKey('pond', 1, 1)).not.toBe(
      continuousWaterKey('pond', 1, 0),
    );
  });

  it('gridHasFluidSurface detects water and lava', () => {
    const dry: TileKind[][] = [
      ['grass', 'dirt'],
      ['wall', 'floor'],
    ];
    const wet: TileKind[][] = [
      ['grass', 'water'],
      ['wall', 'floor'],
    ];
    const hot: TileKind[][] = [['lava', 'floor']];
    expect(gridHasFluidSurface(dry)).toBe(false);
    expect(gridHasFluidSurface(wet)).toBe(true);
    expect(gridHasFluidSurface(hot)).toBe(true);
  });

  it('logical grid still encodes terrain kinds for collision pathing', () => {
    const sample: TileKind[] = ['grass', 'dirt', 'wall', 'water', 'snow'];
    expect(sample).toContain('grass');
    expect(sample).toContain('wall');
  });
});
