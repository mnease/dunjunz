/**
 * Positional lighting + dark vision (pure helpers).
 *
 * Universal shadows: every crawl room samples ambient + light cookies.
 * Soft gradient falloff (smoothstep). Never pure black.
 * Carried torches/lanterns/flashlights burn fuel when the hero is not
 * already bright from placed/wall/gear light. Player can place permanent
 * wall torches (unlimited per room) in dark rooms.
 */

import type { SaveData } from '../types';

export type LightTier = 'torch' | 'lantern' | 'flashlight';

/** World px per tile (TILE * SCALE). */
export const CELL_PX_DEFAULT = 16 * 3; // 48

export const tilesToPx = (t: number, cell = CELL_PX_DEFAULT): number =>
  t * cell;
export const pxToTiles = (px: number, cell = CELL_PX_DEFAULT): number =>
  px / cell;

/** Burn durations (ms) while carried light is active and burning. */
export const LIGHT_BURN_MS: Record<LightTier, number> = {
  torch: 90_000,
  lantern: 180_000,
  flashlight: 300_000,
};

/** Legacy full-screen alpha anchors (tests / migration). */
export const LIGHT_DARK_ALPHA: Record<'none' | LightTier, number> = {
  none: 0.88,
  torch: 0.48,
  lantern: 0.3,
  flashlight: 0.14,
};

export const WALL_TORCH_ALPHA_REDUCTION = 0.12;

export const LIGHT_ITEM_IDS: readonly LightTier[] = [
  'torch',
  'lantern',
  'flashlight',
] as const;

export function isLightItemId(id: string): id is LightTier {
  return (LIGHT_ITEM_IDS as readonly string[]).includes(id);
}

// ── Ambient floors (universal shadows) ─────────────────────────────

/** Darkest crawl ambient (B2+ bare). Floor silhouettes always readable. */
export const AMBIENT_DARK = 0.12;
/** Fully outdoor surface (soft day). */
export const AMBIENT_SURFACE = 0.9;
/** Indoor surface / village / shops (playfield only). */
export const AMBIENT_INDOOR_SURFACE = 0.78;
/** B1 / authored-lit basements (depth via cookies, not full bright). */
export const AMBIENT_LIT_DUNGEON = 0.58;
/**
 * Training Guild living quarters — ominous, not pitch black.
 * Low enough that wall torch / lamp cookies read clearly.
 */
export const AMBIENT_GUILD_HALL = 0.26;
/** Boss rooms slightly moodier than floor peers. */
export const AMBIENT_BOSS_MUL = 0.92;

/**
 * Room ambient brightness 0..1 before light sources.
 * Used everywhere in the crawl (all lands / floors).
 */
export function ambientForRoom(room: {
  floor?: number;
  dark?: boolean;
  land?: string;
  id?: string;
  boss?: boolean;
}): number {
  // Guild hall: authored indoor gloom (EMA atmosphere) — before outdoor surface
  if (room.id === 'guild_hall') return AMBIENT_GUILD_HALL;
  if (room.dark === true) return AMBIENT_DARK;
  if (room.dark === false) {
    // Explicit lit basement still gets positional depth
    const base = AMBIENT_LIT_DUNGEON;
    return room.boss || isBossRoomId(room.id) ? base * AMBIENT_BOSS_MUL : base;
  }
  const f = room.floor ?? 0;
  const land = room.land ?? '';
  const outdoor =
    land === 'woodz' ||
    land === 'dezertz' ||
    land === 'surface' ||
    land === 'kingdom' ||
    f >= 0;
  if (outdoor && f >= 0) {
    // Kingdom / village interiors stay slightly softer
    if (land === 'kingdom' || land === 'village') return AMBIENT_INDOOR_SURFACE;
    return AMBIENT_SURFACE;
  }
  // Basements
  if (f <= -2) return AMBIENT_DARK;
  // B1
  let a = AMBIENT_LIT_DUNGEON;
  if (room.boss || isBossRoomId(room.id)) a *= AMBIENT_BOSS_MUL;
  return a;
}

