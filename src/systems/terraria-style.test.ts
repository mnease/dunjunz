import { describe, expect, it } from 'vitest';
import {
  shouldApplyTerrariaEntityPass,
  terrariaEntityPassOpts,
  terrariaSeedFromKey,
} from './terraria-style';

describe('terraria style', () => {
  it('entity pass selector skips tiles and UI, keeps creeps/trees', () => {
    expect(shouldApplyTerrariaEntityPass('tile-grass')).toBe(false);
    expect(shouldApplyTerrariaEntityPass('tile-door')).toBe(false);
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

  it('soft ambient opts skip jagged grow (no tile-cage outline)', () => {
    const koi = terrariaEntityPassOpts('koi');
    expect(koi.jagged).toBe(false);
    expect(koi.shadow).toBe(false);
    expect(koi.outline).toBe(true);
    const crab = terrariaEntityPassOpts('crab');
    expect(crab.jagged).toBe(false);
    const slime = terrariaEntityPassOpts('slime');
    expect(slime.jagged).toBe(true);
    expect(slime.shadow).toBe(true);
  });

  it('seed from key is stable', () => {
    expect(terrariaSeedFromKey('slime')).toBe(terrariaSeedFromKey('slime'));
    expect(terrariaSeedFromKey('a')).not.toBe(terrariaSeedFromKey('b'));
  });
});
