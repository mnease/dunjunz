/**
 * Unit tests against shipped pure RPG modules (v4).
 */
import { describe, expect, it } from 'vitest';
import {
  grantXp,
  levelFromXp,
  xpToAdvanceFrom,
  xpToReachLevel,
} from './progression';
import { applyLootToSave, openChest, mulberry32 } from './loot';
import { attemptPurchase, SHOPS } from './shop';
import {
  cycleSlotEquip,
  grantKey,
  grantMildSword,
  hasKeyEquipped,
  hasWeaponEquipped,
  listInventory,
  migrateEquipment,
  syncDerivedStats,
  useInventoryItem,
} from './inventory';
import { spendAttrPoint, computePlayerDamage } from './attributes';
import { appearanceFromSave, playerTextureKeyFromSave } from './appearance';
import { effectivePrimary } from './rarity';
import { defaultSave, loadSave } from './save';
import { mintItem } from './items';
import { entryFromOpposite, spawnInsideEntryEdge } from './map-spawn';
import {
  discoverMapz,
  formatMapzPanel,
  hasMapz,
  markRoomVisited,
  reconcileMapzFromCollected,
} from './mapz';
import {
  forjeCraft,
  forjeEnhanceWeapon,
  forjeImbueWeapon,
} from './forjing';
import {
  questHint,
  rewardDezertzClear,
  rewardDunjunzClear,
  rewardWoodzClear,
} from './quest';
import { ROOMS } from '../data/world';
import { grantMildSword } from './inventory';

describe('XP formula scaling', () => {
  it('band costs increase with level', () => {
    expect(xpToAdvanceFrom(1)).toBeLessThan(xpToAdvanceFrom(5));
    expect(xpToAdvanceFrom(5)).toBeLessThan(xpToAdvanceFrom(10));
    expect(xpToAdvanceFrom(10)).toBeLessThan(xpToAdvanceFrom(25));
  });

  it('levelFromXp matches cumulative thresholds past 10', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(xpToReachLevel(2))).toBe(2);
    expect(levelFromXp(xpToReachLevel(5))).toBe(5);
    expect(levelFromXp(xpToReachLevel(10) - 1)).toBe(9);
    expect(levelFromXp(xpToReachLevel(10))).toBe(10);
    expect(levelFromXp(xpToReachLevel(20))).toBe(20);
    expect(levelFromXp(xpToReachLevel(50))).toBe(50);
  });

  it('grantXp awards attr points on level up', () => {
    const need = xpToReachLevel(2);
    const r = grantXp({ xp: need - 1, level: 1, attrPoints: 0 }, 1);
    expect(r.level).toBe(2);
    expect(r.leveledUp).toBe(true);
    expect(r.attrPointsGained).toBe(2);
    expect(r.attrPoints).toBe(2);
  });
});

describe('rarity primary stat', () => {
  it('effectivePrimary scales rarity and enhancement', () => {
    expect(effectivePrimary(1, 'common', 0)).toBe(1);
    expect(effectivePrimary(1, 'rare', 1)).toBe(2); // floor(1.5)+1
  });
});

describe('loot multi-type', () => {
  it('openChest test_fixed has coins potion gear treasure labels', () => {
    const drops = openChest('test_fixed', mulberry32(1));
    const kinds = new Set(drops.map((d) => d.kind));
    expect(kinds.has('coins')).toBe(true);
    expect(kinds.has('potion')).toBe(true);
    expect(kinds.has('gear') || kinds.has('treasure')).toBe(true);
  });

  it('applyLootToSave mints bag gear and stacks potions', () => {
    const next = applyLootToSave(defaultSave(), openChest('test_fixed'), () => 0.1);
    expect(next.coins).toBeGreaterThan(0);
    expect(next.stacks.potion ?? 0).toBeGreaterThan(0);
    expect(next.bag.length).toBeGreaterThan(0);
  });
});

describe('shop purchase', () => {
  const potion = SHOPS.tinkerer.stock[0];

  it('successful buy spends coins and grants stack', () => {
    let save = defaultSave();
    save.coins = potion.price + 5;
    const r = attemptPurchase(save, 'tinkerer', potion.id);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.save.coins).toBe(5);
    expect(r.save.stacks.potion).toBe(1);
  });

  it('failed buy leaves coins unchanged', () => {
    let save = defaultSave();
    save.coins = 0;
    const r = attemptPurchase(save, 'tinkerer', potion.id);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.save.coins).toBe(0);
  });
});

