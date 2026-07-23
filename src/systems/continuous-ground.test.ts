import { describe, expect, it } from 'vitest';
import {
  WATER_SHIMMER_PHASES,
  continuousGroundKey,
  continuousWaterKey,
  gridHasFluidSurface,
  isStructureKind,
  structurePropTexture,
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

  it('structure props map doors and cave mouths to clear textures', () => {
    expect(isStructureKind('door')).toBe(true);
    expect(isStructureKind('stairs')).toBe(true);
    expect(isStructureKind('grass')).toBe(false);
    expect(structurePropTexture('door')).toBe('tile-door');
    expect(structurePropTexture('locked')).toBe('tile-locked');
    expect(structurePropTexture('stairs', 0)).toBe('tile-cave-mouth');
    expect(structurePropTexture('stairs', -1)).toBe('tile-stairs');
    expect(structurePropTexture('stairs_up')).toBe('tile-stairs-up');
    expect(structurePropTexture('entrance')).toBe('tile-cave-mouth');
  });
});
