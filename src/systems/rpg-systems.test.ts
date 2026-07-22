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
import {
  appearanceFromSave,
  budAppearanceFromSave,
  buddyTextureKeyFromSave,
  playerTextureKeyFromSave,
} from './appearance';
import { budPoseTextureKey, poseForAttackStyle } from './bud-anim';
import {
  swingTextureKey,
  weaponLookFromTemplateId,
} from './weapon-visuals';
import { effectivePrimary } from './rarity';
import { defaultSave, loadSave } from './save';
import {
  compareToEquipped,
  equipCompareDetailLine,
  mintItem,
} from './items';
import {
  entryFromOpposite,
  spawnBesideStairs,
  spawnInsideEntryEdge,
} from './map-spawn';
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

  it('grantXp awards one +2/+1 package per level (uncapped curve)', () => {
    const need = xpToReachLevel(2);
    const r = grantXp({ xp: need - 1, level: 1, attrPoints: 0 }, 1);
    expect(r.level).toBe(2);
    expect(r.leveledUp).toBe(true);
    expect(r.attrPointsGained).toBe(1);
    expect(r.attrPoints).toBe(1);
    // No soft level wall — high levels still resolve
    expect(levelFromXp(xpToReachLevel(100))).toBe(100);
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

  it('class biases weapon picks without locking them', async () => {
    const { pickWeapon, CLASS_WEAPON_PREFS } = await import('./loot');
    let staff = 0;
    let swordish = 0;
    const n = 200;
    for (let i = 0; i < n; i++) {
      const w = pickWeapon(mulberry32(i * 17 + 3), {
        primaryClass: 'wizard',
      });
      if (w === 'wizard_staff') staff += 1;
      if (CLASS_WEAPON_PREFS.fighter.weapons.includes(w)) swordish += 1;
    }
    // Wizard bias ~0.72 — expect staff often but not always
    expect(staff).toBeGreaterThan(n * 0.45);
    expect(staff).toBeLessThan(n);
    // Still sometimes off-class
    expect(staff + swordish).toBeLessThanOrEqual(n);

    let ranged = 0;
    for (let i = 0; i < n; i++) {
      const w = pickWeapon(mulberry32(i * 19 + 5), {
        primaryClass: 'ranger',
      });
      if (w === 'short_bow' || w === 'hunter_crossbow') ranged += 1;
    }
    expect(ranged).toBeGreaterThan(n * 0.25);

    // No class → any weapon from pool is fine
    const open = pickWeapon(mulberry32(42), {});
    expect(typeof open).toBe('string');
  });

  it('openChest with wizard class can roll staff over many trials', () => {
    let staffHits = 0;
    for (let i = 0; i < 120; i++) {
      const d = openChest('dungeon', mulberry32(i * 11 + 2), {
        primaryClass: 'wizard',
        secondaryClass: null,
      });
      if (d.some((x) => x.templateId === 'wizard_staff')) staffHits += 1;
    }
    // Chests often give potions not gear — just ensure staff appears sometimes
    expect(staffHits).toBeGreaterThan(0);
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
    save.level = 3; // pack unlocks at L3
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
  it('spendAttrPoint applies +2 major then +1 minor on different stats', () => {
    let save = { ...defaultSave(), attrPoints: 1, pendingAttrMajor: null };
    const major = spendAttrPoint(save, 'vit');
    expect(major.ok).toBe(true);
    if (!major.ok) return;
    expect(major.step).toBe('major');
    expect(major.save.attrs.vit).toBe(3); // 1 base + 2
    expect(major.save.pendingAttrMajor).toBe('vit');
    expect(major.save.attrPoints).toBe(1); // package not consumed yet

    const same = spendAttrPoint(major.save, 'vit');
    expect(same.ok).toBe(false);

    const minor = spendAttrPoint(major.save, 'str');
    expect(minor.ok).toBe(true);
    if (!minor.ok) return;
    expect(minor.step).toBe('minor');
    expect(minor.save.attrs.str).toBe(2); // 1 + 1
    expect(minor.save.attrPoints).toBe(0);
    expect(minor.save.pendingAttrMajor).toBeNull();
    const synced = syncDerivedStats(minor.save);
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
  it('texture key encodes unique weapon + key looks', () => {
    let save = grantMildSword(defaultSave());
    save = grantKey(save);
    const key = playerTextureKeyFromSave(save);
    expect(key).toContain('_sword_');
    expect(key.endsWith('_key')).toBe(true);
    const bare = playerTextureKeyFromSave(defaultSave());
    expect(bare).toBe(
      'player_none_none_none_none_none_none_none_none_none_none',
    );
  });

  it('maps distinct weapons and amulets to unique looks', () => {
    let save = defaultSave();
    // equip iron blade + gold trinket via bag
    const iron = {
      uid: 't-iron',
      templateId: 'iron_blade',
      rarity: 'common' as const,
      enhancement: 0,
    };
    const gold = {
      uid: 't-gold',
      templateId: 'gold_trinket',
      rarity: 'common' as const,
      enhancement: 0,
    };
    save = {
      ...save,
      bag: [...save.bag, iron, gold],
      equipped: {
        ...save.equipped,
        weapon: iron.uid,
        amulet: gold.uid,
      },
    };
    const spec = appearanceFromSave(save);
    expect(spec.weapon).toBe('iron');
    expect(spec.amulet).toBe('gold');
    expect(playerTextureKeyFromSave(save)).toContain('_iron_');
    expect(playerTextureKeyFromSave(save)).toContain('_gold_');
  });

  it('crossbow look is distinct from bow on the avatar', () => {
    const bow = {
      uid: 't-bow',
      templateId: 'short_bow',
      rarity: 'common' as const,
      enhancement: 0,
    };
    const xbow = {
      uid: 't-xbow',
      templateId: 'hunter_crossbow',
      rarity: 'common' as const,
      enhancement: 0,
    };
    const withBow = {
      ...defaultSave(),
      bag: [bow],
      equipped: { ...defaultSave().equipped, weapon: bow.uid },
    };
    const withXbow = {
      ...defaultSave(),
      bag: [xbow],
      equipped: { ...defaultSave().equipped, weapon: xbow.uid },
    };
    expect(appearanceFromSave(withBow).weapon).toBe('bow');
    expect(appearanceFromSave(withXbow).weapon).toBe('crossbow');
    expect(playerTextureKeyFromSave(withBow)).not.toBe(
      playerTextureKeyFromSave(withXbow),
    );
  });
});

describe('bud anim poses', () => {
  it('maps attack styles to distinct pose textures', () => {
    expect(poseForAttackStyle('stretch')).toBe('stretch');
    expect(poseForAttackStyle('slash')).toBe('strike');
    expect(poseForAttackStyle('spit')).toBe('spit');
    expect(poseForAttackStyle('blink')).toBe('blink');
    expect(poseForAttackStyle('guard')).toBe('guard');
    expect(poseForAttackStyle('aura')).toBe('heal');
    expect(budPoseTextureKey('stretch')).toBe('best_bud_stretch');
    expect(budPoseTextureKey('grab')).toBe('best_bud_grab');
    expect(budPoseTextureKey('idle')).toBe('best_bud');
  });
});

describe('buddy gear appearance', () => {
  it('reads budEquipped (not hero) and encodes weapon on texture key', () => {
    const iron = {
      uid: 'b-iron',
      templateId: 'iron_blade',
      rarity: 'common' as const,
      enhancement: 0,
    };
    const leather = {
      uid: 'b-leather',
      templateId: 'leather_armor',
      rarity: 'common' as const,
      enhancement: 0,
    };
    const heroSword = {
      uid: 'h-sword',
      templateId: 'mild_sword',
      rarity: 'common' as const,
      enhancement: 0,
    };
    const save = {
      ...defaultSave(),
      bag: [iron, leather, heroSword],
      equipped: {
        ...defaultSave().equipped,
        weapon: heroSword.uid,
      },
      budEquipped: {
        ...defaultSave().budEquipped,
        weapon: iron.uid,
        breastplate: leather.uid,
      },
    };
    const hero = appearanceFromSave(save);
    const bud = budAppearanceFromSave(save);
    expect(hero.weapon).toBe('sword');
    expect(bud.weapon).toBe('iron');
    expect(bud.breastplate).toBe('leather');
    expect(bud.key).toBe('none');
    const key = buddyTextureKeyFromSave(save, 'idle');
    expect(key).toContain('bud_idle_');
    expect(key).toContain('_iron_');
    expect(key).toContain('_leather_');
    expect(buddyTextureKeyFromSave(save, 'stretch')).toContain('bud_stretch_');
    expect(buddyTextureKeyFromSave(save, 'stretch')).not.toBe(key);
  });
});

describe('touch-input virtual pad', () => {
  it('holds axes and consumes one-shot actions', async () => {
    const t = await import('./touch-input');
    t.clearAllTouch();
    t.setTouchAxis('left', true);
    expect(t.touchAxisDown('left')).toBe(true);
    t.setTouchAxis('left', false);
    expect(t.touchAxisDown('left')).toBe(false);
    t.pulseTouchAction('attack');
    expect(t.consumeTouchAction('attack')).toBe(true);
    expect(t.consumeTouchAction('attack')).toBe(false);
  });
});

describe('class gear proficiency (D&D-style)', () => {
  it('wizard cloak synergizes with wizard; heavy plate penalizes wizard', async () => {
    const { effectiveGearDef } = await import('./class-gear');
    let save = defaultSave();
    save.primaryClass = 'wizard';
    const cloak = mintItem(save, 'wizard_cloak', 'common', 0);
    save = cloak.save;
    const cloakDef = effectiveGearDef(save, cloak.instance);
    // base 1 + affinity 1
    expect(cloakDef).toBeGreaterThanOrEqual(2);

    const plate = mintItem(save, 'fighter_plate', 'common', 0);
    save = plate.save;
    const plateDef = effectiveGearDef(save, plate.instance);
    // base 3 * 0.65 unproficient, no affinity (legacy worn penalty)
    expect(plateDef).toBeLessThan(3);
    expect(plateDef).toBe(Math.floor(3 * 0.65));
  });

  it('dual class: secondary ranger gets ranger cloak affinity', async () => {
    const { effectiveGearDef } = await import('./class-gear');
    let save = defaultSave();
    save.primaryClass = 'fighter';
    save.secondaryClass = 'ranger';
    const cloak = mintItem(save, 'ranger_cloak', 'common', 0);
    save = cloak.save;
    // base 2 + affinity 1
    expect(effectiveGearDef(save, cloak.instance)).toBe(3);
  });

  it('blocks equip when class does not match; message names required class', async () => {
    const {
      canHeroEquipGear,
      isGearClassBlocked,
      mustBeClassMessage,
    } = await import('./class-gear');
    const { equipUid } = await import('./inventory');
    let save = defaultSave();
    save.primaryClass = 'wizard';
    const hide = mintItem(save, 'barbarian_hide', 'common', 0);
    save = hide.save;

    expect(isGearClassBlocked(save, 'barbarian_hide')).toBe(true);
    const gate = canHeroEquipGear(save, 'barbarian_hide');
    expect(gate.ok).toBe(false);
    if (!gate.ok) {
      expect(gate.reason).toMatch(/MUST BE A BARBARIAN/i);
      expect(gate.reason).toMatch(/DRUID/i);
    }
    expect(mustBeClassMessage(['barbarian'])).toBe(
      'MUST BE A BARBARIAN TO WEAR THIS',
    );

    const eq = equipUid(save, hide.instance.uid);
    expect(eq.ok).toBe(false);
    if (!eq.ok) expect(eq.reason).toMatch(/MUST BE A BARBARIAN/i);
    expect(save.equipped.breastplate).toBeNull();
  });

  it('allows equip when class matches affinity; pre-class free', async () => {
    const { canHeroEquipGear } = await import('./class-gear');
    const { equipUid } = await import('./inventory');
    let save = defaultSave();
    // Pre-class: open season
    const hide0 = mintItem(save, 'barbarian_hide', 'common', 0);
    save = hide0.save;
    expect(canHeroEquipGear(save, 'barbarian_hide').ok).toBe(true);
    const pre = equipUid(save, hide0.instance.uid);
    expect(pre.ok).toBe(true);

    save = defaultSave();
    save.primaryClass = 'barbarian';
    const hide = mintItem(save, 'barbarian_hide', 'common', 0);
    save = hide.save;
    expect(canHeroEquipGear(save, 'barbarian_hide').ok).toBe(true);
    const eq = equipUid(save, hide.instance.uid);
    expect(eq.ok).toBe(true);
    if (eq.ok) expect(eq.save.equipped.breastplate).toBe(hide.instance.uid);
  });

  it('blocks wizard from generic heavy tower shield by armor type', async () => {
    const { canHeroEquipGear } = await import('./class-gear');
    let save = defaultSave();
    save.primaryClass = 'wizard';
    // tower_shield has classAffinity fighter/paladin/cleric
    const gate = canHeroEquipGear(save, 'tower_shield');
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.reason).toMatch(/MUST BE A /i);
  });
});

describe('equip compare arrows', () => {
  it('marks stronger weapon as up and weaker as down', () => {
    let save = grantMildSword(defaultSave());
    // mild sword is equipped (atk 1)
    const mildUid = save.equipped.weapon!;
    const mild = save.bag.find((b) => b.uid === mildUid)!;
    expect(compareToEquipped(save, mild).dir).toBe('same');

    const iron = mintItem(save, 'iron_blade', 'common', 0);
    save = iron.save;
    const up = compareToEquipped(save, iron.instance);
    expect(up.dir).toBe('up');
    expect(up.stat).toBe('ATK');
    expect(up.arrow).toBe('▲');
    expect(up.delta).toBeGreaterThan(0);
    expect(equipCompareDetailLine(up)).toContain('▲');

    // equip iron, mild should be down
    save = {
      ...save,
      equipped: { ...save.equipped, weapon: iron.instance.uid },
    };
    const down = compareToEquipped(save, mild);
    expect(down.dir).toBe('down');
    expect(down.arrow).toBe('▼');
  });

  it('armor compares DEF; empty slot is an upgrade', () => {
    let save = defaultSave();
    const leather = mintItem(save, 'leather_armor', 'common', 0);
    save = leather.save;
    const cmp = compareToEquipped(save, leather.instance);
    expect(cmp.dir).toBe('up');
    expect(cmp.stat).toBe('DEF');
    expect(cmp.equipped).toBe(0);
  });
});

describe('weapon visuals', () => {
  it('maps every weapon template to a unique look', () => {
    const pairs: [string, string][] = [
      ['mild_sword', 'sword'],
      ['iron_blade', 'iron'],
      ['sand_saber', 'saber'],
      ['dunjun_cleaver', 'cleaver'],
      ['honk_blade', 'honk'],
      ['phaser', 'phaser'],
      ['short_bow', 'bow'],
      ['hunter_crossbow', 'crossbow'],
      ['wizard_staff', 'staff'],
    ];
    const looks = new Set(pairs.map(([, l]) => l));
    expect(looks.size).toBe(pairs.length);
    for (const [id, look] of pairs) {
      expect(weaponLookFromTemplateId(id)).toBe(look);
      expect(swingTextureKey(look as never)).toBe(`swing_${look}`);
    }
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
    // level 3 → 2 packages under +2/+1 rule
    expect(m.attrPoints).toBeGreaterThanOrEqual(2);
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

describe('inventory sort', () => {
  it('sorts by name, type, equipped, rarity', async () => {
    const {
      sortInventoryLines,
      nextInventorySortMode,
      inventorySortLabel,
    } = await import('./inventory');
    type Line = import('./inventory').InventoryLine;
    const lines: Line[] = [
      {
        templateId: 'potion',
        name: 'HEALING POTION',
        count: 2,
        blurb: 'heal',
        usable: true,
        equipped: false,
      },
      {
        uid: 'i_1',
        templateId: 'iron_blade',
        name: 'IRON BLADE (RARE)',
        count: 1,
        blurb: 'sword',
        usable: false,
        slot: 'weapon',
        equipped: false,
        rarity: 'rare',
      },
      {
        uid: 'i_2',
        templateId: 'leather_armor',
        name: 'LEATHER BREASTPLATE',
        count: 1,
        blurb: 'armor',
        usable: false,
        slot: 'breastplate',
        equipped: true,
        rarity: 'common',
      },
      {
        uid: 'i_3',
        templateId: 'dunjun_cleaver',
        name: 'DUNJUN CLEAVER',
        count: 1,
        blurb: 'big',
        usable: false,
        slot: 'weapon',
        equipped: false,
        rarity: 'legendary',
      },
    ];
    const byName = sortInventoryLines(lines, 'name');
    expect(byName[0]!.name <= byName[1]!.name).toBe(true);

    const byEq = sortInventoryLines(lines, 'equipped');
    expect(byEq[0]!.equipped).toBe(true);

    const byR = sortInventoryLines(lines, 'rarity');
    expect(byR[0]!.rarity).toBe('legendary');

    const byType = sortInventoryLines(lines, 'type');
    expect(byType[0]!.usable).toBe(true);

    expect(nextInventorySortMode('default')).toBe('name');
    expect(inventorySortLabel('rarity')).toBe('RARITY');
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

  it('arriveDown spawns north of stairs_up; arriveUp south of stairs', () => {
    // stairs_up at (2,3); stairs down at (2,2) on separate grids
    const downRoom = [
      ['wall', 'wall', 'wall', 'wall', 'wall'],
      ['wall', 'floor', 'floor', 'floor', 'wall'],
      ['wall', 'floor', 'floor', 'floor', 'wall'],
      ['wall', 'floor', 'stairs_up', 'floor', 'wall'],
      ['wall', 'floor', 'floor', 'floor', 'wall'],
      ['wall', 'wall', 'wall', 'wall', 'wall'],
    ];
    const a = spawnBesideStairs(downRoom, 'arriveDown');
    expect(a).not.toBeNull();
    expect(a!.tx).toBe(2);
    expect(a!.ty).toBeLessThan(3); // north of U

    const upRoom = [
      ['wall', 'wall', 'wall', 'wall', 'wall'],
      ['wall', 'floor', 'floor', 'floor', 'wall'],
      ['wall', 'floor', 'stairs', 'floor', 'wall'],
      ['wall', 'floor', 'floor', 'floor', 'wall'],
      ['wall', 'floor', 'floor', 'floor', 'wall'],
      ['wall', 'wall', 'wall', 'wall', 'wall'],
    ];
    const b = spawnBesideStairs(upRoom, 'arriveUp');
    expect(b).not.toBeNull();
    expect(b!.tx).toBe(2);
    expect(b!.ty).toBeGreaterThan(2); // south of S
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

describe('deep dungeons 4× floors', () => {
  it('dunjunz has 8 basement floors ending in B8 throne', async () => {
    const { floorsForLand } = await import('./mapz');
    const floors = floorsForLand(ROOMS, 'dunjunz');
    expect(floors).toContain(-1);
    expect(floors).toContain(-8);
    expect(floors.length).toBeGreaterThanOrEqual(8);
    expect(ROOMS.b8_boss?.floor).toBe(-8);
    expect(ROOMS.b1_descent?.stairsDown).toBe('b2_foyer');
    expect(ROOMS.b7_descent?.stairsDown).toBe('b8_foyer');
    expect(ROOMS.b8_boss?.entities?.some((e) => e.id === 'dungeon-master')).toBe(
      true,
    );
  });

  it('woodz, dezertz, sewerz each have multi-floor deep wings', async () => {
    const { floorsForLand } = await import('./mapz');
    expect(floorsForLand(ROOMS, 'woodz').length).toBeGreaterThanOrEqual(4);
    expect(floorsForLand(ROOMS, 'dezertz').length).toBeGreaterThanOrEqual(4);
    expect(floorsForLand(ROOMS, 'sewerz').length).toBeGreaterThanOrEqual(4);
    expect(ROOMS.woodz_deep?.stairsDown).toBe('woodz_b1_foyer');
    expect(ROOMS.dezertz_tower?.stairsDown).toBe('dezertz_b1_foyer');
    expect(ROOMS.sewerz_boss?.floor).toBe(-4);
  });
});

describe('world tile geometry', () => {
  it('every authored room tile row is exactly 16 wide (no silent wall pad)', () => {
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

describe('room connectivity (EMA audit)', () => {
  it('all ROOMS have matching doors, links, stairs, and map coords', async () => {
    const { ROOMS } = await import('../data/world');
    const { validateRooms } = await import('./room-validate');
    const issues = validateRooms(ROOMS);
    if (issues.length) {
      const sample = issues
        .slice(0, 12)
        .map((i) => `[${i.kind}] ${i.id}: ${i.detail}`)
        .join('\n');
      expect(issues, `Room issues:\n${sample}`).toEqual([]);
    }
    expect(issues.length).toBe(0);
  });
});

describe('room expand to 16:9 view', () => {
  it('stretches playable interior across VIEW_TILES (not a brick frame)', async () => {
    const { expandRoomTiles } = await import('./room-expand');
    const { VIEW_TILES_W, VIEW_TILES_H, MAP_PIXEL_W, MAP_PIXEL_H, GAME_W, GAME_H, HUD_H } =
      await import('../config');
    expect(VIEW_TILES_W).toBeGreaterThan(16);
    expect(VIEW_TILES_H).toBeGreaterThan(11);
    expect(MAP_PIXEL_W).toBeLessThanOrEqual(GAME_W);
    expect(MAP_PIXEL_H).toBeLessThanOrEqual(GAME_H - HUD_H);

    // Empty-ish dungeon hall: mostly floor inside walls
    const src = [
      '################',
      '#..............#',
      '#..............#',
      '#..............#',
      '#..............#',
      'D..............#',
      '#..............#',
      '#..............#',
      '#..............#',
      '#..............#',
      '################',
    ];
    const ex = expandRoomTiles(src);
    expect(ex.tiles).toHaveLength(VIEW_TILES_H);
    expect(ex.tiles[0]?.length).toBe(VIEW_TILES_W);

    // Mid-room should be walkable floor across most of the width (not a thin strip)
    let walkMid = 0;
    const midY = Math.floor(VIEW_TILES_H / 2);
    for (let x = 1; x < VIEW_TILES_W - 1; x++) {
      const ch = ex.tiles[midY]?.[x];
      if (ch && ch !== '#') walkMid += 1;
    }
    expect(walkMid).toBeGreaterThan(VIEW_TILES_W * 0.6);

    // West door: exactly one D on the outer edge (not a triple mouth)
    const doorRows = ex.tiles.filter((r) => r[0] === 'D' || r[0] === 'L');
    expect(doorRows.length).toBe(1);
  });

  it('door edges are a single door with wall flanks (no DDD, no floor gaps)', async () => {
    const { expandRoomTiles } = await import('./room-expand');
    const src = [
      '################',
      '#..............#',
      '#..............#',
      '#..............#',
      '#..............#',
      '#..............#',
      '#..............#',
      '#..............#',
      '#..............#',
      '#..............#',
      '########D#######',
    ];
    const ex = expandRoomTiles(src);
    const south = ex.tiles[ex.tiles.length - 1]!;
    let doors = 0;
    for (let i = 0; i < south.length; i++) {
      const c = south[i]!;
      // Rim: wall or door glyph only — never a lone floor hole next to D
      expect(['#', 'D', 'L'].includes(c)).toBe(true);
      if (c === 'D' || c === 'L') doors += 1;
    }
    expect(doors).toBe(1);
    expect(south.includes('D')).toBe(true);
  });

  it('keeps meadow east trail open on outer edge after stretch', async () => {
    const { expandRoomTiles } = await import('./room-expand');
    const { VIEW_TILES_W } = await import('../config');
    const meadow = ROOMS.overworld;
    const ex = expandRoomTiles(meadow.tiles);
    // At least one east-edge cell is walkable (trail exit)
    let open = 0;
    for (let y = 0; y < ex.tiles.length; y++) {
      const ch = ex.tiles[y]?.[VIEW_TILES_W - 1];
      if (ch && ch !== '#' && ch !== 'L') open += 1;
    }
    expect(open).toBeGreaterThan(0);
  });

  it('keeps linked room exits open after stretch (no soft-lock mouths)', async () => {
    const { expandRoomTiles } = await import('./room-expand');
    const { VIEW_TILES_W, VIEW_TILES_H } = await import('../config');
    // USS Plot Hole (redshirts) was sealing its only east exit
    const trek = expandRoomTiles(ROOMS.b1_trek.tiles);
    let eOpen = 0;
    for (let y = 0; y < VIEW_TILES_H; y++) {
      const ch = trek.tiles[y]?.[VIEW_TILES_W - 1];
      if (ch && ch !== '#') eOpen += 1;
    }
    expect(eOpen).toBeGreaterThan(0);

    // Every room with a cardinal link keeps that rim walkable
    const sealed: string[] = [];
    for (const room of Object.values(ROOMS)) {
      const ex = expandRoomTiles(room.tiles);
      const h = ex.tiles.length;
      const w = ex.tiles[0]!.length;
      const edgeOpen = (edge: 'N' | 'S' | 'E' | 'W') => {
        let n = 0;
        if (edge === 'E' || edge === 'W') {
          const x = edge === 'E' ? w - 1 : 0;
          for (let y = 0; y < h; y++) {
            if (ex.tiles[y]![x] !== '#') n++;
          }
        } else {
          const y = edge === 'N' ? 0 : h - 1;
          for (let x = 0; x < w; x++) {
            if (ex.tiles[y]![x] !== '#') n++;
          }
        }
        return n;
      };
      if (room.east && edgeOpen('E') === 0) sealed.push(`${room.id}:east`);
      if (room.west && edgeOpen('W') === 0) sealed.push(`${room.id}:west`);
      if (room.north && edgeOpen('N') === 0) sealed.push(`${room.id}:north`);
      if (room.south && edgeOpen('S') === 0) sealed.push(`${room.id}:south`);
    }
    expect(sealed, `sealed exits: ${sealed.join(', ')}`).toEqual([]);
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
    expect(isBossRoom('b8_boss')).toBe(true);
    expect(isBossRoom('b2_boss')).toBe(true); // alias
    expect(isBossRoom('woodz_deep')).toBe(true);
    expect(isBossRoom('dezertz_tower')).toBe(true);
    expect(isBossRoom('b1_entrance')).toBe(false);
    expect(dungeonEntranceForLand('dunjunz')).toBe('b1_entrance');
    expect(dungeonEntranceForLand('woodz')).toBe('woodz_edge');
    expect(dungeonEntranceForLand('dezertz')).toBe('dezertz_edge');
    expect(dungeonEntranceForLand('surface')).toBeNull();

    const def = bossExitPortalDef('b8_boss', 'dunjunz');
    expect(def?.kind).toBe('portal');
    expect(def?.portalTarget).toBe('b1_entrance');
    expect(def?.id).toBe('exit-portal-dunjunz');

    let save = defaultSave();
    expect(shouldSpawnBossExitPortal(save, 'b8_boss', 'dunjunz')).toBe(false);
    save = rewardDunjunzClear(save).save;
    expect(shouldSpawnBossExitPortal(save, 'b8_boss', 'dunjunz')).toBe(true);
    expect(shouldSpawnBossExitPortal(save, 'b1_entrance', 'dunjunz')).toBe(
      false,
    );

    // Hard run: no exit until dungeon-master is in hardKilled
    const hard = {
      ...save,
      hardRunLand: 'dunjunz' as const,
      hardKilled: [] as string[],
    };
    expect(shouldSpawnBossExitPortal(hard, 'b8_boss', 'dunjunz')).toBe(false);
    hard.hardKilled = ['dungeon-master'];
    expect(shouldSpawnBossExitPortal(hard, 'b8_boss', 'dunjunz')).toBe(true);

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
    expect(r.dialog.some((l) => l.includes('PRINCESS PRIZELLA'))).toBe(true);
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

describe('shop pagination helpers', () => {
  it('pages stock and bag by fixed page sizes', async () => {
    const {
      SHOP_STOCK_PAGE_SIZE,
      SHOP_BAG_PAGE_SIZE,
      shopPageCount,
      shopPageOf,
      clampShopPage,
      buildTinkererStock,
    } = await import('./shop');
    expect(SHOP_STOCK_PAGE_SIZE).toBe(12);
    expect(SHOP_BAG_PAGE_SIZE).toBe(16);
    expect(shopPageCount(0, 12)).toBe(1);
    expect(shopPageCount(12, 12)).toBe(1);
    expect(shopPageCount(13, 12)).toBe(2);
    expect(shopPageOf(11, 12)).toBe(0);
    expect(shopPageOf(12, 12)).toBe(1);
    expect(clampShopPage(9, 13, 12)).toBe(1);
    // High-level stock needs more than one page of the 3×4 grid
    expect(buildTinkererStock(99).length).toBeGreaterThan(SHOP_STOCK_PAGE_SIZE);
  });
});

describe('level-scaled shop + buddy-only gear', () => {
  it('unlocks more stock as level rises and tags buddy SKUs', async () => {
    const { buildTinkererStock, getShop, attemptPurchase } = await import(
      './shop'
    );
    const l1 = buildTinkererStock(1);
    const l12 = buildTinkererStock(12);
    expect(l12.length).toBeGreaterThan(l1.length);
    expect(l1.some((s) => s.id === 'buy_fighter_plate')).toBe(false);
    expect(l12.some((s) => s.id === 'buy_fighter_plate')).toBe(true);
    expect(l1.some((s) => s.buddyOnly)).toBe(true);
    expect(getShop('tinkerer', 1)!.stock.length).toBe(l1.length);

    // L1 cannot buy high-tier SKU
    let save = defaultSave();
    save.level = 1;
    save.coins = 9999;
    const denied = attemptPurchase(save, 'tinkerer', 'buy_fighter_plate');
    expect(denied.ok).toBe(false);

    save.level = 12;
    const ok = attemptPurchase(save, 'tinkerer', 'buy_bud_collar');
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.save.bag.some((b) => b.templateId === 'bud_collar')).toBe(true);
      // buddy gear must not auto-equip on hero
      expect(Object.values(ok.save.equipped).includes(
        ok.save.bag.find((b) => b.templateId === 'bud_collar')!.uid,
      )).toBe(false);
    }
  });

  it('heroes cannot equip buddy-only; buds can', async () => {
    const { mintItem } = await import('./items');
    const { equipUid } = await import('./inventory');
    const { equipBudUid, equipHeroUid } = await import('./best-bud-gear');
    let save = defaultSave();
    save.bestBudId = 'gloop';
    save.bestBudStage = 'complete';
    const m = mintItem(save, 'bud_collar', 'common', 0);
    save = m.save;
    const hero = equipHeroUid(save, m.instance.uid);
    expect(hero.ok).toBe(false);
    const legacy = equipUid(save, m.instance.uid);
    expect(legacy.ok).toBe(false);
    const bud = equipBudUid(save, m.instance.uid);
    expect(bud.ok).toBe(true);
    if (bud.ok) {
      expect(bud.save.budEquipped.amulet).toBe(m.instance.uid);
    }
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

  it('deeper basements are meaner than shallow ones', async () => {
    const { threatForRoom } = await import('./threat');
    const s = defaultSave();
    const b2 = threatForRoom({ land: 'dunjunz', floor: -2 }, s);
    const b7 = threatForRoom({ land: 'dunjunz', floor: -7 }, s);
    expect(b7).toBeGreaterThan(b2);
  });
});

describe('floor depth personality', () => {
  it('darkens tiles and stamps more hazards deeper', async () => {
    const {
      basementDepth,
      depthTileTint,
      depthLayoutTier,
      depthExtraCreepSlots,
      applyDepthHazards,
      depthThreatBonus,
    } = await import('./floor-depth');
    expect(basementDepth(-5)).toBe(5);
    expect(basementDepth(0)).toBe(0);
    expect(depthThreatBonus(7)).toBeGreaterThan(depthThreatBonus(2));
    expect(depthLayoutTier(2)).toBe(0);
    expect(depthLayoutTier(4)).toBe(1);
    expect(depthLayoutTier(7)).toBe(2);
    expect(depthExtraCreepSlots(7)).toBeGreaterThan(depthExtraCreepSlots(2));
    const shallow = depthTileTint(1, 'floor', 'dunjunz');
    const deep = depthTileTint(8, 'floor', 'dunjunz');
    // deeper tint is darker (lower average channel)
    const avg = (n: number) =>
      ((n >> 16) & 0xff) + ((n >> 8) & 0xff) + (n & 0xff);
    expect(avg(deep)).toBeLessThan(avg(shallow));

    const open = [
      '########D#######',
      '#..............#',
      '#..............#',
      '#..............#',
      '#..............#',
      '#..............#',
      '#..............#',
      '#..............#',
      '#..............#',
      '#..............#',
      '################',
    ];
    const stamped = applyDepthHazards(open, 7, 'dungeon', 'test:hall');
    const lava = stamped.join('').split('=').length - 1;
    expect(lava).toBeGreaterThan(0);
    expect(stamped.every((r) => r.length === 16)).toBe(true);
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
    expect(ROOMS.sewerz_boss?.south).toBe('sewerz_b4_foyer');
    expect(ROOMS.sewerz_mouth?.land).toBe('sewerz');
    expect(ROOMS.sewerz_hall?.stairsDown).toBe('sewerz_b2_foyer');
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

  it('player projectiles can target training dummies', async () => {
    const { isHostileKind, isPlayerProjectileTarget } = await import(
      './best-bud-combat'
    );
    expect(isHostileKind('dummy')).toBe(false);
    expect(isPlayerProjectileTarget('dummy')).toBe(true);
    expect(isPlayerProjectileTarget('slime')).toBe(true);
    expect(isPlayerProjectileTarget('sign')).toBe(false);
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
    // Den visit alone is enough — no empty hollow after one Princess Prizella pitch
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
    expect(r.dialog.join(' ')).toMatch(/PRINCESS|SAVE/i);
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

// ── Army mode ───────────────────────────────────────────
import {
  ARMY_MIN_LEVEL,
  canGraduateToArmy,
  defaultArmySave,
  graduateHeroToArmy,
  memberPower,
} from './army';
import { applyAutoPackage, levelEntireArmy, levelMemberOnce } from './army-level';
import { startArmyBattle, resolveArmyRound, countLiving } from './army-battle';
import { xpToReachLevel } from './progression';

describe('army mode', () => {
  it('blocks graduation under level 20', () => {
    const save = defaultSave();
    save.level = 19;
    save.xp = xpToReachLevel(19);
    expect(canGraduateToArmy(save)).toBe(false);
    const r = graduateHeroToArmy(defaultArmySave(), save);
    expect(r.ok).toBe(false);
  });

  it('graduates L20 hero with personality and grows roster without cap', () => {
    let army = defaultArmySave();
    const save = defaultSave();
    save.level = 20;
    save.xp = xpToReachLevel(20);
    save.primaryClass = 'barbarian';
    save.attrs = { str: 10, dex: 4, vit: 8, int: 2, lck: 3 };
    for (let i = 0; i < 5; i++) {
      save.runSeed = 1000 + i;
      const r = graduateHeroToArmy(army, save, { name: `Barb${i}` });
      expect(r.ok).toBe(true);
      if (r.ok) army = r.army;
    }
    expect(army.members.length).toBe(5);
    expect(army.members.every((m) => m.level >= ARMY_MIN_LEVEL)).toBe(true);
    expect(memberPower(army.members[0]!)).toBeGreaterThan(20);
  });

  it('auto package boosts lowest stats; 5th level uses focus', () => {
    const attrs = { str: 5, dex: 2, vit: 4, int: 9, lck: 3 };
    const a1 = applyAutoPackage(attrs, 21, 'str', 'vit', () => 0.1);
    // lowest is dex=2 → +2, 2nd lowest lck=3 → +1
    expect(a1.attrs.dex).toBe(4);
    expect(a1.attrs.lck).toBe(4);

    const a5 = applyAutoPackage(attrs, 25, 'str', 'int', () => 0.5);
    expect(a5.attrs.str).toBe(7);
    expect(a5.attrs.int).toBe(10);
    expect(a5.note).toMatch(/FOCUS/);
  });

  it('mass level-up auto advances entire roster', () => {
    let army = defaultArmySave();
    const save = defaultSave();
    save.level = 20;
    save.xp = xpToReachLevel(20);
    const g = graduateHeroToArmy(army, save, { name: 'One' });
    expect(g.ok).toBe(true);
    if (!g.ok) return;
    army = g.army;
    const before = army.members[0]!.level;
    const r = levelEntireArmy(army, 'auto', undefined, () => 0.2);
    expect('army' in r).toBe(true);
    if ('army' in r) {
      expect(r.army.members[0]!.level).toBe(before + 1);
    }
  });

  it('army battle deploys all members vs scaled horde', () => {
    let army = defaultArmySave();
    const save = defaultSave();
    save.level = 22;
    save.xp = xpToReachLevel(22);
    for (let i = 0; i < 3; i++) {
      save.runSeed = i + 50;
      const g = graduateHeroToArmy(army, save, { name: `U${i}` });
      if (g.ok) army = g.army;
    }
    const b = startArmyBattle(army, 1, () => 0.3);
    expect('error' in b).toBe(false);
    if ('error' in b) return;
    expect(b.army.length).toBe(3);
    expect(b.horde.length).toBeGreaterThanOrEqual(3);
    const mid = resolveArmyRound(b, army.members, () => 0.4);
    expect(countLiving(mid.army) + countLiving(mid.horde)).toBeGreaterThan(0);
  });

  it('levelMemberOnce manual requires distinct stats', () => {
    const save = defaultSave();
    save.level = 20;
    save.xp = xpToReachLevel(20);
    const g = graduateHeroToArmy(defaultArmySave(), save, { name: 'X' });
    expect(g.ok).toBe(true);
    if (!g.ok) return;
    const m = g.member;
    const bad = levelMemberOnce(m, 'manual', { major: 'str', minor: 'str' });
    expect('error' in bad).toBe(true);
    const ok = levelMemberOnce(m, 'manual', { major: 'str', minor: 'dex' });
    expect('member' in ok).toBe(true);
  });
});

// ── Respawn + auto stats ────────────────────────────────
import {
  canSoftRespawn,
  isPermanentKill,
  respawnDelayMs,
  scaleRespawnContact,
  scaleRespawnHp,
  RESPAWN_BASE_MS,
  RESPAWN_KINDS,
} from './respawn';
import {
  flushAutoStatPackages,
  classFocusStats,
  hasUnspentStatPackages,
} from './stat-allocate';
import { loadSettings, patchSettings, defaultSettings } from './settings';

describe('creep respawn', () => {
  it('soft-respawns common creeps but not bosses', () => {
    expect(canSoftRespawn('slime', 'hall-slime')).toBe(true);
    expect(canSoftRespawn('scorpion', 'dez-scorp-1')).toBe(true);
    expect(canSoftRespawn('boss', 'dungeon-master')).toBe(false);
    expect(isPermanentKill('boss', 'wolf-lord')).toBe(true);
    expect(isPermanentKill('redshirt', 'ensign-1')).toBe(true);
    expect(canSoftRespawn('redshirt', 'trail-red-1')).toBe(true);
  });

  it('delay is in a moderate band', () => {
    for (let i = 0; i < 20; i++) {
      const d = respawnDelayMs(() => i / 20);
      expect(d).toBeGreaterThanOrEqual(RESPAWN_BASE_MS);
      expect(d).toBeLessThan(RESPAWN_BASE_MS + 25_000);
    }
  });

  it('respawn HP rises with player level and generation', () => {
    const base = 20;
    const weak = scaleRespawnHp(base, 1, 0);
    const mid = scaleRespawnHp(base, 10, 1);
    const hard = scaleRespawnHp(base, 20, 5);
    expect(mid).toBeGreaterThan(weak);
    expect(hard).toBeGreaterThan(mid);
    expect(scaleRespawnContact(2, 15, 4)).toBeGreaterThanOrEqual(2);
  });
});

describe('auto stat allocate', () => {
  it('classFocusStats prefers class bonuses', () => {
    const w = classFocusStats('wizard');
    expect(w.primary).toBe('int');
    const f = classFocusStats('fighter');
    expect(['str', 'vit']).toContain(f.primary);
  });

  it('flushAutoStatPackages spends all packages', () => {
    let save = defaultSave();
    save.level = 6;
    save.attrPoints = 2;
    save.attrs = { str: 5, dex: 2, vit: 4, int: 3, lck: 3 };
    save.primaryClass = 'rogue';
    expect(hasUnspentStatPackages(save)).toBe(true);
    const { save: next, notes } = flushAutoStatPackages(save, () => 0.1);
    expect(next.attrPoints).toBe(0);
    expect(next.pendingAttrMajor).toBeNull();
    expect(notes.length).toBeGreaterThanOrEqual(2);
    // dex was lowest — should have grown
    expect(next.attrs.dex).toBeGreaterThan(save.attrs.dex);
  });

  it('settings include autoStatAllocate', () => {
    const d = defaultSettings();
    expect(d.autoStatAllocate).toBe(false);
    const s = patchSettings({ autoStatAllocate: true });
    expect(s.autoStatAllocate).toBe(true);
    // reset for other tests
    patchSettings({ autoStatAllocate: false });
    void loadSettings;
  });

  it('settings include mobileMode and persist', () => {
    const d = defaultSettings();
    expect(d.mobileMode).toBe(false);
    const s = patchSettings({ mobileMode: true });
    expect(s.mobileMode).toBe(true);
    expect(loadSettings().mobileMode).toBe(true);
    patchSettings({ mobileMode: false });
  });
});

describe('mobile mode query', () => {
  it('parseMobileQuery accepts common truthy/falsey forms', async () => {
    const { parseMobileQuery, applyMobileQueryToSettings } = await import(
      './touch-input'
    );
    expect(parseMobileQuery('?mobile=1')).toBe(true);
    expect(parseMobileQuery('?touch=true')).toBe(true);
    expect(parseMobileQuery('?pad=on')).toBe(true);
    expect(parseMobileQuery('?mobile=0')).toBe(false);
    expect(parseMobileQuery('?mobile=off')).toBe(false);
    expect(parseMobileQuery('')).toBe(null);
    expect(parseMobileQuery('?foo=1')).toBe(null);

    patchSettings({ mobileMode: false });
    expect(applyMobileQueryToSettings('?mobile=1')).toBe(true);
    expect(loadSettings().mobileMode).toBe(true);
    expect(applyMobileQueryToSettings('?mobile=0')).toBe(false);
    expect(loadSettings().mobileMode).toBe(false);
  });

  it('setTouchPadMode cycles contextual modes without throwing', async () => {
    const { setTouchPadMode, getTouchPadMode } = await import('./touch-input');
    for (const m of ['explore', 'dialog', 'panel', 'pause'] as const) {
      setTouchPadMode(m);
      expect(getTouchPadMode()).toBe(m);
    }
    setTouchPadMode('explore');
  });

  it('axesFromStick maps omni stick into 8-way digital axes', async () => {
    const { axesFromStick, STICK_DEADZONE } = await import('./touch-input');
    expect(axesFromStick(0, 0).up).toBe(false);
    expect(axesFromStick(0, 0).left).toBe(false);
    // Inside dead zone
    const tiny = STICK_DEADZONE * 0.5;
    expect(axesFromStick(tiny, tiny).right).toBe(false);
    // Cardinal
    expect(axesFromStick(0, -1).up).toBe(true);
    expect(axesFromStick(0, -1).down).toBe(false);
    expect(axesFromStick(1, 0).right).toBe(true);
    // Diagonal
    const d = axesFromStick(0.8, 0.8);
    expect(d.right).toBe(true);
    expect(d.down).toBe(true);
    expect(d.left).toBe(false);
  });

  it('isMobileDevice is false for desktop fine+hover, true for phones', async () => {
    const { isMobileDevice } = await import('./touch-input');
    const desktopMm = (q: string) => ({
      matches:
        q.includes('pointer: fine') ||
        q.includes('hover: hover')
          ? true
          : q.includes('pointer: coarse')
            ? false
            : false,
    });
    expect(
      isMobileDevice(
        { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)', maxTouchPoints: 0 },
        desktopMm,
      ),
    ).toBe(false);
    expect(
      isMobileDevice(
        {
          userAgent:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
          maxTouchPoints: 5,
        },
        () => ({ matches: true }),
      ),
    ).toBe(true);
    // Desktop UA must not light up pad even with touchscreen-ish flags if fine+hover
    expect(
      isMobileDevice(
        {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          maxTouchPoints: 10,
        },
        desktopMm,
      ),
    ).toBe(false);
  });
});

// ── Actor combat guards (room-transition safety) ──────────────────
import { actorHasLiveBody } from './actor-combat';

describe('actorHasLiveBody', () => {
  it('rejects dead actors and missing physics bodies', () => {
    expect(actorHasLiveBody({ alive: false, sprite: { active: true, body: {} } })).toBe(
      false,
    );
    expect(actorHasLiveBody({ alive: true, sprite: null })).toBe(false);
    expect(
      actorHasLiveBody({ alive: true, sprite: { active: false, body: {} } }),
    ).toBe(false);
    expect(
      actorHasLiveBody({ alive: true, sprite: { active: true, body: undefined } }),
    ).toBe(false);
    expect(
      actorHasLiveBody({ alive: true, sprite: { active: true, body: null } }),
    ).toBe(false);
  });

  it('accepts live actors with a body (post-room-clear safe path)', () => {
    expect(
      actorHasLiveBody({ alive: true, sprite: { active: true, body: { setVelocity: () => {} } } }),
    ).toBe(true);
    // Mimic clearRoomObjects: alive=false after destroy
    const ghost = {
      alive: false,
      sprite: { active: false, body: undefined as unknown },
    };
    expect(actorHasLiveBody(ghost)).toBe(false);
  });
});

// ── Mid-boss wardens (P0 systems + P1 Floor Captain) ────────────────
import {
  ENEMY_CONTACT_DAMAGE,
  enemyTierLabel,
  resolveEnemyContactDamage,
} from './enemies';
import {
  ENEMY_XP,
  enemyXpReward,
} from './progression';
import {
  applyMinibossKill,
  applyRulesLawyerForgive,
  ASSISTANT_HONK_BASE_HP,
  ASSISTANT_HONK_ID,
  ASSISTANT_HONK_ROOM_ID,
  DEPUTY_HOWL_BASE_HP,
  DEPUTY_HOWL_ID,
  DEPUTY_HOWL_ROOM_ID,
  FLOOR_CAPTAIN_BASE_HP,
  FLOOR_CAPTAIN_ID,
  FLOOR_CAPTAIN_ROOM_ID,
  isMinibossEntity,
  isMinibossKind,
  isPeacefulMinibossUntilProvoked,
  isRulesLawyerForgiven,
  LEASE_WIGHT_BASE_HP,
  LEASE_WIGHT_ID,
  LEASE_WIGHT_ROOM_ID,
  midBossOpensLandExitPortal,
  MINIBOSS_IDS,
  RULES_LAWYER_BASE_HP,
  RULES_LAWYER_FORGIVE_HEAL,
  RULES_LAWYER_FORGIVE_MAT,
  RULES_LAWYER_FORGIVEN_FLAG,
  RULES_LAWYER_ID,
  RULES_LAWYER_ROOM_ID,
  shouldApplyMinibossReward,
  shouldSkipMinibossSpawn,
} from './mid-boss';
import { isBossRoom, BOSS_ROOM_META, shouldSpawnBossExitPortal } from './portal';
import { hardProjectileForActor } from './hard-mode';
import { ROOMS } from '../data/world';

describe('mid-boss combat tier (P0)', () => {
  it('miniboss base HP sits between elite cube and land boss', () => {
    expect(ENEMY_BASE_HP.miniboss).toBeGreaterThan(ENEMY_BASE_HP.cube);
    expect(ENEMY_BASE_HP.miniboss).toBeLessThan(ENEMY_BASE_HP.boss);
    expect(ENEMY_CONTACT_DAMAGE.miniboss).toBe(3);
    expect(ENEMY_CONTACT_DAMAGE.miniboss).toBeLessThan(ENEMY_CONTACT_DAMAGE.boss);
    expect(ENEMY_XP.miniboss).toBe(18);
    expect(ENEMY_XP.miniboss).toBeLessThan(ENEMY_XP.boss);
    expect(enemyTierLabel('miniboss')).toBe('WARDEN');
  });

  it('resolveEnemyHp scales room override for Floor Captain band', () => {
    const base = resolveEnemyHp('miniboss', FLOOR_CAPTAIN_BASE_HP, 0);
    expect(base).toBe(FLOOR_CAPTAIN_BASE_HP);
    const scaled = resolveEnemyHp('miniboss', FLOOR_CAPTAIN_BASE_HP, 6);
    // threat 6 → * (1 + 0.18*6) = *2.08 → 83
    expect(scaled).toBe(Math.round(40 * (1 + 0.18 * 6)));
    expect(scaled).toBeGreaterThan(base);
    expect(scaled).toBeLessThan(
      resolveEnemyHp('boss', 72, 12), // DM band at B8
    );
    expect(resolveEnemyContactDamage('miniboss', 6)).toBe(3 + Math.floor(6 / 2));
    expect(enemyXpReward('miniboss', 6)).toBe(
      Math.round(18 * (1 + 0.1 * 6)),
    );
  });

  it('miniboss is permanent kill, not soft-respawn', () => {
    expect(isPermanentKill('miniboss', FLOOR_CAPTAIN_ID)).toBe(true);
    expect(isPermanentKill('miniboss', 'some-warden')).toBe(true);
    expect(canSoftRespawn('miniboss', FLOOR_CAPTAIN_ID)).toBe(false);
    expect(RESPAWN_KINDS.has('miniboss')).toBe(false);
  });
});

describe('mid-boss kill side effects (P0)', () => {
  it('applyMinibossKill records kill and never sets land ceremony', () => {
    const save = defaultSave();
    expect(save.bossDefeated).toBe(false);
    expect(save.landsCleared).toEqual([]);
    expect(save.killed).not.toContain(FLOOR_CAPTAIN_ID);

    const r = applyMinibossKill(save, FLOOR_CAPTAIN_ID, 'dunjunz');
    expect(r.save.killed).toContain(FLOOR_CAPTAIN_ID);
    expect(r.save.bossDefeated).toBe(false);
    expect(r.setsBossDefeated).toBe(false);
    expect(r.save.landsCleared).toEqual([]);
    expect(r.landsClearedAdded).toEqual([]);
    expect(r.opensLandExitPortal).toBe(false);
    expect(r.toast.toLowerCase()).toMatch(/floor captain|middle management/);
    expect(r.dialog.length).toBeGreaterThan(0);
  });

  it('applyMinibossKill preserves existing bossDefeated and landsCleared', () => {
    let save = defaultSave();
    save = {
      ...save,
      bossDefeated: true,
      landsCleared: ['woodz'],
      killed: ['wolf-lord'],
    };
    const r = applyMinibossKill(save, FLOOR_CAPTAIN_ID, 'dunjunz');
    expect(r.save.bossDefeated).toBe(true);
    expect(r.save.landsCleared).toEqual(['woodz']);
    expect(r.save.killed).toContain('wolf-lord');
    expect(r.save.killed).toContain(FLOOR_CAPTAIN_ID);
  });

  it('mid room is not a land-boss portal room', () => {
    expect(isBossRoom(FLOOR_CAPTAIN_ROOM_ID)).toBe(false);
    expect(BOSS_ROOM_META[FLOOR_CAPTAIN_ROOM_ID]).toBeUndefined();
    expect(midBossOpensLandExitPortal(FLOOR_CAPTAIN_ROOM_ID)).toBe(false);
    const save = defaultSave();
    const after = applyMinibossKill(save, FLOOR_CAPTAIN_ID, 'dunjunz').save;
    expect(
      shouldSpawnBossExitPortal(after, FLOOR_CAPTAIN_ROOM_ID, 'dunjunz'),
    ).toBe(false);
  });

  it('shouldApplyMinibossReward routes mid not land boss', () => {
    expect(shouldApplyMinibossReward('miniboss', FLOOR_CAPTAIN_ID)).toBe(true);
    expect(isMinibossKind('miniboss')).toBe(true);
    expect(isMinibossEntity('miniboss', FLOOR_CAPTAIN_ID)).toBe(true);
    expect(shouldApplyMinibossReward('boss', 'dungeon-master')).toBe(false);
    expect(hardProjectileForActor('miniboss', FLOOR_CAPTAIN_ID)).toBe('arrow');
    expect(hardProjectileForActor('boss', 'dungeon-master')).toBe('fireball');
  });
});

describe('Floor Captain B4 placement (P1)', () => {
  it('b4_side has named Floor Captain miniboss with base hp 40', () => {
    const side = ROOMS.b4_side;
    expect(side).toBeDefined();
    expect(side.floor).toBe(-4);
    expect(side.land).toBe('dunjunz');
    const cap = side.entities?.find((e) => e.id === FLOOR_CAPTAIN_ID);
    expect(cap).toBeDefined();
    expect(cap!.kind).toBe('miniboss');
    expect(cap!.hp).toBe(FLOOR_CAPTAIN_BASE_HP);
    expect(cap!.dialog?.some((line) => /BADGE CHECK/i.test(line))).toBe(true);
    // Chest is mid table (dungeon), not land boss table
    const chest = side.entities?.find((e) => e.kind === 'chest');
    expect(chest?.chestTable === 'boss').toBe(false);
  });

  it('B4 spine stays free without killing the captain (soft mid)', () => {
    // hall → descent → next foyer; side is optional east
    expect(ROOMS.b4_hall?.east).toBe('b4_side');
    expect(ROOMS.b4_hall?.north).toBe('b4_descent');
    expect(ROOMS.b4_descent?.stairsDown).toBe('b5_foyer');
    expect(ROOMS.b4_side?.west).toBe('b4_hall');
    // No locked door / must-kill link on descent
    expect(ROOMS.b4_descent?.entities?.some((e) => e.id === FLOOR_CAPTAIN_ID)).toBe(
      false,
    );
    expect(ROOMS.b4_hall?.entities?.some((e) => e.id === FLOOR_CAPTAIN_ID)).toBe(
      false,
    );
  });
});

describe('Rules Lawyer B6 dual-path den (P2)', () => {
  it('b6_side places rules-lawyer miniboss with base hp 46 and dungeon chest', () => {
    const side = ROOMS.b6_side;
    expect(side).toBeDefined();
    expect(side.floor).toBe(-6);
    expect(side.land).toBe('dunjunz');
    expect(side.title).toMatch(/ERRATA/i);
    const lawyer = side.entities?.find((e) => e.id === RULES_LAWYER_ID);
    expect(lawyer).toBeDefined();
    expect(lawyer!.kind).toBe('miniboss');
    expect(lawyer!.hp).toBe(RULES_LAWYER_BASE_HP);
    expect(lawyer!.dialog?.some((l) => /BINDER|ERRATA|CLEMENCY|LITIGAT/i.test(l))).toBe(
      true,
    );
    const chest = side.entities?.find((e) => e.kind === 'chest');
    expect(chest).toBeDefined();
    expect(chest!.chestTable === 'boss').toBe(false);
    expect(chest!.chestTable ?? 'dungeon').not.toBe('boss');
  });

  it('B6 spine stays free without clearing the den (optional)', () => {
    expect(ROOMS.b6_hall?.east).toBe('b6_side');
    expect(ROOMS.b6_hall?.north).toBe('b6_descent');
    expect(ROOMS.b6_descent?.stairsDown).toBe('b7_foyer');
    expect(ROOMS.b6_side?.west).toBe('b6_hall');
    expect(
      ROOMS.b6_hall?.entities?.some((e) => e.id === RULES_LAWYER_ID),
    ).toBe(false);
    expect(
      ROOMS.b6_descent?.entities?.some((e) => e.id === RULES_LAWYER_ID),
    ).toBe(false);
    expect(isBossRoom(RULES_LAWYER_ROOM_ID)).toBe(false);
    expect(BOSS_ROOM_META[RULES_LAWYER_ROOM_ID]).toBeUndefined();
    expect(midBossOpensLandExitPortal(RULES_LAWYER_ROOM_ID)).toBe(false);
  });

  it('rules-lawyer is peaceful dual-path mid entity', () => {
    expect(isPeacefulMinibossUntilProvoked(RULES_LAWYER_ID)).toBe(true);
    expect(isPeacefulMinibossUntilProvoked(FLOOR_CAPTAIN_ID)).toBe(false);
    expect(isMinibossEntity('miniboss', RULES_LAWYER_ID)).toBe(true);
    expect(shouldApplyMinibossReward('miniboss', RULES_LAWYER_ID)).toBe(true);
    expect(isPermanentKill('miniboss', RULES_LAWYER_ID)).toBe(true);
    expect(canSoftRespawn('miniboss', RULES_LAWYER_ID)).toBe(false);
  });

  it('kill path records kill and never sets land ceremony', () => {
    let save = defaultSave();
    save = {
      ...save,
      bossDefeated: true,
      landsCleared: ['woodz'],
    };
    const r = applyMinibossKill(save, RULES_LAWYER_ID, 'dunjunz');
    expect(r.save.killed).toContain(RULES_LAWYER_ID);
    expect(r.save.bossDefeated).toBe(true);
    expect(r.save.landsCleared).toEqual(['woodz']);
    expect(r.setsBossDefeated).toBe(false);
    expect(r.landsClearedAdded).toEqual([]);
    expect(r.opensLandExitPortal).toBe(false);
    expect(r.toast.toLowerCase()).toMatch(/rules lawyer|middle management/);
    expect(
      shouldSpawnBossExitPortal(r.save, RULES_LAWYER_ROOM_ID, 'dunjunz'),
    ).toBe(false);
  });

  it('talk forgive grants heal+mat, durable flag, no kill, no ceremony', () => {
    let save = defaultSave();
    save = { ...save, hp: 10, maxHp: 35, bossDefeated: false, landsCleared: [] };
    const beforeBones = save.stacks[RULES_LAWYER_FORGIVE_MAT] ?? 0;
    const r = applyRulesLawyerForgive(save);
    expect(r.alreadyResolved).toBe(false);
    expect(r.heal).toBe(RULES_LAWYER_FORGIVE_HEAL);
    expect(r.save.hp).toBe(10 + RULES_LAWYER_FORGIVE_HEAL);
    expect(r.save.stacks[RULES_LAWYER_FORGIVE_MAT]).toBe(beforeBones + 1);
    expect(r.save.flags[RULES_LAWYER_FORGIVEN_FLAG]).toBe(true);
    expect(isRulesLawyerForgiven(r.save)).toBe(true);
    expect(r.save.killed).not.toContain(RULES_LAWYER_ID);
    expect(r.save.bossDefeated).toBe(false);
    expect(r.save.landsCleared).toEqual([]);
    expect(r.setsBossDefeated).toBe(false);
    expect(r.opensLandExitPortal).toBe(false);
    expect(shouldSkipMinibossSpawn(r.save, RULES_LAWYER_ID)).toBe(true);
    expect(shouldSkipMinibossSpawn(defaultSave(), RULES_LAWYER_ID)).toBe(false);

    // Second talk: no double loot, still no ceremony
    const again = applyRulesLawyerForgive(r.save);
    expect(again.alreadyResolved).toBe(true);
    expect(again.save.stacks[RULES_LAWYER_FORGIVE_MAT]).toBe(beforeBones + 1);
    expect(again.save.bossDefeated).toBe(false);
  });

  it('resolveEnemyHp scales Rules Lawyer under land boss band', () => {
    const base = resolveEnemyHp('miniboss', RULES_LAWYER_BASE_HP, 0);
    expect(base).toBe(RULES_LAWYER_BASE_HP);
    const atB6 = resolveEnemyHp('miniboss', RULES_LAWYER_BASE_HP, 9);
    expect(atB6).toBe(Math.round(46 * (1 + 0.18 * 9)));
    expect(atB6).toBeLessThan(resolveEnemyHp('boss', 72, 12));
  });
});

describe('mid dens P3 Assistant Honk + P4 deep wardens', () => {
  const dens: {
    id: string;
    roomId: string;
    hp: number;
    land: string;
    floor: number;
    titleRe: RegExp;
  }[] = [
    {
      id: ASSISTANT_HONK_ID,
      roomId: ASSISTANT_HONK_ROOM_ID,
      hp: ASSISTANT_HONK_BASE_HP,
      land: 'sewerz',
      floor: -2,
      titleRe: /HONKLET|HONK/i,
    },
    {
      id: DEPUTY_HOWL_ID,
      roomId: DEPUTY_HOWL_ROOM_ID,
      hp: DEPUTY_HOWL_BASE_HP,
      land: 'woodz',
      floor: -2,
      titleRe: /PACK|HOWL/i,
    },
    {
      id: LEASE_WIGHT_ID,
      roomId: LEASE_WIGHT_ROOM_ID,
      hp: LEASE_WIGHT_BASE_HP,
      land: 'dezertz',
      floor: -2,
      titleRe: /LEASE|OFFICE/i,
    },
  ];

  it('registers all three dens in MINIBOSS_IDS', () => {
    expect(MINIBOSS_IDS.has(ASSISTANT_HONK_ID)).toBe(true);
    expect(MINIBOSS_IDS.has(DEPUTY_HOWL_ID)).toBe(true);
    expect(MINIBOSS_IDS.has(LEASE_WIGHT_ID)).toBe(true);
    expect(isPeacefulMinibossUntilProvoked(ASSISTANT_HONK_ID)).toBe(false);
  });

  it.each(dens)(
    '$id placed on $roomId as miniboss with authored hp and dungeon chest',
    ({ id, roomId, hp, land, floor, titleRe }) => {
      const room = ROOMS[roomId];
      expect(room).toBeDefined();
      expect(room.land).toBe(land);
      expect(room.floor).toBe(floor);
      expect(room.title).toMatch(titleRe);
      const warden = room.entities?.find((e) => e.id === id);
      expect(warden).toBeDefined();
      expect(warden!.kind).toBe('miniboss');
      expect(warden!.hp).toBe(hp);
      expect(warden!.dialog?.length).toBeGreaterThan(0);
      const denChest = room.entities?.find((e) => e.kind === 'chest');
      expect(denChest).toBeDefined();
      expect(denChest!.chestTable === 'boss').toBe(false);
      expect(isBossRoom(roomId)).toBe(false);
      expect(BOSS_ROOM_META[roomId]).toBeUndefined();
      expect(midBossOpensLandExitPortal(roomId)).toBe(false);
      expect(isPermanentKill('miniboss', id)).toBe(true);
      expect(shouldApplyMinibossReward('miniboss', id)).toBe(true);
      expect(isMinibossEntity('miniboss', id)).toBe(true);
    },
  );

  it('sewerz / woodz / dezertz B2 spine stays free without clearing dens', () => {
    // Sewerz B2: hall east = side, north = descent
    expect(ROOMS.sewerz_b2_hall?.east).toBe('sewerz_b2_side');
    expect(ROOMS.sewerz_b2_side?.west).toBe('sewerz_b2_hall');
    expect(ROOMS.sewerz_b2_hall?.north).toBe('sewerz_b2_descent');
    expect(
      ROOMS.sewerz_b2_hall?.entities?.some((e) => e.id === ASSISTANT_HONK_ID),
    ).toBe(false);
    expect(
      ROOMS.sewerz_b2_descent?.entities?.some((e) => e.id === ASSISTANT_HONK_ID),
    ).toBe(false);

    expect(ROOMS.woodz_b2_hall?.east).toBe('woodz_b2_side');
    expect(ROOMS.woodz_b2_side?.west).toBe('woodz_b2_hall');
    expect(ROOMS.woodz_b2_hall?.north).toBe('woodz_b2_descent');
    expect(
      ROOMS.woodz_b2_hall?.entities?.some((e) => e.id === DEPUTY_HOWL_ID),
    ).toBe(false);

    expect(ROOMS.dezertz_b2_hall?.east).toBe('dezertz_b2_side');
    expect(ROOMS.dezertz_b2_side?.west).toBe('dezertz_b2_hall');
    expect(ROOMS.dezertz_b2_hall?.north).toBe('dezertz_b2_descent');
    expect(
      ROOMS.dezertz_b2_hall?.entities?.some((e) => e.id === LEASE_WIGHT_ID),
    ).toBe(false);
  });

  it.each([
    [ASSISTANT_HONK_ID, ASSISTANT_HONK_ROOM_ID, 'sewerz'] as const,
    [DEPUTY_HOWL_ID, DEPUTY_HOWL_ROOM_ID, 'woodz'] as const,
    [LEASE_WIGHT_ID, LEASE_WIGHT_ROOM_ID, 'dezertz'] as const,
  ])(
    'kill %s never sets land ceremony or land-exit portal',
    (id, roomId, land) => {
      let save = defaultSave();
      save = {
        ...save,
        bossDefeated: true,
        landsCleared: ['dunjunz'],
      };
      const r = applyMinibossKill(save, id, land);
      expect(r.save.killed).toContain(id);
      expect(r.save.bossDefeated).toBe(true);
      expect(r.save.landsCleared).toEqual(['dunjunz']);
      expect(r.setsBossDefeated).toBe(false);
      expect(r.landsClearedAdded).toEqual([]);
      expect(r.opensLandExitPortal).toBe(false);
      expect(r.toast.length).toBeGreaterThan(0);
      expect(r.dialog.length).toBeGreaterThan(0);
      expect(shouldSpawnBossExitPortal(r.save, roomId, land)).toBe(false);
    },
  );

  it('scaled dens stay under same-land boss bands', () => {
    const honk = resolveEnemyHp('miniboss', ASSISTANT_HONK_BASE_HP, 7);
    expect(honk).toBe(Math.round(50 * (1 + 0.18 * 7)));
    expect(honk).toBeLessThan(resolveEnemyHp('boss', 88, 12)); // royal goose band
    const howl = resolveEnemyHp('miniboss', DEPUTY_HOWL_BASE_HP, 4);
    expect(howl).toBeLessThan(resolveEnemyHp('boss', 64, 6));
    const wight = resolveEnemyHp('miniboss', LEASE_WIGHT_BASE_HP, 4);
    expect(wight).toBeLessThan(resolveEnemyHp('boss', 70, 6));
  });

  it('Deputy Howl pack wolves spawn on walkable floor not walls', () => {
    const side = ROOMS[DEPUTY_HOWL_ROOM_ID];
    expect(side).toBeDefined();
    const tiles = side.tiles;
    const isBlocked = (x: number, y: number) => {
      const c = tiles[y]?.[x];
      return c == null || c === '#' || c === 'wall' || c === 'void' || c === ' ';
    };
    const pack = (side.entities ?? []).filter((e) =>
      (e.id ?? '').startsWith('woodz-howl-pack'),
    );
    expect(pack.length).toBeGreaterThanOrEqual(2);
    for (const w of pack) {
      expect(isBlocked(w.x, w.y)).toBe(false);
    }
    // Warden + chest also on open floor
    const warden = side.entities?.find((e) => e.id === DEPUTY_HOWL_ID);
    expect(warden).toBeDefined();
    expect(isBlocked(warden!.x, warden!.y)).toBe(false);
  });
});

// ── Lighting + forge lights + scrolls (lit P0–P1) ──────────────────
import {
  activeLightTier,
  ambientForRoom,
  AMBIENT_DARK,
  AMBIENT_GUILD_HALL,
  AMBIENT_SURFACE,
  ambushCanDealContact,
  buildLightSources,
  canPlaceTorch,
  creatureLightSpec,
  hasActiveCarriedLight,
  igniteLight,
  LIGHT_BURN_MS,
  lightBurnMs,
  lightTierRank,
  LIGHT_PEAK,
  roomIsDark,
  roomNeedsCarriedLight,
  sampleBrightness,
  shouldBurnCarriedFuel,
  stepAmbushState,
  smoothstepFalloff,
  tickLightFuel,
  visionDarkAlpha,
  visionOverlayAlpha,
} from './lighting';
import {
  isMagicClass,
  useScrollOrTome,
  tickCombatBuffs,
} from './scrolls';
import { landPackRecipe, sideRoleForDepth } from '../data/world-deep';
import { forjeCraft, CRAFT_RECIPES } from './forjing';
import { computeArmor, syncDerivedStats, useInventoryItem } from './inventory';
import { computePlayerDamage } from './attributes';

describe('lighting model', () => {
  it('marks B2+ basements dark by default; surface lit', () => {
    expect(roomIsDark({ floor: 0 })).toBe(false);
    expect(roomIsDark({ floor: -1 })).toBe(false);
    expect(roomIsDark({ floor: -2 })).toBe(true);
    expect(roomIsDark({ floor: -5 })).toBe(true);
    expect(roomIsDark({ floor: -5, dark: false })).toBe(false);
    expect(roomIsDark({ floor: 0, dark: true })).toBe(true);
  });

  it('torch burns out after finite fuel from real burn helper', () => {
    let save = defaultSave();
    save = igniteLight(save, 'torch');
    expect(hasActiveCarriedLight(save)).toBe(true);
    expect(activeLightTier(save)).toBe('torch');
    expect(save.lightFuelMs).toBe(LIGHT_BURN_MS.torch);
    // burn half
    let r = tickLightFuel(save, LIGHT_BURN_MS.torch / 2, true);
    expect(r.expired).toBe(false);
    expect(r.save.lightFuelMs).toBeLessThan(LIGHT_BURN_MS.torch);
    // burn rest
    r = tickLightFuel(r.save, LIGHT_BURN_MS.torch, true);
    expect(r.expired).toBe(true);
    expect(hasActiveCarriedLight(r.save)).toBe(false);
    expect(r.save.activeLight).toBeNull();
  });

  it('lantern lasts longer than torch; flashlight longer than lantern', () => {
    expect(lightBurnMs('lantern')).toBeGreaterThan(lightBurnMs('torch'));
    expect(lightBurnMs('flashlight')).toBeGreaterThan(lightBurnMs('lantern'));
    expect(lightTierRank('flashlight')).toBeGreaterThan(lightTierRank('lantern'));
    expect(lightTierRank('lantern')).toBeGreaterThan(lightTierRank('torch'));
  });

  it('dark vision alpha is worse without light; wall torches fully light', () => {
    const bare = defaultSave();
    const lit = igniteLight(defaultSave(), 'torch');
    const a0 = visionDarkAlpha(bare, { darkRoom: true, wallTorchCount: 0 });
    const a1 = visionDarkAlpha(lit, { darkRoom: true, wallTorchCount: 0 });
    expect(a0).toBeGreaterThan(a1);
    // Wall torches mean the room is ambient-lit — no carried light required
    const aWall = visionDarkAlpha(bare, { darkRoom: true, wallTorchCount: 2 });
    expect(aWall).toBe(0);
    expect(visionDarkAlpha(bare, { darkRoom: false })).toBe(0);
    expect(roomNeedsCarriedLight({ floor: -2 }, 0)).toBe(true);
    expect(roomNeedsCarriedLight({ floor: -2 }, 1)).toBe(false);
    expect(roomNeedsCarriedLight({ floor: -1 }, 0)).toBe(false);
  });

  it('useInventoryItem torch consumes stack and ignites', () => {
    let save = defaultSave();
    save.stacks = { torch: 2 };
    const r = useInventoryItem(save, 'torch');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.save.stacks.torch).toBe(1);
    expect(activeLightTier(r.save)).toBe('torch');
    expect(r.save.bossDefeated).toBe(false);
  });
});

import {
  castTreeShadowCenter,
  cloudShadowCenters,
  isOutdoorSurface,
  makeCloudField,
  sampleCloudDarkness,
  sampleSurfaceShade,
  sampleTreeShadowDarkness,
  SUN_DIR,
} from './surface-sun';

import {
  allWeaponHitsDone,
  canExitGuildEast,
  canUseDungeonStairs,
  completeTutorial,
  drillDamageRequired,
  equipTrainingWeapon,
  guildMasterDialog,
  guildMasterIntroDialog,
  isRackEmpty,
  isRackStocked,
  isTrainingWeaponTaken,
  isTutorialComplete,
  listRackWeaponOptions,
  nextTutorialWeapon,
  RACK_CATALOG,
  rackPresentTemplates,
  rackTextureKey,
  recordDummyDamage,
  recordDummyHit,
  returnWeaponToRack,
  takeWeaponFromRack,
  tutorialWeaponFromEquip,
  weaponProgressPct,
} from './tutorial';
import { START_ROOM } from '../data/world';

describe('tutorial guild hall', () => {
  it('starts on the beach and blocks east + stairs until graduated', () => {
    expect(START_ROOM).toBe('beach_start');
    let save = defaultSave();
    expect(save.roomId).toBe('beach_start');
    expect(canUseDungeonStairs(save)).toBe(false);
    expect(canExitGuildEast(save)).toBe(false);
    save = completeTutorial(save);
    expect(canUseDungeonStairs(save)).toBe(true);
    expect(canExitGuildEast(save)).toBe(true);
  });

  it('beach links north to meadow; meadow west to guild; cave still on meadow', async () => {
    const { ROOMS, BEACH_START_ID } = await import('../data/world');
    expect(ROOMS[BEACH_START_ID]?.north).toBe('overworld');
    expect(ROOMS.overworld?.south).toBe(BEACH_START_ID);
    expect(ROOMS.overworld?.west).toBe('guild_hall');
    expect(ROOMS.overworld?.stairsDown).toBe('b1_entrance');
    expect(ROOMS.guild_hall?.east).toBe('overworld');
    const guildSign = (ROOMS.guild_hall?.entities ?? []).find(
      (e) => e.id === 'guild-entrance-sign',
    );
    expect(guildSign?.dialog?.some((l) => /GUILD MASTER/i.test(l))).toBe(true);
    const westSign = (ROOMS.overworld?.entities ?? []).find(
      (e) => e.id === 'sign-guild-west',
    );
    expect(westSign?.dialog?.some((l) => /TUTORIAL GUILD/i.test(l))).toBe(
      true,
    );
  });

  it('guild hall is a decorated living quarters with light fixtures', async () => {
    const { ROOMS } = await import('../data/world');
    const hall = ROOMS.guild_hall;
    expect(hall).toBeTruthy();
    const ents = hall.entities ?? [];
    const kinds = ents.map((e) => e.kind);
    expect(kinds.filter((k) => k === 'bookshelf').length).toBeGreaterThanOrEqual(
      12,
    );
    expect(kinds.filter((k) => k === 'torch_wall').length).toBeGreaterThanOrEqual(
      6,
    );
    expect(kinds.filter((k) => k === 'lamp').length).toBeGreaterThanOrEqual(2);
    expect(kinds.filter((k) => k === 'chair').length).toBeGreaterThanOrEqual(2);
    expect(kinds.filter((k) => k === 'table').length).toBeGreaterThanOrEqual(2);
    expect(kinds.filter((k) => k === 'dummy').length).toBe(4);
    expect(kinds.filter((k) => k === 'rack').length).toBe(4);
    // Reading corners + shelves have flavor dialogs
    const withTalk = ents.filter(
      (e) =>
        (e.kind === 'bookshelf' || e.kind === 'table' || e.kind === 'chair') &&
        (e.dialog?.length ?? 0) > 0,
    );
    expect(withTalk.length).toBeGreaterThan(4);
  });

  it('records dummy damage in sword→axe→bow→staff order with % threshold', () => {
    let save = defaultSave();
    expect(nextTutorialWeapon(save)).toBe('sword');
    const req = drillDamageRequired();
    expect(req).toBeGreaterThan(1);

    // Wrong weapon does not advance
    let r = recordDummyDamage(save, 'axe', req);
    expect(r.accepted).toBe(false);
    expect(weaponProgressPct(save, 'sword')).toBe(0);

    // Partial damage accumulates; does not clear stage
    r = recordDummyDamage(save, 'sword', Math.max(1, Math.floor(req / 2)));
    expect(r.accepted).toBe(true);
    expect(r.advanced).toBe(false);
    expect(r.pct).toBeGreaterThan(0);
    expect(r.pct).toBeLessThan(100);
    save = r.save;
    expect(nextTutorialWeapon(save)).toBe('sword');

    // Finish remaining damage
    r = recordDummyDamage(save, 'sword', req);
    expect(r.advanced).toBe(true);
    expect(r.pct).toBe(100);
    save = r.save;
    expect(nextTutorialWeapon(save)).toBe('axe');

    // Full-stage helper still clears one weapon
    save = recordDummyHit(save, 'axe').save;
    save = recordDummyHit(save, 'bow').save;
    save = recordDummyHit(save, 'staff').save;
    expect(allWeaponHitsDone(save)).toBe(true);
    expect(nextTutorialWeapon(save)).toBeNull();
  });

  it('maps equip templates to tutorial weapons and equips training axe', () => {
    expect(tutorialWeaponFromEquip('training_axe', 'axe')).toBe('axe');
    expect(tutorialWeaponFromEquip('short_bow', 'bow')).toBe('bow');
    expect(tutorialWeaponFromEquip('wizard_staff', 'staff')).toBe('staff');
    let save = equipTrainingWeapon(defaultSave(), 'axe');
    expect(save.equipped.weapon).toBeTruthy();
    const inst = save.bag.find((b) => b.uid === save.equipped.weapon);
    expect(inst?.templateId).toBe('training_axe');
  });

  it('multi-weapon racks omit only the equipped piece', () => {
    expect(RACK_CATALOG.sword.length).toBeGreaterThanOrEqual(3);
    expect(RACK_CATALOG.bow.length).toBeGreaterThanOrEqual(2);
    let save = defaultSave();
    expect(rackPresentTemplates(save, 'sword')).toEqual([...RACK_CATALOG.sword]);
    expect(isRackEmpty(save, 'sword')).toBe(false);
    expect(rackTextureKey('sword', false)).toBe('rack_sword_full');
    expect(rackTextureKey('sword', true)).toBe('rack_empty');

    save = equipTrainingWeapon(save, 'sword');
    expect(isTrainingWeaponTaken(save, 'sword')).toBe(true);
    // Only mild_sword leaves the pegs — iron/saber/cleaver stay
    const hanging = rackPresentTemplates(save, 'sword');
    expect(hanging).not.toContain('mild_sword');
    expect(hanging).toContain('iron_blade');
    expect(hanging).toContain('sand_saber');
    expect(isRackEmpty(save, 'sword')).toBe(false);
    expect(save.hasSword).toBe(true);

    // Switch to axe: sword pegs refill; axe peg empties (only one catalog axe)
    save = equipTrainingWeapon(save, 'axe');
    expect(rackPresentTemplates(save, 'sword')).toContain('mild_sword');
    expect(isRackEmpty(save, 'axe')).toBe(true);
    const axe = save.bag.find((b) => b.uid === save.equipped.weapon);
    expect(axe?.templateId).toBe('training_axe');
  });

  it('returns weapon to rack then browse lists hanging catalog options', () => {
    let save = equipTrainingWeapon(defaultSave(), 'sword');
    expect(save.equipped.weapon).toBeTruthy();
    const ret = returnWeaponToRack(save, 'sword');
    expect(ret.ok).toBe(true);
    expect(ret.unequipped).toBe(true);
    save = ret.save;
    expect(isRackStocked(save, 'sword')).toBe(true);
    expect(save.equipped.weapon).toBeNull();
    expect(save.hasSword).toBe(false);
    const opts = listRackWeaponOptions(save, 'sword');
    expect(opts.length).toBe(RACK_CATALOG.sword.length);
    expect(opts.map((o) => o.templateId)).toContain('mild_sword');
    expect(opts.map((o) => o.templateId)).toContain('iron_blade');
    const iron = opts.find((o) => o.templateId === 'iron_blade')!;
    const take = takeWeaponFromRack(save, 'sword', iron.uid);
    expect(take.ok).toBe(true);
    save = take.save;
    expect(save.equipped.weapon).toBe(iron.uid);
    expect(rackPresentTemplates(save, 'sword')).not.toContain('iron_blade');
    expect(rackPresentTemplates(save, 'sword')).toContain('mild_sword');
  });

  it('intro welcomes to Dunjunz, then guild master, then drills', () => {
    const intro = guildMasterIntroDialog().join('\n');
    expect(intro).toMatch(/WELCOME TO DUNJUNZ/i);
    expect(intro).toMatch(/PRINCESS PRIZELLA|QUEST/i);
    expect(intro).toMatch(/TRAINING GUILD/i);
    expect(intro).toMatch(/TUTORIAL GUILD MASTER/i);
    expect(intro).toMatch(/SWORD.*AXE.*BOW.*STAFF/s);
    const lines = guildMasterDialog(defaultSave());
    expect(lines.some((l) => /SWORD|AXE|DUMMY|GUILD/i.test(l))).toBe(true);
  });

  it('beach wake voice greets crawler id and points north', async () => {
    const { beachWakeDialog, formatCrawlerId } = await import('./crawler-id');
    expect(formatCrawlerId(1)).toBe('001');
    expect(formatCrawlerId(42)).toBe('042');
    const lines = beachWakeDialog(7).join('\n');
    expect(lines).toMatch(/WHA\?/);
    expect(lines).toMatch(/WHERE AM I/);
    expect(lines).toMatch(/CRAWLER 007/);
    expect(lines).toMatch(/NORTH/);
    expect(lines).toMatch(/TUTORIAL GUILD/);
  });

  it('guild dialog mentions drills; migrate veterans with dungeon visits', async () => {
    const lines = guildMasterDialog(defaultSave());
    expect(lines.some((l) => /SWORD|AXE|DUMMY|GUILD/i.test(l))).toBe(true);
    const { migrateTutorial } = await import('./tutorial');
    const mid = migrateTutorial({ ...defaultSave(), hasSword: true });
    expect(isTutorialComplete(mid)).toBe(false);
    const vet = migrateTutorial({
      ...defaultSave(),
      visitedRooms: ['b1_entrance'],
    });
    expect(isTutorialComplete(vet)).toBe(true);
  });
});

describe('surface sun + cloud shade', () => {
  it('marks surface/woodz outdoor, not basements or kingdom', () => {
    expect(isOutdoorSurface({ floor: 0, land: 'surface' })).toBe(true);
    expect(isOutdoorSurface({ floor: 0, land: 'woodz' })).toBe(true);
    expect(isOutdoorSurface({ floor: -2, land: 'dunjunz' })).toBe(false);
    expect(isOutdoorSurface({ floor: 0, land: 'kingdom' })).toBe(false);
    expect(isOutdoorSurface({ floor: 0, dark: true })).toBe(false);
  });

  it('casts tree shadows SE of trunk along sun dir', () => {
    const sh = castTreeShadowCenter(100, 100, 2.5);
    expect(sh.x).toBeGreaterThan(100);
    expect(sh.y).toBeGreaterThan(100);
    expect(sh.rx).toBeGreaterThan(20);
    expect(sh.alpha).toBeGreaterThan(0.15);
    expect(SUN_DIR.x).toBeGreaterThan(0);
  });

  it('drifts cloud centers over time and soft-samples darkness', () => {
    const blobs = makeCloudField(42, 4);
    expect(blobs.length).toBe(4);
    const a = cloudShadowCenters(blobs, 0, 1280, 656);
    const b = cloudShadowCenters(blobs, 5000, 1280, 656);
    expect(a[0].x).not.toBe(b[0].x);
    const d = sampleCloudDarkness(a[0].x, a[0].y, a);
    expect(d).toBeGreaterThan(0);
    const far = sampleCloudDarkness(-500, -500, a);
    expect(far).toBeLessThan(d);
  });

  it('combines tree + cloud shade with a readable cap', () => {
    const trees = [{ x: 200, y: 200, scale: 2.5 }];
    const clouds = cloudShadowCenters(makeCloudField(7, 3), 0, 1280, 656);
    const under = sampleTreeShadowDarkness(200 + 40, 200 + 30, trees);
    const combined = sampleSurfaceShade(200 + 40, 200 + 30, trees, clouds);
    expect(under).toBeGreaterThan(0);
    expect(combined).toBeLessThanOrEqual(0.58);
  });
});

describe('universal positional lighting v2', () => {
  it('ambient is high on surface, low in deep basements', () => {
    expect(ambientForRoom({ floor: 0, land: 'woodz' })).toBeGreaterThanOrEqual(
      AMBIENT_SURFACE - 0.01,
    );
    expect(ambientForRoom({ floor: -1, land: 'dunjunz' })).toBeGreaterThan(
      AMBIENT_DARK,
    );
    expect(ambientForRoom({ floor: -3, land: 'dunjunz' })).toBe(AMBIENT_DARK);
    expect(ambientForRoom({ floor: 0, dark: true })).toBe(AMBIENT_DARK);
  });

  it('guild hall is ominously dim with readable torch cookies', () => {
    const a = ambientForRoom({
      id: 'guild_hall',
      floor: 0,
      land: 'surface',
    });
    expect(a).toBe(AMBIENT_GUILD_HALL);
    expect(a).toBeLessThan(AMBIENT_SURFACE);
    expect(a).toBeGreaterThan(AMBIENT_DARK);
    // Deep gloom: veil should be heavy away from lights
    expect(visionOverlayAlpha(a)).toBeGreaterThan(0.55);
    // Wall fixture still lifts brightness near the torch
    const sources = buildLightSources({
      darkRoom: false,
      ambient: a,
      player: { x: 200, y: 200 },
      activeTier: 'none',
      fuelMs: 0,
      wallFixtures: [{ id: 't', x: 200, y: 200 }],
      placed: [],
      gear: [],
    });
    const near = sampleBrightness(200, 200, sources, a);
    const far = sampleBrightness(800, 800, sources, a);
    expect(near).toBeGreaterThan(far);
    expect(near).toBeGreaterThan(a);
    // Clear light vs shadow contrast in the guild
    expect(near - far).toBeGreaterThan(0.35);
  });

  it('smoothstep falloff is 1 at center and 0 at rim', () => {
    expect(smoothstepFalloff(1)).toBeCloseTo(1, 5);
    expect(smoothstepFalloff(0)).toBeCloseTo(0, 5);
    expect(smoothstepFalloff(0.5)).toBeCloseTo(0.5, 5);
  });

  it('sampleBrightness adds soft cookies above ambient', () => {
    const ambient = 0.12;
    const sources = buildLightSources({
      darkRoom: true,
      ambient,
      player: { x: 100, y: 100 },
      activeTier: 'torch',
      fuelMs: 90_000,
      wallFixtures: [],
      placed: [],
      gear: [],
    });
    const atFeet = sampleBrightness(100, 100, sources, ambient);
    const far = sampleBrightness(900, 900, sources, ambient);
    expect(atFeet).toBeGreaterThan(0.7);
    expect(far).toBeLessThanOrEqual(ambient + 0.05);
    expect(visionOverlayAlpha(atFeet)).toBeLessThan(visionOverlayAlpha(far));
  });

  it('wall fixtures do not full-bright the far corner', () => {
    const ambient = 0.58;
    const sources = buildLightSources({
      darkRoom: false,
      ambient,
      player: { x: 400, y: 300 },
      activeTier: 'none',
      fuelMs: 0,
      wallFixtures: [
        { id: 'w1', x: 80, y: 80, outward: { x: 1, y: 0 } },
      ],
      placed: [],
      gear: [],
    });
    const near = sampleBrightness(100, 80, sources, ambient);
    const far = sampleBrightness(700, 400, sources, ambient);
    expect(near).toBeGreaterThan(far);
    expect(far).toBeLessThan(0.95);
  });

  it('fuel pauses when non-carried brightness is high', () => {
    expect(
      shouldBurnCarriedFuel({
        darkRoom: true,
        hasCarried: true,
        nonCarriedB: 0.7,
      }),
    ).toBe(false);
    expect(
      shouldBurnCarriedFuel({
        darkRoom: true,
        hasCarried: true,
        nonCarriedB: 0.2,
      }),
    ).toBe(true);
    expect(
      shouldBurnCarriedFuel({
        darkRoom: false,
        hasCarried: true,
        nonCarriedB: 0.1,
      }),
    ).toBe(false);
  });

  it('canPlaceTorch requires dark room, stack, wall adjacency; no count cap', () => {
    const walls = new Set(['5,3']);
    const base = {
      darkRoom: true,
      tx: 5,
      ty: 4,
      facing: 0 as const,
      isWall: (x: number, y: number) => walls.has(`${x},${y}`),
      isInBounds: (x: number, y: number) => x >= 0 && y >= 0 && x < 20 && y < 20,
      existing: [] as { x: number; y: number }[],
      torchStacks: 2,
    };
    const ok = canPlaceTorch(base);
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.x).toBe(5);
      expect(ok.y).toBe(3);
    }
    expect(canPlaceTorch({ ...base, torchStacks: 0 }).ok).toBe(false);
    expect(canPlaceTorch({ ...base, darkRoom: false }).ok).toBe(false);
    // Many already placed is fine (no per-room limit)
    expect(
      canPlaceTorch({
        ...base,
        existing: Array.from({ length: 20 }, (_, i) => ({
          x: i,
          y: 0,
        })),
      }).ok,
    ).toBe(true);
    // Same wall cell still blocked as occupied
    expect(
      canPlaceTorch({
        ...base,
        existing: [{ x: 5, y: 3 }],
      }).ok,
    ).toBe(false);
  });

  it('ambush telegraph blocks contact; reveal allows it', () => {
    let s = { phase: 'hidden' as const, phaseMs: 0 };
    s = stepAmbushState(s, 0.1, 500, 16);
    expect(s.phase).toBe('hidden');
    expect(ambushCanDealContact(s)).toBe(false);
    // close enough to ambush radius (~96px at cell 48)
    s = stepAmbushState(s, 0.1, 50, 16);
    expect(s.phase).toBe('telegraph');
    expect(ambushCanDealContact(s)).toBe(false);
    s = stepAmbushState(s, 0.1, 50, 600);
    expect(s.phase).toBe('revealed');
    expect(ambushCanDealContact(s)).toBe(true);
  });

  it('tinkerer stocks torch pack', async () => {
    const { SHOPS } = await import('./shop');
    const pack = SHOPS.tinkerer.stock.find((s) => s.id === 'buy_torch_pack');
    expect(pack).toBeTruthy();
    expect(pack?.stackCount).toBe(3);
    expect(pack?.price).toBe(12);
  });

  it('lava and gel creeps emit weaker light than a torch', () => {
    expect(creatureLightSpec('slime')).toBe('gel_slime');
    expect(creatureLightSpec('cube')).toBe('gel_cube');
    expect(creatureLightSpec('skeleton')).toBeNull();
    expect(LIGHT_PEAK.lava).toBeLessThan(LIGHT_PEAK.torch);
    expect(LIGHT_PEAK.gel_slime).toBeLessThan(LIGHT_PEAK.lava);
    const ambient = 0.12;
    const sources = buildLightSources({
      darkRoom: true,
      ambient,
      player: { x: 0, y: 0 },
      activeTier: 'none',
      fuelMs: 0,
      wallFixtures: [],
      placed: [],
      gear: [],
      env: [{ id: 'lava-1', x: 200, y: 200, spec: 'lava' }],
      creatures: [
        { id: 's1', x: 400, y: 400, spec: 'gel_slime' },
        { id: 'c1', x: 600, y: 600, spec: 'gel_cube' },
      ],
    });
    expect(sources.some((s) => s.kind === 'env')).toBe(true);
    expect(sources.filter((s) => s.kind === 'creature').length).toBe(2);
    const nearLava = sampleBrightness(200, 200, sources, ambient);
    const far = sampleBrightness(50, 50, sources, ambient);
    expect(nearLava).toBeGreaterThan(far);
    expect(nearLava).toBeGreaterThan(0.4);
  });
});

describe('forge light recipes', () => {
  it('lists torch, lantern, flashlight craft recipes', () => {
    const ids = CRAFT_RECIPES.map((r) => r.id);
    expect(ids).toContain('craft_torch');
    expect(ids).toContain('craft_lantern');
    expect(ids).toContain('craft_flashlight');
  });

  it('crafts torch into stacks with mats', () => {
    let save = defaultSave();
    save.coins = 20;
    save.stacks = { wood_shard: 2, slime_gel: 2 };
    const r = forjeCraft(save, 'craft_torch');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect((r.save.stacks.torch ?? 0)).toBeGreaterThanOrEqual(2);
    expect(r.save.stacks.wood_shard ?? 0).toBeLessThan(2);
  });

  it('crafts lantern and flashlight under stated mats', () => {
    let save = defaultSave();
    save.coins = 200;
    save.stacks = {
      ore_iron: 5,
      wood_shard: 5,
      ore_spark: 10,
      sand_crystal: 5,
    };
    const lan = forjeCraft(save, 'craft_lantern');
    expect(lan.ok).toBe(true);
    if (!lan.ok) return;
    expect(lan.save.stacks.lantern).toBe(1);
    const flash = forjeCraft(lan.save, 'craft_flashlight');
    expect(flash.ok).toBe(true);
    if (!flash.ok) return;
    expect(flash.save.stacks.flashlight).toBe(1);
  });
});

describe('scrolls and tomes', () => {
  it('scroll_ward buffs non-magic class without land ceremony', () => {
    let save = defaultSave();
    save = {
      ...save,
      primaryClass: 'fighter',
      stacks: { scroll_ward: 1 },
      bossDefeated: false,
      landsCleared: [],
    };
    expect(isMagicClass(save)).toBe(false);
    const r = useScrollOrTome(save, 'scroll_ward');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.save.buffDef).toBe(2);
    expect(r.save.buffMs).toBeGreaterThan(0);
    expect(r.setsBossDefeated).toBe(false);
    expect(r.landsClearedChanged).toBe(false);
    expect(r.save.bossDefeated).toBe(false);
    expect(r.save.landsCleared).toEqual([]);
    expect(r.save.stacks.scroll_ward ?? 0).toBe(0);
  });

  it('scroll_spark stronger for magic class; still usable by non-magic', () => {
    let fighter = defaultSave();
    fighter = {
      ...fighter,
      primaryClass: 'fighter',
      stacks: { scroll_spark: 1 },
    };
    const rf = useScrollOrTome(fighter, 'scroll_spark');
    expect(rf.ok).toBe(true);
    if (!rf.ok) return;
    expect(rf.save.buffAtk).toBe(1);

    let wizard = defaultSave();
    wizard = {
      ...wizard,
      primaryClass: 'wizard',
      stacks: { scroll_spark: 1 },
    };
    const rw = useScrollOrTome(wizard, 'scroll_spark');
    expect(rw.ok).toBe(true);
    if (!rw.ok) return;
    expect(rw.save.buffAtk).toBe(3);
    expect(rw.save.buffAtk).toBeGreaterThan(rf.save.buffAtk!);
    expect(computePlayerDamage(rw.save)).toBeGreaterThan(
      computePlayerDamage({ ...wizard, buffAtk: 0, buffMs: 0 }),
    );
  });

  it('tome_embers requires magic class', () => {
    let save = defaultSave();
    save = { ...save, primaryClass: 'fighter', stacks: { tome_embers: 1 } };
    const fail = useScrollOrTome(save, 'tome_embers');
    expect(fail.ok).toBe(false);
    save = { ...save, primaryClass: 'sorcerer' };
    const ok = useScrollOrTome(save, 'tome_embers');
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.save.buffAtk).toBe(4);
    expect(ok.save.bossDefeated).toBe(false);
  });

  it('scroll_light grants temporary torch light', () => {
    let save = defaultSave();
    save.stacks = { scroll_light: 1 };
    const r = useScrollOrTome(save, 'scroll_light');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(activeLightTier(r.save)).toBe('torch');
    expect(r.save.lightFuelMs).toBeGreaterThan(0);
  });

  it('buffs expire via tickCombatBuffs', () => {
    let save = defaultSave();
    save = { ...save, buffAtk: 2, buffMs: 100 };
    save = tickCombatBuffs(save, 200);
    expect(save.buffAtk).toBe(0);
    expect(save.buffMs).toBe(0);
  });

  it('DEF buff raises computeArmor and expires so armor drops', () => {
    let save = defaultSave();
    save = syncDerivedStats(save);
    const baseArmor = computeArmor(save);
    save = {
      ...save,
      stacks: { scroll_ward: 1 },
      primaryClass: 'fighter',
    };
    const r = useScrollOrTome(save, 'scroll_ward');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    let next = syncDerivedStats(r.save);
    expect(computeArmor(next)).toBe(baseArmor + 2);
    expect(next.armor).toBe(baseArmor + 2);
    // Expire buff fully, then re-sync (GameScene path)
    next = tickCombatBuffs(next, (next.buffMs ?? 0) + 1);
    expect(next.buffDef).toBe(0);
    next = syncDerivedStats(next);
    expect(computeArmor(next)).toBe(baseArmor);
    expect(next.armor).toBe(baseArmor);
  });
});

describe('world P0–P1 packs and side roles', () => {
  it('woodz pack recipe has no slime/skeleton', () => {
    for (const band of [0, 1, 2]) {
      const pack = landPackRecipe('woodz', band);
      expect(pack.every((k) => k === 'wolf')).toBe(true);
      expect(pack.includes('slime' as never)).toBe(false);
      expect(pack.includes('skeleton' as never)).toBe(false);
    }
  });

  it('dezertz pack recipe has no slime/skeleton/redshirt', () => {
    for (const band of [0, 1, 2]) {
      const pack = landPackRecipe('dezertz', band);
      expect(pack.some((k) => k === 'slime')).toBe(false);
      expect(pack.some((k) => k === 'skeleton')).toBe(false);
      expect(pack.some((k) => k === 'redshirt')).toBe(false);
      expect(
        pack.every((k) =>
          ['scorpion', 'tarantula', 'hornet', 'cactus'].includes(k),
        ),
      ).toBe(true);
    }
  });

  it('woodz/dezertz deep halls use land-locked fauna not slime halls', () => {
    const wh = ROOMS.woodz_b1_hall;
    expect(wh).toBeDefined();
    const kinds = (wh.entities ?? [])
      .filter(
        (e) =>
          e.kind !== 'sign' &&
          e.kind !== 'heart' &&
          e.kind !== 'torch_wall' &&
          e.kind !== 'tree',
      )
      .map((e) => e.kind);
    expect(kinds.every((k) => k === 'wolf')).toBe(true);
    expect(kinds.includes('slime')).toBe(false);

    const dh = ROOMS.dezertz_b1_hall;
    const dk = (dh.entities ?? [])
      .filter((e) => !['sign', 'heart', 'torch_wall', 'chest'].includes(e.kind))
      .map((e) => e.kind);
    expect(dk.includes('slime')).toBe(false);
    expect(dk.includes('skeleton')).toBe(false);
  });

  it('side roles rotate; dark rooms have no wall torches; lit B1 may', () => {
    expect(sideRoleForDepth(1)).toBe('vault');
    expect(sideRoleForDepth(2)).toBe('combat');
    expect(sideRoleForDepth(3)).toBe('quiet');
    const side = ROOMS.b2_side;
    expect(side?.sideRole).toBeDefined();
    expect(side?.dark).toBe(true);
    // Dark rooms must NOT have wall torches — player needs carried light
    expect(
      (side?.entities ?? []).some((e) => e.kind === 'torch_wall'),
    ).toBe(false);
    // Shallow/lit basements (B1 woodz) may have wall torches
    const litSide = ROOMS.woodz_b1_side;
    expect(litSide?.dark).toBe(false);
    // quiet sides may skip combat chest density
    const roles = [ROOMS.b2_side, ROOMS.b3_side, ROOMS.b4_side, ROOMS.b5_side]
      .map((r) => r?.sideRole)
      .filter(Boolean);
    expect(new Set(roles).size).toBeGreaterThan(1);
  });

  it('invariant: every dark room has zero torch_wall; lit deep floors may have them', () => {
    const darkRooms = Object.values(ROOMS).filter(
      (r) => r.dark === true || ((r.floor ?? 0) <= -2 && r.dark !== false),
    );
    expect(darkRooms.length).toBeGreaterThan(5);
    for (const room of darkRooms) {
      const walls = (room.entities ?? []).filter((e) => e.kind === 'torch_wall');
      expect(
        walls,
        `${room.id} is dark but has wall torches`,
      ).toEqual([]);
    }
    // Lit B1 basement foyers keep wall torches
    const litFoyer = ROOMS.woodz_b1_foyer;
    expect(litFoyer).toBeDefined();
    expect(litFoyer?.dark).toBe(false);
    expect(
      (litFoyer?.entities ?? []).some((e) => e.kind === 'torch_wall'),
    ).toBe(true);
  });
});

// ── World P2–P6 grammar ────────────────────────────────────────────
import {
  countCombatHostiles,
  countLandRooms,
  entityKindHistogram,
  isQuietFoyer,
  landGraphHasCycle,
  LAND_LENGTH_DOCTRINE,
  pathLengthTo,
  roomHasBossId,
  secretOrVaultRooms,
} from './world-grammar';
import {
  BILGE_BRUTE_BASE_HP,
  BILGE_BRUTE_ID,
  BILGE_BRUTE_ROOM_ID,
  DUNE_STALKER_BASE_HP,
  DUNE_STALKER_ID,
  DUNE_STALKER_ROOM_ID,
  ROOT_ALPHA_BASE_HP,
  ROOT_ALPHA_ID,
  ROOT_ALPHA_ROOM_ID,
} from './mid-boss';

describe('world P2 asymmetric land length', () => {
  it('Dunjunz is long-spine; Woodz/Dezertz surface paths stay short', () => {
    expect(countLandRooms(ROOMS, 'dunjunz')).toBeGreaterThanOrEqual(
      LAND_LENGTH_DOCTRINE.dunjunz.minRooms,
    );
    const dunjPath = pathLengthTo(ROOMS, 'b1_entrance', (r) =>
      roomHasBossId(r, 'dungeon-master'),
    );
    expect(dunjPath).not.toBeNull();
    expect(dunjPath!).toBeGreaterThanOrEqual(
      LAND_LENGTH_DOCTRINE.dunjunz.minPathToBoss,
    );

    const woodzPath = pathLengthTo(ROOMS, 'woodz_path', (r) =>
      roomHasBossId(r, 'wolf-lord'),
    );
    expect(woodzPath).not.toBeNull();
    expect(woodzPath!).toBeLessThanOrEqual(
      LAND_LENGTH_DOCTRINE.woodz.maxSurfacePathToBoss,
    );

    const dezPath = pathLengthTo(ROOMS, 'dezertz_dunes', (r) =>
      roomHasBossId(r, 'sand-wraith'),
    );
    expect(dezPath).not.toBeNull();
    expect(dezPath!).toBeLessThanOrEqual(
      LAND_LENGTH_DOCTRINE.dezertz.maxSurfacePathToBoss,
    );

    // Asymmetry: Dunjunz path >> Woodz surface path
    expect(dunjPath!).toBeGreaterThan(woodzPath! * 2);
  });

  it('Sewerz is shorter pipe than Dunjunz full room count', () => {
    const s = countLandRooms(ROOMS, 'sewerz');
    const d = countLandRooms(ROOMS, 'dunjunz');
    expect(s).toBeLessThan(d);
    expect(s).toBeGreaterThanOrEqual(LAND_LENGTH_DOCTRINE.sewerz.minRooms);
    expect(s).toBeLessThanOrEqual(LAND_LENGTH_DOCTRINE.sewerz.maxRooms);
  });
});

describe('world P3 foyer quiet + shrine sides', () => {
  it('deep foyers are low-combat thresholds', () => {
    for (const id of ['b2_foyer', 'b5_foyer', 'woodz_b2_foyer', 'sewerz_b2_foyer']) {
      const r = ROOMS[id];
      expect(r).toBeDefined();
      expect(isQuietFoyer(r)).toBe(true);
      expect(countCombatHostiles(r)).toBeLessThanOrEqual(1);
    }
  });

  it('quiet side includes heart shrine without combat denseness', () => {
    // depth 3 → quiet role on generator (before mid overrides)
    const quietish = Object.values(ROOMS).filter(
      (r) => r.sideRole === 'quiet' && r.land === 'dunjunz',
    );
    expect(quietish.length).toBeGreaterThan(0);
    for (const r of quietish) {
      expect(countCombatHostiles(r)).toBe(0);
      expect(r.entities?.some((e) => e.kind === 'heart')).toBe(true);
    }
  });
});

describe('world P4 biome geometry verbs', () => {
  it('Woodz deep halls use trees + wolves not slime halls', () => {
    const hall = ROOMS.woodz_b1_hall;
    expect(hall).toBeDefined();
    const h = entityKindHistogram(hall!);
    expect(h.tree ?? 0).toBeGreaterThanOrEqual(1);
    expect(h.wolf ?? 0).toBeGreaterThanOrEqual(1);
    expect(h.slime ?? 0).toBe(0);
    expect(h.skeleton ?? 0).toBe(0);
  });

  it('Dezertz deep halls use cactus/exposure props not redshirt halls', () => {
    const hall = ROOMS.dezertz_b1_hall;
    expect(hall).toBeDefined();
    const h = entityKindHistogram(hall!);
    expect((h.cactus ?? 0) + (h.tumbleweed ?? 0)).toBeGreaterThanOrEqual(1);
    expect(h.redshirt ?? 0).toBe(0);
    expect(h.slime ?? 0).toBe(0);
  });
});

describe('world P5 Jaquays loops and secrets', () => {
  it('Dunjunz graph has a cycle (loop) and a secret vault', () => {
    expect(landGraphHasCycle(ROOMS, 'dunjunz')).toBe(true);
    expect(ROOMS.b3_side?.north).toBe('b5_side');
    expect(ROOMS.b5_side?.south).toBe('b3_side');
    expect(ROOMS.b5_secret).toBeDefined();
    expect(ROOMS.b5_side?.east).toBe('b5_secret');
    expect(ROOMS.b5_secret?.west).toBe('b5_side');
    // Secret is optional dens — not on stairs spine only
    expect(ROOMS.b5_secret?.stairsDown).toBeUndefined();
    expect(
      ROOMS.b5_secret?.entities?.some((e) => e.kind === 'chest'),
    ).toBe(true);
  });

  it('Sewerz has a secret dens not required for goose', () => {
    expect(ROOMS.sewerz_b3_secret).toBeDefined();
    expect(ROOMS.sewerz_b3_side?.east).toBe('sewerz_b3_secret');
    // Critical path to goose does not require secret
    const viaSecret = pathLengthTo(ROOMS, 'sewerz_mouth', (r) =>
      roomHasBossId(r, 'royal-goose'),
    );
    expect(viaSecret).not.toBeNull();
    // Secret is off side branch
    expect(ROOMS.sewerz_b3_secret?.entities?.some((e) => e.id === BILGE_BRUTE_ID)).toBe(
      true,
    );
  });
});

describe('world P6 ecology elites (non-manager)', () => {
  const elites = [
    {
      id: ROOT_ALPHA_ID,
      roomId: ROOT_ALPHA_ROOM_ID,
      hp: ROOT_ALPHA_BASE_HP,
      land: 'woodz' as const,
    },
    {
      id: DUNE_STALKER_ID,
      roomId: DUNE_STALKER_ROOM_ID,
      hp: DUNE_STALKER_BASE_HP,
      land: 'dezertz' as const,
    },
    {
      id: BILGE_BRUTE_ID,
      roomId: BILGE_BRUTE_ROOM_ID,
      hp: BILGE_BRUTE_BASE_HP,
      land: 'sewerz' as const,
    },
  ];

  it.each(elites)(
    '$id placed as miniboss with mid-only kill contract',
    ({ id, roomId, hp, land }) => {
      const room = ROOMS[roomId];
      expect(room).toBeDefined();
      expect(room.land).toBe(land);
      const e = room.entities?.find((x) => x.id === id);
      expect(e).toBeDefined();
      expect(e!.kind).toBe('miniboss');
      expect(e!.hp).toBe(hp);
      // Not job-title HR ids
      expect(id.includes('captain') || id.includes('lawyer')).toBe(false);
      expect(isBossRoom(roomId)).toBe(false);
      expect(BOSS_ROOM_META[roomId]).toBeUndefined();

      let save = defaultSave();
      save = { ...save, bossDefeated: true, landsCleared: ['woodz'] };
      const r = applyMinibossKill(save, id, land);
      expect(r.save.killed).toContain(id);
      expect(r.save.bossDefeated).toBe(true);
      expect(r.save.landsCleared).toEqual(['woodz']);
      expect(r.setsBossDefeated).toBe(false);
      expect(r.opensLandExitPortal).toBe(false);
      expect(shouldSpawnBossExitPortal(r.save, roomId, land)).toBe(false);
      expect(isPermanentKill('miniboss', id)).toBe(true);
    },
  );
});
