/**
 * Unit tests against shipped pure RPG modules (progression, loot, shop).
 * No re-implementation of formulas — imports production entry points only.
 */
import { describe, expect, it } from 'vitest';
import {
  ENEMY_XP,
  XP_TO_REACH_LEVEL,
  grantXp,
  levelFromXp,
  xpToNext,
} from './progression';
import {
  applyLootDrops,
  applyLootToSave,
  lootSummary,
  mulberry32,
  openChest,
} from './loot';
import { attemptFeaturedPurchase, attemptPurchase, SHOPS } from './shop';
import {
  computeArmor,
  cycleAmuletEquip,
  cycleArmorEquip,
  equipItem,
  listInventory,
  unequipSlot,
  useInventoryItem,
} from './inventory';
import { defaultSave } from './save';

describe('progression (XP / levels)', () => {
  it('grantXp crossing threshold raises level using shipped XP_TO_REACH_LEVEL', () => {
    // Level 2 requires XP_TO_REACH_LEVEL[2]
    const needFor2 = XP_TO_REACH_LEVEL[2];
    expect(needFor2).toBeGreaterThan(0);

    const before = { xp: needFor2 - 1, level: levelFromXp(needFor2 - 1) };
    expect(before.level).toBe(1);

    const after = grantXp(before, 1);
    expect(after.xp).toBe(needFor2);
    expect(after.level).toBe(levelFromXp(needFor2));
    expect(after.level).toBe(2);
    expect(after.leveledUp).toBe(true);
    expect(after.levelsGained).toBe(1);
    expect(after.prevLevel).toBe(1);
  });

  it('enemy XP rewards are positive for known kinds used in-game', () => {
    expect(ENEMY_XP.slime).toBeGreaterThan(0);
    expect(ENEMY_XP.boss).toBeGreaterThan(ENEMY_XP.slime);
    const r = grantXp({ xp: 0, level: 1 }, ENEMY_XP.slime);
    expect(r.xp).toBe(ENEMY_XP.slime);
  });

  it('xpToNext is zero at max level band', () => {
    const maxThreshold = XP_TO_REACH_LEVEL[XP_TO_REACH_LEVEL.length - 1];
    expect(xpToNext(maxThreshold)).toBe(0);
  });
});

describe('loot (multi-type chests)', () => {
  it('openChest(test_fixed) grants coins, potion, armor, and treasure', () => {
    const drops = openChest('test_fixed', mulberry32(1));
    const kinds = new Set(drops.map((d) => d.kind));
    expect(kinds.has('coins')).toBe(true);
    expect(kinds.has('potion')).toBe(true);
    expect(kinds.has('armor')).toBe(true);
    expect(kinds.has('treasure')).toBe(true);

    const state = applyLootDrops(
      { coins: 0, inventory: {}, armor: 0, hp: 4, maxHp: 6 },
      drops,
    );
    expect(state.coins).toBeGreaterThan(0);
    expect(state.inventory.potion).toBeGreaterThan(0);
    expect(state.inventory.leather_armor).toBeGreaterThan(0);
    expect(
      (state.inventory.gold_trinket ?? 0) + (state.inventory.shiny_bauble ?? 0),
    ).toBeGreaterThan(0);
  });

  it('applyLootToSave auto-equips gear and sets DEF via shipped helper', () => {
    const save = defaultSave();
    const drops = openChest('boss', () => 0.5);
    const next = applyLootToSave(save, drops);
    expect(next.coins).toBeGreaterThan(save.coins);
    expect(Object.keys(next.inventory).length).toBeGreaterThan(0);
    expect(next.equippedArmor).toBeTruthy();
    expect(next.armor).toBe(computeArmor(next));
    expect(next.armor).toBeGreaterThan(0);
    const summary = lootSummary(drops);
    expect(summary.length).toBe(drops.length);
  });
});

describe('shop (merchant purchase)', () => {
  const tinkerer = SHOPS.tinkerer;
  const potion = tinkerer.stock[0];

  it('successful buy decrements coins and grants the item', () => {
    const start = {
      coins: potion.price + 5,
      inventory: {} as Record<string, number>,
      armor: 0,
      hp: 4,
      maxHp: 6,
    };
    const result = attemptPurchase(start, 'tinkerer', potion.id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.coins).toBe(start.coins - potion.price);
    if (potion.itemId) {
      expect(result.state.inventory[potion.itemId]).toBe(1);
    }
  });

  it('failed buy leaves coins and inventory unchanged', () => {
    const start = {
      coins: Math.max(0, potion.price - 1),
      inventory: { potion: 2 },
      armor: 1,
      hp: 3,
      maxHp: 6,
    };
    const result = attemptPurchase(start, 'tinkerer', potion.id);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('insufficient_funds');
    expect(result.state.coins).toBe(start.coins);
    expect(result.state.inventory).toEqual(start.inventory);
    expect(result.state.armor).toBe(start.armor);
  });

  it('featured purchase uses first stock item', () => {
    const rich = {
      coins: 999,
      inventory: {},
      armor: 0,
      hp: 6,
      maxHp: 6,
    };
    const result = attemptFeaturedPurchase(rich, 'tinkerer');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.item.id).toBe(potion.id);
    expect(result.state.coins).toBe(999 - potion.price);
  });
});

