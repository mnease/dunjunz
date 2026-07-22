/**
 * Carried light + dark-room vision (pure helpers).
 * Torches/lanterns/flashlights burn finite fuel; wall torches ease ambient dark.
 */

import type { SaveData } from '../types';

export type LightTier = 'torch' | 'lantern' | 'flashlight';

/** Burn durations (ms) while carried light is active in a dark room. */
export const LIGHT_BURN_MS: Record<LightTier, number> = {
  torch: 90_000, // ~90s
  lantern: 180_000, // ~3 min
  flashlight: 300_000, // ~5 min
};

/** Overlay alpha when dark: higher = darker. */
export const LIGHT_DARK_ALPHA: Record<'none' | LightTier, number> = {
  none: 0.88,
  torch: 0.48,
  lantern: 0.3,
  flashlight: 0.14,
};

/** Wall torches in room reduce darkness (never below flashlight floor). */
export const WALL_TORCH_ALPHA_REDUCTION = 0.12;

export const LIGHT_ITEM_IDS: readonly LightTier[] = [
  'torch',
  'lantern',
  'flashlight',
] as const;

export function isLightItemId(id: string): id is LightTier {
  return (LIGHT_ITEM_IDS as readonly string[]).includes(id);
}

/**
 * Deep basements (B2+) are dark unless room.dark === false.
 * Surface / B1 stay lit by default.
 */
export function roomIsDark(room: {
  floor?: number;
  dark?: boolean;
  land?: string;
}): boolean {
  if (room.dark === true) return true;
  if (room.dark === false) return false;
  const f = room.floor ?? 0;
  return f <= -2;
}

export function lightBurnMs(tier: LightTier): number {
  return LIGHT_BURN_MS[tier];
}

export function activeLightTier(save: SaveData): LightTier | 'none' {
  const t = save.activeLight;
  if (t === 'torch' || t === 'lantern' || t === 'flashlight') {
    if ((save.lightFuelMs ?? 0) > 0) return t;
  }
  return 'none';
}

/** True if carried light is still burning. */
export function hasActiveCarriedLight(save: SaveData): boolean {
  return activeLightTier(save) !== 'none';
}

/**
 * Vision darkness alpha for a dark room.
 * wallTorchCount eases ambient; carried light is primary.
 */
export function visionDarkAlpha(
  save: SaveData,
  opts: { darkRoom: boolean; wallTorchCount?: number },
): number {
  if (!opts.darkRoom) return 0;
  const tier = activeLightTier(save);
  let a = LIGHT_DARK_ALPHA[tier];
  const walls = Math.max(0, opts.wallTorchCount ?? 0);
  if (walls > 0) {
    a = Math.max(
      LIGHT_DARK_ALPHA.flashlight,
      a - WALL_TORCH_ALPHA_REDUCTION * Math.min(3, walls),
    );
  }
  return a;
}

/** Ignite a light tier (does not consume stacks — caller consumes). */
export function igniteLight(save: SaveData, tier: LightTier): SaveData {
  return {
    ...save,
    activeLight: tier,
    lightFuelMs: LIGHT_BURN_MS[tier],
  };
}

/**
 * Burn fuel while in a dark room with active light.
 * Returns save + whether light just expired.
 */
export function tickLightFuel(
  save: SaveData,
  dtMs: number,
  burning: boolean,
): { save: SaveData; expired: boolean } {
  if (!burning) return { save, expired: false };
  const tier = activeLightTier(save);
  if (tier === 'none') return { save, expired: false };
  const fuel = Math.max(0, (save.lightFuelMs ?? 0) - Math.max(0, dtMs));
  if (fuel <= 0) {
    return {
      save: { ...save, activeLight: null, lightFuelMs: 0 },
      expired: true,
    };
  }
  return {
    save: { ...save, lightFuelMs: fuel, activeLight: tier },
    expired: false,
  };
}

/** Extinguish without consuming remaining fuel item. */
export function extinguishLight(save: SaveData): SaveData {
  return { ...save, activeLight: null, lightFuelMs: 0 };
}

/** Lantern lasts strictly longer than torch; flashlight longer than lantern. */
export function lightTierRank(tier: LightTier | 'none'): number {
  if (tier === 'none') return 0;
  if (tier === 'torch') return 1;
  if (tier === 'lantern') return 2;
  return 3;
}
