import Phaser from 'phaser';
import {
  COLORS,
  GAME_H,
  GAME_W,
  HUD_H,
  MAP_PIXEL_H,
  MAP_PIXEL_W,
  SCALE,
  TILE,
  VIEW_TILES_H,
  VIEW_TILES_W,
} from '../config';
import { ROOMS, resolveRoomId } from '../data/world';
import { entryFromOpposite, spawnInsideEntryEdge } from '../systems/map-spawn';
import {
  enemyXpReward,
  grantXp,
} from '../systems/progression';
import {
  applyLootToSave,
  lootSummary,
  openChest,
  rollEnemyLoot,
} from '../systems/loot';
import {
  attemptPurchase,
  attemptSellIndex,
  getShop,
  listPlayerSellables,
  SHOP_BAG_COLS,
  SHOP_STOCK_COLS,
  shopIndexFromDir,
  type ShopPane,
} from '../systems/shop';
import {
  appearanceFromSave,
  playerTextureKey,
} from '../systems/appearance';
import {
  ATTR_IDS,
  spendAttrPoint,
} from '../systems/attributes';
import {
  resolveEnemyContactDamage,
  resolveEnemyHp,
} from '../systems/enemies';
import {
  autoEquipEmptySlots,
  computePlayerDamage,
  cycleSlotEquip,
  equipUid,
  grantKey,
  grantMildSword,
  hasWeaponEquipped,
  syncDerivedStats,
  useInventoryItem,
} from '../systems/inventory';
import { mintItem } from '../systems/items';
import {
  discoverMapz,
  landForRoom,
  markRoomVisited,
  reconcileMapzFromCollected,
} from '../systems/mapz';
import {
  FORJING_ACTION_COLS,
  listForjingActions,
  runForjingAction,
} from '../systems/forjing';
import {
  bestBudBanter,
  ensureRunSeed,
  getBestBud,
  isCompanionActive,
  meetBestBud,
  prizellaChampionTalk,
  shouldSpawnDenBud,
} from '../systems/best-bud';
import {
  princessChampionDialog,
  questHint,
  rewardDezertzClear,
  rewardDunjunzClear,
  rewardWoodzClear,
} from '../systems/quest';
import { loadSave, writeSave } from '../systems/save';
import type {
  AttrId,
  EntityDef,
  EntityKind,
  EquipSlot,
  LandId,
  RoomDef,
  SaveData,
  TileKind,
} from '../types';

interface Actor {
  sprite: Phaser.Physics.Arcade.Sprite;
  kind: EntityKind;
  id: string;
  hp: number;
  maxHp: number;
  dialog?: string[];
  hurtCooldown: number;
  aiTimer: number;
  alive: boolean;
  interactive: boolean;
  chestTable?: string;
  shopId?: string;
  mapzId?: LandId;
  /** Cube stays peaceful until the player hits it. */
  aggressive?: boolean;
}

const SOLID: TileKind[] = ['wall', 'water', 'void', 'locked'];
const CHAR_TO_TILE: Record<string, TileKind> = {
  '#': 'wall',
  '.': 'floor',
  g: 'grass',
  d: 'dirt',
  '~': 'water',
  D: 'door',
  L: 'locked',
  S: 'stairs',
  U: 'stairs_up',
  '=': 'lava',
  P: 'pad',
  ' ': 'void',
};

const TEX: Record<TileKind, string> = {
  void: 'tile-floor',
  floor: 'tile-floor',
  wall: 'tile-wall',
  grass: 'tile-grass',
  dirt: 'tile-dirt',
  water: 'tile-water',
  door: 'tile-door',
  locked: 'tile-locked',
  stairs: 'tile-stairs',
  stairs_up: 'tile-stairs-up',
  entrance: 'tile-stairs',
  lava: 'tile-lava',
  pad: 'tile-pad',
};

const ENTITY_TEX: Record<EntityKind, string> = {
  slime: 'slime',
  skeleton: 'skeleton',
  redshirt: 'redshirt',
  cube: 'cube',
  boss: 'boss',
  npc: 'npc',
  merchant: 'merchant',
  key: 'key',
  heart: 'heart',
  sword: 'sword-item',
  sign: 'sign',
  chest: 'chest',
  mapz: 'mapz',
  forje: 'forje',
  princess: 'princess',
  cactus: 'cactus',
  wolf: 'wolf',
  best_bud: 'best_bud',
};

export class GameScene extends Phaser.Scene {
  private save!: SaveData;
  private room!: RoomDef;
  private tileGrid: TileKind[][] = [];
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private actors: Actor[] = [];
  private player!: Phaser.Physics.Arcade.Sprite;
  private swordHit!: Phaser.Physics.Arcade.Image;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: {
    w: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
    z: Phaser.Input.Keyboard.Key;
    space: Phaser.Input.Keyboard.Key;
    esc: Phaser.Input.Keyboard.Key;
    e: Phaser.Input.Keyboard.Key;
    m: Phaser.Input.Keyboard.Key;
    enter: Phaser.Input.Keyboard.Key;
    b: Phaser.Input.Keyboard.Key;
    i: Phaser.Input.Keyboard.Key;
    u: Phaser.Input.Keyboard.Key;
    one: Phaser.Input.Keyboard.Key;
    n: Phaser.Input.Keyboard.Key;
  };
  private facing: 'up' | 'down' | 'left' | 'right' = 'down';
  private attacking = false;
  private invuln = 0;
  private dialogLocked = false;
  /** Blocks re-open / attack for a beat after dialog closes (same key must not re-trigger). */
  private dialogCloseCooldown = 0;
  private inventoryOpen = false;
  private mapzOpen = false;
  private forjingOpen = false;
  private forjingSelected = 0;
  private shopOpen = false;
  private shopId: string | null = null;
  private shopSelected = 0;
  private shopBagSelected = 0;
  private shopPane: ShopPane = 'stock';
  private paused = false;
  private transitionLock = false;
  private roomOriginX = 0;
  private roomOriginY = 0;
  private padCooldown = 0;
  private bossIntroShown = false;
  /** Following Best Bud companion sprite (after found). */
  private companionSprite: Phaser.Physics.Arcade.Sprite | null = null;

  constructor() {
    super('Game');
  }

