/**
 * Floor decoration density (Graphics-v2 Dn2).
 * Pure helpers — seed-stable clutter on walkable cells only.
 * Style Bible §2.8: ~1–3 small ground details per open walkable 3×3.
 */

import type { TileKind } from '../types';

/** Decoration are sprites (not ground paint). Texture keys: deco_<kind>. */
export const DECO_KINDS = [
  'pebble',
  'root',
  'mushroom',
  'leaf',
  'ore_crumb',
  'bone_chip',
] as const;
export type DecoKind = (typeof DECO_KINDS)[number];

export type FloorDecoPlacement = {
  x: number;
  y: number;
  kind: DecoKind;
  /** Texture key registered in textures boot. */
  texKey: string;
};

/** Walkable ground that may receive floor clutter. */
export function isDecoWalkableKind(kind: TileKind | string): boolean {
  return (
    kind === 'floor' ||
    kind === 'grass' ||
    kind === 'dirt' ||
    kind === 'sand' ||
    kind === 'snow' ||
    kind === 'carpet'
  );
}

/** Never place clutter on these cells. */
export function isDecoForbiddenKind(kind: TileKind | string): boolean {
  return (
    kind === 'wall' ||
    kind === 'void' ||
    kind === 'water' ||
    kind === 'lava' ||
    kind === 'door' ||
    kind === 'locked' ||
    kind === 'stairs' ||
    kind === 'stairs_up' ||
    kind === 'entrance' ||
    kind === 'pad'
  );
}

export function decoTextureKey(kind: DecoKind): string {
  return `deco_${kind}`;
}

/** Stable hash for room + cell + salt. */
export function decoCellHash(
  roomId: string,
  x: number,
  y: number,
  seed: number,
  salt = 0,
): number {
  let h = (seed >>> 0) ^ Math.imul(x + 1, 0x9e3779b1) ^ Math.imul(y + 1, 0x85ebca6b);
  for (let i = 0; i < roomId.length; i++) {
    h = Math.imul(h ^ roomId.charCodeAt(i), 0x9e3779b1) >>> 0;
  }
  h = Math.imul(h ^ (salt * 0x27d4eb2d), 0x165667b1) >>> 0;
  return h >>> 0;
}

/** Land-biased deco palette. */
export function decoKindsForLand(land?: string): readonly DecoKind[] {
  const l = land ?? '';
  if (l === 'woodz') return ['root', 'mushroom', 'leaf', 'pebble'] as const;
  if (l === 'dezertz') return ['pebble', 'bone_chip', 'ore_crumb'] as const;
  if (l === 'dwarvez' || l === 'moredorkz')
    return ['ore_crumb', 'pebble', 'bone_chip'] as const;
  if (l === 'surface' || l === 'kingdom' || l === 'kingdomz')
    return ['pebble', 'leaf', 'mushroom'] as const;
  // dunjunz / default crawl
  return ['pebble', 'bone_chip', 'ore_crumb', 'mushroom'] as const;
}

function pickKind(
  kinds: readonly DecoKind[],
  h: number,
): DecoKind {
  return kinds[h % kinds.length]!;
}

/**
 * Place seed-stable floor decorations on a logic grid.
 * Windows of 3×3 walkable cells get 1–3 props (Style Bible band).
 * Forbidden kinds and occupied cells never receive props.
 */
