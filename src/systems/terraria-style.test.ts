import { describe, expect, it } from 'vitest';
import {
  fluidAnimAltKey,
  fluidAnimFramePair,
  isSolidFluidAutotileKey,
} from './autotile';
import {
  FOLIAGE_OUTLINE,
  isFoliageEntityKey,
  isSoftAmbientEntityKey,
  shouldApplyTerrariaEntityPass,
  terrariaEntityPassOpts,
  terrariaSeedFromKey,
} from './terraria-style';

describe('entity polish Phase D', () => {
  it('entity pass selector skips tiles, terrain at-*, UI; keeps creeps/trees', () => {
    expect(shouldApplyTerrariaEntityPass('tile-grass')).toBe(false);
    expect(shouldApplyTerrariaEntityPass('tile-door')).toBe(false);
    expect(shouldApplyTerrariaEntityPass('at-water-15')).toBe(false);
    expect(shouldApplyTerrariaEntityPass('at-grass-3')).toBe(false);
    expect(shouldApplyTerrariaEntityPass('at-shore-dirt')).toBe(false);
    expect(shouldApplyTerrariaEntityPass('icon_sword')).toBe(false);
    expect(shouldApplyTerrariaEntityPass('light_cookie')).toBe(false);
    expect(shouldApplyTerrariaEntityPass('cground_x_1')).toBe(false);
    expect(shouldApplyTerrariaEntityPass('slime')).toBe(true);
    expect(shouldApplyTerrariaEntityPass('tree')).toBe(true);
    expect(shouldApplyTerrariaEntityPass('wolf')).toBe(true);
    expect(shouldApplyTerrariaEntityPass('torch_wall')).toBe(true);
    expect(shouldApplyTerrariaEntityPass('best_bud')).toBe(true);
    expect(shouldApplyTerrariaEntityPass('glamdolph')).toBe(true);
    expect(shouldApplyTerrariaEntityPass('koi')).toBe(true);
  });

  it('soft ambient opts skip outline/jagged/shadow (no zebra hatch)', () => {
    expect(isSoftAmbientEntityKey('koi')).toBe(true);
    expect(isSoftAmbientEntityKey('sign')).toBe(true);
    expect(isSoftAmbientEntityKey('crab')).toBe(true);
    expect(isSoftAmbientEntityKey('slime')).toBe(false);
    const koi = terrariaEntityPassOpts('koi');
    expect(koi.jagged).toBe(false);
    expect(koi.shadow).toBe(false);
    expect(koi.outline).toBe(false);
    expect(koi.snap).toBe(false);
    const crab = terrariaEntityPassOpts('crab');
    expect(crab.outline).toBe(false);
    expect(crab.jagged).toBe(false);
    const slime = terrariaEntityPassOpts('slime');
    expect(slime.jagged).toBe(false);
    expect(slime.shadow).toBe(true);
    expect(slime.outline).toBe(true);
    const player = terrariaEntityPassOpts('player');
    expect(player.outline).toBe(true);
    expect(player.shadow).toBe(true);
    expect(player.jagged).toBe(false);
  });

  it('foliage gets soft green cardinal rim, not purple-black sticker', () => {
    expect(isFoliageEntityKey('tree')).toBe(true);
    expect(isFoliageEntityKey('tree_redwood')).toBe(true);
    expect(isFoliageEntityKey('cactus')).toBe(true);
    expect(isFoliageEntityKey('slime')).toBe(false);
    const tree = terrariaEntityPassOpts('tree');
    expect(tree.outline).toBe(true);
    expect(tree.outlineColor).toBe(FOLIAGE_OUTLINE);
    expect(tree.outlineCardinal).toBe(true);
    expect(tree.shadow).toBe(false);
    expect(tree.snap).toBe(false);
    expect(tree.jagged).toBe(false);
  });

  it('seed from key is stable', () => {
    expect(terrariaSeedFromKey('slime')).toBe(terrariaSeedFromKey('slime'));
    expect(terrariaSeedFromKey('a')).not.toBe(terrariaSeedFromKey('b'));
  });
});

describe('fluid anim silhouette-safe keys Phase D', () => {
  it('alt key only for solid at-water/lava masks', () => {
    expect(fluidAnimAltKey('at-water-15')).toBe('at-water-15-b');
    expect(fluidAnimAltKey('at-lava-0')).toBe('at-lava-0-b');
    expect(fluidAnimAltKey('tile-water')).toBeNull();
    expect(fluidAnimAltKey('at-grass-15')).toBeNull();
    expect(fluidAnimAltKey('at-water-15-b')).toBeNull();
  });

  it('frame pair stays in solid fluid family (no land/void)', () => {
    const pair = fluidAnimFramePair('at-water-15');
    expect(pair).toEqual(['at-water-15', 'at-water-15-b']);
    expect(pair!.every((k) => isSolidFluidAutotileKey(k))).toBe(true);
    expect(pair!.every((k) => !k.includes('grass') && !k.includes('void'))).toBe(
      true,
    );
  });

  it('isSolidFluidAutotileKey accepts base and -b only', () => {
    expect(isSolidFluidAutotileKey('at-water-15')).toBe(true);
    expect(isSolidFluidAutotileKey('at-water-15-b')).toBe(true);
    expect(isSolidFluidAutotileKey('at-dirt-3')).toBe(false);
    expect(isSolidFluidAutotileKey('tile-water-pond')).toBe(false);
  });
});