  create(): void {
    // Phaser reuses the same Scene instance — always reset runtime state on enter.
    // Leftover dialogLocked/paused from a prior run freezes movement entirely.
    this.dialogLocked = false;
    this.dialogCloseCooldown = 0;
    this.inventoryOpen = false;
    this.mapzOpen = false;
    this.forjingOpen = false;
    this.forjingSelected = 0;
    this.shopOpen = false;
    this.shopId = null;
    this.shopSelected = 0;
    this.shopBagSelected = 0;
    this.shopPane = 'stock';
    this.paused = false;
    this.attacking = false;
    this.invuln = 0;
    this.transitionLock = false;
    this.padCooldown = 0;
    this.bossIntroShown = false;
    this.facing = 'down';
    this.actors = [];
    this.tileGrid = [];

    this.save = reconcileMapzFromCollected(loadSave());
    this.roomOriginX = (GAME_W - MAP_PIXEL_W) / 2;
    this.roomOriginY = HUD_H + (GAME_H - HUD_H - MAP_PIXEL_H) / 2;

    this.cameras.main.setBackgroundColor(COLORS.black);
    this.physics.world.setBounds(
      this.roomOriginX,
      this.roomOriginY,
      MAP_PIXEL_W,
      MAP_PIXEL_H,
    );

    this.walls = this.physics.add.staticGroup();
    const kb = this.input.keyboard!;
    // Only capture action keys — do not capture movement keys
    kb.addCapture([
      Phaser.Input.Keyboard.KeyCodes.SPACE,
      Phaser.Input.Keyboard.KeyCodes.Z,
      Phaser.Input.Keyboard.KeyCodes.E,
      Phaser.Input.Keyboard.KeyCodes.ENTER,
      Phaser.Input.Keyboard.KeyCodes.B,
      Phaser.Input.Keyboard.KeyCodes.I,
      Phaser.Input.Keyboard.KeyCodes.U,
      Phaser.Input.Keyboard.KeyCodes.N,
      Phaser.Input.Keyboard.KeyCodes.W,
      Phaser.Input.Keyboard.KeyCodes.M,
      Phaser.Input.Keyboard.KeyCodes.TAB,
      Phaser.Input.Keyboard.KeyCodes.F,
    ]);
    this.cursors = kb.createCursorKeys();
    this.keys = {
      w: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      z: kb.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
      space: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      esc: kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
      e: kb.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      m: kb.addKey(Phaser.Input.Keyboard.KeyCodes.M),
      enter: kb.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
      b: kb.addKey(Phaser.Input.Keyboard.KeyCodes.B),
      i: kb.addKey(Phaser.Input.Keyboard.KeyCodes.I),
      u: kb.addKey(Phaser.Input.Keyboard.KeyCodes.U),
      one: kb.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
      n: kb.addKey(Phaser.Input.Keyboard.KeyCodes.N),
    };

    // Event-based attack / interact / shop buy / inventory / equip
    // NOTE: Enter is advance-only (UIScene). Opening talk is E so the last
    // Enter that closes a sign cannot immediately re-open it.
    // A = move left when playing; when inventory open, A cycles armor.
    kb.on('keydown-SPACE', this.onAttackKey, this);
    kb.on('keydown-Z', this.onAttackKey, this);
    kb.on('keydown-E', this.onInteractKey, this);
    kb.on('keydown-B', this.onBuyKey, this);
    kb.on('keydown-I', this.onInventoryKey, this);
    kb.on('keydown-U', this.onUseItemKey, this);
    kb.on('keydown-W', this.onWeaponEquipKey, this);
    kb.on('keydown-H', () => this.cycleEquip('helmet'));
    kb.on('keydown-C', () => this.cycleEquip('breastplate'));
    kb.on('keydown-L', () => this.cycleEquip('greaves'));
    kb.on('keydown-F', this.onForjingOrShoesKey, this);
    kb.on('keydown-G', () => this.cycleEquip('gloves'));
    kb.on('keydown-N', () => this.cycleEquip('amulet'));
    kb.on('keydown-O', () => this.cycleEquip('shield'));
    kb.on('keydown-R', () => this.cycleEquip('ring'));
    kb.on('keydown-K', () => this.cycleEquip('key'));
    kb.on('keydown-M', this.onMapzKey, this);
    kb.on('keydown-TAB', this.onMapzKey, this);
    kb.on('keydown-OPEN_BRACKET', () => this.onMapzNav('floor-prev'));
    kb.on('keydown-CLOSED_BRACKET', () => this.onMapzNav('floor-next'));
    kb.on('keydown-COMMA', () => this.onMapzNav('land-prev'));
    kb.on('keydown-PERIOD', () => this.onMapzNav('land-next'));
    kb.on('keydown-ONE', () => this.onDigitKey(1));
    kb.on('keydown-TWO', () => this.onDigitKey(2));
    kb.on('keydown-THREE', () => this.onDigitKey(3));
    kb.on('keydown-FOUR', () => this.onDigitKey(4));
    kb.on('keydown-FIVE', () => this.onDigitKey(5));
    kb.on('keydown-SIX', () => this.onDigitKey(6));
    kb.on('keydown-SEVEN', () => this.onDigitKey(7));
    kb.on('keydown-EIGHT', () => this.onDigitKey(8));
    kb.on('keydown-NINE', () => this.onDigitKey(9));

    this.player = this.physics.add.sprite(0, 0, 'player');
    this.player.setScale(SCALE);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
    // Body size in source pixels (texture is 16x16); Phaser scales with the sprite
    this.player.setBodySize(10, 12, true);
    this.refreshPlayerAppearance();

    // Keep sword GO + body ALWAYS active. Disabling the body between swings
    // breaks Arcade overlap vs some enemies (notably oversized cube/boss frames).
    this.swordHit = this.physics.add.image(-999, -999, 'sword-swing');
    this.swordHit.setScale(SCALE);
    this.swordHit.setDepth(15);
    this.swordHit.setVisible(false);
    this.swordHit.setActive(true);
    const swordBody = this.swordHit.body as Phaser.Physics.Arcade.Body;
    swordBody.setAllowGravity(false);
    swordBody.enable = true;
    swordBody.setSize(20, 20);
    swordBody.moves = false;

    this.physics.add.collider(this.player, this.walls);

    this.game.events.on('dialog-state', this.onDialogState, this);
    this.game.events.on('inventory-state', this.onInventoryState, this);
    this.game.events.on('mapz-state', this.onMapzState, this);
    this.game.events.on('forjing-state', this.onForjingState, this);
    this.game.events.on('forjing-cursor', this.onForjingCursor, this);
    this.game.events.on('shop-state', this.onShopState, this);
    this.game.events.on('shop-cursor', this.onShopCursor, this);
    this.game.events.on('inventory-bag-activate', this.onBagActivate, this);
    this.events.once('shutdown', () => {
      this.game.events.off('dialog-state', this.onDialogState, this);
      this.game.events.off('inventory-state', this.onInventoryState, this);
      this.game.events.off('mapz-state', this.onMapzState, this);
      this.game.events.off('forjing-state', this.onForjingState, this);
      this.game.events.off('forjing-cursor', this.onForjingCursor, this);
      this.game.events.off('shop-state', this.onShopState, this);
      this.game.events.off('shop-cursor', this.onShopCursor, this);
      this.game.events.off('inventory-bag-activate', this.onBagActivate, this);
      kb.off('keydown-SPACE', this.onAttackKey, this);
      kb.off('keydown-Z', this.onAttackKey, this);
      kb.off('keydown-E', this.onInteractKey, this);
      kb.off('keydown-B', this.onBuyKey, this);
      kb.off('keydown-I', this.onInventoryKey, this);
      kb.off('keydown-U', this.onUseItemKey, this);
      kb.off('keydown-W', this.onWeaponEquipKey, this);
      kb.off('keydown-F', this.onForjingOrShoesKey, this);
      kb.off('keydown-M', this.onMapzKey, this);
      kb.off('keydown-TAB', this.onMapzKey, this);
      writeSave(this.save);
    });

    // Soft-reset UI only — stop+relaunch races strip dialog-show listeners
    if (!this.scene.isActive('UI')) {
      this.scene.launch('UI');
    } else {
      this.game.events.emit('ui-reset');
    }
    this.dialogLocked = false;
    this.game.events.emit('dialog-state', false);
    this.game.events.emit('pause-ui', false);

    this.loadRoom(this.save.roomId, true);
    this.emitHud();
  }

  private onMapzNav(
    dir: 'floor-prev' | 'floor-next' | 'land-prev' | 'land-next',
  ): void {
    if (!this.mapzOpen || this.paused) return;
    this.game.events.emit('mapz-nav', dir);
  }

  private addWallAt(x: number, y: number, kind: TileKind): void {
    const wall = this.walls.create(x, y, TEX[kind]) as Phaser.Physics.Arcade.Sprite;
    // Invisible collider sized to one display tile — do NOT setSize(TILE*SCALE)
    // after setScale (that oversizes bodies and freezes the player).
    wall.setVisible(false);
    wall.setDisplaySize(TILE * SCALE, TILE * SCALE);
    wall.refreshBody();
  }

  private panelOpen(): boolean {
    return (
      this.inventoryOpen ||
      this.mapzOpen ||
      this.forjingOpen ||
      this.shopOpen
    );
  }

  private onDialogState = (open: boolean): void => {
    this.dialogLocked = open;
    if (!open) {
      // Same physical keypress that closed dialog must not re-open or attack
      this.dialogCloseCooldown = 280;
      if (this.player.body) {
        (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      }
    }
  };

  private onInventoryState = (open: boolean): void => {
    this.inventoryOpen = open;
    if (open && this.player.body) {
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    }
  };

  private onMapzState = (open: boolean): void => {
    this.mapzOpen = open;
    if (open && this.player.body) {
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    }
  };

  private onForjingState = (open: boolean): void => {
    this.forjingOpen = open;
    if (!open) this.forjingSelected = 0;
    if (open && this.player.body) {
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    }
  };

  private onForjingCursor = (index: number): void => {
    this.forjingSelected = index;
  };

  private onShopState = (open: boolean): void => {
    this.shopOpen = open;
    if (!open) {
      this.shopId = null;
      this.shopPane = 'stock';
    }
    if (open && this.player.body) {
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    }
  };

  private onShopCursor = (
    payload: number | { pane: ShopPane; index: number },
  ): void => {
    if (typeof payload === 'number') {
      this.shopSelected = payload;
      this.shopPane = 'stock';
      return;
    }
    this.shopPane = payload.pane;
    if (payload.pane === 'stock') this.shopSelected = payload.index;
    else this.shopBagSelected = payload.index;
  };

  private onAttackKey = (): void => {
    // Space advances dialog when open (UI scene); do not swing mid-dialog
    if (
      this.dialogLocked ||
      this.panelOpen() ||
      this.paused ||
      this.dialogCloseCooldown > 0
    ) {
      return;
    }
    this.tryAttack();
  };

  private onInteractKey = (): void => {
    // E opens talk / shop. Enter never opens (UI only advances with Enter).
    if (this.paused || this.dialogCloseCooldown > 0) return;
    // E also closes shop (do not also handle E in update — that same-frame
    // double-fire was opening then immediately closing the shop).
    if (this.shopOpen) {
      this.game.events.emit('shop-toggle');
      return;
    }
    if (this.dialogLocked || this.panelOpen()) return;
    this.tryInteract();
  };

  private onBuyKey = (): void => {
    if (this.paused || this.dialogCloseCooldown > 0) return;
    if (this.shopOpen) {
      this.confirmShopTrade();
      return;
    }
    if (this.dialogLocked || this.panelOpen()) return;
    // Open shop if near merchant (B is shortcut)
    this.openShopIfNearMerchant();
  };

  private onInventoryKey = (): void => {
    if (this.dialogLocked || this.paused || this.mapzOpen || this.forjingOpen) {
      return;
    }
    this.game.events.emit('inventory-toggle', this.save);
  };

  private onMapzKey = (event?: KeyboardEvent): void => {
    if (this.paused) return; // pause uses M for title (handled in update)
    // Tab while shop open: switch dual pane. M does nothing while shopping.
    if (this.shopOpen) {
      const isM =
        !!event &&
        (event.key === 'm' || event.key === 'M' || event.code === 'KeyM');
      if (isM) return;
      this.shopPane = this.shopPane === 'stock' ? 'bag' : 'stock';
      const index =
        this.shopPane === 'stock' ? this.shopSelected : this.shopBagSelected;
      this.game.events.emit('shop-select', { pane: this.shopPane, index });
      this.game.events.emit(
        'toast',
        this.shopPane === 'stock' ? 'BUY PANE' : 'SELL PANE',
      );
      return;
    }
    if (this.inventoryOpen || this.forjingOpen) return;
    // Allow open even while dialog is up (pickup says PRESS M)
    this.openMapzPanel();
  };

  private openMapzPanel(): void {
    const land = landForRoom(ROOMS, this.save.roomId);
    this.game.events.emit('mapz-toggle', {
      save: this.save,
      land,
    });
  }

  private onForjingOrShoesKey = (): void => {
    if (this.inventoryOpen) {
      this.cycleEquip('shoes');
      return;
    }
    if (this.dialogLocked || this.paused || this.mapzOpen || this.shopOpen) return;
    if (this.forjingOpen) {
      this.game.events.emit('forjing-toggle');
      return;
    }
    // Must be near a forje
    const forge = this.findNearbyKind('forje');
    if (!forge) {
      this.game.events.emit('toast', 'NO FORJE NEARBY');
      return;
    }
    this.forjingSelected = 0;
    this.game.events.emit('forjing-toggle', {
      save: this.save,
      selectedIndex: 0,
    });
    this.game.events.emit('toast', 'FORJE — SELECT A RECIPE');
  };

  private onDigitKey(n: number): void {
    if (this.forjingOpen && !this.dialogLocked && !this.paused) {
      // 1–9 pick action slot (1-based)
      const actions = listForjingActions();
      const idx = n - 1;
      if (idx >= 0 && idx < actions.length) {
        this.forjingSelected = idx;
        this.game.events.emit('forjing-select', idx);
        this.confirmForjingAction();
      }
      return;
    }
    if (this.inventoryOpen) {
      const map: Record<number, AttrId> = {
        1: 'str',
        2: 'dex',
        3: 'vit',
        4: 'int',
        5: 'lck',
      };
      const attr = map[n];
      if (attr) this.spendAttr(attr);
    }
  }

  private confirmForjingAction(): void {
    const actions = listForjingActions();
    const action = actions[this.forjingSelected];
    if (!action) return;
    const result = runForjingAction(this.save, action.id);
    if (!result.ok) {
      this.game.events.emit('toast', result.reason);
      return;
    }
    this.save = result.save;
    writeSave(this.save);
    this.emitHud();
    this.refreshPlayerAppearance();
    this.game.events.emit('toast', result.message);
    this.game.events.emit('forjing-refresh', this.save);
    this.game.events.emit('inventory-refresh', this.save);
  }

  private navForjing(dir: 'up' | 'down' | 'left' | 'right'): void {
    if (!this.forjingOpen) return;
    const actions = listForjingActions();
    if (!actions.length) return;
    this.forjingSelected = shopIndexFromDir(
      this.forjingSelected,
      actions.length,
      FORJING_ACTION_COLS,
      dir,
    );
    this.game.events.emit('forjing-select', this.forjingSelected);
  }

  private findNearbyKind(kind: EntityKind): Actor | null {
    const max = this.interactReach();
    let best: Actor | null = null;
    let bestDist = max;
    for (const a of this.actors) {
      if (!a.alive || a.kind !== kind || !a.sprite?.active) continue;
      const dist = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        a.sprite.x,
        a.sprite.y,
      );
      if (dist < bestDist) {
        bestDist = dist;
        best = a;
      }
    }
    return best;
  }

