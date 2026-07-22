import Phaser from 'phaser';
import {
  COLORS,
  GAME_H,
  GAME_W,
  HUD_H,
  MAP_PIXEL_H,
  MAP_PIXEL_W,
  SCALE,
  SPRITE_SCALE,
  TILE,
  VIEW_TILES_H,
  VIEW_TILES_W,
} from '../config';
import { ROOMS, resolveRoomId } from '../data/world';
import {
  entryFromOpposite,
  spawnForContinue,
  spawnInsideEntryEdge,
} from '../systems/map-spawn';
import {
  expandRoomTiles,
  mapEntityTile,
  type ExpandedRoom,
} from '../systems/room-expand';
import {
  clearAllTouch,
  consumeTouchAction,
  drainTouchActions,
  isTouchUiPreferred,
  setTouchPadMode,
  setTouchPadVisible,
  touchAxisDown,
  type TouchPadMode,
} from '../systems/touch-input';
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
  budAppearanceFromSave,
  withHiddenWeapon,
  type PlayerWalkFrame,
} from '../systems/appearance';
import { ensureBuddyTexture, ensurePlayerTexture } from '../systems/textures';
import { swingTextureKey } from '../systems/weapon-visuals';
import {
  ATTR_IDS,
  spendAttrPoint,
} from '../systems/attributes';
import {
  ARMY_MIN_LEVEL,
  canGraduateToArmy,
  graduateHeroToArmy,
  loadArmySave,
  writeArmySave,
} from '../systems/army';
import {
  resolveEnemyContactDamage,
  resolveEnemyHp,
} from '../systems/enemies';
import {
  applyMinibossKill,
  applyRulesLawyerForgive,
  ASSISTANT_HONK_ID,
  DEPUTY_HOWL_ID,
  isPeacefulMinibossUntilProvoked,
  LEASE_WIGHT_ID,
  RULES_LAWYER_ID,
  shouldApplyMinibossReward,
  shouldSkipMinibossSpawn,
} from '../systems/mid-boss';
import { actorHasLiveBody } from '../systems/actor-combat';
import {
  autoEquipEmptySlots,
  computePlayerDamage,
  consumeWeaponAmmo,
  equippedWeaponIsRanged,
  grantKey,
  grantMildSword,
  hasWeaponEquipped,
  syncDerivedStats,
  useInventoryItem,
} from '../systems/inventory';
import { findInBag, getTemplate, mintItem } from '../systems/items';
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
  roomIsDark,
  tickLightFuel,
  visionDarkAlpha,
} from '../systems/lighting';
import { tickCombatBuffs } from '../systems/scrolls';
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
  BUD_BLOCK_COOLDOWN_MS,
  BUD_HEAL_COOLDOWN_MS,
  budCanBlockHit,
  budCombatProfile,
  isHostileKind,
} from '../systems/best-bud-combat';
import {
  computeBudHealAmount,
  computeBudStrikeDamage,
  cycleEquipForTarget,
  equipForTarget,
  ensureBudProgress,
  grantBudXp,
  type EquipTarget,
} from '../systems/best-bud-gear';
import {
  QUEST_SEWERZ_GOOSE,
  prizellaKingdomTalk,
} from '../systems/champion-quests';
import {
  markLandCleared,
  princessChampionDialog,
  questHint,
  rewardDezertzClear,
  rewardDunjunzClear,
  rewardWoodzClear,
  unlockKingdomOnRescue,
} from '../systems/quest';
import {
  bossExitPortalDef,
  shouldSpawnBossExitPortal,
} from '../systems/portal';
import {
  beamMeUpTarget,
  hardExitPortalDef,
  hardGatePortalDef,
  hardProjectileForActor,
  isHardRunActive,
  killListForSpawn,
  parseHardPortalTarget,
  projectileSpec,
  recordKill,
  shouldPromoteCaptain,
  shouldSpawnHardExit,
  shouldSpawnHardGate,
  startHardRun,
  endHardRun,
  CAPTAIN_ID,
  CAPTAIN_HARD_ROOM,
} from '../systems/hard-mode';
import { rewardHardCaptain, rewardHardKing } from '../systems/hard-rewards';
import { pendingHeroPick } from '../systems/hero-identity';
import { playMusic, playSfx, type MusicId } from '../systems/audio';
import { loadSettings } from '../systems/settings';
import { loadSave, writeSave } from '../systems/save';
import {
  basementDepth,
  depthBackdropColor,
  depthEnemyTint,
  depthFlavor,
  depthTileTint,
} from '../systems/floor-depth';
import { threatForRoom } from '../systems/threat';
import { syncAchievements } from '../systems/achievements';
import {
  bobScale,
  enemyBobScale,
  motionAllowed,
  slashArc,
  sparkBurst,
} from '../systems/vfx';
import {
  faceBuddyToward,
  maybeBuddyIdleStretch,
  playBuddyAttackAnim,
  playBuddyBlinkTrail,
  playBuddyGrabAnim,
  playBuddyGuardAnim,
  playBuddyHealAnim,
  setBuddyGearSpec,
  setBuddyPose,
} from '../systems/bud-anim';
import {
  canSoftRespawn,
  respawnDelayMs,
  scaleRespawnContact,
  scaleRespawnHp,
} from '../systems/respawn';
import {
  flushAutoStatPackages,
  hasUnspentStatPackages,
} from '../systems/stat-allocate';
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
  /** Destination room for portal entities. */
  portalTarget?: string;
  /** Scaled contact damage at spawn (threat-aware). */
  contactDamage?: number;
  /** Cube stays peaceful until the player hits it. */
  aggressive?: boolean;
  /** Hard-mode shoot cooldown (ms). */
  shootCooldown?: number;
  /** Soft-respawn generation (0 = first spawn). */
  respawnGen?: number;
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
  miniboss: 'miniboss',
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
  portal: 'portal',
  tree: 'tree',
  tumbleweed: 'tumbleweed',
  scorpion: 'scorpion',
  tarantula: 'tarantula',
  hornet: 'hornet',
  torch_wall: 'torch_wall',
};

const MOBILE_HOSTILES = [
  'slime',
  'skeleton',
  'redshirt',
  'cube',
  'boss',
  'miniboss',
  'wolf',
  'scorpion',
  'tarantula',
  'hornet',
] as const;

