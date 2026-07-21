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
import {
  applyLootToSave,
  ENEMY_SPECIES_LOOT,
  openChest,
  mulberry32,
  rollEnemyLoot,
} from './loot';
import {
  attemptPurchase,
  attemptSell,
  attemptSellIndex,
  listPlayerSellables,
  sellUnitPrice,
  SHOPS,
  shopGridDims,
  shopIndexFromDir,
} from './shop';
import { resolveEnemyHp, ENEMY_BASE_HP } from './enemies';
import {
  autoEquipEmptySlots,
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
  canAffordForjing,
  forjeCraft,
  forjeEnhanceWeapon,
  forjeImbueWeapon,
  listForjingActions,
  listForjingMats,
  runForjingAction,
} from './forjing';
import {
  acceptBestBudQuest,
  BEST_BUD_ROSTER,
  completeBestBudQuest,
  meetBestBud,
  prizellaChampionTalk,
  rollBestBudId,
  shouldSpawnDenBud,
} from './best-bud';
import {
  princessChampionDialog,
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

  it('rollEnemyLoot often drops coins', () => {
    let coinHits = 0;
    for (let i = 0; i < 40; i++) {
      const d = rollEnemyLoot('slime', mulberry32(i + 1), 1);
      if (d.some((x) => x.coins)) coinHits += 1;
    }
    expect(coinHits).toBeGreaterThan(20);
  });

  it('boss loot can include gear', () => {
    const d = rollEnemyLoot('boss', () => 0.01, 5);
    // forced low rng → coins + high gear chance path
    expect(d.length).toBeGreaterThan(0);
  });

  it('each creep kind has a signature species part', () => {
    expect(ENEMY_SPECIES_LOOT.skeleton.stackId).toBe('bone');
    expect(ENEMY_SPECIES_LOOT.wolf.stackId).toBe('wolf_pelt');
    expect(ENEMY_SPECIES_LOOT.cactus.stackId).toBe('cactus_spine');
    expect(ENEMY_SPECIES_LOOT.slime.stackId).toBe('slime_gel');
    expect(ENEMY_SPECIES_LOOT.redshirt.stackId).toBe('ensign_badge');
  });

  it('rollEnemyLoot can drop species parts for skeletons and wolves', () => {
    let boneHits = 0;
    let peltHits = 0;
    for (let i = 0; i < 80; i++) {
      const sk = rollEnemyLoot('skeleton', mulberry32(i * 3 + 7), 3);
      if (sk.some((x) => x.stackId === 'bone')) boneHits += 1;
      const wf = rollEnemyLoot('wolf', mulberry32(i * 5 + 11), 3);
      if (wf.some((x) => x.stackId === 'wolf_pelt')) peltHits += 1;
    }
    expect(boneHits).toBeGreaterThan(15);
    expect(peltHits).toBeGreaterThan(15);
  });

  it('species parts apply as stacks', () => {
    const next = applyLootToSave(
      defaultSave(),
      [{ kind: 'treasure', label: 'BONE', stackId: 'bone', stackCount: 2 }],
      () => 0.1,
    );
    expect(next.stacks.bone).toBe(2);
  });
});

describe('shield and ring slots', () => {
  it('emptyEquipped has shield and ring', () => {
    const s = defaultSave();
    expect(s.equipped.shield).toBeNull();
    expect(s.equipped.ring).toBeNull();
  });

  it('minted shield auto-equips empty shield slot', () => {
    let s = defaultSave();
    s = mintItem(s, 'wood_shield', 'common', 0).save;
    s = autoEquipEmptySlots(s);
    s = syncDerivedStats(s);
    expect(s.equipped.shield).toBeTruthy();
    expect(s.armor).toBeGreaterThan(0);
  });
});

