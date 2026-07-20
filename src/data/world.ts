import type { RoomDef } from '../types';

/**
 * Tile legend (16×11 rooms, NES Zelda-style):
 *  . floor   # wall   g grass   d dirt   ~ water
 *  D open door   L locked door
 *  S stairs DOWN   U stairs UP
 *  = lava    P transporter pad
 *
 * MAP CONTRACT
 * ------------
 * - north/south/east/west links are bidirectional and match edge doors.
 * - Left edge doors only exist when `west` is set (same for all sides).
 * - Stairs: S uses stairsDown, U uses stairsUp (different dungeon floors).
 *
 * SURFACE (floor 0)
 *   (0,0) overworld --E-- (1,0) overworld_east
 *           | S down
 *
 * B1 (floor -1)
 *              (0,3) b1_descent  S down to B2
 *                 |
 *              (0,2) b1_hall
 *                 |
 *   (-1,1) b1_trek --E-- (0,1) b1_gate
 *                          |
 *              (0,0) b1_entrance --E-- (1,0) b1_cube
 *                 | U up to overworld
 *
 * B2 (floor -2)
 *              (0,1) b2_boss
 *                 |
 *              (0,0) b2_foyer  U up to B1
 */

export const ROOMS: Record<string, RoomDef> = {
  // ─── SURFACE ─────────────────────────────────────────────
  overworld: {
    id: 'overworld',
    title: 'MEADOW · SURFACE',
    floor: 0,
    mapX: 0,
    mapY: 0,
    east: 'overworld_east',
    stairsDown: 'b1_entrance',
    tiles: [
      '################',
      '#gggggggggggggg#',
      '#gg........ggg#',
      '#g...dddd...gg#',
      '#g..dddddd..gg.',
      '#g...dSSd...gg.',
      '#g....dd....gg.',
      '#gg........ggg#',
      '#ggg~~~~~~gggg#',
      '#gggg~~~~ggggg#',
      '################',
    ],
    entities: [
      {
        kind: 'npc',
        id: 'old-man',
        x: 4,
        y: 3,
        dialog: [
          "IT'S DANGEROUS TO GO ALONE!",
          'TAKE THIS... USER AGREEMENT.',
          '(AND A SWORD. OBVIOUSLY.)',
          'STAIRS LEAD DOWN. EAST IS A TRAIL.',
          'SPACE OR Z TO SWING. E TO TALK.',
        ],
      },
      {
        kind: 'sword',
        id: 'starter-sword',
        x: 5,
        y: 3,
      },
      {
        kind: 'sign',
        id: 'sign-meadow',
        x: 11,
        y: 2,
        dialog: [
          'MAP: EAST = TROPE TRAIL',
          'STAIRS = DUNJUN B1',
          'DOORS MATCH THE COMPASS.',
          'LEFT DOOR = WEST ROOM, ETC.',
        ],
      },
    ],
  },

  overworld_east: {
    id: 'overworld_east',
    title: 'TROPE TRAIL · SURFACE',
    floor: 0,
    mapX: 1,
    mapY: 0,
    west: 'overworld',
    tiles: [
      '################',
      '#gggggggggggggg#',
      '#g..........gg#',
      '#g..########..#',
      '#g..#......#..#',
      '....#..~~..#..#',
      '#g..#......#..#',
      '#g..###..###..#',
      '#g............#',
      '#ggggggggggggg#',
      '################',
    ],
    entities: [
      {
        kind: 'npc',
        id: 'bard',
        x: 10,
        y: 8,
        dialog: [
          'I SING OF AGES PAST...',
          'AND COPYRIGHT-SAFE PARODY.',
          'WEST RETURNS TO THE MEADOW.',
          'THE MAP FINALLY MAKES SENSE.',
        ],
      },
      {
        kind: 'slime',
        id: 'trail-slime-1',
        x: 6,
        y: 5,
        hp: 2,
      },
      {
        kind: 'slime',
        id: 'trail-slime-2',
        x: 9,
        y: 4,
        hp: 2,
      },
      {
        kind: 'merchant',
        id: 'tinkerer-meadow',
        x: 12,
        y: 7,
        shopId: 'tinkerer',
        dialog: [
          'TINKERER: RARE WARES!',
          'PRESS B WHILE NEAR ME TO BUY.',
          'WEST IS THE MEADOW STAIRS.',
        ],
      },
      {
        kind: 'chest',
        id: 'trail-chest',
        x: 4,
        y: 3,
        chestTable: 'dungeon',
      },
    ],
  },

  // ─── B1 ──────────────────────────────────────────────────
  b1_entrance: {
    id: 'b1_entrance',
    title: 'DUNJUN ENTRANCE · B1',
    floor: -1,
    mapX: 0,
    mapY: 0,
    north: 'b1_gate',
    east: 'b1_cube',
    stairsUp: 'overworld',
    tiles: [
      '########DD######',
      '#..............#',
      '#..####..####..#',
      '#..#........#..#',
      '#..#........#...',
      '#......UU......#',
      '#..#........#...',
      '#..#........#..#',
      '#..####..####..#',
      '#..............#',
      '################',
    ],
    entities: [
      {
        kind: 'sign',
        id: 'dungeon-rules',
        x: 3,
        y: 9,
        dialog: [
          'B1 ENTRANCE',
          'U = STAIRS UP (SURFACE)',
          'N = DEEPER HALLS',
          'E = THE SORRY CUBE',
        ],
      },
      {
        kind: 'skeleton',
        id: 'ent-skel-1',
        x: 4,
        y: 3,
        hp: 3,
      },
      {
        kind: 'skeleton',
        id: 'ent-skel-2',
        x: 11,
        y: 3,
        hp: 3,
      },
      {
        kind: 'chest',
        id: 'entrance-chest',
        x: 8,
        y: 8,
        chestTable: 'dungeon',
      },
    ],
  },

  b1_cube: {
    id: 'b1_cube',
    title: 'THE SORRY CUBE · B1',
    floor: -1,
    mapX: 1,
    mapY: 0,
    west: 'b1_entrance',
    tiles: [
      '################',
      '#..............#',
      '#..............#',
      '#....######....#',
      '#....#....#....#',
      '.....#....#....#',
      '#....#....#....#',
      '#....######....#',
      '#..............#',
      '#..............#',
      '################',
    ],
    entities: [
      {
        kind: 'cube',
        id: 'gel-cube',
        x: 8,
        y: 5,
        hp: 4,
        dialog: [
          '*WOBBLE*',
          'OH NO. DID I DISSOLVE YOUR',
          'BOOTS AGAIN? I AM SO SORRY.',
          'WEST LEADS BACK TO THE ENTRANCE.',
        ],
      },
      {
        kind: 'heart',
        id: 'cube-heart',
        x: 8,
        y: 8,
      },
      {
        kind: 'chest',
        id: 'cube-chest',
        x: 4,
        y: 2,
        chestTable: 'dungeon',
      },
    ],
  },

  b1_gate: {
    id: 'b1_gate',
    title: 'SPEAK, FRIEND · B1',
    floor: -1,
    mapX: 0,
    mapY: 1,
    north: 'b1_hall',
    south: 'b1_entrance',
    west: 'b1_trek',
    tiles: [
      '########LL######',
      '#..............#',
      '#..##......##..#',
      '#..............#',
      '...............#',
      '...............#',
      '...............#',
      '#..##......##..#',
      '#..............#',
      '#..............#',
      '########DD######',
    ],
    entities: [
      {
        kind: 'npc',
        id: 'gatekeeper',
        x: 5,
        y: 2,
        dialog: [
          'NORTH DOOR IS LOCKED.',
          '"SPEAK FRIEND AND ENTER."',
          'HINT: THE PASSWORD IS FRIEND.',
          'WEST: USS PLOT HOLE.',
          'SOUTH: ENTRANCE / STAIRS UP.',
        ],
      },
      {
        kind: 'key',
        id: 'friend-key',
        x: 12,
        y: 5,
      },
      {
        kind: 'sign',
        id: 'west-sign',
        x: 1,
        y: 5,
        dialog: [
          'WEST: ENGINEERING / BRIDGE',
          'RED SHIRTS: SHORT CAREERS.',
        ],
      },
    ],
  },

  b1_trek: {
    id: 'b1_trek',
    title: 'USS PLOT HOLE · B1',
    floor: -1,
    mapX: -1,
    mapY: 1,
    east: 'b1_gate',
    tiles: [
      '################',
      '#..............#',
      '#..PP......PP..#',
      '#..............#',
      '#..............#',
      '#.....####......',
      '#..............#',
      '#..PP......PP..#',
      '#..............#',
      '#..............#',
      '################',
    ],
    entities: [
      {
        kind: 'redshirt',
        id: 'ensign-1',
        x: 4,
        y: 4,
        hp: 1,
      },
      {
        kind: 'redshirt',
        id: 'ensign-2',
        x: 11,
        y: 4,
        hp: 1,
      },
      {
        kind: 'redshirt',
        id: 'ensign-3',
        x: 8,
        y: 8,
        hp: 1,
      },
      {
        kind: 'npc',
        id: 'captain',
        x: 8,
        y: 5,
        dialog: [
          "CAPTAIN'S LOG: STARDATE ???",
          'WE BEAMED INTO A DUNGEON.',
          'EAST RETURNS TO THE GATE.',
          'ENSIGNS: STOP DYING.',
        ],
      },
      {
        kind: 'heart',
        id: 'trek-heart',
        x: 8,
        y: 2,
      },
    ],
  },

  b1_hall: {
    id: 'b1_hall',
    title: 'HALL OF BAD IDEAS · B1',
    floor: -1,
    mapX: 0,
    mapY: 2,
    north: 'b1_descent',
    south: 'b1_gate',
    tiles: [
      '########DD######',
      '#..............#',
      '#.####....####.#',
      '#.#..........#.#',
      '#.#..######..#.#',
      '#.#..#....#..#.#',
      '#.#..#....#..#.#',
      '#.#..........#.#',
      '#.####....####.#',
      '#..............#',
      '########DD######',
    ],
    entities: [
      {
        kind: 'skeleton',
        id: 'hall-skel-1',
        x: 3,
        y: 5,
        hp: 3,
      },
      {
        kind: 'skeleton',
        id: 'hall-skel-2',
        x: 12,
        y: 5,
        hp: 3,
      },
      {
        kind: 'slime',
        id: 'hall-slime',
        x: 8,
        y: 3,
        hp: 2,
      },
      {
        kind: 'sign',
        id: 'descent-warning',
        x: 8,
        y: 8,
        dialog: [
          'NORTH: STAIRS TO B2',
          'THE DUNJUN GOES DEEPER.',
          'SOUTH: BACK TO THE GATE.',
        ],
      },
    ],
  },

  b1_descent: {
    id: 'b1_descent',
    title: 'DESCENT · B1',
    floor: -1,
    mapX: 0,
    mapY: 3,
    south: 'b1_hall',
    stairsDown: 'b2_foyer',
    tiles: [
      '################',
      '#..............#',
      '#..............#',
      '#....#SSSS#....#',
      '#....#....#....#',
      '#....#....#....#',
      '#....######....#',
      '#..............#',
      '#..............#',
      '#..............#',
      '########DD######',
    ],
    entities: [
      {
        kind: 'sign',
        id: 'b1-descent-sign',
        x: 3,
        y: 8,
        dialog: [
          'STAIRS DOWN: B2',
          'THE THRONE AWAITS BELOW.',
          'SOUTH: HALL OF BAD IDEAS.',
        ],
      },
      {
        kind: 'skeleton',
        id: 'descent-skel',
        x: 11,
        y: 7,
        hp: 4,
      },
    ],
  },

  // ─── B2 ──────────────────────────────────────────────────
  b2_foyer: {
    id: 'b2_foyer',
    title: 'LOWER FOYER · B2',
    floor: -2,
    mapX: 0,
    mapY: 0,
    north: 'b2_boss',
    stairsUp: 'b1_descent',
    tiles: [
      '########DD######',
      '#..............#',
      '#..............#',
      '#....#UUUU#....#',
      '#....#....#....#',
      '#....#....#....#',
      '#....######....#',
      '#..............#',
      '#..............#',
      '#..............#',
      '################',
    ],
    entities: [
      {
        kind: 'sign',
        id: 'b2-foyer-sign',
        x: 12,
        y: 8,
        dialog: [
          'B2: THE LOWER DEPTHS',
          'U = STAIRS UP TO B1',
          'N = THRONE OF META',
        ],
      },
      {
        kind: 'slime',
        id: 'b2-slime-1',
        x: 4,
        y: 8,
        hp: 3,
      },
      {
        kind: 'slime',
        id: 'b2-slime-2',
        x: 11,
        y: 8,
        hp: 3,
      },
    ],
  },

  b2_boss: {
    id: 'b2_boss',
    title: 'THRONE OF META · B2',
    floor: -2,
    mapX: 0,
    mapY: 1,
    south: 'b2_foyer',
    tiles: [
      '################',
      '#..............#',
      '#..##......##..#',
      '#..............#',
      '#..............#',
      '#......==......#',
      '#..............#',
      '#..............#',
      '#..##......##..#',
      '#..............#',
      '########DD######',
    ],
    entities: [
      {
        kind: 'boss',
        id: 'dungeon-master',
        x: 8,
        y: 3,
        hp: 12,
        dialog: [
          'I AM THE DUNGEON MASTER!',
          'YOU FOUND THE LOWER LEVEL.',
          'ROLL FOR INITIATIVE...',
          'NAT 1. AWKWARD.',
          'FINE. FIGHT ME ANYWAY!',
        ],
      },
      {
        kind: 'chest',
        id: 'boss-chest',
        x: 8,
        y: 5,
        chestTable: 'boss',
        dialog: [
          'THE CHEST DISGORGES LOOT.',
          'THE REAL TREASURE WAS THE',
          'CONSISTENT MAP LAYOUT.',
          'THANKS FOR PLAYING DUNJUNZ!',
        ],
      },
      {
        kind: 'merchant',
        id: 'tinkerer-boss',
        x: 3,
        y: 8,
        shopId: 'tinkerer',
        dialog: [
          'TINKERER: YOU BEAT THE DM?',
          'SOUTH THEN U TO CLIMB OUT.',
          'PRESS B TO BUY.',
        ],
      },
    ],
  },
};

/** Old room ids → new map ids (save migration). */
export const ROOM_ALIASES: Record<string, string> = {
  dungeon_1: 'b1_entrance',
  dungeon_side: 'b1_cube',
  dungeon_2: 'b1_gate',
  trek_room: 'b1_trek',
  dungeon_3: 'b1_hall',
  boss: 'b2_boss',
};

export function resolveRoomId(id: string): string {
  return ROOM_ALIASES[id] ?? id;
}

export const START_ROOM = 'overworld';

/** Human-readable floor label for HUD. */
export function floorLabel(floor: number | undefined): string {
  if (floor === undefined || floor === 0) return 'SURFACE';
  if (floor < 0) return `B${Math.abs(floor)}`;
  return `F${floor}`;
}
