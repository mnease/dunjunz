/**
 * Room connectivity validator — doors, stairs, links, map coords.
 * EMA council audit: edges must match cardinal links; mapz must match graph.
 */

import type { RoomDef } from '../types';

export type RoomIssue = {
  id: string;
  kind:
    | 'geom'
    | 'link-missing'
    | 'link-oneway'
    | 'door-missing'
    | 'door-orphan'
    | 'stairs'
    | 'map-collide'
    | 'map-adj';
  detail: string;
};

function edgeOpen(tiles: string[], edge: 'N' | 'S' | 'E' | 'W'): boolean {
  const h = tiles.length;
  const w = tiles[0]?.length ?? 0;
  const isOpen = (c: string | undefined) => !!c && c !== '#';
  if (edge === 'N') {
    for (let x = 1; x < w - 1; x++) if (isOpen(tiles[0]?.[x])) return true;
  }
  if (edge === 'S') {
    for (let x = 1; x < w - 1; x++) if (isOpen(tiles[h - 1]?.[x])) return true;
  }
  if (edge === 'W') {
    for (let y = 1; y < h - 1; y++) if (isOpen(tiles[y]?.[0])) return true;
  }
  if (edge === 'E') {
    for (let y = 1; y < h - 1; y++) if (isOpen(tiles[y]?.[w - 1])) return true;
  }
  return false;
}

function countGlyph(tiles: string[], g: string): number {
  return tiles.join('').split(g).length - 1;
}

/** Validate all rooms. Returns empty array if healthy. */
export function validateRooms(rooms: Record<string, RoomDef>): RoomIssue[] {
  const issues: RoomIssue[] = [];
  const list = Object.values(rooms);

  for (const r of list) {
    if (!r.tiles || r.tiles.length !== 11) {
      issues.push({
        id: r.id,
        kind: 'geom',
        detail: `rows=${r.tiles?.length ?? 0} (need 11)`,
      });
      continue;
    }
    for (let i = 0; i < r.tiles.length; i++) {
      if ((r.tiles[i]?.length ?? 0) !== 16) {
        issues.push({
          id: r.id,
          kind: 'geom',
          detail: `row ${i} len ${r.tiles[i]?.length}`,
        });
      }
    }

    for (const dir of ['north', 'south', 'east', 'west'] as const) {
      const target = r[dir];
      if (!target) continue;
      if (!rooms[target]) {
        issues.push({
          id: r.id,
          kind: 'link-missing',
          detail: `${dir} → ${target} missing`,
        });
        continue;
      }
      const opp = (
        {
          north: 'south',
          south: 'north',
          east: 'west',
          west: 'east',
        } as const
      )[dir];
      const back = rooms[target]![opp];
      if (back !== r.id) {
        issues.push({
          id: r.id,
          kind: 'link-oneway',
          detail: `${dir}→${target} but ${target}.${opp}=${back ?? 'none'}`,
        });
      }
    }

    for (const [dir, edge] of [
      ['north', 'N'],
      ['south', 'S'],
      ['east', 'E'],
      ['west', 'W'],
    ] as const) {
      const hasLink = !!r[dir];
      const open = edgeOpen(r.tiles, edge);
      if (hasLink && !open) {
        issues.push({
          id: r.id,
          kind: 'door-missing',
          detail: `${dir} link but no edge opening`,
        });
      }
      if (!hasLink && open) {
        issues.push({
          id: r.id,
          kind: 'door-orphan',
          detail: `${dir} edge open but no link`,
        });
      }
    }

    const sCount = countGlyph(r.tiles, 'S');
    const uCount = countGlyph(r.tiles, 'U');
    if (sCount > 0 && !r.stairsDown) {
      issues.push({ id: r.id, kind: 'stairs', detail: 'S without stairsDown' });
    }
    if (uCount > 0 && !r.stairsUp) {
      issues.push({ id: r.id, kind: 'stairs', detail: 'U without stairsUp' });
    }
    if (r.stairsDown && sCount === 0) {
      issues.push({
        id: r.id,
        kind: 'stairs',
        detail: `stairsDown=${r.stairsDown} but no S`,
      });
    }
    if (r.stairsUp && uCount === 0) {
      issues.push({
        id: r.id,
        kind: 'stairs',
        detail: `stairsUp=${r.stairsUp} but no U`,
      });
    }
    if (r.stairsDown && !rooms[r.stairsDown]) {
      issues.push({
        id: r.id,
        kind: 'stairs',
        detail: `stairsDown missing ${r.stairsDown}`,
      });
    }
    if (r.stairsUp && !rooms[r.stairsUp]) {
      issues.push({
        id: r.id,
        kind: 'stairs',
        detail: `stairsUp missing ${r.stairsUp}`,
      });
    }
  }

  const mapKeys = new Map<string, string>();
  for (const r of list) {
    if (r.mapX === undefined || r.mapY === undefined) continue;
    const k = `${r.land ?? '?'}/${r.floor ?? 0}/${r.mapX},${r.mapY}`;
    if (mapKeys.has(k)) {
      issues.push({
        id: r.id,
        kind: 'map-collide',
        detail: `${k} also ${mapKeys.get(k)}`,
      });
    } else mapKeys.set(k, r.id);
  }

  for (const r of list) {
    if (r.mapX === undefined || r.mapY === undefined) continue;
    if (r.north) {
      const t = rooms[r.north];
      if (
        t &&
        t.mapX !== undefined &&
        t.mapY !== undefined &&
        t.land === r.land &&
        t.floor === r.floor
      ) {
        if (t.mapX !== r.mapX || t.mapY !== r.mapY + 1) {
          issues.push({
            id: r.id,
            kind: 'map-adj',
            detail: `north ${r.north} map (${t.mapX},${t.mapY}) expected (${r.mapX},${r.mapY + 1})`,
          });
        }
      }
    }
    if (r.east) {
      const t = rooms[r.east];
      if (
        t &&
        t.mapX !== undefined &&
        t.mapY !== undefined &&
        t.land === r.land &&
        t.floor === r.floor
      ) {
        if (t.mapY !== r.mapY || t.mapX !== r.mapX + 1) {
          issues.push({
            id: r.id,
            kind: 'map-adj',
            detail: `east ${r.east} map (${t.mapX},${t.mapY}) expected (${r.mapX + 1},${r.mapY})`,
          });
        }
      }
    }
  }

  return issues;
}