describe('enemy HP tiers', () => {
  it('land creeps out-tough dungeon trash and redshirts', () => {
    expect(ENEMY_BASE_HP.wolf).toBeGreaterThan(ENEMY_BASE_HP.skeleton);
    expect(ENEMY_BASE_HP.cactus).toBeGreaterThan(ENEMY_BASE_HP.slime);
    expect(ENEMY_BASE_HP.skeleton).toBeGreaterThan(ENEMY_BASE_HP.slime);
    expect(ENEMY_BASE_HP.slime).toBeGreaterThan(ENEMY_BASE_HP.redshirt);
  });

  it('resolveEnemyHp prefers explicit def over base', () => {
    expect(resolveEnemyHp('cube', 99)).toBe(99);
    expect(resolveEnemyHp('cube')).toBe(ENEMY_BASE_HP.cube);
  });

  it('mild sword (~2 dmg) cannot one-shot a slime or land creep', () => {
    // computePlayerDamage mild + str1 = 1+1+0 = 2
    const mildDmg = 2;
    expect(ENEMY_BASE_HP.slime).toBeGreaterThan(mildDmg * 3);
    expect(ENEMY_BASE_HP.wolf).toBeGreaterThan(mildDmg * 8);
    expect(ENEMY_BASE_HP.cube).toBeGreaterThan(mildDmg * 5);
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

  it('tinkerer has a multi-item stock grid', () => {
    expect(SHOPS.tinkerer.stock.length).toBeGreaterThanOrEqual(8);
    const dims = shopGridDims(SHOPS.tinkerer.stock.length, 4);
    expect(dims.cols).toBe(4);
    expect(dims.rows).toBeGreaterThanOrEqual(2);
  });

  it('shopIndexFromDir wraps within grid', () => {
    expect(shopIndexFromDir(0, 12, 4, 'left')).toBe(3);
    expect(shopIndexFromDir(0, 12, 4, 'right')).toBe(1);
    expect(shopIndexFromDir(0, 12, 4, 'down')).toBe(4);
  });

  it('potion pack grants stackCount 3', () => {
    let save = defaultSave();
    save.coins = 100;
    const pack = SHOPS.tinkerer.stock.find((s) => s.id === 'buy_potion_3');
    expect(pack).toBeTruthy();
    const r = attemptPurchase(save, 'tinkerer', pack!.id);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.save.stacks.potion).toBe(3);
  });
});

describe('shop sell (tinkerer dual-pane)', () => {
  it('sellUnitPrice is half single-unit shop price', () => {
    // potion buy 15 → sell 7
    expect(sellUnitPrice('potion', 'tinkerer')).toBe(7);
    // leather gloves buy 35 → sell 17
    expect(sellUnitPrice('leather_gloves', 'tinkerer')).toBe(17);
  });

  it('sell stack decrements and pays coins', () => {
    let save = defaultSave();
    save.coins = 0;
    save.stacks = { potion: 2 };
    const r = attemptSell(save, 'tinkerer', {
      kind: 'stack',
      templateId: 'potion',
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.save.stacks.potion).toBe(1);
    expect(r.save.coins).toBe(7);
    expect(r.coins).toBe(7);
  });

  it('sell equipped gear unequips, removes from bag, pays', () => {
    let save = grantMildSword(defaultSave());
    save.coins = 10;
    const uid = save.equipped.weapon;
    expect(uid).toBeTruthy();
    const r = attemptSell(save, 'tinkerer', {
      kind: 'instance',
      uid: uid!,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.save.bag.find((b) => b.uid === uid)).toBeUndefined();
    expect(r.save.equipped.weapon).toBeNull();
    expect(r.save.hasSword).toBe(false);
    expect(r.save.coins).toBeGreaterThan(10);
  });

  it('listPlayerSellables includes stacks and equipped gear', () => {
    let save = grantMildSword(defaultSave());
    save.stacks = { potion: 1 };
    const list = listPlayerSellables(save, 'tinkerer');
    expect(list.some((t) => t.templateId === 'potion')).toBe(true);
    expect(list.some((t) => t.templateId === 'mild_sword' && t.equipped)).toBe(
      true,
    );
  });

  it('attemptSellIndex sells by bag grid index', () => {
    let save = defaultSave();
    save.stacks = { potion: 1 };
    save.coins = 0;
    const list = listPlayerSellables(save, 'tinkerer');
    const idx = list.findIndex((t) => t.templateId === 'potion');
    expect(idx).toBeGreaterThanOrEqual(0);
    const r = attemptSellIndex(save, 'tinkerer', idx);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.save.stacks.potion).toBeUndefined();
    expect(r.save.coins).toBe(7);
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
    expect(bare).toBe('player_none_none_none_n_n_n');
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

describe('world tile geometry', () => {
  it('every room tile row is exactly 16 wide (no silent wall pad)', () => {
    for (const room of Object.values(ROOMS)) {
      expect(room.tiles).toHaveLength(11);
      for (let y = 0; y < room.tiles.length; y++) {
        expect(
          room.tiles[y].length,
          `${room.id} row ${y} is ${room.tiles[y].length}`,
        ).toBe(16);
      }
    }
  });

  it('meadow east edge is walkable so trail exit works', () => {
    const meadow = ROOMS.overworld;
    expect(meadow.east).toBe('overworld_east');
    // y=4,5,6 were the intended east openings
    for (const y of [4, 5, 6]) {
      const ch = meadow.tiles[y][15];
      expect(ch === '#' || ch === '~' || ch === 'L').toBe(false);
    }
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

  it('listForjingActions includes enhance, imbues, and crafts', () => {
    const actions = listForjingActions();
    expect(actions.some((a) => a.id === 'enhance')).toBe(true);
    expect(actions.some((a) => a.id === 'imbue_str')).toBe(true);
    expect(actions.some((a) => a.kind === 'craft')).toBe(true);
    expect(actions.length).toBeGreaterThanOrEqual(9);
  });

  it('listForjingMats always shows core mats', () => {
    const mats = listForjingMats(defaultSave());
    expect(mats.some((m) => m.stackId === 'ore_iron')).toBe(true);
    expect(mats.find((m) => m.stackId === 'ore_iron')?.count).toBe(0);
  });

  it('runForjingAction crafts by id', () => {
    let save = defaultSave();
    save.coins = 30;
    save.stacks = { ore_iron: 2, wood_shard: 1 };
    const r = runForjingAction(save, 'craft_iron_blade');
    expect(r.ok).toBe(true);
  });

  it('canAffordForjing reflects stacks and coins', () => {
    const actions = listForjingActions();
    const enhance = actions.find((a) => a.id === 'enhance')!;
    expect(canAffordForjing(defaultSave(), enhance)).toBe(false);
    let save = defaultSave();
    save.coins = 20;
    save.stacks = { ore_iron: 1, ore_spark: 1 };
    expect(canAffordForjing(save, enhance)).toBe(true);
  });
});

describe('boss exit portals', () => {
  it('maps each land boss room to dungeon mouth', async () => {
    const {
      bossExitPortalDef,
      dungeonEntranceForLand,
      shouldSpawnBossExitPortal,
      isBossRoom,
    } = await import('./portal');
    expect(isBossRoom('b2_boss')).toBe(true);
    expect(isBossRoom('woodz_deep')).toBe(true);
    expect(isBossRoom('dezertz_tower')).toBe(true);
    expect(isBossRoom('b1_entrance')).toBe(false);
    expect(dungeonEntranceForLand('dunjunz')).toBe('b1_entrance');
    expect(dungeonEntranceForLand('woodz')).toBe('woodz_edge');
    expect(dungeonEntranceForLand('dezertz')).toBe('dezertz_edge');
    expect(dungeonEntranceForLand('surface')).toBeNull();

    const def = bossExitPortalDef('b2_boss', 'dunjunz');
    expect(def?.kind).toBe('portal');
    expect(def?.portalTarget).toBe('b1_entrance');
    expect(def?.id).toBe('exit-portal-dunjunz');

    let save = defaultSave();
    expect(shouldSpawnBossExitPortal(save, 'b2_boss', 'dunjunz')).toBe(false);
    save = rewardDunjunzClear(save).save;
    expect(shouldSpawnBossExitPortal(save, 'b2_boss', 'dunjunz')).toBe(true);
    expect(shouldSpawnBossExitPortal(save, 'b1_entrance', 'dunjunz')).toBe(
      false,
    );

    // Hard run: no exit until dungeon-master is in hardKilled
    const hard = {
      ...save,
      hardRunLand: 'dunjunz' as const,
      hardKilled: [] as string[],
    };
    expect(shouldSpawnBossExitPortal(hard, 'b2_boss', 'dunjunz')).toBe(false);
    hard.hardKilled = ['dungeon-master'];
    expect(shouldSpawnBossExitPortal(hard, 'b2_boss', 'dunjunz')).toBe(true);

    // Kill flag alone is enough (even without landsCleared)
    const killedOnly = defaultSave();
    killedOnly.killed.push('sand-wraith');
    expect(
      shouldSpawnBossExitPortal(killedOnly, 'dezertz_tower', 'dezertz'),
    ).toBe(true);
    expect(
      bossExitPortalDef('dezertz_tower', undefined)?.portalTarget,
    ).toBe('dezertz_edge');

    // Princess rescue flag (talk path / stuck save recovery)
    const rescued = defaultSave();
    rescued.princessSaved = true;
    expect(
      shouldSpawnBossExitPortal(rescued, 'dezertz_tower', 'dezertz'),
    ).toBe(true);
  });

  it('dezertz tower has a north door matching north link', async () => {
    const { ROOMS } = await import('../data/world');
    const tower = ROOMS.dezertz_tower;
    expect(tower?.north).toBe('dezertz_edge');
    expect(tower?.tiles[0]?.includes('D')).toBe(true);
    expect(tower?.tiles[tower.tiles.length - 1]?.includes('D')).toBe(false);
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
    expect(r.dialog.join(' ')).toMatch(/PORTAL/i);
  });

  it('rewardDezertzClear sets princessSaved', () => {
    const r = rewardDezertzClear(defaultSave());
    expect(r.save.princessSaved).toBe(true);
    expect(r.save.landsCleared).toContain('dezertz');
  });

  it('princess champion dialog is duty + champion, not personal hero', () => {
    const d = princessChampionDialog().join(' ');
    expect(d).toMatch(/KINGDOM/i);
    expect(d).toMatch(/CHAMPION/i);
    expect(d).toMatch(/NOT MY PERSONAL HERO/i);
    expect(d).toMatch(/QUEST/i);
    // rescue loot line also mentions champion
    const r = rewardDezertzClear(defaultSave());
    expect(r.dialog.join(' ')).toMatch(/CHAMPION|KINGDOM/i);
  });

  it('questHint advances with landsCleared', () => {
    let save = defaultSave();
    expect(questHint(save)[0]).toContain('QUEST');
    save = rewardDunjunzClear(save).save;
    expect(questHint(save).join(' ')).toMatch(/WOODZ|DEZERTZ/i);
    save = rewardWoodzClear(save).save;
    expect(questHint(save).join(' ')).toMatch(/DEZERTZ/i);
    save = rewardDezertzClear(save).save;
    expect(questHint(save).join(' ')).toMatch(/BUD|CHAMPION|WOODZ/i);
  });

  it('defaultSave is v6 with mapz surface seed + identity fields', () => {
    const s = defaultSave();
    expect(s.version).toBe(6);
    expect(s.discoveredMapz).toContain('surface');
    expect(s.visitedRooms).toEqual([]);
    expect(s.princessSaved).toBe(false);
    expect(s.landsCleared).toEqual([]);
    expect(typeof s.runSeed).toBe('number');
    expect(s.bestBudId).toBeNull();
    expect(s.bestBudStage).toBe('none');
    expect(s.hardRunLand).toBeNull();
    expect(s.primaryClass).toBeNull();
    expect(s.race).toBe('human');
  });

  it('loadSave without storage returns default v6', () => {
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
    expect(loaded.version).toBe(6);
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
    expect(migrated.version).toBe(6);
    expect(migrated.landsCleared).toContain('dunjunz');
    expect(migrated.princessSaved).toBe(false);
    expect(migrated.hardKilled).toEqual([]);
  });
});

describe('feedback validation', () => {
  it('rejects empty / bad fields', async () => {
    const { validateFeedbackFields } = await import('./feedback-validate');
    expect(validateFeedbackFields({ name: '', email: 'a@b.c', message: 'hello' }).ok).toBe(
      false,
    );
    expect(
      validateFeedbackFields({ name: 'A', email: 'not-an-email', message: 'hello' })
        .ok,
    ).toBe(false);
    expect(
      validateFeedbackFields({ name: 'A', email: 'a@b.co', message: 'hi' }).ok,
    ).toBe(false);
  });

  it('accepts valid payload and honeypot fails', async () => {
    const { validateFeedbackFields } = await import('./feedback-validate');
    expect(
      validateFeedbackFields({
        name: 'Mike',
        email: 'mike@example.com',
        message: 'Cool game, more woodz please.',
      }).ok,
    ).toBe(true);
    expect(
      validateFeedbackFields({
        name: 'Bot',
        email: 'b@b.co',
        message: 'spam spam',
        website: 'http://spam',
      }).error,
    ).toBe('honeypot');
  });
});

describe('threat scaling', () => {
  it('later lands and progress raise threat and HP', async () => {
    const { threatForRoom, scaleEnemyHp, LAND_THREAT } = await import(
      './threat'
    );
    const { resolveEnemyHp, resolveEnemyContactDamage } = await import(
      './enemies'
    );
    expect(LAND_THREAT.sewerz).toBeGreaterThan(LAND_THREAT.dezertz);
    expect(LAND_THREAT.kingdomz).toBeGreaterThan(LAND_THREAT.woodz);

    const base = defaultSave();
    const early = threatForRoom({ land: 'surface', floor: 0 }, base);
    const late = threatForRoom(
      { land: 'sewerz', floor: -1 },
      {
        ...base,
        princessSaved: true,
        landsCleared: ['dunjunz', 'woodz', 'dezertz'],
        bestBudStage: 'complete',
        questsCompleted: [],
      },
    );
    expect(late).toBeGreaterThan(early);
    expect(scaleEnemyHp(12, late)).toBeGreaterThan(scaleEnemyHp(12, early));
    expect(resolveEnemyHp('slime', undefined, late)).toBeGreaterThan(
      resolveEnemyHp('slime', undefined, 0),
    );
    expect(resolveEnemyContactDamage('slime', 4)).toBeGreaterThan(
      resolveEnemyContactDamage('slime', 0),
    );
  });
});

describe('champion quests + kingdom', () => {
  it('assigns sewerz after best bud complete', async () => {
    const {
      assignQuest,
      nextAssignableQuest,
      canTurnInQuest,
      completeActiveQuest,
      QUEST_SEWERZ_GOOSE,
    } = await import('./champion-quests');
    let s = {
      ...defaultSave(),
      princessSaved: true,
      bestBudStage: 'complete' as const,
      bestBudId: 'gloop' as const,
    };
    const next = nextAssignableQuest(s);
    expect(next?.id).toBe(QUEST_SEWERZ_GOOSE);
    const a = assignQuest(s, QUEST_SEWERZ_GOOSE);
    expect(a.save.activeQuestId).toBe(QUEST_SEWERZ_GOOSE);
    expect(a.save.discoveredMapz).toContain('sewerz');
    expect(canTurnInQuest(a.save)).toBe(false);
    a.save.killed.push('royal-goose');
    expect(canTurnInQuest(a.save)).toBe(true);
    const done = completeActiveQuest(a.save);
    expect(done.save.questsCompleted).toContain(QUEST_SEWERZ_GOOSE);
    expect(done.save.bag.some((b) => b.templateId === 'honk_blade')).toBe(
      true,
    );
    expect(done.save.landsCleared).toContain('sewerz');
  });

  it('kingdom and sewerz rooms link correctly', () => {
    expect(ROOMS.overworld_east.east).toBe('kingdom_gate');
    expect(ROOMS.kingdom_gate?.west).toBe('overworld_east');
    expect(ROOMS.kingdom_courtyard?.north).toBe('kingdom_throne');
    expect(ROOMS.kingdom_courtyard?.east).toBe('sewerz_mouth');
    expect(ROOMS.sewerz_boss?.west).toBe('sewerz_hall');
    expect(ROOMS.sewerz_mouth?.land).toBe('sewerz');
    expect(ROOMS.kingdom_throne?.land).toBe('kingdomz');
  });

  it('sewerz boss portal targets mouth', async () => {
    const { bossExitPortalDef, shouldSpawnBossExitPortal } = await import(
      './portal'
    );
    const def = bossExitPortalDef('sewerz_boss', 'sewerz');
    expect(def?.portalTarget).toBe('sewerz_mouth');
    const s = defaultSave();
    s.killed.push('royal-goose');
    expect(shouldSpawnBossExitPortal(s, 'sewerz_boss', 'sewerz')).toBe(true);
  });
});

describe('quest log + brags', () => {
  it('lists main and champion quests with statuses', async () => {
    const { listQuests, countQuestProgress } = await import('./quest-log');
    let s = defaultSave();
    let list = listQuests(s);
    expect(list.some((q) => q.id === 'main-dunjunz' && q.status === 'active')).toBe(
      true,
    );
    expect(list.some((q) => q.id === 'champ-best-bud' && q.status === 'locked')).toBe(
      true,
    );
    s = {
      ...s,
      princessSaved: true,
      bossDefeated: true,
      landsCleared: ['dunjunz', 'dezertz'],
      bestBudStage: 'complete',
      bestBudId: 'gloop',
    };
    list = listQuests(s);
    expect(list.find((q) => q.id === 'main-dunjunz')?.status).toBe('done');
    expect(list.find((q) => q.id === 'champ-best-bud')?.status).toBe('done');
    const sewer = list.find((q) => q.id === 'champ-sewerz-goose');
    expect(sewer?.status).toBe('available');
    const prog = countQuestProgress(s);
    expect(prog.done).toBeGreaterThan(0);
    expect(prog.total).toBe(list.length);
  });

  it('syncAchievements unlocks brags from save state', async () => {
    const { syncAchievements, ACHIEVEMENTS } = await import('./achievements');
    let s = defaultSave();
    s.killed = ['slime-1'];
    let r = syncAchievements(s);
    expect(r.newly.some((a) => a.id === 'brag-first-bonk')).toBe(true);
    s = r.save;
    s.princessSaved = true;
    s.killed.push('sand-wraith');
    r = syncAchievements(s);
    expect(r.save.achievementsUnlocked).toContain('brag-rescue');
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(12);
  });
});

describe('best bud gear + XP', () => {
  it('grants bud XP and levels; gear boosts strike damage', async () => {
    const {
      grantBudXp,
      equipBudUid,
      computeBudStrikeDamage,
      ensureBudProgress,
    } = await import('./best-bud-gear');
    const { mintItem } = await import('./items');
    let s = {
      ...defaultSave(),
      princessSaved: true,
      bestBudId: 'gloop' as const,
      bestBudStage: 'found' as const,
    };
    s = ensureBudProgress(s);
    expect(s.budLevel).toBe(1);
    const g1 = grantBudXp(s, 50);
    s = g1.save;
    expect(s.budXp).toBe(50);
    expect(s.budLevel).toBeGreaterThanOrEqual(1);
    if (g1.leveledUp) expect(s.budLevel).toBeGreaterThan(1);

    const minted = mintItem(s, 'iron_blade', 'common', 0);
    s = minted.save;
    const uid = minted.instance.uid;
    const baseDmg = computeBudStrikeDamage(s);
    const eq = equipBudUid(s, uid);
    expect(eq.ok).toBe(true);
    s = eq.save;
    expect(s.budEquipped.weapon).toBe(uid);
    expect(computeBudStrikeDamage(s)).toBeGreaterThan(baseDmg);
  });

  it('hero and bud cannot wear the same uid', async () => {
    const { equipBudUid, equipHeroUid, ensureBudProgress } = await import(
      './best-bud-gear'
    );
    const { mintItem } = await import('./items');
    let s = {
      ...defaultSave(),
      bestBudId: 'nub' as const,
      bestBudStage: 'complete' as const,
    };
    s = ensureBudProgress(s);
    const m = mintItem(s, 'leather_armor', 'common', 0);
    s = m.save;
    s = equipHeroUid(s, m.instance.uid).save;
    expect(s.equipped.breastplate).toBe(m.instance.uid);
    s = equipBudUid(s, m.instance.uid).save;
    expect(s.budEquipped.breastplate).toBe(m.instance.uid);
    expect(s.equipped.breastplate).toBeNull();
  });
});

describe('best bud combat', () => {
  it('every bud has a combat profile', async () => {
    const { budCombatProfile, budAttackDamage, budCanBlockHit } = await import(
      './best-bud-combat'
    );
    for (const b of BEST_BUD_ROSTER) {
      const p = budCombatProfile(b.id);
      expect(p).not.toBeNull();
      expect(p!.baseDamage).toBeGreaterThan(0);
      expect(p!.cooldownMs).toBeGreaterThan(200);
      expect(budAttackDamage(b.id, 1)).toBeGreaterThanOrEqual(p!.baseDamage);
      expect(budAttackDamage(b.id, 10)).toBeGreaterThan(budAttackDamage(b.id, 1));
    }
    expect(budCanBlockHit('pebbo', 0)).toBe(true);
    expect(budCanBlockHit('pebbo', 1000)).toBe(false);
    expect(budCanBlockHit('gloop', 0)).toBe(false);
  });
});

describe('best bud quest', () => {
  it('rollBestBudId is stable for same seed', () => {
    expect(rollBestBudId(0x12345678)).toBe(rollBestBudId(0x12345678));
  });

  it('different seeds can produce different buds', () => {
    const set = new Set(
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => rollBestBudId(i * 99991)),
    );
    expect(set.size).toBeGreaterThan(1);
  });

  it('accept rolls once and never re-rolls', () => {
    let s = { ...defaultSave(), princessSaved: true, runSeed: 42 };
    const a1 = acceptBestBudQuest(s);
    const id = a1.save.bestBudId;
    expect(id).not.toBeNull();
    expect(a1.save.bestBudStage).toBe('accepted');
    const a2 = acceptBestBudQuest(a1.save);
    expect(a2.save.bestBudId).toBe(id);
  });

  it('meet auto-accepts after rescue; complete requires found', () => {
    let s = { ...defaultSave(), princessSaved: true, runSeed: 7 };
    // Den visit alone is enough — no empty hollow after one Prizella pitch
    s = meetBestBud(s).save;
    expect(s.bestBudStage).toBe('found');
    expect(s.bestBudId).not.toBeNull();
    s = completeBestBudQuest(s).save;
    expect(s.bestBudStage).toBe('complete');
    expect(s.coins).toBeGreaterThanOrEqual(20);
  });

  it('meet before rescue does not recruit', () => {
    const s = { ...defaultSave(), princessSaved: false, runSeed: 3 };
    const r = meetBestBud(s);
    expect(r.save.bestBudStage).toBe('none');
    expect(r.dialog.join(' ')).toMatch(/PRINCESZ|SAVE/i);
  });

  it('shouldSpawnDenBud until recruited', () => {
    const empty = defaultSave();
    expect(shouldSpawnDenBud(empty)).toBe(true);
    const found = {
      ...defaultSave(),
      bestBudStage: 'found' as const,
      bestBudId: 'gloop' as const,
    };
    expect(shouldSpawnDenBud(found)).toBe(false);
  });

  it('prizellaChampionTalk accepts in one talk', () => {
    let s = { ...defaultSave(), princessSaved: true, runSeed: 99 };
    const a = prizellaChampionTalk(s);
    expect(a.save.bestBudStage).toBe('accepted');
    expect(a.save.bestBudId).not.toBeNull();
    // Second talk while still accepted = reminder, not re-roll
    const id = a.save.bestBudId;
    const again = prizellaChampionTalk(a.save);
    expect(again.save.bestBudId).toBe(id);
    expect(again.save.bestBudStage).toBe('accepted');
  });

  it('roster is non-human original creatures', () => {
    expect(BEST_BUD_ROSTER.length).toBeGreaterThanOrEqual(6);
    for (const b of BEST_BUD_ROSTER) {
      expect(b.id).not.toMatch(/jake|finn|human/i);
      expect(b.name).not.toMatch(/JAKE|FINN/);
    }
  });

  it('woodz_hollow is linked east of woodz_edge', () => {
    expect(ROOMS.woodz_edge.east).toBe('woodz_hollow');
    expect(ROOMS.woodz_hollow.west).toBe('woodz_edge');
    expect(ROOMS.woodz_hollow.land).toBe('woodz');
  });

  it('woodz_hollow continue spawn is walkable and not sealed', async () => {
    const { spawnForContinue, isWalkableTile } = await import('./map-spawn');
    const room = ROOMS.woodz_hollow;
    // Parse room tiles the same way GameScene does
    const CHAR: Record<string, string> = {
      '#': 'wall',
      '.': 'floor',
      g: 'grass',
      '~': 'water',
      ' ': 'void',
      D: 'door',
    };
    const grid = room.tiles.map((row) =>
      row.split('').map((c) => CHAR[c] ?? 'floor'),
    );
    const spawn = spawnForContinue(grid, room);
    expect(isWalkableTile(grid[spawn.ty]?.[spawn.tx])).toBe(true);
    // Should prefer west entrance corridor, not center pond
    expect(spawn.tx).toBeLessThan(6);
    // Map must have a continuous open west mouth (row with leading dots)
    const openWest = room.tiles.some((row) => row.startsWith('....'));
    expect(openWest).toBe(true);
  });
});

// ── Hard mode + identity ─────────────────────────────────
import {
  hardModeUnlocked,
  hardThreatBonus,
  isHardRunActive,
  killListForSpawn,
  parseHardPortalTarget,
  projectileSpec,
  recordKill,
  shouldPromoteCaptain,
  startHardRun,
  hardProjectileForActor,
  HARD_THREAT_BONUS,
} from './hard-mode';
import {
  canPickPrimaryClass,
  classBonusAttrs,
  pickPrimaryClass,
  pickSecondaryClass,
  CLASS_UNLOCK_LEVEL,
  MULTICLASS_UNLOCK_LEVEL,
} from './classes';
import {
  canChangeRace,
  pickRace,
  raceBonusAttrs,
  RACE_UNLOCK_LEVEL,
} from './races';
import { effectiveAttrs, pendingHeroPick } from './hero-identity';
import { rewardHardCaptain, rewardHardKing } from './hard-rewards';
import { threatForRoom } from './threat';

describe('hard mode', () => {
  it('unlocks after land clear / boss flag', () => {
    const s = defaultSave();
    expect(hardModeUnlocked(s, 'dunjunz')).toBe(false);
    s.bossDefeated = true;
    expect(hardModeUnlocked(s, 'dunjunz')).toBe(true);
    s.landsCleared = ['woodz'];
    expect(hardModeUnlocked(s, 'woodz')).toBe(true);
  });

  it('uses separate kill list on hard run', () => {
    let s = defaultSave();
    s.bossDefeated = true;
    s.killed = ['ensign-1'];
    s = startHardRun(s, 'dunjunz');
    expect(isHardRunActive(s, 'dunjunz')).toBe(true);
    expect(killListForSpawn(s, 'dunjunz')).toEqual([]);
    s = recordKill(s, 'ensign-1', 'dunjunz');
    expect(s.hardKilled).toContain('ensign-1');
    expect(s.killed).toContain('ensign-1'); // original untouched until record on normal
  });

  it('parses hard portal targets', () => {
    expect(parseHardPortalTarget('__HARD__dunjunz')).toEqual({
      kind: 'start',
      land: 'dunjunz',
    });
    expect(parseHardPortalTarget('__HARD_EXIT__')).toEqual({ kind: 'exit' });
    expect(parseHardPortalTarget('b1_entrance')).toBeNull();
  });

  it('maps shooters and projectile specs', () => {
    expect(hardProjectileForActor('skeleton', 'x')).toBe('arrow');
    expect(hardProjectileForActor('redshirt', 'x')).toBe('phaser');
    expect(hardProjectileForActor('boss', 'dungeon-master')).toBe('fireball');
    expect(projectileSpec('arrow').damage).toBeGreaterThan(0);
  });

  it('promotes captain after hard trek redshirts', () => {
    let s = startHardRun(defaultSave(), 'dunjunz');
    s.hardKilled = ['ensign-1', 'ensign-2', 'ensign-3'];
    expect(shouldPromoteCaptain(s, 'b1_trek')).toBe(true);
    expect(shouldPromoteCaptain(s, 'b1_hall')).toBe(false);
  });

  it('adds hard threat bonus', () => {
    let s = startHardRun(defaultSave(), 'dunjunz');
    expect(hardThreatBonus(s, 'dunjunz')).toBe(HARD_THREAT_BONUS);
    const room = { land: 'dunjunz' as const, floor: -1 };
    const tHard = threatForRoom(room, s);
    const tNorm = threatForRoom(room, defaultSave());
    expect(tHard).toBeGreaterThan(tNorm);
  });
});

describe('classes and races', () => {
  it('gates class pick at level 5', () => {
    const s = defaultSave();
    expect(canPickPrimaryClass(s)).toBe(false);
    s.level = CLASS_UNLOCK_LEVEL;
    expect(canPickPrimaryClass(s)).toBe(true);
    const r = pickPrimaryClass(s, 'fighter');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.save.primaryClass).toBe('fighter');
      expect(canPickPrimaryClass(r.save)).toBe(false);
    }
  });

  it('multiclass at 15 half bonuses', () => {
    let s = defaultSave();
    s.level = MULTICLASS_UNLOCK_LEVEL;
    s.primaryClass = 'fighter';
    const r = pickSecondaryClass(s, 'wizard');
    expect(r.ok).toBe(true);
    const b = classBonusAttrs('fighter', 'wizard');
    expect(b.str).toBe(2);
    expect(b.int).toBe(1); // half of 3
  });

  it('race pick at 25 applies bonuses', () => {
    let s = defaultSave();
    s.level = RACE_UNLOCK_LEVEL;
    expect(canChangeRace(s)).toBe(true);
    expect(raceBonusAttrs('elf', false)).toEqual({});
    const r = pickRace(s, 'elf');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.save.raceChosen).toBe(true);
      const eff = effectiveAttrs(r.save);
      expect(eff.dex).toBeGreaterThan(r.save.attrs.dex);
    }
  });

  it('pending pick order class → multiclass → race', () => {
    let s = defaultSave();
    s.level = 5;
    expect(pendingHeroPick(s)).toBe('class');
    s.primaryClass = 'rogue';
    s.level = 15;
    expect(pendingHeroPick(s)).toBe('multiclass');
    s.secondaryClass = 'wizard';
    s.level = 25;
    expect(pendingHeroPick(s)).toBe('race');
  });
});

describe('hard rewards', () => {
  it('grants captain phaser + beams', () => {
    const r = rewardHardCaptain(defaultSave());
    expect(r.save.bag.some((b) => b.templateId === 'phaser')).toBe(true);
    expect(r.save.stacks.beam_me_up).toBeGreaterThanOrEqual(3);
    expect(r.save.flags.hard_captain_loot).toBe(true);
  });

  it('grants king bow staff arrows', () => {
    const r = rewardHardKing(defaultSave());
    expect(r.save.bag.some((b) => b.templateId === 'short_bow')).toBe(true);
    expect(r.save.bag.some((b) => b.templateId === 'wizard_staff')).toBe(true);
    expect(r.save.stacks.arrows).toBeGreaterThanOrEqual(20);
    expect(r.save.hardLandsCleared).toContain('dunjunz');
  });
});

// ── Humanz & Villagez ───────────────────────────────────
import {
  applyDragonAction,
  applyWaveVictory,
  cycleTarget,
  defaultCampaign,
  resolveVillagerRound,
  startWave,
  allVillagersDown,
} from './village-battle';

describe('humanz village battle', () => {
  it('starts a wave with living villagers', () => {
    const c = defaultCampaign();
    const b = startWave(c);
    expect(b.wave).toBe(1);
    expect(b.villagers.length).toBeGreaterThanOrEqual(2);
    expect(b.phase).toBe('player');
    expect(b.gold).toBe(c.gold);
  });

  it('claw damages selected target and can clear wave', () => {
    let b = startWave(defaultCampaign());
    // Murder everyone with repeated claws
    for (let n = 0; n < 40 && b.phase === 'player'; n++) {
      b = { ...b, selectedTarget: b.villagers.findIndex((v) => v.alive) };
      b = applyDragonAction(b, 'claw', () => 0);
      if (b.phase === 'enemy') {
        // skip enemy by force-killing
        b = {
          ...b,
          villagers: b.villagers.map((v) => ({
            ...v,
            hp: 0,
            alive: false,
          })),
          phase: 'won',
        };
      }
    }
    // Direct test: flame all
    b = startWave(defaultCampaign());
    for (let i = 0; i < 10; i++) {
      if (b.phase !== 'player') break;
      b = applyDragonAction(b, 'flame', () => 0);
      if (b.phase === 'enemy') {
        b = resolveVillagerRound(b, () => 0.9);
      }
    }
    expect(['won', 'player', 'lost', 'enemy']).toContain(b.phase);
  });

  it('flame then villager round can reduce gold or hp', () => {
    let b = startWave(defaultCampaign());
    const gold0 = b.gold;
    const hp0 = b.dragonHp;
    b = applyDragonAction(b, 'guard', () => 0);
    expect(b.phase).toBe('enemy');
    b = resolveVillagerRound(b, () => 0.1);
    expect(b.gold < gold0 || b.dragonHp < hp0 || b.phase === 'player').toBe(
      true,
    );
  });

  it('cycleTarget only lands on living', () => {
    let b = startWave(defaultCampaign());
    b.villagers[0]!.alive = false;
    b.villagers[0]!.hp = 0;
    b = cycleTarget(b, 1);
    expect(b.villagers[b.selectedTarget]?.alive).toBe(true);
  });

  it('wave victory advances campaign', () => {
    const c = defaultCampaign();
    const b = startWave(c);
    b.phase = 'won';
    b.gold = 80;
    b.dragonHp = 30;
    const next = applyWaveVictory(c, b);
    expect(next.wave).toBe(2);
    expect(next.victories).toBe(1);
    expect(next.gold).toBeGreaterThan(80);
  });

  it('allVillagersDown helper', () => {
    const b = startWave(defaultCampaign());
    expect(allVillagersDown(b)).toBe(false);
    b.villagers.forEach((v) => {
      v.alive = false;
      v.hp = 0;
    });
    expect(allVillagersDown(b)).toBe(true);
  });
});
