/**
 * Graphics-v2 Phase S — continuous-ground hard-delete hygiene.
 * Proves the shipped tree cannot re-enter the continuous paint path.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const systemsDir = here;
const gameScenePath = join(here, '../scenes/GameScene.ts');

describe('Graphics-v2 Phase S strip', () => {
  it('continuous-ground module is absent from active src/systems', () => {
    expect(existsSync(join(systemsDir, 'continuous-ground.ts'))).toBe(false);
    expect(existsSync(join(systemsDir, 'continuous-ground.test.ts'))).toBe(
      false,
    );
  });

  it('GameScene uses discrete placeRoomTiles only (no continuous paint)', () => {
    const gs = readFileSync(gameScenePath, 'utf8');
    expect(gs).toContain('placeRoomTiles');
    expect(gs).not.toMatch(/paintContinuousGround/);
    expect(gs).not.toMatch(/paintContinuousWaterOverlay/);
    expect(gs).not.toMatch(/from ['"].*continuous-ground['"]/);
    expect(gs).not.toMatch(/continuousGroundKey|continuousWaterKey/);
  });

  it('no src file imports continuous-ground', () => {
    // Scanned via reading GameScene + boot/textures entry points used at runtime
    const roots = [
      join(here, '../scenes/GameScene.ts'),
      join(here, '../scenes/BootScene.ts'),
      join(here, 'textures.ts'),
    ];
    for (const p of roots) {
      if (!existsSync(p)) continue;
      const src = readFileSync(p, 'utf8');
      expect(src, p).not.toMatch(/continuous-ground/);
      expect(src, p).not.toMatch(/paintContinuous/);
    }
  });
});
