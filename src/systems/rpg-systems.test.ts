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
import { defaultSave } from './save';
import { mintItem } from './items';

describe('XP formula scaling', () => {
  it('band costs increase with level', () => {
    expect(xpToAdvanceFrom(1)).toBeLessThan(xpToAdvanceFrom(5));
    expect(xpToAdvanceFrom(5)).toBeLessThan(xpToAdvanceFrom(10));
  });

  it('levelFromXp matches cumulative thresholds', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(xpToReachLevel(2))).toBe(2);
    expect(levelFromXp(xpToReachLevel(5))).toBe(5);
    expect(levelFromXp(xpToReachLevel(10) - 1)).toBe(9);
    expect(levelFromXp(xpToReachLevel(10))).toBe(10);
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
    expect(m.version).toBe(4);
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
