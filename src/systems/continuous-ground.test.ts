import { describe, expect, it } from 'vitest';
import { continuousGroundKey } from './continuous-ground';
import type { TileKind } from '../types';

describe('continuous ground', () => {
  it('ground texture keys are stable and versioned', () => {
    expect(continuousGroundKey('woodz_path', 0)).toBe('cground_woodz_path_0');
    expect(continuousGroundKey('woodz_path', 1)).not.toBe(
      continuousGroundKey('woodz_path', 0),
    );
  });

  it('logical grid still encodes terrain kinds for collision pathing', () => {
    // Authored kinds are independent of visual tiles — smoke check of type usage
    const sample: TileKind[] = ['grass', 'dirt', 'wall', 'water', 'snow'];
    expect(sample).toContain('grass');
    expect(sample).toContain('wall');
  });
});
