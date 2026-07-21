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
          'ALSO: PRINCESZ PRIZELLA GOT KIDNAPPED.',
          'THE DUNJUN MASTER DID THE YEETING.',
          'STAIRS = DUNJUNZ. EAST = THE TRAIL.',
          'NORTH OF TRAIL: WOODZ. SOUTH: DEZERTZ.',
          'GRAB MAPZ. FORJE STEEL. SAVE HER.',
          'MATHEMATICAL!',
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
          'OFFICIAL QUEST SIGN (VERY OFFICIAL)',
          'SAVE PRIZELLA. SHE RULES. LITERALLY.',
          'STAIRS = DUNJUNZ B1. EAST = TRAIL.',
          'TRAIL NORTH: WOODZ. SOUTH: DEZERTZ.',
          'M = MAPZ (ONCE YOU FIND SOME)',
          'F AT A FORJE = MAKE COOLER STUFF',
        ],
      },
      {
        kind: 'mapz',
        id: 'mapz-surface',
        x: 10,
        y: 4,
        mapzId: 'surface',
        dialog: [
          'WHOA — SURFACE MAPZ!',
          'IT SMELLS LIKE ADVENTURE AND DIRT.',
          'PRESS M TO UNFURL IT.',
        ],
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
          '♪ PRIZELLA LOST, THE BALLAD OF DUST ♪',
          '...sorry, still workshopping the chorus.',
          'NORTH: WOODZ. SOUTH: HOT DEZERTZ.',
          'WEST: MEADOW + THOSE SPOOKY STAIRS.',
          'MAPZ HELP. IF YOU, Y\'KNOW, FIND THEM.',
        ],
      },
      {
        kind: 'slime',
        id: 'trail-slime-1',
        x: 6,
        y: 5,
        // HP from ENEMY_BASE_HP (trail creeps are not pushovers)
      },
      {
        kind: 'slime',
        id: 'trail-slime-2',
        x: 9,
        y: 4,
      },
      {
        kind: 'merchant',
        id: 'tinkerer-meadow',
        x: 12,
        y: 7,
        shopId: 'tinkerer',
        dialog: [
          'TINKERER: RARE WARES! FAIR-ISH PRICES!',
          'I DON\'T JUDGE YOUR FASHION. MUCH.',
          'E OPENS THE SHOP GRID. BUY LEFT, SELL RIGHT.',
          'BRING COINZ. OR BONES. I BUY BONES.',
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
          'B1 ENTRANCE — WELCOME TO THE UNDERGROUND',
          'U = BACK TO GRASS AND SUNLIGHT',
          'N = DEEPER HALLS (BAD IDEAS LIVE THERE)',
          'E = THE SORRY CUBE. BE NICE... OR DON\'T.',
        ],
      },
      {
        kind: 'skeleton',
        id: 'ent-skel-1',
        x: 4,
        y: 3,
      },
      {
        kind: 'skeleton',
        id: 'ent-skel-2',
        x: 11,
        y: 3,
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
        dialog: [
          '*WOBBLE* ...hi.',
          'OH GLOB. DID I DISSOLVE YOUR BOOTS AGAIN?',
          'I AM SO, SO SORRY. LIKE. EMOTIONALLY.',
          'PLEASE TAKE THESE INSTEAD. THEY\'RE NICE.',
          'WEST GOES BACK. I\'LL JUST... sit here.',
        ],
      },
      {
        kind: 'sign',
        id: 'cube-sign',
        x: 3,
        y: 3,
        dialog: [
          'LOCAL LEGEND: THE SORRY CUBE',
          'E = TALK. KINDNESS HAS LOOT.',
          'SWORD = DIFFERENT LOOT. RUDE LOOT.',
          'IT ONLY FIGHTS IF YOU START IT.',
          'CHOOSE YOUR VIBE.',
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
          'NORTH DOOR: LOCKED. VERY LOCKED.',
          '"SPEAK FRIEND AND ENTER."',
          'HINT: THE PASSWORD IS... FRIEND.',
          'I KNOW. I KNOW. IT\'S RIGHT THERE.',
          'WEST: USS PLOT HOLE. RED SHIRTS GALORE.',
          'SOUTH: ESCAPE HATCH TO B1 ENTRANCE.',
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
          'RED SHIRTS: SHORT, NOBLE CAREERS.',
          'GOLD SHIRT: TALKS A LOT. SURVIVES.',
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
      },
      {
        kind: 'redshirt',
        id: 'ensign-2',
        x: 11,
        y: 4,
      },
      {
        kind: 'redshirt',
        id: 'ensign-3',
        x: 8,
        y: 8,
      },
      {
        kind: 'npc',
        id: 'captain',
        x: 8,
        y: 5,
        dialog: [
          "CAPTAIN'S LOG: STARDATE... UH...",
          'GOLD SHIRT. COMMAND TRACK. VIBES: 10.',
          'WE BEAMED INTO A DUNGEON. COOL. COOL.',
          'EAST RETURNS TO THE GATE.',
          'ENSIGNS IN RED: PLEASE STOP DYING.',
          'THAT\'S AN ORDER. A SOFT ORDER.',
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
      },
      {
        kind: 'skeleton',
        id: 'hall-skel-2',
        x: 12,
        y: 5,
      },
      {
        kind: 'slime',
        id: 'hall-slime',
        x: 8,
        y: 3,
      },
      {
        kind: 'sign',
        id: 'descent-warning',
        x: 8,
        y: 8,
        dialog: [
          'NORTH: STAIRS TO B2',
          'THE DUNJUN GOES DEEPER. ON PURPOSE.',
          'SOUTH: BACK TO THE GATE. NO SHAME.',
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
          'B2: THE LOWER DEPTHS. VERY LOWER.',
          'U = STAIRS UP (FRESH AIR OPTIONAL)',
          'N = THRONE OF META. BRING SNACKS.',
        ],
      },
      {
        kind: 'slime',
        id: 'b2-slime-1',
        x: 4,
        y: 8,
      },
      {
        kind: 'slime',
        id: 'b2-slime-2',
        x: 11,
        y: 8,
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
        hp: 52,
        dialog: [
          'I AM THE DUNGEON MASTER!',
          'PRIZELLA? YEAH I SHIPPED HER',
          'TO THE DEZERTZ. HA. HA. ...HA.',
          'ROLL FOR INITIATIVE—',
          'NAT 1. AWKWARD.',
          'OKAY FINE. FIGHT!',
        ],
      },
      {
        kind: 'chest',
        id: 'boss-chest',
        x: 8,
        y: 5,
        chestTable: 'boss',
        dialog: [
          'LEGENDARY DUNJUN LOOT. SHINY.',
          'MAPZ OF THE WIDE WEIRD WORLD...',
          'PRIZELLA\'S IN THE DEZERTZ. GO GET HER.',
        ],
      },
      {
        kind: 'mapz',
        id: 'mapz-dunjunz',
        x: 12,
        y: 3,
        mapzId: 'dunjunz',
        dialog: [
          'DUNJUNZ MAPZ! IT\'S ALL HALLWAYS.',
          'PRESS M. GET LOST ON PURPOSE.',
        ],
      },
      {
        kind: 'merchant',
        id: 'tinkerer-boss',
        x: 3,
        y: 8,
        shopId: 'tinkerer',
        dialog: [
          'TINKERER: YEAH SHE WAS NEVER HERE.',
          'I\'D KNOW. I SELL TO EVERYONE.',
          'TRY THE DEZERTZ TOWER. HOT. SANDY.',
          'E FOR THE SHOP. BUY STUFF. LIVE A LITTLE.',
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
    east: 'woodz_hollow',
    tiles: [
      '########D#######',
      '#gg..gg..gg..gg#',
      '#g..####..####g#',
      '#g..#......#..g#',
      '#gg.#......#.gg.',
      '#gg.............',
      '#gg.#......#.gg.',
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
      },
      {
        kind: 'wolf',
        id: 'woodz-wolf-2',
        x: 10,
        y: 5,
      },
      {
        kind: 'sign',
        id: 'woodz-sign',
        x: 3,
        y: 2,
        dialog: [
          'THE WOODZ — TREES, HOWLING, VIBES',
          'NORTH: WOLF LORD (HE THINKS HE OWNS THIS)',
          'EAST: BEST BUD HOLLOW (PROBABLY)',
          'SOUTH: BACK TO THE TRAIL. SMART.',
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

  woodz_hollow: {
    id: 'woodz_hollow',
    title: 'BEST BUD HOLLOW · WOODZ',
    land: 'woodz',
    floor: 0,
    mapX: 2,
    mapY: 1,
    west: 'woodz_edge',
    tiles: [
      '################',
      '#gg..........gg#',
      '#g....####....g#',
      '#g...#....#...g#',
      '#g...#....#...g#',
      '.....#..~~#...g#',
      '#g...#....#...g#',
      '#g...#....#...g#',
      '#g....####....g#',
      '#gg..........gg#',
      '################',
    ],
    entities: [
      {
        kind: 'sign',
        id: 'hollow-sign',
        x: 8,
        y: 2,
        dialog: [
          'BEST BUD DEN (PROBABLY)',
          'IF YOU MEET SOMEONE WEIRD AND LOYAL —',
          'THAT\'S THE POINT. BE COOL ABOUT IT.',
        ],
      },
      {
        kind: 'best_bud',
        id: 'best-bud-den',
        x: 8,
        y: 5,
        dialog: [
          '...A WEIRD CREATURE LOOKS UP.',
          '(TALK WITH E WHEN YOU\'RE ON THE QUEST.)',
        ],
      },
      {
        kind: 'heart',
        id: 'hollow-heart',
        x: 4,
        y: 7,
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
          'THE PRINCESZ? NEVER MET HER.',
          'BUT MY SHARDZ? ALL MINE.',
          'COME GET SOME. IF YOU DARE. AWOO.',
        ],
      },
      {
        kind: 'mapz',
        id: 'mapz-woodz',
        x: 4,
        y: 3,
        mapzId: 'woodz',
        dialog: [
          'WOODZ MAPZ! MOSTLY TREES. HONESTLY.',
          'PRESS M. TRY NOT TO GET BIT.',
        ],
      },
      {
        kind: 'forje',
        id: 'forje-woodz',
        x: 12,
        y: 7,
        dialog: [
          'A CRUDE FORJE. IT\'S TRYING ITS BEST.',
          'E OR F: OPEN THE FORJE GRID.',
          'FEED IT OREZ AND SHARDZ. MAKE MAGIC.',
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
      },
      {
        kind: 'cactus',
        id: 'dez-cactus-2',
        x: 11,
        y: 5,
      },
      {
        kind: 'sign',
        id: 'dez-sign',
        x: 8,
        y: 2,
        dialog: [
          'DEZERTZ — HOT. SANDY. DRAMATIC.',
          'SOUTH: SAND TOWER. VERY TOWER.',
          'PRIZELLA\'S PROBABLY THERE. BRING WATER.',
        ],
      },
      {
        kind: 'mapz',
        id: 'mapz-dezertz',
        x: 3,
        y: 8,
        mapzId: 'dezertz',
        dialog: [
          'DEZERTZ MAPZ! MOSTLY SAND. SOME MORE SAND.',
          'PRESS M. STAY HYDRATED. MENTALLY.',
        ],
      },
      {
        kind: 'forje',
        id: 'forje-dezertz',
        x: 12,
        y: 8,
        dialog: [
          'A SAND FORJE GLOWS HOT. COOL HOT.',
          'E OR F: OPEN THE FORJE GRID.',
          'MAKE SOMETHING THAT HISSES.',
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
    // Edge is north of the tower — door must open north (was sealed wall + dead-end south D).
    north: 'dezertz_edge',
    tiles: [
      '########D#######',
      '#dd..........dd#',
      '#d....####....d#',
      '#d...#....#...d#',
      '#d...#....#...d#',
      '#d............d#',
      '#d...#....#...d#',
      '#d...#....#...d#',
      '#d....####....d#',
      '#dd..........dd#',
      '################',
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
          'OR AT LEAST... RENTED. MONTHLY.',
          'FACE THE DUNES, LITTLE HERO!',
          'I AM VERY SANDY AND VERY SERIOUS.',
        ],
      },
      {
        kind: 'princess',
        id: 'prizella',
        x: 10,
        y: 5,
        dialog: [
          'PRIZELLA: YOU CAME! MATHEMATICAL!',
          'I WAS THIS CLOSE TO ESCAPING WITH A',
          'GRAPH SPREADSHEET AND A BAD ATTITUDE.',
          'BONK THE WRAITH FIRST. THEN WE TALK.',
          'I\'VE GOT KINGDOM STUFF TO SORT OUT.',
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