describe('weapon key equip', () => {
  it('grantMildSword equips weapon and enables attack flag', () => {
    const s = grantMildSword(defaultSave());
    expect(hasWeaponEquipped(s)).toBe(true);
    expect(s.hasSword).toBe(true);
    expect(s.bag.some((b) => b.templateId === 'mild_sword')).toBe(true);
  });

  it('grantKey equips keyring and sets hasKey', () => {
    const s = grantKey(defaultSave());
    expect(hasKeyEquipped(s)).toBe(true);
    expect(s.hasKey).toBe(true);
  });

  it('unequip weapon disables hasSword', () => {
    let s = grantMildSword(defaultSave());
    const r = cycleSlotEquip(s, 'weapon'); // equip already; cycle once more unequips if only one
    // With one weapon: equip -> unequip on second cycle from equipped
    // First cycle when equipped goes to unequip
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // already equipped, cycle unequips
    expect(r.save.equipped.weapon === null || r.save.equipped.weapon).toBeTruthy();
    // force unequip path
    const u = cycleSlotEquip(grantMildSword(defaultSave()), 'weapon');
    // from equipped mild_sword, one cycle unequips (only one option)
    expect(u.ok).toBe(true);
    if (!u.ok) return;
    expect(u.save.equipped.weapon).toBeNull();
    expect(hasWeaponEquipped(u.save)).toBe(false);
  });
});

describe('attributes', () => {
  it('spendAttrPoint raises VIT and maxHp', () => {
    let save = { ...defaultSave(), attrPoints: 2 };
    const r = spendAttrPoint(save, 'vit');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const synced = syncDerivedStats(r.save);
    expect(synced.attrs.vit).toBe(2);
    expect(synced.maxHp).toBeGreaterThan(defaultSave().maxHp);
  });

  it('computePlayerDamage uses weapon + STR', () => {
    let save = grantMildSword(defaultSave());
    save = { ...save, attrs: { ...save.attrs, str: 5 } };
    save = syncDerivedStats(save);
    expect(computePlayerDamage(save)).toBeGreaterThanOrEqual(2);
  });
});

describe('appearance + key on doll', () => {
  it('texture key includes weapon and key flags', () => {
    let save = grantMildSword(defaultSave());
    save = grantKey(save);
    const key = playerTextureKeyFromSave(save);
    expect(key).toContain('_w_');
    expect(key.endsWith('_k')).toBe(true);
    const bare = playerTextureKeyFromSave(defaultSave());
    expect(bare).toBe('player_none_none_none_n_n');
  });
});

describe('migrate v3', () => {
  it('migrates hasSword hasKey inventory potion', () => {
    const raw = {
      ...defaultSave(),
      version: 3 as const,
      hasSword: true,
      hasKey: true,
      inventory: { potion: 2, leather_armor: 1 },
      equippedArmor: 'leather_armor',
      xp: xpToReachLevel(3),
      level: 3,
      bag: undefined,
    };
    const m = migrateEquipment(raw as never);
    expect(m.version).toBe(5);
    expect(m.stacks.potion).toBe(2);
    expect(m.bag.some((b) => b.templateId === 'mild_sword')).toBe(true);
    expect(m.bag.some((b) => b.templateId === 'dungeon_key')).toBe(true);
    expect(m.bag.some((b) => b.templateId === 'leather_armor')).toBe(true);
    expect(m.attrPoints).toBeGreaterThanOrEqual(4);
  });
});

describe('potion use', () => {
  it('consumes stack and heals', () => {
    const save = {
      ...defaultSave(),
      hp: 2,
      stacks: { potion: 1 },
    };
    const r = useInventoryItem(save, 'potion');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.save.hp).toBeGreaterThan(2);
    expect(r.save.stacks.potion ?? 0).toBe(0);
  });
});

describe('listInventory', () => {
  it('lists stacks and bag', () => {
    let save = defaultSave();
    save.stacks = { potion: 3 };
    save = mintItem(save, 'gold_trinket', 'rare', 1).save;
    const lines = listInventory(save);
    expect(lines.some((l) => l.templateId === 'potion' && l.count === 3)).toBe(
      true,
    );
    expect(lines.some((l) => l.templateId === 'gold_trinket')).toBe(true);
  });
});

