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
 * - ONE door / stair tile only (D L S U). Never DD/SS/UU — wide look is
 *   in the texture art, not multi-tile ASCII.
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
    land: 'surface',
    floor: 0,
    mapX: 0,
    mapY: 0,
    east: 'overworld_east',
    stairsDown: 'b1_entrance',
    // Every row must be exactly 16 chars (VIEW_TILES_W). Short rows pad as
    // walls on the right — that silently sealed the east trail exit.
    tiles: [
      '################',
      '#gggggggggggggg#',
      '#gg........gggg#',
      '#g...dddd...ggg#',
      '#g..dddddd..ggg.',
      '#g....dS.d..ggg.',
      '#g....dd....ggg.',
      '#gg........gggg#',
      '#ggg~~~~~~ggggg#',
      '#gggg~~~~gggggg#',
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
          'PRINCESZ PRIZELLA WAS TAKEN!',
          'THE DUNJUN MASTER DRAGGED HER DOWN.',
          'STAIRS = DUNJUNZ. EAST = TRAIL.',
          'NORTH OF TRAIL: WOODZ. SOUTH: DEZERTZ.',
          'FIND MAPZ. FORJE STEEL. SAVE HER.',
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
          'QUEST: SAVE PRIZELLA',
          'STAIRS = DUNJUNZ B1',
          'EAST TRAIL → WOODZ / DEZERTZ',
          'PRESS M FOR MAPZ (WHEN FOUND)',
          'PRESS F AT A FORJE TO FORJE',
        ],
      },
      {
        kind: 'mapz',
        id: 'mapz-surface',
        x: 10,
        y: 4,
        mapzId: 'surface',
        dialog: ['YOU FOUND SURFACE MAPZ!', 'PRESS M TO VIEW.'],
      },
    ],
  },

  overworld_east: {
    id: 'overworld_east',
    title: 'TROPE TRAIL · SURFACE',
    land: 'surface',
    floor: 0,
    mapX: 1,
    mapY: 0,
    west: 'overworld',
    north: 'woodz_edge',
    south: 'dezertz_edge',
    // Rows must be 16 wide; west corridor (y=5) stays open for meadow entry.
    tiles: [
      '########D#######',
      '#gggggggggggggg#',
      '#g..........ggg#',
      '#g..########..g#',
      '#g..#......#..g#',
      '....#..~~..#..g#',
      '#g..#......#..g#',
      '#g..###..###..g#',
      '#g............g#',
      '#gggggggggggggg#',
      '########D#######',
    ],
    entities: [
      {
        kind: 'npc',
        id: 'bard',
        x: 10,
        y: 8,
        dialog: [
          'I SING OF PRIZELLA LOST...',
          'NORTH: WOODZ. SOUTH: DEZERTZ.',
          'WEST: MEADOW + DUNJUN STAIRS.',
          'THE MAPZ WILL HELP. IF YOU FIND THEM.',
        ],
      },
      {
        kind: 'slime',
        id: 'trail-slime-1',
        x: 6,
        y: 5,
        hp: 6,
      },
      {
        kind: 'slime',
        id: 'trail-slime-2',
        x: 9,
        y: 4,
        hp: 6,
      },
      {
        kind: 'merchant',
        id: 'tinkerer-meadow',
        x: 12,
        y: 7,
        shopId: 'tinkerer',
        dialog: [
          'TINKERER: RARE WARES!',
          'PRESS E TO OPEN THE SHOP GRID.',
          'ARROWS SELECT · ENTER/B BUY.',
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
    land: 'dunjunz',
    floor: -1,
    mapX: 0,
    mapY: 0,
    north: 'b1_gate',
    east: 'b1_cube',
    stairsUp: 'overworld',
    tiles: [
      '########D#######',
      '#..............#',
      '#..####..####..#',
      '#..#........#..#',
      '#..#........#...',
      '#......U.......#',
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
        hp: 12,
      },
      {
        kind: 'skeleton',
        id: 'ent-skel-2',
        x: 11,
        y: 3,
        hp: 12,
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
    land: 'dunjunz',
    floor: -1,
    mapX: 1,
    mapY: 0,
    west: 'b1_entrance',
    // Open chamber — no thick pen walls so you can walk up and talk (E)
    tiles: [
      '################',
      '#..............#',
      '#..............#',
      '#..............#',
      '#..............#',
      '...............#',
      '#..............#',
      '#..............#',
      '#..............#',
      '#..............#',
      '################',
    ],
    entities: [
      {
        kind: 'cube',
        id: 'gel-cube',
        x: 10,
        y: 5,
        hp: 24,
        dialog: [
          '*WOBBLE*',
          'OH NO. DID I DISSOLVE YOUR',
          'BOOTS AGAIN? I AM SO SORRY.',
          'PLEASE TAKE THESE INSTEAD.',
          'WEST LEADS BACK TO THE ENTRANCE.',
        ],
      },
      {
        kind: 'sign',
        id: 'cube-sign',
        x: 3,
        y: 3,
        dialog: [
          'THE SORRY CUBE',
          'E = TALK (GIFT IF KIND)',
          'SWORD = FIGHT (DIFFERENT LOOT)',
          'IT ONLY FIGHTS IF HIT FIRST.',
        ],
      },
      {
        kind: 'heart',
        id: 'cube-heart',
        x: 12,
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
    land: 'dunjunz',
    floor: -1,
    mapX: 0,
    mapY: 1,
    north: 'b1_hall',
    south: 'b1_entrance',
    west: 'b1_trek',
    tiles: [
      '########L#######',
      '#..............#',
      '#..##......##..#',
      '#..............#',
      '...............#',
      '...............#',
      '...............#',
      '#..##......##..#',
      '#..............#',
      '#..............#',
      '########D#######',
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
    land: 'dunjunz',
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
        hp: 3,
      },
      {
        kind: 'redshirt',
        id: 'ensign-2',
        x: 11,
        y: 4,
        hp: 3,
      },
      {
        kind: 'redshirt',
        id: 'ensign-3',
        x: 8,
        y: 8,
        hp: 3,
      },
      {
        kind: 'npc',
        id: 'captain',
        x: 8,
        y: 5,
        dialog: [
          "CAPTAIN'S LOG: STARDATE ???",
          'GOLD SHIRT. COMMAND TRACK.',
          'WE BEAMED INTO A DUNGEON.',
          'EAST RETURNS TO THE GATE.',
          'ENSIGNS IN RED: STOP DYING.',
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
    land: 'dunjunz',
    floor: -1,
    mapX: 0,
    mapY: 2,
    north: 'b1_descent',
    south: 'b1_gate',
    tiles: [
      '########D#######',
      '#..............#',
      '#.####....####.#',
      '#.#..........#.#',
      '#.#..######..#.#',
      '#.#..#....#..#.#',
      '#.#..#....#..#.#',
      '#.#..........#.#',
      '#.####....####.#',
      '#..............#',
      '########D#######',
    ],
    entities: [
      {
        kind: 'skeleton',
        id: 'hall-skel-1',
        x: 3,
        y: 5,
        hp: 12,
      },
      {
        kind: 'skeleton',
        id: 'hall-skel-2',
        x: 12,
        y: 5,
        hp: 12,
      },
      {
        kind: 'slime',
        id: 'hall-slime',
        x: 8,
        y: 3,
        hp: 6,
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
    land: 'dunjunz',
    floor: -1,
    mapX: 0,
    mapY: 3,
    south: 'b1_hall',
    stairsDown: 'b2_foyer',
    // Open stairs (single tile) — not a sealed shaft that traps the player
    tiles: [
      '################',
      '#..............#',
      '#..............#',
      '#......S.......#',
      '#..............#',
      '#..............#',
      '#..............#',
      '#..............#',
      '#..............#',
      '#..............#',
      '########D#######',
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
        hp: 14,
      },
    ],
  },

  // ─── B2 ──────────────────────────────────────────────────
  b2_foyer: {
    id: 'b2_foyer',
    title: 'LOWER FOYER · B2',
    land: 'dunjunz',
    floor: -2,
    mapX: 0,
    mapY: 0,
    north: 'b2_boss',
    stairsUp: 'b1_descent',
    // Open stairs-up in the middle of the floor (was a sealed UUUU pit)
    tiles: [
      '########D#######',
      '#..............#',
      '#..............#',
      '#......U.......#',
      '#..............#',
      '#..............#',
      '#..............#',
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
        hp: 8,
      },
      {
        kind: 'slime',
        id: 'b2-slime-2',
        x: 11,
        y: 8,
        hp: 8,
      },
    ],
  },

  b2_boss: {
    id: 'b2_boss',
    title: 'THRONE OF META · B2',
    land: 'dunjunz',
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
      '########D#######',
    ],
    entities: [
      {
        kind: 'boss',
        id: 'dungeon-master',
        x: 8,
        y: 3,
        hp: 40,
        dialog: [
          'I AM THE DUNGEON MASTER!',
          'PRIZELLA? ALREADY SHIPPED',
          'TO THE DEZERTZ. HA HA.',
          'ROLL FOR INITIATIVE...',
          'NAT 1. AWKWARD. FIGHT!',
        ],
      },
      {
        kind: 'chest',
        id: 'boss-chest',
        x: 8,
        y: 5,
        chestTable: 'boss',
        dialog: [
          'LEGENDARY DUNJUN LOOT!',
          'MAPZ OF THE WIDE WORLD...',
          'PRIZELLA AWAITS IN DEZERTZ.',
        ],
      },
      {
        kind: 'mapz',
        id: 'mapz-dunjunz',
        x: 12,
        y: 3,
        mapzId: 'dunjunz',
        dialog: ['DUNJUNZ MAPZ ACQUIRED!', 'PRESS M TO VIEW.'],
      },
      {
        kind: 'merchant',
        id: 'tinkerer-boss',
        x: 3,
        y: 8,
        shopId: 'tinkerer',
        dialog: [
          'TINKERER: SHE WAS NEVER HERE.',
          'TRY THE DEZERTZ TOWER.',
          'PRESS E FOR THE SHOP GRID.',
        ],
      },
    ],
  },

  // ─── WOODZ ───────────────────────────────────────────────
  woodz_edge: {
    id: 'woodz_edge',
    title: 'WOODZ EDGE',
    land: 'woodz',
    floor: 0,
    mapX: 1,
    mapY: 1,
    south: 'overworld_east',
    north: 'woodz_deep',
    tiles: [
      '########D#######',
      '#gg..gg..gg..gg#',
      '#g..####..####g#',
      '#g..#......#..g#',
      '#gg.#......#.gg#',
      '#gg............#',
      '#gg.#......#.gg#',
      '#g..#......#..g#',
      '#g..####..####g#',
      '#gg..gg..gg..gg#',
      '########D#######',
    ],
    entities: [
      {
        kind: 'wolf',
        id: 'woodz-wolf-1',
        x: 5,
        y: 5,
        hp: 14,
      },
      {
        kind: 'wolf',
        id: 'woodz-wolf-2',
        x: 10,
        y: 5,
        hp: 14,
      },
      {
        kind: 'sign',
        id: 'woodz-sign',
        x: 3,
        y: 2,
        dialog: [
          'THE WOODZ',
          'NORTH: WOLF LORD',
          'SOUTH: BACK TO TRAIL',
        ],
      },
      {
        kind: 'chest',
        id: 'woodz-chest',
        x: 12,
        y: 3,
        chestTable: 'dungeon',
      },
    ],
  },

  woodz_deep: {
    id: 'woodz_deep',
    title: 'WOLF LORD CLEARING',
    land: 'woodz',
    floor: 0,
    mapX: 1,
    mapY: 2,
    south: 'woodz_edge',
    tiles: [
      '################',
      '#gg..........gg#',
      '#g....####....g#',
      '#g...#....#...g#',
      '#g...#....#...g#',
      '#g............g#',
      '#g...#....#...g#',
      '#g...#....#...g#',
      '#g....####....g#',
      '#gg..........gg#',
      '########D#######',
    ],
    entities: [
      {
        kind: 'boss',
        id: 'wolf-lord',
        x: 8,
        y: 4,
        hp: 48,
        dialog: [
          'WOLF LORD: THIS IS MY FOREST!',
          'THE PRINCESZ WAS NEVER HERE.',
          'BUT MY SHARDZ ARE.',
        ],
      },
      {
        kind: 'mapz',
        id: 'mapz-woodz',
        x: 4,
        y: 3,
        mapzId: 'woodz',
        dialog: ['WOODZ MAPZ FOUND!', 'PRESS M TO VIEW.'],
      },
      {
        kind: 'forje',
        id: 'forje-woodz',
        x: 12,
        y: 7,
        dialog: [
          'A CRUDE FORJE.',
          'PRESS F TO FORJE GEAR.',
          'NEED OREZ AND SHARDZ.',
        ],
      },
    ],
  },

  // ─── DEZERTZ ─────────────────────────────────────────────
  dezertz_edge: {
    id: 'dezertz_edge',
    title: 'DEZERTZ EDGE',
    land: 'dezertz',
    floor: 0,
    mapX: 1,
    mapY: -1,
    north: 'overworld_east',
    south: 'dezertz_tower',
    tiles: [
      '########D#######',
      '#dd..dd..dd..dd#',
      '#d............d#',
      '#d..########..d#',
      '#d..#......#..d#',
      '#d............d#',
      '#d..#......#..d#',
      '#d..########..d#',
      '#d............d#',
      '#dd..dd..dd..dd#',
      '########D#######',
    ],
    entities: [
      {
        kind: 'cactus',
        id: 'dez-cactus-1',
        x: 5,
        y: 5,
        hp: 16,
      },
      {
        kind: 'cactus',
        id: 'dez-cactus-2',
        x: 11,
        y: 5,
        hp: 16,
      },
      {
        kind: 'sign',
        id: 'dez-sign',
        x: 8,
        y: 2,
        dialog: [
          'DEZERTZ',
          'SOUTH: SAND TOWER',
          'PRIZELLA IS SAID TO BE THERE.',
        ],
      },
      {
        kind: 'mapz',
        id: 'mapz-dezertz',
        x: 3,
        y: 8,
        mapzId: 'dezertz',
        dialog: ['DEZERTZ MAPZ!', 'PRESS M TO VIEW.'],
      },
      {
        kind: 'forje',
        id: 'forje-dezertz',
        x: 12,
        y: 8,
        dialog: [
          'A SAND FORJE GLOWS HOT.',
          'PRESS F TO FORJE.',
        ],
      },
    ],
  },

  dezertz_tower: {
    id: 'dezertz_tower',
    title: 'SAND TOWER · DEZERTZ',
    land: 'dezertz',
    floor: 0,
    mapX: 1,
    mapY: -2,
    north: 'dezertz_edge',
    tiles: [
      '################',
      '#dd..........dd#',
      '#d....####....d#',
      '#d...#....#...d#',
      '#d...#....#...d#',
      '#d............d#',
      '#d...#....#...d#',
      '#d...#....#...d#',
      '#d....####....d#',
      '#dd..........dd#',
      '########D#######',
    ],
    entities: [
      {
        kind: 'boss',
        id: 'sand-wraith',
        x: 8,
        y: 3,
        hp: 56,
        dialog: [
          'SAND WRAITH: THE PRINCESZ IS MINE!',
          'OR AT LEAST... RENTED.',
          'FACE THE DUNES!',
        ],
      },
      {
        kind: 'princess',
        id: 'prizella',
        x: 10,
        y: 5,
        dialog: [
          'PRIZELLA: YOU CAME!',
          'I WAS THIS CLOSE TO ESCAPING',
          'USING A GRAPH SPREADSHEET.',
          'DEFEAT THE WRAITH. THEN TALK.',
        ],
      },
      {
        kind: 'chest',
        id: 'dez-chest',
        x: 4,
        y: 5,
        chestTable: 'boss',
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
