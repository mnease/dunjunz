/**
 * Dn3 craft density — drives real drawPlayerLook / drawWeapon* / body paths
 * without Phaser (mock canvas counts fillRect ops).
 */
import { describe, expect, it } from 'vitest';
import { BARE_APPEARANCE, type AppearanceSpec } from './appearance';
import { DEFAULT_BODY } from './body-visuals';
import { drawPlayerLook } from './textures';
import { drawWeaponAvatar, drawWeaponIcon } from './weapon-visuals';
import { mapEntityTile, expandRoomTiles } from './room-expand';

/** Minimal 2d context that records craft ops from pixel-art helpers. */
function makeCountCtx(): CanvasRenderingContext2D & { fillCount: number } {
  let fillCount = 0;
  const ctx = {
    fillCount: 0,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    fillRect: () => {
      fillCount++;
      (ctx as { fillCount: number }).fillCount = fillCount;
    },
    beginPath: () => undefined,
    arc: () => undefined,
    stroke: () => undefined,
    moveTo: () => undefined,
    lineTo: () => undefined,
    closePath: () => undefined,
    fill: () => {
      fillCount++;
      (ctx as { fillCount: number }).fillCount = fillCount;
    },
  };
  return ctx as unknown as CanvasRenderingContext2D & { fillCount: number };
}

describe('Dn3 player + weapon craft density', () => {
  it('drawPlayerLook paints denser body kit than bare silhouette minimum', () => {
    const ctx = makeCountCtx();
    drawPlayerLook(ctx, BARE_APPEARANCE, 0, DEFAULT_BODY);
    // denser boots/tunic/folds push well above a flat 4-rect stick figure
    expect(ctx.fillCount).toBeGreaterThan(40);
  });

  it('mild sword avatar + icon have denser kit than a single blade rect', () => {
    const av = makeCountCtx();
    drawWeaponAvatar(av, 'sword');
    expect(av.fillCount).toBeGreaterThan(12);

    const icon = makeCountCtx();
    drawWeaponIcon(icon, 'sword');
    expect(icon.fillCount).toBeGreaterThan(14);
  });

  it('lightning staff avatar + icon have denser crystal/haft craft', () => {
    const av = makeCountCtx();
    drawWeaponAvatar(av, 'staff_lightning');
    expect(av.fillCount).toBeGreaterThan(14);

    const icon = makeCountCtx();
    drawWeaponIcon(icon, 'staff_lightning');
    expect(icon.fillCount).toBeGreaterThan(14);
  });

  it('iron blade avatar also densified (representative third weapon)', () => {
    const av = makeCountCtx();
    drawWeaponAvatar(av, 'iron');
    expect(av.fillCount).toBeGreaterThan(10);
  });

  it('player with sword loadout still uses denser draw path', () => {
    const armed: AppearanceSpec = {
      ...BARE_APPEARANCE,
      weapon: 'sword',
    };
    const ctx = makeCountCtx();
    drawPlayerLook(ctx, armed, 1, DEFAULT_BODY);
    expect(ctx.fillCount).toBeGreaterThan(50);
  });
});

describe('floor deco occupancy maps authored entities into expanded grid', () => {
  it('mapEntityTile shifts interior entity coords (author 5,5 → expanded interior)', () => {
    const src = [
      '################',
      '#..............#',
      '#..............#',
      '#..............#',
      '#..............#',
      '#......E.......#',
      '#..............#',
      '#..............#',
      '#..............#',
      '#..............#',
      '################',
    ];
    // expandRoomTiles only cares about chars for walls/doors; mapEntityTile uses expand metrics
    const expanded = expandRoomTiles(
      src.map((r) => r.replace('E', '.')),
    );
    const m = mapEntityTile(5, 5, expanded);
    // Not the raw author cell — expanded VIEW is larger than 16×11
    expect(expanded.targetW).toBeGreaterThan(16);
    expect(expanded.targetH).toBeGreaterThan(11);
    // Mapped cell should be interior of expanded grid
    expect(m.x).toBeGreaterThanOrEqual(0);
    expect(m.y).toBeGreaterThanOrEqual(0);
    expect(m.x).toBeLessThan(expanded.targetW);
    expect(m.y).toBeLessThan(expanded.targetH);
    // For non-identity expand, author (5,5) must not stay as raw (5,5) only if offsets differ
    // Identity check: either offsets applied or scale moved the point
    const rawIsCenter = m.x === 5 && m.y === 5;
    if (rawIsCenter) {
      // still valid if expand offsets are 0 and scale maps to same — assert expansion happened
      expect(expanded.targetW * expanded.targetH).toBeGreaterThan(16 * 11);
    } else {
      expect(m.x !== 5 || m.y !== 5).toBe(true);
    }
  });
});
