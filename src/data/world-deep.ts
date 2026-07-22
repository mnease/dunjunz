/**
 * Deep dungeon expansion — 4× floors for each dunjun land.
 *
 * Dunjunz: B1 (authored) + B2…B8 generated (4× the old B1–B2 depth).
 * Woodz / Dezertz: surface + B1–B3 deep wings (4 floors total).
 * Sewerz: B1 authored + B2–B4 to the goose (4 floors).
 *
 * Each deeper floor gets: darker tile tint (GameScene), hazard stamping,
 * denser/meaner creeps, and layout tiers (open → cramped → maze).
 */

import type { EntityDef, EntityKind, LandId, RoomDef } from '../types';
import {
  applyDepthHazards,
  basementDepth,
  depthExtraCreepSlots,
  depthFlavor,
  depthLayoutTier,
  type DepthTileset,
} from '../systems/floor-depth';

/** Assert each row is 16 tiles (authoring guard). */
function rows16(label: string, rows: string[]): string[] {
  for (let i = 0; i < rows.length; i++) {
    if (rows[i]!.length !== 16) {
      throw new Error(`${label}[${i}] len ${rows[i]!.length}: ${rows[i]}`);
    }
  }
  if (rows.length !== 11) {
    throw new Error(`${label} has ${rows.length} rows (need 11)`);
  }
  return rows;
}

/** Open hall (shallow). */
const HALL_OPEN = rows16('HALL_OPEN', [
  '########D#######',
  '#..............#',
  '#..##......##..#',
  '#..............#',
  '....#......#....',
  '#..............#',
  '....#......#....',
  '#..............#',
  '#..##......##..#',
  '#..............#',
  '########D#######',
]);

/** Cramped hall (mid). */
const HALL_CRAMP = rows16('HALL_CRAMP', [
  '########D#######',
  '#..##......##..#',
  '#.##..####..##.#',
  '#..............#',
  '....####..##....',
  '#.##........##.#',
  '....##..####....',
  '#..............#',
  '#.##..####..##.#',
  '#..##......##..#',
  '########D#######',
]);

/** Maze hall (deep) — lava pockets. */
const HALL_MAZE = rows16('HALL_MAZE', [
  '########D#######',
  '#.##.=..=.##...#',
  '#.#..####..##..#',
  '#....#..#......#',
  '....##..=..##...',
  '#.#....##....#.#',
  '....##..=..##...',
  '#......#..#....#',
  '#.#..####..##..#',
  '#.##.=..=.##...#',
  '########D#######',
]);

const FOYER_OPEN = rows16('FOYER_OPEN', [
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
]);

const FOYER_CRAMP = rows16('FOYER_CRAMP', [
  '########D#######',
  '#..##......##..#',
  '#..............#',
  '#......U.......#',
  '#..##......##..#',
  '#..............#',
  '#.####....####.#',
  '#..............#',
  '#..##......##..#',
  '#..............#',
  '################',
]);

const FOYER_MAZE = rows16('FOYER_MAZE', [
  '########D#######',
  '#.##.=..=.##...#',
  '#.#..........#.#',
  '#......U.......#',
  '#.#..####..##..#',
  '#....#==#......#',
  '#.#..####..##..#',
  '#..............#',
  '#.##.=..=.##...#',
  '#..............#',
  '################',
]);

const SIDE_OPEN = rows16('SIDE_OPEN', [
  '################',
  '#..............#',
  '#..####..####..#',
  '#..............#',
  'D..............#',
  '#..............#',
  '#..............#',
  '#..####..####..#',
  '#..............#',
  '#..............#',
  '################',
]);

const SIDE_CRAMP = rows16('SIDE_CRAMP', [
  '################',
  '#.##........##.#',
  '#..####..####..#',
  '#....#....#....#',
  'D..............#',
  '#....#....#....#',
  '#..............#',
  '#..####..####..#',
  '#.##........##.#',
  '#..............#',
  '################',
]);

const SIDE_MAZE = rows16('SIDE_MAZE', [
  '################',
  '#.##.=..=.##...#',
  '#..####..####..#',
  '#.#..........#.#',
  'D....#==#......#',
  '#.#..........#.#',
  '#....#==#......#',
  '#..####..####..#',
  '#.##.=..=.##...#',
  '#..............#',
  '################',
]);

