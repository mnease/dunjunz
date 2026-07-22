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

import type {
  EntityDef,
  EntityKind,
  LandId,
  RoomDef,
  RoomSideRole,
} from '../types';
import {
  applyDepthHazards,
  basementDepth,
  depthExtraCreepSlots,
  depthFlavor,
  depthLayoutTier,
  type DepthTileset,
} from '../systems/floor-depth';

/** P0: side chamber role rotation (not every side is combat+chest). */
export function sideRoleForDepth(depth: number): RoomSideRole {
  const cycle: RoomSideRole[] = [
    'vault',
    'combat',
    'quiet',
    'hazard',
    'combat',
    'vault',
  ];
  return cycle[Math.max(0, depth - 1) % cycle.length]!;
}

/** P1 land-locked pack recipes — pure, testable. */
export function landPackRecipe(
  land: LandId,
  depthBand: number,
): EntityKind[] {
  // depthBand: 0 = shallow, 1 = mid, 2 = deep
  const b = Math.max(0, Math.min(2, depthBand));
  if (land === 'woodz') {
    const packs: EntityKind[][] = [
      ['wolf', 'wolf'],
      ['wolf', 'wolf', 'wolf'],
      ['wolf', 'wolf'],
    ];
    return packs[b]!;
  }
  if (land === 'dezertz') {
    const packs: EntityKind[][] = [
      ['scorpion', 'cactus'],
      ['scorpion', 'tarantula'],
      ['tarantula', 'scorpion', 'hornet'],
    ];
    return packs[b]!;
  }
  if (land === 'sewerz') {
    const packs: EntityKind[][] = [
      ['slime', 'skeleton'],
      ['skeleton', 'slime'],
      ['skeleton', 'slime', 'wolf'],
    ];
    return packs[b]!;
  }
  // dunjunz default bureaucracy fauna
  const packs: EntityKind[][] = [
    ['slime', 'skeleton'],
    ['skeleton', 'redshirt'],
    ['redshirt', 'skeleton', 'wolf'],
  ];
  return packs[b]!;
}

function wallTorch(id: string, x: number, y: number): EntityDef {
  return { kind: 'torch_wall', id, x, y };
}

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

/**
 * Hall: N + S + E doors only (east → side chamber). West always solid wall.
 * (Old templates opened west with "...." and broke flow.)
 */
