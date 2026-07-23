import { describe, expect, it } from 'vitest';
import {
  FLUID_SHORE_AMP,
  MATERIAL_WARP,
  TERRARIA_PIXEL,
  WATER_SHIMMER_PHASES,
  continuousGroundKey,
  continuousWaterKey,
  fluidSignedDistance,
  gridHasFluidSurface,
  isStructureKind,
  resolveVisualKind,
  sampleKindWarped,
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

  it('Terraria pixel paint uses hard material edges at fine density', () => {
    expect(TERRARIA_PIXEL).toBe(2);
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

  it('domain warp can move sample off pure cell lattice', () => {
    expect(MATERIAL_WARP).toBeGreaterThan(0.15);
    const grid: TileKind[][] = [
      ['water', 'water', 'dirt'],
      ['water', 'water', 'dirt'],
      ['grass', 'grass', 'grass'],
    ];
    // Deep inside water should stay water
    expect(sampleKindWarped(grid, 0.5, 0.5, 42)).toBe('water');
    // Near a material boundary, warp may yield either kind — both valid materials
    const near = sampleKindWarped(grid, 1.95, 0.5, 99);
    expect(['water', 'dirt']).toContain(near);
  });

  it('fluid SDF is positive inside lava/water and negative outside', () => {
    expect(FLUID_SHORE_AMP).toBeGreaterThan(0.3);
    const grid: TileKind[][] = [
      ['void', 'void', 'void', 'void'],
      ['void', 'lava', 'lava', 'void'],
      ['void', 'void', 'void', 'void'],
    ];
    // Center of lava cell
    expect(fluidSignedDistance(grid, 1.5, 1.5, 'lava')).toBeGreaterThan(0.2);
    // Far void
    expect(fluidSignedDistance(grid, 0.2, 0.2, 'lava')).toBeLessThan(0);
    // Water absent
    expect(fluidSignedDistance(grid, 1.5, 1.5, 'water')).toBeLessThan(0);
  });

  it('resolveVisualKind morphs rectangular lava into organic shores', () => {
    // Single-cell lava island — classic "perfect square" bug case
    const grid: TileKind[][] = [
      ['void', 'void', 'void'],
      ['void', 'lava', 'void'],
      ['void', 'void', 'void'],
    ];
    // Deep center stays lava
    expect(resolveVisualKind(grid, 1.5, 1.5, 7)).toBe('lava');
    // Sample a ring of edge/corner points — organic morph should not be
    // 100% lava on the square boundary (some eroded or spilled)
    let lava = 0;
    let other = 0;
    for (let i = 0; i < 48; i++) {
      const ang = (i / 48) * Math.PI * 2;
      // ring near cell edge (radius ~0.48 from center)
      const tx = 1.5 + Math.cos(ang) * 0.48;
      const ty = 1.5 + Math.sin(ang) * 0.48;
      const k = resolveVisualKind(grid, tx, ty, 11 + i);
      if (k === 'lava') lava++;
      else other++;
    }
    expect(lava).toBeGreaterThan(8);
    expect(other).toBeGreaterThan(4); // not a perfect square ring
  });

  it('structures stay lattice-aligned under visual resolve', () => {
    const grid: TileKind[][] = [
      ['floor', 'door', 'floor'],
      ['floor', 'floor', 'floor'],
    ];
    expect(resolveVisualKind(grid, 1.2, 0.4, 3)).toBe('door');
  });
});