  private onUseItemKey = (): void => {
    if (this.dialogLocked || this.paused) return;
    // Use potion from bag (works with inventory open or closed)
    const result = useInventoryItem(this.save, 'potion');
    if (!result.ok) {
      this.game.events.emit('toast', result.reason);
      return;
    }
    this.save = result.save;
    writeSave(this.save);
    this.emitHud();
    this.game.events.emit('inventory-refresh', this.save);
    this.game.events.emit('toast', result.message);
  };

  private onWeaponEquipKey = (): void => {
    this.cycleEquip('weapon');
  };

  /** Click a bag grid cell: equip gear or use consumable. */
  private onBagActivate = (payload: {
    uid?: string;
    templateId: string;
    usable?: boolean;
    slot?: EquipSlot;
  }): void => {
    if (!this.inventoryOpen || this.paused) return;
    if (payload.usable) {
      const result = useInventoryItem(this.save, payload.templateId);
      if (!result.ok) {
        this.game.events.emit('toast', result.reason);
        return;
      }
      this.save = result.save;
      writeSave(this.save);
      this.emitHud();
      this.game.events.emit('inventory-refresh', this.save);
      this.game.events.emit('toast', result.message);
      return;
    }
    if (payload.uid && payload.slot) {
      const result = equipUid(this.save, payload.uid);
      if (!result.ok) {
        this.game.events.emit('toast', result.reason);
        return;
      }
      this.save = result.save;
      writeSave(this.save);
      this.emitHud();
      this.game.events.emit('inventory-refresh', this.save);
      this.game.events.emit('toast', result.message);
    }
  };

  private cycleEquip(slot: EquipSlot): void {
    if (!this.inventoryOpen || this.dialogLocked || this.paused) return;
    const result = cycleSlotEquip(this.save, slot);
    if (!result.ok) {
      this.game.events.emit('toast', result.reason);
      return;
    }
    this.save = result.save;
    writeSave(this.save);
    this.emitHud();
    this.game.events.emit('inventory-refresh', this.save);
    this.game.events.emit('toast', result.message);
  }

  private spendAttr(attr: AttrId): void {
    if (!this.inventoryOpen || this.dialogLocked || this.paused) return;
    if (!ATTR_IDS.includes(attr)) return;
    const result = spendAttrPoint(this.save, attr);
    if (!result.ok) {
      this.game.events.emit('toast', result.reason);
      return;
    }
    this.save = syncDerivedStats(result.save);
    writeSave(this.save);
    this.emitHud();
    this.game.events.emit('inventory-refresh', this.save);
    this.game.events.emit('toast', `+1 ${attr.toUpperCase()}`);
  }

  /** Reach in world pixels (~2.4 tiles) so roomy NPCs like the cube are talkable. */
  private interactReach(): number {
    return TILE * SCALE * 2.4;
  }

  /** Grant starter sword (old man gift or ground pickup) into weapon slot. */
  private grantSword(showDialog = true): void {
    if (!this.save.collected.includes('starter-sword')) {
      this.save.collected.push('starter-sword');
    }
    this.save = grantMildSword(this.save);
    const ground = this.actors.find((a) => a.id === 'starter-sword' && a.alive);
    if (ground) {
      ground.alive = false;
      ground.sprite.destroy();
    }
    writeSave(this.save);
    this.emitHud();
    this.refreshPlayerAppearance();
    if (showDialog) {
      this.game.events.emit('dialog-show', [
        'YOU GOT THE SWORD OF',
        'MILD ENTHUSIASM!',
        'IT IS IN YOUR WEAPON SLOT.',
        'PRESS SPACE OR Z TO SWING.',
        'I BAG · W TO CYCLE WEAPON.',
      ]);
    } else {
      this.game.events.emit('toast', 'SWORD EQUIPPED!');
    }
  }

  private tileToWorld(tx: number, ty: number): { x: number; y: number } {
    return {
      x: this.roomOriginX + (tx + 0.5) * TILE * SCALE,
      y: this.roomOriginY + (ty + 0.5) * TILE * SCALE,
    };
  }

  private worldToTile(x: number, y: number): { tx: number; ty: number } {
    return {
      tx: Math.floor((x - this.roomOriginX) / (TILE * SCALE)),
      ty: Math.floor((y - this.roomOriginY) / (TILE * SCALE)),
    };
  }

  private parseTiles(room: RoomDef): TileKind[][] {
    const grid: TileKind[][] = [];
    for (let y = 0; y < VIEW_TILES_H; y++) {
      const row = room.tiles[y] ?? '#'.repeat(VIEW_TILES_W);
      const cells: TileKind[] = [];
      for (let x = 0; x < VIEW_TILES_W; x++) {
        const ch = row[x] ?? '#';
        cells.push(CHAR_TO_TILE[ch] ?? 'floor');
      }
      grid.push(cells);
    }
    return grid;
  }

  /**
   * Locked doors are baked as L in room data. After the friend-key opens them,
   * flag door-unlocked must convert L→door on every reload (death, room re-entry).
   * Without this, death + reload re-locks the door while the key is already gone.
   */
  private applyPersistentDoorUnlocks(grid: TileKind[][]): TileKind[][] {
    if (!this.save.flags['door-unlocked']) return grid;
    return grid.map((row) =>
      row.map((cell) => (cell === 'locked' ? 'door' : cell)),
    );
  }

  private clearRoomObjects(): void {
    this.walls.clear(true, true);
    for (const a of this.actors) {
      a.sprite.destroy();
    }
    this.actors = [];
    if (this.companionSprite) {
      this.companionSprite.destroy();
      this.companionSprite = null;
    }
    // Destroy map tiles (images tagged)
    this.children.list
      .filter((c) => (c as Phaser.GameObjects.Image).getData?.('mapTile'))
      .forEach((c) => c.destroy());
  }

  private loadRoom(roomId: string, fromSave: boolean, entryFrom?: string): void {
    const resolved = resolveRoomId(roomId);
    const room = ROOMS[resolved];
    if (!room) return;

    this.transitionLock = false;
    this.clearRoomObjects();
    this.room = room;
    this.save.roomId = resolved;
    this.save = markRoomVisited(this.save, resolved);
    this.tileGrid = this.applyPersistentDoorUnlocks(this.parseTiles(room));

    for (let y = 0; y < VIEW_TILES_H; y++) {
      for (let x = 0; x < VIEW_TILES_W; x++) {
        const kind = this.tileGrid[y][x];
        const pos = this.tileToWorld(x, y);
        const img = this.add
          .image(pos.x, pos.y, TEX[kind])
          .setScale(SCALE)
          .setDepth(0);
        img.setData('mapTile', true);

        if (SOLID.includes(kind)) {
          this.addWallAt(pos.x, pos.y, kind);
        }
      }
    }

    // Player spawn
    const spawn = this.findSpawn(entryFrom, fromSave);
    const p = this.tileToWorld(spawn.tx, spawn.ty);
    this.player.setPosition(p.x, p.y);
    const pBody = this.player.body as Phaser.Physics.Arcade.Body;
    pBody.setVelocity(0, 0);
    pBody.enable = true;
    this.player.setActive(true).setVisible(true);

    // Entities
    for (const def of room.entities ?? []) {
      if (def.id && this.save.killed.includes(def.id)) continue;
      if (def.id && this.save.collected.includes(def.id)) continue;
      // Boss chest waits until the DM is defeated
      if (
        def.kind === 'chest' &&
        def.id === 'boss-chest' &&
        !this.save.bossDefeated
      ) {
        continue;
      }
      this.spawnEntity(def);
    }

    // Ensure boss chest appears after victory if not collected
    if (resolved === 'b2_boss' && this.save.bossDefeated) {
      const chestDef = room.entities?.find((e) => e.id === 'boss-chest');
      if (chestDef && !this.save.collected.includes(chestDef.id ?? '')) {
        const exists = this.actors.some((a) => a.id === 'boss-chest');
        if (!exists) this.spawnEntity(chestDef);
      }
    }

    this.emitHud();
    writeSave(this.save);
    this.syncCompanion();

    if (resolved === 'b2_boss' && !this.save.bossDefeated && !this.bossIntroShown) {
      this.bossIntroShown = true;
      const boss = this.actors.find((a) => a.kind === 'boss');
      if (boss?.dialog) {
        this.time.delayedCall(300, () => {
          this.game.events.emit('dialog-show', boss.dialog);
        });
      }
    }
  }