describe('door entry spawn placement', () => {
  /** 5x5 room with doors mid-edge */
  const grid = [
    ['wall', 'wall', 'door', 'wall', 'wall'],
    ['wall', 'floor', 'floor', 'floor', 'wall'],
    ['door', 'floor', 'floor', 'floor', 'door'],
    ['wall', 'floor', 'floor', 'floor', 'wall'],
    ['wall', 'wall', 'door', 'wall', 'wall'],
  ];

  it('entryFromOpposite matches leave-dir contract', () => {
    expect(entryFromOpposite('east')).toBe('west');
    expect(entryFromOpposite('west')).toBe('east');
    expect(entryFromOpposite('north')).toBe('south');
    expect(entryFromOpposite('south')).toBe('north');
  });

  it('enter from west (came through left door) spawns on left', () => {
    const s = spawnInsideEntryEdge(grid, 'west');
    expect(s.tx).toBe(1);
    expect(s.ty).toBe(2);
  });

  it('enter from east spawns on right', () => {
    const s = spawnInsideEntryEdge(grid, 'east');
    expect(s.tx).toBe(3);
    expect(s.ty).toBe(2);
  });

  it('enter from north spawns near top', () => {
    const s = spawnInsideEntryEdge(grid, 'north');
    expect(s.ty).toBe(1);
    expect(s.tx).toBe(2);
  });

  it('enter from south spawns near bottom', () => {
    const s = spawnInsideEntryEdge(grid, 'south');
    expect(s.ty).toBe(3);
    expect(s.tx).toBe(2);
  });

  it('off-center west door spawns next to that opening, not room mid', () => {
    // Opening only on left edge at y=1 (not mid y=2)
    const off = [
      ['wall', 'wall', 'wall', 'wall', 'wall'],
      ['door', 'floor', 'floor', 'floor', 'wall'],
      ['wall', 'floor', 'floor', 'floor', 'wall'],
      ['wall', 'floor', 'floor', 'floor', 'wall'],
      ['wall', 'wall', 'wall', 'wall', 'wall'],
    ];
    const s = spawnInsideEntryEdge(off, 'west');
    expect(s.tx).toBe(1);
    expect(s.ty).toBe(1);
  });

  it('grass edge gap (overworld-style) is treated as a door opening', () => {
    const ow = [
      ['wall', 'wall', 'wall', 'wall'],
      ['wall', 'grass', 'grass', 'grass'],
      ['wall', 'grass', 'grass', 'grass'],
      ['wall', 'wall', 'wall', 'wall'],
    ];
    // open east edge at y=1,2
    ow[1][3] = 'grass';
    ow[2][3] = 'grass';
    const s = spawnInsideEntryEdge(ow, 'east');
    expect(s.tx).toBe(2);
    expect([1, 2]).toContain(s.ty);
  });
});

describe('mapz discovery + fog of war', () => {
  it('discoverMapz is idempotent and unlocks land', () => {
    let save = defaultSave();
    expect(hasMapz(save, 'surface')).toBe(true);
    expect(hasMapz(save, 'woodz')).toBe(false);
    save = discoverMapz(save, 'woodz');
    expect(hasMapz(save, 'woodz')).toBe(true);
    const again = discoverMapz(save, 'woodz');
    expect(again.discoveredMapz.filter((l) => l === 'woodz')).toHaveLength(1);
  });

  it('formatMapzPanel denies unknown mapz', () => {
    const save = defaultSave();
    const text = formatMapzPanel(ROOMS, save, 'dezertz');
    expect(text).toContain('NO');
    expect(text).toContain('MAPZ');
  });

  it('formatMapzPanel shows @ for current room when mapz known', () => {
    let save = defaultSave();
    save = discoverMapz(save, 'surface');
    save = markRoomVisited(save, 'overworld');
    save.roomId = 'overworld';
    const text = formatMapzPanel(ROOMS, save, 'surface');
    expect(text).toContain('SURFACE');
    expect(text).toContain('@');
    expect(text).toContain('ROOMS:');
    expect(text).toContain('MEADOW');
  });

  it('reconcileMapzFromCollected recovers scroll pickups', () => {
    let save = defaultSave();
    save.discoveredMapz = [];
    save.collected = ['mapz-surface'];
    save = reconcileMapzFromCollected(save);
    expect(save.discoveredMapz).toContain('surface');
  });
});