function isBossRoomId(id?: string): boolean {
  if (!id) return false;
  return /boss|warden|captain|howl|honk|wight|lawyer/i.test(id);
}

/**
 * Deep basements (B2+) are dark unless room.dark === false.
 * Surface / B1 stay "lit" ambient by default (still positional).
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

/** True when the room is dark and has no ambient wall torches — needs carried light. */
export function roomNeedsCarriedLight(
  room: { floor?: number; dark?: boolean; land?: string },
  wallTorchCount = 0,
): boolean {
  return roomIsDark(room) && wallTorchCount <= 0;
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

export function hasActiveCarriedLight(save: SaveData): boolean {
  return activeLightTier(save) !== 'none';
}

/**
 * Legacy vision darkness alpha for a dark room (flat overlay).
 * Kept for tests + migration; runtime prefers sampleBrightness path.
 */
export function visionDarkAlpha(
  save: SaveData,
  opts: { darkRoom: boolean; wallTorchCount?: number },
): number {
  if (!opts.darkRoom) return 0;
  const walls = Math.max(0, opts.wallTorchCount ?? 0);
  if (walls > 0) return 0;
  const tier = activeLightTier(save);
  return LIGHT_DARK_ALPHA[tier];
}

export function igniteLight(save: SaveData, tier: LightTier): SaveData {
  return {
    ...save,
    activeLight: tier,
    lightFuelMs: LIGHT_BURN_MS[tier],
  };
}

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

export function extinguishLight(save: SaveData): SaveData {
  return { ...save, activeLight: null, lightFuelMs: 0 };
}

export function lightTierRank(tier: LightTier | 'none'): number {
  if (tier === 'none') return 0;
  if (tier === 'torch') return 1;
  if (tier === 'lantern') return 2;
  return 3;
}

// ── Brightness model (v2) ──────────────────────────────────────────

export type LightSourceKind =
  | 'carried'
  | 'wall_placed'
  | 'wall_fixture' // authored torch_wall — positional cookie
  | 'wall_ambient' // legacy full-room (rare)
  | 'gear_emit'
  | 'env' // lava / hazards
  | 'creature'; // gel creeps, etc.

export type LightSource = {
  kind: LightSourceKind;
  x: number;
  y: number;
  intensity: number;
  radiusPx: number;
  id?: string;
  outward?: { x: number; y: number };
};

export const LIGHT_RADIUS_TILES = {
  torch: 4.0,
  lantern: 5.5,
  flashlight: 7.0,
  wall_placed: 5.0,
  wall_fixture: 5.5,
  gear_flame: 2.5,
  gear_amulet: 3.0,
  gear_minor: 2.0,
  gear_afterglow: 3.5,
  /** Lava tile glow — local pool. */
  lava: 2.4,
  /** Small gel slime. */
  gel_slime: 2.0,
  /** Gelatinous cube / large gel. */
  gel_cube: 2.8,
} as const;

export const LIGHT_PEAK = {
  torch: 0.85,
  lantern: 0.9,
  flashlight: 0.95,
  wall_placed: 0.88,
  wall_fixture: 0.82,
  gear_flame: 0.4,
  gear_amulet: 0.45,
  gear_minor: 0.3,
  gear_afterglow: 0.55,
  lava: 0.48,
  gel_slime: 0.28,
  gel_cube: 0.38,
} as const;

/** Cap lava cookies so big lakes don't thrash the RT erase path. */
export const MAX_LAVA_LIGHTS = 28;

/**
 * Creature kinds / ids that bioluminesce (weak).
 * Cube + slime = gel family; id gel-* also matches.
 */
export function creatureLightSpec(
  kind: string,
  id?: string,
): 'gel_slime' | 'gel_cube' | null {
  const kid = (id ?? '').toLowerCase();
  if (kind === 'cube' || kid.includes('gel-cube') || kid === 'gel_cube') {
    return 'gel_cube';
  }
  if (kind === 'slime' || kid.includes('gel') || kid.includes('slime')) {
    return 'gel_slime';
  }
  return null;
}

export const FUEL_PAUSE_B = 0.55;
export const ALPHA_NONE = 0.88;
/** @deprecated No per-room cap — kept for any old imports; place never rejects on count. */
export const MAX_PLACED_TORCHES_PER_ROOM = Number.POSITIVE_INFINITY;

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/** Smoothstep falloff t∈[0,1] at center → 0 at rim. */
export function smoothstepFalloff(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

function wallLobe(
  px: number,
  py: number,
  sx: number,
  sy: number,
  outward: { x: number; y: number },
): number {
  const vx = px - sx;
  const vy = py - sy;
  const len = Math.hypot(vx, vy) || 1;
  const cos = (vx / len) * outward.x + (vy / len) * outward.y;
  if (cos >= 0) return 1;
  return 0.15;
}

/**
 * Sample brightness at a world pixel. Shared by VFX + ambush AI.
 * B = clamp(ambient + Σ contrib, 0, 1)
 */
export function sampleBrightness(
  px: number,
  py: number,
  sources: LightSource[],
  ambient = AMBIENT_DARK,
): number {
  let b = ambient;
  for (const s of sources) {
    if (s.kind === 'wall_ambient' || !Number.isFinite(s.radiusPx)) {
      b = 1;
      break;
    }
    const d = Math.hypot(px - s.x, py - s.y);
    if (d >= s.radiusPx) continue;
    const t = 1 - d / s.radiusPx;
    let lobe = 1;
    if (
      (s.kind === 'wall_placed' || s.kind === 'wall_fixture') &&
      s.outward
    ) {
      lobe = wallLobe(px, py, s.x, s.y, s.outward);
    }
    b += s.intensity * smoothstepFalloff(t) * lobe;
  }
  return clamp01(b);
}

/** Overlay alpha from brightness (higher α = darker). */
export function visionOverlayAlpha(B: number): number {
  const t = clamp01(B);
  // α(0)≈0.88, α(1)=0; ease so mid stays playable
  return clamp01(ALPHA_NONE * (1 - t) * (1 - t) * (1 + 0.12 * t));
}

/** Peak intensity with dying fuel (last 8% dims peak only). */
export function effectiveCarriedPeak(
  tier: LightTier,
  fuelMs: number,
): number {
  const I = LIGHT_PEAK[tier];
  const full = LIGHT_BURN_MS[tier];
  const window = 0.08 * full;
  if (fuelMs >= window) return I;
  const u = clamp01(fuelMs / window);
  return I * (0.55 + 0.45 * u);
}

export type BuildLightsInput = {
  darkRoom: boolean;
  ambient: number;
  player: { x: number; y: number };
  activeTier: LightTier | 'none';
  fuelMs: number;
  /** Authored torch_wall world positions (positional fixtures). */
  wallFixtures: {
    id?: string;
    x: number;
    y: number;
    outward?: { x: number; y: number };
  }[];
  placed: {
    id: string;
    x: number;
    y: number;
    outward: { x: number; y: number };
  }[];
  gear: {
    id: string;
    x: number;
    y: number;
    spec: 'flame' | 'amulet' | 'minor' | 'afterglow';
  }[];
  /** Hazard / world emitters (lava tile centers, etc.). */
  env?: {
    id: string;
    x: number;
    y: number;
    spec: 'lava';
  }[];
  /** Living emitters (gel creeps). */
  creatures?: {
    id: string;
    x: number;
    y: number;
    spec: 'gel_slime' | 'gel_cube';
  }[];
  cell?: number;
  /**
   * When true (default for lit rooms with many walls), fixtures stay cookies.
   * Set useAmbientWalls true only for rare full-bright authored rooms.
   */
  useAmbientWalls?: boolean;
};

export function buildLightSources(input: BuildLightsInput): LightSource[] {
  const cell = input.cell ?? CELL_PX_DEFAULT;
  const out: LightSource[] = [];

  if (input.useAmbientWalls && input.wallFixtures.length > 0) {
    out.push({
      kind: 'wall_ambient',
      x: input.player.x,
      y: input.player.y,
      intensity: 1,
      radiusPx: Infinity,
      id: 'ambient-walls',
    });
    return out;
  }

  for (const w of input.wallFixtures) {
    out.push({
      kind: 'wall_fixture',
      x: w.x,
      y: w.y,
      intensity: LIGHT_PEAK.wall_fixture,
      radiusPx: tilesToPx(LIGHT_RADIUS_TILES.wall_fixture, cell),
      id: w.id,
      outward: w.outward,
    });
  }

  for (const p of input.placed) {
    out.push({
      kind: 'wall_placed',
      x: p.x,
      y: p.y,
      intensity: LIGHT_PEAK.wall_placed,
      radiusPx: tilesToPx(LIGHT_RADIUS_TILES.wall_placed, cell),
      id: p.id,
      outward: p.outward,
    });
  }

  for (const g of input.gear) {
    const key =
      g.spec === 'flame'
        ? 'gear_flame'
        : g.spec === 'amulet'
          ? 'gear_amulet'
          : g.spec === 'afterglow'
            ? 'gear_afterglow'
            : 'gear_minor';
    out.push({
      kind: 'gear_emit',
      x: g.x,
      y: g.y,
      intensity: LIGHT_PEAK[key],
      radiusPx: tilesToPx(LIGHT_RADIUS_TILES[key], cell),
      id: g.id,
    });
  }

  for (const e of input.env ?? []) {
    if (e.spec === 'lava') {
      out.push({
        kind: 'env',
        x: e.x,
        y: e.y,
        intensity: LIGHT_PEAK.lava,
        radiusPx: tilesToPx(LIGHT_RADIUS_TILES.lava, cell),
        id: e.id,
      });
    }
  }

  for (const c of input.creatures ?? []) {
    const key = c.spec === 'gel_cube' ? 'gel_cube' : 'gel_slime';
    out.push({
      kind: 'creature',
      x: c.x,
      y: c.y,
      intensity: LIGHT_PEAK[key],
      radiusPx: tilesToPx(LIGHT_RADIUS_TILES[key], cell),
      id: c.id,
    });
  }

  if (input.activeTier !== 'none' && input.fuelMs > 0) {
    out.push({
      kind: 'carried',
      x: input.player.x,
      y: input.player.y,
      intensity: effectiveCarriedPeak(input.activeTier, input.fuelMs),
      radiusPx: tilesToPx(LIGHT_RADIUS_TILES[input.activeTier], cell),
      id: 'carried',
    });
  }

  return out;
}

/** True when carried fuel should tick this frame. */
export function shouldBurnCarriedFuel(opts: {
  darkRoom: boolean;
  hasCarried: boolean;
  /** sampleBrightness at player using sources WITHOUT carried. */
  nonCarriedB: number;
}): boolean {
  if (!opts.darkRoom || !opts.hasCarried) return false;
  if (opts.nonCarriedB >= FUEL_PAUSE_B) return false;
  return true;
}

// ── Place torch ────────────────────────────────────────────────────

export type PlacedTorch = {
  id: string;
  x: number;
  y: number;
  dir: 0 | 1 | 2 | 3;
};

export type PlaceTorchContext = {
  darkRoom: boolean;
  tx: number;
  ty: number;
  facing: 0 | 1 | 2 | 3;
  isWall: (x: number, y: number) => boolean;
  isInBounds: (x: number, y: number) => boolean;
  existing: { x: number; y: number }[];
  torchStacks: number;
};

export type PlaceFail =
  | 'no_torch'
  | 'not_dark_room'
  | 'not_wall_adjacent'
  | 'occupied'
  | 'oob';

const DIR_DELTA: Record<0 | 1 | 2 | 3, { x: number; y: number }> = {
  0: { x: 0, y: -1 },
  1: { x: 1, y: 0 },
  2: { x: 0, y: 1 },
  3: { x: -1, y: 0 },
};

/** Outward from wall into room (dir is facing toward wall, so outward = opposite). */
export function outwardFromFacing(facing: 0 | 1 | 2 | 3): {
  x: number;
  y: number;
} {
  const d = DIR_DELTA[facing];
  return { x: -d.x, y: -d.y };
}

export function canPlaceTorch(
  ctx: PlaceTorchContext,
):
  | { ok: true; x: number; y: number; dir: 0 | 1 | 2 | 3 }
  | { ok: false; reason: PlaceFail } {
  if (ctx.torchStacks < 1) return { ok: false, reason: 'no_torch' };
  if (!ctx.darkRoom) return { ok: false, reason: 'not_dark_room' };
  if (!ctx.isInBounds(ctx.tx, ctx.ty)) return { ok: false, reason: 'oob' };

  const tryDir = (dir: 0 | 1 | 2 | 3) => {
    const d = DIR_DELTA[dir];
    const wx = ctx.tx + d.x;
    const wy = ctx.ty + d.y;
    if (!ctx.isInBounds(wx, wy)) return null;
    if (!ctx.isWall(wx, wy)) return null;
    if (ctx.existing.some((e) => e.x === wx && e.y === wy)) return null;
    return { x: wx, y: wy, dir };
  };

  // Prefer facing wall, else any orthogonal wall
  let hit = tryDir(ctx.facing);
  if (!hit) {
    for (const d of [0, 1, 2, 3] as const) {
      if (d === ctx.facing) continue;
      hit = tryDir(d);
      if (hit) break;
    }
  }
  if (!hit) return { ok: false, reason: 'not_wall_adjacent' };
  // occupied already checked in tryDir via existing
  return { ok: true, x: hit.x, y: hit.y, dir: hit.dir };
}

export function placedEmissionWorld(
  tileX: number,
  tileY: number,
  dir: 0 | 1 | 2 | 3,
  originX: number,
  originY: number,
  cell = CELL_PX_DEFAULT,
): { x: number; y: number; outward: { x: number; y: number } } {
  // dir is facing toward wall; light shines opposite (into room)
  const intoRoom = outwardFromFacing(dir);
  const cx =
    originX + (tileX + 0.5) * cell + intoRoom.x * 0.55 * cell;
  const cy =
    originY + (tileY + 0.5) * cell + intoRoom.y * 0.55 * cell;
  return { x: cx, y: cy, outward: intoRoom };
}

export function placeFailToast(reason: PlaceFail): string {
  switch (reason) {
    case 'no_torch':
      return 'TORCH OUT';
    case 'not_dark_room':
      return 'ONLY IN DARK ROOMS';
    case 'not_wall_adjacent':
      return 'NO WALL NEAR';
    case 'occupied':
      return 'WALL ALREADY LIT';
    case 'oob':
      return 'NO WALL NEAR';
  }
}

export function getPlacedForRoom(
  save: SaveData,
  roomId: string,
): PlacedTorch[] {
  const map = save.placedTorches ?? {};
  const list = map[roomId];
  return Array.isArray(list) ? list : [];
}

export function addPlacedTorch(
  save: SaveData,
  roomId: string,
  torch: PlacedTorch,
): SaveData {
  const prev = getPlacedForRoom(save, roomId);
  const stacks = { ...(save.stacks ?? {}) };
  const n = Math.max(0, (stacks.torch ?? 0) - 1);
  if (n <= 0) delete stacks.torch;
  else stacks.torch = n;
  return {
    ...save,
    stacks,
    placedTorches: {
      ...(save.placedTorches ?? {}),
      [roomId]: [...prev, torch],
    },
  };
}

// ── Ambush state machine ───────────────────────────────────────────

export const AMBUSH = {
  hideThreshold: 0.22,
  revealThreshold: 0.36,
  ambushRadiusTiles: 2.0,
  rehideDistMul: 1.2,
  telegraphMs: 550,
  minRevealedMs: 2000,
  firstStrikeDamageMul: 0.7,
} as const;

export type AmbushPhase = 'hidden' | 'telegraph' | 'revealed';

export type AmbushState = {
  phase: AmbushPhase;
  phaseMs: number;
};

export function stepAmbushState(
  prev: AmbushState,
  brightness: number,
  distPx: number,
  dtMs: number,
  cell = CELL_PX_DEFAULT,
): AmbushState {
  const r = AMBUSH.ambushRadiusTiles * cell;
  const tooClose = distPx < r;
  const farEnough = distPx >= r * AMBUSH.rehideDistMul;
  let { phase, phaseMs } = prev;
  phaseMs += dtMs;

  if (phase === 'hidden') {
    if (tooClose || brightness > AMBUSH.revealThreshold) {
      return { phase: 'telegraph', phaseMs: 0 };
    }
    return { phase: 'hidden', phaseMs };
  }

  if (phase === 'telegraph') {
    if (phaseMs >= AMBUSH.telegraphMs) {
      return { phase: 'revealed', phaseMs: 0 };
    }
    return { phase: 'telegraph', phaseMs };
  }

  if (
    phaseMs >= AMBUSH.minRevealedMs &&
    farEnough &&
    !tooClose &&
    brightness < AMBUSH.hideThreshold
  ) {
    return { phase: 'hidden', phaseMs: 0 };
  }
  return { phase: 'revealed', phaseMs };
}

export function ambushCanDealContact(s: AmbushState): boolean {
  return s.phase === 'revealed';
}

export function ambushAlpha(phase: AmbushPhase): number {
  if (phase === 'hidden') return 0.1;
  if (phase === 'telegraph') return 0.45;
  return 1;
}

/** Infer wall outward normal from map (into floor). Best-effort for fixtures. */
export function inferOutwardFromWalls(
  tileX: number,
  tileY: number,
  isWall: (x: number, y: number) => boolean,
): { x: number; y: number } {
  // Prefer direction into non-wall
  for (const d of [2, 1, 0, 3] as const) {
    // S E N W bias
    const delta = DIR_DELTA[d];
    const nx = tileX + delta.x;
    const ny = tileY + delta.y;
    if (!isWall(nx, ny)) return delta;
  }
  return { x: 0, y: 1 };
}

/**
 * Gear light tags from equipped template ids (weak passive).
 */
export function gearLightSpecsFromSave(save: SaveData): Array<{
  id: string;
  spec: 'flame' | 'amulet' | 'minor';
}> {
  const out: Array<{ id: string; spec: 'flame' | 'amulet' | 'minor' }> = [];
  const eq = save.equipped ?? {};
  const bag = save.bag ?? [];
  const byUid = new Map(bag.map((i) => [i.uid, i]));
  const check = (uid: string | null | undefined, slot: string) => {
    if (!uid) return;
    const inst = byUid.get(uid);
    if (!inst) return;
    const tid = inst.templateId.toLowerCase();
    if (
      tid.includes('flame') ||
      tid.includes('ember') ||
      tid.includes('fire') ||
      tid === 'tome_embers'
    ) {
      out.push({ id: `${slot}-${tid}`, spec: 'flame' });
    } else if (
      tid.includes('light') ||
      tid.includes('glow') ||
      tid.includes('lumin') ||
      tid.includes('sun') ||
      tid.includes('star')
    ) {
      out.push({ id: `${slot}-${tid}`, spec: 'amulet' });
    } else if (
      (slot === 'amulet' || slot === 'weapon') &&
      (tid.includes('magic') ||
        tid.includes('enchant') ||
        tid.includes('arcane') ||
        tid.includes('spark'))
    ) {
      out.push({ id: `${slot}-${tid}`, spec: 'minor' });
    }
  };
  check(eq.weapon, 'weapon');
  check(eq.amulet, 'amulet');
  check(eq.ring, 'ring');
  return out;
}
