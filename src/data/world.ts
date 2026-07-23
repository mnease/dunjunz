import type { RoomDef } from '../types';
import { buildAllDeepRooms } from './world-deep';
import { FELLOWSHIP_ROOMS } from './fellowship-rooms';

/**
 * Tile legend (authored 16×11 rooms, NES Zelda-style):
 *  . floor   # wall   g grass   d dirt   s sand   ~ water
 *  c royal carpet / dais (kingdom throne)
 *  Water auto-classifies: ocean (beach), pond (closed → koi), river (channels / edge strips).
 *  D open door   L locked door
 *  S stairs DOWN   U stairs UP
 *  = lava    P transporter pad
 *
 * Live view expands each room to fill the 16:9 playfield (see room-expand.ts
 * + VIEW_TILES_* in config). Authored rows stay 16 wide / 11 tall.
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
 *   beach_start --N-- overworld --E-- overworld_east
 *                      | W guild_hall  | S cave mouth
 *                      |               | N woodz / S dezertz (from trail)
 *                      v
 *                   b1_entrance …
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
 * B2…B7 (generated in world-deep.ts) — 4 rooms each, stairs chain
 * B8 (floor -8) — throne of meta (dungeon-master)
 * Woodz / Dezertz / Sewerz also gain B1–B3 / B2–B4 deep wings (4× levels).
 */