describe('save defaults include RPG fields', () => {
  it('defaultSave exposes xp, level, coins, inventory, equip slots', () => {
    const s = defaultSave();
    expect(s.version).toBe(3);
    expect(s.xp).toBe(0);
    expect(s.level).toBe(1);
    expect(s.coins).toBe(0);
    expect(s.inventory).toEqual({});
    expect(s.armor).toBe(0);
    expect(s.equippedArmor).toBeNull();
    expect(s.equippedAmulet).toBeNull();
  });
});

describe('inventory panel helpers', () => {
  it('listInventory only includes positive counts', () => {
    const save = {
      ...defaultSave(),
      inventory: { potion: 2, gold_trinket: 0, shiny_bauble: 1 },
    };
    const lines = listInventory(save);
    expect(lines.map((l) => l.id)).toEqual(['potion', 'shiny_bauble']);
    expect(lines[0].count).toBe(2);
  });

  it('useInventoryItem consumes a potion and heals via shipped helper', () => {
    const save = {
      ...defaultSave(),
      hp: 2,
      maxHp: 6,
      inventory: { potion: 1 },
    };
    const result = useInventoryItem(save, 'potion');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.save.hp).toBeGreaterThan(save.hp);
    expect(result.save.inventory.potion ?? 0).toBe(0);
  });

  it('useInventoryItem fails when bag empty without mutating counts', () => {
    const save = { ...defaultSave(), hp: 2, inventory: {} };
    const result = useInventoryItem(save, 'potion');
    expect(result.ok).toBe(false);
    expect(save.inventory).toEqual({});
  });
});

describe('equip armor and amulets', () => {
  it('equipItem sets armor slot and DEF from catalog', () => {
    const save = {
      ...defaultSave(),
      inventory: { leather_armor: 1 },
    };
    const result = equipItem(save, 'leather_armor');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.save.equippedArmor).toBe('leather_armor');
    expect(result.save.armor).toBe(1);
    expect(computeArmor(result.save)).toBe(1);
  });

  it('unequip clears DEF', () => {
    let save = {
      ...defaultSave(),
      inventory: { leather_armor: 1 },
    };
    const eq = equipItem(save, 'leather_armor');
    expect(eq.ok).toBe(true);
    if (!eq.ok) return;
    const uq = unequipSlot(eq.save, 'armor');
    expect(uq.ok).toBe(true);
    if (!uq.ok) return;
    expect(uq.save.equippedArmor).toBeNull();
    expect(uq.save.armor).toBe(0);
  });

  it('amulet gold_trinket adds DEF when equipped', () => {
    const save = {
      ...defaultSave(),
      inventory: { gold_trinket: 1, leather_armor: 1 },
    };
    let r = equipItem(save, 'leather_armor');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    r = equipItem(r.save, 'gold_trinket');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.save.armor).toBe(2); // 1 armor + 1 amulet
  });

  it('cycleArmorEquip walks pieces then unequips', () => {
    const save = {
      ...defaultSave(),
      inventory: { leather_armor: 1, reinforced_leather: 1 },
    };
    let r = cycleArmorEquip(save);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.save.equippedArmor).toBe('leather_armor');
    r = cycleArmorEquip(r.save);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.save.equippedArmor).toBe('reinforced_leather');
    r = cycleArmorEquip(r.save);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.save.equippedArmor).toBeNull();
  });

  it('shiny_bauble amulet boosts potion heal', () => {
    let save = {
      ...defaultSave(),
      hp: 1,
      maxHp: 20,
      inventory: { potion: 1, shiny_bauble: 1 },
    };
    const eq = equipItem(save, 'shiny_bauble');
    expect(eq.ok).toBe(true);
    if (!eq.ok) return;
    const used = useInventoryItem(eq.save, 'potion');
    expect(used.ok).toBe(true);
    if (!used.ok) return;
    // base 4 + bauble 2 = 6
    expect(used.save.hp).toBe(1 + 6);
  });

  it('cycleAmuletEquip works on bag amulets', () => {
    const save = {
      ...defaultSave(),
      inventory: { gold_trinket: 1, shiny_bauble: 1 },
    };
    const r = cycleAmuletEquip(save);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.save.equippedAmulet).toBeTruthy();
  });
});
