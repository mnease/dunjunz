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
    return [
      `NO ${LANDS[land].name} YET.`,
      'FIND A MAPZ SCROLL.',
      '',
      `YOU HAVE: ${save.discoveredMapz.join(', ') || '(none)'}`,
      '',
      'M / TAB  CLOSE',
    ].join('\n');
  }
  const cells = buildMapzCells(rooms, save, land);
  if (!cells.length) {
    return [
      LANDS[land].name,
      LANDS[land].blurb,
      '',
      '(no rooms tagged for this land)',
      '',
      'M / TAB  CLOSE',
    ].join('\n');
  }

  const xs = cells.map((c) => c.mapX);
  const ys = cells.map((c) => c.mapY);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const byKey = new Map(cells.map((c) => [`${c.mapX},${c.mapY}`, c]));
  const lines = [
    `=== ${LANDS[land].name} ===`,
    LANDS[land].blurb,
    '',
  ];

  // Y high at top (north) — fixed-width cells so the grid is readable
  for (let y = maxY; y >= minY; y--) {
    let row = '';
    for (let x = minX; x <= maxX; x++) {
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
  const sorted = [...cells].sort((a, b) => b.mapY - a.mapY || a.mapX - b.mapX);
  for (const c of sorted) {
    const mark = c.current ? '@' : c.visited ? 'O' : '?';
    lines.push(` ${mark} ${c.title}`);
  }
  lines.push('');
  const others = save.discoveredMapz.filter((l) => l !== land);
  if (others.length) {
    lines.push(`OTHER MAPZ: ${others.join(', ').toUpperCase()}`);
    lines.push('(go there, then press M)');
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
  };
  let next = save;
  for (const id of save.collected) {
    const land = fromScroll[id];
    if (land) next = discoverMapz(next, land);
  }
  // Surface is always known once you leave the title (starter land)
  if (!next.discoveredMapz.includes('surface')) {
    next = discoverMapz(next, 'surface');
  }
  return next;
}