const DESCENT_OPEN = rows16('DESCENT_OPEN', [
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
]);

const DESCENT_CRAMP = rows16('DESCENT_CRAMP', [
  '################',
  '#..##......##..#',
  '#..............#',
  '#......S.......#',
  '#..##......##..#',
  '#..............#',
  '#.####....####.#',
  '#..............#',
  '#..##......##..#',
  '#..............#',
  '########D#######',
]);

const DESCENT_MAZE = rows16('DESCENT_MAZE', [
  '################',
  '#.##.=..=.##...#',
  '#.#..........#.#',
  '#......S.......#',
  '#.#..#==#..##..#',
  '#..............#',
  '#.#..####..##..#',
  '#....#..#......#',
  '#.##.=..=.##...#',
  '#..............#',
  '########D#######',
]);

function pickLayout(
  tier: 0 | 1 | 2,
  open: string[],
  cramp: string[],
  maze: string[],
): string[] {
  if (tier >= 2) return maze;
  if (tier >= 1) return cramp;
  return open;
}

const BOSS_ARENA: string[] = [
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
];

const WOOD_DEEP: string[] = [
  '###g###D###g####',
  '#gg..........gg#',
  '#g....####....g#',
  '#..............#',
  'D....#....#....#',
  '#..............#',
  '#....#....#....#',
  '#g............g#',
  '#gg..######..gg#',
  '#ggg........ggg#',
  '######g##g######',
];

const SAND_DEEP: string[] = [
  '###d###D###d####',
  '#dd..........dd#',
  '#d....####....d#',
  '#..............#',
  'D..............#',
  '#......dd......#',
  '#..............#',
  '#d....####....d#',
  '#dd..........dd#',
  '#ddd........ddd#',
  '######d##d######',
];

const SEWER_PIPE: string[] = [
  '########D#######',
  '#..............#',
  '#.####....####.#',
  '#.#..~~~~~~..#.#',
  '....#......#....',
  '#.#..~~~~~~..#.#',
  '....#......#....',
  '#.#..........#.#',
  '#.####....####.#',
  '#..............#',
  '########D#######',
];

type Creep = 'slime' | 'skeleton' | 'redshirt' | 'wolf' | 'scorpion' | 'tarantula';

function creeps(
  kinds: Creep[],
  prefix: string,
  spots: [number, number][],
): EntityDef[] {
  return spots.map(([x, y], i) => ({
    kind: kinds[i % kinds.length] as EntityKind,
    id: `${prefix}-c${i}`,
    x,
    y,
  }));
}

/** Extra spawn points used as floors deepen (kept clear of doors/stairs). */
const EXTRA_SPOTS: [number, number][] = [
  [6, 5],
  [9, 6],
  [7, 4],
  [10, 8],
  [5, 6],
  [12, 5],
];

function creepsForDepth(
  kinds: Creep[],
  prefix: string,
  baseSpots: [number, number][],
  depth: number,
): EntityDef[] {
  const extra = depthExtraCreepSlots(depth);
  const spots = [...baseSpots];
  for (let i = 0; i < extra && i < EXTRA_SPOTS.length; i++) {
    spots.push(EXTRA_SPOTS[i]!);
  }
  return creeps(kinds, prefix, spots);
}

function sign(
  id: string,
  x: number,
  y: number,
  lines: string[],
): EntityDef {
  return { kind: 'sign', id, x, y, dialog: lines };
}

function chest(id: string, x: number, y: number, table = 'dungeon'): EntityDef {
  return { kind: 'chest', id, x, y, chestTable: table };
}

function heart(id: string, x: number, y: number): EntityDef {
  return { kind: 'heart', id, x, y };
}