export function placeFloorDecorations(opts: {
  grid: readonly (readonly TileKind[])[];
  roomId: string;
  land?: string;
  /** Run / room seed (stable clutter). */
  seed: number;
  /** "x,y" cells already taken by entities / smashables. */
  occupied?: ReadonlySet<string>;
  /** Hard cap for perf (default 48). */
  maxTotal?: number;
}): FloorDecoPlacement[] {
  const grid = opts.grid;
  const h = grid.length;
  if (h === 0) return [];
  const w = grid[0]?.length ?? 0;
  if (w === 0) return [];
  const occ = opts.occupied ?? new Set<string>();
  const kinds = decoKindsForLand(opts.land);
  const maxTotal = opts.maxTotal ?? 48;
  const out: FloorDecoPlacement[] = [];
  const placed = new Set<string>();

  const canPlace = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= w || y >= h) return false;
    const key = `${x},${y}`;
    if (occ.has(key) || placed.has(key)) return false;
    const kind = grid[y]![x]!;
    if (isDecoForbiddenKind(kind)) return false;
    if (!isDecoWalkableKind(kind)) return false;
    return true;
  };

  // Non-overlapping 3×3 windows over the grid
  for (let y0 = 0; y0 < h; y0 += 3) {
    for (let x0 = 0; x0 < w; x0 += 3) {
      if (out.length >= maxTotal) return out;
      const candidates: { x: number; y: number }[] = [];
      for (let dy = 0; dy < 3; dy++) {
        for (let dx = 0; dx < 3; dx++) {
          const x = x0 + dx;
          const y = y0 + dy;
          if (canPlace(x, y)) candidates.push({ x, y });
        }
      }
      if (candidates.length === 0) continue;
      // Target 1–3 for open 3×3; scale down when few walkable cells
      const open = candidates.length;
      const windowHash = decoCellHash(opts.roomId, x0, y0, opts.seed, 99);
      let target = 1 + (windowHash % 3); // 1..3
      if (open <= 2) target = 1;
      else if (open <= 4) target = Math.min(target, 2);
      target = Math.min(target, open, maxTotal - out.length);

      // Stable shuffle via hash order
      const ranked = candidates
        .map((c) => ({
          ...c,
          rank: decoCellHash(opts.roomId, c.x, c.y, opts.seed, 7),
        }))
        .sort((a, b) => a.rank - b.rank);

      for (let i = 0; i < target; i++) {
        const c = ranked[i]!;
        const key = `${c.x},${c.y}`;
        if (placed.has(key)) continue;
        const kind = pickKind(
          kinds,
          decoCellHash(opts.roomId, c.x, c.y, opts.seed, 13),
        );
        placed.add(key);
        out.push({
          x: c.x,
          y: c.y,
          kind,
          texKey: decoTextureKey(kind),
        });
      }
    }
  }
  return out;
}

/**
 * Average decorations per open 3×3 window that has ≥1 walkable cell.
 * Used by tests to assert Style Bible 1–3 band.
 */
export function averageDecosPerOpen3x3(
  grid: readonly (readonly TileKind[])[],
  placements: readonly FloorDecoPlacement[],
): number {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  if (h === 0 || w === 0) return 0;
  const counts = new Map<string, number>();
  for (const p of placements) {
    const wx = Math.floor(p.x / 3);
    const wy = Math.floor(p.y / 3);
    const k = `${wx},${wy}`;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  let windows = 0;
  for (let y0 = 0; y0 < h; y0 += 3) {
    for (let x0 = 0; x0 < w; x0 += 3) {
      let open = 0;
      for (let dy = 0; dy < 3; dy++) {
        for (let dx = 0; dx < 3; dx++) {
          const x = x0 + dx;
          const y = y0 + dy;
          if (x >= w || y >= h) continue;
          const kind = grid[y]![x]!;
          if (isDecoWalkableKind(kind) && !isDecoForbiddenKind(kind)) open++;
        }
      }
      if (open > 0) windows++;
    }
  }
  if (windows === 0) return 0;
  let total = 0;
  for (const n of counts.values()) total += n;
  return total / windows;
}

/** True if any placement sits on a forbidden kind (test helper). */
export function placementsOnForbidden(
  grid: readonly (readonly TileKind[])[],
  placements: readonly FloorDecoPlacement[],
): FloorDecoPlacement[] {
  return placements.filter((p) => {
    const kind = grid[p.y]?.[p.x];
    return kind == null || isDecoForbiddenKind(kind);
  });
}