  /** Best Bud den meet or companion banter. */
  private talkToBestBud(actor: Actor): void {
    if (this.save.bestBudStage === 'accepted' && this.save.bestBudId) {
      const r = meetBestBud(this.save);
      this.save = r.save;
      writeSave(this.save);
      actor.alive = false;
      if (actor.sprite?.active) actor.sprite.destroy();
      this.game.events.emit('dialog-show', r.dialog);
      this.syncCompanion();
      const bud = getBestBud(this.save.bestBudId);
      this.game.events.emit('toast', bud ? `BEST BUD: ${bud.name}!` : 'BEST BUD!');
      return;
    }
    if (isCompanionActive(this.save)) {
      this.game.events.emit('dialog-show', bestBudBanter(this.save));
      return;
    }
    this.game.events.emit(
      'dialog-show',
      actor.dialog ?? [
        '...A CREATURE WAITS.',
        'TALK TO PRIZELLA ABOUT CHAMPION JOB #1 FIRST.',
      ],
    );
  }

  /** Spawn/destroy following companion based on quest stage. */
  private syncCompanion(): void {
    if (!isCompanionActive(this.save) || !this.player) {
      if (this.companionSprite?.active) this.companionSprite.destroy();
      this.companionSprite = null;
      return;
    }
    const bud = getBestBud(this.save.bestBudId);
    if (!this.companionSprite?.active) {
      const px = this.player.x - 22;
      const py = this.player.y + 4;
      this.companionSprite = this.physics.add.sprite(px, py, 'best_bud');
      this.companionSprite.setScale(SCALE).setDepth(4);
      this.companionSprite.setImmovable(true);
      const body = this.companionSprite.body as Phaser.Physics.Arcade.Body;
      body.enable = false;
    }
    if (bud) this.companionSprite.setTint(bud.tint);
    else this.companionSprite.clearTint();
  }

