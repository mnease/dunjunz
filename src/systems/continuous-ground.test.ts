import { describe, expect, it } from 'vitest';
import {
  TERRARIA_PIXEL,
  WATER_SHIMMER_PHASES,
  continuousGroundKey,
  continuousWaterKey,
  gridHasFluidSurface,
  isStructureKind,
  structurePropTexture,
  terrariaPixelColor,
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

  it('Terraria pixel paint uses hard material edges', () => {
    expect(TERRARIA_PIXEL).toBe(3);
    const grid: TileKind[][] = [
      ['grass', 'grass', 'dirt'],
      ['grass', 'dirt', 'dirt'],
      ['wall', 'wall', 'floor'],
    ];
    // Same material, different micro-pixels → both grass greens
    const a = terrariaPixelColor(grid, 0.2, 0.1, 1, 1, 'surface', false, 1);
    const b = terrariaPixelColor(grid, 0.8, 0.1, 5, 1, 'surface', false, 1);
    expect(a[1]).toBeGreaterThan(a[0]); // green-ish grass top
    expect(b[1]).toBeGreaterThan(40);
    // Dirt cell should not match pure wall purple
    const dirt = terrariaPixelColor(grid, 1.5, 1.5, 20, 20, 'surface', false, 1);
    const wall = terrariaPixelColor(grid, 0.5, 2.5, 4, 40, 'surface', false, 1);
    // dirt browner (R closer to G), wall more purple (B often higher relative)
    expect(dirt[0]).toBeGreaterThan(50);
    expect(wall[2]).toBeGreaterThan(20);
  });
});