/** Contact damage hostiles (includes stationary cactus). */
const CONTACT_HOSTILES = [...MOBILE_HOSTILES, 'cactus'] as const;

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
  /** Foot walk cycle: 0 idle, 1 left plant, 2 right plant. */
  private walkFrame: PlayerWalkFrame = 0;
  private walkAnimMs = 0;
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
  /** Dark-room vision overlay (readable darkness, not free sight). */
  private darkOverlay: Phaser.GameObjects.Rectangle | null = null;
  private wallTorchCount = 0;

  private shopId: string | null = null;
  private shopSelected = 0;
  private shopBagSelected = 0;
  private shopPane: ShopPane = 'stock';
  private paused = false;
  /** Guards against double goToTitle / mid-update scene tears. */
  private leavingToTitle = false;
  /** Rising-edge latch for touch d-pad while panels open. */
  private touchNavLatch = {
    up: false,
    down: false,
    left: false,
    right: false,
  };
  private transitionLock = false;
  private roomOriginX = 0;
  private roomOriginY = 0;
  /** Last room expand result (entity placement + stretch metadata). */
  private roomExpand: ExpandedRoom | null = null;
  private padCooldown = 0;
  /** Blocks walk-on portals right after room load (entry overlap). */
  private portalCooldown = 0;
  private bossIntroShown = false;
  /** Following Best Bud companion sprite (after found). */
  private companionSprite: Phaser.Physics.Arcade.Sprite | null = null;
  /** Bud combat cooldowns (ms). */
  private budAttackCd = 0;
  private budHealCd = 0;
  private budBlockCd = 0;
  /** While >0, skip follow/bob so attack/grab tweens own the sprite. */
  private budAnimLock = 0;
  /**
   * Bumps on every room load. Delayed buddy strikes capture the epoch and
   * no-op if the player left the room before the lash lands (prevents
   * setVelocity on destroyed physics bodies).
   */
  private roomEpoch = 0;
  /** Time since last combat action — drives idle stretch yawns. */
  private budIdleMs = 0;
  /** Inventory equip target: hero gear or buddy gear (toggle Y). */
  private gearTarget: EquipTarget = 'hero';
  /** Ambient animated map tiles (water/lava). */
  private ambientTiles: { img: Phaser.GameObjects.Image; kind: 'water' | 'lava' }[] =
    [];
  private animTime = 0;
  private ambientFrame = 0;
  /** Enemy + player projectiles (hard mode / ranged weapons). */
  private projectiles: {
    img: Phaser.GameObjects.Image;
    vx: number;
    vy: number;
    dmg: number;
    life: number;
    fromPlayer: boolean;
  }[] = [];
  private rangedCd = 0;
  /** Soft-respawn generation per entity id (room-local). */
  private respawnGen = new Map<string, number>();
  private onAutoStatsEnabled = (): void => {
    this.applyAutoStatsIfEnabled(true);
  };

  constructor() {
    super('Game');
  }

  create(): void {
    // Mobile pad (EMA council) — show only during crawl play
    setTouchPadVisible(true);
    clearAllTouch();

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
    this.leavingToTitle = false;
    this.attacking = false;
    this.invuln = 0;
    this.transitionLock = false;
    this.padCooldown = 0;
    this.portalCooldown = 0;
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
    kb.on('keydown-Y', this.onGearTargetToggle, this);
    kb.on('keydown-P', this.onGraduateArmyKey, this);
    kb.on('keydown-J', this.onJournalKey, this);
    kb.on('keydown-M', this.onMapzKey, this);
    kb.on('keydown-TAB', this.onMapzKey, this);
    kb.on('keydown-OPEN_BRACKET', () => {
      if (this.inventoryOpen) {
        this.game.events.emit('inventory-bag-page', -1);
        return;
      }
      if (this.shopOpen) {
        this.game.events.emit('shop-page', -1);
        return;
      }
      this.onMapzNav('floor-prev');
    });
    kb.on('keydown-CLOSED_BRACKET', () => {
      if (this.inventoryOpen) {
        this.game.events.emit('inventory-bag-page', 1);
        return;
      }
      if (this.shopOpen) {
        this.game.events.emit('shop-page', 1);
        return;
      }
      this.onMapzNav('floor-next');
    });
    kb.on('keydown-PAGE_UP', () => {
      if (this.inventoryOpen) this.game.events.emit('inventory-bag-page', -1);
      if (this.shopOpen) this.game.events.emit('shop-page', -1);
    });
    kb.on('keydown-PAGE_DOWN', () => {
      if (this.inventoryOpen) this.game.events.emit('inventory-bag-page', 1);
      if (this.shopOpen) this.game.events.emit('shop-page', 1);
    });
    kb.on('keydown-T', () => {
      if (this.inventoryOpen) this.game.events.emit('inventory-bag-sort');
    });
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
    this.player.setScale(SPRITE_SCALE);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
    // Body size in source pixels (texture is 16x16); Phaser scales with the sprite
    this.player.setBodySize(10, 12, true);
    this.refreshPlayerAppearance();

    // Keep sword GO + body ALWAYS active. Disabling the body between swings
    // breaks Arcade overlap vs some enemies (notably oversized cube/boss frames).
    this.swordHit = this.physics.add.image(-999, -999, 'sword-swing');
    this.swordHit.setScale(SPRITE_SCALE);
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
    this.game.events.on('pause-action', this.onPauseAction, this);
    this.game.events.on('spend-attr', this.onSpendAttrEvent, this);
    this.game.events.on('auto-stats-flush', this.onAutoStatsFlushEvent, this);
    window.addEventListener('dunjunz-auto-stats-enabled', this.onAutoStatsEnabled);
    window.addEventListener('dunjunz-save-updated', this.onSaveUpdated);
    this.events.once('shutdown', () => {
      window.removeEventListener(
        'dunjunz-auto-stats-enabled',
        this.onAutoStatsEnabled,
      );
      window.removeEventListener('dunjunz-save-updated', this.onSaveUpdated);
      this.game.events.off('dialog-state', this.onDialogState, this);
      this.game.events.off('inventory-state', this.onInventoryState, this);
      this.game.events.off('mapz-state', this.onMapzState, this);
      this.game.events.off('forjing-state', this.onForjingState, this);
      this.game.events.off('forjing-cursor', this.onForjingCursor, this);
      this.game.events.off('shop-state', this.onShopState, this);
      this.game.events.off('shop-cursor', this.onShopCursor, this);
      this.game.events.off('inventory-bag-activate', this.onBagActivate, this);
      this.game.events.off('pause-action', this.onPauseAction, this);
      this.game.events.off('spend-attr', this.onSpendAttrEvent, this);
      this.game.events.off('auto-stats-flush', this.onAutoStatsFlushEvent, this);
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
      clearAllTouch();
      setTouchPadVisible(false);
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
    this.time.delayedCall(500, () => this.checkHeroPick());
  }

  /** Cloud/local save mutated outside the scene (account import, etc.). */
  private onSaveUpdated = (): void => {
    // Scene may be shut down; ignore late cloud-save events
    if (!this.sys.isActive()) return;
    this.save = loadSave();
    this.emitHud();
  };

  private syncTouchPadMode(mode: TouchPadMode): void {
    setTouchPadMode(mode);
  }

  /**
   * Map pad buttons while dialog / inventory / shop / forje / mapz open.
   * Desktop keyboard paths stay unchanged.
   */
  private handleModalTouchInput(): void {
    const edgeAxis = (axis: 'up' | 'down' | 'left' | 'right'): boolean => {
      const down = touchAxisDown(axis);
      const was = this.touchNavLatch[axis];
      this.touchNavLatch[axis] = down;
      return down && !was;
    };

    if (this.dialogLocked) {
      this.syncTouchPadMode('dialog');
      if (consumeTouchAction('attack') || consumeTouchAction('interact')) {
        this.game.events.emit('dialog-advance');
      }
      if (consumeTouchAction('menu') || consumeTouchAction('use')) {
        this.game.events.emit('dialog-close');
      }
      // Drain stray bag/map so they don't fire when talk ends
      consumeTouchAction('inventory');
      consumeTouchAction('map');
      return;
    }

    this.syncTouchPadMode('panel');

    if (this.inventoryOpen) {
      if (edgeAxis('left')) this.game.events.emit('inventory-nav', 'left');
      if (edgeAxis('right')) this.game.events.emit('inventory-nav', 'right');
      if (edgeAxis('up')) this.game.events.emit('inventory-nav', 'up');
      if (edgeAxis('down')) this.game.events.emit('inventory-nav', 'down');
      if (consumeTouchAction('map')) {
        this.game.events.emit('inventory-bag-page', 1);
      }
      if (consumeTouchAction('use')) {
        this.game.events.emit('inventory-bag-page', -1);
      }
      if (consumeTouchAction('attack') || consumeTouchAction('interact')) {
        // Activate selected bag cell (equip / use)
        this.game.events.emit('inventory-bag-activate-selected');
      }
      if (consumeTouchAction('menu') || consumeTouchAction('inventory')) {
        this.game.events.emit('inventory-toggle', this.save);
        drainTouchActions();
        this.syncTouchPadMode('explore');
      }
      return;
    }

    if (this.shopOpen) {
      if (edgeAxis('left')) this.navShop('left');
      if (edgeAxis('right')) this.navShop('right');
      if (edgeAxis('up')) this.navShop('up');
      if (edgeAxis('down')) this.navShop('down');
      if (consumeTouchAction('attack') || consumeTouchAction('interact')) {
        this.confirmShopTrade();
      }
      if (consumeTouchAction('map')) this.game.events.emit('shop-page', 1);
      if (consumeTouchAction('use')) this.game.events.emit('shop-page', -1);
      if (consumeTouchAction('menu')) {
        this.game.events.emit('shop-toggle');
        drainTouchActions();
        this.syncTouchPadMode('explore');
      }
      return;
    }

    if (this.forjingOpen) {
      if (edgeAxis('left')) this.navForjing('left');
      if (edgeAxis('right')) this.navForjing('right');
      if (edgeAxis('up')) this.navForjing('up');
      if (edgeAxis('down')) this.navForjing('down');
      if (consumeTouchAction('attack') || consumeTouchAction('interact')) {
        this.confirmForjingAction();
      }
      if (consumeTouchAction('menu')) {
        this.game.events.emit('forjing-toggle');
        drainTouchActions();
        this.syncTouchPadMode('explore');
      }
      return;
    }

    if (this.mapzOpen) {
      if (edgeAxis('left') || edgeAxis('up')) this.onMapzNav('floor-prev');
      if (edgeAxis('right') || edgeAxis('down')) this.onMapzNav('floor-next');
      if (consumeTouchAction('use')) this.onMapzNav('land-prev');
      if (consumeTouchAction('map')) this.onMapzNav('land-next');
      if (
        consumeTouchAction('menu') ||
        consumeTouchAction('attack') ||
        consumeTouchAction('interact') ||
        consumeTouchAction('inventory')
      ) {
        this.game.events.emit('mapz-toggle');
        drainTouchActions();
        this.syncTouchPadMode('explore');
      }
    }
  }

  /** Pause overlay buttons (UIScene) or keyboard M. */
  private onPauseAction = (action: 'resume' | 'title'): void => {
    if (!this.sys.isActive() || this.leavingToTitle) return;
    if (action === 'resume') {
      this.paused = false;
      this.game.events.emit('pause-ui', false);
      return;
    }
    if (action === 'title') {
      this.goToTitle();
    }
  };

  /**
   * Leave crawl cleanly: save, clear pad, stop HUD + Game, then Title.
   * Must NOT call scene.start mid-update — that freezes Phaser (ESC→M bug).
   * Leaving UI running also buried the title under hearts/chrome.
   */
  private goToTitle(): void {
    if (this.leavingToTitle) return;
    this.leavingToTitle = true;

    writeSave(this.save);
    this.paused = false;
    this.dialogLocked = false;
    this.inventoryOpen = false;
    this.mapzOpen = false;
    this.forjingOpen = false;
    this.shopOpen = false;
    this.transitionLock = false;
    clearAllTouch();
    setTouchPadVisible(false);
    this.game.events.emit('pause-ui', false);
    this.game.events.emit('ui-reset');

    // Freeze local sim so this update frame can't re-enter combat/input
    try {
      this.physics?.world?.pause();
      if (this.player?.body) {
        (this.player.body as Phaser.Physics.Arcade.Body).enable = false;
      }
    } catch {
      /* scene may already be tearing down */
    }

    let ran = false;
    const run = () => {
      if (ran) return;
      ran = true;
      try {
        if (this.game.scene.isActive('UI') || this.game.scene.isSleeping('UI')) {
          this.game.scene.stop('UI');
        }
      } catch {
        /* ignore */
      }
      try {
        // Prefer manager APIs so we aren't mid-GameScene.update
        if (this.game.scene.isActive('Game') || this.game.scene.isSleeping('Game')) {
          this.game.scene.stop('Game');
        }
        this.game.scene.start('Title');
      } catch {
        // Last resort
        try {
          this.scene.start('Title');
        } catch {
          /* give up cleanly */
        }
      }
    };

    // Next tick — out of the input/update stack (scene.start mid-update freezes)
    if (this.time && this.sys.isActive()) {
      this.time.delayedCall(0, run);
    }
    window.setTimeout(run, 0);
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
    // Space/Z advance talk when open (parity with pad NEXT); no swing mid-dialog
    if (this.dialogLocked) {
      this.game.events.emit('dialog-advance');
      return;
    }
    if (this.panelOpen() || this.paused || this.dialogCloseCooldown > 0) {
      return;
    }
    this.tryAttack();
  };

  private onInteractKey = (): void => {
    // E advances talk when open (players expect "E again" to continue)
    if (this.dialogLocked) {
      this.game.events.emit('dialog-advance');
      return;
    }
    if (this.paused || this.dialogCloseCooldown > 0) return;
    // E also closes shop (do not also handle E in update — that same-frame
    // double-fire was opening then immediately closing the shop).
    if (this.shopOpen) {
      this.game.events.emit('shop-toggle');
      return;
    }
    if (this.panelOpen()) return;
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

  /** P — graduate this hero into Army Mode (needs Lv20+). Keep crawling for more. */
  private onGraduateArmyKey = (): void => {
    if (this.dialogLocked || this.paused || this.panelOpen()) return;
    if (!canGraduateToArmy(this.save)) {
      playSfx('error');
      this.game.events.emit(
        'toast',
        `ARMY NEEDS LV${ARMY_MIN_LEVEL}+ (YOU: ${this.save.level})`,
      );
      return;
    }
    const army = loadArmySave();
    const r = graduateHeroToArmy(army, this.save);
    if (!r.ok) {
      playSfx('error');
      this.game.events.emit('toast', r.reason);
      return;
    }
    writeArmySave(r.army);
    playSfx('success');
    this.game.events.emit('dialog-show', [
      'ARMY RECRUITMENT OFFICE (PORTABLE)',
      `${r.member.name} ${r.member.title}`,
      `PERSONALITY: ${r.member.personality.toUpperCase()}`,
      r.member.originNote,
      '',
      `ROSTER SIZE: ${r.army.members.length} (NO PARTY CAP)`,
      'THIS SAVE STAYS — TRAIN ANOTHER PERSONALITY!',
      'TITLE → MODE 3 / ARMY TO COMMAND THEM.',
    ]);
    this.game.events.emit(
      'toast',
      `ENLISTED ${r.member.name} · ARMY ${r.army.members.length}`,
    );
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
    this.save = {
      ...result.save,
      flags: { ...result.save.flags, forjed_once: true },
    };
    writeSave(this.save);
    this.emitHud();
    this.refreshPlayerAppearance();
    this.game.events.emit('toast', result.message);
    this.game.events.emit('forjing-refresh', this.save);
    this.game.events.emit('inventory-refresh', this.save);
    this.flushAchievements();
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
    // U = potion → light → scroll → beam
    const tryIds = [
      'potion',
      'torch',
      'lantern',
      'flashlight',
      'scroll_light',
      'scroll_ward',
      'scroll_spark',
      'tome_embers',
    ];
    let result = useInventoryItem(this.save, 'potion');
    if (!result.ok) {
      for (const id of tryIds.slice(1)) {
        if ((this.save.stacks[id] ?? 0) > 0) {
          result = useInventoryItem(this.save, id);
          if (result.ok) break;
        }
      }
    }
    if (!result.ok && (this.save.stacks.beam_me_up ?? 0) > 0) {
      this.activateBeamMeUp();
      return;
    }
    if (!result.ok) {
      playSfx('error');
      this.game.events.emit('toast', result.reason);
      return;
    }
    this.save = result.save;
    writeSave(this.save);
    this.emitHud();
    this.refreshDarkOverlay();
    playSfx('heal');
    this.game.events.emit('inventory-refresh', this.save);
    this.game.events.emit('toast', result.message);
  };

  private activateBeamMeUp(): void {
    const result = useInventoryItem(this.save, 'beam_me_up');
    if (!result.ok) {
      playSfx('error');
      this.game.events.emit('toast', result.reason);
      return;
    }
    this.save = result.save;
    writeSave(this.save);
    this.emitHud();
    playSfx('stairs');
    this.game.events.emit('inventory-refresh', this.save);
    this.game.events.emit('toast', result.message);
    const dest = beamMeUpTarget(this.room.land);
    this.transitionLock = true;
    this.game.events.emit('ui-reset');
    this.dialogLocked = false;
    this.loadRoom(dest, false);
    this.time.delayedCall(200, () => {
      this.transitionLock = false;
    });
  }

  private onWeaponEquipKey = (): void => {
    this.cycleEquip('weapon');
  };

  private onJournalKey = (): void => {
    if (this.paused) return;
    // HTML journal modal (quests + brags)
    document.getElementById('journal-open')?.click();
  };

  /** Unlock brags; toast any new ones (bard energy, not corporate). */
  private flushAchievements(): void {
    const { save, newly } = syncAchievements(this.save);
    this.save = save;
    if (!newly.length) return;
    writeSave(this.save);
    newly.forEach((a, i) => {
      this.time.delayedCall(i * 400, () => {
        playSfx('success');
        this.game.events.emit('toast', `NEW BRAG: ${a.title}`);
      });
    });
  }

  private onGearTargetToggle = (): void => {
    if (!this.inventoryOpen || this.paused) return;
    if (!isCompanionActive(this.save)) {
      this.gearTarget = 'hero';
      this.game.events.emit('toast', 'NO BUDDY TO GEAR UP');
      this.game.events.emit('gear-target', this.gearTarget);
      return;
    }
    this.gearTarget = this.gearTarget === 'hero' ? 'bud' : 'hero';
    playSfx('ui_click');
    const label =
      this.gearTarget === 'bud'
        ? 'BUDDY GEAR MODE — EQUIP GOES TO YOUR BUD'
        : 'HERO GEAR MODE — EQUIP GOES TO YOU';
    this.game.events.emit('toast', label);
    this.game.events.emit('gear-target', this.gearTarget);
    this.game.events.emit('inventory-refresh', this.save);
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
      if (payload.templateId === 'beam_me_up') {
        this.activateBeamMeUp();
        return;
      }
      const result = useInventoryItem(this.save, payload.templateId);
      if (!result.ok) {
        playSfx('error');
        this.game.events.emit('toast', result.reason);
        return;
      }
      this.save = result.save;
      writeSave(this.save);
      this.emitHud();
      this.refreshDarkOverlay();
      playSfx(
        payload.templateId === 'potion' || payload.templateId.includes('potion')
          ? 'heal'
          : 'pickup',
      );
      this.game.events.emit('inventory-refresh', this.save);
      this.game.events.emit('toast', result.message);
      return;
    }
    if (payload.uid && payload.slot) {
      const target =
        this.gearTarget === 'bud' && isCompanionActive(this.save)
          ? 'bud'
          : 'hero';
      const result = equipForTarget(this.save, payload.uid, target);
      if (!result.ok) {
        playSfx('error');
        this.game.events.emit('toast', result.reason);
        return;
      }
      this.save = result.save;
      writeSave(this.save);
      this.emitHud();
      this.refreshPlayerAppearance();
      this.refreshCompanionAppearance();
      playSfx('success');
      this.game.events.emit('inventory-refresh', this.save);
      this.game.events.emit('toast', result.message);
    }
  };

  private cycleEquip(slot: EquipSlot): void {
    if (!this.inventoryOpen || this.dialogLocked || this.paused) return;
    const target =
      this.gearTarget === 'bud' && isCompanionActive(this.save)
        ? 'bud'
        : 'hero';
    if (target === 'bud' && slot === 'key') {
      this.game.events.emit('toast', 'BUDDY CAN\'T HOLD KEYS');
      return;
    }
    const result = cycleEquipForTarget(this.save, slot, target);
    if (!result.ok) {
      this.game.events.emit('toast', result.reason);
      return;
    }
    this.save = result.save;
    writeSave(this.save);
    this.emitHud();
    this.refreshPlayerAppearance();
    this.refreshCompanionAppearance();
    this.game.events.emit('inventory-refresh', this.save);
    this.game.events.emit('toast', result.message);
  }

  private onSpendAttrEvent = (attr: AttrId): void => {
    this.spendAttr(attr);
  };

  private onAutoStatsFlushEvent = (): void => {
    if (!this.inventoryOpen || this.dialogLocked || this.paused) return;
    if (!hasUnspentStatPackages(this.save)) {
      this.game.events.emit('toast', 'NO PACKAGES TO SPEND');
      return;
    }
    // One-shot auto (does not require Settings → auto on)
    const { save, notes } = flushAutoStatPackages(this.save);
    this.save = syncDerivedStats(save);
    writeSave(this.save);
    this.emitHud();
    this.game.events.emit('inventory-refresh', this.save);
    playSfx('success');
    const brief =
      notes.length > 2
        ? `${notes.length} PACKAGES APPLIED`
        : notes.slice(0, 2).join(' · ') || 'DONE';
    this.game.events.emit('toast', `AUTO STATS: ${brief}`);
  };

  private spendAttr(attr: AttrId): void {
    if (!this.inventoryOpen || this.dialogLocked || this.paused) return;
    if (!ATTR_IDS.includes(attr)) return;
    const result = spendAttrPoint(this.save, attr);
    if (!result.ok) {
      playSfx('error');
      this.game.events.emit('toast', result.reason);
      return;
    }
    this.save = syncDerivedStats(result.save);
    writeSave(this.save);
    this.emitHud();
    this.game.events.emit('inventory-refresh', this.save);
    playSfx(result.step === 'major' ? 'level_up' : 'success');
    this.game.events.emit('toast', result.message);
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
    // Stretch authored 16×11 into full 16:9 **playable** grid (not brick padding)
    const expanded = expandRoomTiles(room.tiles, VIEW_TILES_W, VIEW_TILES_H);
    this.roomExpand = expanded;
    const grid: TileKind[][] = [];
    for (let y = 0; y < VIEW_TILES_H; y++) {
      const row = expanded.tiles[y] ?? '#'.repeat(VIEW_TILES_W);
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
    for (const p of this.projectiles) p.img.destroy();
    this.projectiles = [];
    this.respawnGen.clear();
    this.walls.clear(true, true);
    for (const a of this.actors) {
      // Mark dead first so in-flight delayed bud/player hits no-op
      a.alive = false;
      // Kill ambient pulses before destroy so room transitions leave no ghosts
      if (a.sprite) {
        this.tweens.killTweensOf(a.sprite);
        a.sprite.destroy();
      }
    }
    this.actors = [];
    this.ambientTiles = [];
    if (this.companionSprite) {
      this.tweens.killTweensOf(this.companionSprite);
      this.companionSprite.destroy();
      this.companionSprite = null;
    }
    // Destroy map tiles (images tagged)
    this.children.list
      .filter((c) => (c as Phaser.GameObjects.Image).getData?.('mapTile'))
      .forEach((c) => c.destroy());
    // Keep dark overlay GO; alpha refreshed per room
  }

  /** Readable darkness overlay — denser without carried light. */
  private refreshDarkOverlay(): void {
    if (!this.darkOverlay) {
      this.darkOverlay = this.add
        .rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x02040a, 0)
        .setScrollFactor(0)
        .setDepth(90)
        .setVisible(true);
    }
    const dark = this.room ? roomIsDark(this.room) : false;
    const alpha = visionDarkAlpha(this.save, {
      darkRoom: dark,
      wallTorchCount: this.wallTorchCount,
    });
    this.darkOverlay.setFillStyle(0x02040a, alpha);
    this.darkOverlay.setVisible(alpha > 0.02);
  }

  private musicForRoom(room: RoomDef): MusicId {
    if (room.land === 'dunjunz' || room.land === 'sewerz') return 'dungeon';
    return 'overworld';
  }

  /** Gates for kingdom / sewerz access. */
  private canTravelTo(roomId: string): boolean {
    const resolved = resolveRoomId(roomId);
    if (resolved.startsWith('kingdom') || resolved === 'kingdom_gate') {
      if (!this.save.princessSaved) {
        this.game.events.emit(
          'toast',
          'CASTLE LOCKED — SAVE PRIZELLA FIRST',
        );
        return false;
      }
    }
    if (resolved.startsWith('sewerz')) {
      const ok =
        this.save.activeQuestId === QUEST_SEWERZ_GOOSE ||
        (this.save.questsCompleted ?? []).includes(QUEST_SEWERZ_GOOSE) ||
        this.save.killed.includes('royal-goose');
      if (!ok) {
        this.game.events.emit(
          'toast',
          'SEWERZ SEALED — GET THE JOB FROM PRIZELLA',
        );
        return false;
      }
    }
    return true;
  }

  private travelTo(roomId: string, entryFrom?: string): void {
    if (!this.canTravelTo(roomId)) {
      this.transitionLock = false;
      return;
    }
    this.loadRoom(roomId, false, entryFrom);
  }

  private loadRoom(roomId: string, fromSave: boolean, entryFrom?: string): void {
    const resolved = resolveRoomId(roomId);
    const room = ROOMS[resolved];
    if (!room) return;

    this.transitionLock = false;
    // Invalidate delayed combat callbacks from the previous room
    this.roomEpoch += 1;
    this.budAnimLock = 0;
    // Prevent walk-on portals from firing the frame you enter a room
    this.portalCooldown = 700;
    this.clearRoomObjects();
    this.room = room;
    this.save.roomId = resolved;
    playMusic(this.musicForRoom(room));
    this.save = markRoomVisited(this.save, resolved);
    // First visit threat toast for meaner lands / deeper floors
    const threat = threatForRoom(room, this.save);
    const depth = basementDepth(room.floor);
    const depthFlag = `depth_toast_${room.land ?? 'x'}_${depth}`;
    if (
      depth >= 2 &&
      !this.save.flags[depthFlag]
    ) {
      this.save = {
        ...this.save,
        flags: {
          ...this.save.flags,
          [depthFlag]: true,
        },
      };
      const flabel = room.floor != null && room.floor < 0
        ? `B${Math.abs(room.floor)}`
        : 'FLOOR';
      this.time.delayedCall(200, () => {
        this.game.events.emit(
          'toast',
          `${flabel} · ${depthFlavor(depth)} · THREAT T${threat}`,
        );
      });
    } else if (
      threat >= 3 &&
      !this.save.flags[`threat_toast_${room.land ?? 'x'}`]
    ) {
      this.save = {
        ...this.save,
        flags: {
          ...this.save.flags,
          [`threat_toast_${room.land ?? 'x'}`]: true,
        },
      };
      this.time.delayedCall(200, () => {
        this.game.events.emit(
          'toast',
          `THREAT UP — CREEPS MEANER HERE (T${threat})`,
        );
      });
    }
    this.tileGrid = this.applyPersistentDoorUnlocks(this.parseTiles(room));
    this.ambientTiles = [];
    this.ambientFrame = 0;

    // Depth personality: darker tiles + void as you go down basements
    const land = room.land ?? 'surface';
    this.cameras.main.setBackgroundColor(
      depthBackdropColor(depth, land === 'surface' ? 'dunjunz' : land),
    );

    for (let y = 0; y < VIEW_TILES_H; y++) {
      for (let x = 0; x < VIEW_TILES_W; x++) {
        const kind = this.tileGrid[y][x];
        const pos = this.tileToWorld(x, y);
        const img = this.add
          .image(pos.x, pos.y, TEX[kind])
          .setScale(SPRITE_SCALE)
          .setDepth(0);
        img.setData('mapTile', true);
        const tint = depthTileTint(depth, kind, land === 'surface' ? 'dunjunz' : land);
        if (tint !== 0xffffff) img.setTint(tint);
        if (kind === 'water' || kind === 'lava') {
          this.ambientTiles.push({ img, kind });
        }

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
    const kills = killListForSpawn(this.save, room.land);
    for (const def of room.entities ?? []) {
      if (def.id && kills.includes(def.id)) continue;
      if (def.id && shouldSkipMinibossSpawn(this.save, def.id)) continue;
      if (def.id && this.save.collected.includes(def.id)) continue;
      // Hard mode: skip friendly captain until redshirts cleared (promote later)
      if (
        def.id === CAPTAIN_ID &&
        isHardRunActive(this.save, room.land) &&
        room.id === CAPTAIN_HARD_ROOM
      ) {
        continue;
      }
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
    if (
      (resolved === 'b8_boss' || resolved === 'b2_boss') &&
      this.save.bossDefeated
    ) {
      const chestDef = room.entities?.find((e) => e.id === 'boss-chest');
      if (chestDef && !this.save.collected.includes(chestDef.id ?? '')) {
        const exists = this.actors.some((a) => a.id === 'boss-chest');
        if (!exists) this.spawnEntity(chestDef);
      }
    }

    // Quick exit portal after land boss is cleared
    this.ensureBossExitPortal();
    this.ensureHardModeGates();
    this.maybePromoteCaptain();
    this.startRoomAmbience();
    this.wallTorchCount = (room.entities ?? []).filter(
      (e) => e.kind === 'torch_wall',
    ).length;
    this.refreshDarkOverlay();
    if (isHardRunActive(this.save, room.land)) {
      this.time.delayedCall(120, () => {
        this.game.events.emit('toast', 'HARD MODE — CREEPS SHOOT · STAY ALERT');
      });
    }
    if (roomIsDark(room) && !(this.save.lightFuelMs ?? 0)) {
      this.time.delayedCall(280, () => {
        this.game.events.emit(
          'toast',
          'DARK — USE A TORCH (U / BAG) OR FORJE LIGHT',
        );
      });
    }

    this.emitHud();
    writeSave(this.save);
    this.syncCompanion();
    this.flushAchievements();

    if (
      (resolved === 'b8_boss' || resolved === 'b2_boss') &&
      !this.save.bossDefeated &&
      !this.bossIntroShown
    ) {
      this.bossIntroShown = true;
      const boss = this.actors.find((a) => a.kind === 'boss');
      if (boss?.dialog) {
        this.time.delayedCall(300, () => {
          this.game.events.emit('dialog-show', boss.dialog);
        });
      }
    }
  }

  /** Prizella: rescue / Best Bud / kingdom quest board. */
  private talkToPrizella(best: Actor): void {
    this.save = ensureRunSeed(this.save);

    // Pre-rescue tower talk
    if (!this.save.princessSaved && !this.save.killed.includes('sand-wraith')) {
      this.game.events.emit(
        'dialog-show',
        best.dialog ?? [
          'PRIZELLA: BONK THE WRAITH FIRST!',
          'THEN WE TALK KINGDOM STUFF.',
        ],
      );
      return;
    }

    // Just rescued (tower path if boss reward didn't set flags)
    if (!this.save.princessSaved && this.save.killed.includes('sand-wraith')) {
      this.save = {
        ...this.save,
        princessSaved: true,
        flags: { ...this.save.flags, princess_saved: true },
      };
      this.save = markLandCleared(this.save, 'dezertz');
      this.save = unlockKingdomOnRescue(this.save);
      writeSave(this.save);
      this.game.events.emit('dialog-show', [
        'PRIZELLA: YOU DID IT! MATHEMATICAL!',
        'I AM FREE. MOSTLY. THERE\'S STILL SAND.',
        '',
        ...princessChampionDialog(),
        '',
        'I\'M HEADING HOME — CASTLE EAST OF THE TRAIL.',
        'CYAN PORTAL / NORTH DOOR OUT. BEST BUD NEXT.',
      ]);
      this.ensureBossExitPortal(true);
      return;
    }

    // Post-rescue: Best Bud job #1 until complete
    if (this.save.bestBudStage !== 'complete') {
      if (!this.save.landsCleared.includes('dezertz')) {
        this.save = markLandCleared(this.save, 'dezertz');
      }
      this.save = unlockKingdomOnRescue(this.save);
      const talk = prizellaChampionTalk(this.save);
      this.save = talk.save;
      writeSave(this.save);
      this.game.events.emit('dialog-show', talk.dialog);
      this.syncCompanion();
      this.ensureBossExitPortal(true);
      return;
    }

    // Job #2+: throne quest board
    this.save = unlockKingdomOnRescue(this.save);
    const kingdom = prizellaKingdomTalk(this.save);
    this.save = kingdom.save;
    writeSave(this.save);
    this.game.events.emit('dialog-show', kingdom.dialog);
    this.syncCompanion();
  }

  /** Best Bud den meet or companion banter. */
  private talkToBestBud(actor: Actor): void {
    // Following companion (not the den entity)
    if (
      isCompanionActive(this.save) &&
      actor.id !== 'best-bud-den'
    ) {
      this.game.events.emit('dialog-show', bestBudBanter(this.save));
      return;
    }

    const before = this.save.bestBudStage;
    const r = meetBestBud(this.save);
    this.save = r.save;
    writeSave(this.save);
    this.game.events.emit('dialog-show', r.dialog);

    // Recruited from den → remove den sprite, start follow
    if (
      r.save.bestBudStage === 'found' &&
      before !== 'found' &&
      before !== 'complete'
    ) {
      actor.alive = false;
      if (actor.sprite?.active) actor.sprite.destroy();
      this.syncCompanion();
      const bud = getBestBud(this.save.bestBudId);
      this.game.events.emit(
        'toast',
        bud ? `BEST BUD: ${bud.name}!` : 'BEST BUD!',
      );
    }
  }

  /** Spawn/destroy following companion based on quest stage. */
  private syncCompanion(): void {
    if (!isCompanionActive(this.save) || !this.player) {
      if (this.companionSprite?.active) this.companionSprite.destroy();
      this.companionSprite = null;
      this.budAttackCd = 0;
      this.budHealCd = 0;
      this.budBlockCd = 0;
      this.budAnimLock = 0;
      this.budIdleMs = 0;
      return;
    }
    const bud = getBestBud(this.save.bestBudId);
    if (!this.companionSprite?.active) {
      const px = this.player.x - 22;
      const py = this.player.y + 4;
      this.companionSprite = this.physics.add.sprite(px, py, 'best_bud');
      this.companionSprite.setScale(SPRITE_SCALE).setDepth(4);
      this.companionSprite.setImmovable(true);
      const body = this.companionSprite.body as Phaser.Physics.Arcade.Body;
      // Follow/fight via manual position — body off so they don't shove the hero
      body.enable = false;
      this.budAnimLock = 0;
      this.budIdleMs = 0;
    }
    this.refreshCompanionAppearance();
    if (bud) this.companionSprite.setTint(bud.tint);
    else this.companionSprite.clearTint();
  }

  /**
   * Swap companion texture so bud-equipped gear shows (weapon, armor, etc.).
   * Pose anims keep gear via setBuddyGearSpec on the sprite.
   */
  private refreshCompanionAppearance(): void {
    if (!this.companionSprite?.active || !isCompanionActive(this.save)) return;
    const spec = budAppearanceFromSave(this.save);
    setBuddyGearSpec(this.companionSprite, spec);
    // Don't stomp mid-attack pose — only refresh when not locked in an anim
    if (this.budAnimLock <= 0) {
      const key = ensureBuddyTexture(this, spec, 'idle');
      this.companionSprite.setTexture(key);
    }
  }

  private updateCompanionFollow(): void {
    if (!this.companionSprite?.active || !this.player || !isCompanionActive(this.save)) {
      return;
    }
    if (this.budAnimLock > 0) return;
    const dx = this.player.x - 18 - this.companionSprite.x;
    const dy = this.player.y + 2 - this.companionSprite.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 24) {
      this.companionSprite.x += dx * 0.12;
      this.companionSprite.y += dy * 0.12;
      faceBuddyToward(this.companionSprite, this.player.x, this.player.y);
      setBuddyPose(this, this.companionSprite, 'chase');
    } else {
      setBuddyPose(this, this.companionSprite, 'idle');
    }
  }

  /** Stretch-grab toward a world point (loot, chest, kill sparkles). */
  private buddyGrabAt(x: number, y: number, tint = 0xffc857): void {
    if (!this.companionSprite?.active || !isCompanionActive(this.save)) return;
    if (this.budAnimLock > 0) return;
    this.budAnimLock = 380;
    this.budIdleMs = 0;
    playBuddyGrabAnim(this, this.companionSprite, x, y, tint);
  }

  /** Magical bud combat — chase, stretch-strike, grab energy, heal, block. */
  private updateCompanionCombat(delta: number): void {
    this.budAttackCd = Math.max(0, this.budAttackCd - delta);
    this.budHealCd = Math.max(0, this.budHealCd - delta);
    this.budBlockCd = Math.max(0, this.budBlockCd - delta);
    this.budAnimLock = Math.max(0, this.budAnimLock - delta);

    if (
      !this.companionSprite?.active ||
      !this.player ||
      !isCompanionActive(this.save) ||
      this.dialogLocked ||
      this.paused
    ) {
      if (!this.dialogLocked && !this.paused) this.updateCompanionFollow();
      return;
    }

    const budId = this.save.bestBudId;
    const profile = budCombatProfile(budId);
    if (!profile) {
      this.updateCompanionFollow();
      return;
    }

    this.save = ensureBudProgress(this.save);

    // Whisp cozy aura — heal even without creeps nearby
    if (
      profile.style === 'aura' &&
      this.budHealCd <= 0 &&
      this.save.hp < this.save.maxHp
    ) {
      const heal = computeBudHealAmount(this.save);
      this.save.hp = Math.min(this.save.maxHp, this.save.hp + heal);
      this.budHealCd = BUD_HEAL_COOLDOWN_MS;
      writeSave(this.save);
      this.emitHud();
      playSfx('heal');
      this.game.events.emit('toast', `WHISP HEALS +${heal}`);
      this.budAnimLock = 420;
      this.budIdleMs = 0;
      playBuddyHealAnim(
        this,
        this.companionSprite,
        this.player.x,
        this.player.y,
      );
    }

    const target = this.findNearestHostile(
      this.companionSprite.x,
      this.companionSprite.y,
      profile.aggro,
    );

    if (!target) {
      this.budIdleMs += delta;
      // Occasional stretch yawn while parking with the hero
      if (
        this.budAnimLock <= 0 &&
        maybeBuddyIdleStretch(this, this.companionSprite, this.budIdleMs)
      ) {
        this.budIdleMs = 0;
        this.budAnimLock = 480;
      } else {
        this.updateCompanionFollow();
      }
      return;
    }

    this.budIdleMs = 0;

    // Stay leashed to player — don't abandon the hero mid-room
    const toPlayer = Math.hypot(
      this.player.x - this.companionSprite.x,
      this.player.y - this.companionSprite.y,
    );
    if (toPlayer > profile.leash) {
      this.updateCompanionFollow();
      return;
    }

    // Don't move/attack while a stretch/grab owns the sprite
    if (this.budAnimLock > 0) return;

    const tx = target.sprite.x;
    const ty = target.sprite.y;
    const dx = tx - this.companionSprite.x;
    const dy = ty - this.companionSprite.y;
    const dist = Math.hypot(dx, dy);

    faceBuddyToward(this.companionSprite, tx, ty);

    // Approach (Zorp blinks when far)
    if (dist > profile.range * 0.85) {
      setBuddyPose(this, this.companionSprite, 'chase');
      if (profile.style === 'blink' && dist > profile.range * 1.4 && this.budAttackCd <= 0) {
        const fromX = this.companionSprite.x;
        const fromY = this.companionSprite.y;
        const hop = Math.min(dist - profile.range * 0.5, 70);
        this.companionSprite.x += (dx / dist) * hop;
        this.companionSprite.y += (dy / dist) * hop;
        this.companionSprite.setAlpha(0.5);
        setBuddyPose(this, this.companionSprite, 'blink');
        playBuddyBlinkTrail(
          this,
          fromX,
          fromY,
          getBestBud(this.save.bestBudId)?.tint ?? 0x7d5cff,
        );
        this.time.delayedCall(90, () => {
          this.companionSprite?.setAlpha(1);
          if (this.companionSprite?.active) {
            setBuddyPose(this, this.companionSprite, 'idle');
          }
        });
      } else {
        this.companionSprite.x += dx * profile.speed;
        this.companionSprite.y += dy * profile.speed;
      }
    }

    // Strike — stretch / claw / spit / slam toward the creep
    if (dist <= profile.range && this.budAttackCd <= 0 && target.alive) {
      if (this.isUnprovokedPeaceful(target)) {
        this.updateCompanionFollow();
        return;
      }
      const dmg = computeBudStrikeDamage(this.save);
      const fromX = this.companionSprite.x;
      const fromY = this.companionSprite.y;
      this.budAttackCd = profile.cooldownMs;
      this.budAnimLock = profile.style === 'stretch' ? 420 : 320;
      this.budIdleMs = 0;

      const strikeEpoch = this.roomEpoch;
      playBuddyAttackAnim(this, this.companionSprite, {
        fromX,
        fromY,
        toX: tx,
        toY: ty,
        style: profile.style,
        tint: getBestBud(this.save.bestBudId)?.tint,
        onComplete: () => {
          if (this.roomEpoch !== strikeEpoch) return;
          this.budAnimLock = Math.min(this.budAnimLock, 40);
        },
      });
      // Damage lands mid-lash (readable with the stretch ghost).
      // Capture roomEpoch so leaving mid-animation never hits a destroyed body.
      this.time.delayedCall(profile.style === 'slash' ? 70 : 100, () => {
        if (this.roomEpoch !== strikeEpoch) return;
        if (target.alive && actorHasLiveBody(target)) {
          this.budStrike(target, dmg, profile.abilityName);
        }
      });
    }
  }

  private findNearestHostile(
    x: number,
    y: number,
    maxDist: number,
  ): Actor | null {
    let best: Actor | null = null;
    let bestD = maxDist;
    for (const a of this.actors) {
      if (!a.alive || !a.sprite?.active) continue;
      if (!isHostileKind(a.kind)) continue;
      if (this.isUnprovokedPeaceful(a)) continue;
      const d = Math.hypot(a.sprite.x - x, a.sprite.y - y);
      if (d < bestD) {
        bestD = d;
        best = a;
      }
    }
    return best;
  }

  /** Cube / Rules Lawyer idle until hit or chest loot. */
  private isUnprovokedPeaceful(actor: Actor): boolean {
    if (actor.kind === 'cube' && !actor.aggressive) return true;
    if (isPeacefulMinibossUntilProvoked(actor.id) && !actor.aggressive) {
      return true;
    }
    return false;
  }

  private provokePeaceful(
    actor: Actor,
    toast: string,
  ): void {
    if (!this.isUnprovokedPeaceful(actor)) return;
    actor.aggressive = true;
    this.game.events.emit('toast', toast);
  }

  /** Companion hit — independent of player swing flag. */
  private budStrike(actor: Actor, dmg: number, abilityName: string): void {
    if (!actor.alive || actor.hurtCooldown > 0) return;
    if (actor.kind === 'best_bud') return;
    // Room left mid-lash: sprite/body already destroyed
    if (!actorHasLiveBody(actor)) return;
    if (!this.companionSprite?.active) return;

    if (actor.kind === 'cube' && !actor.aggressive) {
      this.provokePeaceful(actor, 'THE CUBE IS MAD AT YOUR BUD');
    } else if (isPeacefulMinibossUntilProvoked(actor.id) && !actor.aggressive) {
      this.provokePeaceful(actor, 'THE RULES LAWYER OPENS THE BINDER');
    }

    actor.hurtCooldown = 240;
    actor.hp -= dmg;
    playSfx('hit_enemy');
    actor.sprite.setTint(0xa0ffe8);
    sparkBurst(this, actor.sprite.x, actor.sprite.y, 0x7dffb3, 3);
    const tintEpoch = this.roomEpoch;
    this.time.delayedCall(90, () => {
      if (this.roomEpoch !== tintEpoch) return;
      if (actor.alive && actor.sprite?.active) actor.sprite.clearTint();
    });

    const body = actor.sprite.body as Phaser.Physics.Arcade.Body | null;
    if (body) {
      const angle = Phaser.Math.Angle.Between(
        this.companionSprite.x,
        this.companionSprite.y,
        actor.sprite.x,
        actor.sprite.y,
      );
      const knock =
        actor.kind === 'cube' ||
        actor.kind === 'boss' ||
        actor.kind === 'miniboss'
          ? 50
          : 100;
      body.setVelocity(Math.cos(angle) * knock, Math.sin(angle) * knock);
    }

    const bud = getBestBud(this.save.bestBudId);
    const name = bud?.name ?? 'BUD';
    if (actor.hp > 0) {
      this.game.events.emit(
        'toast',
        `${name} ${abilityName}! ${actor.hp}/${actor.maxHp}`,
      );
    } else {
      this.game.events.emit('toast', `${name} FINISHED THEM!`);
      this.killActor(actor);
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

    // Default / continue: entrance-aware walkable (never sealed pens / water)
    if (fromSave || !entryFrom) {
      return spawnForContinue(this.tileGrid, this.room);
    }
    return spawnForContinue(this.tileGrid, this.room);
  }

  private spawnEntity(
    def: EntityDef,
    opts?: { generation?: number },
  ): void {
    // Den bud only while not yet recruited
    if (def.kind === 'best_bud' && !shouldSpawnDenBud(this.save)) {
      return;
    }

    // One Prizella: tower pre-rescue, throne post-rescue
    if (def.kind === 'princess') {
      const onTower = this.room.id === 'dezertz_tower';
      const onThrone = this.room.id === 'kingdom_throne';
      if (onTower && this.save.princessSaved) return;
      if (onThrone && !this.save.princessSaved) return;
    }

    // Captain gets gold command tunic (Kirk), not generic purple NPC
    const tex =
      def.id === 'captain' && this.textures.exists('captain')
        ? 'captain'
        : def.id === 'royal-goose' && this.textures.exists('boss')
          ? 'boss'
          : (ENTITY_TEX[def.kind] ?? 'npc');
    const placed = this.roomExpand
      ? mapEntityTile(def.x, def.y, this.roomExpand)
      : { x: def.x, y: def.y };
    const pos = this.tileToWorld(placed.x, placed.y);
    const sprite = this.physics.add.sprite(pos.x, pos.y, tex);
    sprite.setScale(SPRITE_SCALE);
    sprite.setDepth(5);

    if (def.kind === 'best_bud') {
      const bud = getBestBud(this.save.bestBudId);
      if (bud) sprite.setTint(bud.tint);
    }
    if (def.id === 'royal-goose') {
      sprite.setTint(0xffe08a);
    }
    if (def.id === RULES_LAWYER_ID) {
      sprite.setTint(0xc8c0e8); // binder grey-purple skeleton clerk
    } else if (def.id === ASSISTANT_HONK_ID) {
      sprite.setTint(0xffe08a); // junior goose yellow
    } else if (def.id === DEPUTY_HOWL_ID) {
      sprite.setTint(0x9a9ab0); // pack-grey wolf intern
    } else if (def.id === LEASE_WIGHT_ID) {
      sprite.setTint(0xd4c0a0); // sandy property manager
    } else if (def.id === 'floor-captain' || def.kind === 'miniboss') {
      sprite.setTint(0xffb090); // manager warmth; skip depth wash
    }

    const contactHostile = (CONTACT_HOSTILES as readonly string[]).includes(
      def.kind,
    );
    // Deeper basements: creeps get a sicklier wash so packs read meaner
    if (contactHostile && def.kind !== 'best_bud') {
      const et = depthEnemyTint(basementDepth(this.room.floor));
      if (
        et != null &&
        def.id !== 'royal-goose' &&
        def.kind !== 'miniboss' &&
        def.id !== 'floor-captain' &&
        def.id !== RULES_LAWYER_ID &&
        def.id !== ASSISTANT_HONK_ID &&
        def.id !== DEPUTY_HOWL_ID &&
        def.id !== LEASE_WIGHT_ID
      ) {
        sprite.setTint(et);
      }
    }
    const mobileHostile = (MOBILE_HOSTILES as readonly string[]).includes(
      def.kind,
    );
    const isTree = def.kind === 'tree';
    const isTumbleweed = def.kind === 'tumbleweed';
    const isCactusPlant = def.kind === 'cactus';
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
      'portal',
    ].includes(def.kind);

    // Mobile hostiles: chase + walls. Cactus: rooted hazard. Tree: solid prop.
    // Tumbleweed: drifts, no combat.
    if (mobileHostile) {
      sprite.setImmovable(false);
      sprite.setCollideWorldBounds(true);
      const body = sprite.body as Phaser.Physics.Arcade.Body;
      const fw = sprite.frame.width;
      const fh = sprite.frame.height;
      const bw = Math.max(10, Math.floor(fw * 0.85));
      const bh = Math.max(10, Math.floor(fh * 0.85));
      body.setSize(bw, bh);
      body.setOffset((fw - bw) / 2, (fh - bh) / 2);
      body.setBounce(0, 0);
      body.setMaxVelocity(def.kind === 'hornet' ? 140 : 120, 140);
      body.enable = true;
      this.physics.add.collider(sprite, this.walls);
    } else if (def.kind === 'torch_wall') {
      sprite.setImmovable(true);
      sprite.setDepth(3);
      const body = sprite.body as Phaser.Physics.Arcade.Body;
      body.enable = false;
    } else if (isCactusPlant || isTree) {
      sprite.setImmovable(true);
      const body = sprite.body as Phaser.Physics.Arcade.Body;
      body.moves = false;
      body.enable = true;
      body.setSize(12, 14);
      body.setOffset(2, 1);
      // Trees block the hero; cactus is overlap-only (spines)
      if (isTree) {
        this.physics.add.collider(this.player, sprite);
      }
    } else if (isTumbleweed) {
      sprite.setImmovable(false);
      sprite.setCollideWorldBounds(true);
      const body = sprite.body as Phaser.Physics.Arcade.Body;
      body.setSize(12, 12);
      body.setOffset(2, 2);
      body.setBounce(1, 1);
      body.setMaxVelocity(60, 60);
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
          'portal',
        ].includes(def.kind)
      ) {
        sprite.setSize(14, 14);
        sprite.setOffset(1, 1);
      }
    }

    const threat = threatForRoom(this.room, this.save);
    const generation = Math.max(0, opts?.generation ?? 0);
    let hp =
      isTree || isTumbleweed
        ? 1
        : resolveEnemyHp(def.kind, def.hp, threat);
    let contactDamage = contactHostile
      ? resolveEnemyContactDamage(def.kind, threat)
      : 0;
    // Soft-respawned creeps scale with hero level + generation
    if (generation > 0 && contactHostile) {
      hp = scaleRespawnHp(hp, this.save.level, generation);
      contactDamage = scaleRespawnContact(
        contactDamage,
        this.save.level,
        generation,
      );
    }

    const actor: Actor = {
      sprite,
      kind: def.kind,
      id: def.id ?? `${def.kind}-${def.x}-${def.y}`,
      hp,
      maxHp: hp,
      dialog: def.dialog,
      hurtCooldown: 0,
      aiTimer: Phaser.Math.Between(0, 400),
      alive: true,
      interactive: interactive || !!def.dialog || !!def.shopId,
      chestTable: def.chestTable,
      shopId: def.shopId,
      mapzId: def.mapzId,
      portalTarget: def.portalTarget,
      contactDamage,
      // Cube / Rules Lawyer: peaceful until hit or chest; others chase
      aggressive:
        def.kind === 'cube' || isPeacefulMinibossUntilProvoked(def.id ?? '')
          ? false
          : true,
      respawnGen: generation,
    };

    if (contactHostile) {
      this.physics.add.overlap(this.player, sprite, () =>
        this.hurtPlayer(actor),
      );
      // Cactus can still be chopped for spines; trees/tumbleweeds are not targets
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
    } else if (def.kind === 'portal') {
      this.physics.add.overlap(this.player, sprite, () =>
        this.usePortal(actor),
      );
    }

    this.actors.push(actor);
    if (def.kind === 'portal' || def.kind === 'forje') {
      this.pulseAmbientProp(sprite, def.kind);
    }
  }

  /** After land clear, ensure a walk-on portal exists in the boss arena. */
  private ensureBossExitPortal(announce = false): void {
    if (
      !shouldSpawnBossExitPortal(
        this.save,
        this.room.id,
        this.room.land,
      )
    ) {
      return;
    }
    const already = this.actors.some(
      (a) => a.alive && a.kind === 'portal' && a.id.startsWith('exit-portal-'),
    );
    if (already) {
      if (announce) {
        this.game.events.emit('toast', 'EXIT PORTAL READY — STEP ON IT');
      }
      return;
    }
    const def = bossExitPortalDef(this.room.id, this.room.land);
    if (!def) return;
    this.spawnEntity(def);
    playSfx('success');
    this.game.events.emit(
      'toast',
      announce
        ? 'EXIT PORTAL OPEN — STEP ON CYAN RING'
        : 'EXIT PORTAL OPEN',
    );
  }

  private usePortal(actor: Actor): void {
    // Allow while dialog open so you can leave mid-victory speech if you want;
    // still block mid-room-transition / pause / just-entered grace.
    if (this.transitionLock || this.paused) return;
    if (this.portalCooldown > 0) return;
    if (!actor.alive || actor.kind !== 'portal') return;
    const target = actor.portalTarget;

    const hard = parseHardPortalTarget(target);
    if (hard) {
      this.transitionLock = true;
      playSfx('stairs');
      this.game.events.emit('ui-reset');
      this.dialogLocked = false;
      if (hard.kind === 'start') {
        this.save = startHardRun(this.save, hard.land);
        writeSave(this.save);
        this.game.events.emit('toast', `HARD MODE: ${hard.land.toUpperCase()}`);
        this.loadRoom(this.room.id, false);
      } else {
        this.save = endHardRun(this.save);
        writeSave(this.save);
        this.game.events.emit('toast', 'HARD MODE OFF — NORMAL CREEPS');
        this.loadRoom(this.room.id, false);
      }
      this.time.delayedCall(200, () => {
        this.transitionLock = false;
      });
      return;
    }

    const resolved = resolveRoomId(target ?? '');
    if (!target || !ROOMS[resolved]) {
      this.game.events.emit('toast', 'PORTAL FLICKERS… NO SIGNAL');
      return;
    }
    this.transitionLock = true;
    playSfx('stairs');
    this.game.events.emit('toast', 'PORTAL WHOOSH — DUNJUN MOUTH!');
    // Force UI dialog closed so the panel cannot stick across rooms
    this.game.events.emit('ui-reset');
    this.dialogLocked = false;
    this.loadRoom(resolved, false);
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
   * `walk` selects idle vs alternating foot plant frames.
   */
  private refreshPlayerAppearance(walk: PlayerWalkFrame = this.walkFrame): void {
    if (!this.player) return;
    let spec = appearanceFromSave(this.save);
    // Hide hip weapon while the swing FX is out
    if (this.attacking) spec = withHiddenWeapon(spec);
    // reduce-motion: no foot cycle
    const frame: PlayerWalkFrame = motionAllowed() ? walk : 0;
    const key = ensurePlayerTexture(this, spec, frame);
    if (this.player.texture.key !== key) this.player.setTexture(key);
  }

  private hurtPlayer(from: Actor): void {
    if (!from.alive || this.invuln > 0 || this.dialogLocked || this.paused) return;
    // Peaceful cube / Rules Lawyer (not yet hit) — walk up and press E
    if (this.isUnprovokedPeaceful(from)) return;

    // Pebbo (guard bud) can eat a hit — magical coil shield
    if (
      isCompanionActive(this.save) &&
      budCanBlockHit(this.save.bestBudId, this.budBlockCd)
    ) {
      this.budBlockCd = BUD_BLOCK_COOLDOWN_MS;
      this.invuln = 600;
      playSfx('success');
      this.game.events.emit('toast', 'PEBBO COILED THE HIT!');
      if (this.companionSprite?.active) {
        this.budAnimLock = 400;
        this.budIdleMs = 0;
        playBuddyGuardAnim(this, this.companionSprite);
        this.companionSprite.setTint(0xffc857);
        this.time.delayedCall(280, () => {
          const bud = getBestBud(this.save.bestBudId);
          if (bud && this.companionSprite?.active) {
            this.companionSprite.setTint(bud.tint);
          }
        });
      }
      // Knock the creep away from the hero a bit
      const body = from.sprite.body as Phaser.Physics.Arcade.Body | null;
      if (body) {
        const angle = Phaser.Math.Angle.Between(
          this.player.x,
          this.player.y,
          from.sprite.x,
          from.sprite.y,
        );
        body.setVelocity(Math.cos(angle) * 160, Math.sin(angle) * 160);
      }
      return;
    }

    // Kind contact damage (threat-scaled at spawn); armor reduces (min 1)
    const baseDmg =
      from.contactDamage ??
      resolveEnemyContactDamage(
        from.kind,
        threatForRoom(this.room, this.save),
      );
    const dmg = Math.max(1, baseDmg - this.save.armor);
    this.save.hp = Math.max(0, this.save.hp - dmg);
    this.invuln = 900;
    this.emitHud();
    writeSave(this.save);

    playSfx('hit_player');
    if (!loadSettings().reduceMotion) {
      this.cameras.main.shake(120, 0.01);
    }
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
    playSfx('death');
    this.game.events.emit('dialog-show', [
      'YOU HAVE DIED. BUMMER.',
      'THE BARD IS ALREADY WRITING A SONG.',
      'IT WILL NOT BE FLATTERING. AT ALL.',
      'RESPAWNING AT THE MEADOW... AGAIN...',
    ]);
    this.time.delayedCall(100, () => {
      this.save.hp = this.save.maxHp;
      this.save.roomId = 'overworld';
      this.save = {
        ...this.save,
        flags: { ...this.save.flags, died_once: true },
      };
      writeSave(this.save);
      this.flushAchievements();
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
    if (!actorHasLiveBody(actor)) return;

    // Best Bud is immortal friendship — not a target
    if (actor.kind === 'best_bud') {
      this.game.events.emit('toast', 'OW. RUDE. STILL BUDDIES.');
      return;
    }

    // Provoking peaceful dens makes them fight back
    if (actor.kind === 'cube' && !actor.aggressive) {
      this.provokePeaceful(actor, 'THE CUBE IS HURT... AND MAD');
    } else if (isPeacefulMinibossUntilProvoked(actor.id) && !actor.aggressive) {
      this.provokePeaceful(actor, 'OBJECTION! THE RULES LAWYER IS MAD');
    }

    actor.hurtCooldown = 280;
    const dmg = computePlayerDamage(this.save);
    actor.hp -= dmg;
    playSfx('hit_enemy');
    actor.sprite.setTint(0xffffff);
    sparkBurst(this, actor.sprite.x, actor.sprite.y, 0xffffff, 4);
    if (motionAllowed() && actor.sprite.active) {
      this.tweens.add({
        targets: actor.sprite,
        scaleX: SPRITE_SCALE * 1.15,
        scaleY: SPRITE_SCALE * 0.85,
        duration: 60,
        yoyo: true,
      });
    }
    this.time.delayedCall(80, () => {
      if (actor.alive) actor.sprite.clearTint();
    });

    // Knockback away from player (blocked by wall colliders)
    const body = actor.sprite.body as Phaser.Physics.Arcade.Body | null;
    if (body && this.player) {
      const angle = Phaser.Math.Angle.Between(
        this.player.x,
        this.player.y,
        actor.sprite.x,
        actor.sprite.y,
      );
      const knock =
        actor.kind === 'cube' ||
        actor.kind === 'boss' ||
        actor.kind === 'miniboss'
          ? 80
          : 140;
      body.setVelocity(Math.cos(angle) * knock, Math.sin(angle) * knock);
    }

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
    const isMid = shouldApplyMinibossReward(actor.kind, actor.id);
    // Soft-respawn creeps: XP now, return on a clock (not permanent kill list)
    // Mid wardens: permanent via applyMinibossKill (never land ceremony)
    if (canSoftRespawn(actor.kind, actor.id)) {
      this.scheduleCreepRespawn(actor);
    } else if (!isMid) {
      this.save = recordKill(this.save, actor.id, this.room.land);
    }

    // XP + level from pure progression module (threat-scaled)
    const xpGain = enemyXpReward(
      actor.kind,
      threatForRoom(this.room, this.save),
    );
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
      playSfx('level_up');
      if (loadSettings().autoStatAllocate) {
        this.applyAutoStatsIfEnabled(false);
        this.game.events.emit(
          'toast',
          `LEVEL UP! LV ${prog.level} — STATS AUTO-ASSIGNED`,
        );
      } else {
        const touch = isTouchUiPreferred();
        this.game.events.emit(
          'toast',
          touch
            ? `LEVEL UP! LV ${prog.level} — OPEN BAG · TAP A STAT (+2 then +1)`
            : `LEVEL UP! LV ${prog.level} — +${prog.attrPointsGained} PKG: +2/+1 (I) OR SETTINGS→AUTO`,
        );
      }
      this.time.delayedCall(400, () => this.checkHeroPick());
    } else {
      this.game.events.emit('toast', `+${xpGain} XP`);
    }

    // Buddy shares the kill XP and can level up
    if (isCompanionActive(this.save)) {
      const budGain = grantBudXp(this.save, xpGain);
      this.save = budGain.save;
      if (budGain.leveledUp) {
        const bud = getBestBud(this.save.bestBudId);
        playSfx('level_up');
        this.time.delayedCall(350, () => {
          this.game.events.emit(
            'toast',
            `${bud?.name ?? 'BUD'} LV UP! → ${this.save.budLevel}`,
          );
        });
      }
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
        this.save,
      );
      if (drops.length) {
        this.save = applyLootToSave(this.save, drops);
        const summary = lootSummary(drops).slice(0, 3).join(', ');
        playSfx('pickup');
        // Buddy snaps toward the kill and "grabs" the loot
        if (this.companionSprite?.active && actor.sprite?.active) {
          this.buddyGrabAt(actor.sprite.x, actor.sprite.y, 0xffc857);
        }
        this.time.delayedCall(200, () => {
          this.game.events.emit('toast', `LOOT: ${summary}`);
        });
      }
    }

    // Mid wardens: permanent kill already recorded; never land ceremony
    if (shouldApplyMinibossReward(actor.kind, actor.id)) {
      const mid = applyMinibossKill(this.save, actor.id, this.room.land);
      this.save = mid.save;
      this.game.events.emit('toast', mid.toast);
      this.game.events.emit('dialog-show', mid.dialog);
    } else if (
      actor.kind === 'boss' ||
      actor.id === 'dungeon-master' ||
      actor.id === CAPTAIN_ID ||
      actor.id === 'captain-hard'
    ) {
      this.applyBossReward(actor);
    }
    // After hard redshirt wipe, promote captain
    if (
      isHardRunActive(this.save, this.room.land) &&
      actor.kind === 'redshirt' &&
      this.room.id === CAPTAIN_HARD_ROOM
    ) {
      this.time.delayedCall(250, () => this.maybePromoteCaptain());
    }

    // Death particles — kind-tinted, richer when motion allowed
    const px = actor.sprite.x;
    const py = actor.sprite.y;
    const count = motionAllowed() ? 8 : 4;
    const kindTint =
      actor.kind === 'slime'
        ? 0x7dffb3
        : actor.kind === 'skeleton'
          ? 0xe8e0d0
          : actor.kind === 'wolf'
            ? 0x9a9ab0
            : actor.kind === 'cactus'
              ? 0x5ab878
              : actor.kind === 'scorpion'
                ? 0xc07040
                : actor.kind === 'tarantula'
                  ? 0x4a3030
                  : actor.kind === 'hornet'
                    ? 0xffc857
                    : actor.kind === 'miniboss'
                      ? 0xff8866
                      : actor.kind === 'boss'
                        ? 0xff6b9d
                        : 0xffc857;
    const colors = [kindTint, 0xffc857, 0xffffff, kindTint];
    for (let i = 0; i < count; i++) {
      const p = this.add.image(px, py, i % 2 === 0 ? 'particle' : 'particle-hit');
      p.setScale(SCALE * (0.6 + Math.random() * 0.5));
      p.setTint(colors[i % colors.length]!);
      p.setDepth(18);
      this.tweens.add({
        targets: p,
        x: px + Phaser.Math.Between(-48, 48),
        y: py + Phaser.Math.Between(-48, 48),
        alpha: 0,
        angle: Phaser.Math.Between(-90, 90),
        duration: 280 + Math.random() * 200,
        ease: 'Cubic.easeOut',
        onComplete: () => p.destroy(),
      });
    }

    actor.sprite.destroy();
    writeSave(this.save);
    this.emitHud();
    this.flushAchievements();
  }

  /** Talk path: Rules Lawyer — forgive (heal + bone) or litigating rant. */
  private talkToRulesLawyer(npc: Actor): void {
    if (!npc.alive) {
      this.game.events.emit('toast', 'ONLY A BINDER REMAINS');
      return;
    }
    if (npc.aggressive) {
      this.game.events.emit('dialog-show', [
        'RULES LAWYER: WE ARE IN LITIGATION.',
        'NO CLEMENCY AFTER AGGRESSION.',
        'SEE ALSO: YOU HIT ME.',
      ]);
      return;
    }
    const r = applyRulesLawyerForgive(this.save);
    this.save = r.save;
    writeSave(this.save);
    this.emitHud();
    this.game.events.emit('dialog-show', r.dialog);
    this.game.events.emit('toast', r.toast);
    // Forgive resolves the den — despawn without kill ceremony
    if (!r.alreadyResolved && npc.alive) {
      npc.alive = false;
      if (npc.sprite?.active) npc.sprite.destroy();
    }
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
    const drops = rollEnemyLoot(
      'cube',
      Math.random,
      this.save.attrs.lck,
      this.save,
    );
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
    if (actor.id === CAPTAIN_ID || actor.id === 'captain-hard') {
      if (!this.save.flags['hard_captain_loot']) {
        const r = rewardHardCaptain(this.save);
        this.save = r.save;
        this.game.events.emit('dialog-show', r.dialog);
      } else {
        this.game.events.emit('toast', 'CAPTAIN DOWN — AGAIN. STILL RAD.');
      }
      return;
    }
    if (
      actor.id === 'dungeon-master' ||
      this.room.id === 'b8_boss' ||
      this.room.id === 'b2_boss'
    ) {
      if (isHardRunActive(this.save, 'dunjunz')) {
        if (!this.save.flags['hard_king_loot']) {
          const r = rewardHardKing(this.save);
          this.save = r.save;
          this.game.events.emit('dialog-show', r.dialog);
        } else {
          this.game.events.emit('dialog-show', [
            'HARD KING DOWN AGAIN. THE DICE STILL HATE HIM.',
            'EXIT PORTAL READY.',
          ]);
        }
        this.ensureBossExitPortal(true);
        return;
      }
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
          'EXIT PORTAL STILL HUMS SOUTH OF HERE.',
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
      this.ensureBossExitPortal(true);
      return;
    }
    if (actor.id === 'wolf-lord') {
      if (!this.save.landsCleared.includes('woodz')) {
        const r = rewardWoodzClear(this.save);
        this.save = r.save;
        this.game.events.emit('dialog-show', r.dialog);
      } else {
        this.game.events.emit('toast', 'WOLF LORD DOWN — EXIT PORTAL OPEN');
      }
      this.ensureBossExitPortal(true);
      return;
    }
    if (actor.id === 'sand-wraith') {
      if (!this.save.landsCleared.includes('dezertz')) {
        const r = rewardDezertzClear(this.save);
        this.save = r.save;
        this.game.events.emit('dialog-show', r.dialog);
      } else {
        this.game.events.emit('toast', 'SAND WRAITH DOWN — EXIT PORTAL OPEN');
      }
      this.ensureBossExitPortal(true);
      return;
    }
    if (actor.id === 'royal-goose' || this.room.id === 'sewerz_boss') {
      this.game.events.emit('dialog-show', [
        'THE ROYAL GOOSE STOPS HONKING.',
        'TAX SCROLLS FALL OUT. GROSS. VALUABLE.',
        'EXIT PORTAL → SEWER MOUTH.',
        'REPORT TO PRIZELLA ON THE THRONE.',
      ]);
      this.ensureBossExitPortal(true);
      return;
    }
    // Generic boss fallback
    this.save.bossDefeated = true;
    this.game.events.emit('dialog-show', [
      'A BOSS FALLS!',
      'NICE WORK. THAT WAS RAD.',
    ]);
    this.ensureBossExitPortal(true);
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
        [
          'slime',
          'skeleton',
          'redshirt',
          'boss',
          'wolf',
          'cactus',
          'scorpion',
          'tarantula',
          'hornet',
        ].includes(
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

    if (best.kind === 'portal') {
      this.usePortal(best);
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

    if (best.id === RULES_LAWYER_ID || isPeacefulMinibossUntilProvoked(best.id)) {
      this.talkToRulesLawyer(best);
      return;
    }

    if (
      best.kind === 'princess' ||
      best.id === 'prizella' ||
      best.id === 'prizella-throne'
    ) {
      this.talkToPrizella(best);
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
    const drops = openChest(table, Math.random, this.save);
    this.save = applyLootToSave(this.save, drops);
    this.save.collected.push(actor.id);
    actor.alive = false;
    actor.sprite.destroy();

    const lines = [
      'CHEST OPENED!',
      ...lootSummary(drops).map((l) => `+ ${l}`),
      ...(actor.dialog ?? []),
    ];
    // Cube-style: looting the den chest provokes peaceful wardens
    for (const a of this.actors) {
      if (!a.alive || a === actor) continue;
      if (isPeacefulMinibossUntilProvoked(a.id) && !a.aggressive) {
        this.provokePeaceful(a, 'LOOTING VIOLATES SECTION 9 — HE\'S MAD');
      }
    }
    writeSave(this.save);
    this.emitHud();
    playSfx('pickup');
    // Buddy stretch-grabs the chest with you
    if (this.companionSprite?.active && actor.sprite) {
      this.buddyGrabAt(actor.sprite.x, actor.sprite.y, 0xffc857);
    }
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
    const shop = getShop(shopId, this.save.level);
    if (!shop) {
      this.game.events.emit('toast', 'SHOP CLOSED');
      return;
    }
    this.shopId = shopId;
    this.shopSelected = 0;
    this.shopBagSelected = 0;
    this.shopPane = 'stock';
    playSfx('shop');
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
    const shop = getShop(this.shopId, this.save.level);
    const item = shop?.stock[this.shopSelected];
    if (!item) return;
    const result = attemptPurchase(this.save, this.shopId, item.id);
    if (!result.ok) {
      playSfx('error');
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
    this.save = {
      ...result.save,
      flags: { ...result.save.flags, shop_traded: true },
    };
    writeSave(this.save);
    this.emitHud();
    playSfx('coin');
    const bought = result.item;
    this.game.events.emit(
      'toast',
      bought.buddyOnly
        ? `BOUGHT ${bought.name} [BUD] · Y TO EQUIP BUDDY (-${bought.price}c)`
        : `BOUGHT ${bought.name} (-${bought.price}c)`,
    );
    this.game.events.emit('shop-refresh', this.save);
    this.game.events.emit('inventory-refresh', this.save);
    this.flushAchievements();
  }

  private sellSelectedBagItem(): void {
    if (!this.shopId) return;
    const result = attemptSellIndex(
      this.save,
      this.shopId,
      this.shopBagSelected,
    );
    if (!result.ok) {
      playSfx('error');
      if (result.reason === 'nothing_to_sell') {
        this.game.events.emit('toast', 'NOTHING TO SELL');
      } else {
        this.game.events.emit('toast', 'CANNOT SELL THAT');
      }
      return;
    }
    this.save = {
      ...result.save,
      flags: { ...result.save.flags, shop_traded: true },
    };
    writeSave(this.save);
    this.emitHud();
    const bag = listPlayerSellables(this.save, this.shopId);
    if (this.shopBagSelected >= bag.length) {
      this.shopBagSelected = Math.max(0, bag.length - 1);
    }
    playSfx('coin');
    this.game.events.emit(
      'toast',
      `SOLD ${result.name} (+${result.coins}c)`,
    );
    this.game.events.emit('shop-refresh', this.save);
    this.game.events.emit('inventory-refresh', this.save);
    this.flushAchievements();
    this.game.events.emit('shop-select', {
      pane: 'bag',
      index: this.shopBagSelected,
    });
  }

  private navShop(dir: 'up' | 'down' | 'left' | 'right'): void {
    if (!this.shopOpen || !this.shopId) return;
    const shop = getShop(this.shopId, this.save.level);
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

    if (equippedWeaponIsRanged(this.save)) {
      this.tryRangedAttack();
      return;
    }

    this.attacking = true;
    playSfx('attack');
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

    // Attack FX matches equipped weapon silhouette
    const wLook = appearanceFromSave(this.save).weapon;
    const swingKey = swingTextureKey(wLook);
    this.swordHit.setTexture(
      this.textures.exists(swingKey) ? swingKey : 'sword-swing',
    );
    this.swordHit.setPosition(x, y);
    this.swordHit.setAngle(angle - 25);
    this.swordHit.setVisible(true);
    this.swordHit.setActive(true);
    this.swordHit.setDepth(15);
    this.swordHit.setScale(SPRITE_SCALE * 0.85);
    this.swordHit.setAlpha(1);
    const body = this.swordHit.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.moves = false;
    // Larger than sprite so overlaps vs big creeps (cube 20px frame) register
    body.setSize(28, 28);
    body.reset(x, y);

    if (motionAllowed()) {
      slashArc(this, x, y, angle);
      this.tweens.add({
        targets: this.swordHit,
        angle: angle + 28,
        scale: SPRITE_SCALE * 1.25,
        duration: 90,
        yoyo: true,
        ease: 'Quad.easeOut',
      });
    }

    // Immediate range check — reliable vs oversized frames if overlap misses a frame
    const reach = TILE * SCALE * 1.35;
    for (const a of this.actors) {
      if (!a.alive) continue;
      if (
        !(CONTACT_HOSTILES as readonly string[]).includes(a.kind)
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
    playSfx('door');
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
          .setScale(SPRITE_SCALE)
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
        playSfx('stairs');
        this.loadRoom(this.room.stairsDown, false, 'stairsDown');
        return;
      }
      if (tile === 'stairs_up' && this.room.stairsUp) {
        this.transitionLock = true;
        playSfx('stairs');
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
      playSfx('door');
      this.travelTo(this.room.north, entryFromOpposite('north'));
      return;
    }
    if (ty >= VIEW_TILES_H - 1 && this.room.south) {
      this.transitionLock = true;
      playSfx('door');
      this.travelTo(this.room.south, entryFromOpposite('south'));
      return;
    }
    if (tx <= 0 && this.room.west) {
      this.transitionLock = true;
      playSfx('door');
      this.travelTo(this.room.west, entryFromOpposite('west'));
      return;
    }
    if (tx >= VIEW_TILES_W - 1 && this.room.east) {
      this.transitionLock = true;
      playSfx('door');
      this.travelTo(this.room.east, entryFromOpposite('east'));
      return;
    }
  }

  private updateEnemies(delta: number): void {
    for (const a of this.actors) {
      if (!a.alive) continue;
      a.hurtCooldown = Math.max(0, a.hurtCooldown - delta);
      a.aiTimer -= delta;
      a.shootCooldown = Math.max(0, (a.shootCooldown ?? 0) - delta);

      // Tumbleweeds just drift (not hostile)
      if (a.kind === 'tumbleweed') {
        if (a.aiTimer <= 0) {
          a.aiTimer = Phaser.Math.Between(600, 1400);
          const body = a.sprite.body as Phaser.Physics.Arcade.Body;
          if (body) {
            body.setVelocity(
              Phaser.Math.Between(-40, 40),
              Phaser.Math.Between(-40, 40),
            );
          }
          a.sprite.setAngle(a.sprite.angle + Phaser.Math.Between(-20, 20));
        }
        continue;
      }

      // Stationary cactus / trees: no chase
      if (a.kind === 'cactus' || a.kind === 'tree') {
        if (a.sprite.body) {
          (a.sprite.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        }
        continue;
      }

      const hostile = (MOBILE_HOSTILES as readonly string[]).includes(a.kind);
      if (!hostile || this.dialogLocked || this.paused || this.panelOpen()) {
        if (a.sprite.body) {
          (a.sprite.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        }
        continue;
      }

      // Safety: if clipped into solid, shove back toward room center
      this.unstickFromWall(a);

      // Peaceful cube / Rules Lawyer idle until provoked
      if (this.isUnprovokedPeaceful(a)) {
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
            : a.kind === 'miniboss'
              ? 62
              : a.kind === 'wolf'
                ? 65
                : a.kind === 'hornet'
                  ? 90
                  : a.kind === 'scorpion'
                    ? 50
                    : a.kind === 'tarantula'
                      ? 45
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

      // Hard mode: skeletons/redshirts/bosses shoot
      if (
        isHardRunActive(this.save, this.room.land) &&
        (a.shootCooldown ?? 0) <= 0 &&
        !this.dialogLocked
      ) {
        this.tryEnemyShoot(a);
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
    if (this.leavingToTitle) return;
    if (!this.player?.body) return;

    // Light fuel + combat buffs (dark rooms burn carried light)
    if (!this.paused && !this.dialogLocked && !this.panelOpen()) {
      const dark = roomIsDark(this.room);
      const lit = tickLightFuel(this.save, delta, dark);
      this.save = lit.save;
      if (lit.expired) {
        this.game.events.emit('toast', 'YOUR LIGHT DIED — LIT ANOTHER');
        writeSave(this.save);
      }
      this.save = tickCombatBuffs(this.save, delta);
      this.refreshDarkOverlay();
    }

    // ESC / MENU: close dialog → close panels → pause (never trap talk mode)
    if (
      Phaser.Input.Keyboard.JustDown(this.keys.esc) ||
      consumeTouchAction('menu')
    ) {
      if (this.dialogLocked) {
        this.game.events.emit('dialog-close');
        drainTouchActions();
      } else if (this.inventoryOpen) {
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
          this.syncTouchPadMode('pause');
        } else {
          this.syncTouchPadMode('explore');
        }
      }
    }
    if (this.paused) {
      this.syncTouchPadMode('pause');
      // M / MAP / USE → main title
      if (
        Phaser.Input.Keyboard.JustDown(this.keys.m) ||
        consumeTouchAction('map') ||
        consumeTouchAction('use')
      ) {
        this.goToTitle();
        return;
      }
      // ATK / TALK / MENU while paused = resume
      if (
        consumeTouchAction('attack') ||
        consumeTouchAction('interact') ||
        consumeTouchAction('menu')
      ) {
        this.paused = false;
        this.game.events.emit('pause-ui', false);
        this.syncTouchPadMode('explore');
        drainTouchActions();
      }
      return;
    }

    this.invuln = Math.max(0, this.invuln - delta);
    this.padCooldown = Math.max(0, this.padCooldown - delta);
    this.portalCooldown = Math.max(0, this.portalCooldown - delta);
    this.dialogCloseCooldown = Math.max(0, this.dialogCloseCooldown - delta);

    if (this.dialogLocked || this.panelOpen()) {
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      this.handleModalTouchInput();
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
      // ESC closes dialog (desktop)
      if (this.dialogLocked && Phaser.Input.Keyboard.JustDown(this.keys.esc)) {
        this.game.events.emit('dialog-close');
      }
      // Enemies still move while inventory is open so the world is not frozen unfairly
      this.updateEnemies(delta);
      this.updateProjectiles(delta);
      this.rangedCd = Math.max(0, this.rangedCd - delta);
      this.updateVisualMotion(delta, false);
      return;
    }

    this.syncTouchPadMode('explore');

    const speed = 140;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    let vx = 0;
    let vy = 0;

    const left =
      this.cursors.left.isDown || this.keys.a.isDown || touchAxisDown('left');
    const right =
      this.cursors.right.isDown || this.keys.d.isDown || touchAxisDown('right');
    const up =
      this.cursors.up.isDown || this.keys.w.isDown || touchAxisDown('up');
    const down =
      this.cursors.down.isDown || this.keys.s.isDown || touchAxisDown('down');

    if (left) {
      vx = -speed;
      this.facing = 'left';
    } else if (right) {
      vx = speed;
      this.facing = 'right';
    }
    if (up) {
      vy = -speed;
      this.facing = 'up';
    } else if (down) {
      vy = speed;
      this.facing = 'down';
    }

    if (vx !== 0 && vy !== 0) {
      vx *= 0.707;
      vy *= 0.707;
    }
    body.setVelocity(vx, vy);

    // Foot walk cycle while moving (texture frames for plant/lift)
    const moving = vx !== 0 || vy !== 0;
    if (moving && motionAllowed() && !this.attacking) {
      this.walkAnimMs += delta;
      const stepMs = 140;
      if (this.walkAnimMs >= stepMs) {
        this.walkAnimMs = 0;
        this.walkFrame = this.walkFrame === 1 ? 2 : 1;
        this.refreshPlayerAppearance(this.walkFrame);
      }
      // face left/right for silhouette
      if (this.facing === 'left') this.player.setFlipX(true);
      else if (this.facing === 'right') this.player.setFlipX(false);
    } else {
      this.walkAnimMs = 0;
      if (this.walkFrame !== 0) {
        this.walkFrame = 0;
        this.refreshPlayerAppearance(0);
      }
      if (!moving) this.player.setFlipX(false);
    }

    // Blink while invuln
    this.player.setAlpha(this.invuln > 0 && Math.floor(_time / 80) % 2 === 0 ? 0.4 : 1);

    // Attack / interact — keyboard JustDown OR touch pad pulses
    if (
      Phaser.Input.Keyboard.JustDown(this.keys.space) ||
      Phaser.Input.Keyboard.JustDown(this.keys.z) ||
      consumeTouchAction('attack')
    ) {
      this.tryAttack();
    }
    if (consumeTouchAction('interact')) this.onInteractKey();
    if (consumeTouchAction('inventory')) this.onInventoryKey();
    if (consumeTouchAction('map')) this.onMapzKey();
    if (consumeTouchAction('use')) this.onUseItemKey();

    this.tryUnlockNearPlayer();
    this.checkHazards(delta);
    this.checkRoomExit();
    this.updateCompanionCombat(delta);
    this.updateEnemies(delta);
    this.updateProjectiles(delta);
    this.rangedCd = Math.max(0, this.rangedCd - delta);
    this.updateVisualMotion(delta, vx !== 0 || vy !== 0);
  }

  /** Soft alpha/scale loop for portal rings and forje glow. */
  private pulseAmbientProp(
    sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image,
    kind: 'portal' | 'forje',
  ): void {
    if (!motionAllowed() || !sprite.active) return;
    this.tweens.killTweensOf(sprite);
    sprite.setAlpha(1);
    if (kind === 'portal') {
      this.tweens.add({
        targets: sprite,
        alpha: 0.62,
        scale: SCALE * 1.1,
        duration: 520,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else {
      this.tweens.add({
        targets: sprite,
        alpha: 0.72,
        duration: 280,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  /**
   * Portal / forje pulse on room load (also applied at spawn for mid-fight portals).
   * Tweens killed in clearRoomObjects.
   */
  private startRoomAmbience(): void {
    if (!motionAllowed()) return;
    for (const a of this.actors) {
      if (!a.alive || !a.sprite?.active) continue;
      if (a.kind === 'portal' || a.kind === 'forje') {
        this.pulseAmbientProp(a.sprite, a.kind);
      }
    }
  }

  /**
   * Idle bob, enemy squash, ambient water/lava shimmer.
   * Physics positions untouched — only display scale/texture.
   */
  private updateVisualMotion(delta: number, playerMoving: boolean): void {
    this.animTime += delta;
    const t = this.animTime / 1000;

    if (motionAllowed() && this.player?.active && !this.attacking) {
      const b = bobScale(t, playerMoving);
      this.player.setScale(b.sx, b.sy);
    } else if (this.player?.active && !this.attacking) {
      this.player.setScale(SPRITE_SCALE);
    }

    // Companion bob when parked (not mid stretch/grab/strike tween)
    if (
      this.companionSprite?.active &&
      motionAllowed() &&
      this.budAnimLock <= 0 &&
      this.budAttackCd < 80
    ) {
      const cb = bobScale(t + 0.7, false);
      this.companionSprite.setScale(cb.sx * 0.95, cb.sy * 0.95);
    }

    // Enemy idle motion — skip while hurt so hit-squash tween can read
    if (motionAllowed()) {
      let i = 0;
      for (const a of this.actors) {
        if (!a.alive || !a.sprite?.active) continue;
        if (a.hurtCooldown > 0) continue;
        if (
          !(CONTACT_HOSTILES as readonly string[]).includes(a.kind)
        ) {
          continue;
        }
        const eb = enemyBobScale(t, a.kind, i++);
        a.sprite.setScale(eb.sx, eb.sy);
        if (a.kind === 'slime' && this.textures.exists('slime-b')) {
          const frame = Math.floor(this.animTime / 380) % 2;
          const key = frame === 0 ? 'slime' : 'slime-b';
          if (a.sprite.texture.key !== key) a.sprite.setTexture(key);
        }
      }
    }

    // Ambient water / lava texture ping-pong
    if (motionAllowed() && this.ambientTiles.length) {
      const next = Math.floor(this.animTime / 420) % 2;
      if (next !== this.ambientFrame) {
        this.ambientFrame = next;
        for (const { img, kind } of this.ambientTiles) {
          if (!img.active) continue;
          if (kind === 'water') {
            const k = next === 0 ? 'tile-water' : 'tile-water-b';
            if (this.textures.exists(k)) img.setTexture(k);
          } else if (kind === 'lava') {
            const k = next === 0 ? 'tile-lava' : 'tile-lava-b';
            if (this.textures.exists(k)) img.setTexture(k);
          }
        }
      }
    }
  }
  private checkHeroPick(): void {
    const kind = pendingHeroPick(this.save);
    if (!kind) return;
    // HTML modal — class / multiclass / race
    window.dispatchEvent(
      new CustomEvent('dunjunz-hero-pick', { detail: { kind } }),
    );
  }

  /** Apply all unspent +2/+1 packages when auto-stats is on. */
  private applyAutoStatsIfEnabled(fromSettings: boolean): void {
    if (!loadSettings().autoStatAllocate) return;
    if (!hasUnspentStatPackages(this.save)) {
      if (fromSettings) {
        this.game.events.emit('toast', 'AUTO STATS ON — NEXT LEVEL-UPS AUTO');
      }
      return;
    }
    const { save, notes } = flushAutoStatPackages(this.save);
    this.save = syncDerivedStats(save);
    writeSave(this.save);
    this.emitHud();
    playSfx('success');
    const brief =
      notes.length > 2
        ? `${notes.length} PACKAGES APPLIED`
        : notes.slice(0, 2).join(' · ');
    this.game.events.emit(
      'toast',
      fromSettings ? `AUTO STATS: ${brief}` : brief,
    );
  }

  /**
   * Soft-respawn common creeps after ~55–75s, a bit tougher with level/gen.
   */
  private scheduleCreepRespawn(actor: Actor): void {
    const def = this.room.entities?.find((e) => e.id === actor.id);
    if (!def) return;
    const roomId = this.room.id;
    const prev = this.respawnGen.get(actor.id) ?? actor.respawnGen ?? 0;
    const gen = prev + 1;
    this.respawnGen.set(actor.id, gen);
    const delay = respawnDelayMs();
    this.time.delayedCall(delay, () => {
      if (!this.scene.isActive() || this.room?.id !== roomId) return;
      if (this.actors.some((a) => a.alive && a.id === def.id)) return;
      this.spawnEntity(def, { generation: gen });
      if (motionAllowed()) {
        this.game.events.emit('toast', 'SOMETHING STIRS…');
      }
    });
  }

  private ensureHardModeGates(): void {
    const land = this.room.land;
    if (!land) return;
    if (shouldSpawnHardGate(this.save, this.room.id, land)) {
      const def = hardGatePortalDef(land);
      if (def && !this.actors.some((a) => a.id === def.id)) {
        this.spawnEntity(def);
      }
    }
    if (shouldSpawnHardExit(this.save, this.room.id, land)) {
      const def = hardExitPortalDef(land);
      if (!this.actors.some((a) => a.id === def.id)) {
        this.spawnEntity(def);
      }
    }
  }

  /** Hard trek: after ensigns die, captain becomes a boss. */
  private maybePromoteCaptain(): void {
    if (!shouldPromoteCaptain(this.save, this.room.id)) return;
    if (this.actors.some((a) => a.alive && (a.id === CAPTAIN_ID || a.id === 'captain-hard'))) {
      return;
    }
    const def: EntityDef = {
      kind: 'boss',
      id: CAPTAIN_ID,
      x: 8,
      y: 5,
      hp: 40,
      dialog: [
        'CAPTAIN: ENSIGNS DOWN. GOLD SHIRT ENGAGED.',
        'PHASERS TO MAXIMUM. BEAM-OUT IS FOR QUITTERS.',
        'ENGAGE!',
      ],
    };
    this.spawnEntity(def);
    playSfx('success');
    this.game.events.emit('toast', 'CAPTAIN ENTERS COMBAT — HARD BOSS!');
    this.game.events.emit('dialog-show', def.dialog ?? []);
  }

  private tryRangedAttack(): void {
    if (this.rangedCd > 0 || this.attacking) return;
    const ammo = consumeWeaponAmmo(this.save);
    if (!ammo.ok) {
      playSfx('error');
      this.game.events.emit('toast', ammo.reason);
      return;
    }
    this.save = ammo.save;
    writeSave(this.save);
    this.emitHud();

    this.attacking = true;
    this.rangedCd = 280;
    playSfx('attack');
    this.refreshPlayerAppearance();

    const uid = this.save.equipped.weapon!;
    const inst = findInBag(this.save, uid);
    const tmpl = inst ? getTemplate(inst.templateId) : null;
    const projKind = tmpl?.projectile ?? 'bolt';
    const tex =
      projKind === 'arrow'
        ? 'proj-arrow'
        : projKind === 'phaser'
          ? 'proj-phaser'
          : projKind === 'fireball'
            ? 'proj-fireball'
            : 'proj-bolt';
    // Never allow 0 / NaN damage on ranged shots
    const dmg = Math.max(1, computePlayerDamage(this.save) | 0);
    const dir = this.facingVector();
    // Phaser beams a bit faster; keep speeds hittable (no tunneling)
    const speed =
      projKind === 'phaser' ? 220 : projKind === 'arrow' ? 200 : 180;
    const angle =
      dir.x === 0 && dir.y === -1
        ? -90
        : dir.x === 0 && dir.y === 1
          ? 90
          : dir.x === -1
            ? 180
            : 0;
    this.spawnProjectile(
      this.player.x + dir.x * 22,
      this.player.y + dir.y * 22,
      dir.x * speed,
      dir.y * speed,
      dmg,
      tex,
      true,
      1100,
      angle,
    );
    sparkBurst(
      this,
      this.player.x + dir.x * 16,
      this.player.y + dir.y * 16,
      projKind === 'phaser' ? 0xff3344 : 0x7dffb3,
      3,
    );
    this.time.delayedCall(160, () => {
      this.attacking = false;
      this.refreshPlayerAppearance();
    });
  }

  private facingVector(): { x: number; y: number } {
    if (this.facing === 'up') return { x: 0, y: -1 };
    if (this.facing === 'down') return { x: 0, y: 1 };
    if (this.facing === 'left') return { x: -1, y: 0 };
    return { x: 1, y: 0 };
  }

  private tryEnemyShoot(a: Actor): void {
    const pk = hardProjectileForActor(a.kind, a.id);
    if (!pk) return;
    const threat = threatForRoom(this.room, this.save);
    const spec = projectileSpec(pk, threat);
    const dist = Phaser.Math.Distance.Between(
      a.sprite.x,
      a.sprite.y,
      this.player.x,
      this.player.y,
    );
    if (dist > spec.range || dist < 28) return;
    const ang = Phaser.Math.Angle.Between(
      a.sprite.x,
      a.sprite.y,
      this.player.x,
      this.player.y,
    );
    a.shootCooldown = spec.cooldownMs;
    this.spawnProjectile(
      a.sprite.x,
      a.sprite.y,
      Math.cos(ang) * spec.speed,
      Math.sin(ang) * spec.speed,
      spec.damage,
      spec.texture,
      false,
      1200,
    );
  }

  private spawnProjectile(
    x: number,
    y: number,
    vx: number,
    vy: number,
    dmg: number,
    texture: string,
    fromPlayer: boolean,
    life: number,
    angleDeg = 0,
  ): void {
    const key = this.textures.exists(texture) ? texture : 'particle-hit';
    const img = this.add.image(x, y, key).setDepth(14).setScale(SCALE * 0.95);
    if (angleDeg) img.setAngle(angleDeg);
    this.projectiles.push({
      img,
      vx,
      vy,
      dmg: Math.max(1, dmg | 0),
      life,
      fromPlayer,
    });
  }

  /** Generous hit radius — sprites are TILE*SCALE (~48px); 22px was missing almost everything. */
  private projectileHitRadius(fromPlayer: boolean): number {
    return fromPlayer ? TILE * SCALE * 0.72 : TILE * SCALE * 0.55;
  }

  private updateProjectiles(delta: number): void {
    const dt = Math.min(0.05, delta / 1000); // clamp so lag spikes don't tunnel
    const next: typeof this.projectiles = [];
    for (const p of this.projectiles) {
      p.life -= delta;
      let dead = p.life <= 0;

      // Sub-step motion so fast beams can't skip past creep centers
      const steps = Math.max(1, Math.ceil((Math.hypot(p.vx, p.vy) * dt) / 12));
      const stepDt = dt / steps;
      for (let s = 0; s < steps && !dead; s++) {
        const prevX = p.img.x;
        const prevY = p.img.y;
        p.img.x += p.vx * stepDt;
        p.img.y += p.vy * stepDt;

        // Hit creeps first (so a shot that grazes wall+creep still counts)
        if (p.fromPlayer) {
          for (const a of this.actors) {
            if (!a.alive || !a.sprite?.active) continue;
            if (!isHostileKind(a.kind) && a.kind !== 'boss') continue;
            if (this.isUnprovokedPeaceful(a)) continue;
            const hitR = this.projectileHitRadius(true);
            // Segment vs point: nearest distance along this step
            const d = this.distPointToSegment(
              a.sprite.x,
              a.sprite.y,
              prevX,
              prevY,
              p.img.x,
              p.img.y,
            );
            if (d <= hitR) {
              const applied = this.hitEnemyWithDamage(a, p.dmg, true);
              if (applied) {
                dead = true;
                break;
              }
            }
          }
        } else if (this.player?.active) {
          const hitR = this.projectileHitRadius(false);
          const d = this.distPointToSegment(
            this.player.x,
            this.player.y,
            prevX,
            prevY,
            p.img.x,
            p.img.y,
          );
          if (d <= hitR && this.invuln <= 0) {
            this.hurtPlayerFromProjectile(p.dmg);
            dead = true;
          }
        }

        if (dead) break;

        const tx = Math.floor((p.img.x - this.roomOriginX) / (TILE * SCALE));
        const ty = Math.floor((p.img.y - this.roomOriginY) / (TILE * SCALE));
        if (this.isSolidTile(tx, ty)) dead = true;
      }

      if (dead) p.img.destroy();
      else next.push(p);
    }
    this.projectiles = next;
  }

  /** Distance from point to line segment AB. */
  private distPointToSegment(
    px: number,
    py: number,
    ax: number,
    ay: number,
    bx: number,
    by: number,
  ): number {
    const abx = bx - ax;
    const aby = by - ay;
    const len2 = abx * abx + aby * aby;
    if (len2 < 0.0001) return Math.hypot(px - ax, py - ay);
    let t = ((px - ax) * abx + (py - ay) * aby) / len2;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + t * abx;
    const cy = ay + t * aby;
    return Math.hypot(px - cx, py - cy);
  }

  /**
   * Apply damage to a creep. Returns true if the hit landed.
   * Projectiles use a short hurt window so beams aren't hard-gated by melee i-frames.
   */
  private hitEnemyWithDamage(
    actor: Actor,
    dmg: number,
    fromProjectile = false,
  ): boolean {
    if (!actor.alive) return false;
    // Melee multi-hit guard; projectiles only skip if still in brief i-frames
    if (actor.hurtCooldown > 0 && !fromProjectile) return false;
    if (fromProjectile && actor.hurtCooldown > 120) return false;

    if (actor.kind === 'cube' && !actor.aggressive) {
      this.provokePeaceful(actor, 'THE CUBE IS MAD NOW');
    } else if (isPeacefulMinibossUntilProvoked(actor.id) && !actor.aggressive) {
      this.provokePeaceful(actor, 'OBJECTION! THE RULES LAWYER IS MAD');
    }
    const amount = Math.max(1, dmg | 0);
    actor.hurtCooldown = fromProjectile ? 140 : 200;
    actor.hp -= amount;
    playSfx('hit_enemy');
    actor.sprite.setTint(fromProjectile ? 0xff6688 : 0xffffff);
    sparkBurst(
      this,
      actor.sprite.x,
      actor.sprite.y,
      fromProjectile ? 0xff3344 : 0xffffff,
      fromProjectile ? 5 : 3,
    );
    this.time.delayedCall(80, () => {
      if (actor.alive) actor.sprite.clearTint();
    });
    if (actor.hp <= 0) this.killActor(actor);
    else {
      this.game.events.emit(
        'toast',
        `${actor.kind.toUpperCase()} ${actor.hp}/${actor.maxHp}`,
      );
    }
    return true;
  }

  private hurtPlayerFromProjectile(dmg: number): void {
    if (this.invuln > 0 || this.dialogLocked || this.paused) return;
    if (
      isCompanionActive(this.save) &&
      budCanBlockHit(this.save.bestBudId, this.budBlockCd)
    ) {
      this.budBlockCd = BUD_BLOCK_COOLDOWN_MS;
      this.invuln = 500;
      playSfx('success');
      this.game.events.emit('toast', 'PEBBO BLOCKED A SHOT!');
      if (this.companionSprite?.active) {
        this.budAnimLock = 400;
        playBuddyGuardAnim(this, this.companionSprite);
      }
      return;
    }
    const final = Math.max(1, dmg - this.save.armor);
    this.save.hp = Math.max(0, this.save.hp - final);
    this.invuln = 700;
    this.emitHud();
    writeSave(this.save);
    playSfx('hit_player');
    this.game.events.emit('toast', `HIT BY SHOT -${final}`);
    if (!loadSettings().reduceMotion) {
      this.cameras.main.shake(80, 0.006);
    }
    if (this.save.hp <= 0) this.die();
  }

}