/** One intermediate basement floor: foyer ↔ hall ↔ side, stairs down. */
function makeBasementFloor(opts: {
  land: LandId;
  /** Floor number e.g. -2 */
  floor: number;
  /** Id prefix e.g. b2 or woodz_b1 */
  prefix: string;
  titleTag: string;
  stairsUpTo: string;
  stairsDownTo: string;
  tileset: DepthTileset;
  hostiles: Creep[];
}): Record<string, RoomDef> {
  const { land, floor, prefix, titleTag, stairsUpTo, stairsDownTo, hostiles } =
    opts;
  const depth = basementDepth(floor);
  const tier = depthLayoutTier(depth);
  const flavor = depthFlavor(depth);
  const ts = opts.tileset;

  const stamp = (tiles: string[], roomKey: string) =>
    applyDepthHazards(tiles, depth, ts, `${prefix}:${roomKey}`);

  let foyer: string[];
  let hall: string[];
  let side: string[];
  let descent: string[];

  if (ts === 'dungeon') {
    foyer = pickLayout(tier, FOYER_OPEN, FOYER_CRAMP, FOYER_MAZE);
    hall = pickLayout(tier, HALL_OPEN, HALL_CRAMP, HALL_MAZE);
    side = pickLayout(tier, SIDE_OPEN, SIDE_CRAMP, SIDE_MAZE);
    descent = pickLayout(tier, DESCENT_OPEN, DESCENT_CRAMP, DESCENT_MAZE);
  } else if (ts === 'sewer') {
    foyer =
      tier >= 2
        ? [
            '########D#######',
            '#.##~~~~~~##..#',
            '#.####....####.#',
            '#......U.......#',
            '....#~~~~~~#....',
            '#.#..~~~~~~..#.#',
            '....#~~~~~~#....',
            '#.#..........#.#',
            '#.####....####.#',
            '#.##~~~~~~##..#',
            '################',
          ]
        : tier >= 1
          ? [
              '########D#######',
              '#..##......##..#',
              '#.####....####.#',
              '#......U.......#',
              '....#......#....',
              '#.#..~~~~~~..#.#',
              '....#......#....',
              '#.#..........#.#',
              '#.####....####.#',
              '#..##......##..#',
              '################',
            ]
          : [
              '########D#######',
              '#..............#',
              '#.####....####.#',
              '#......U.......#',
              '....#......#....',
              '#.#..~~~~~~..#.#',
              '....#......#....',
              '#.#..........#.#',
              '#.####....####.#',
              '#..............#',
              '################',
            ];
    hall =
      tier >= 2
        ? SEWER_PIPE.map((r, i) =>
            i === 2 || i === 8 ? '#.#.~~~~~~.#.#.#' : r,
          )
        : SEWER_PIPE;
    side =
      tier >= 1
        ? [
            '################',
            '#..##~~~~~~##..#',
            '#..##~~~~~~##..#',
            '#..............#',
            'D..............#',
            '#..............#',
            '#..##~~~~~~##..#',
            '#..##~~~~~~##..#',
            '#..............#',
            '#..............#',
            '################',
          ]
        : [
            '################',
            '#..............#',
            '#..##~~~~~~##..#',
            '#..............#',
            'D..............#',
            '#..............#',
            '#..............#',
            '#..##~~~~~~##..#',
            '#..............#',
            '#..............#',
            '################',
          ];
    descent = pickLayout(tier, DESCENT_OPEN, DESCENT_CRAMP, DESCENT_MAZE).map(
      (r) => r.replace(/=/g, '~'),
    );
  } else if (ts === 'wood') {
    foyer =
      tier >= 1
        ? [
            '###g###D###g####',
            '#gg..####..gggg#',
            '#g............g#',
            '#......U.......#',
            'D....#....#....#',
            '#..............#',
            '#....#....#....#',
            '#g............g#',
            '#gg..####..gggg#',
            '#ggg........ggg#',
            '######g##g######',
          ]
        : [
            '###g###D###g####',
            '#gg..........gg#',
            '#g............g#',
            '#......U.......#',
            'D..............#',
            '#..............#',
            '#..............#',
            '#g............g#',
            '#gg..........gg#',
            '#ggg........ggg#',
            '######g##g######',
          ];
    hall =
      tier >= 2
        ? WOOD_DEEP.map((r, i) =>
            i === 4 || i === 6 ? 'D..###....###..#' : r,
          )
        : WOOD_DEEP;
    side =
      tier >= 1
        ? rows16('wood-side-cramp', [
            '################',
            '#gg..####..gggg#',
            '#g..######..ggg#',
            '#..............#',
            'D....#....#....#',
            '#..............#',
            '#....#....#....#',
            '#g..######..ggg#',
            '#gg..####..gggg#',
            '#ggg........ggg#',
            '################',
          ])
        : rows16('wood-side-open', [
            '################',
            '#gg..........gg#',
            '#g..####..##..g#',
            '#..............#',
            'D..............#',
            '#..............#',
            '#..............#',
            '#g..####..##..g#',
            '#gg..........gg#',
            '#ggg........ggg#',
            '################',
          ]);
    descent = pickLayout(tier, DESCENT_OPEN, DESCENT_CRAMP, DESCENT_MAZE).map(
      (r) => r.replace(/=/g, '#'),
    );
  } else {
    // sand
    foyer =
      tier >= 1
        ? [
            '###d###D###d####',
            '#dd..####..dddd#',
            '#d............d#',
            '#......U.......#',
            'D....#....#....#',
            '#......dd......#',
            '#....#....#....#',
            '#d............d#',
            '#dd..####..dddd#',
            '#ddd........ddd#',
            '######d##d######',
          ]
        : [
            '###d###D###d####',
            '#dd..........dd#',
            '#d............d#',
            '#......U.......#',
            'D..............#',
            '#......dd......#',
            '#..............#',
            '#d............d#',
            '#dd..........dd#',
            '#ddd........ddd#',
            '######d##d######',
          ];
    hall =
      tier >= 2
        ? SAND_DEEP.map((r, i) =>
            i === 5 ? '#....====......#' : r,
          )
        : SAND_DEEP;
    side =
      tier >= 1
        ? rows16('sand-side-cramp', [
            '################',
            '#dd..####..dddd#',
            '#d..##==##..ddd#',
            '#..............#',
            'D......dd......#',
            '#......dd......#',
            '#..............#',
            '#d..##==##..ddd#',
            '#dd..####..dddd#',
            '#ddd........ddd#',
            '################',
          ])
        : rows16('sand-side-open', [
            '################',
            '#dd..........dd#',
            '#d..####..##..d#',
            '#..............#',
            'D..............#',
            '#......dd......#',
            '#..............#',
            '#d..####..##..d#',
            '#dd..........dd#',
            '#ddd........ddd#',
            '################',
          ]);
    descent = pickLayout(tier, DESCENT_OPEN, DESCENT_CRAMP, DESCENT_MAZE);
  }

  foyer = stamp(foyer, 'foyer');
  hall = stamp(hall, 'hall');
  side = stamp(side, 'side');
  descent = stamp(descent, 'descent');

  const flabel = floor < 0 ? `B${Math.abs(floor)}` : `F${floor}`;

  const rooms: Record<string, RoomDef> = {
    [`${prefix}_foyer`]: {
      id: `${prefix}_foyer`,
      title: `${titleTag} FOYER · ${flabel}`,
      land,
      floor,
      mapX: 0,
      mapY: 0,
      north: `${prefix}_hall`,
      stairsUp: stairsUpTo,
      tiles: foyer,
      entities: [
        sign(`${prefix}-foyer-sign`, 12, 8, [
          `${flabel}: ${flavor}.`,
          `${titleTag} — DEEPER STILL AWAITS.`,
          'U = STAIRS UP. N = HALL.',
        ]),
        ...creepsForDepth(
          hostiles,
          `${prefix}-foyer`,
          [
            [4, 8],
            [11, 7],
          ],
          depth,
        ),
      ],
    },
    [`${prefix}_hall`]: {
      id: `${prefix}_hall`,
      title: `${titleTag} HALL · ${flabel}`,
      land,
      floor,
      mapX: 0,
      mapY: 1,
      south: `${prefix}_foyer`,
      north: `${prefix}_descent`,
      east: `${prefix}_side`,
      tiles: hall,
      entities: [
        ...creepsForDepth(
          hostiles,
          `${prefix}-hall`,
          [
            [5, 3],
            [11, 7],
            [8, 5],
            [4, 8],
          ],
          depth,
        ),
        heart(`${prefix}-hall-heart`, 12, 4),
      ],
    },
    [`${prefix}_side`]: {
      id: `${prefix}_side`,
      title: `${titleTag} SIDE · ${flabel}`,
      land,
      floor,
      mapX: 1,
      mapY: 1,
      west: `${prefix}_hall`,
      tiles: side,
      entities: [
        chest(`${prefix}-side-chest`, 8, 5),
        ...creepsForDepth(
          hostiles,
          `${prefix}-side`,
          [
            [5, 3],
            [11, 7],
          ],
          depth,
        ),
        sign(`${prefix}-side-sign`, 3, 8, [
          `SIDE CHAMBER · ${flabel}.`,
          depth >= 5 ? 'LOOT. LAVA. REGRET.' : 'LOOT + REGRET.',
          'WEST BACK TO THE HALL.',
        ]),
      ],
    },
    [`${prefix}_descent`]: {
      id: `${prefix}_descent`,
      title: `${titleTag} DESCENT · ${flabel}`,
      land,
      floor,
      mapX: 0,
      mapY: 2,
      south: `${prefix}_hall`,
      stairsDown: stairsDownTo,
      tiles: descent,
      entities: [
        sign(`${prefix}-descent-sign`, 3, 8, [
          `YOU ARE ON ${flabel} — ${flavor}.`,
          'S = STAIRS DEEPER. DARKER. MEANER.',
          'SOUTH: HALL.',
        ]),
        ...creepsForDepth(
          hostiles,
          `${prefix}-descent`,
          [
            [11, 7],
            [6, 5],
          ],
          depth,
        ),
      ],
    },
  };

  return rooms;
}