  private updateCompanionFollow(): void {
    if (!this.companionSprite?.active || !this.player || !isCompanionActive(this.save)) {
      return;
    }
    const dx = this.player.x - 18 - this.companionSprite.x;
    const dy = this.player.y + 2 - this.companionSprite.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 24) {
      this.companionSprite.x += dx * 0.1;
      this.companionSprite.y += dy * 0.1;
    }
  }

  private findTile(
    kind: TileKind,
  ): { tx: number; ty: number } | null {
    for (let y = 0; y < VIEW_TILES_H; y++) {
      for (let x = 0; x < VIEW_TILES_W; x++) {
        if (this.tileGrid[y][x] === kind) return { tx: x, ty: y };
      }
    }
    return null;
  }

  private findSpawn(
    entryFrom?: string,
    fromSave?: boolean,
  ): { tx: number; ty: number } {
    // Came down stairs → stand south of stairs-up (not ON them, or you bounce back up)
    if (entryFrom === 'stairsDown') {
      const up = this.findTile('stairs_up');
      if (up) {
        const ty = Math.min(VIEW_TILES_H - 2, up.ty + 2);
        // Prefer a walkable cell south of the stair
        if (!SOLID.includes(this.tileGrid[ty]?.[up.tx] ?? 'wall')) {
          return { tx: up.tx, ty };
        }
        return { tx: up.tx, ty: Math.min(VIEW_TILES_H - 2, up.ty + 1) };
      }
      return { tx: 8, ty: 8 };
    }
    // Came up stairs → stand north of stairs-down (not ON them)
    if (entryFrom === 'stairsUp') {
      const down = this.findTile('stairs');
      if (down) {
        const ty = Math.max(1, down.ty - 2);
        if (!SOLID.includes(this.tileGrid[ty]?.[down.tx] ?? 'wall')) {
          return { tx: down.tx, ty };
        }
        return { tx: down.tx, ty: Math.max(1, down.ty - 1) };
      }
      return { tx: 8, ty: 4 };
    }

    // Cardinal doors: entryFrom = edge of THIS room we entered through.
    // Exit east of prev → entryFrom 'west' → spawn on LEFT next to west door.
    if (
      entryFrom === 'north' ||
      entryFrom === 'south' ||
      entryFrom === 'east' ||
      entryFrom === 'west'
    ) {
      return spawnInsideEntryEdge(this.tileGrid, entryFrom);
    }

    // Default / continue: meadow center or nearest stairs / mid
    if (fromSave || !entryFrom) {
      if (this.room.id === 'overworld') return { tx: 8, ty: 4 };
      const up = this.findTile('stairs_up');
      if (up) return { tx: up.tx, ty: Math.min(VIEW_TILES_H - 2, up.ty + 1) };
      const down = this.findTile('stairs');
      if (down) return { tx: down.tx, ty: Math.max(1, down.ty - 1) };
      return { tx: 8, ty: 5 };
    }
    return { tx: 8, ty: 5 };
  }

  private spawnEntity(def: EntityDef): void {
    // Den bud only while quest accepted (not yet found)
    if (def.kind === 'best_bud' && !shouldSpawnDenBud(this.save)) {
      return;
    }

    // Captain gets gold command tunic (Kirk), not generic purple NPC
    const tex =
      def.id === 'captain' && this.textures.exists('captain')
        ? 'captain'
        : (ENTITY_TEX[def.kind] ?? 'npc');
    const pos = this.tileToWorld(def.x, def.y);
    const sprite = this.physics.add.sprite(pos.x, pos.y, tex);
    sprite.setScale(SCALE);
    sprite.setDepth(5);

    if (def.kind === 'best_bud') {
      const bud = getBestBud(this.save.bestBudId);
      if (bud) sprite.setTint(bud.tint);
    }

    const hostile = [
      'slime',
      'skeleton',
      'redshirt',
      'cube',
      'boss',
      'wolf',
      'cactus',
    ].includes(def.kind);
    const interactive = [
      'npc',
      'merchant',
      'sign',
      'chest',
      'key',
      'heart',
      'sword',
      'cube',
      'mapz',
      'forje',
      'princess',
      'best_bud',
    ].includes(def.kind);

    // Pickups / talkers: immovable, fat talk hitbox
    // Hostiles: collidable with walls; hitbox from frame size (cube is 20px, not 16)
    if (hostile) {
      sprite.setImmovable(false);
      sprite.setCollideWorldBounds(true);
      const body = sprite.body as Phaser.Physics.Arcade.Body;
      const fw = sprite.frame.width;
      const fh = sprite.frame.height;
      // Generous combat hitbox so sword/player overlap works on large sprites
      const bw = Math.max(10, Math.floor(fw * 0.85));
      const bh = Math.max(10, Math.floor(fh * 0.85));
      body.setSize(bw, bh);
      body.setOffset((fw - bw) / 2, (fh - bh) / 2);
      body.setBounce(0, 0);
      body.setMaxVelocity(120, 120);
      body.enable = true;
      this.physics.add.collider(sprite, this.walls);
    } else {
      sprite.setImmovable(true);
      if (
        [
          'key',
          'heart',
          'sword',
          'npc',
          'merchant',
          'sign',
          'chest',
          'mapz',
          'forje',
          'princess',
          'best_bud',
        ].includes(def.kind)
      ) {
        sprite.setSize(14, 14);
        sprite.setOffset(1, 1);
      }
    }

    const hp = resolveEnemyHp(def.kind, def.hp);

    const actor: Actor = {
      sprite,
      kind: def.kind,
      id: def.id ?? `${def.kind}-${def.x}-${def.y}`,
      hp,
      maxHp: hp,
      dialog: def.dialog,
      hurtCooldown: 0,
      aiTimer: 0,
      alive: true,
      interactive: interactive || !!def.dialog || !!def.shopId,
      chestTable: def.chestTable,
      shopId: def.shopId,
      mapzId: def.mapzId,
      // Cube is peaceful until struck
      aggressive: def.kind === 'cube' ? false : true,
    };

    if (hostile) {
      this.physics.add.overlap(this.player, sprite, () =>
        this.hurtPlayer(actor),
      );
      this.physics.add.overlap(this.swordHit, sprite, () =>
        this.hitEnemy(actor),
      );
    } else if (
      def.kind === 'key' ||
      def.kind === 'heart' ||
      def.kind === 'sword' ||
      def.kind === 'mapz'
    ) {
      this.physics.add.overlap(this.player, sprite, () =>
        this.collectItem(actor),
      );
    }

    this.actors.push(actor);
  }

  private emitHud(): void {
    this.refreshPlayerAppearance();
    this.game.events.emit('hud-update', this.save, this.room.title);
    if (this.inventoryOpen) {
      this.game.events.emit('inventory-refresh', this.save);
    }
  }

  /**
   * Swap player texture so gear shows on the avatar.
   * While swinging, hip sword is hidden (it's in the hand as sword-swing).
   */
  private refreshPlayerAppearance(): void {
    if (!this.player) return;
    const spec = appearanceFromSave(this.save);
    if (this.attacking) {
      spec.weapon = false;
    }
    const key = playerTextureKey(spec);
    if (this.textures.exists(key)) {
      this.player.setTexture(key);
    } else if (this.textures.exists('player')) {
      this.player.setTexture('player');
    }
  }

  private hurtPlayer(from: Actor): void {
    if (!from.alive || this.invuln > 0 || this.dialogLocked || this.paused) return;
    // Peaceful cube (not yet hit) does not damage — walk up and press E
    if (from.kind === 'cube' && !from.aggressive) return;

    // Kind contact damage; armor reduces (min 1) so gear matters
    const baseDmg = resolveEnemyContactDamage(from.kind);
    const dmg = Math.max(1, baseDmg - this.save.armor);
    this.save.hp = Math.max(0, this.save.hp - dmg);
    this.invuln = 900;
    this.emitHud();
    writeSave(this.save);

    this.cameras.main.shake(120, 0.01);
    this.player.setTint(0xff6666);
    this.time.delayedCall(150, () => this.player.clearTint());

    // Knockback
    const angle = Phaser.Math.Angle.Between(
      from.sprite.x,
      from.sprite.y,
      this.player.x,
      this.player.y,
    );
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(Math.cos(angle) * 220, Math.sin(angle) * 220);

    if (this.save.hp <= 0) {
      this.die();
    }
  }

  private die(): void {
    this.dialogLocked = true;
    this.game.events.emit('dialog-show', [
      'YOU HAVE DIED. BUMMER.',
      'THE BARD IS ALREADY WRITING A SONG.',
      'IT WILL NOT BE FLATTERING. AT ALL.',
      'RESPAWNING AT THE MEADOW... AGAIN...',
    ]);
    this.time.delayedCall(100, () => {
      this.save.hp = this.save.maxHp;
      this.save.roomId = 'overworld';
      writeSave(this.save);
    });
    this.time.delayedCall(2500, () => {
      this.dialogLocked = false;
      this.loadRoom('overworld', true);
      this.invuln = 1500;
    });
  }

  private hitEnemy(actor: Actor): void {
    if (!actor.alive || actor.hurtCooldown > 0 || !this.attacking) return;
    if (!hasWeaponEquipped(this.save)) return;

    // Best Bud is immortal friendship — not a target
    if (actor.kind === 'best_bud') {
      this.game.events.emit('toast', 'OW. RUDE. STILL BUDDIES.');
      return;
    }

    // Provoking the cube makes it fight back
    if (actor.kind === 'cube' && !actor.aggressive) {
      actor.aggressive = true;
      this.game.events.emit('toast', 'THE CUBE IS HURT... AND MAD');
    }

    actor.hurtCooldown = 280;
    const dmg = computePlayerDamage(this.save);
    actor.hp -= dmg;
    actor.sprite.setTint(0xffffff);
    this.time.delayedCall(80, () => {
      if (actor.alive) actor.sprite.clearTint();
    });

    // Knockback away from player (blocked by wall colliders)
    const angle = Phaser.Math.Angle.Between(
      this.player.x,
      this.player.y,
      actor.sprite.x,
      actor.sprite.y,
    );
    const body = actor.sprite.body as Phaser.Physics.Arcade.Body;
    const knock = actor.kind === 'cube' || actor.kind === 'boss' ? 80 : 140;
    body.setVelocity(Math.cos(angle) * knock, Math.sin(angle) * knock);

    if (actor.hp > 0) {
      this.game.events.emit(
        'toast',
        `${actor.kind.toUpperCase()} ${actor.hp}/${actor.maxHp}`,
      );
    } else if (actor.kind === 'redshirt') {
      this.game.events.emit('toast', 'ENSIGN DOWN!');
    }

    if (actor.hp <= 0) {
      this.killActor(actor);
    }
  }

  private killActor(actor: Actor): void {
    actor.alive = false;
    this.save.killed.push(actor.id);

    // XP + level from pure progression module
    const xpGain = enemyXpReward(actor.kind);
    const prog = grantXp(
      {
        xp: this.save.xp,
        level: this.save.level,
        attrPoints: this.save.attrPoints,
      },
      xpGain,
    );
    this.save.xp = prog.xp;
    this.save.level = prog.level;
    this.save.attrPoints = prog.attrPoints;
    if (prog.leveledUp) {
      this.game.events.emit(
        'toast',
        `LEVEL UP! LV ${prog.level} +${prog.attrPointsGained} ATTR (I TO SPEND)`,
      );
    } else {
      this.game.events.emit('toast', `+${xpGain} XP`);
    }

    // Creep loot (coins mostly; sometimes gear / mats). Bosses use quest rewards too.
    // Cube kill: unique core instead of (or in addition to) generic drops
    if (actor.kind === 'cube' || actor.id === 'gel-cube') {
      this.rewardCubeKill();
    } else {
      const drops = rollEnemyLoot(
        actor.kind,
        Math.random,
        this.save.attrs.lck,
      );
      if (drops.length) {
        this.save = applyLootToSave(this.save, drops);
        const summary = lootSummary(drops).slice(0, 3).join(', ');
        this.time.delayedCall(200, () => {
          this.game.events.emit('toast', `LOOT: ${summary}`);
        });
      }
    }

    if (actor.kind === 'boss' || actor.id === 'dungeon-master') {
      this.applyBossReward(actor);
    }

    // Death particles
    for (let i = 0; i < 6; i++) {
      const p = this.add.image(actor.sprite.x, actor.sprite.y, 'particle');
      p.setScale(SCALE);
      this.tweens.add({
        targets: p,
        x: p.x + Phaser.Math.Between(-40, 40),
        y: p.y + Phaser.Math.Between(-40, 40),
        alpha: 0,
        duration: 350,
        onComplete: () => p.destroy(),
      });
    }

    actor.sprite.destroy();
    writeSave(this.save);
    this.emitHud();
  }

  /** Talk path: boots of apology (once). Cube stays until killed. */
  private talkToCube(cube: Actor): void {
    if (!cube.alive) {
      this.game.events.emit('toast', 'ONLY A PUDDLE REMAINS');
      return;
    }
    if (cube.aggressive) {
      this.game.events.emit('dialog-show', [
        '*ANGRY WOBBLE*',
        'YOU HIT ME FIRST!',
        'NO GIFTS FOR MEAN HEROES!',
        'THAT\'S JUST SCIENCE.',
      ]);
      return;
    }

    const already = !!this.save.flags['cube_forgiven'];
    if (already) {
      this.game.events.emit('dialog-show', [
        '*FRIENDLY WOBBLE*',
        'YOU ALREADY HAVE MY APOLOGY BOOTS.',
        'PLEASE DO NOT HIT ME. WE\'RE BUDS.',
        'WEST LEADS BACK TO THE ENTRANCE.',
      ]);
      return;
    }

    // Gift boots — exclusive talk reward
    let next = mintItem(this.save, 'sorry_boots', 'uncommon', 0).save;
    next = autoEquipEmptySlots(next);
    next = syncDerivedStats(next);
    next = {
      ...next,
      flags: { ...next.flags, cube_forgiven: true },
    };
    this.save = next;
    writeSave(this.save);
    this.emitHud();
    this.game.events.emit('dialog-show', [
      ...(cube.dialog ?? ['*WOBBLE* I AM SORRY.']),
      '',
      'YOU GOT: BOOTS OF APOLOGY!',
      '(SHOES SLOT · +DEF · WON\'T DISSOLVE)',
      'KILLING ME YIELDS A DIFFERENT PRIZE.',
      'JUST... saying. Not suggesting.',
    ]);
    this.game.events.emit('toast', 'BOOTS OF APOLOGY!');
  }

  /** Kill path: gelatinous core amulet + some coins (not the boots). */
  private rewardCubeKill(): void {
    const drops = rollEnemyLoot('cube', Math.random, this.save.attrs.lck);
    // Guarantee the unique kill reward if not already owned
    const hasCore = this.save.bag.some((b) => b.templateId === 'cube_core');
    if (!hasCore) {
      drops.push({
        kind: 'gear',
        label: 'GELATINOUS CORE',
        templateId: 'cube_core',
      });
    }
    // Extra coins for the execution
    drops.push({ kind: 'coins', label: '15 COINS', coins: 15 });
    this.save = applyLootToSave(this.save, drops);
    this.save = {
      ...this.save,
      flags: { ...this.save.flags, cube_slain: true },
    };
    const summary = lootSummary(drops).slice(0, 4).join(', ');
    this.game.events.emit('dialog-show', [
      'THE CUBE COLLAPSES INTO A PUDDLE.',
      'NO MORE APOLOGIES. NO MORE WOBBLES.',
      `LOOT: ${summary}`,
      this.save.flags['cube_forgiven']
        ? 'AT LEAST YOU TOOK THE BOOTS FIRST. MIXED VIBES.'
        : 'IT NEVER GOT TO SAY SORRY. HARSH.',
    ]);
    this.game.events.emit('toast', `CUBE LOOT: ${summary}`);
  }

  private applyBossReward(actor: Actor): void {
    if (actor.id === 'dungeon-master' || this.room.id === 'b2_boss') {
      if (!this.save.landsCleared.includes('dunjunz')) {
        const r = rewardDunjunzClear(this.save);
        this.save = r.save;
        this.game.events.emit('dialog-show', r.dialog);
      } else {
        this.save.bossDefeated = true;
        this.game.events.emit('dialog-show', [
          'THE DUNJUN MASTER FALLS... AGAIN?',
          'DEJA VU, BUT WITH MORE LOOT MAYBE.',
          'CHECK THE CHEST. BE THOROUGH.',
        ]);
      }
      const chestDef = this.room.entities?.find((e) => e.id === 'boss-chest');
      if (
        chestDef &&
        !this.save.collected.includes(chestDef.id ?? '') &&
        !this.actors.some((a) => a.id === 'boss-chest' && a.alive)
      ) {
        this.spawnEntity(chestDef);
      }
      return;
    }
    if (actor.id === 'wolf-lord') {
      if (!this.save.landsCleared.includes('woodz')) {
        const r = rewardWoodzClear(this.save);
        this.save = r.save;
        this.game.events.emit('dialog-show', r.dialog);
      } else {
        this.game.events.emit('toast', 'WOLF LORD DOWN');
      }
      return;
    }
    if (actor.id === 'sand-wraith') {
      if (!this.save.landsCleared.includes('dezertz')) {
        const r = rewardDezertzClear(this.save);
        this.save = r.save;
        this.game.events.emit('dialog-show', r.dialog);
      } else {
        this.game.events.emit('toast', 'SAND WRAITH DOWN');
      }
      return;
    }
    // Generic boss fallback
    this.save.bossDefeated = true;
    this.game.events.emit('dialog-show', [
      'A BOSS FALLS!',
      'NICE WORK. THAT WAS RAD.',
    ]);
  }

  private collectItem(actor: Actor): void {
    if (!actor.alive) return;
    actor.alive = false;
    if (!this.save.collected.includes(actor.id)) {
      this.save.collected.push(actor.id);
    }

    if (actor.kind === 'sword') {
      actor.sprite.destroy();
      this.grantSword(true);
      return;
    } else if (actor.kind === 'key') {
      this.save = grantKey(this.save);
      this.game.events.emit('toast', 'GOT KEY: "FRIEND"');
      this.game.events.emit('dialog-show', [
        'YOU PICKED UP A KEY LABELED',
        '"FRIEND".',
        'EQUIPPED ON YOUR KEYRING.',
        'THE DOOR WAS NOT SUBTLE.',
      ]);
    } else if (actor.kind === 'heart') {
      this.save.attrs = {
        ...this.save.attrs,
        vit: this.save.attrs.vit + 1,
      };
      this.save = syncDerivedStats(this.save);
      this.save.hp = this.save.maxHp;
      this.game.events.emit('toast', 'VIT UP! MAX HP UP!');
    } else if (actor.kind === 'mapz') {
      const land = actor.mapzId ?? landForRoom(ROOMS, this.save.roomId);
      this.save = discoverMapz(this.save, land);
      writeSave(this.save);
      this.emitHud();
      const lines = actor.dialog?.length
        ? actor.dialog
        : [`MAPZ ACQUIRED: ${land.toUpperCase()}!`, 'PRESS M TO VIEW.'];
      this.game.events.emit('dialog-show', lines);
      this.game.events.emit('toast', `MAPZ: ${land.toUpperCase()} — PRESS M`);
      // Auto-open mapz after the pickup dialog is dismissed
      const openAfterDialog = (open: boolean) => {
        if (open) return;
        this.game.events.off('dialog-state', openAfterDialog);
        this.time.delayedCall(80, () => this.openMapzPanel());
      };
      this.game.events.on('dialog-state', openAfterDialog);
      actor.sprite.destroy();
      return;
    }

    actor.sprite.destroy();
    writeSave(this.save);
    this.emitHud();
  }

  private findInteractable(reach?: number): Actor | null {
    const max = reach ?? this.interactReach();
    let best: Actor | null = null;
    let bestDist = max;
    for (const a of this.actors) {
      if (!a.alive || !a.interactive) continue;
      if (
        ['slime', 'skeleton', 'redshirt', 'boss', 'wolf', 'cactus'].includes(
          a.kind,
        )
      ) {
        continue;
      }
      if (!a.sprite?.active) continue;
      const dist = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        a.sprite.x,
        a.sprite.y,
      );
      if (dist < bestDist) {
        bestDist = dist;
        best = a;
      }
    }
    return best;
  }

  private tryInteract(): void {
    if (this.dialogLocked || this.paused || this.panelOpen()) return;
    const best = this.findInteractable();
    if (!best) {
      this.game.events.emit('toast', 'NOTHING HERE - GET CLOSER');
      return;
    }

    if (
      best.kind === 'key' ||
      best.kind === 'heart' ||
      best.kind === 'sword' ||
      best.kind === 'mapz'
    ) {
      this.collectItem(best);
      return;
    }

    if (best.kind === 'chest') {
      this.openTreasureChest(best);
      return;
    }

    if (best.kind === 'forje') {
      // Open graphic forje UI (same as F when nearby)
      this.forjingSelected = 0;
      this.game.events.emit('forjing-toggle', {
        save: this.save,
        selectedIndex: 0,
      });
      this.game.events.emit('toast', 'FORJE — SELECT A RECIPE');
      return;
    }

    if (best.kind === 'cube' || best.id === 'gel-cube') {
      this.talkToCube(best);
      return;
    }

    if (best.kind === 'princess' || best.id === 'prizella') {
      if (this.save.princessSaved || this.save.landsCleared.includes('dezertz')) {
        // Champion quests: Best Bud stages via pure helper
        this.save = ensureRunSeed(this.save);
        const talk = prizellaChampionTalk(this.save);
        this.save = talk.save;
        writeSave(this.save);
        this.game.events.emit('dialog-show', talk.dialog);
        this.syncCompanion();
      } else if (this.save.killed.includes('sand-wraith')) {
        this.save = {
          ...this.save,
          princessSaved: true,
          flags: { ...this.save.flags, princess_saved: true },
        };
        this.save = ensureRunSeed(this.save);
        writeSave(this.save);
        // First freedom talk: kingdom duty, then Best Bud on next E
        this.game.events.emit('dialog-show', [
          'PRIZELLA: YOU DID IT! MATHEMATICAL!',
          'I AM FREE. MOSTLY. THERE\'S STILL SAND.',
          '',
          ...princessChampionDialog(),
          '',
          'TALK TO ME AGAIN FOR CHAMPION JOB #1.',
        ]);
      } else {
        this.game.events.emit('dialog-show', best.dialog ?? [
          'PRIZELLA: BONK THE WRAITH FIRST!',
          'THEN WE TALK KINGDOM STUFF.',
        ]);
      }
      return;
    }

    if (best.kind === 'best_bud' || best.id === 'best-bud-den') {
      this.talkToBestBud(best);
      return;
    }

    if (best.kind === 'merchant' || best.shopId) {
      const shopId = best.shopId ?? 'tinkerer';
      // Greeting lines first, then open shop grid
      const greet =
        best.dialog?.length
          ? best.dialog
          : [
              'TINKERER: RARE WARES! FAIR-ISH PRICES!',
              'PRESS ENTER TO BROWSE THE SHOP.',
            ];
      this.game.events.emit('dialog-show', [
        ...greet,
        '',
        'OPENING SHOP… TRY NOT TO TOUCH EVERYTHING.',
      ]);
      // After dialog closes, open shop once
      const openShopAfter = (open: boolean) => {
        if (open) return;
        this.game.events.off('dialog-state', openShopAfter);
        this.time.delayedCall(60, () => this.openShop(shopId));
      };
      this.game.events.on('dialog-state', openShopAfter);
      return;
    }

    if (best.dialog?.length) {
      // Classic Zelda: talking to the old man hands you the sword
      if (best.id === 'old-man' && !this.save.hasSword) {
        this.grantSword(false);
        this.game.events.emit('dialog-show', [
          ...best.dialog,
          '',
          'SWORD OF MILD ENTHUSIASM: YOURS NOW.',
          'SPACE / Z TO SWING. GO BE COOL.',
        ]);
        return;
      }
      // Old man post-quest hints
      if (best.id === 'old-man') {
        this.game.events.emit('dialog-show', [
          ...best.dialog,
          '',
          ...questHint(this.save),
        ]);
        return;
      }
      this.game.events.emit('dialog-show', best.dialog);
      return;
    }

    this.game.events.emit('toast', 'THEY HAVE NOTHING TO SAY');
  }

  private openTreasureChest(actor: Actor): void {
    if (!actor.alive) return;
    if (this.save.collected.includes(actor.id)) {
      this.game.events.emit('dialog-show', ['ALREADY LOOTED. DUSTY.']);
      return;
    }

    const table = actor.chestTable ?? 'dungeon';
    const drops = openChest(table);
    this.save = applyLootToSave(this.save, drops);
    this.save.collected.push(actor.id);
    actor.alive = false;
    actor.sprite.destroy();

    const lines = [
      'CHEST OPENED!',
      ...lootSummary(drops).map((l) => `+ ${l}`),
      ...(actor.dialog ?? []),
    ];
    writeSave(this.save);
    this.emitHud();
    this.game.events.emit('dialog-show', lines);
  }

  private openShopIfNearMerchant(): void {
    const merchant = this.findInteractable();
    if (
      !merchant ||
      (merchant.kind !== 'merchant' && !merchant.shopId)
    ) {
      this.game.events.emit('toast', 'NO MERCHANT NEARBY');
      return;
    }
    this.openShop(merchant.shopId ?? 'tinkerer');
  }

  private openShop(shopId: string): void {
    if (this.paused || this.inventoryOpen || this.mapzOpen || this.forjingOpen) {
      return;
    }
    if (this.shopOpen) return;
    const shop = getShop(shopId);
    if (!shop) {
      this.game.events.emit('toast', 'SHOP CLOSED');
      return;
    }
    this.shopId = shopId;
    this.shopSelected = 0;
    this.shopBagSelected = 0;
    this.shopPane = 'stock';
    this.game.events.emit('shop-toggle', {
      save: this.save,
      shopId,
      selectedIndex: 0,
      bagSelectedIndex: 0,
      pane: 'stock',
    });
    this.game.events.emit('toast', 'TINKERER — BUY LEFT, SELL RIGHT');
  }

  /** Enter/B: buy from stock pane, or sell from bag pane. */
  private confirmShopTrade(): void {
    if (!this.shopId) return;
    if (this.shopPane === 'bag') {
      this.sellSelectedBagItem();
      return;
    }
    this.buySelectedShopItem();
  }

  private buySelectedShopItem(): void {
    if (!this.shopId) return;
    const shop = getShop(this.shopId);
    const item = shop?.stock[this.shopSelected];
    if (!item) return;
    const result = attemptPurchase(this.save, this.shopId, item.id);
    if (!result.ok) {
      if (result.reason === 'insufficient_funds') {
        this.game.events.emit(
          'toast',
          `NEED ${item.price}c (have ${this.save.coins}c)`,
        );
      } else {
        this.game.events.emit('toast', 'CANNOT BUY THAT');
      }
      return;
    }
    this.save = result.save;
    writeSave(this.save);
    this.emitHud();
    this.game.events.emit(
      'toast',
      `BOUGHT ${result.item.name} (-${result.item.price}c)`,
    );
    this.game.events.emit('shop-refresh', this.save);
    this.game.events.emit('inventory-refresh', this.save);
  }

  private sellSelectedBagItem(): void {
    if (!this.shopId) return;
    const result = attemptSellIndex(
      this.save,
      this.shopId,
      this.shopBagSelected,
    );
    if (!result.ok) {
      if (result.reason === 'nothing_to_sell') {
        this.game.events.emit('toast', 'NOTHING TO SELL');
      } else {
        this.game.events.emit('toast', 'CANNOT SELL THAT');
      }
      return;
    }
    this.save = result.save;
    writeSave(this.save);
    this.emitHud();
    const bag = listPlayerSellables(this.save, this.shopId);
    if (this.shopBagSelected >= bag.length) {
      this.shopBagSelected = Math.max(0, bag.length - 1);
    }
    this.game.events.emit(
      'toast',
      `SOLD ${result.name} (+${result.coins}c)`,
    );
    this.game.events.emit('shop-refresh', this.save);
    this.game.events.emit('inventory-refresh', this.save);
    this.game.events.emit('shop-select', {
      pane: 'bag',
      index: this.shopBagSelected,
    });
  }

  private navShop(dir: 'up' | 'down' | 'left' | 'right'): void {
    if (!this.shopOpen || !this.shopId) return;
    const shop = getShop(this.shopId);
    if (!shop) return;

    if (this.shopPane === 'stock') {
      if (!shop.stock.length) {
        if (dir === 'right') {
          this.shopPane = 'bag';
          this.game.events.emit('shop-select', {
            pane: 'bag',
            index: this.shopBagSelected,
          });
        }
        return;
      }
      const cols = SHOP_STOCK_COLS;
      const col = this.shopSelected % cols;
      // Right edge → jump to bag pane
      if (dir === 'right' && col === cols - 1) {
        this.shopPane = 'bag';
        const bag = listPlayerSellables(this.save, this.shopId);
        if (bag.length && this.shopBagSelected >= bag.length) {
          this.shopBagSelected = 0;
        }
        this.game.events.emit('shop-select', {
          pane: 'bag',
          index: this.shopBagSelected,
        });
        return;
      }
      this.shopSelected = shopIndexFromDir(
        this.shopSelected,
        shop.stock.length,
        cols,
        dir,
      );
      this.game.events.emit('shop-select', {
        pane: 'stock',
        index: this.shopSelected,
      });
      return;
    }

    // Bag pane
    const bag = listPlayerSellables(this.save, this.shopId);
    if (!bag.length) {
      if (dir === 'left') {
        this.shopPane = 'stock';
        this.game.events.emit('shop-select', {
          pane: 'stock',
          index: this.shopSelected,
        });
      }
      return;
    }
    const cols = SHOP_BAG_COLS;
    const col = this.shopBagSelected % cols;
    if (dir === 'left' && col === 0) {
      this.shopPane = 'stock';
      this.game.events.emit('shop-select', {
        pane: 'stock',
        index: this.shopSelected,
      });
      return;
    }
    this.shopBagSelected = shopIndexFromDir(
      this.shopBagSelected,
      bag.length,
      cols,
      dir,
    );
    this.game.events.emit('shop-select', {
      pane: 'bag',
      index: this.shopBagSelected,
    });
  }

  private tryAttack(): void {
    if (this.attacking || this.dialogLocked || this.paused || this.panelOpen()) {
      return;
    }

    if (!hasWeaponEquipped(this.save)) {
      this.game.events.emit(
        'toast',
        'NO WEAPON EQUIPPED — TALK TO OLD MAN / [I] THEN W',
      );
      return;
    }

    this.attacking = true;
    // Hip sheathe vanishes while the blade is out in front
    this.refreshPlayerAppearance();

    const offset = 36;
    let x = this.player.x;
    let y = this.player.y;
    let angle = 0;
    if (this.facing === 'up') {
      y -= offset;
      angle = 0;
    } else if (this.facing === 'down') {
      y += offset;
      angle = 180;
    } else if (this.facing === 'left') {
      x -= offset;
      angle = -90;
    } else {
      x += offset;
      angle = 90;
    }

    this.swordHit.setPosition(x, y);
    this.swordHit.setAngle(angle);
    this.swordHit.setVisible(true);
    this.swordHit.setActive(true);
    this.swordHit.setDepth(15);
    const body = this.swordHit.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.moves = false;
    // Larger than sprite so overlaps vs big creeps (cube 20px frame) register
    body.setSize(28, 28);
    body.reset(x, y);

    // Immediate range check — reliable vs oversized frames if overlap misses a frame
    const reach = TILE * SCALE * 1.35;
    for (const a of this.actors) {
      if (!a.alive) continue;
      if (
        !['slime', 'skeleton', 'redshirt', 'cube', 'boss', 'wolf', 'cactus'].includes(
          a.kind,
        )
      ) {
        continue;
      }
      const dist = Phaser.Math.Distance.Between(
        x,
        y,
        a.sprite.x,
        a.sprite.y,
      );
      if (dist <= reach) this.hitEnemy(a);
    }

    // Keep attacking flag true long enough for overlap callbacks
    this.time.delayedCall(220, () => {
      this.swordHit.setVisible(false);
      this.swordHit.setPosition(-999, -999);
      body.reset(-999, -999);
      // Leave body enabled so next swing overlaps rebind cleanly
      this.attacking = false;
      // Sword returns to hip when swing ends
      this.refreshPlayerAppearance();
    });
  }

  private tryUnlockNearPlayer(): void {
    if (!this.save.hasKey) return; // derived from equipped key
    const { tx, ty } = this.worldToTile(this.player.x, this.player.y);
    const dirs = [
      [0, 0],
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ];
    for (const [dx, dy] of dirs) {
      const x = tx + dx;
      const y = ty + dy;
      if (y < 0 || y >= VIEW_TILES_H || x < 0 || x >= VIEW_TILES_W) continue;
      if (this.tileGrid[y][x] === 'locked') {
        this.unlockDoor(x, y);
        return;
      }
    }
  }

  private unlockDoor(tx: number, ty: number): void {
    this.tileGrid[ty][tx] = 'door';
    // Consume equipped key from bag
    const keyUid = this.save.equipped.key;
    if (keyUid) {
      this.save.bag = this.save.bag.filter((i) => i.uid !== keyUid);
      this.save.equipped = { ...this.save.equipped, key: null };
      this.save = syncDerivedStats(this.save);
    }
    this.save.flags['door-unlocked'] = true;
    this.game.events.emit('toast', 'THE DOOR HEARS "FRIEND"');
    this.game.events.emit('dialog-show', [
      'THE LOCKED DOOR CLICKS OPEN.',
      'SOMEWHERE, A FELLOWSHIP',
      'APPLAUDS POLITELY.',
    ]);

    // Rebuild walls for this room without full reload
    this.walls.clear(true, true);
    this.children.list
      .filter((c) => (c as Phaser.GameObjects.Image).getData?.('mapTile'))
      .forEach((c) => c.destroy());

    for (let y = 0; y < VIEW_TILES_H; y++) {
      for (let x = 0; x < VIEW_TILES_W; x++) {
        const kind = this.tileGrid[y][x];
        const pos = this.tileToWorld(x, y);
        const img = this.add
          .image(pos.x, pos.y, TEX[kind])
          .setScale(SCALE)
          .setDepth(0);
        img.setData('mapTile', true);
        if (SOLID.includes(kind)) {
          this.addWallAt(pos.x, pos.y, kind);
        }
      }
    }
    // Re-depth player/actors
    this.player.setDepth(10);
    this.actors.forEach((a) => a.sprite.setDepth(5));
    writeSave(this.save);
    this.emitHud();
  }

  private checkHazards(delta: number): void {
    const { tx, ty } = this.worldToTile(this.player.x, this.player.y);
    if (ty < 0 || ty >= VIEW_TILES_H || tx < 0 || tx >= VIEW_TILES_W) return;
    const tile = this.tileGrid[ty][tx];

    if (tile === 'lava' && this.invuln <= 0) {
      this.save.hp = Math.max(0, this.save.hp - 1);
      this.invuln = 600;
      this.emitHud();
      this.player.setTint(0xff8844);
      this.time.delayedCall(120, () => this.player.clearTint());
      if (this.save.hp <= 0) this.die();
    }

    if (tile === 'pad' && this.padCooldown <= 0) {
      this.padCooldown = 1500;
      this.game.events.emit('toast', 'TRANSPORTER MALFUNCTION!');
      // Random teleport in room
      for (let i = 0; i < 20; i++) {
        const rx = Phaser.Math.Between(1, VIEW_TILES_W - 2);
        const ry = Phaser.Math.Between(1, VIEW_TILES_H - 2);
        const k = this.tileGrid[ry][rx];
        if (!SOLID.includes(k) && k !== 'lava') {
          const p = this.tileToWorld(rx, ry);
          this.player.setPosition(p.x, p.y);
          break;
        }
      }
    }

    // Stairs down (S) and stairs up (U) — different dungeon floors
    if (!this.transitionLock) {
      if (tile === 'stairs' && this.room.stairsDown) {
        this.transitionLock = true;
        this.loadRoom(this.room.stairsDown, false, 'stairsDown');
        return;
      }
      if (tile === 'stairs_up' && this.room.stairsUp) {
        this.transitionLock = true;
        this.loadRoom(this.room.stairsUp, false, 'stairsUp');
        return;
      }
    }

    void delta;
  }

  private checkRoomExit(): void {
    if (this.transitionLock || this.dialogLocked) return;
    const { tx, ty } = this.worldToTile(this.player.x, this.player.y);

    // Cardinal doors: entryFrom = opposite edge (door entered on destination room)
    if (ty <= 0 && this.room.north) {
      this.transitionLock = true;
      this.loadRoom(this.room.north, false, entryFromOpposite('north'));
      return;
    }
    if (ty >= VIEW_TILES_H - 1 && this.room.south) {
      this.transitionLock = true;
      this.loadRoom(this.room.south, false, entryFromOpposite('south'));
      return;
    }
    if (tx <= 0 && this.room.west) {
      this.transitionLock = true;
      this.loadRoom(this.room.west, false, entryFromOpposite('west'));
      return;
    }
    if (tx >= VIEW_TILES_W - 1 && this.room.east) {
      this.transitionLock = true;
      this.loadRoom(this.room.east, false, entryFromOpposite('east'));
      return;
    }
  }

  private updateEnemies(delta: number): void {
    for (const a of this.actors) {
      if (!a.alive) continue;
      a.hurtCooldown = Math.max(0, a.hurtCooldown - delta);
      a.aiTimer -= delta;

      const hostile = [
        'slime',
        'skeleton',
        'redshirt',
        'cube',
        'boss',
        'wolf',
        'cactus',
      ].includes(a.kind);
      if (!hostile || this.dialogLocked || this.paused || this.panelOpen()) {
        if (a.sprite.body) {
          (a.sprite.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        }
        continue;
      }

      // Safety: if clipped into solid, shove back toward room center
      this.unstickFromWall(a);

      // Peaceful cube idles until provoked
      if (a.kind === 'cube' && !a.aggressive) {
        if (a.sprite.body) {
          (a.sprite.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        }
        continue;
      }

      if (a.aiTimer <= 0) {
        a.aiTimer = Phaser.Math.Between(400, 900);
        const speed =
          a.kind === 'boss'
            ? 70
            : a.kind === 'wolf'
              ? 65
              : a.kind === 'cactus'
                ? 30
                : a.kind === 'skeleton'
                  ? 55
                  : a.kind === 'redshirt'
                    ? 80
                    : a.kind === 'cube'
                      ? 28
                      : 40;
        // Prefer cardinal moves so wall colliders behave cleanly
        const dx = this.player.x - a.sprite.x;
        const dy = this.player.y - a.sprite.y;
        let vx = 0;
        let vy = 0;
        if (a.kind === 'redshirt' && Math.random() < 0.35) {
          vx = Phaser.Math.Between(-speed, speed);
          vy = Phaser.Math.Between(-speed, speed);
        } else if (Math.abs(dx) > Math.abs(dy)) {
          vx = Math.sign(dx) * speed;
          // slight vertical so they can track around corners
          if (Math.abs(dy) > 8) vy = Math.sign(dy) * (speed * 0.35);
        } else {
          vy = Math.sign(dy) * speed;
          if (Math.abs(dx) > 8) vx = Math.sign(dx) * (speed * 0.35);
        }
        // Don't charge into an immediately solid tile
        const next = this.enemyDesiredVelocity(a, vx, vy, speed);
        (a.sprite.body as Phaser.Physics.Arcade.Body).setVelocity(
          next.vx,
          next.vy,
        );
      }
    }
  }

  /** Zero velocity component that would enter a solid tile. */
  private enemyDesiredVelocity(
    a: Actor,
    vx: number,
    vy: number,
    speed: number,
  ): { vx: number; vy: number } {
    const probe = TILE * SCALE * 0.55;
    let outX = vx;
    let outY = vy;
    if (vx !== 0) {
      const tx = Math.floor(
        (a.sprite.x + Math.sign(vx) * probe - this.roomOriginX) /
          (TILE * SCALE),
      );
      const ty = Math.floor(
        (a.sprite.y - this.roomOriginY) / (TILE * SCALE),
      );
      if (this.isSolidTile(tx, ty)) outX = 0;
    }
    if (vy !== 0) {
      const tx = Math.floor(
        (a.sprite.x - this.roomOriginX) / (TILE * SCALE),
      );
      const ty = Math.floor(
        (a.sprite.y + Math.sign(vy) * probe - this.roomOriginY) /
          (TILE * SCALE),
      );
      if (this.isSolidTile(tx, ty)) outY = 0;
    }
    // If fully blocked, try sliding along the other axis toward player
    if (outX === 0 && outY === 0) {
      const dx = this.player.x - a.sprite.x;
      const dy = this.player.y - a.sprite.y;
      if (Math.abs(dx) >= Math.abs(dy)) {
        const tx = Math.floor(
          (a.sprite.x + Math.sign(dx) * probe - this.roomOriginX) /
            (TILE * SCALE),
        );
        const ty = Math.floor(
          (a.sprite.y - this.roomOriginY) / (TILE * SCALE),
        );
        if (!this.isSolidTile(tx, ty)) outX = Math.sign(dx) * speed;
      } else {
        const tx = Math.floor(
          (a.sprite.x - this.roomOriginX) / (TILE * SCALE),
        );
        const ty = Math.floor(
          (a.sprite.y + Math.sign(dy) * probe - this.roomOriginY) /
            (TILE * SCALE),
        );
        if (!this.isSolidTile(tx, ty)) outY = Math.sign(dy) * speed;
      }
    }
    return { vx: outX, vy: outY };
  }

  private isSolidTile(tx: number, ty: number): boolean {
    if (ty < 0 || ty >= VIEW_TILES_H || tx < 0 || tx >= VIEW_TILES_W) {
      return true;
    }
    return SOLID.includes(this.tileGrid[ty][tx]);
  }

  private unstickFromWall(a: Actor): void {
    const { tx, ty } = this.worldToTile(a.sprite.x, a.sprite.y);
    if (!this.isSolidTile(tx, ty)) return;
    // Nudge toward room center (walkable floors cluster mid-map)
    const cx = this.roomOriginX + (VIEW_TILES_W / 2) * TILE * SCALE;
    const cy = this.roomOriginY + (VIEW_TILES_H / 2) * TILE * SCALE;
    const ang = Phaser.Math.Angle.Between(a.sprite.x, a.sprite.y, cx, cy);
    a.sprite.x += Math.cos(ang) * 6;
    a.sprite.y += Math.sin(ang) * 6;
    (a.sprite.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
  }

  update(_time: number, delta: number): void {
    if (!this.player?.body) return;

    // Pause / panel close
    if (Phaser.Input.Keyboard.JustDown(this.keys.esc)) {
      if (this.inventoryOpen) {
        this.game.events.emit('inventory-toggle', this.save);
      } else if (this.mapzOpen) {
        this.game.events.emit('mapz-toggle');
      } else if (this.forjingOpen) {
        this.game.events.emit('forjing-toggle');
      } else if (this.shopOpen) {
        this.game.events.emit('shop-toggle');
      } else {
        this.paused = !this.paused;
        this.game.events.emit('pause-ui', this.paused);
        if (this.paused) {
          (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        }
      }
    }
    if (this.paused) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.m)) {
        writeSave(this.save);
        // Soft-reset UI — do not stop (listener/chrome race kills dialog)
        this.game.events.emit('ui-reset');
        this.scene.start('Title');
      }
      return;
    }

    this.invuln = Math.max(0, this.invuln - delta);
    this.padCooldown = Math.max(0, this.padCooldown - delta);
    this.dialogCloseCooldown = Math.max(0, this.dialogCloseCooldown - delta);

    if (this.dialogLocked || this.panelOpen()) {
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      // Shop grid navigation while open
      if (this.shopOpen) {
        if (Phaser.Input.Keyboard.JustDown(this.cursors.left) || Phaser.Input.Keyboard.JustDown(this.keys.a)) {
          this.navShop('left');
        } else if (Phaser.Input.Keyboard.JustDown(this.cursors.right) || Phaser.Input.Keyboard.JustDown(this.keys.d)) {
          this.navShop('right');
        } else if (Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.keys.w)) {
          this.navShop('up');
        } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down) || Phaser.Input.Keyboard.JustDown(this.keys.s)) {
          this.navShop('down');
        }
        // E close is handled only in onInteractKey (not JustDown here)
        if (Phaser.Input.Keyboard.JustDown(this.keys.enter)) {
          this.confirmShopTrade();
        }
      }
      // Forje grid navigation
      if (this.forjingOpen) {
        if (Phaser.Input.Keyboard.JustDown(this.cursors.left) || Phaser.Input.Keyboard.JustDown(this.keys.a)) {
          this.navForjing('left');
        } else if (Phaser.Input.Keyboard.JustDown(this.cursors.right) || Phaser.Input.Keyboard.JustDown(this.keys.d)) {
          this.navForjing('right');
        } else if (Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.keys.w)) {
          this.navForjing('up');
        } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down) || Phaser.Input.Keyboard.JustDown(this.keys.s)) {
          this.navForjing('down');
        }
        if (Phaser.Input.Keyboard.JustDown(this.keys.enter)) {
          this.confirmForjingAction();
        }
      }
      // Enemies still move while inventory is open so the world is not frozen unfairly
      this.updateEnemies(delta);
      return;
    }

    const speed = 140;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown || this.keys.a.isDown) {
      vx = -speed;
      this.facing = 'left';
    } else if (this.cursors.right.isDown || this.keys.d.isDown) {
      vx = speed;
      this.facing = 'right';
    }
    if (this.cursors.up.isDown || this.keys.w.isDown) {
      vy = -speed;
      this.facing = 'up';
    } else if (this.cursors.down.isDown || this.keys.s.isDown) {
      vy = speed;
      this.facing = 'down';
    }

    if (vx !== 0 && vy !== 0) {
      vx *= 0.707;
      vy *= 0.707;
    }
    body.setVelocity(vx, vy);

    // Blink while invuln
    this.player.setAlpha(this.invuln > 0 && Math.floor(_time / 80) % 2 === 0 ? 0.4 : 1);

    // Attack / interact also handled via keydown events; JustDown as backup
    // Attack backup via JustDown; interact is event-only (avoids double-fire)
    if (
      Phaser.Input.Keyboard.JustDown(this.keys.space) ||
      Phaser.Input.Keyboard.JustDown(this.keys.z)
    ) {
      this.tryAttack();
    }

    this.tryUnlockNearPlayer();
    this.checkHazards(delta);
    this.checkRoomExit();
    this.updateCompanionFollow();
    this.updateEnemies(delta);
  }
}