export const ROOMS: Record<string, RoomDef> = {
  // ─── BEACH START ────────────────────────────────────────
  /**
   * Wake-up beach south of the meadow. Crawl id assigned here.
   * North → meadow (cave mouth + guild sign).
   */
  beach_start: {
    id: 'beach_start',
    title: 'STRANGE BEACH · SURFACE',
    land: 'surface',
    floor: 0,
    mapX: 0,
    // South of meadow (mapY increases north — validator + mapz north-up).
    mapY: -1,
    north: 'overworld',
    // s = sand, d = packed dirt path to north meadow door, ~ = ocean.
    tiles: [
      '#######D########',
      '#ssssdddddsssss#',
      '#sssssddddsssss#',
      '#sssssddddsssss#',
      '#sssssddddsssss#',
      '#sss~~~~~~~~sss#',
      '#ss~~~~~~~~~~ss#',
      '#~~~~~~~~~~~~~~#',
      '#~~~~~~~~~~~~~~#',
      '#~~~~~~~~~~~~~~#',
      '################',
    ],
    entities: [
      {
        kind: 'sign',
        id: 'beach-driftwood',
        x: 11,
        y: 3,
        dialog: [
          'DRIFTWOOD SCRATCHES:',
          '"IF YOU CAN READ THIS, WALK NORTH."',
          '"THE VOICE IS USUALLY RIGHT."',
        ],
      },
      // Coconut palms (dune line)
      { kind: 'palm', id: 'palm-nw', x: 2, y: 2, scale: 1.35 },
      { kind: 'palm', id: 'palm-ne', x: 13, y: 2, scale: 1.45 },
      { kind: 'palm', id: 'palm-w', x: 1, y: 4, scale: 1.2 },
      { kind: 'palm', id: 'palm-e', x: 14, y: 3, scale: 1.25 },
      // Seaweed near the waterline
      { kind: 'seaweed', id: 'weed-a', x: 3, y: 5 },
      { kind: 'seaweed', id: 'weed-b', x: 5, y: 5 },
      { kind: 'seaweed', id: 'weed-c', x: 10, y: 5 },
      { kind: 'seaweed', id: 'weed-d', x: 12, y: 5 },
      { kind: 'seaweed', id: 'weed-e', x: 4, y: 4 },
      { kind: 'seaweed', id: 'weed-f', x: 11, y: 4 },
      // Non-combat crabs scuttling on the sand
      { kind: 'crab', id: 'crab-1', x: 4, y: 3 },
      { kind: 'crab', id: 'crab-2', x: 8, y: 4 },
      { kind: 'crab', id: 'crab-3', x: 12, y: 3 },
      { kind: 'crab', id: 'crab-4', x: 6, y: 2 },
    ],
  },

  // ─── TRAINING GUILD ─────────────────────────────────────
  /**
   * Training Guild — ominous living quarters (EMA atmosphere).
   * Enter from the meadow west; east door locks until tutorial_complete.
   * Deep ambient gloom via ambientForRoom('guild_hall') + punched fixtures.
   */
  guild_hall: {
    id: 'guild_hall',
    title: 'TRAINING GUILD · HALL',
    land: 'surface',
    floor: 0,
    mapX: -1,
    mapY: 0,
    // East unlocks when tutorial_complete (locks behind you on entry)
    east: 'overworld',
    tiles: [
      '################',
      '#..............#',
      '#..##......##..#',
      '#..............#',
      '#..............#',
      '#..............L',
      '#..............#',
      '#..............#',
      '#..##......##..#',
      '#..............#',
      '################',
    ],
    entities: [
      // ── Guild Master + drill core ──────────────────────────
      {
        kind: 'npc',
        id: 'guild-master',
        x: 8,
        y: 5,
        dialog: [
          'GUILD MASTER: TALK TO ME, CRAWLER.',
          'I RUN THE TRAINING HALL.',
        ],
      },
      { kind: 'dummy', id: 'dummy-nw', x: 4, y: 3 },
      { kind: 'dummy', id: 'dummy-ne', x: 11, y: 3 },
      { kind: 'dummy', id: 'dummy-sw', x: 4, y: 7 },
      { kind: 'dummy', id: 'dummy-se', x: 11, y: 7 },
      { kind: 'rack', id: 'rack-sword', x: 5, y: 2 },
      { kind: 'rack', id: 'rack-axe', x: 7, y: 2 },
      { kind: 'rack', id: 'rack-bow', x: 9, y: 2 },
      { kind: 'rack', id: 'rack-staff', x: 11, y: 2 },
      {
        kind: 'sign',
        id: 'guild-entrance-sign',
        x: 13,
        y: 5,
        dialog: [
          'SPEAK WITH THE GUILD MASTER.',
          'HE STANDS IN THE CENTER.',
          'EAST DOOR STAYS LOCKED UNTIL YOU GRADUATE.',
        ],
      },
      {
        kind: 'sign',
        id: 'guild-rules',
        x: 8,
        y: 8,
        dialog: [
          'TRAINING GUILD RULES',
          '1. RACK (E) — EQUIP A WEAPON',
          '2. DUMMY — DEAL FULL HP PER WEAPON',
          '   SWORD → AXE → BOW → STAFF',
          '3. TALK TO THE GUILD MASTER TO GRADUATE',
          '4. EAST DOOR OPENS AFTER GRADUATION',
        ],
      },

      // ── Wall torches (cookie light radii) ───────────────────
      { kind: 'torch_wall', id: 'guild-torch-n1', x: 3, y: 1 },
      { kind: 'torch_wall', id: 'guild-torch-n2', x: 8, y: 1 },
      { kind: 'torch_wall', id: 'guild-torch-n3', x: 12, y: 1 },
      { kind: 'torch_wall', id: 'guild-torch-s1', x: 3, y: 9 },
      { kind: 'torch_wall', id: 'guild-torch-s2', x: 12, y: 9 },
      { kind: 'torch_wall', id: 'guild-torch-w1', x: 1, y: 3 },
      { kind: 'torch_wall', id: 'guild-torch-w2', x: 1, y: 7 },
      { kind: 'torch_wall', id: 'guild-torch-e1', x: 14, y: 3 },
      { kind: 'torch_wall', id: 'guild-torch-e2', x: 14, y: 7 },

      // ── Bookshelves lining the hall (living quarters) ──────
      { kind: 'bookshelf', id: 'shelf-nw-a', x: 1, y: 1, dialog: ['DUSTY TOMES. "ON NOT DYING." VOLUME I.'] },
      { kind: 'bookshelf', id: 'shelf-nw-b', x: 2, y: 1, dialog: ['LEDGERS OF OLD GRADUATES. MOSTLY CROSSED OUT.'] },
      { kind: 'bookshelf', id: 'shelf-n-a', x: 5, y: 1, dialog: ['FIELD MANUAL: SWORDS, POLITELY.'] },
      { kind: 'bookshelf', id: 'shelf-n-b', x: 10, y: 1, dialog: ['AXE THEORY. CHAPTER ONE: "HIT HARDER."'] },
      { kind: 'bookshelf', id: 'shelf-ne-a', x: 13, y: 1, dialog: ['BOW STRINGS AND BAD POETRY.'] },
      { kind: 'bookshelf', id: 'shelf-ne-b', x: 14, y: 1, dialog: ['STAFF LORE. SMELLS LIKE OZONE.'] },
      { kind: 'bookshelf', id: 'shelf-w-a', x: 1, y: 2, dialog: ['A SHELF OF UNFINISHED APOLOGIES.'] },
      { kind: 'bookshelf', id: 'shelf-w-b', x: 1, y: 4, dialog: ['MAPS OF PLACES THAT NO LONGER EXIST.'] },
      { kind: 'bookshelf', id: 'shelf-w-c', x: 1, y: 5, dialog: ['THE MASTER\'S NOTES. DO NOT READ ALOUD.'] },
      { kind: 'bookshelf', id: 'shelf-w-d', x: 1, y: 6, dialog: ['TAX LAW FOR ADVENTURERS. THICKER THAN STEEL.'] },
      { kind: 'bookshelf', id: 'shelf-w-e', x: 1, y: 8, dialog: ['BESTIARY. THE MARGINS HAVE TEETH MARKS.'] },
      { kind: 'bookshelf', id: 'shelf-w-f', x: 1, y: 9, dialog: ['SLEEPING BAGS FOR THE NIGHT WATCH. EMPTY.'] },
      { kind: 'bookshelf', id: 'shelf-e-a', x: 14, y: 2, dialog: ['RELICS WRAPPED IN CLOTH. DO NOT UNWRAP.'] },
      { kind: 'bookshelf', id: 'shelf-e-b', x: 14, y: 4, dialog: ['A HIDDEN FLASK. PROBABLY TEA. PROBABLY.'] },
      { kind: 'bookshelf', id: 'shelf-e-c', x: 14, y: 5, dialog: ['EAST DOOR KEYS… WAIT, THOSE ARE CANDLES.'] },
      { kind: 'bookshelf', id: 'shelf-e-d', x: 14, y: 6, dialog: ['SCROLLS LABELED "LATER." NEVER LATER.'] },
      { kind: 'bookshelf', id: 'shelf-e-e', x: 14, y: 8, dialog: ['PORTRAITS OF PRIOR GUILD MASTERS. NONE SMILE.'] },
      { kind: 'bookshelf', id: 'shelf-e-f', x: 14, y: 9, dialog: ['BLANK BOOKS. FOR FUTURE REGRETS.'] },
      { kind: 'bookshelf', id: 'shelf-s-a', x: 2, y: 9, dialog: ['RUGS ROLLED TIGHT. THE FLOOR IS COLDER.'] },
      { kind: 'bookshelf', id: 'shelf-s-b', x: 5, y: 9, dialog: ['KITCHEN INVENTORY: HARDTACK AND HOPE.'] },
      { kind: 'bookshelf', id: 'shelf-s-c', x: 10, y: 9, dialog: ['SONGBOOK: "BALLAD OF THE LOST TRAIL."'] },
      { kind: 'bookshelf', id: 'shelf-s-d', x: 13, y: 9, dialog: ['A MIRROR FACING THE WALL. WISE.'] },

      // ── NW reading corner (chair, table, lamp, local shelves)
      {
        kind: 'chair',
        id: 'chair-nw',
        x: 2,
        y: 3,
        dialog: ['A WORN CHAIR. THE CUSHION REMEMBERS SOMEONE HEAVIER.'],
      },
      {
        kind: 'table',
        id: 'table-nw',
        x: 3,
        y: 4,
        dialog: [
          'SIDE TABLE. OPEN JOURNAL:',
          '"DAY 1,042. STILL TRAINING HEROES."',
          '"THE TORCHES OUTLAST US ALL."',
        ],
      },
      { kind: 'lamp', id: 'lamp-nw', x: 2, y: 4 },
      {
        kind: 'bookshelf',
        id: 'shelf-nook-nw',
        x: 2,
        y: 2,
        dialog: ['NOOK SHELF: GHOST STORIES FOR SKEPTICS.'],
      },

      // ── SE reading corner
      {
        kind: 'chair',
        id: 'chair-se',
        x: 13,
        y: 7,
        dialog: ['READING CHAIR. FACES THE SHADOWS, NOT THE DOOR.'],
      },
      {
        kind: 'table',
        id: 'table-se',
        x: 12,
        y: 6,
        dialog: [
          'LITTLE TABLE. COLD TEA. HALF A CANDLE.',
          'A NOTE: "GRADUATE. THEN GO GET HER."',
        ],
      },
      { kind: 'lamp', id: 'lamp-se', x: 13, y: 6 },
      {
        kind: 'bookshelf',
        id: 'shelf-nook-se',
        x: 13,
        y: 8,
        dialog: ['SE NOOK: "HOW TO LEAVE AND STILL COME BACK."'],
      },

      // ── Extra floor lamps along the drill lane ─────────────
      { kind: 'lamp', id: 'lamp-mid-w', x: 6, y: 5 },
      { kind: 'lamp', id: 'lamp-mid-e', x: 10, y: 5 },

      // ── Mirror of Changing (SW corner) ─────────────────────
      {
        kind: 'mirror',
        id: 'mirror-of-changing',
        x: 2,
        y: 8,
        dialog: [
          'MIRROR OF CHANGING',
          'CHOOSE HOW BATTLES FEEL:',
          'LIVE ACTION OR TURN-BASED.',
          'PRESS E TO OPEN.',
        ],
      },
    ],
  },

  // ─── SURFACE ─────────────────────────────────────────────
  overworld: {
    id: 'overworld',
    title: 'MEADOW · SURFACE',
    land: 'surface',
    floor: 0,
    mapX: 0,
    mapY: 0,
    west: 'guild_hall',
    east: 'overworld_east',
    south: 'beach_start',
    stairsDown: 'b1_entrance',
    // Every row must be exactly 16 chars (VIEW_TILES_W). Short rows pad as
    // walls on the right — that silently sealed the east trail exit.
    // Dirt road network: south beach, west guild, east trail, cave S mouth.
    // Each row EXACTLY 16. Index 0123456789ABCDEF (south D @7, cave S @6)
    tiles: [
      '################',
      '#ggggddddddgggg#',
      '#gg..dddddd.ggg#',
      '#g.ddddddddd.gg#',
      'ddddddddddddddd.',
      'dddddd.S.dddddd.',
      'ddddddddddddddd.',
      // SE koi pond (closed water → pond classification)
      '#gg.dddd~~..ggg#',
      '#ggg.dd~~~~.ggg#',
      '#gggg.d~~..gggg#',
      '#######D########',
    ],
    entities: [
      {
        kind: 'sign',
        id: 'sign-guild-west',
        x: 3,
        y: 5,
        dialog: [
          'TUTORIAL GUILD — WEST',
          'NEW CRAWLERS: WALK WEST INTO THE HALL.',
          'DOOR LOCKS UNTIL YOU GRADUATE.',
        ],
      },
      {
        kind: 'sign',
        id: 'sign-beach-bridge',
        x: 9,
        y: 8,
        dialog: [
          'BEACH BRIDGE',
          'SOUTH → STRANGE BEACH.',
          'NORTH → MEADOW & CAVE MOUTH.',
          'WEST → TUTORIAL GUILD.',
        ],
      },
      {
        kind: 'sign',
        id: 'sign-meadow',
        x: 11,
        y: 2,
        dialog: [
          'OFFICIAL QUEST SIGN',
          'SAVE PRINCESS PRIZELLA.',
          'CAVE MOUTH = DUNJUNZ (AFTER GUILD).',
          'WEST = TRAINING GUILD.',
          'SOUTH = BEACH. EAST = TRAIL.',
          'TRAIL: NORTH → WOODZ · SOUTH → DEZERTZ.',
          'M = MAPZ (ONCE YOU FIND SOME).',
        ],
      },
      {
        kind: 'mapz',
        id: 'mapz-surface',
        x: 10,
        y: 4,
        mapzId: 'surface',
        dialog: [
          'SURFACE MAPZ!',
          'PRESS M TO UNFURL IT.',
        ],
      },
      // Big meadow trees — sun cast shadows + depth (EMA surface sun pass)
      { kind: 'tree', id: 'meadow-oak-1', x: 2, y: 2, scale: 2.6 },
      { kind: 'tree', id: 'meadow-oak-2', x: 13, y: 2, scale: 2.4 },
      { kind: 'tree', id: 'meadow-oak-3', x: 12, y: 7, scale: 2.5 },
      { kind: 'tree', id: 'meadow-oak-4', x: 3, y: 7, scale: 2.3 },
      { kind: 'tree', id: 'meadow-oak-5', x: 14, y: 5, scale: 2.2 },
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
    north: 'woodz_path',
    south: 'dezertz_dunes',
    // East → kingdom (gated in GameScene until princessSaved)
    east: 'kingdom_gate',
    // Rows must be 16 wide. West corridor open for meadow; east mouth is
    // 3 tiles tall so leaving/entering Kingdomz is not a one-pixel door.
    // Dirt crossroads: west meadow · north woodz · south dezertz · east kingdom
    // Each row EXACTLY 16. North/south D @ col 8.
    tiles: [
      '########D#######',
      '#ggggddddd.gggg#',
      '#gg..dddddd.ggg#',
      '#g..##dddd##.gg#',
      'dddd.#dddd#.dddd',
      'dddd.#dddd#.dddd',
      'dddd.#dddd#.dddd',
      '#g..###dd###.gg#',
      '#gg..dddddd.ggg#',
      '#ggggddddd.gggg#',
      '########D#######',
    ],
    entities: [
      {
        kind: 'npc',
        id: 'bard',
        x: 10,
        y: 8,
        dialog: [
          '♪ PRINCESS PRIZELLA LOST, THE BALLAD OF DUST ♪',
          '…still workshopping the chorus.',
          'NORTH: WOODZ (TREES. HOWLS.).',
          'SOUTH: DEZERTZ (CACTI. BUGS.).',
          'WEST: MEADOW + THE DUNJUN STAIRS.',
          'EAST: HER KINGDOM — AFTER YOU SAVE HER.',
          'MAPZ HELP. IF YOU FIND THEM.',
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
          'TINKERER: RARE WARES. FAIR PRICES.',
          'E OPENS THE SHOP — BUY LEFT, SELL RIGHT.',
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
      // Trail trees (big) — leave path center clear for combat
      { kind: 'tree', id: 'trail-oak-1', x: 2, y: 2, scale: 2.5 },
      { kind: 'tree', id: 'trail-oak-2', x: 13, y: 2, scale: 2.4 },
      { kind: 'tree', id: 'trail-oak-3', x: 2, y: 8, scale: 2.3 },
      { kind: 'tree', id: 'trail-oak-4', x: 13, y: 8, scale: 2.6 },
      { kind: 'tree', id: 'trail-oak-5', x: 7, y: 2, scale: 2.2 },
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
          'B1 ENTRANCE — UNDERGROUND.',
          'U = BACK TO THE SURFACE.',
          'N = DEEPER HALLS.',
          'E = THE SORRY CUBE. TALK OR FIGHT.',
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
          'HIT IT = DIFFERENT LOOT.',
          'IT ONLY FIGHTS IF YOU START IT.',
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
      // East mouth → b1_gate (D survives 16:9 rim seal)
      '#.....####.....D',
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
          'EAST DOOR RETURNS TO THE GATE.',
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
          'NORTH: STAIRS TO B2–B8',
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
          'STAIRS DOWN: B2…B8',
          'EIGHT FLOORS. THE THRONE IS AT THE BOTTOM.',
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

  // B2–B8: generated in world-deep.ts (4× floor depth). Merged below.

  // ─── WOODZ ───────────────────────────────────────────────
  /** Forest approach between trail and deeper woodz. */
  woodz_path: {
    id: 'woodz_path',
    title: 'PINEY APPROACH · WOODZ',
    land: 'woodz',
    floor: 0,
    mapX: 1,
    mapY: 1,
    south: 'overworld_east',
    north: 'woodz_edge',
    // Creek runs N–S west of the dirt path (continues into woodz_edge).
    tiles: [
      '########D#######',
      '#g~~.dddddd..gg#',
      '#g~~##dddd##..g#',
      '#g~~..dddd....g#',
      '#g~~##dddd##..g#',
      '#g~~..dddd....g#',
      '#g~~##dddd##..g#',
      '#g~~..dddd....g#',
      '#g~~##dddd##..g#',
      '#g~~.dddddd..gg#',
      '########D#######',
    ],
    entities: [
      {
        kind: 'tree',
        id: 'path-tree-1',
        x: 2,
        y: 3,
        scale: 5.0,
      },
      {
        kind: 'tree',
        id: 'path-tree-2',
        x: 13,
        y: 3,
        scale: 5.2,
      },
      {
        kind: 'tree',
        id: 'path-tree-3',
        x: 2,
        y: 7,
        scale: 4.8,
      },
      {
        kind: 'tree',
        id: 'path-tree-4',
        x: 13,
        y: 7,
        scale: 5.1,
      },
      {
        kind: 'tree',
        id: 'path-tree-5',
        x: 3,
        y: 5,
        scale: 5.5,
      },
      {
        kind: 'tree',
        id: 'path-tree-6',
        x: 12,
        y: 5,
        scale: 5.3,
      },
      {
        kind: 'wolf',
        id: 'path-wolf-1',
        x: 8,
        y: 4,
      },
      {
        kind: 'sign',
        id: 'path-woodz-sign',
        x: 8,
        y: 2,
        dialog: [
          'THE ENCHANTED WOODZ — TREES GOT IDEAS.',
          'NORTH: DEEPER. HOWLS. REDWOODS.',
          'SOUTH: BACK TO THE SAFE-ISH TRAIL.',
        ],
      },
      {
        kind: 'heart',
        id: 'path-heart',
        x: 8,
        y: 8,
      },
    ],
  },

  woodz_edge: {
    id: 'woodz_edge',
    title: 'WOODZ EDGE',
    land: 'woodz',
    floor: 0,
    mapX: 1,
    mapY: 2,
    south: 'woodz_path',
    north: 'woodz_deep',
    east: 'woodz_hollow',
    west: 'woodz_glade',
    // Creek runs N–S west of the dirt path (same as woodz_path).
    // Rows 4–6: west↔east mouths stay open with a DIRT BRIDGE over the creek
    // so the west glade link is never a water dead-end.
    tiles: [
      '########D#######',
      '#g~~.dddddd..gg#',
      '#g~~##dddd##..g#',
      '#g~~#dddddd#..g#',
      '.gdd#dddddd#.gg.',
      'gddd.ddddddddddd',
      '.gdd#dddddd#.gg.',
      '#g~~#dddddd#..g#',
      '#g~~##dddd##..g#',
      '#g~~.dddddd..gg#',
      '########D#######',
    ],
    entities: [
      {
        kind: 'tree',
        id: 'woodz-tree-1',
        x: 2,
        y: 2,
        scale: 5.5,
      },
      {
        kind: 'tree',
        id: 'woodz-tree-2',
        x: 13,
        y: 2,
        scale: 5.8,
      },
      {
        kind: 'tree',
        id: 'woodz-tree-3',
        x: 3,
        y: 8,
        scale: 5.2,
      },
      {
        kind: 'tree',
        id: 'woodz-tree-4',
        x: 12,
        y: 8,
        scale: 6.0,
      },
      // Center-ish trees removed (choked doors); corner redwoods only
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
          'THE ENCHANTED WOODZ — TREES GOT IDEAS.',
          'NORTH: WOLF LORD (STILL RUDE).',
          'WEST: A GLADE THAT HUMS. PROBABLY FINE.',
          'EAST: BEST BUD HOLLOW.',
          'SOUTH: PINEY APPROACH → TRAIL.',
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
    mapY: 2,
    west: 'woodz_edge',
    // Open den: west mouth + walkable center (old map sealed a pen at 8,5 —
    // continue-save default spawn softlocked you inside).
    // Central koi pond (closed blob → pond + auto koi).
    tiles: [
      '################',
      '#gg..........gg#',
      '#g..##....##..g#',
      '#g....~~~~....g#',
      '#g...~~~~~~...g#',
      '....~~~~~~~~...#',
      '#g...~~~~~~...g#',
      '#g....~~~~....g#',
      '#g..##....##..g#',
      '#gg..........gg#',
      '################',
    ],
    entities: [
      {
        kind: 'tree',
        id: 'hollow-tree-1',
        x: 2,
        y: 2,
        scale: 5.0,
      },
      {
        kind: 'tree',
        id: 'hollow-tree-2',
        x: 13,
        y: 2,
        scale: 5.2,
      },
      {
        kind: 'tree',
        id: 'hollow-tree-3',
        x: 2,
        y: 8,
        scale: 4.8,
      },
      {
        kind: 'tree',
        id: 'hollow-tree-4',
        x: 13,
        y: 8,
        scale: 5.5,
      },
      {
        kind: 'sign',
        id: 'hollow-sign',
        // West of the den critter — must NOT share a tile with best-bud-den
        // (stacked interactables used to steal E every time → unrecruitable bud).
        x: 6,
        y: 2,
        dialog: [
          'BEST BUD DEN.',
          'SOMEONE WEIRD AND LOYAL LIVES HERE.',
          'STAND ON THE CRITTER AND PRESS E.',
          'BE COOL ABOUT IT.',
        ],
      },
      {
        kind: 'best_bud',
        id: 'best-bud-den',
        // Walkable north shore of the koi pond (center — visible from west mouth)
        x: 9,
        y: 2,
        dialog: [
          '...A WEIRD CREATURE LOOKS UP.',
          '(TALK WITH E.)',
        ],
      },
      {
        kind: 'heart',
        id: 'hollow-heart',
        x: 3,
        y: 8,
      },
    ],
  },

  woodz_deep: {
    id: 'woodz_deep',
    title: 'WOLF LORD CLEARING',
    land: 'woodz',
    floor: 0,
    mapX: 1,
    mapY: 3,
    south: 'woodz_edge',
    north: 'road_north_1',
    stairsDown: 'woodz_b1_foyer',
    tiles: [
      '########D#######',
      '#gg..........gg#',
      '#g....####....g#',
      '#g...#..S.#...g#',
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
        kind: 'tree',
        id: 'deep-tree-1',
        x: 2,
        y: 2,
        scale: 5.0,
      },
      {
        kind: 'tree',
        id: 'deep-tree-2',
        x: 13,
        y: 2,
        scale: 5.2,
      },
      {
        kind: 'tree',
        id: 'deep-tree-3',
        x: 2,
        y: 8,
        scale: 4.8,
      },
      {
        kind: 'tree',
        id: 'deep-tree-4',
        x: 13,
        y: 8,
        scale: 5.0,
      },
      {
        kind: 'boss',
        id: 'wolf-lord',
        x: 8,
        y: 4,
        hp: 48,
        dialog: [
          'WOLF LORD: THIS IS MY FOREST!',
          'THE PRINCESS? NEVER MET HER.',
          'MY SHARDZ? ALL MINE.',
          'COME GET SOME. AWOO.',
        ],
      },
      {
        kind: 'mapz',
        id: 'mapz-woodz',
        x: 4,
        y: 3,
        mapzId: 'woodz',
        dialog: [
          'WOODZ MAPZ — MOSTLY TREES.',
          'PRESS M.',
        ],
      },
      {
        kind: 'forje',
        id: 'forje-woodz',
        x: 12,
        y: 7,
        dialog: [
          'A CRUDE FORJE. IT\'S TRYING ITS BEST.',
          'E OR F: OPEN THE FORJE.',
          'FEED IT OREZ AND SHARDZ.',
        ],
      },
    ],
  },

  // ─── ENCHANTED WOODZ → WOOD ELF KINGDOM (pocket realm, land: woodz) ──
  /** Riddle glade west of woodz_edge — Root → Trunk → Crown statues. */
  woodz_glade: {
    id: 'woodz_glade',
    title: 'RIDDLE GLADE · WOODZ',
    land: 'woodz',
    floor: 0,
    mapX: 0,
    mapY: 2,
    east: 'woodz_edge',
    west: 'road_nw_1',
    north: 'woodz_arch',
    // Dirt cross so N door + E/W mouths stay readable under tall canopies
    tiles: [
      '########D#######',
      '#gg...d..d...gg#',
      '#g....d..d....g#',
      '#g....dddd....g#',
      '#g....d..d....g#',
      'd....ddddddddddd',
      '#g....d..d....g#',
      '#g....dddd....g#',
      '#g....d..d....g#',
      '#gg...d..d...gg#',
      '################',
    ],
    entities: [
      // Corner groves only — no mid-side trunks (those ate the paths)
      { kind: 'tree', id: 'glade-redwood-1', x: 1, y: 1, scale: 9.0 },
      { kind: 'tree', id: 'glade-redwood-2', x: 2, y: 1, scale: 7.5 },
      { kind: 'tree', id: 'glade-redwood-3', x: 1, y: 2, scale: 8.0 },
      { kind: 'tree', id: 'glade-redwood-4', x: 14, y: 1, scale: 9.5 },
      { kind: 'tree', id: 'glade-redwood-5', x: 13, y: 1, scale: 7.8 },
      { kind: 'tree', id: 'glade-redwood-6', x: 14, y: 2, scale: 8.2 },
      { kind: 'tree', id: 'glade-redwood-7', x: 1, y: 9, scale: 8.5 },
      { kind: 'tree', id: 'glade-redwood-8', x: 2, y: 9, scale: 7.2 },
      { kind: 'tree', id: 'glade-redwood-9', x: 1, y: 8, scale: 7.6 },
      { kind: 'tree', id: 'glade-redwood-10', x: 14, y: 9, scale: 9.2 },
      { kind: 'tree', id: 'glade-redwood-11', x: 13, y: 9, scale: 7.4 },
      { kind: 'tree', id: 'glade-redwood-12', x: 14, y: 8, scale: 8.0 },
      {
        kind: 'sign',
        id: 'glade-riddle-sign',
        x: 8,
        y: 2,
        dialog: [
          'A LIVING DOOR SLEEPS NORTH.',
          'WAKE IT IN ORDER OF A TREE:',
          'FIRST THE ROOT.',
          'THEN THE TRUNK.',
          'THEN THE CROWN.',
          'TOUCH WRONG AND THE WOOD FORGETS YOU.',
          '(E ON THE STUMPS. YES, THE STUMPS.)',
        ],
      },
      {
        kind: 'npc',
        id: 'glade-statue-root',
        x: 5,
        y: 4,
        dialog: ['ROOT: I AM LOW. START HERE. PROBABLY.'],
      },
      {
        kind: 'npc',
        id: 'glade-statue-trunk',
        x: 10,
        y: 4,
        dialog: ['TRUNK: MIDDLE MANAGEMENT OF TREES.'],
      },
      {
        kind: 'npc',
        id: 'glade-statue-crown',
        x: 8,
        y: 7,
        dialog: ['CROWN: TOP ENERGY. DO NOT START WITH ME.'],
      },
      { kind: 'heart', id: 'glade-heart', x: 5, y: 8 },
    ],
  },

  /** Living arch — portal to Wood Elf kingdom when riddle solved. */
  woodz_arch: {
    id: 'woodz_arch',
    title: 'LIVING ARCH · WOODZ',
    land: 'woodz',
    floor: 0,
    mapX: 0,
    mapY: 3,
    south: 'woodz_glade',
    tiles: [
      '################',
      '#gg..........gg#',
      '#g....####....g#',
      '#g...##..##...g#',
      '#g...#....#...g#',
      '#g...#....#...g#',
      '#g...#....#...g#',
      '#g...##..##...g#',
      '#g....####....g#',
      '#gg..........gg#',
      '########D#######',
    ],
    entities: [
      // Far corners only — leave arch aisle + portal ring open
      { kind: 'tree', id: 'arch-redwood-1', x: 1, y: 1, scale: 9.5 },
      { kind: 'tree', id: 'arch-redwood-2', x: 2, y: 1, scale: 7.5 },
      { kind: 'tree', id: 'arch-redwood-3', x: 14, y: 1, scale: 9.8 },
      { kind: 'tree', id: 'arch-redwood-4', x: 13, y: 1, scale: 7.8 },
      { kind: 'tree', id: 'arch-redwood-5', x: 1, y: 9, scale: 8.8 },
      { kind: 'tree', id: 'arch-redwood-6', x: 2, y: 9, scale: 7.2 },
      { kind: 'tree', id: 'arch-redwood-7', x: 14, y: 9, scale: 9.2 },
      { kind: 'tree', id: 'arch-redwood-8', x: 13, y: 9, scale: 7.4 },
      {
        kind: 'sign',
        id: 'arch-sign',
        x: 8,
        y: 2,
        dialog: [
          'A WOVEN ARCH OF LIVING WOOD.',
          'IT IS VERY CLOSED.',
          'SOMETHING ABOUT ROOTS. GLADE SOUTH.',
        ],
      },
      // Spawned only when flags.elf_door_unlocked (see GameScene)
      {
        kind: 'portal',
        id: 'portal-elfwood-in',
        x: 8,
        y: 5,
        portalTarget: 'elfwood_gate',
        dialog: ['WHOOSH · WOOD ELF KINGDOM'],
      },
    ],
  },

  elfwood_gate: {
    id: 'elfwood_gate',
    title: 'ELVEN GATE · WOOD ELVES',
    land: 'woodz',
    floor: 0,
    // Pocket realm map coords west of glade (avoid glade 0,2 / arch 0,3)
    mapX: -2,
    mapY: 2,
    east: 'elfwood_waters',
    south: 'elfwood_thicket',
    // Dirt ring around portal + E/S exits so routes read under canopies
    tiles: [
      '################',
      '#gg...dddd...gg#',
      '#g....d..d....g#',
      '#g..##d..d##..g#',
      '#g..#dddddd#..g#',
      '#g..#ddddddddddd', // east open → waters
      '#g..#dddddd#..g#',
      '#g..##d..d##..g#',
      '#g....d..d....g#',
      '#gg...dddd...gg#',
      '########D#######',
    ],
    entities: [
      {
        kind: 'portal',
        id: 'portal-elfwood-out',
        x: 8,
        y: 5,
        portalTarget: 'woodz_arch',
        dialog: ['WHOOSH · BACK TO THE ARCH'],
      },
      {
        kind: 'sign',
        id: 'elf-gate-sign',
        x: 8,
        y: 2,
        dialog: [
          'WOOD ELF GATE.',
          'EAST: HEALING WATERS.',
          'SOUTH: BLIGHTED THICKET. DO NOT PET.',
          'CYAN PORTAL: BACK TO THE LIVING ARCH.',
        ],
      },
      {
        kind: 'npc',
        id: 'elf-sentry',
        x: 10,
        y: 3,
        dialog: [
          'SENTRY: BADGE? ...CRAWLER BADGE COUNTS. BARELY.',
          'QUEEN IS NORTH OF THE WATERS. TRY NOT TO TRACK MUD.',
        ],
      },
      {
        kind: 'npc',
        id: 'elf-archer',
        x: 5,
        y: 8,
        dialog: [
          'ARCHER: THE BOWS SING WHEN THE WOOD IS HAPPY.',
          'TODAY THEY HUM. DO NOT RUIN IT.',
        ],
      },
      // Corner groves — never on dirt cross or door rows
      { kind: 'tree', id: 'gate-redwood-1', x: 1, y: 1, scale: 10.0 },
      { kind: 'tree', id: 'gate-redwood-2', x: 2, y: 1, scale: 8.0 },
      { kind: 'tree', id: 'gate-redwood-3', x: 1, y: 2, scale: 8.5 },
      { kind: 'tree', id: 'gate-redwood-4', x: 14, y: 1, scale: 10.5 },
      { kind: 'tree', id: 'gate-redwood-5', x: 13, y: 1, scale: 8.2 },
      { kind: 'tree', id: 'gate-redwood-6', x: 14, y: 2, scale: 8.8 },
      { kind: 'tree', id: 'gate-redwood-7', x: 1, y: 9, scale: 9.5 },
      { kind: 'tree', id: 'gate-redwood-8', x: 2, y: 9, scale: 7.8 },
      { kind: 'tree', id: 'gate-redwood-9', x: 1, y: 8, scale: 8.4 },
      { kind: 'tree', id: 'gate-redwood-10', x: 14, y: 9, scale: 10.0 },
      { kind: 'tree', id: 'gate-redwood-11', x: 13, y: 9, scale: 8.0 },
      { kind: 'tree', id: 'gate-redwood-12', x: 14, y: 8, scale: 8.6 },
    ],
  },

  elfwood_waters: {
    id: 'elfwood_waters',
    title: 'HEALING WATERS · WOOD ELVES',
    land: 'woodz',
    floor: 0,
    // East of gate (-2,2) → (-1,2); free of glade (0,2)
    mapX: -1,
    mapY: 2,
    west: 'elfwood_gate',
    north: 'elfwood_court',
    // Pond center; dirt shore path W→gate and N→court
    tiles: [
      '########D#######',
      '#gg..dddddd..gg#',
      '#g..d.~~~~.d..g#',
      '#g.d.~~~~~~.d.g#',
      '#g.d~~~~~~~~.dg#',
      'dddd~~~~~~~~.dg#', // west open → gate
      '#g.d~~~~~~~~.dg#',
      '#g.d.~~~~~~.d.g#',
      '#g..d.~~~~.d..g#',
      '#gg..dddddd..gg#',
      '################',
    ],
    entities: [
      {
        kind: 'npc',
        id: 'elf-healing-spring',
        x: 8,
        y: 1,
        dialog: [
          'A CLEAR SPRING. IT SMELLS LIKE MINT AND SECOND CHANCES.',
          '(E TO DRINK.)',
        ],
      },
      {
        kind: 'sign',
        id: 'waters-sign',
        x: 3,
        y: 1,
        dialog: [
          'HEALING WATERS.',
          'E ON THE SPRING. ONCE PER VISIT.',
          'NORTH: QUEEN\'S COURT.',
        ],
      },
      {
        kind: 'npc',
        id: 'elf-healer',
        x: 11,
        y: 1,
        dialog: [
          'HEALER: DRINK. THE MOSS REMEMBERS KINDNESS.',
          'AND STAINS. MOSTLY STAINS.',
        ],
      },
      // Corner groves only — shore dirt stays open
      { kind: 'tree', id: 'waters-redwood-1', x: 1, y: 1, scale: 9.5 },
      { kind: 'tree', id: 'waters-redwood-2', x: 2, y: 2, scale: 7.5 },
      { kind: 'tree', id: 'waters-redwood-3', x: 14, y: 1, scale: 9.8 },
      { kind: 'tree', id: 'waters-redwood-4', x: 13, y: 2, scale: 7.8 },
      { kind: 'tree', id: 'waters-redwood-5', x: 1, y: 9, scale: 10.0 },
      { kind: 'tree', id: 'waters-redwood-6', x: 2, y: 8, scale: 7.6 },
      { kind: 'tree', id: 'waters-redwood-7', x: 14, y: 9, scale: 10.2 },
      { kind: 'tree', id: 'waters-redwood-8', x: 13, y: 8, scale: 7.8 },
      { kind: 'tree', id: 'waters-redwood-9', x: 1, y: 2, scale: 8.0 },
      { kind: 'tree', id: 'waters-redwood-10', x: 14, y: 2, scale: 8.2 },
      { kind: 'tree', id: 'waters-redwood-11', x: 1, y: 8, scale: 8.0 },
      { kind: 'tree', id: 'waters-redwood-12', x: 14, y: 8, scale: 8.2 },
      { kind: 'heart', id: 'waters-heart', x: 12, y: 1 },
    ],
  },

  elfwood_court: {
    id: 'elfwood_court',
    title: "QUEEN'S COURT · WOOD ELVES",
    land: 'woodz',
    floor: 0,
    mapX: -1,
    mapY: 3,
    south: 'elfwood_waters',
    // Open throne court with dirt aisle from south door
    tiles: [
      '################',
      '#gg...dddd...gg#',
      '#g..##dddd##..g#',
      '#g....dddd....g#',
      '#g....dddd....g#',
      '#g....dddd....g#',
      '#g....dddd....g#',
      '#g..##dddd##..g#',
      '#gg...dddd...gg#',
      '#g....dddd....g#',
      '########D#######',
    ],
    entities: [
      {
        kind: 'npc',
        id: 'queen-wood-elves',
        x: 8,
        y: 5,
        dialog: [
          'QUEEN OF THE WOOD ELVES: ...',
          '(TALK WITH E.)',
        ],
      },
      {
        kind: 'npc',
        id: 'elf-courtier',
        x: 5,
        y: 4,
        dialog: [
          'COURTIER: HER MAJESTY WEARS WHITE SO THE',
          'MOSS HAS SOMEONE TO JUDGE. BOW. OR DON\'T.',
        ],
      },
      {
        kind: 'npc',
        id: 'elf-guard-court',
        x: 11,
        y: 4,
        dialog: [
          'GUARD: LONGBOWS AND LONGER OPINIONS.',
          'THE QUEEN\'S LIST IS SHORTER. DO THE ERRANDS.',
        ],
      },
      {
        kind: 'sign',
        id: 'court-sign',
        x: 3,
        y: 2,
        dialog: [
          "QUEEN'S COURT.",
          'THREE ERRANDS. ONE LEGENDARY BOX.',
          'DO NOT SIT ON THE THRONE. IT BITES.',
        ],
      },
      // Corner groves frame the court; center dirt aisle stays clear
      { kind: 'tree', id: 'court-redwood-1', x: 1, y: 1, scale: 10.0 },
      { kind: 'tree', id: 'court-redwood-2', x: 2, y: 1, scale: 8.0 },
      { kind: 'tree', id: 'court-redwood-3', x: 1, y: 2, scale: 8.5 },
      { kind: 'tree', id: 'court-redwood-4', x: 14, y: 1, scale: 10.5 },
      { kind: 'tree', id: 'court-redwood-5', x: 13, y: 1, scale: 8.2 },
      { kind: 'tree', id: 'court-redwood-6', x: 14, y: 2, scale: 8.8 },
      { kind: 'tree', id: 'court-redwood-7', x: 1, y: 9, scale: 9.5 },
      { kind: 'tree', id: 'court-redwood-8', x: 2, y: 9, scale: 7.8 },
      { kind: 'tree', id: 'court-redwood-9', x: 1, y: 8, scale: 8.4 },
      { kind: 'tree', id: 'court-redwood-10', x: 14, y: 9, scale: 10.0 },
      { kind: 'tree', id: 'court-redwood-11', x: 13, y: 9, scale: 8.0 },
      { kind: 'tree', id: 'court-redwood-12', x: 14, y: 8, scale: 8.6 },
    ],
  },

  elfwood_thicket: {
    id: 'elfwood_thicket',
    title: 'BLIGHTED THICKET · WOOD ELVES',
    land: 'woodz',
    floor: 0,
    mapX: -2,
    mapY: 1,
    north: 'elfwood_gate',
    // Dirt cross for fight space + N exit
    tiles: [
      '########D#######',
      '#gg...dddd...gg#',
      '#g..##dddd##..g#',
      '#g....dddd....g#',
      '#g....dddd....g#',
      '#g....dddd....g#',
      '#g....dddd....g#',
      '#g..##dddd##..g#',
      '#gg...dddd...gg#',
      '#g....dddd....g#',
      '################',
    ],
    entities: [
      {
        kind: 'wolf',
        id: 'elf-blight-wolf-1',
        x: 5,
        y: 4,
        hp: 20,
      },
      {
        kind: 'wolf',
        id: 'elf-blight-wolf-2',
        x: 11,
        y: 4,
        hp: 20,
      },
      {
        kind: 'sign',
        id: 'thicket-sign',
        x: 8,
        y: 2,
        dialog: ['BLIGHT WOLVES. NOT CUTE. DO NOT PET.'],
      },
      { kind: 'tree', id: 'thicket-redwood-1', x: 1, y: 1, scale: 10.0 },
      { kind: 'tree', id: 'thicket-redwood-2', x: 2, y: 1, scale: 8.0 },
      { kind: 'tree', id: 'thicket-redwood-3', x: 1, y: 2, scale: 8.5 },
      { kind: 'tree', id: 'thicket-redwood-4', x: 14, y: 1, scale: 10.5 },
      { kind: 'tree', id: 'thicket-redwood-5', x: 13, y: 1, scale: 8.2 },
      { kind: 'tree', id: 'thicket-redwood-6', x: 14, y: 2, scale: 8.8 },
      { kind: 'tree', id: 'thicket-redwood-7', x: 1, y: 9, scale: 9.5 },
      { kind: 'tree', id: 'thicket-redwood-8', x: 2, y: 9, scale: 7.8 },
      { kind: 'tree', id: 'thicket-redwood-9', x: 1, y: 8, scale: 8.4 },
      { kind: 'tree', id: 'thicket-redwood-10', x: 14, y: 9, scale: 10.0 },
      { kind: 'tree', id: 'thicket-redwood-11', x: 13, y: 9, scale: 8.0 },
      { kind: 'tree', id: 'thicket-redwood-12', x: 14, y: 8, scale: 8.6 },
      {
        kind: 'chest',
        id: 'thicket-chest',
        x: 8,
        y: 8,
        chestTable: 'dungeon',
      },
    ],
  },

  // ─── DEZERTZ ─────────────────────────────────────────────
  /** Sandy approach between trail and deep dezertz. */
  dezertz_dunes: {
    id: 'dezertz_dunes',
    title: 'WINDY DUNES · DEZERTZ',
    land: 'dezertz',
    floor: 0,
    mapX: 1,
    mapY: -1,
    north: 'overworld_east',
    south: 'dezertz_edge',
    // Packed dirt path on sand — readable route N/S
    tiles: [
      '########D#######',
      '#ss..dddddd..ss#',
      '#s....dddd....s#',
      '#s..##dddd##..s#',
      '#s....dddd....s#',
      '#s....dddd....s#',
      '#s....dddd....s#',
      '#s..##dddd##..s#',
      '#s....dddd....s#',
      '#ss..dddddd..ss#',
      '########D#######',
    ],
    entities: [
      {
        kind: 'cactus',
        id: 'dune-cactus-1',
        x: 3,
        y: 3,
      },
      {
        kind: 'cactus',
        id: 'dune-cactus-2',
        x: 12,
        y: 3,
      },
      {
        kind: 'cactus',
        id: 'dune-cactus-3',
        x: 4,
        y: 8,
      },
      {
        kind: 'cactus',
        id: 'dune-cactus-4',
        x: 11,
        y: 8,
      },
      {
        kind: 'tumbleweed',
        id: 'dune-weed-1',
        x: 6,
        y: 5,
      },
      {
        kind: 'tumbleweed',
        id: 'dune-weed-2',
        x: 10,
        y: 6,
      },
      {
        kind: 'scorpion',
        id: 'dune-scorp-1',
        x: 8,
        y: 4,
      },
      {
        kind: 'hornet',
        id: 'dune-hornet-1',
        x: 5,
        y: 7,
      },
      {
        kind: 'sign',
        id: 'dune-sign',
        x: 8,
        y: 2,
        dialog: [
          'DEZERTZ DUNES — TUMBLEWEEDS HAVE RIGHT OF WAY.',
          'CACTI DO NOT MOVE. YOU DO. OUCH.',
          'SOUTH: DEEPER SAND. SCORPIONS.',
          'NORTH: THE TRAIL (SHADE, SORT OF).',
        ],
      },
    ],
  },

  dezertz_edge: {
    id: 'dezertz_edge',
    title: 'DEZERTZ EDGE',
    land: 'dezertz',
    floor: 0,
    mapX: 1,
    mapY: -2,
    north: 'dezertz_dunes',
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
        x: 3,
        y: 2,
      },
      {
        kind: 'cactus',
        id: 'dez-cactus-2',
        x: 12,
        y: 2,
      },
      {
        kind: 'cactus',
        id: 'dez-cactus-3',
        x: 5,
        y: 8,
      },
      {
        kind: 'cactus',
        id: 'dez-cactus-4',
        x: 10,
        y: 8,
      },
      {
        kind: 'tumbleweed',
        id: 'dez-weed-1',
        x: 7,
        y: 5,
      },
      {
        kind: 'tumbleweed',
        id: 'dez-weed-2',
        x: 9,
        y: 3,
      },
      {
        kind: 'scorpion',
        id: 'dez-scorp-1',
        x: 4,
        y: 5,
      },
      {
        kind: 'scorpion',
        id: 'dez-scorp-2',
        x: 11,
        y: 5,
      },
      {
        kind: 'tarantula',
        id: 'dez-tara-1',
        x: 8,
        y: 6,
      },
      {
        kind: 'hornet',
        id: 'dez-hornet-1',
        x: 6,
        y: 3,
      },
      {
        kind: 'hornet',
        id: 'dez-hornet-2',
        x: 10,
        y: 7,
      },
      {
        kind: 'sign',
        id: 'dez-sign',
        x: 8,
        y: 2,
        dialog: [
          'DEZERTZ — HOT. SANDY. DRAMATIC.',
          'SOUTH: SAND TOWER.',
          'NORTH: DUNES (MORE BUGS).',
          'PRINCESS PRIZELLA IS IN THE TOWER.',
        ],
      },
      {
        kind: 'mapz',
        id: 'mapz-dezertz',
        x: 3,
        y: 8,
        mapzId: 'dezertz',
        dialog: [
          'DEZERTZ MAPZ — MOSTLY SAND.',
          'PRESS M.',
        ],
      },
      {
        kind: 'forje',
        id: 'forje-dezertz',
        x: 12,
        y: 8,
        dialog: [
          'A SAND FORJE GLOWS HOT.',
          'E OR F: OPEN THE FORJE.',
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
    mapY: -3,
    // Edge is north of the tower; south opens ash road after fellowship.
    north: 'dezertz_edge',
    south: 'road_south_ash_1',
    stairsDown: 'dezertz_b1_foyer',
    tiles: [
      '########D#######',
      '#dd..........dd#',
      '#d....####....d#',
      '#d...#..S.#...d#',
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
        kind: 'cactus',
        id: 'tower-cactus-1',
        x: 3,
        y: 8,
      },
      {
        kind: 'cactus',
        id: 'tower-cactus-2',
        x: 12,
        y: 8,
      },
      {
        kind: 'scorpion',
        id: 'tower-scorp-1',
        x: 5,
        y: 5,
      },
      {
        kind: 'tarantula',
        id: 'tower-tara-1',
        x: 11,
        y: 5,
      },
      {
        kind: 'boss',
        id: 'sand-wraith',
        x: 8,
        y: 3,
        hp: 56,
        dialog: [
          'SAND WRAITH: THE PRINCESS IS MINE!',
          'OR AT LEAST… RENTED. MONTHLY.',
          'FACE THE DUNES.',
        ],
      },
      {
        kind: 'princess',
        id: 'prizella',
        x: 10,
        y: 5,
        dialog: [
          'PRINCESS PRIZELLA: YOU CAME!',
          'I WAS THIS CLOSE TO ESCAPING WITH A SPREADSHEET.',
          'BONK THE WRAITH FIRST. THEN WE TALK.',
        ],
      },
      {
        kind: 'chest',
        id: 'dez-chest',
        x: 4,
        y: 5,
        chestTable: 'boss',
      },
      {
        kind: 'sign',
        id: 'dez-tower-home-sign',
        x: 12,
        y: 8,
        dialog: [
          'AFTER THE RESCUE SHE WENT HOME.',
          'CASTLE: EAST OF THE TROPE TRAIL.',
          'THRONE ROOM. QUESTS.',
        ],
      },
    ],
  },

  // ─── KINGDOMZ (post-rescue hub) ──────────────────────────
  kingdom_gate: {
    id: 'kingdom_gate',
    title: 'ROYAL ROAD · KINGDOMZ',
    land: 'kingdomz',
    floor: 0,
    mapX: 2,
    mapY: 0,
    west: 'overworld_east',
    east: 'kingdom_courtyard',
    // Full-width mid band (y=4–6) so trail ↔ castle exits are walkable
    tiles: [
      '################',
      '#gg..........gg#',
      '#g..########..g#',
      '#g............g#',
      '................',
      '................',
      '................',
      '#g............g#',
      '#g..########..g#',
      '#gg..........gg#',
      '################',
    ],
    entities: [
      {
        kind: 'sign',
        id: 'kingdom-gate-sign',
        x: 8,
        y: 2,
        dialog: [
          'PRINCESS PRIZELLA\'S KINGDOMZ.',
          'WEST: BACK TO THE TRAIL.',
          'EAST: COURTYARD. NORTH: THRONE.',
          'CREEPS HIT HARDER HERE.',
        ],
      },
      {
        kind: 'skeleton',
        id: 'kingdom-skel-1',
        x: 6,
        y: 4,
      },
      {
        kind: 'skeleton',
        id: 'kingdom-skel-2',
        x: 11,
        y: 6,
      },
      {
        kind: 'mapz',
        id: 'mapz-kingdomz',
        x: 4,
        y: 8,
        mapzId: 'kingdomz',
        dialog: [
          'KINGDOMZ MAPZ.',
          'PRESS M. FIND THE THRONE.',
        ],
      },
    ],
  },

  kingdom_courtyard: {
    id: 'kingdom_courtyard',
    title: 'CASTLE COURTYARD · KINGDOMZ',
    land: 'kingdomz',
    floor: 0,
    mapX: 3,
    mapY: 0,
    west: 'kingdom_gate',
    north: 'kingdom_throne',
    east: 'sewerz_mouth',
    tiles: [
      '########D#######',
      '#gg..........gg#',
      '#g....####....g#',
      '#g............g#',
      '................',
      '................',
      '................',
      '#g............g#',
      '#g....####....g#',
      '#gg..........gg#',
      '################',
    ],
    entities: [
      {
        kind: 'npc',
        id: 'royal-guard',
        x: 5,
        y: 3,
        dialog: [
          'GUARD: WELCOME. TRY NOT TO DIE.',
          'THRONE: NORTH — PRINCESS PRIZELLA ASSIGNS JOBS.',
          'EAST: SEWERZ (CHAMPION WORK).',
          'WIPE YOUR FEET.',
        ],
      },
      {
        kind: 'merchant',
        id: 'tinkerer-kingdom',
        x: 12,
        y: 7,
        shopId: 'tinkerer',
        dialog: [
          'TINKERER: ROYAL MARKUP. STILL FAIR.',
          'E FOR SHOP. SEWER CREEPS DROP GOOD JUNK.',
        ],
      },
      {
        kind: 'forje',
        id: 'forje-kingdom',
        x: 3,
        y: 7,
        dialog: [
          'A FANCY FORJE. IT HAS A TINY CROWN.',
          'E OR F: OPEN THE FORJE.',
        ],
      },
      {
        kind: 'slime',
        id: 'court-slime-1',
        x: 9,
        y: 5,
      },
    ],
  },

  kingdom_throne: {
    id: 'kingdom_throne',
    title: 'THRONE ROOM · KINGDOMZ',
    land: 'kingdomz',
    floor: 0,
    mapX: 3,
    mapY: 1,
    south: 'kingdom_courtyard',
    // `c` = royal carpet / dais (walkable). Pillars leave side aisles open.
    tiles: [
      '################',
      '#..............#',
      '#..##......##..#',
      '#....cccccc....#',
      '#....cccccc....#',
      '#....cccccc....#',
      '#..##cccccc##..#',
      '#......cc......#',
      '#......cc......#',
      '#......cc......#',
      '########D#######',
    ],
    entities: [
      // Throne on the dais (behind the princess)
      {
        kind: 'throne',
        id: 'royal-throne',
        x: 8,
        y: 2,
        scale: 1.25,
        dialog: [
          'THE ROYAL THRONE.',
          'DO NOT SIT. SHE WILL NOTICE.',
        ],
      },
      {
        kind: 'princess',
        id: 'prizella-throne',
        x: 8,
        y: 3,
        dialog: [
          'PRINCESS PRIZELLA: WELCOME TO MY OFFICE.',
          'THRONE. DAIS. BANNERS. THE WHOLE LOOK.',
        ],
      },
      // Pillars along the side walls
      { kind: 'pillar', id: 'throne-pillar-nw', x: 2, y: 2, scale: 1.2 },
      { kind: 'pillar', id: 'throne-pillar-ne', x: 13, y: 2, scale: 1.2 },
      { kind: 'pillar', id: 'throne-pillar-w1', x: 2, y: 4, scale: 1.15 },
      { kind: 'pillar', id: 'throne-pillar-e1', x: 13, y: 4, scale: 1.15 },
      { kind: 'pillar', id: 'throne-pillar-w2', x: 2, y: 6, scale: 1.15 },
      { kind: 'pillar', id: 'throne-pillar-e2', x: 13, y: 6, scale: 1.15 },
      { kind: 'pillar', id: 'throne-pillar-sw', x: 2, y: 8, scale: 1.1 },
      { kind: 'pillar', id: 'throne-pillar-se', x: 13, y: 8, scale: 1.1 },
      // Banners between pillars
      { kind: 'banner', id: 'throne-banner-nw', x: 1, y: 3, scale: 1.1 },
      { kind: 'banner', id: 'throne-banner-ne', x: 14, y: 3, scale: 1.1 },
      { kind: 'banner', id: 'throne-banner-w', x: 1, y: 5, scale: 1.1 },
      { kind: 'banner', id: 'throne-banner-e', x: 14, y: 5, scale: 1.1 },
      { kind: 'banner', id: 'throne-banner-sw', x: 1, y: 7, scale: 1.05 },
      { kind: 'banner', id: 'throne-banner-se', x: 14, y: 7, scale: 1.05 },
      // Torches for warm royal light
      { kind: 'torch_wall', id: 'throne-torch-w', x: 3, y: 1 },
      { kind: 'torch_wall', id: 'throne-torch-e', x: 12, y: 1 },
      { kind: 'torch_wall', id: 'throne-torch-w2', x: 3, y: 8 },
      { kind: 'torch_wall', id: 'throne-torch-e2', x: 12, y: 8 },
      {
        kind: 'sign',
        id: 'throne-sign',
        x: 5,
        y: 7,
        dialog: [
          'CHAMPION BOARD.',
          'TALK TO PRINCESS PRIZELLA. GET A JOB.',
        ],
      },
      {
        kind: 'lamp',
        id: 'throne-lamp-w',
        x: 5,
        y: 4,
      },
      {
        kind: 'lamp',
        id: 'throne-lamp-e',
        x: 11,
        y: 4,
      },
    ],
  },

  // ─── SEWERZ (champion quest #2) ──────────────────────────
  sewerz_mouth: {
    id: 'sewerz_mouth',
    title: 'SEWER MOUTH · SEWERZ',
    land: 'sewerz',
    floor: -1,
    mapX: 4,
    mapY: 0,
    west: 'kingdom_courtyard',
    east: 'sewerz_hall',
    tiles: [
      '################',
      '#..............#',
      '#..####..####..#',
      '#..#........#..#',
      '................',
      '................',
      '................',
      '#..#........#..#',
      '#..####..####..#',
      '#..............#',
      '################',
    ],
    entities: [
      {
        kind: 'sign',
        id: 'sewer-mouth-sign',
        x: 8,
        y: 2,
        dialog: [
          'ROYAL SEWERZ — CHAMPIONS ONLY.',
          'MEANER CREEPS. HONKING AHEAD.',
          'EAST INTO THE PIPES.',
        ],
      },
      {
        kind: 'mapz',
        id: 'mapz-sewerz',
        x: 4,
        y: 8,
        mapzId: 'sewerz',
        dialog: [
          'SEWERZ MAPZ — PIPES. SOME GOOSE.',
          'PRESS M.',
        ],
      },
      {
        kind: 'slime',
        id: 'sewer-slime-1',
        x: 10,
        y: 5,
      },
      {
        kind: 'skeleton',
        id: 'sewer-skel-1',
        x: 6,
        y: 6,
      },
    ],
  },

  sewerz_hall: {
    id: 'sewerz_hall',
    title: 'PIPE HALL · SEWERZ',
    land: 'sewerz',
    floor: -1,
    mapX: 5,
    mapY: 0,
    west: 'sewerz_mouth',
    north: 'sewerz_fork',
    stairsDown: 'sewerz_b2_foyer',
    tiles: [
      '########D#######',
      '#..............#',
      '#.####....####.#',
      '#.#....S.....#.#',
      '#.#..~~~~~~..#.#',
      '....#......#...#', // west open → mouth; east solid
      '#.#..~~~~~~..#.#',
      '#.#..........#.#',
      '#.####....####.#',
      '#..............#',
      '################',
    ],
    entities: [
      {
        kind: 'skeleton',
        id: 'sewer-skel-2',
        x: 5,
        y: 3,
      },
      {
        kind: 'skeleton',
        id: 'sewer-skel-3',
        x: 11,
        y: 7,
      },
      {
        kind: 'slime',
        id: 'sewer-slime-2',
        x: 8,
        y: 8,
      },
      {
        kind: 'wolf',
        id: 'sewer-ratwolf-1',
        x: 10,
        y: 4,
      },
    ],
  },

  sewerz_fork: {
    id: 'sewerz_fork',
    title: 'OVERFLOW · SEWERZ',
    land: 'sewerz',
    floor: -1,
    mapX: 5,
    mapY: 1,
    south: 'sewerz_hall',
    tiles: [
      '################',
      '#..............#',
      '#..##~~~~~~##..#',
      '#..............#',
      '#..####..####..#',
      '#..............#',
      '#..####..####..#',
      '#..............#',
      '#..##~~~~~~##..#',
      '#..............#',
      '########D#######',
    ],
    entities: [
      {
        kind: 'chest',
        id: 'sewer-chest',
        x: 8,
        y: 5,
        chestTable: 'dungeon',
      },
      {
        kind: 'cactus',
        id: 'sewer-weird-1',
        x: 5,
        y: 3,
      },
      {
        kind: 'heart',
        id: 'sewer-heart',
        x: 11,
        y: 7,
      },
    ],
  },

  // sewerz_boss + B2–B4: generated in world-deep.ts
};

// Merge deep wings (4× floor counts per dunjun land)
Object.assign(ROOMS, buildAllDeepRooms());

// Fellowship of the Few — roads + Dwarvez / Roarhimz / Moredorkz
Object.assign(ROOMS, FELLOWSHIP_ROOMS);

/** Old room ids → new map ids (save migration). */
export const ROOM_ALIASES: Record<string, string> = {
  dungeon_1: 'b1_entrance',
  dungeon_side: 'b1_cube',
  dungeon_2: 'b1_gate',
  trek_room: 'b1_trek',
  dungeon_3: 'b1_hall',
  /** Old shallow throne → deep B8 throne */
  boss: 'b8_boss',
  b2_boss: 'b8_boss',
};

export function resolveRoomId(id: string): string {
  return ROOM_ALIASES[id] ?? id;
}

/** New crawlers wake on the beach south of the meadow. */
export const START_ROOM = 'beach_start';
export const BEACH_START_ID = 'beach_start';

/** Human-readable floor label for HUD. */
export function floorLabel(floor: number | undefined): string {
  if (floor === undefined || floor === 0) return 'SURFACE';
  if (floor < 0) return `B${Math.abs(floor)}`;
  return `F${floor}`;
}