/** Dunjunz B2–B7 intermediate + B8 throne (boss). */
export function buildDunjunzDeep(): Record<string, RoomDef> {
  const out: Record<string, RoomDef> = {};

  // B2–B7: escalate species as you sink (layout/hazards also escalate)
  const hostilesByDepth: Creep[][] = [
    ['slime', 'skeleton'], // B2 — still learning
    ['skeleton', 'slime'], // B3
    ['skeleton', 'redshirt'], // B4 — redshirts join
    ['redshirt', 'skeleton'], // B5
    ['redshirt', 'skeleton', 'wolf'], // B6 — deep fauna
    ['wolf', 'redshirt', 'skeleton'], // B7 — wolves lead packs
  ];

  for (let n = 2; n <= 7; n++) {
    const floor = -n;
    const prefix = `b${n}`;
    const up =
      n === 2 ? 'b1_descent' : `b${n - 1}_descent`;
    const down = n === 7 ? 'b8_foyer' : `b${n + 1}_foyer`;
    Object.assign(
      out,
      makeBasementFloor({
        land: 'dunjunz',
        floor,
        prefix,
        titleTag: 'DUNJUN',
        stairsUpTo: up,
        stairsDownTo: down,
        tileset: 'dungeon',
        hostiles: hostilesByDepth[n - 2]!,
      }),
    );
  }

  // B8 — final throne
  out.b8_foyer = {
    id: 'b8_foyer',
    title: 'META ANTECHAMBER · B8',
    land: 'dunjunz',
    floor: -8,
    mapX: 0,
    mapY: 0,
    north: 'b8_boss',
    stairsUp: 'b7_descent',
    tiles: applyDepthHazards(FOYER_MAZE, 8, 'dungeon', 'b8:foyer'),
    entities: [
      sign('b8-foyer-sign', 12, 8, [
        'B8: THE ABYSS. FINALLY.',
        'NORTH: THRONE OF META.',
        'U = ALL THE WAY BACK UP. COWARD.',
      ]),
      ...creepsForDepth(
        ['wolf', 'redshirt', 'skeleton'],
        'b8-foyer',
        [
          [4, 8],
          [11, 7],
          [8, 6],
        ],
        8,
      ),
    ],
  };

  out.b8_boss = {
    id: 'b8_boss',
    title: 'THRONE OF META · B8',
    land: 'dunjunz',
    floor: -8,
    mapX: 0,
    mapY: 1,
    south: 'b8_foyer',
    tiles: applyDepthHazards(BOSS_ARENA, 8, 'dungeon', 'b8:boss'),
    entities: [
      {
        kind: 'boss',
        id: 'dungeon-master',
        x: 8,
        y: 3,
        hp: 72,
        dialog: [
          'I AM THE DUNGEON MASTER!',
          'EIGHT FLOORS. YOU STILL CAME.',
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
          "PRIZELLA'S IN THE DEZERTZ. GO GET HER.",
        ],
      },
      {
        kind: 'mapz',
        id: 'mapz-dunjunz',
        x: 12,
        y: 3,
        mapzId: 'dunjunz',
        dialog: [
          "DUNJUNZ MAPZ! IT'S ALL HALLWAYS.",
          'EIGHT FLOORS. PRESS M. GET LOST ON PURPOSE.',
        ],
      },
      {
        kind: 'merchant',
        id: 'tinkerer-boss',
        x: 3,
        y: 8,
        shopId: 'tinkerer',
        dialog: [
          "TINKERER: YEAH SHE WAS NEVER HERE.",
          'I FOLLOWED YOU DOWN EIGHT FLOORS.',
          'TRY THE DEZERTZ TOWER. HOT. SANDY.',
          'E FOR THE SHOP. BUY STUFF. LIVE A LITTLE.',
        ],
      },
    ],
  };

  return out;
}