const HALL_OPEN = rows16('HALL_OPEN', [
  '########D#######',
  '#..............#',
  '#..##......##..#',
  '#..............#',
  '#...#......#...D',
  '#..............#',
  '#...#......#...#',
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
  '#...####..##...D',
  '#.##........##.#',
  '#...##..####...#',
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
  '#...##..=..##..D',
  '#.#....##....#.#',
  '#...##..=..##..#',
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

/** Boss arena: south exit only (N/E/W solid — no orphan trail mouths). */
const BOSS_ARENA = rows16('BOSS_ARENA', [
  '################',
  '#..............#',
  '#..##......##..#',
  '#..............#',
  '#..............#',
  '#....#==#......#',
  '#..............#',
  '#..............#',
  '#..##......##..#',
  '#..............#',
  '########D#######',
]);

/** Wood hall: N/S/E doors; west solid; east → side. */
const WOOD_DEEP = rows16('WOOD_DEEP', [
  '###g###D###g####',
  '#gg..........gg#',
  '#g....####....g#',
  '#..............#',
  '#....#....#....D',
  '#..............#',
  '#....#....#....#',
  '#g............g#',
  '#gg..######..gg#',
  '#ggg........ggg#',
  '###g###D###g####',
]);

/** Sand hall: N/S/E; west solid. */
const SAND_DEEP = rows16('SAND_DEEP', [
  '###d###D###d####',
  '#dd..........dd#',
  '#d....####....d#',
  '#..............#',
  '#..............D',
  '#......dd......#',
  '#..............#',
  '#d....####....d#',
  '#dd..........dd#',
  '#ddd........ddd#',
  '###d###D###d####',
]);

/** Sewer pipe hall: N/S + E (side) doors; west solid. */
const SEWER_PIPE = rows16('SEWER_PIPE', [
  '########D#######',
  '#..............#',
  '#.####....####.#',
  '#.#..~~~~~~..#.#',
  '#...#......#...D',
  '#.#..~~~~~~..#.#',
  '#...#......#...#',
  '#.#..........#.#',
  '#.####....####.#',
  '#..............#',
  '########D#######',
]);

type Creep =
  | 'slime'
  | 'skeleton'
  | 'redshirt'
  | 'wolf'
  | 'scorpion'
  | 'tarantula'
  | 'hornet'
  | 'cactus';

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
    // Foyer: N door + U only; E/W/S solid (no trail mouths)
    foyer =
      tier >= 1
        ? rows16('sewer-foyer-cramp', [
            '########D#######',
            '#..##......##..#',
            '#.####....####.#',
            '#......U.......#',
            '#...#......#...#',
            '#.#..~~~~~~..#.#',
            '#...#......#...#',
            '#.#..........#.#',
            '#.####....####.#',
            '#..##......##..#',
            '################',
          ])
        : rows16('sewer-foyer-open', [
            '########D#######',
            '#..............#',
            '#.####....####.#',
            '#......U.......#',
            '#...#......#...#',
            '#.#..~~~~~~..#.#',
            '#...#......#...#',
            '#.#..........#.#',
            '#.####....####.#',
            '#..............#',
            '################',
          ]);
    hall = SEWER_PIPE;
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
    // Foyer: N door + U only; seal W/S (was west D + south g mouths)
    foyer =
      tier >= 1
        ? rows16('wood-foyer-cramp', [
            '###g###D###g####',
            '#gg..####..gggg#',
            '#g............g#',
            '#......U.......#',
            '#....#....#....#',
            '#..............#',
            '#....#....#....#',
            '#g............g#',
            '#gg..####..gggg#',
            '#ggg........ggg#',
            '################',
          ])
        : rows16('wood-foyer-open', [
            '###g###D###g####',
            '#gg..........gg#',
            '#g............g#',
            '#......U.......#',
            '#..............#',
            '#..............#',
            '#..............#',
            '#g............g#',
            '#gg..........gg#',
            '#ggg........ggg#',
            '################',
          ]);
    hall = WOOD_DEEP;
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
    // sand — foyer N + U only
    foyer =
      tier >= 1
        ? rows16('sand-foyer-cramp', [
            '###d###D###d####',
            '#dd..####..dddd#',
            '#d............d#',
            '#......U.......#',
            '#....#....#....#',
            '#......dd......#',
            '#....#....#....#',
            '#d............d#',
            '#dd..####..dddd#',
            '#ddd........ddd#',
            '################',
          ])
        : rows16('sand-foyer-open', [
            '###d###D###d####',
            '#dd..........dd#',
            '#d............d#',
            '#......U.......#',
            '#..............#',
            '#......dd......#',
            '#..............#',
            '#d............d#',
            '#dd..........dd#',
            '#ddd........ddd#',
            '################',
          ]);
    hall = SAND_DEEP;
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
  const dark = floor <= -2;
  const sideRole = sideRoleForDepth(depth);

  // Foyer: quiet threshold (R0–R1) — light creeps + wall torches
  const foyerEnts: EntityDef[] = [
    sign(`${prefix}-foyer-sign`, 12, 8, [
      `${flabel}: ${flavor}.`,
      `${titleTag} — DEEPER STILL AWAITS.`,
      dark ? 'DARK. CARRY A TORCH. U = UP. N = HALL.' : 'U = STAIRS UP. N = HALL.',
    ]),
    wallTorch(`${prefix}-foyer-torch-a`, 2, 2),
    wallTorch(`${prefix}-foyer-torch-b`, 13, 2),
    ...creepsForDepth(
      hostiles.slice(0, 1),
      `${prefix}-foyer`,
      [[4, 8]],
      Math.max(0, depth - 1),
    ),
  ];

  const hallEnts: EntityDef[] = [
    wallTorch(`${prefix}-hall-torch-a`, 2, 3),
    wallTorch(`${prefix}-hall-torch-b`, 13, 3),
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
  ];

  // Side role variety (P0)
  let sideEnts: EntityDef[] = [
    wallTorch(`${prefix}-side-torch`, 2, 2),
    sign(`${prefix}-side-sign`, 3, 8, [
      `SIDE · ${sideRole.toUpperCase()} · ${flabel}.`,
      depth >= 5 ? 'DARKER. MEANER. OPTIONAL.' : 'OPTIONAL. WEST = HALL.',
      dark ? 'TORCHES HELP. YOURS BURN OUT.' : 'WEST BACK TO THE HALL.',
    ]),
  ];
  if (sideRole === 'quiet') {
    sideEnts.push(heart(`${prefix}-side-heart`, 8, 5));
  } else if (sideRole === 'vault') {
    sideEnts.push(chest(`${prefix}-side-chest`, 8, 5));
    sideEnts.push(
      ...creepsForDepth(hostiles.slice(0, 1), `${prefix}-side`, [[11, 7]], depth),
    );
  } else if (sideRole === 'hazard') {
    sideEnts.push(chest(`${prefix}-side-chest`, 11, 3));
    sideEnts.push(
      ...creepsForDepth(hostiles.slice(0, 1), `${prefix}-side`, [[5, 5]], depth),
    );
  } else {
    // combat
    sideEnts.push(chest(`${prefix}-side-chest`, 8, 5));
    sideEnts.push(
      ...creepsForDepth(
        hostiles,
        `${prefix}-side`,
        [
          [5, 3],
          [11, 7],
        ],
        depth,
      ),
    );
  }

  const descentEnts: EntityDef[] = [
    wallTorch(`${prefix}-descent-torch`, 2, 2),
    sign(`${prefix}-descent-sign`, 3, 8, [
      `YOU ARE ON ${flabel} — ${flavor}.`,
      dark ? 'S = DEEPER. BRING LIGHT.' : 'S = STAIRS DEEPER.',
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
  ];

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
      dark,
      entities: foyerEnts,
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
      dark,
      entities: hallEnts,
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
      dark,
      sideRole,
      entities: sideEnts,
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
      dark,
      entities: descentEnts,
    },
  };

  return rooms;
}

/** Dunjunz B2–B7 intermediate + B8 throne (boss). */
export function buildDunjunzDeep(): Record<string, RoomDef> {
  const out: Record<string, RoomDef> = {};

  // B2–B7: land-locked dunjunz packs (P1)
  for (let n = 2; n <= 7; n++) {
    const floor = -n;
    const prefix = `b${n}`;
    const up =
      n === 2 ? 'b1_descent' : `b${n - 1}_descent`;
    const down = n === 7 ? 'b8_foyer' : `b${n + 1}_foyer`;
    const band = n <= 3 ? 0 : n <= 5 ? 1 : 2;
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
        hostiles: landPackRecipe('dunjunz', band) as Creep[],
      }),
    );
  }

  // B4 main mid-warden: Floor Captain (soft — stairs free via hall/descent)
  if (out.b4_side) {
    out.b4_side = {
      ...out.b4_side,
      title: 'BADGE CHECK · B4',
      entities: [
        sign('b4-captain-sign', 3, 8, [
          'BADGE CHECK. MIDDLE MANAGEMENT.',
          'THE FLOOR CAPTAIN SCHEDULES THE DM.',
          'WEST: HALL. STAIRS STILL WORK. COWARD.',
        ]),
        {
          kind: 'miniboss',
          id: 'floor-captain',
          x: 8,
          y: 5,
          hp: 40,
          dialog: [
            'FLOOR CAPTAIN: BADGE CHECK.',
            'I MANAGE FLOORS THREE THROUGH FIVE.',
            'THE DUNGEON MASTER IS ON B8. BUSY.',
            'FIGHT ME OR BRIBE THE CHEST. YOUR CALL.',
            'STAIRS? THOSE ARE FOR PEOPLE WITH BADGES.',
            '(THE STAIRS DO NOT CARE ABOUT BADGES.)',
          ],
        },
        chest('b4-captain-chest', 11, 3, 'dungeon'),
      ],
    };
  }
  if (out.b4_foyer) {
    const foyerEnts = out.b4_foyer.entities ?? [];
    out.b4_foyer = {
      ...out.b4_foyer,
      entities: [
        sign('b4-foyer-mid-sign', 12, 8, [
          'B4: BADGE CHECK EAST OF THE HALL.',
          'MIDDLE MANAGEMENT. OPTIONAL-ISH.',
          'N = HALL. U = UP. S DEEPER LATER.',
        ]),
        ...foyerEnts.filter((e) => e.kind !== 'sign'),
      ],
    };
  }

  // B6 optional den: Rules Lawyer (peaceful until hit/chest; talk to forgive)
  if (out.b6_side) {
    out.b6_side = {
      ...out.b6_side,
      title: 'ERRATA DEN · B6',
      entities: [
        sign('b6-lawyer-sign', 3, 8, [
          'ERRATA DEN. SIDE OFFICE.',
          'THE RULES LAWYER FILES COMPLAINTS.',
          'TALK, FIGHT, OR LOOT. STAIRS FREE WEST.',
        ]),
        {
          kind: 'miniboss',
          id: 'rules-lawyer',
          x: 8,
          y: 5,
          hp: 46,
          dialog: [
            'RULES LAWYER: HOLD. SECTION 4A.',
            'DID YOU READ THE BINDER? OF COURSE NOT.',
            'TALK: I MAY GRANT PROCEDURAL CLEMENCY.',
            'HIT ME OR OPEN THE CHEST: WE LITIGATE.',
            'STAIRS REMAIN A SEPARATE STATUTE. GO AROUND.',
          ],
        },
        chest('b6-lawyer-chest', 11, 3, 'dungeon'),
      ],
    };
  }
  if (out.b6_foyer) {
    const foyerEnts = out.b6_foyer.entities ?? [];
    out.b6_foyer = {
      ...out.b6_foyer,
      entities: [
        sign('b6-foyer-mid-sign', 12, 8, [
          'B6: ERRATA DEN EAST OF THE HALL.',
          'OPTIONAL MIDDLE MANAGEMENT.',
          'N = HALL. U = UP. S DEEPER.',
        ]),
        ...foyerEnts.filter((e) => e.kind !== 'sign'),
      ],
    };
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
  // P1: pack-only woodz ecology (no slime/skeleton halls)
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
        hostiles: landPackRecipe('woodz', n - 1) as Creep[],
      }),
    );
  }
  // B2 optional den: Deputy Howl (post-clear deep; stairs free via hall)
  if (out.woodz_b2_side) {
    out.woodz_b2_side = {
      ...out.woodz_b2_side,
      title: 'PACK DEN · B2',
      entities: [
        sign('woodz-howl-sign', 3, 8, [
          'PACK DEN. UNPAID INTERNSHIP.',
          'DEPUTY HOWL REPORTS TO THE WOLF LORD.',
          'WEST: HALL. STAIRS FREE. OPTIONAL FIGHT.',
        ]),
        {
          kind: 'miniboss',
          id: 'deputy-howl',
          x: 8,
          y: 5,
          hp: 32,
          dialog: [
            'DEPUTY HOWL: NAME TAG SAYS "DEPUTY."',
            'I FETCH STICKS FOR THE WOLF LORD.',
            'BENEFITS? EXPERIENCE. AND HOWLING.',
            'FIGHT ME OR SNEAK PAST. HALL IS WEST.',
          ],
        },
        // Atmosphere pack — walkable floor only (post-hazard side layout)
        ...creeps(['wolf', 'wolf'], 'woodz-howl-pack', [
          [5, 5],
          [4, 6],
        ]),
        chest('woodz-howl-chest', 11, 3, 'dungeon'),
      ],
    };
  }
  if (out.woodz_b2_foyer) {
    const foyerEnts = out.woodz_b2_foyer.entities ?? [];
    out.woodz_b2_foyer = {
      ...out.woodz_b2_foyer,
      entities: [
        sign('woodz-b2-foyer-mid-sign', 12, 8, [
          'B2: PACK DEN EAST OF THE HALL.',
          'OPTIONAL. ROOTS GO DEEPER SOUTH.',
        ]),
        ...foyerEnts.filter((e) => e.kind !== 'sign'),
      ],
    };
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
    tiles: rows16('woodz_b3_heart', [
      '################',
      '#gg..........gg#',
      '#g..########..g#',
      '#..............#',
      '#......U.......#',
      '#..............#',
      '#..##......##..#',
      '#..............#',
      '#g............g#',
      '#gg..........gg#',
      '################',
    ]),
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
  // P1: arid fauna only (no slime/skeleton/redshirt bleed)
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
        hostiles: landPackRecipe('dezertz', n - 1) as Creep[],
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
    tiles: rows16('dezertz_b3_vault', [
      '################',
      '#dd..........dd#',
      '#d..########..d#',
      '#..............#',
      '#......U.......#',
      '#....#==#......#',
      '#..............#',
      '#..##......##..#',
      '#dd..........dd#',
      '#ddd........ddd#',
      '################',
    ]),
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
  // B2 optional den: Lease Wight (post-clear deep; stairs free via hall)
  if (out.dezertz_b2_side) {
    out.dezertz_b2_side = {
      ...out.dezertz_b2_side,
      title: 'LEASE OFFICE · B2',
      entities: [
        sign('dezertz-lease-sign', 3, 8, [
          'LEASE OFFICE. SECURITY DEPOSIT.',
          'THE LEASE WIGHT MANAGES THE TOWER.',
          'WEST: HALL. STAIRS FREE. OPTIONAL FIGHT.',
        ]),
        {
          kind: 'miniboss',
          id: 'lease-wight',
          x: 8,
          y: 5,
          hp: 36,
          dialog: [
            'LEASE WIGHT: WHERE IS THE DEPOSIT?',
            'SAND IN THE CARPETS COUNTS AS DAMAGE.',
            'PRIZELLA WAS A MODEL TENANT. YOU ARE NOT.',
            'FIGHT OR LEAVE. HALL WEST. NO HARD GATE.',
          ],
        },
        chest('dezertz-lease-chest', 11, 3, 'dungeon'),
      ],
    };
  }
  if (out.dezertz_b2_foyer) {
    const foyerEnts = out.dezertz_b2_foyer.entities ?? [];
    out.dezertz_b2_foyer = {
      ...out.dezertz_b2_foyer,
      entities: [
        sign('dezertz-b2-foyer-mid-sign', 12, 8, [
          'B2: LEASE OFFICE EAST OF THE HALL.',
          'OPTIONAL. VAULT DEEPER SOUTH.',
        ]),
        ...foyerEnts.filter((e) => e.kind !== 'sign'),
      ],
    };
  }

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
        hostiles: landPackRecipe('sewerz', n - 2) as Creep[],
      }),
    );
  }

  // B2 optional den: Assistant Honk (pre-goose midpoint; stairs free via hall)
  if (out.sewerz_b2_side) {
    out.sewerz_b2_side = {
      ...out.sewerz_b2_side,
      title: 'HONKLET OFFICE · B2',
      entities: [
        sign('sewerz-honk-sign', 3, 8, [
          'HONKLET OFFICE. INTERN DESK.',
          'ASSISTANT HONK. SMALLER BILL. BIG FEELINGS.',
          'WEST: HALL. STAIRS FREE. ROYAL GOOSE IS B4.',
        ]),
        {
          kind: 'miniboss',
          id: 'assistant-honk',
          x: 8,
          y: 5,
          hp: 50,
          dialog: [
            'ASSISTANT HONK: HONK? HONK.',
            'I SHADOW THE ROYAL GOOSE. UNPAID.',
            'TAX SCROLLS? ABOVE MY PAY GRADE. HONK.',
            'FIGHT ME OR WADDLE PAST. PIPES STILL WORK.',
          ],
        },
        chest('sewerz-honk-chest', 11, 3, 'dungeon'),
      ],
    };
  }
  if (out.sewerz_b2_foyer) {
    const foyerEnts = out.sewerz_b2_foyer.entities ?? [];
    out.sewerz_b2_foyer = {
      ...out.sewerz_b2_foyer,
      entities: [
        sign('sewerz-b2-foyer-mid-sign', 12, 8, [
          'B2: HONKLET OFFICE EAST OF THE HALL.',
          'OPTIONAL. GOOSE NESTS AT B4.',
        ]),
        ...foyerEnts.filter((e) => e.kind !== 'sign'),
      ],
    };
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
    tiles: rows16('sewerz_b4_foyer', [
      '########D#######',
      '#..............#',
      '#.####....####.#',
      '#......U.......#',
      '#...#......#...#',
      '#.#..~~~~~~..#.#',
      '#...#......#...#',
      '#.#..........#.#',
      '#.####....####.#',
      '#..............#',
      '################',
    ]),
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
      i === 5 ? '#.....~~~~.....#' : r,
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
