/**
 * Mapz discovery + fog-of-war for multi-land mapz view.
 * Intentional spelling: mapz.
 */

import type { LandId, RoomDef, SaveData } from '../types';

export interface LandInfo {
  id: LandId;
  name: string;
  blurb: string;
  /** RGB fill for visited rooms on the graphic mapz. */
  color: number;
  fog: number;
  border: number;
}

export const LANDS: Record<LandId, LandInfo> = {
  surface: {
    id: 'surface',
    name: 'SURFACE MAPZ',
    blurb: 'Meadowz and trailz.',
    color: 0x2f6b45,
    fog: 0x1a2a20,
    border: 0x7dffb3,
  },
  dunjunz: {
    id: 'dunjunz',
    name: 'DUNJUNZ MAPZ',
    blurb: 'Deep holez. Great lootz.',
    color: 0x4a3a6a,
    fog: 0x1a1528,
    border: 0x9b8fd4,
  },
  woodz: {
    id: 'woodz',
    name: 'WOODZ MAPZ',
    blurb: 'Treez, wolfz, forjing scrapz.',
    color: 0x1e5a32,
    fog: 0x0f2418,
    border: 0x5ad45a,
  },
  dezertz: {
    id: 'dezertz',
    name: 'DEZERTZ MAPZ',
    blurb: 'Hot sandz. Princess rumors.',
    color: 0xa08040,
    fog: 0x3a3020,
    border: 0xffc857,
  },
  kingdomz: {
    id: 'kingdomz',
    name: 'KINGDOMZ MAPZ',
    blurb: 'Princess Prizella rules. Weird taxes. Cool quests.',
    color: 0x6a4a9a,
    fog: 0x2a1a40,
    border: 0xffc857,
  },
  sewerz: {
    id: 'sewerz',
    name: 'SEWERZ MAPZ',
    blurb: 'Royal plumbing. Meaner creeps. Goose?',
    color: 0x3a5a48,
    fog: 0x152018,
    border: 0x7dffb3,
  },
};

export function discoverMapz(save: SaveData, land: LandId): SaveData {
  if (save.discoveredMapz.includes(land)) return save;
  return {
    ...save,
    discoveredMapz: [...save.discoveredMapz, land],
  };
}

export function markRoomVisited(save: SaveData, roomId: string): SaveData {
  if (save.visitedRooms.includes(roomId)) return save;
  return {
    ...save,
    visitedRooms: [...save.visitedRooms, roomId],
  };
}

export function hasMapz(save: SaveData, land: LandId): boolean {
  return save.discoveredMapz.includes(land);
}

export interface MapzCell {
  roomId: string;
  mapX: number;
  mapY: number;
  floor: number;
  title: string;
  shortTitle: string;
  visited: boolean;
  current: boolean;
  /** Outgoing doors on this room (for corridor stubs). */
  north?: boolean;
  south?: boolean;
  east?: boolean;
  west?: boolean;
  stairsDown?: boolean;
  stairsUp?: boolean;
}

export interface MapzViewModel {
  land: LandId;
  landInfo: LandInfo;
  unlocked: boolean;
  floor: number;
  floors: number[];
  cells: MapzCell[];
  /** Grid bounds for layout. */
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  discoveredLands: LandId[];
}

function shortTitle(title: string): string {
  // "MEADOW · SURFACE" → "MEADOW"
  const part = title.split('·')[0]?.trim() ?? title;
  return part.length > 10 ? part.slice(0, 9) + '…' : part;
}

/** Build cells for a land (all floors). */
export function buildMapzCells(
  rooms: Record<string, RoomDef>,
  save: SaveData,
  land: LandId,
): MapzCell[] {
  const cells: MapzCell[] = [];
  for (const r of Object.values(rooms)) {
    if ((r.land ?? 'surface') !== land) continue;
    if (r.mapX === undefined || r.mapY === undefined) continue;
    cells.push({
      roomId: r.id,
      mapX: r.mapX,
      mapY: r.mapY,
      floor: r.floor ?? 0,
      title: r.title,
      shortTitle: shortTitle(r.title),
      visited: save.visitedRooms.includes(r.id),
      current: save.roomId === r.id,
      north: !!r.north,
      south: !!r.south,
      east: !!r.east,
      west: !!r.west,
      stairsDown: !!r.stairsDown,
      stairsUp: !!r.stairsUp,
    });
  }
  return cells;
}

export function floorsForLand(
  rooms: Record<string, RoomDef>,
  land: LandId,
): number[] {
  const set = new Set<number>();
  for (const r of Object.values(rooms)) {
    if ((r.land ?? 'surface') !== land) continue;
    if (r.mapX === undefined || r.mapY === undefined) continue;
    set.add(r.floor ?? 0);
  }
  return [...set].sort((a, b) => b - a); // high floors first (surface → deep)
}