/** Woodz deep B1–B3 under woodz_deep. */
export function buildWoodzDeep(): Record<string, RoomDef> {
  const out: Record<string, RoomDef> = {};
  const packs: Creep[][] = [
    ['wolf', 'slime'],
    ['wolf', 'skeleton'],
    ['wolf', 'wolf', 'slime'],
  ];
  for (let n = 1; n <= 3; n++) {
    const floor = -n;
    const prefix = `woodz_b${n}`;
    const up = n === 1 ? 'woodz_deep' : `woodz_b${n - 1}_descent`;
    const down =
      n === 3 ? 'woodz_b3_heart' : `woodz_b${n + 1}_foyer`;
    Object.assign(
      out,
      makeBasementFloor({
        land: 'woodz',
        floor,
        prefix,
        titleTag: 'ROOTS',
        stairsUpTo: up,
        stairsDownTo: down,
        tileset: 'wood',
        hostiles: packs[n - 1]!,
      }),
    );
  }
  // Terminal treasure room instead of endless stairs from B3 descent
  out.woodz_b3_heart = {
    id: 'woodz_b3_heart',
    title: 'HEARTWOOD · B3',
    land: 'woodz',
    floor: -3,
    mapX: 0,
    mapY: 3,
    stairsUp: 'woodz_b3_descent',
    tiles: [
      '###g##########g#',
      '#gg..........gg#',
      '#g..########..g#',
      '#..............#',
      '#......U.......#',
      '#..............#',
      '#..##......##..#',
      '#..............#',
      '#g............g#',
      '#gg..........gg#',
      '######g##g######',
    ],
    entities: [
      chest('woodz-heartwood-chest', 8, 7, 'boss'),
      heart('woodz-heartwood-heart', 5, 5),
      ...creeps(['wolf'], 'woodz-heartwood', [
        [11, 6],
        [4, 8],
      ]),
      sign('woodz-heartwood-sign', 12, 8, [
        'HEARTWOOD. THE ROOTS END HERE.',
        'U = CLIMB BACK TO THE PINEY LIE.',
      ]),
    ],
  };
  // Fix B3 descent to heart instead of missing foyer
  if (out.woodz_b3_descent) {
    out.woodz_b3_descent = {
      ...out.woodz_b3_descent,
      stairsDown: 'woodz_b3_heart',
    };
  }
  return out;
}