describe('forjing craft enhance imbue', () => {
  it('enhance weapon spends mats and +1 enhancement', () => {
    let save = grantMildSword(defaultSave());
    save.coins = 50;
    save.stacks = { ore_iron: 2, ore_spark: 2 };
    const r = forjeEnhanceWeapon(save);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const w = r.save.bag.find((b) => b.uid === r.save.equipped.weapon);
    expect(w?.enhancement).toBe(1);
    expect(r.save.stacks.ore_iron ?? 0).toBe(1);
  });

  it('imbue adds attrBonuses.str', () => {
    let save = grantMildSword(defaultSave());
    save.coins = 50;
    save.stacks = { ore_spark: 3, sand_crystal: 2 };
    const r = forjeImbueWeapon(save, 'str');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const w = r.save.bag.find((b) => b.uid === r.save.equipped.weapon);
    expect(w?.attrBonuses?.str).toBe(1);
    expect(computePlayerDamage(r.save)).toBeGreaterThanOrEqual(
      computePlayerDamage(save),
    );
  });

  it('craft iron blade from recipe', () => {
    let save = defaultSave();
    save.coins = 30;
    save.stacks = { ore_iron: 2, wood_shard: 1 };
    const r = forjeCraft(save, 'craft_iron_blade');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.save.bag.some((b) => b.templateId === 'iron_blade')).toBe(true);
    expect(r.save.equipped.weapon).toBeTruthy();
  });

  it('enhance fails without materials', () => {
    const save = grantMildSword(defaultSave());
    const r = forjeEnhanceWeapon(save);
    expect(r.ok).toBe(false);
  });
});

describe('princess quest land clears', () => {
  it('rewardDunjunzClear mints cleaver and mapz', () => {
    const r = rewardDunjunzClear(defaultSave());
    expect(r.save.landsCleared).toContain('dunjunz');
    expect(r.save.bossDefeated).toBe(true);
    expect(r.save.discoveredMapz).toContain('woodz');
    expect(r.save.discoveredMapz).toContain('dezertz');
    expect(r.save.bag.some((b) => b.templateId === 'dunjun_cleaver')).toBe(
      true,
    );
    expect(r.dialog.some((l) => l.includes('PRIZELLA'))).toBe(true);
  });

  it('rewardDezertzClear sets princessSaved', () => {
    const r = rewardDezertzClear(defaultSave());
    expect(r.save.princessSaved).toBe(true);
    expect(r.save.landsCleared).toContain('dezertz');
  });

  it('questHint advances with landsCleared', () => {
    let save = defaultSave();
    expect(questHint(save)[0]).toContain('QUEST');
    save = rewardDunjunzClear(save).save;
    expect(questHint(save).join(' ')).toMatch(/WOODZ|DEZERTZ/i);
    save = rewardWoodzClear(save).save;
    expect(questHint(save).join(' ')).toMatch(/DEZERTZ/i);
    save = rewardDezertzClear(save).save;
    expect(questHint(save).join(' ')).toMatch(/FORJE|SAVED/i);
  });

  it('defaultSave is v5 with mapz surface seed', () => {
    const s = defaultSave();
    expect(s.version).toBe(5);
    expect(s.discoveredMapz).toContain('surface');
    expect(s.visitedRooms).toEqual([]);
    expect(s.princessSaved).toBe(false);
    expect(s.landsCleared).toEqual([]);
  });

  it('loadSave without storage returns default v5', () => {
    const store: Record<string, string> = {};
    // minimal localStorage shim for node vitest
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
    };
    const loaded = loadSave();
    expect(loaded.version).toBe(5);
    expect(loaded.discoveredMapz).toContain('surface');

    store['dunjunz-save-v1'] = JSON.stringify({
      version: 4,
      roomId: 'overworld',
      hp: 6,
      maxHp: 6,
      hasSword: true,
      hasKey: false,
      bossDefeated: true,
      flags: {},
      killed: [],
      collected: [],
      xp: 0,
      level: 1,
      coins: 10,
      stacks: {},
      bag: [],
      nextItemUid: 1,
      equipped: {
        weapon: null,
        helmet: null,
        breastplate: null,
        greaves: null,
        shoes: null,
        gloves: null,
        amulet: null,
        key: null,
      },
      attrs: { str: 1, dex: 1, vit: 1, int: 1, lck: 1 },
      attrPoints: 0,
      armor: 0,
    });
    const migrated = loadSave();
    expect(migrated.version).toBe(5);
    expect(migrated.landsCleared).toContain('dunjunz');
    expect(migrated.princessSaved).toBe(false);
  });
});
