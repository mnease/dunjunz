/**
 * Mapz discovery + fog-of-war for multi-land mapz view.
 * Intentional spelling: mapz.
 */

import type { LandId, RoomDef, SaveData } from '../types';

export interface LandInfo {
  id: LandId;
  name: string;
  blurb: string;
}

export const LANDS: Record<LandId, LandInfo> = {
  surface: {
    id: 'surface',
    name: 'SURFACE MAPZ',
    blurb: 'Meadowz and trailz.',
  },
  dunjunz: {
    id: 'dunjunz',
    name: 'DUNJUNZ MAPZ',
    blurb: 'Deep holez. Great lootz.',
  },
  woodz: {
    id: 'woodz',
    name: 'WOODZ MAPZ',
    blurb: 'Treez, wolfz, forjing scrapz.',
  },
  dezertz: {
    id: 'dezertz',
    name: 'DEZERTZ MAPZ',
    blurb: 'Hot sandz. Princesz rumors.',
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
  title: string;
  visited: boolean;
  current: boolean;
}

/** Build a sparse grid of rooms for a land for the mapz UI. */
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
      title: r.title,
      visited: save.visitedRooms.includes(r.id),
      current: save.roomId === r.id,
    });
  }
  return cells;
}

/** ASCII mapz panel for a land (pure string for tests + simple UI). */
export function formatMapzPanel(
  rooms: Record<string, RoomDef>,
  save: SaveData,
  land: LandId,
): string {
  if (!hasMapz(save, land)) {
    return `NO ${LANDS[land].name} YET.\nFIND A MAPZ SCROLL.`;
  }
  const cells = buildMapzCells(rooms, save, land);
  if (!cells.length) return `${LANDS[land].name}\n(empty)`;

  const xs = cells.map((c) => c.mapX);
  const ys = cells.map((c) => c.mapY);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const byKey = new Map(cells.map((c) => [`${c.mapX},${c.mapY}`, c]));
  const lines = [LANDS[land].name, LANDS[land].blurb, ''];

  // Y high at top (north)
  for (let y = maxY; y >= minY; y--) {
    let row = '';
    for (let x = minX; x <= maxX; x++) {
      const c = byKey.get(`${x},${y}`);
      if (!c) row += '  ';
      else if (c.current) row += '@ ';
      else if (c.visited) row += 'O ';
      else row += '? ';
    }
    lines.push(row.trimEnd());
  }
  lines.push('', '@ YOU  O VISITED  ? UNKNOWN');
  lines.push('M CLOSE MAPZ');
  return lines.join('\n');
}

export function landForRoom(
  rooms: Record<string, RoomDef>,
  roomId: string,
): LandId {
  return rooms[roomId]?.land ?? 'surface';
}