/** Dezertz B1–B3 under tower. */
export function buildDezertzDeep(): Record<string, RoomDef> {
  const out: Record<string, RoomDef> = {};
  const packs: Creep[][] = [
    ['scorpion', 'slime'],
    ['scorpion', 'tarantula'],
    ['tarantula', 'scorpion', 'redshirt'],
  ];
  for (let n = 1; n <= 3; n++) {
    const floor = -n;
    const prefix = `dezertz_b${n}`;
    const up = n === 1 ? 'dezertz_tower' : `dezertz_b${n - 1}_descent`;
    const down =
      n === 3 ? 'dezertz_b3_vault' : `dezertz_b${n + 1}_foyer`;
    Object.assign(
      out,
      makeBasementFloor({
        land: 'dezertz',
        floor,
        prefix,
        titleTag: 'CRYPT',
        stairsUpTo: up,
        stairsDownTo: down,
        tileset: 'sand',
        hostiles: packs[n - 1]!,
      }),
    );
  }
  out.dezertz_b3_vault = {
    id: 'dezertz_b3_vault',
    title: 'SAND VAULT · B3',
    land: 'dezertz',
    floor: -3,
    mapX: 0,
    mapY: 3,
    stairsUp: 'dezertz_b3_descent',
    tiles: [
      '###d##########d#',
      '#dd..........dd#',
      '#d..########..d#',
      '#..............#',
      '#......U.......#',
      '#......==......#',
      '#..............#',
      '#..##......##..#',
      '#dd..........dd#',
      '#ddd........ddd#',
      '######d##d######',
    ],
    entities: [
      chest('dezertz-vault-chest', 8, 7, 'boss'),
      ...creeps(['scorpion', 'tarantula'], 'dezertz-vault', [
        [5, 3],
        [11, 8],
        [8, 3],
      ]),
      sign('dezertz-vault-sign', 3, 8, [
        'SAND VAULT. PRIZELLA WAS UPSTAIRS.',
        'YOU DUG TOO DEEP. COOL THOUGH.',
      ]),
    ],
  };
  if (out.dezertz_b3_descent) {
    out.dezertz_b3_descent = {
      ...out.dezertz_b3_descent,
      stairsDown: 'dezertz_b3_vault',
    };
  }
  return out;
}

