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
import { listInventory, useInventoryItem } from './inventory';
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
    expect(state.armor).toBeGreaterThan(0);
    expect(
      (state.inventory.gold_trinket ?? 0) + (state.inventory.shiny_bauble ?? 0),
    ).toBeGreaterThan(0);
  });

  it('applyLootToSave mutates save-shaped state via shipped helper', () => {
    const save = defaultSave();
    const drops = openChest('boss', () => 0.5);
    const next = applyLootToSave(save, drops);
    expect(next.coins).toBeGreaterThan(save.coins);
    expect(Object.keys(next.inventory).length).toBeGreaterThan(0);
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
  it('defaultSave exposes xp, level, coins, inventory, armor', () => {
    const s = defaultSave();
    expect(s.version).toBe(2);
    expect(s.xp).toBe(0);
    expect(s.level).toBe(1);
    expect(s.coins).toBe(0);
    expect(s.inventory).toEqual({});
    expect(s.armor).toBe(0);
  });
});

describe('inventory panel helpers', () => {
  it('listInventory only includes positive counts', () => {
    const lines = listInventory({ potion: 2, gold_trinket: 0, shiny_bauble: 1 });
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
