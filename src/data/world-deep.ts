/**
 * Deep dungeon expansion — 4× floors for each dunjun land.
 *
 * Dunjunz: B1 (authored) + B2…B8 generated (4× the old B1–B2 depth).
 * Woodz / Dezertz: surface + B1–B3 deep wings (4 floors total).
 * Sewerz: B1 authored + B2–B4 to the goose (4 floors).
 */

import type { EntityDef, EntityKind, LandId, RoomDef } from '../types';

const HALL: string[] = [
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
];

const FOYER: string[] = [
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
];

const SIDE: string[] = [
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
];

const DESCENT: string[] = [
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
];

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
  tileset: 'dungeon' | 'wood' | 'sand' | 'sewer';
  hostiles: Creep[];
}): Record<string, RoomDef> {
  const { land, floor, prefix, titleTag, stairsUpTo, stairsDownTo, hostiles } =
    opts;
  const foyer =
    opts.tileset === 'dungeon'
      ? FOYER
      : opts.tileset === 'sewer'
        ? [
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
          ]
        : opts.tileset === 'wood'
          ? [
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

  const hall =
    opts.tileset === 'dungeon'
      ? HALL
      : opts.tileset === 'sewer'
        ? SEWER_PIPE
        : opts.tileset === 'wood'
          ? WOOD_DEEP
          : SAND_DEEP;

  const side =
    opts.tileset === 'dungeon'
      ? SIDE
      : opts.tileset === 'sewer'
        ? [
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
          ]
        : opts.tileset === 'wood'
          ? [
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
            ]
          : [
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
            ];

  const descent =
    opts.tileset === 'dungeon'
      ? DESCENT
      : [
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
        ];

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
          `${flabel}: ${titleTag}. KEEP GOING DOWN.`,
          'U = STAIRS UP. N = HALL.',
          'THE BOTTOM STILL HAS TEETH.',
        ]),
        ...creeps(hostiles, `${prefix}-foyer`, [
          [4, 8],
          [11, 7],
        ]),
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
        ...creeps(hostiles, `${prefix}-hall`, [
          [5, 3],
          [11, 7],
          [8, 5],
          [4, 8],
        ]),
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
        ...creeps(hostiles, `${prefix}-side`, [
          [5, 3],
          [11, 7],
        ]),
        sign(`${prefix}-side-sign`, 3, 8, [
          'SIDE CHAMBER. LOOT + REGRET.',
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
          `STAIRS DOWN → NEXT LEVEL.`,
          `YOU ARE ON ${flabel}.`,
          'SOUTH: HALL.',
        ]),
        ...creeps(hostiles, `${prefix}-descent`, [
          [11, 7],
          [6, 5],
        ]),
      ],
    },
  };

  return rooms;
}

/** Dunjunz B2–B7 intermediate + B8 throne (boss). */
export function buildDunjunzDeep(): Record<string, RoomDef> {
  const out: Record<string, RoomDef> = {};

  // B2–B7 intermediate floors (6 floors × 4 rooms)
  const hostilesByDepth: Creep[][] = [
    ['slime', 'skeleton'], // B2
    ['skeleton', 'slime', 'redshirt'], // B3
    ['skeleton', 'redshirt'], // B4
    ['redshirt', 'skeleton', 'slime'], // B5
    ['redshirt', 'wolf'], // B6 (weird deep fauna)
    ['skeleton', 'redshirt', 'wolf'], // B7
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
    tiles: FOYER,
    entities: [
      sign('b8-foyer-sign', 12, 8, [
        'B8: THE BOTTOM. FINALLY.',
        'NORTH: THRONE OF META.',
        'U = ALL THE WAY BACK UP. COWARD.',
      ]),
      ...creeps(['redshirt', 'skeleton'], 'b8-foyer', [
        [4, 8],
        [11, 7],
        [8, 6],
      ]),
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
    tiles: BOSS_ARENA,
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