/**
 * Sewerz B2–B4. Authored mouth/hall/fork stay B1;
 * boss moves to B4; hall gains stairs down.
 */
export function buildSewerzDeep(): Record<string, RoomDef> {
  const out: Record<string, RoomDef> = {};
  const packs: Creep[][] = [
    ['slime', 'skeleton'],
    ['skeleton', 'wolf'],
    ['skeleton', 'slime', 'wolf'],
  ];
  for (let n = 2; n <= 3; n++) {
    const floor = -n;
    const prefix = `sewerz_b${n}`;
    const up = n === 2 ? 'sewerz_hall' : `sewerz_b${n - 1}_descent`;
    const down = n === 3 ? 'sewerz_b4_foyer' : `sewerz_b${n + 1}_foyer`;
    Object.assign(
      out,
      makeBasementFloor({
        land: 'sewerz',
        floor,
        prefix,
        titleTag: 'PIPE',
        stairsUpTo: up,
        stairsDownTo: down,
        tileset: 'sewer',
        hostiles: packs[n - 2]!,
      }),
    );
  }

  out.sewerz_b4_foyer = {
    id: 'sewerz_b4_foyer',
    title: 'HONK ANTECHAMBER · B4',
    land: 'sewerz',
    floor: -4,
    mapX: 0,
    mapY: 0,
    north: 'sewerz_boss',
    stairsUp: 'sewerz_b3_descent',
    tiles: [
      '########D#######',
      '#..............#',
      '#.####....####.#',
      '#......U.......#',
      '....#......#....',
      '#.#..~~~~~~..#.#',
      '....#......#....',
      '#.#..........#.#',
      '#.####....####.#',
      '#..............#',
      '################',
    ],
    entities: [
      sign('sewerz-b4-sign', 12, 8, [
        'B4: HONK CHAMBER AHEAD.',
        'N = THE BILL. LITERALLY.',
      ]),
      ...creeps(['slime', 'skeleton', 'wolf'], 'sewerz-b4', [
        [5, 7],
        [10, 5],
      ]),
    ],
  };

  // Boss room redefined at B4 (replaces shallow boss placement)
  out.sewerz_boss = {
    id: 'sewerz_boss',
    title: 'HONK CHAMBER · B4',
    land: 'sewerz',
    floor: -4,
    mapX: 0,
    mapY: 1,
    south: 'sewerz_b4_foyer',
    tiles: BOSS_ARENA.map((r, i) =>
      i === 5 ? '......~~~~......' : r,
    ),
    entities: [
      {
        kind: 'boss',
        id: 'royal-goose',
        x: 8,
        y: 3,
        hp: 88,
        dialog: [
          'ROYAL GOOSE: HONK.',
          'FOUR FLOORS OF PIPE. HONK HONK.',
          '(THAT WAS A THREAT.)',
          'THE TAX SCROLLS ARE MINE.',
          'FACE THE BILL. LITERALLY.',
        ],
      },
      {
        kind: 'chest',
        id: 'sewer-boss-chest',
        x: 8,
        y: 7,
        chestTable: 'boss',
      },
    ],
  };

  return out;
}

export function buildAllDeepRooms(): Record<string, RoomDef> {
  return {
    ...buildDunjunzDeep(),
    ...buildWoodzDeep(),
    ...buildDezertzDeep(),
    ...buildSewerzDeep(),
  };
}
