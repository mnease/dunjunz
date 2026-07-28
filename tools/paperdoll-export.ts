/**
 * Browser tool: draw full-armor paperdoll via real drawPlayerLook
 * (same 32→64 path as canvasTex), then NN upscale for the website.
 */
import { ART_BASE, ART_RES } from '../src/config';
import type { AppearanceSpec } from '../src/systems/appearance';
import { DEFAULT_BODY } from '../src/systems/body-visuals';
import { drawPlayerLook } from '../src/systems/textures';
import {
  applyTerrariaEntityPass,
  terrariaEntityPassOpts,
} from '../src/systems/terraria-style';

/** Full plate loadout for marketing paperdoll (matches in-game looks). */
export const ARMORED_APPEARANCE: AppearanceSpec = {
  breastplate: 'plate',
  helmet: 'plate',
  greaves: 'plate',
  shoes: 'leather',
  gloves: 'leather',
  amulet: 'gold',
  ring: 'silver',
  weapon: 'sword',
  shield: 'tower',
  key: 'none',
};

/** Final website size (nearest-neighbor from ART_RES). */
const OUT = 512;

function main(): void {
  const out = document.getElementById('out') as HTMLCanvasElement;
  out.width = OUT;
  out.height = OUT;

  // 1) Author-space draw upscaled to ART_RES (mirrors textures.canvasTex)
  const mid = document.createElement('canvas');
  mid.width = ART_RES;
  mid.height = ART_RES;
  const mctx = mid.getContext('2d')!;
  mctx.imageSmoothingEnabled = false;
  mctx.clearRect(0, 0, ART_RES, ART_RES);
  mctx.save();
  mctx.scale(ART_RES / ART_BASE, ART_RES / ART_BASE);
  drawPlayerLook(mctx, ARMORED_APPEARANCE, 0, DEFAULT_BODY);
  mctx.restore();
  applyTerrariaEntityPass(
    mctx,
    ART_RES,
    ART_RES,
    terrariaEntityPassOpts('player'),
  );

  // 2) NN upscale to website size, centered with padding
  const octx = out.getContext('2d')!;
  octx.imageSmoothingEnabled = false;
  octx.clearRect(0, 0, OUT, OUT);
  // Slight padding so outline/shadow aren't clipped
  const pad = Math.floor(OUT * 0.06);
  const size = OUT - pad * 2;
  octx.drawImage(mid, 0, 0, ART_RES, ART_RES, pad, pad, size, size);

  document.documentElement.dataset.paperdollReady = '1';
  (window as unknown as { __paperdollReady?: boolean }).__paperdollReady =
    true;
}

main();