export function floorLabel(floor: number): string {
  if (floor === 0) return 'SURFACE';
  if (floor < 0) return `B${Math.abs(floor)}`;
  return `F${floor}`;
}

/**
 * Graphic mapz view model for one land + floor.
 * Prefer player's current floor when on this land; else first floor with
 * visited rooms; else highest floor list entry.
 */
export function buildMapzView(
  rooms: Record<string, RoomDef>,
  save: SaveData,
  land: LandId,
  floorOverride?: number,
): MapzViewModel {
  const landInfo = LANDS[land];
  const floors = floorsForLand(rooms, land);
  const all = buildMapzCells(rooms, save, land);
  const unlocked = hasMapz(save, land);

  let floor = floorOverride;
  if (floor === undefined || !floors.includes(floor)) {
    const cur = rooms[save.roomId];
    if (cur && (cur.land ?? 'surface') === land) {
      floor = cur.floor ?? 0;
    } else {
      const visitedFloor = floors.find((f) =>
        all.some((c) => c.floor === f && c.visited),
      );
      floor = visitedFloor ?? floors[0] ?? 0;
    }
  }

  const cells = unlocked ? all.filter((c) => c.floor === floor) : [];
  const xs = cells.map((c) => c.mapX);
  const ys = cells.map((c) => c.mapY);

  return {
    land,
    landInfo,
    unlocked,
    floor,
    floors,
    cells,
    minX: xs.length ? Math.min(...xs) : 0,
    maxX: xs.length ? Math.max(...xs) : 0,
    minY: ys.length ? Math.min(...ys) : 0,
    maxY: ys.length ? Math.max(...ys) : 0,
    discoveredLands: [...save.discoveredMapz],
  };
}

/** ASCII mapz panel (tests + fallback). */
export function formatMapzPanel(
  rooms: Record<string, RoomDef>,
  save: SaveData,
  land: LandId,
  floorOverride?: number,
): string {
  const view = buildMapzView(rooms, save, land, floorOverride);
  if (!view.unlocked) {
    return [
      `NO ${view.landInfo.name} YET.`,
      'FIND A MAPZ SCROLL.',
      '',
      `YOU HAVE: ${save.discoveredMapz.join(', ') || '(none)'}`,
      '',
      'M / TAB  CLOSE',
    ].join('\n');
  }
  if (!view.cells.length) {
    return [
      view.landInfo.name,
      view.landInfo.blurb,
      floorLabel(view.floor),
      '',
      '(no rooms on this floor)',
      '',
      'M / TAB  CLOSE',
    ].join('\n');
  }

  const byKey = new Map(view.cells.map((c) => [`${c.mapX},${c.mapY}`, c]));
  const lines = [
    `=== ${view.landInfo.name} · ${floorLabel(view.floor)} ===`,
    view.landInfo.blurb,
    '',
  ];

  for (let y = view.maxY; y >= view.minY; y--) {
    let row = '';
    for (let x = view.minX; x <= view.maxX; x++) {
      const c = byKey.get(`${x},${y}`);
      if (!c) row += ' . ';
      else if (c.current) row += '[@]';
      else if (c.visited) row += '[O]';
      else row += '[?]';
    }
    lines.push(row);
  }

  lines.push('');
  lines.push('[@] YOU   [O] VISITED   [?] UNKNOWN');
  lines.push('');
  lines.push('ROOMS:');
  const sorted = [...view.cells].sort(
    (a, b) => b.mapY - a.mapY || a.mapX - b.mapX,
  );
  for (const c of sorted) {
    const mark = c.current ? '@' : c.visited ? 'O' : '?';
    lines.push(` ${mark} ${c.title}`);
  }
  lines.push('');
  if (view.floors.length > 1) {
    lines.push(
      `FLOORS: ${view.floors.map(floorLabel).join(' ')}  ([ ] switch)`,
    );
  }
  lines.push('M / TAB / ESC  CLOSE');
  return lines.join('\n');
}

export function landForRoom(
  rooms: Record<string, RoomDef>,
  roomId: string,
): LandId {
  return rooms[roomId]?.land ?? 'surface';
}

/** Recover mapz discovery from collected scroll entity ids. */
export function reconcileMapzFromCollected(save: SaveData): SaveData {
  const fromScroll: Partial<Record<string, LandId>> = {
    'mapz-surface': 'surface',
    'mapz-dunjunz': 'dunjunz',
    'mapz-woodz': 'woodz',
    'mapz-dezertz': 'dezertz',
    'mapz-kingdomz': 'kingdomz',
    'mapz-sewerz': 'sewerz',
  };
  let next = save;
  for (const id of save.collected) {
    const land = fromScroll[id];
    if (land) next = discoverMapz(next, land);
  }
  if (!next.discoveredMapz.includes('surface')) {
    next = discoverMapz(next, 'surface');
  }
  return next;
}

/** Payload Game → UI for graphic mapz. */
export interface MapzOpenPayload {
  save: SaveData;
  land: LandId;
  floor?: number;
}
