import Phaser from 'phaser';
import { COLORS, GAME_W, GAME_H, HUD_H, SPRITE_SCALE } from '../config';
import { ROOMS } from '../data/world';
import {
  appearanceFromSave,
  bodyLookFromSave,
  budAppearanceFromSave,
  itemIconKey,
} from '../systems/appearance';
import { ensureBuddyTexture, ensurePlayerTexture } from '../systems/textures';
import {
  inventorySortLabel,
  listInventory,
  nextInventorySortMode,
  type InventorySortMode,
} from '../systems/inventory';
import {
  ALL_EQUIP_SLOTS,
  compareToEquipped,
  displayItemName,
  equipCompareDetailLine,
  findInBag,
  getTemplate,
} from '../systems/items';
import {
  canHeroEquipGear,
  classGearHint,
  isGearClassBlocked,
} from '../systems/class-gear';
// Ensure class-gear registers DEF compare hook
import '../systems/class-gear';
import { ATTR_IDS, ATTR_LABELS } from '../systems/attributes';
import type { AttrId } from '../types';
import { isTouchUiPreferred } from '../systems/touch-input';
import { getBestBud, isCompanionActive } from '../systems/best-bud';
import {
  budArmorDef,
  budGearSummary,
  computeBudStrikeDamage,
  ensureBudProgress,
  type EquipTarget,
} from '../systems/best-bud-gear';
import {
  buildMapzView,
  floorLabel,
  landForRoom,
  type MapzOpenPayload,
  type MapzViewModel,
} from '../systems/mapz';
import type { RackPickerPayload } from '../systems/tutorial';
import {
  canAfford,
  clampShopPage,
  getShop,
  listPlayerSellables,
  SHOP_BAG_COLS,
  SHOP_BAG_PAGE_SIZE,
  SHOP_STOCK_COLS,
  SHOP_STOCK_PAGE_SIZE,
  shopIconTexture,
  shopPageCount,
  shopPageOf,
  type ShopOpenPayload,
  type ShopPane,
} from '../systems/shop';
import {
  canAffordForjing,
  FORJING_ACTION_COLS,
  formatForjingCost,
  forjingIconTexture,
  listForjingActions,
  listForjingMats,
  type ForjingOpenPayload,
} from '../systems/forjing';
import { playSfx } from '../systems/audio';
import { xpProgressInLevel } from '../systems/progression';
import type { EquipSlot, LandId, SaveData } from '../types';

const MAPZ_CELL = 56;
const MAPZ_GAP = 14;
const SHOP_CELL = 56;
const SHOP_GAP = 10;
const FORJE_CELL = 56;
const FORJE_GAP = 10;

const SLOT_KEYS: Record<EquipSlot, string> = {
  weapon: 'W',
  shield: 'O',
  helmet: 'H',
  breastplate: 'C',
  greaves: 'L',
  shoes: 'F',
  gloves: 'G',
  amulet: 'N',
  ring: 'R',
  key: 'K',
};

/** Short equip chrome (1 line) — full slot words overflow Press Start rows. */
const SLOT_SHORT: Record<EquipSlot, string> = {
  weapon: 'WPN',
  shield: 'SHD',
  helmet: 'HELM',
  breastplate: 'CHEST',
  greaves: 'LEGS',
  shoes: 'FEET',
  gloves: 'GLV',
  amulet: 'AMU',
  ring: 'RING',
  key: 'KEY',
};

/**
 * Press Start 2P ~7–8px/char at 8px — hard-cap one equip name line.
 * Prefer word-boundary ellipsis so we never show mid-token trash like "(LE…".
 */
function truncateInvName(name: string, maxChars: number): string {
  const s = name.trim();
  if (s.length <= maxChars) return s;
  if (maxChars <= 1) return '…';
  const budget = maxChars - 1;
  const cut = s.slice(0, budget);
  const sp = cut.lastIndexOf(' ');
  // Only break on a space if we keep a useful prefix
  const base =
    sp >= Math.max(4, Math.floor(budget * 0.4)) ? cut.slice(0, sp) : cut;
  return `${base.trimEnd()}…`;
}

/**
 * Equip-column name only: template + enhancement.
 * Omit rarity / attr noise — full detail lives in bag INSPECT.
 */
function equipListItemName(inst: {
  templateId: string;
  enhancement: number;
}): string {
  const t = getTemplate(inst.templateId);
  const bits = [t.name];
  if (t.buddyOnly) bits.push('[BUD]');
  if (inst.enhancement > 0) bits.push(`+${inst.enhancement}`);
  // No rarity / attr tokens — those overflow the strip; bag INSPECT has full name
  return bits.join(' ');
}

/**
 * HUD + dialog + multi-slot inventory paper-doll.
 */
export class UIScene extends Phaser.Scene {
  private heartsText: Phaser.GameObjects.Text | null = null;
  /** Row 1: level / XP / coins / def (never room title). */
  private itemsText: Phaser.GameObjects.Text | null = null;
  /** Row 2 left: room name only. */
  private roomText: Phaser.GameObjects.Text | null = null;
  /** Row 2 right: control hints + quest mark (separate so they never collide). */
  private hintsText: Phaser.GameObjects.Text | null = null;
  private dialogBg: Phaser.GameObjects.Rectangle | null = null;
  private dialogText: Phaser.GameObjects.Text | null = null;
  private dialogNextHit: Phaser.GameObjects.Rectangle | null = null;
  private dialogCloseHit: Phaser.GameObjects.Rectangle | null = null;
  private dialogNextLabel: Phaser.GameObjects.Text | null = null;
  private dialogCloseLabel: Phaser.GameObjects.Text | null = null;
  private dialogLines: string[] = [];
  private dialogIndex = 0;
  private dialogOpen = false;
  private pauseText: Phaser.GameObjects.Text | null = null;
  private pauseResumeHit: Phaser.GameObjects.Rectangle | null = null;
  private pauseTitleHit: Phaser.GameObjects.Rectangle | null = null;
  private pauseResumeLabel: Phaser.GameObjects.Text | null = null;
  private pauseTitleLabel: Phaser.GameObjects.Text | null = null;
  private toastText: Phaser.GameObjects.Text | null = null;

  private invBg: Phaser.GameObjects.Rectangle | null = null;
  private invTitle: Phaser.GameObjects.Text | null = null;
  /** Character zone plate (doll + equip + stats). */
  private invCharPlate: Phaser.GameObjects.Rectangle | null = null;
  /** Optional stats inset well. */
  private invStatsPlate: Phaser.GameObjects.Rectangle | null = null;
  /** Bag zone plate (grid + pager). */
  private invBagPlate: Phaser.GameObjects.Rectangle | null = null;
  /** Inspect card plate (selected item detail). */
  private invDetailPlate: Phaser.GameObjects.Rectangle | null = null;
  private invDetailHeader: Phaser.GameObjects.Text | null = null;
  private invDetailIconWell: Phaser.GameObjects.Rectangle | null = null;
  private invDetailIcon: Phaser.GameObjects.Image | null = null;
  private invAvatar: Phaser.GameObjects.Image | null = null;
  private invAvatarPlate: Phaser.GameObjects.Rectangle | null = null;
  private invYouLabel: Phaser.GameObjects.Text | null = null;
  private invStats: Phaser.GameObjects.Text | null = null;
  private invAttrs: Phaser.GameObjects.Text | null = null;
  private invBagTitle: Phaser.GameObjects.Text | null = null;
  private invBagDetail: Phaser.GameObjects.Text | null = null;
  private invBagLayer: Phaser.GameObjects.Container | null = null;
  private invBagPieces: Phaser.GameObjects.GameObject[] = [];
  /** Tappable STR/DEX/… buttons when level packages are waiting. */
  private invStatLayer: Phaser.GameObjects.Container | null = null;
  private invStatPieces: Phaser.GameObjects.GameObject[] = [];
  private invBagSelected = 0;
  /** Bag grid page (0-based). 8×3 = 24 slots per page. */
  private invBagPage = 0;
  /** Display sort for bag listing (does not reorder save data). */
  private invBagSort: InventorySortMode = 'default';
  private invHelp: Phaser.GameObjects.Text | null = null;

  private static readonly BAG_COLS = 8;
  private static readonly BAG_ROWS = 3;
  /** 8×3 visible cells per page. */
  private static readonly BAG_PAGE_SIZE = 24;
  /** Bag cell size (px) — large enough to read 32×32 craft icons. */
  private static readonly BAG_CELL = 68;
  private static readonly BAG_GAP = 12;
  /** Icon display scale (ART_RES 32 → ~66px in cell). */
  private static readonly BAG_ICON_SCALE = 2.05;

  /**
   * Inventory layout (Comb + Pollen pass-2).
   * Top: character strip. Bottom: bag | inspect (flush siblings, 14px gutter).
   */
  private static readonly INV_DOLL_X = 100;
  private static readonly INV_DOLL_Y = 190;
  private static readonly INV_EQUIP_X0 = 200;
  private static readonly INV_EQUIP_Y0 = HUD_H + 36;
  /** Col pitch: col1 icon at 392; name max R ~566 before 14px gutter to stats. */
  private static readonly INV_EQUIP_COL_W = 192;
  private static readonly INV_EQUIP_ROW_H = 36;
  /**
   * Max chars for equip name line (~148px advance @ Press Start 8px).
   * No wordWrap — one line only so text cannot overflow the row box.
   */
  private static readonly INV_EQUIP_NAME_CHARS = 18;
  /** Stats text = well L + 12 (well L = 580). */
  private static readonly INV_STATS_X = 592;
  /** Content-hugging stats well (was 600×160 void at cx 928). */
  private static readonly INV_STATS_PLATE_CX = 740;
  private static readonly INV_STATS_PLATE_CY = 178;
  private static readonly INV_STATS_PLATE_W = 320;
  private static readonly INV_STATS_PLATE_H = 148;
  private static readonly INV_BAG_LEFT = 48;
  /** Content inset under bag plate top (plate top = 308). */
  private static readonly INV_BAG_TITLE_Y = 324;
  private static readonly INV_BAG_ORIGIN_Y = 348;
  /**
   * Inspect plate: bag R=708 + 14 gutter → L=722; same H as bag (324).
   * Content inset 16 → text X=738, wrap 486.
   */
  private static readonly INV_DETAIL_PLATE_L = 722;
  private static readonly INV_DETAIL_PLATE_W = 518;
  private static readonly INV_DETAIL_PLATE_H = 324;
  private static readonly INV_DETAIL_PLATE_TOP = 308;
  private static readonly INV_DETAIL_X = 738;
  private static readonly INV_DETAIL_HEADER_Y = 324;
  private static readonly INV_DETAIL_BODY_Y = 360;
  private static readonly INV_DETAIL_W = 486;
  private static readonly INV_HELP_Y = 688;
  /** Stat spend buttons must stay above bag band. */
  private static readonly INV_STAT_BTN_MAX_Y = 292;

  private invSlotFrames: Partial<Record<EquipSlot, Phaser.GameObjects.Image>> = {};
  private invSlotIcons: Partial<Record<EquipSlot, Phaser.GameObjects.Image>> = {};
  private invSlotLabels: Partial<Record<EquipSlot, Phaser.GameObjects.Text>> = {};

  private inventoryOpen = false;
  private mapzOpen = false;
  private forjingOpen = false;
  private shopOpen = false;
  private lastSave: SaveData | null = null;
  /** Which paper-doll equip keys apply to (Y toggles in GameScene). */
  private gearTarget: EquipTarget = 'hero';
  private bound = false;
  private chromeBuilt = false;

  private mapzBg: Phaser.GameObjects.Rectangle | null = null;
  private mapzTitle: Phaser.GameObjects.Text | null = null;
  private mapzSubtitle: Phaser.GameObjects.Text | null = null;
  private mapzLegend: Phaser.GameObjects.Text | null = null;
  private mapzHelp: Phaser.GameObjects.Text | null = null;
  private mapzLayer: Phaser.GameObjects.Container | null = null;
  private mapzPieces: Phaser.GameObjects.GameObject[] = [];
  private mapzPayload: MapzOpenPayload | null = null;
  private mapzFloor: number | undefined;
  private forjingBg: Phaser.GameObjects.Rectangle | null = null;
  private forjingTitle: Phaser.GameObjects.Text | null = null;
  private forjingCoins: Phaser.GameObjects.Text | null = null;
  private forjingActionLabel: Phaser.GameObjects.Text | null = null;
  private forjingMatLabel: Phaser.GameObjects.Text | null = null;
  private forjingDetail: Phaser.GameObjects.Text | null = null;
  private forjingHelp: Phaser.GameObjects.Text | null = null;
  private forjingLayer: Phaser.GameObjects.Container | null = null;
  private forjingPieces: Phaser.GameObjects.GameObject[] = [];
  private forjingPayload: ForjingOpenPayload | null = null;
  private forjingSelected = 0;

  private shopBg: Phaser.GameObjects.Rectangle | null = null;
  private shopTitle: Phaser.GameObjects.Text | null = null;
  private shopCoins: Phaser.GameObjects.Text | null = null;
  private shopStockLabel: Phaser.GameObjects.Text | null = null;
  private shopBagLabel: Phaser.GameObjects.Text | null = null;
  private shopDetail: Phaser.GameObjects.Text | null = null;
  private shopHelp: Phaser.GameObjects.Text | null = null;
  private shopLayer: Phaser.GameObjects.Container | null = null;
  private shopPieces: Phaser.GameObjects.GameObject[] = [];
  private shopPayload: ShopOpenPayload | null = null;
  private shopSelected = 0;
  private shopBagSelected = 0;
  private shopPane: ShopPane = 'stock';
  private shopStockPage = 0;
  private shopBagPage = 0;

  /** Weapon rack picker (inventory-style grid). */
  private rackBg: Phaser.GameObjects.Rectangle | null = null;
  private rackTitle: Phaser.GameObjects.Text | null = null;
  private rackSubtitle: Phaser.GameObjects.Text | null = null;
  private rackDetail: Phaser.GameObjects.Text | null = null;
  private rackHelp: Phaser.GameObjects.Text | null = null;
  private rackLayer: Phaser.GameObjects.Container | null = null;
  private rackPieces: Phaser.GameObjects.GameObject[] = [];
  private rackPayload: RackPickerPayload | null = null;
  private rackOpen = false;
  private rackSelected = 0;
  private static readonly RACK_COLS = 4;
  private static readonly RACK_CELL = 88;
  private static readonly RACK_GAP = 16;

  /** Return loaner Yes/No prompt */
  private rackRetBg: Phaser.GameObjects.Rectangle | null = null;
  private rackRetTitle: Phaser.GameObjects.Text | null = null;
  private rackRetBody: Phaser.GameObjects.Text | null = null;
  private rackRetYesHit: Phaser.GameObjects.Rectangle | null = null;
  private rackRetNoHit: Phaser.GameObjects.Rectangle | null = null;
  private rackRetYesLabel: Phaser.GameObjects.Text | null = null;
  private rackRetNoLabel: Phaser.GameObjects.Text | null = null;
  private rackRetOpen = false;

  constructor() {
    super({ key: 'UI', active: false });
  }

  create(): void {
    this.resetDialogVisuals();
    this.inventoryOpen = false;
    this.mapzOpen = false;
    this.forjingOpen = false;
    this.shopOpen = false;
    this.rackOpen = false;
    this.rackRetOpen = false;
    if (!this.chromeBuilt || !this.dialogBg?.active) {
      this.buildChrome();
      this.chromeBuilt = true;
    } else {
      this.dialogBg?.setVisible(false);
      this.dialogText?.setVisible(false);
      this.pauseText?.setVisible(false);
      this.pauseResumeHit?.setVisible(false);
      this.pauseTitleHit?.setVisible(false);
      this.pauseResumeLabel?.setVisible(false);
      this.pauseTitleLabel?.setVisible(false);
      this.toastText?.setAlpha(0);
      this.setInventoryVisible(false);
      this.ensureMapzChrome();
      this.closeMapzPanel();
      this.closeForjingPanel();
      this.ensureShopChrome();
      this.closeShopPanel();
    }
    this.bindGameEvents();
  }

  private buildChrome(): void {
    // Two-row HUD (EMA/Comb pass): stats never share a line with room/hints.
    // Row 1 y≈12: hearts + vitals. Row 2 y≈38: place + controls.
    this.add.rectangle(GAME_W / 2, HUD_H / 2, GAME_W, HUD_H, 0x0a0c10, 0.94);
    this.add
      .rectangle(GAME_W / 2, HUD_H - 1, GAME_W, 2, COLORS.green, 0.75)
      .setOrigin(0.5, 1);

    // Hearts — high contrast pink on near-black (WCAG-ish for UI chrome)
    // ADA floor: pixel UI ≥8–11px; looser lineSpacing for Press Start
    this.heartsText = this.add.text(16, 12, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '12px',
      color: '#ff6b9d',
    });
    this.itemsText = this.add.text(200, 14, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '10px',
      color: '#ffc857',
      wordWrap: { width: GAME_W - 220 },
    });
    this.roomText = this.add.text(16, 40, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '9px',
      color: '#c5cde0',
      wordWrap: { width: Math.floor(GAME_W * 0.55) },
    });
    this.hintsText = this.add
      .text(GAME_W - 16, 40, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '9px',
        color: '#7dffb3',
        align: 'right',
      })
      .setOrigin(1, 0);

    // Dialog: bottom dock so the playfield/action stays visible
    const dialogH = 168;
    const dialogMargin = 16;
    const dialogCy = GAME_H - dialogH / 2 - dialogMargin;
    this.dialogBg = this.add
      .rectangle(GAME_W / 2, dialogCy, GAME_W - 48, dialogH, 0x12161f, 0.96)
      .setStrokeStyle(3, COLORS.green)
      .setVisible(false)
      .setDepth(100)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    this.dialogBg.on('pointerdown', () => this.advanceDialog());
    this.dialogText = this.add
      .text(40, dialogCy - dialogH / 2 + 18, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '12px',
        color: '#f4f0ff',
        wordWrap: { width: GAME_W - 88 },
        lineSpacing: 12,
      })
      .setVisible(false)
      .setDepth(101)
      .setScrollFactor(0);

    // On-canvas NEXT / CLOSE for talk mode (no keyboard needed)
    const dBtnW = Math.min(200, (GAME_W - 80) / 2);
    const dBtnY = dialogCy + dialogH / 2 - 28;
    this.dialogNextHit = this.add
      .rectangle(GAME_W / 2 - dBtnW / 2 - 8, dBtnY, dBtnW, 40, 0x1a4030, 0.98)
      .setStrokeStyle(2, COLORS.green)
      .setVisible(false)
      .setDepth(102)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    this.dialogNextLabel = this.add
      .text(GAME_W / 2 - dBtnW / 2 - 8, dBtnY, '▶ NEXT', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '11px',
        color: '#7dffb3',
      })
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(103)
      .setScrollFactor(0);
    this.dialogCloseHit = this.add
      .rectangle(GAME_W / 2 + dBtnW / 2 + 8, dBtnY, dBtnW, 40, 0x3a2030, 0.98)
      .setStrokeStyle(2, 0xff6b9d)
      .setVisible(false)
      .setDepth(102)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    this.dialogCloseLabel = this.add
      .text(GAME_W / 2 + dBtnW / 2 + 8, dBtnY, '✕ CLOSE', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '11px',
        color: '#ffb0c8',
      })
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(103)
      .setScrollFactor(0);
    this.dialogNextHit.on('pointerdown', () => this.advanceDialog());
    this.dialogCloseHit.on('pointerdown', () => this.closeDialog());

    this.buildInventoryPanel();
    this.buildMapzPanel();
    this.buildForjingPanel();
    this.buildShopPanel();
    this.buildRackPickerPanel();
    this.buildRackReturnPrompt();

    this.pauseText = this.add
      .text(
        GAME_W / 2,
        GAME_H / 2 - 70,
        'PAUSED\n\nESC / ATK — RESUME\nM / MAP — MAIN TITLE',
        {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '14px',
          color: '#7dffb3',
          align: 'center',
          backgroundColor: '#0a0c10cc',
          padding: { x: 20, y: 16 },
          lineSpacing: 8,
        },
      )
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(130)
      .setScrollFactor(0);

    // Big touch targets so mobile can leave pause without a keyboard
    const btnW = Math.min(420, GAME_W - 64);
    const btnH = 52;
    const yResume = GAME_H / 2 + 40;
    const yTitle = GAME_H / 2 + 110;
    this.pauseResumeHit = this.add
      .rectangle(GAME_W / 2, yResume, btnW, btnH, 0x1a4030, 0.98)
      .setStrokeStyle(3, COLORS.green)
      .setVisible(false)
      .setDepth(131)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    this.pauseResumeLabel = this.add
      .text(GAME_W / 2, yResume, '▶  RESUME', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '14px',
        color: '#7dffb3',
      })
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(132)
      .setScrollFactor(0);
    this.pauseTitleHit = this.add
      .rectangle(GAME_W / 2, yTitle, btnW, btnH, 0x3a2810, 0.98)
      .setStrokeStyle(3, 0xffc857)
      .setVisible(false)
      .setDepth(131)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    this.pauseTitleLabel = this.add
      .text(GAME_W / 2, yTitle, '⌂  MAIN MENU', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '14px',
        color: '#ffc857',
      })
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(132)
      .setScrollFactor(0);

    this.pauseResumeHit.on('pointerdown', () => {
      this.game.events.emit('pause-action', 'resume');
    });
    this.pauseTitleHit.on('pointerdown', () => {
      this.game.events.emit('pause-action', 'title');
    });

    this.toastText = this.add
      .text(GAME_W / 2, HUD_H + 28, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '11px',
        color: '#ffc857',
        backgroundColor: '#0a0c10ee',
        padding: { x: 12, y: 10 },
        wordWrap: { width: GAME_W - 80 },
        align: 'center',
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(125)
      .setScrollFactor(0);
  }

  private buildMapzPanel(): void {
    const d = 200;
    this.clearMapzPieces();
    this.mapzBg?.destroy();
    this.mapzTitle?.destroy();
    this.mapzSubtitle?.destroy();
    this.mapzLegend?.destroy();
    this.mapzHelp?.destroy();
    this.mapzLayer?.destroy();

    this.mapzBg = this.add
      .rectangle(GAME_W / 2, GAME_H / 2 + 8, GAME_W - 24, GAME_H - 56, 0x0a0c10, 0.98)
      .setStrokeStyle(4, COLORS.green)
      .setScrollFactor(0)
      .setDepth(d)
      .setVisible(false);

    this.mapzTitle = this.add
      .text(GAME_W / 2, HUD_H + 18, 'MAPZ', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '14px',
        color: '#7dffb3',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(d + 1)
      .setVisible(false);

    this.mapzSubtitle = this.add
      .text(GAME_W / 2, HUD_H + 42, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '9px',
        color: '#ffc857',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(d + 1)
      .setVisible(false);

    this.mapzLayer = this.add.container(0, 0).setDepth(d + 2).setScrollFactor(0);
    this.mapzLayer.setVisible(false);

    this.mapzLegend = this.add
      .text(40, GAME_H - 88, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#c5cde0',
        lineSpacing: 6,
      })
      .setScrollFactor(0)
      .setDepth(d + 1)
      .setVisible(false);

    this.mapzHelp = this.add
      .text(
        GAME_W / 2,
        GAME_H - 28,
        'M / TAB / ESC CLOSE   ·   [ ] FLOOR   ·   , . LAND',
        {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '8px',
          color: '#7dffb3',
          wordWrap: { width: GAME_W - 48 },
          align: 'center',
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(d + 1)
      .setVisible(false);
  }

  /** Ensure mapz chrome exists (soft UI reuse can leave null panels). */
  private ensureMapzChrome(): void {
    if (!this.mapzBg?.active || !this.mapzLayer?.active) {
      this.buildMapzPanel();
    }
  }

  private clearMapzPieces(): void {
    for (const p of this.mapzPieces) {
      p.destroy();
    }
    this.mapzPieces = [];
    this.mapzLayer?.removeAll(true);
  }

  private buildForjingPanel(): void {
    const d = 200;
    this.clearForjingPieces();
    this.forjingBg?.destroy();
    this.forjingTitle?.destroy();
    this.forjingCoins?.destroy();
    this.forjingActionLabel?.destroy();
    this.forjingMatLabel?.destroy();
    this.forjingDetail?.destroy();
    this.forjingHelp?.destroy();
    this.forjingLayer?.destroy();

    this.forjingBg = this.add
      .rectangle(GAME_W / 2, GAME_H / 2 + 8, GAME_W - 24, GAME_H - 56, 0x0a0c10, 0.98)
      .setStrokeStyle(4, COLORS.gold)
      .setScrollFactor(0)
      .setDepth(d)
      .setVisible(false);

    this.forjingTitle = this.add
      .text(GAME_W / 2, HUD_H + 12, 'FORJE', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '12px',
        color: '#ffc857',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(d + 1)
      .setVisible(false);

    this.forjingCoins = this.add
      .text(GAME_W / 2, HUD_H + 32, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '9px',
        color: '#7dffb3',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(d + 1)
      .setVisible(false);

    this.forjingActionLabel = this.add
      .text(GAME_W * 0.28, HUD_H + 52, 'FORJE MENU', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#ffc857',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(d + 1)
      .setVisible(false);

    this.forjingMatLabel = this.add
      .text(GAME_W * 0.72, HUD_H + 52, 'YOUR MATERIALZ', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#7dffb3',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(d + 1)
      .setVisible(false);

    this.forjingLayer = this.add.container(0, 0).setDepth(d + 2).setScrollFactor(0);
    this.forjingLayer.setVisible(false);

    this.forjingDetail = this.add
      .text(40, GAME_H - 100, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#f4f0ff',
        lineSpacing: 6,
        wordWrap: { width: GAME_W - 80 },
      })
      .setScrollFactor(0)
      .setDepth(d + 1)
      .setVisible(false);

    this.forjingHelp = this.add
      .text(
        GAME_W / 2,
        GAME_H - 26,
        'ARROWS SELECT  ·  ENTER / 1-9 FORJE  ·  F / ESC CLOSE',
        {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '8px',
          color: '#ffc857',
          wordWrap: { width: GAME_W - 48 },
          align: 'center',
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(d + 1)
      .setVisible(false);
  }

  private ensureForjingChrome(): void {
    if (!this.forjingBg?.active || !this.forjingLayer?.active) {
      this.buildForjingPanel();
    }
  }

  private clearForjingPieces(): void {
    for (const p of this.forjingPieces) p.destroy();
    this.forjingPieces = [];
    this.forjingLayer?.removeAll(true);
  }

  private buildShopPanel(): void {
    const d = 210;
    this.clearShopPieces();
    this.shopBg?.destroy();
    this.shopTitle?.destroy();
    this.shopCoins?.destroy();
    this.shopStockLabel?.destroy();
    this.shopBagLabel?.destroy();
    this.shopDetail?.destroy();
    this.shopHelp?.destroy();
    this.shopLayer?.destroy();

    this.shopBg = this.add
      .rectangle(GAME_W / 2, GAME_H / 2 + 8, GAME_W - 24, GAME_H - 56, 0x0a0c10, 0.98)
      .setStrokeStyle(4, COLORS.gold)
      .setScrollFactor(0)
      .setDepth(d)
      .setVisible(false);

    this.shopTitle = this.add
      .text(GAME_W / 2, HUD_H + 12, 'TINKERER SHOP', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '12px',
        color: '#ffc857',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(d + 1)
      .setVisible(false);

    this.shopCoins = this.add
      .text(GAME_W / 2, HUD_H + 32, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '9px',
        color: '#7dffb3',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(d + 1)
      .setVisible(false);

    this.shopStockLabel = this.add
      .text(GAME_W * 0.28, HUD_H + 52, 'SHOP STOCK', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#ffc857',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(d + 1)
      .setVisible(false);

    this.shopBagLabel = this.add
      .text(GAME_W * 0.72, HUD_H + 52, 'YOUR BAG', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#7dffb3',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(d + 1)
      .setVisible(false);

    this.shopLayer = this.add.container(0, 0).setDepth(d + 2).setScrollFactor(0);
    this.shopLayer.setVisible(false);

    this.shopDetail = this.add
      .text(40, GAME_H - 100, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#f4f0ff',
        lineSpacing: 6,
        wordWrap: { width: GAME_W - 80 },
      })
      .setScrollFactor(0)
      .setDepth(d + 1)
      .setVisible(false);

    this.shopHelp = this.add
      .text(
        GAME_W / 2,
        GAME_H - 26,
        'ARROWS  ·  TAB PANE  ·  [ ] PAGE  ·  ENTER/B TRADE  ·  ESC/E CLOSE',
        {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '8px',
          color: '#ffc857',
          wordWrap: { width: GAME_W - 48 },
          align: 'center',
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(d + 1)
      .setVisible(false);
  }

  private ensureShopChrome(): void {
    if (!this.shopBg?.active || !this.shopLayer?.active) {
      this.buildShopPanel();
    }
  }

  private clearShopPieces(): void {
    for (const p of this.shopPieces) p.destroy();
    this.shopPieces = [];
    this.shopLayer?.removeAll(true);
  }

  private buildRackPickerPanel(): void {
    const d = 215;
    this.clearRackPieces();
    this.rackBg?.destroy();
    this.rackTitle?.destroy();
    this.rackSubtitle?.destroy();
    this.rackDetail?.destroy();
    this.rackHelp?.destroy();
    this.rackLayer?.destroy();

    this.rackBg = this.add
      .rectangle(GAME_W / 2, GAME_H / 2 + 8, GAME_W - 24, GAME_H - 56, 0x0a0c10, 0.97)
      .setStrokeStyle(3, COLORS.gold)
      .setScrollFactor(0)
      .setDepth(d)
      .setVisible(false);

    this.rackTitle = this.add
      .text(GAME_W / 2, HUD_H + 16, 'WEAPON RACK', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '14px',
        color: '#7dffb3',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(d + 1)
      .setVisible(false);

    this.rackSubtitle = this.add
      .text(GAME_W / 2, HUD_H + 40, 'SELECT A WEAPON TO EQUIP', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '9px',
        color: '#ffc857',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(d + 1)
      .setVisible(false);

    this.rackLayer = this.add
      .container(0, 0)
      .setDepth(d + 2)
      .setScrollFactor(0)
      .setVisible(false);

    this.rackDetail = this.add
      .text(48, GAME_H - 140, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '10px',
        color: '#f4f0ff',
        lineSpacing: 8,
        wordWrap: { width: GAME_W - 96 },
      })
      .setScrollFactor(0)
      .setDepth(d + 1)
      .setVisible(false);

    this.rackHelp = this.add
      .text(
        GAME_W / 2,
        GAME_H - 28,
        'ARROWS SELECT  ·  ENTER / CLICK EQUIP  ·  1-9  ·  ESC CLOSE',
        {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '8px',
          color: '#7dffb3',
          wordWrap: { width: GAME_W - 48 },
          align: 'center',
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(d + 1)
      .setVisible(false);
  }

  private ensureRackChrome(): void {
    if (!this.rackBg?.active || !this.rackLayer?.active) {
      this.buildRackPickerPanel();
    }
  }

  private clearRackPieces(): void {
    for (const p of this.rackPieces) p.destroy();
    this.rackPieces = [];
    this.rackLayer?.removeAll(true);
  }

  private buildRackReturnPrompt(): void {
    const d = 220;
    this.rackRetBg?.destroy();
    this.rackRetTitle?.destroy();
    this.rackRetBody?.destroy();
    this.rackRetYesHit?.destroy();
    this.rackRetNoHit?.destroy();
    this.rackRetYesLabel?.destroy();
    this.rackRetNoLabel?.destroy();

    this.rackRetBg = this.add
      .rectangle(GAME_W / 2, GAME_H / 2, Math.min(560, GAME_W - 48), 220, 0x0a0c10, 0.97)
      .setStrokeStyle(3, COLORS.gold)
      .setScrollFactor(0)
      .setDepth(d)
      .setVisible(false);

    this.rackRetTitle = this.add
      .text(GAME_W / 2, GAME_H / 2 - 72, 'RETURN WEAPON?', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '12px',
        color: '#7dffb3',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(d + 1)
      .setVisible(false);

    this.rackRetBody = this.add
      .text(GAME_W / 2, GAME_H / 2 - 28, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '10px',
        color: '#f4f0ff',
        align: 'center',
        wordWrap: { width: Math.min(500, GAME_W - 80) },
        lineSpacing: 8,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(d + 1)
      .setVisible(false);

    const btnY = GAME_H / 2 + 70;
    const btnW = 160;
    this.rackRetYesHit = this.add
      .rectangle(GAME_W / 2 - btnW / 2 - 12, btnY, btnW, 44, 0x1a4030, 0.98)
      .setStrokeStyle(2, COLORS.green)
      .setScrollFactor(0)
      .setDepth(d + 1)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });
    this.rackRetYesLabel = this.add
      .text(GAME_W / 2 - btnW / 2 - 12, btnY, 'YES [1]', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '11px',
        color: '#7dffb3',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(d + 2)
      .setVisible(false);

    this.rackRetNoHit = this.add
      .rectangle(GAME_W / 2 + btnW / 2 + 12, btnY, btnW, 44, 0x3a2030, 0.98)
      .setStrokeStyle(2, 0xff6b9d)
      .setScrollFactor(0)
      .setDepth(d + 1)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });
    this.rackRetNoLabel = this.add
      .text(GAME_W / 2 + btnW / 2 + 12, btnY, 'NO [2]', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '11px',
        color: '#ffb0c8',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(d + 2)
      .setVisible(false);

    this.rackRetYesHit.on('pointerdown', () => {
      this.game.events.emit('rack-return-answer', true);
    });
    this.rackRetNoHit.on('pointerdown', () => {
      this.game.events.emit('rack-return-answer', false);
    });
  }

  private ensureRackReturnChrome(): void {
    if (!this.rackRetBg?.active) this.buildRackReturnPrompt();
  }

  private onRackReturnPrompt = (payload?: {
    family?: string;
    name?: string;
    lines?: string[];
  } | null): void => {
    this.ensureRackReturnChrome();
    if (!payload?.name && !payload?.lines?.length) {
      this.closeRackReturnPrompt();
      return;
    }
    if (this.rackOpen) this.closeRackPickerPanel();
    if (this.dialogOpen) {
      this.resetDialogVisuals();
      this.game.events.emit('dialog-state', false);
    }
    const fam = (payload.family ?? 'weapon').toUpperCase();
    const name = payload.name ?? 'WEAPON';
    this.rackRetTitle?.setText(`RETURN ${fam}?`);
    this.rackRetBody?.setText(
      (payload.lines && payload.lines.length
        ? payload.lines.slice(1).join('\n')
        : `WOULD YOU LIKE TO RETURN YOUR ${name}?\nIT GOES BACK ON THE RACK.`
      ).trim(),
    );
    this.rackRetOpen = true;
    this.rackRetBg?.setVisible(true);
    this.rackRetTitle?.setVisible(true);
    this.rackRetBody?.setVisible(true);
    this.rackRetYesHit?.setVisible(true);
    this.rackRetNoHit?.setVisible(true);
    this.rackRetYesLabel?.setVisible(true);
    this.rackRetNoLabel?.setVisible(true);
    this.game.events.emit('rack-return-state', true);
  };

  private onRackReturnPromptClose = (): void => {
    this.closeRackReturnPrompt();
  };

  private closeRackReturnPrompt(): void {
    this.rackRetOpen = false;
    this.rackRetBg?.setVisible(false);
    this.rackRetTitle?.setVisible(false);
    this.rackRetBody?.setVisible(false);
    this.rackRetYesHit?.setVisible(false);
    this.rackRetNoHit?.setVisible(false);
    this.rackRetYesLabel?.setVisible(false);
    this.rackRetNoLabel?.setVisible(false);
    this.game.events.emit('rack-return-state', false);
  }

  private buildInventoryPanel(): void {
    const d = 120;
    this.clearInvBagPieces();
    this.invBagLayer?.destroy();

    this.invBg = this.add
      .rectangle(GAME_W / 2, GAME_H / 2 + 8, GAME_W - 24, GAME_H - 56, 0x0a0c10, 0.96)
      .setStrokeStyle(3, COLORS.gold)
      .setScrollFactor(0)
      .setDepth(d);

    this.invTitle = this.add
      .text(GAME_W / 2, HUD_H + 12, 'INVENTORY / CHARACTER', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '12px',
        color: '#7dffb3',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(d + 1);

    // Zone plates: Character (top) + Bag|Inspect siblings (bottom, 14px gutter)
    // Pollen: gold bag primary; inspect same fill, quieter stroke; green character.
    const charCy = 188;
    this.invCharPlate = this.add
      .rectangle(GAME_W / 2, charCy, GAME_W - 48, 196, 0x12161f, 1)
      .setStrokeStyle(2, COLORS.green)
      .setScrollFactor(0)
      .setDepth(d + 1);

    // Stats inset well — hug vitals text (Comb/Pollen: kill empty void plate)
    this.invStatsPlate = this.add
      .rectangle(
        UIScene.INV_STATS_PLATE_CX,
        UIScene.INV_STATS_PLATE_CY,
        UIScene.INV_STATS_PLATE_W,
        UIScene.INV_STATS_PLATE_H,
        0x0c0e14,
        1,
      )
      .setStrokeStyle(1, 0x3a3150)
      .setScrollFactor(0)
      .setDepth(d + 1);

    const bagCell = UIScene.BAG_CELL;
    const bagGap = UIScene.BAG_GAP;
    const gridW =
      UIScene.BAG_COLS * bagCell + (UIScene.BAG_COLS - 1) * bagGap;
    const gridH =
      UIScene.BAG_ROWS * bagCell + (UIScene.BAG_ROWS - 1) * bagGap;
    const bagPlateW = gridW + 40; // 668
    const bagPlateH = gridH + 96; // 324
    const bagPlateCx = UIScene.INV_BAG_LEFT + bagPlateW / 2 - 8; // 374
    const bagPlateCy = UIScene.INV_BAG_ORIGIN_Y + gridH / 2 + 8; // 470
    this.invBagPlate = this.add
      .rectangle(bagPlateCx, bagPlateCy, bagPlateW, bagPlateH, 0x161a24, 1)
      .setStrokeStyle(2, COLORS.gold)
      .setScrollFactor(0)
      .setDepth(d + 1);

    // Inspect: bag-height sibling (not a short purple void)
    const detailCx =
      UIScene.INV_DETAIL_PLATE_L + UIScene.INV_DETAIL_PLATE_W / 2; // 981
    const detailCy = bagPlateCy; // 470 — flush top/bottom with bag
    this.invDetailPlate = this.add
      .rectangle(
        detailCx,
        detailCy,
        UIScene.INV_DETAIL_PLATE_W,
        UIScene.INV_DETAIL_PLATE_H,
        0x161a24,
        1,
      )
      .setStrokeStyle(1, 0x8a7340)
      .setScrollFactor(0)
      .setDepth(d + 1);

    this.invDetailHeader = this.add
      .text(UIScene.INV_DETAIL_X, UIScene.INV_DETAIL_HEADER_Y, 'INSPECT', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '10px',
        color: '#ffc857',
      })
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(d + 2);

    this.invDetailIconWell = this.add
      .rectangle(UIScene.INV_DETAIL_X + 28, 392, 56, 56, 0x0c0e14, 1)
      .setStrokeStyle(1, 0x3a3150)
      .setScrollFactor(0)
      .setDepth(d + 2);

    this.invDetailIcon = this.add
      .image(UIScene.INV_DETAIL_X + 28, 392, 'icon_empty')
      .setScale(UIScene.BAG_ICON_SCALE * 0.85)
      .setScrollFactor(0)
      .setDepth(d + 3);

    // Paper-doll (left of character strip)
    const dollX = UIScene.INV_DOLL_X;
    const dollY = UIScene.INV_DOLL_Y;
    this.invAvatarPlate = this.add
      .rectangle(dollX, dollY, 130, 150, 0x0c0e14, 1)
      .setStrokeStyle(2, COLORS.green)
      .setScrollFactor(0)
      .setDepth(d + 2);

    this.invAvatar = this.add
      .image(dollX, dollY - 8, 'player')
      .setScale(SPRITE_SCALE * 3.6)
      .setScrollFactor(0)
      .setDepth(d + 3);

    this.invYouLabel = this.add
      .text(dollX, dollY + 72, 'YOU', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#a8b0c4',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(d + 3);

    // Equip slots — compact 2 cols (icon + short name) so stats own right half
    const slots: EquipSlot[] = [...ALL_EQUIP_SLOTS];
    const startX = UIScene.INV_EQUIP_X0;
    const startY = UIScene.INV_EQUIP_Y0;
    const colW = UIScene.INV_EQUIP_COL_W;
    const rowH = UIScene.INV_EQUIP_ROW_H;
    slots.forEach((slot, i) => {
      const col = i < 5 ? 0 : 1;
      const row = i % 5;
      const x = startX + col * colW;
      const y = startY + row * rowH;
      this.invSlotFrames[slot] = this.add
        .image(x, y, 'slot_frame')
        .setScale(1.15)
        .setScrollFactor(0)
        .setDepth(d + 2);
      this.invSlotIcons[slot] = this.add
        .image(x, y, 'icon_empty')
        .setScale(1.5)
        .setScrollFactor(0)
        .setDepth(d + 3);
      this.invSlotLabels[slot] = this.add
        .text(
          x + 26,
          y - 10,
          `${SLOT_SHORT[slot]} [${SLOT_KEYS[slot]}]\n(empty)`,
          {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '8px',
            color: '#c5cde0',
            // Exactly 2 lines via \n only — NO wordWrap (prevents row overflow)
            lineSpacing: 2,
          },
        )
        .setScrollFactor(0)
        .setDepth(d + 3);
    });

    // Stats / attrs — inside content-hugging well (wrap clamped to plate width)
    const railX = UIScene.INV_STATS_X;
    const statsWrap = UIScene.INV_STATS_PLATE_W - 24;
    this.invStats = this.add
      .text(railX, startY + 4, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#ffc857',
        lineSpacing: 6,
        wordWrap: { width: statsWrap },
      })
      .setScrollFactor(0)
      .setDepth(d + 2);

    this.invAttrs = this.add
      .text(railX, startY + 78, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#7dffb3',
        lineSpacing: 6,
        wordWrap: { width: statsWrap },
      })
      .setScrollFactor(0)
      .setDepth(d + 2);

    this.invStatLayer = this.add
      .container(0, 0)
      .setScrollFactor(0)
      .setDepth(d + 4);

    // BAG chrome — left-aligned with grid (not centered)
    this.invBagTitle = this.add
      .text(UIScene.INV_BAG_LEFT, UIScene.INV_BAG_TITLE_Y, 'BAG', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '10px',
        color: '#ffc857',
      })
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(d + 2);

    this.invBagLayer = this.add
      .container(0, 0)
      .setScrollFactor(0)
      .setDepth(d + 3);

    // Inspect body — right of icon well; structured in renderBagGrid
    this.invBagDetail = this.add
      .text(UIScene.INV_DETAIL_X + 64, UIScene.INV_DETAIL_BODY_Y, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '9px',
        color: '#c5cde0',
        wordWrap: { width: UIScene.INV_DETAIL_W - 64 },
        lineSpacing: 6,
      })
      .setScrollFactor(0)
      .setDepth(d + 2);

    this.invHelp = this.add
      .text(
        GAME_W / 2,
        UIScene.INV_HELP_Y,
        'Y YOU/BUD  ·  CLICK BAG = EQUIP/USE  ·  T SORT  ·  [ ] PAGE  ·  I CLOSE',
        {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '8px',
          color: '#7dffb3',
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(d + 2);

    this.setInventoryVisible(false);
  }

  private clearInvBagPieces(): void {
    for (const p of this.invBagPieces) p.destroy();
    this.invBagPieces = [];
    this.invBagLayer?.removeAll(true);
  }

  private setInvPieceVisible(
    obj: { setVisible: (v: boolean) => unknown } | null | undefined,
    open: boolean,
  ): void {
    obj?.setVisible(open);
  }

  private onBagPage = (dir: number): void => {
    if (!this.inventoryOpen || !this.lastSave) return;
    this.shiftBagPage(dir);
  };

  private onBagSort = (): void => {
    if (!this.inventoryOpen || !this.lastSave) return;
    this.cycleBagSort();
  };

  /** Pad OK / USE while bag open — equip or use the highlighted cell. */
  private onBagActivateSelected = (): void => {
    if (!this.inventoryOpen || !this.lastSave) return;
    const bag = this.bagList(this.lastSave);
    const item = bag[this.invBagSelected];
    if (!item) return;
    playSfx('ui_click');
    this.game.events.emit('inventory-bag-activate', {
      uid: item.uid,
      templateId: item.templateId,
      usable: item.usable,
      slot: item.slot,
    });
  };

  private bagList(save: SaveData) {
    return listInventory(save, this.invBagSort);
  }

  private cycleBagSort(): void {
    if (!this.lastSave) return;
    this.invBagSort = nextInventorySortMode(this.invBagSort);
    this.invBagPage = 0;
    this.invBagSelected = 0;
    playSfx('ui_click');
    this.renderBagGrid(this.lastSave);
    this.game.events.emit(
      'toast',
      `BAG SORT: ${inventorySortLabel(this.invBagSort)}`,
    );
  }

  private shiftBagPage(dir: number): void {
    if (!this.lastSave) return;
    const bag = this.bagList(this.lastSave);
    const pages = Math.max(1, Math.ceil(bag.length / UIScene.BAG_PAGE_SIZE));
    const next = Phaser.Math.Clamp(this.invBagPage + dir, 0, pages - 1);
    if (next === this.invBagPage) return;
    this.invBagPage = next;
    // Keep selection on this page
    const start = this.invBagPage * UIScene.BAG_PAGE_SIZE;
    const end = Math.min(bag.length, start + UIScene.BAG_PAGE_SIZE);
    if (this.invBagSelected < start || this.invBagSelected >= end) {
      this.invBagSelected = start;
    }
    playSfx('ui_click');
    this.renderBagGrid(this.lastSave);
  }

  private setInventoryVisible(open: boolean): void {
    this.inventoryOpen = open;
    if (open) {
      // Fresh open: if selection off-page, jump to its page
      if (this.lastSave) {
        const bag = this.bagList(this.lastSave);
        if (this.invBagSelected >= bag.length) this.invBagSelected = 0;
        this.invBagPage = Math.floor(
          this.invBagSelected / UIScene.BAG_PAGE_SIZE,
        );
      } else {
        this.invBagPage = 0;
      }
    }
    this.setInvPieceVisible(this.invBg, open);
    this.setInvPieceVisible(this.invTitle, open);
    this.setInvPieceVisible(this.invCharPlate, open);
    this.setInvPieceVisible(this.invStatsPlate, open);
    this.setInvPieceVisible(this.invBagPlate, open);
    this.setInvPieceVisible(this.invDetailPlate, open);
    this.setInvPieceVisible(this.invDetailHeader, open);
    this.setInvPieceVisible(this.invDetailIconWell, open);
    this.setInvPieceVisible(this.invDetailIcon, open);
    this.setInvPieceVisible(this.invAvatarPlate, open);
    this.setInvPieceVisible(this.invAvatar, open);
    this.setInvPieceVisible(this.invYouLabel, open);
    this.setInvPieceVisible(this.invStats, open);
    this.setInvPieceVisible(this.invAttrs, open);
    this.setInvPieceVisible(this.invBagTitle, open);
    this.setInvPieceVisible(this.invBagDetail, open);
    this.setInvPieceVisible(this.invHelp, open);
    this.invBagLayer?.setVisible(open);
    this.invStatLayer?.setVisible(open);
    if (!open) {
      this.clearInvBagPieces();
      this.clearStatButtons();
    }
    for (const slot of ALL_EQUIP_SLOTS) {
      this.setInvPieceVisible(this.invSlotFrames[slot], open);
      this.setInvPieceVisible(this.invSlotIcons[slot], open);
      this.setInvPieceVisible(this.invSlotLabels[slot], open);
    }
    if (open && this.lastSave) this.renderInventory(this.lastSave);
    this.game.events.emit('inventory-state', open);
  }

  private bindGameEvents(): void {
    this.game.events.off('hud-update', this.refreshHud, this);
    this.game.events.off('dialog-show', this.showDialog, this);
    this.game.events.off('dialog-advance', this.advanceDialog, this);
    this.game.events.off('dialog-close', this.closeDialog, this);
    this.game.events.off('inventory-nav', this.onInventoryNav, this);
    this.game.events.off('toast', this.showToast, this);
    this.game.events.off('pause-ui', this.setPaused, this);
    this.game.events.off('ui-reset', this.onUiReset, this);
    this.game.events.off('inventory-toggle', this.onInventoryToggle, this);
    this.game.events.off('inventory-refresh', this.onInventoryRefresh, this);
    this.game.events.off('inventory-bag-page', this.onBagPage, this);
    this.game.events.off('inventory-bag-sort', this.onBagSort, this);
    this.game.events.off(
      'inventory-bag-activate-selected',
      this.onBagActivateSelected,
      this,
    );
    this.game.events.off('gear-target', this.onGearTarget, this);
    this.game.events.off('mapz-toggle', this.onMapzToggle, this);
    this.game.events.off('mapz-nav', this.onMapzNav, this);
    this.game.events.off('forjing-toggle', this.onForjingToggle, this);
    this.game.events.off('forjing-select', this.onForjingSelect, this);
    this.game.events.off('forjing-refresh', this.onForjingRefresh, this);
    this.game.events.off('shop-toggle', this.onShopToggle, this);
    this.game.events.off('shop-select', this.onShopSelect, this);
    this.game.events.off('shop-refresh', this.onShopRefresh, this);
    this.game.events.off('shop-page', this.onShopPage, this);
    this.game.events.off('rack-picker-toggle', this.onRackPickerToggle, this);
    this.game.events.off('rack-picker-select', this.onRackPickerSelect, this);
    this.game.events.off('rack-return-prompt', this.onRackReturnPrompt, this);
    this.game.events.off(
      'rack-return-prompt-close',
      this.onRackReturnPromptClose,
      this,
    );

    this.game.events.on('hud-update', this.refreshHud, this);
    this.game.events.on('dialog-show', this.showDialog, this);
    this.game.events.on('dialog-advance', this.advanceDialog, this);
    this.game.events.on('dialog-close', this.closeDialog, this);
    this.game.events.on('inventory-nav', this.onInventoryNav, this);
    this.game.events.on('toast', this.showToast, this);
    this.game.events.on('pause-ui', this.setPaused, this);
    this.game.events.on('ui-reset', this.onUiReset, this);
    this.game.events.on('inventory-toggle', this.onInventoryToggle, this);
    this.game.events.on('inventory-refresh', this.onInventoryRefresh, this);
    this.game.events.on('inventory-bag-page', this.onBagPage, this);
    this.game.events.on('inventory-bag-sort', this.onBagSort, this);
    this.game.events.on(
      'inventory-bag-activate-selected',
      this.onBagActivateSelected,
      this,
    );
    this.game.events.on('gear-target', this.onGearTarget, this);
    this.game.events.on('mapz-toggle', this.onMapzToggle, this);
    this.game.events.on('mapz-nav', this.onMapzNav, this);
    this.game.events.on('forjing-toggle', this.onForjingToggle, this);
    this.game.events.on('forjing-select', this.onForjingSelect, this);
    this.game.events.on('forjing-refresh', this.onForjingRefresh, this);
    this.game.events.on('shop-toggle', this.onShopToggle, this);
    this.game.events.on('shop-select', this.onShopSelect, this);
    this.game.events.on('shop-refresh', this.onShopRefresh, this);
    this.game.events.on('shop-page', this.onShopPage, this);
    this.game.events.on('rack-picker-toggle', this.onRackPickerToggle, this);
    this.game.events.on('rack-picker-select', this.onRackPickerSelect, this);
    this.game.events.on('rack-return-prompt', this.onRackReturnPrompt, this);
    this.game.events.on(
      'rack-return-prompt-close',
      this.onRackReturnPromptClose,
      this,
    );

    if (!this.bound) {
      this.bound = true;
      this.input.keyboard?.on('keydown-ENTER', this.onEnterKey, this);
      this.input.keyboard?.on('keydown-SPACE', this.onSpaceKey, this);
    }

    this.events.once('shutdown', () => {
      this.game.events.off('hud-update', this.refreshHud, this);
      this.game.events.off('dialog-show', this.showDialog, this);
      this.game.events.off('dialog-advance', this.advanceDialog, this);
      this.game.events.off('dialog-close', this.closeDialog, this);
      this.game.events.off('inventory-nav', this.onInventoryNav, this);
      this.game.events.off('toast', this.showToast, this);
      this.game.events.off('pause-ui', this.setPaused, this);
      this.game.events.off('ui-reset', this.onUiReset, this);
      this.game.events.off('inventory-toggle', this.onInventoryToggle, this);
      this.game.events.off('inventory-refresh', this.onInventoryRefresh, this);
      this.game.events.off('inventory-bag-page', this.onBagPage, this);
      this.game.events.off('inventory-bag-sort', this.onBagSort, this);
      this.game.events.off(
        'inventory-bag-activate-selected',
        this.onBagActivateSelected,
        this,
      );
      this.game.events.off('gear-target', this.onGearTarget, this);
      this.game.events.off('mapz-toggle', this.onMapzToggle, this);
      this.game.events.off('mapz-nav', this.onMapzNav, this);
      this.game.events.off('forjing-toggle', this.onForjingToggle, this);
      this.game.events.off('forjing-select', this.onForjingSelect, this);
      this.game.events.off('forjing-refresh', this.onForjingRefresh, this);
      this.game.events.off('shop-toggle', this.onShopToggle, this);
      this.game.events.off('shop-select', this.onShopSelect, this);
      this.game.events.off('shop-refresh', this.onShopRefresh, this);
      this.game.events.off('shop-page', this.onShopPage, this);
      this.game.events.off('rack-picker-toggle', this.onRackPickerToggle, this);
      this.game.events.off('rack-picker-select', this.onRackPickerSelect, this);
      this.game.events.off('rack-return-prompt', this.onRackReturnPrompt, this);
      this.game.events.off(
        'rack-return-prompt-close',
        this.onRackReturnPromptClose,
        this,
      );
      this.input.keyboard?.off('keydown-ENTER', this.onEnterKey, this);
      this.input.keyboard?.off('keydown-SPACE', this.onSpaceKey, this);
      this.bound = false;
      this.chromeBuilt = false;
    });
  }

  private onUiReset = (): void => {
    this.resetDialogVisuals();
    this.setInventoryVisible(false);
    this.closeMapzPanel();
    this.closeForjingPanel();
    this.closeShopPanel();
    this.closeRackPickerPanel();
    this.closeRackReturnPrompt();
    this.pauseText?.setVisible(false);
    this.pauseResumeHit?.setVisible(false);
    this.pauseTitleHit?.setVisible(false);
    this.pauseResumeLabel?.setVisible(false);
    this.pauseTitleLabel?.setVisible(false);
    this.toastText?.setAlpha(0);
    this.game.events.emit('dialog-state', false);
    this.game.events.emit('inventory-state', false);
    this.game.events.emit('mapz-state', false);
    this.game.events.emit('forjing-state', false);
    this.game.events.emit('shop-state', false);
    this.game.events.emit('rack-picker-state', false);
  };

  private resetDialogVisuals(): void {
    this.dialogOpen = false;
    this.dialogLines = [];
    this.dialogIndex = 0;
    this.setDialogChromeVisible(false);
  }

  private onInventoryToggle = (save: SaveData): void => {
    if (
      this.dialogOpen ||
      this.mapzOpen ||
      this.forjingOpen ||
      this.shopOpen ||
      this.rackOpen
    ) {
      return;
    }
    this.lastSave = save;
    this.setInventoryVisible(!this.inventoryOpen);
  };

  private onInventoryRefresh = (save: SaveData): void => {
    this.lastSave = save;
    if (this.inventoryOpen) this.renderInventory(save);
  };

  private onMapzToggle = (payload?: MapzOpenPayload | string | null): void => {
    this.ensureMapzChrome();
    // Closing always allowed
    if (this.mapzOpen) {
      this.closeMapzPanel();
      return;
    }
    // Opening blocked only by inventory / forjing / shop
    if (this.inventoryOpen || this.forjingOpen || this.shopOpen) return;
    if (this.dialogOpen) {
      this.resetDialogVisuals();
      this.game.events.emit('dialog-state', false);
    }

    // Prefer current room's land (not always surface — broke Kingdomz map UX)
    if (!payload || typeof payload === 'string') {
      if (this.lastSave) {
        const land = landForRoom(ROOMS, this.lastSave.roomId);
        this.mapzPayload = {
          save: this.lastSave,
          land:
            this.lastSave.discoveredMapz?.includes(land) && land
              ? land
              : (this.lastSave.discoveredMapz?.[0] ?? 'surface'),
        };
      } else {
        return;
      }
    } else {
      this.mapzPayload = payload;
      this.lastSave = payload.save;
    }
    this.mapzFloor = this.mapzPayload.floor;
    this.openMapzGraphic();
  };

  private onMapzNav = (dir: 'floor-prev' | 'floor-next' | 'land-prev' | 'land-next'): void => {
    if (!this.mapzOpen || !this.mapzPayload) return;
    const view = buildMapzView(
      ROOMS,
      this.mapzPayload.save,
      this.mapzPayload.land,
      this.mapzFloor,
    );
    if (dir === 'floor-prev' || dir === 'floor-next') {
      if (view.floors.length < 2) return;
      const i = view.floors.indexOf(view.floor);
      const ni =
        dir === 'floor-next'
          ? (i + 1) % view.floors.length
          : (i - 1 + view.floors.length) % view.floors.length;
      this.mapzFloor = view.floors[ni];
      this.openMapzGraphic();
      return;
    }
    const lands = view.discoveredLands;
    if (lands.length < 2) return;
    const i = lands.indexOf(this.mapzPayload.land);
    const ni =
      dir === 'land-next'
        ? (i + 1) % lands.length
        : (i - 1 + lands.length) % lands.length;
    this.mapzPayload = {
      ...this.mapzPayload,
      land: lands[ni] as LandId,
    };
    this.mapzFloor = undefined;
    this.openMapzGraphic();
  };

  private openMapzGraphic(): void {
    if (!this.mapzPayload) return;
    this.ensureMapzChrome();
    const view = buildMapzView(
      ROOMS,
      this.mapzPayload.save,
      this.mapzPayload.land,
      this.mapzFloor,
    );
    this.mapzFloor = view.floor;
    this.renderGraphicMapz(view);
    this.mapzOpen = true;
    this.mapzBg?.setVisible(true).setDepth(200);
    this.mapzTitle?.setVisible(true).setDepth(201);
    this.mapzSubtitle?.setVisible(true).setDepth(201);
    this.mapzLegend?.setVisible(true).setDepth(201);
    this.mapzHelp?.setVisible(true).setDepth(201);
    this.mapzLayer?.setVisible(true).setDepth(202);
    this.game.events.emit('mapz-state', true);
  }

  private closeMapzPanel(): void {
    this.mapzOpen = false;
    this.clearMapzPieces();
    this.mapzBg?.setVisible(false);
    this.mapzTitle?.setVisible(false);
    this.mapzSubtitle?.setVisible(false);
    this.mapzLegend?.setVisible(false);
    this.mapzHelp?.setVisible(false);
    this.mapzLayer?.setVisible(false);
    this.game.events.emit('mapz-state', false);
  }

  private renderGraphicMapz(view: MapzViewModel): void {
    this.clearMapzPieces();
    if (!this.mapzLayer) return;

    const info = view.landInfo;
    this.mapzTitle?.setText(info.name);
    this.mapzTitle?.setColor(
      `#${info.border.toString(16).padStart(6, '0')}`,
    );
    this.mapzBg?.setStrokeStyle(4, info.border);

    if (!view.unlocked) {
      this.mapzSubtitle?.setText('FIND A MAPZ SCROLL TO REVEAL THIS LAND');
      this.mapzLegend?.setText(
        `YOU HAVE: ${view.discoveredLands.join(', ').toUpperCase() || '(none)'}`,
      );
      const locked = this.add
        .text(GAME_W / 2, GAME_H / 2, '???', {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '28px',
          color: '#5a6a60',
        })
        .setOrigin(0.5)
        .setScrollFactor(0);
      this.mapzLayer.add(locked);
      this.mapzPieces.push(locked);
      return;
    }

    const floorBits = view.floors.map((f) =>
      f === view.floor ? `[${floorLabel(f)}]` : floorLabel(f),
    );
    this.mapzSubtitle?.setText(
      `${info.blurb}   ·   ${floorBits.join(' ')}`,
    );

    if (!view.cells.length) {
      this.mapzLegend?.setText('NO ROOMS ON THIS FLOOR');
      return;
    }

    const cols = view.maxX - view.minX + 1;
    const rows = view.maxY - view.minY + 1;
    const gridW = cols * MAPZ_CELL + (cols - 1) * MAPZ_GAP;
    const gridH = rows * MAPZ_CELL + (rows - 1) * MAPZ_GAP;
    const originX = GAME_W / 2 - gridW / 2 + MAPZ_CELL / 2;
    const originY = HUD_H + 90 + MAPZ_CELL / 2;

    const cellPos = (mapX: number, mapY: number) => {
      const col = mapX - view.minX;
      // Y high (north) at top of screen
      const row = view.maxY - mapY;
      return {
        x: originX + col * (MAPZ_CELL + MAPZ_GAP),
        y: originY + row * (MAPZ_CELL + MAPZ_GAP),
      };
    };

    // Corridor links first (under rooms) — textured bridges
    for (const c of view.cells) {
      if (!c.visited && !c.current) continue;
      const p = cellPos(c.mapX, c.mapY);
      if (c.east) {
        const link = this.add
          .image(
            p.x + MAPZ_CELL / 2 + MAPZ_GAP / 2,
            p.y,
            'mapz_link_h',
          )
          .setDisplaySize(MAPZ_GAP + 6, 10)
          .setTint(info.border)
          .setScrollFactor(0);
        this.mapzLayer.add(link);
        this.mapzPieces.push(link);
      }
      if (c.north) {
        const link = this.add
          .image(
            p.x,
            p.y - MAPZ_CELL / 2 - MAPZ_GAP / 2,
            'mapz_link_v',
          )
          .setDisplaySize(10, MAPZ_GAP + 6)
          .setTint(info.border)
          .setScrollFactor(0);
        this.mapzLayer.add(link);
        this.mapzPieces.push(link);
      }
    }

    for (const c of view.cells) {
      const p = cellPos(c.mapX, c.mapY);
      const landTint = c.current
        ? Phaser.Display.Color.IntegerToColor(info.color).brighten(25).color
        : c.visited
          ? info.color
          : info.fog;
      const border = c.current ? COLORS.gold : c.visited ? info.border : 0x3a4250;

      // Detailed base plate, land-tinted
      const room = this.add
        .image(p.x, p.y, 'mapz_cell_base')
        .setDisplaySize(MAPZ_CELL, MAPZ_CELL)
        .setTint(landTint)
        .setScrollFactor(0);
      this.mapzLayer.add(room);
      this.mapzPieces.push(room);

      // Rim stroke for visited/current clarity
      const rim = this.add
        .rectangle(p.x, p.y, MAPZ_CELL - 2, MAPZ_CELL - 2, 0x000000, 0)
        .setStrokeStyle(c.current ? 3 : 2, border, c.visited || c.current ? 0.95 : 0.45)
        .setScrollFactor(0);
      this.mapzLayer.add(rim);
      this.mapzPieces.push(rim);

      // Door notches on visited rooms (exit hints)
      if (c.visited || c.current) {
        const notch = 0x0a0c10;
        if (c.north) {
          const n = this.add
            .rectangle(p.x, p.y - MAPZ_CELL / 2 + 3, 10, 6, notch, 1)
            .setScrollFactor(0);
          this.mapzLayer.add(n);
          this.mapzPieces.push(n);
        }
        if (c.south) {
          const n = this.add
            .rectangle(p.x, p.y + MAPZ_CELL / 2 - 3, 10, 6, notch, 1)
            .setScrollFactor(0);
          this.mapzLayer.add(n);
          this.mapzPieces.push(n);
        }
        if (c.east) {
          const n = this.add
            .rectangle(p.x + MAPZ_CELL / 2 - 3, p.y, 6, 10, notch, 1)
            .setScrollFactor(0);
          this.mapzLayer.add(n);
          this.mapzPieces.push(n);
        }
        if (c.west) {
          const n = this.add
            .rectangle(p.x - MAPZ_CELL / 2 + 3, p.y, 6, 10, notch, 1)
            .setScrollFactor(0);
          this.mapzLayer.add(n);
          this.mapzPieces.push(n);
        }
      }

      if (!c.visited && !c.current) {
        const q = this.add
          .text(p.x, p.y, '?', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '18px',
            color: '#6a738a',
          })
          .setOrigin(0.5)
          .setScrollFactor(0);
        this.mapzLayer.add(q);
        this.mapzPieces.push(q);
      } else {
        const label = this.add
          .text(p.x, p.y + (c.current ? 12 : 2), c.shortTitle, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '7px',
            color: '#f4f0ff',
            align: 'center',
            wordWrap: { width: MAPZ_CELL - 10 },
          })
          .setOrigin(0.5)
          .setScrollFactor(0);
        this.mapzLayer.add(label);
        this.mapzPieces.push(label);

        if (c.stairsDown || c.stairsUp) {
          const stair = this.add
            .image(p.x + (c.current ? 14 : 0), p.y - 16, 'mapz_stairs')
            .setDisplaySize(14, 14)
            .setTint(c.stairsDown ? 0xff6b9d : 0x7dffb3)
            .setScrollFactor(0);
          this.mapzLayer.add(stair);
          this.mapzPieces.push(stair);
        }
      }

      if (c.current) {
        const you = this.add
          .text(p.x, p.y - 14, '★', {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#ffc857',
          })
          .setOrigin(0.5)
          .setScrollFactor(0);
        this.mapzLayer.add(you);
        this.mapzPieces.push(you);
        this.tweens.add({
          targets: you,
          alpha: 0.35,
          duration: 420,
          yoyo: true,
          repeat: -1,
        });
      }
    }

    // Center the grid if taller/wider - adjust origin when grid is small
    void gridH;

    const legendLines = [
      '★ YOU   solid = VISITED   ? = UNKNOWN',
      '▲▼ STAIRS   bars = DOORS',
    ];
    if (view.discoveredLands.length > 1) {
      legendLines.push(
        `LANDS: ${view.discoveredLands.map((l) => l.toUpperCase()).join(' · ')}`,
      );
    }
    this.mapzLegend?.setText(legendLines.join('\n'));
  }

  private onForjingToggle = (
    payload?: ForjingOpenPayload | string | null,
  ): void => {
    this.ensureForjingChrome();
    // Close: no payload, empty string, or already-open without save
    if (
      this.forjingOpen &&
      (payload == null ||
        payload === '' ||
        (typeof payload === 'object' && !payload.save))
    ) {
      this.closeForjingPanel();
      return;
    }
    if (this.dialogOpen || this.inventoryOpen || this.mapzOpen || this.shopOpen) {
      if (this.forjingOpen) this.closeForjingPanel();
      return;
    }
    // Legacy text toggle open without payload object
    if (typeof payload === 'string') {
      if (this.forjingOpen) {
        this.closeForjingPanel();
        return;
      }
      if (!this.lastSave) return;
      this.forjingPayload = { save: this.lastSave, selectedIndex: 0 };
      this.forjingSelected = 0;
      this.openForjingGraphic();
      return;
    }
    if (!payload?.save) return;
    if (this.forjingOpen) {
      this.forjingPayload = payload;
      this.lastSave = payload.save;
      if (payload.selectedIndex != null) {
        this.forjingSelected = payload.selectedIndex;
      }
      this.renderForjingGrid();
      return;
    }
    if (this.dialogOpen) {
      this.resetDialogVisuals();
      this.game.events.emit('dialog-state', false);
    }
    this.forjingPayload = payload;
    this.lastSave = payload.save;
    this.forjingSelected = payload.selectedIndex ?? 0;
    this.openForjingGraphic();
  };

  private onForjingSelect = (index: number): void => {
    if (!this.forjingOpen) return;
    const actions = listForjingActions();
    if (!actions.length) return;
    this.forjingSelected = Math.max(0, Math.min(index, actions.length - 1));
    this.renderForjingGrid();
  };

  private onForjingRefresh = (saveOrText: SaveData | string): void => {
    if (!this.forjingOpen) return;
    if (typeof saveOrText === 'string') {
      // Legacy refresh — re-render with last save if any
      if (this.forjingPayload) this.renderForjingGrid();
      return;
    }
    this.forjingPayload = {
      ...(this.forjingPayload ?? { save: saveOrText }),
      save: saveOrText,
    };
    this.lastSave = saveOrText;
    this.renderForjingGrid();
  };

  private onShopToggle = (payload?: ShopOpenPayload | null): void => {
    this.ensureShopChrome();
    // Close when open and no open-payload (Esc / E close)
    if (this.shopOpen && !payload?.shopId) {
      this.closeShopPanel();
      return;
    }
    if (this.shopOpen && payload?.shopId) {
      // Already open — refresh stock only
      this.shopPayload = payload;
      this.lastSave = payload.save;
      if (payload.pane) this.shopPane = payload.pane;
      if (payload.selectedIndex != null) this.shopSelected = payload.selectedIndex;
      if (payload.bagSelectedIndex != null) {
        this.shopBagSelected = payload.bagSelectedIndex;
      }
      this.syncShopPagesFromSelection();
      this.renderShopGrid();
      return;
    }
    if (this.inventoryOpen || this.mapzOpen || this.forjingOpen) return;
    if (!payload?.shopId) return;
    if (this.dialogOpen) {
      this.resetDialogVisuals();
      this.game.events.emit('dialog-state', false);
    }
    this.shopPayload = payload;
    this.lastSave = payload.save;
    this.shopSelected = payload.selectedIndex ?? 0;
    this.shopBagSelected = payload.bagSelectedIndex ?? 0;
    this.shopPane = payload.pane ?? 'stock';
    this.shopStockPage = 0;
    this.shopBagPage = 0;
    this.syncShopPagesFromSelection();
    this.openShopGraphic();
  };

  /** Keep visible pages aligned with focused indices. */
  private syncShopPagesFromSelection(): void {
    if (!this.shopPayload) return;
    const shop = getShop(this.shopPayload.shopId, this.shopPayload.save.level);
    const stockLen = shop?.stock.length ?? 0;
    const bagLen = listPlayerSellables(
      this.shopPayload.save,
      this.shopPayload.shopId,
    ).length;
    this.shopStockPage = clampShopPage(
      shopPageOf(this.shopSelected, SHOP_STOCK_PAGE_SIZE),
      stockLen,
      SHOP_STOCK_PAGE_SIZE,
    );
    this.shopBagPage = clampShopPage(
      shopPageOf(this.shopBagSelected, SHOP_BAG_PAGE_SIZE),
      bagLen,
      SHOP_BAG_PAGE_SIZE,
    );
  }

  private onShopPage = (dir: number): void => {
    if (!this.shopOpen || !this.shopPayload) return;
    const shop = getShop(this.shopPayload.shopId, this.shopPayload.save.level);
    if (!shop) return;
    if (this.shopPane === 'stock') {
      const count = shop.stock.length;
      const pages = shopPageCount(count, SHOP_STOCK_PAGE_SIZE);
      const next = Phaser.Math.Clamp(this.shopStockPage + dir, 0, pages - 1);
      if (next === this.shopStockPage) return;
      this.shopStockPage = next;
      const rel = this.shopSelected % SHOP_STOCK_PAGE_SIZE;
      this.shopSelected = Math.min(
        count - 1,
        this.shopStockPage * SHOP_STOCK_PAGE_SIZE + rel,
      );
      this.game.events.emit('shop-cursor', {
        pane: 'stock',
        index: this.shopSelected,
      });
    } else {
      const bag = listPlayerSellables(
        this.shopPayload.save,
        this.shopPayload.shopId,
      );
      const count = bag.length;
      if (!count) return;
      const pages = shopPageCount(count, SHOP_BAG_PAGE_SIZE);
      const next = Phaser.Math.Clamp(this.shopBagPage + dir, 0, pages - 1);
      if (next === this.shopBagPage) return;
      this.shopBagPage = next;
      const rel = this.shopBagSelected % SHOP_BAG_PAGE_SIZE;
      this.shopBagSelected = Math.min(
        count - 1,
        this.shopBagPage * SHOP_BAG_PAGE_SIZE + rel,
      );
      this.game.events.emit('shop-cursor', {
        pane: 'bag',
        index: this.shopBagSelected,
      });
    }
    this.renderShopGrid();
  };

  private onShopSelect = (
    payload: number | { index: number; pane?: ShopPane },
  ): void => {
    if (!this.shopOpen || !this.shopPayload) return;
    const shop = getShop(this.shopPayload.shopId, this.shopPayload.save.level);
    if (!shop) return;
    const index = typeof payload === 'number' ? payload : payload.index;
    const pane =
      typeof payload === 'number' ? this.shopPane : (payload.pane ?? this.shopPane);
    this.shopPane = pane;
    if (pane === 'stock') {
      if (!shop.stock.length) return;
      this.shopSelected = Math.max(0, Math.min(index, shop.stock.length - 1));
    } else {
      const bag = listPlayerSellables(
        this.shopPayload.save,
        this.shopPayload.shopId,
      );
      if (!bag.length) {
        this.shopBagSelected = 0;
      } else {
        this.shopBagSelected = Math.max(0, Math.min(index, bag.length - 1));
      }
    }
    this.syncShopPagesFromSelection();
    this.renderShopGrid();
  };

  private onShopRefresh = (save: SaveData): void => {
    if (!this.shopOpen || !this.shopPayload) return;
    this.shopPayload = { ...this.shopPayload, save };
    this.lastSave = save;
    const bag = listPlayerSellables(save, this.shopPayload.shopId);
    if (this.shopBagSelected >= bag.length) {
      this.shopBagSelected = Math.max(0, bag.length - 1);
    }
    this.syncShopPagesFromSelection();
    this.renderShopGrid();
  };

  private openShopGraphic(): void {
    if (!this.shopPayload) return;
    this.ensureShopChrome();
    this.shopOpen = true;
    this.shopBg?.setVisible(true).setDepth(210);
    this.shopTitle?.setVisible(true).setDepth(211);
    this.shopCoins?.setVisible(true).setDepth(211);
    this.shopStockLabel?.setVisible(true).setDepth(211);
    this.shopBagLabel?.setVisible(true).setDepth(211);
    this.shopDetail?.setVisible(true).setDepth(211);
    this.shopHelp?.setVisible(true).setDepth(211);
    this.shopLayer?.setVisible(true).setDepth(212);
    this.renderShopGrid();
    this.game.events.emit('shop-state', true);
  }

  private onRackPickerToggle = (payload?: RackPickerPayload | null): void => {
    this.ensureRackChrome();
    // Close when open and no payload
    if (this.rackOpen && !payload?.options) {
      this.closeRackPickerPanel();
      return;
    }
    if (this.rackOpen && payload?.options) {
      this.rackPayload = payload;
      this.rackSelected = payload.selectedIndex ?? 0;
      this.renderRackPickerGrid();
      return;
    }
    if (this.inventoryOpen || this.mapzOpen || this.forjingOpen || this.shopOpen) {
      return;
    }
    if (!payload?.options?.length) return;
    if (this.dialogOpen) {
      this.resetDialogVisuals();
      this.game.events.emit('dialog-state', false);
    }
    this.rackPayload = payload;
    this.rackSelected = payload.selectedIndex ?? 0;
    this.openRackPickerGraphic();
  };

  private onRackPickerSelect = (index: number): void => {
    if (!this.rackOpen || !this.rackPayload) return;
    const n = this.rackPayload.options.length;
    if (!n) return;
    this.rackSelected = Math.max(0, Math.min(index, n - 1));
    this.rackPayload = { ...this.rackPayload, selectedIndex: this.rackSelected };
    this.renderRackPickerGrid();
    this.game.events.emit('rack-picker-cursor', this.rackSelected);
  };

  private openRackPickerGraphic(): void {
    if (!this.rackPayload) return;
    this.ensureRackChrome();
    this.rackOpen = true;
    this.rackBg?.setVisible(true);
    this.rackTitle?.setVisible(true);
    this.rackSubtitle?.setVisible(true);
    this.rackDetail?.setVisible(true);
    this.rackHelp?.setVisible(true);
    this.rackLayer?.setVisible(true);
    this.renderRackPickerGrid();
    this.game.events.emit('rack-picker-state', true);
  }

  private closeRackPickerPanel(): void {
    this.rackOpen = false;
    this.rackPayload = null;
    this.rackSelected = 0;
    this.clearRackPieces();
    this.rackBg?.setVisible(false);
    this.rackTitle?.setVisible(false);
    this.rackSubtitle?.setVisible(false);
    this.rackDetail?.setVisible(false);
    this.rackHelp?.setVisible(false);
    this.rackLayer?.setVisible(false);
    this.game.events.emit('rack-picker-state', false);
  }

  private renderRackPickerGrid(): void {
    if (!this.rackPayload || !this.rackLayer) return;
    this.clearRackPieces();
    const opts = this.rackPayload.options;
    const fam = this.rackPayload.family.toUpperCase();
    this.rackTitle?.setText(`${fam} RACK`);
    this.rackSubtitle?.setText(
      `${opts.length} WEAPON${opts.length === 1 ? '' : 'S'} HANGING — EQUIP ONE`,
    );

    if (this.rackSelected >= opts.length) {
      this.rackSelected = Math.max(0, opts.length - 1);
    }

    const cols = UIScene.RACK_COLS;
    const cell = UIScene.RACK_CELL;
    const gap = UIScene.RACK_GAP;
    const gridW = cols * cell + (cols - 1) * gap;
    const originX = (GAME_W - gridW) / 2 + cell / 2;
    const originY = HUD_H + 110;

    for (let i = 0; i < opts.length; i++) {
      const opt = opts[i]!;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = originX + col * (cell + gap);
      const y = originY + row * (cell + gap);
      const selected = i === this.rackSelected;

      const frame = this.add
        .rectangle(x, y, cell, cell, 0x12161f, 1)
        .setStrokeStyle(selected ? 3 : 2, selected ? COLORS.gold : 0x5c4d7a)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true });
      frame.on('pointerdown', () => {
        if (this.rackSelected === i) {
          // Second click equips
          this.game.events.emit('rack-picker-confirm', i);
          return;
        }
        this.rackSelected = i;
        if (this.rackPayload) {
          this.rackPayload = { ...this.rackPayload, selectedIndex: i };
        }
        this.renderRackPickerGrid();
        this.game.events.emit('rack-picker-cursor', i);
      });
      this.rackLayer!.add(frame);
      this.rackPieces.push(frame);

      const iconKey = itemIconKey(opt.templateId);
      const tex = this.textures.exists(iconKey) ? iconKey : 'icon_empty';
      const icon = this.add
        .image(x, y - 4, tex)
        .setScale(2.0)
        .setScrollFactor(0);
      this.rackLayer!.add(icon);
      this.rackPieces.push(icon);

      const num = this.add
        .text(x - cell / 2 + 8, y - cell / 2 + 6, `${i + 1}`, {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '8px',
          color: selected ? '#ffc857' : '#6a738a',
        })
        .setScrollFactor(0);
      this.rackLayer!.add(num);
      this.rackPieces.push(num);
    }

    // Equip button under selection
    const sel = opts[this.rackSelected];
    if (sel) {
      this.rackDetail?.setText(
        [
          sel.name,
          sel.blurb,
          '',
          'ENTER OR CLICK AGAIN TO BORROW',
          'GUILD LOANER — STAYS IN THE HALL.',
        ].join('\n'),
      );
      this.rackDetail?.setColor('#f4f0ff');

      const btnY = GAME_H - 168;
      const btn = this.add
        .rectangle(GAME_W / 2, btnY, 280, 36, 0x1a4030, 0.98)
        .setStrokeStyle(2, COLORS.green)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => {
        this.game.events.emit('rack-picker-confirm', this.rackSelected);
      });
      this.rackLayer.add(btn);
      this.rackPieces.push(btn);
      const btnLabel = this.add
        .text(GAME_W / 2, btnY, '▶  BORROW', {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '11px',
          color: '#7dffb3',
        })
        .setOrigin(0.5)
        .setScrollFactor(0);
      this.rackLayer.add(btnLabel);
      this.rackPieces.push(btnLabel);
    } else {
      this.rackDetail?.setText('NO WEAPONS HANGING.');
      this.rackDetail?.setColor('#6a738a');
    }
  }

  private closeShopPanel(): void {
    this.shopOpen = false;
    this.clearShopPieces();
    this.shopBg?.setVisible(false);
    this.shopTitle?.setVisible(false);
    this.shopCoins?.setVisible(false);
    this.shopStockLabel?.setVisible(false);
    this.shopBagLabel?.setVisible(false);
    this.shopDetail?.setVisible(false);
    this.shopHelp?.setVisible(false);
    this.shopLayer?.setVisible(false);
    this.game.events.emit('shop-state', false);
  }

  private renderShopGrid(): void {
    if (!this.shopPayload || !this.shopLayer) return;
    this.clearShopPieces();
    const shop = getShop(this.shopPayload.shopId, this.shopPayload.save.level);
    const save = this.shopPayload.save;
    if (!shop) {
      this.shopDetail?.setText('NO SHOP HERE.');
      return;
    }

    this.shopTitle?.setText(shop.name);
    this.shopCoins?.setText(`YOUR COINS: ${save.coins}c`);

    // Mid divider between panes
    const midX = GAME_W / 2;
    const divider = this.add
      .rectangle(midX, HUD_H + 200, 2, 280, 0x3a3150, 1)
      .setScrollFactor(0);
    this.shopLayer.add(divider);
    this.shopPieces.push(divider);

    const stock = shop.stock;
    const stockCols = SHOP_STOCK_COLS;
    const stockOriginX = 48 + SHOP_CELL / 2;
    const gridOriginY = HUD_H + 78 + SHOP_CELL / 2;

    // Paginate stock (left)
    const stockPages = shopPageCount(stock.length, SHOP_STOCK_PAGE_SIZE);
    this.shopStockPage = clampShopPage(
      this.shopStockPage,
      stock.length,
      SHOP_STOCK_PAGE_SIZE,
    );
    // Selection may have moved off-page via arrows — follow it
    this.shopStockPage = shopPageOf(this.shopSelected, SHOP_STOCK_PAGE_SIZE);
    this.shopStockPage = clampShopPage(
      this.shopStockPage,
      stock.length,
      SHOP_STOCK_PAGE_SIZE,
    );
    const stockStart = this.shopStockPage * SHOP_STOCK_PAGE_SIZE;
    const stockEnd = Math.min(stock.length, stockStart + SHOP_STOCK_PAGE_SIZE);

    this.shopStockLabel?.setText(
      (this.shopPane === 'stock' ? '▶ STOCK' : 'STOCK') +
        (stock.length
          ? `  ${stockStart + 1}-${stockEnd}/${stock.length}  P${this.shopStockPage + 1}/${stockPages}`
          : ''),
    );
    this.shopStockLabel?.setColor(
      this.shopPane === 'stock' ? '#ffc857' : '#8a7a50',
    );

    for (let i = stockStart; i < stockEnd; i++) {
      const item = stock[i]!;
      const local = i - stockStart;
      const col = local % stockCols;
      const row = Math.floor(local / stockCols);
      const x = stockOriginX + col * (SHOP_CELL + SHOP_GAP);
      const y = gridOriginY + row * (SHOP_CELL + SHOP_GAP);
      const selected = this.shopPane === 'stock' && i === this.shopSelected;
      const afford = canAfford(save, item);

      const frame = this.add
        .rectangle(x, y, SHOP_CELL, SHOP_CELL, 0x12161f, 1)
        .setStrokeStyle(
          selected ? 3 : 2,
          selected
            ? COLORS.gold
            : afford
              ? 0x4a6a40
              : 0x5a4030,
        )
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true });
      frame.on('pointerdown', () => {
        this.shopPane = 'stock';
        this.shopSelected = i;
        this.shopStockPage = shopPageOf(i, SHOP_STOCK_PAGE_SIZE);
        this.renderShopGrid();
        this.game.events.emit('shop-cursor', { pane: 'stock', index: i });
      });
      this.shopLayer!.add(frame);
      this.shopPieces.push(frame);

      const iconKey = shopIconTexture(item);
      const tex = this.textures.exists(iconKey) ? iconKey : 'icon_empty';
      const icon = this.add
        .image(x, y - 6, tex)
        .setScale(1.35)
        .setScrollFactor(0)
        .setAlpha(afford ? 1 : 0.4);
      this.shopLayer!.add(icon);
      this.shopPieces.push(icon);

      const priceColor = afford ? '#7dffb3' : '#e74c3c';
      const price = this.add
        .text(x, y + 18, `${item.price}c`, {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '7px',
          color: priceColor,
        })
        .setOrigin(0.5)
        .setScrollFactor(0);
      this.shopLayer!.add(price);
      this.shopPieces.push(price);

      if (item.buddyOnly) {
        const bud = this.add
          .text(x - 16, y - 18, 'BUD', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '5px',
            color: '#ffc857',
          })
          .setOrigin(0.5)
          .setScrollFactor(0);
        this.shopLayer!.add(bud);
        this.shopPieces.push(bud);
      }
    }

    // Stock page buttons
    if (stockPages > 1) {
      const py = gridOriginY + 4 * (SHOP_CELL + SHOP_GAP) + 8;
      const px = stockOriginX + SHOP_CELL + SHOP_GAP;
      this.addShopPager(px, py, this.shopStockPage, stockPages, 'stock');
    }

    // Right pane — player inventory (paginated)
    const bag = listPlayerSellables(save, this.shopPayload.shopId);
    if (this.shopBagSelected >= bag.length) {
      this.shopBagSelected = Math.max(0, bag.length - 1);
    }
    const bagCols = SHOP_BAG_COLS;
    const bagGridW = bagCols * SHOP_CELL + (bagCols - 1) * SHOP_GAP;
    const bagOriginX = GAME_W - 48 - bagGridW + SHOP_CELL / 2;

    const bagPages = shopPageCount(bag.length, SHOP_BAG_PAGE_SIZE);
    this.shopBagPage = shopPageOf(this.shopBagSelected, SHOP_BAG_PAGE_SIZE);
    this.shopBagPage = clampShopPage(
      this.shopBagPage,
      bag.length,
      SHOP_BAG_PAGE_SIZE,
    );
    const bagStart = this.shopBagPage * SHOP_BAG_PAGE_SIZE;
    const bagEnd = Math.min(bag.length, bagStart + SHOP_BAG_PAGE_SIZE);

    this.shopBagLabel?.setText(
      (this.shopPane === 'bag' ? '▶ BAG' : 'BAG') +
        (bag.length
          ? `  ${bagStart + 1}-${bagEnd}/${bag.length}  P${this.shopBagPage + 1}/${bagPages}`
          : ''),
    );
    this.shopBagLabel?.setColor(
      this.shopPane === 'bag' ? '#7dffb3' : '#3a6a50',
    );

    if (!bag.length) {
      const empty = this.add
        .text(GAME_W * 0.72, gridOriginY + 40, '(empty bag)', {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '8px',
          color: '#6a738a',
        })
        .setOrigin(0.5)
        .setScrollFactor(0);
      this.shopLayer.add(empty);
      this.shopPieces.push(empty);
    } else {
      for (let i = bagStart; i < bagEnd; i++) {
        const item = bag[i]!;
        const local = i - bagStart;
        const col = local % bagCols;
        const row = Math.floor(local / bagCols);
        const x = bagOriginX + col * (SHOP_CELL + SHOP_GAP);
        const y = gridOriginY + row * (SHOP_CELL + SHOP_GAP);
        const selected = this.shopPane === 'bag' && i === this.shopBagSelected;

        const frame = this.add
          .rectangle(x, y, SHOP_CELL, SHOP_CELL, 0x12161f, 1)
          .setStrokeStyle(
            selected ? 3 : 2,
            selected
              ? COLORS.gold
              : item.equipped
                ? COLORS.green
                : 0x5c4d7a,
          )
          .setScrollFactor(0)
          .setInteractive({ useHandCursor: true });
        frame.on('pointerdown', () => {
          this.shopPane = 'bag';
          this.shopBagSelected = i;
          this.shopBagPage = shopPageOf(i, SHOP_BAG_PAGE_SIZE);
          this.renderShopGrid();
          this.game.events.emit('shop-cursor', { pane: 'bag', index: i });
        });
        this.shopLayer!.add(frame);
        this.shopPieces.push(frame);

        const k = itemIconKey(item.templateId);
        const tex = this.textures.exists(k) ? k : 'icon_empty';
        const icon = this.add
          .image(x, y - 6, tex)
          .setScale(1.35)
          .setScrollFactor(0);
        this.shopLayer!.add(icon);
        this.shopPieces.push(icon);

        if (item.count > 1) {
          const cnt = this.add
            .text(x + 16, y + 10, `x${item.count}`, {
              fontFamily: '"Press Start 2P", monospace',
              fontSize: '6px',
              color: '#ffc857',
            })
            .setOrigin(0.5)
            .setScrollFactor(0);
          this.shopLayer!.add(cnt);
          this.shopPieces.push(cnt);
        }

        if (item.equipped) {
          const tag = this.add
            .text(x - 16, y + 16, 'E', {
              fontFamily: '"Press Start 2P", monospace',
              fontSize: '6px',
              color: '#7dffb3',
            })
            .setOrigin(0.5)
            .setScrollFactor(0);
          this.shopLayer!.add(tag);
          this.shopPieces.push(tag);
        }

        const sell = this.add
          .text(x, y + 18, `+${item.sellPrice}c`, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '6px',
            color: '#ffc857',
          })
          .setOrigin(0.5)
          .setScrollFactor(0);
        this.shopLayer!.add(sell);
        this.shopPieces.push(sell);
      }

      if (bagPages > 1) {
        const py = gridOriginY + 4 * (SHOP_CELL + SHOP_GAP) + 8;
        const px = bagOriginX + (bagCols / 2) * (SHOP_CELL + SHOP_GAP);
        this.addShopPager(px, py, this.shopBagPage, bagPages, 'bag');
      }
    }

    // Detail line for focused pane
    if (this.shopPane === 'stock') {
      const sel = stock[this.shopSelected] ?? stock[0];
      if (sel) {
        const afford = canAfford(save, sel);
        const budNote = sel.buddyOnly
          ? 'BUDDY ONLY — equip with Y (buddy gear mode)'
          : null;
        this.shopDetail?.setText(
          [
            `[BUY] ${sel.name}${sel.buddyOnly ? ' [BUD]' : ''}`,
            sel.description,
            budNote,
            afford
              ? `BUY FOR ${sel.price}c  (you have ${save.coins}c · LV${save.level})`
              : `NEED ${sel.price}c  (you have ${save.coins}c · LV${save.level})`,
          ]
            .filter(Boolean)
            .join('\n'),
        );
        this.shopDetail?.setColor(afford ? '#f4f0ff' : '#ff8a8a');
      }
    } else {
      const sel = bag[this.shopBagSelected];
      if (sel) {
        const bits = [
          `[SELL] ${sel.name}${sel.count > 1 ? ` x${sel.count}` : ''}`,
          sel.blurb,
          sel.equipped
            ? `EQUIPPED — sell unequips it. TINKER pays ${sel.sellPrice}c`
            : `SELL TO TINKER FOR ${sel.sellPrice}c`,
        ];
        this.shopDetail?.setText(bits.join('\n'));
        this.shopDetail?.setColor('#f4f0ff');
      } else {
        this.shopDetail?.setText(
          'NOTHING TO SELL.\nLoot creeps, chests, or buy left then resell later.',
        );
        this.shopDetail?.setColor('#6a738a');
      }
    }
  }

  /** ◀ N/M ▶ pager under a shop grid pane. */
  private addShopPager(
    x: number,
    y: number,
    page: number,
    pages: number,
    pane: ShopPane,
  ): void {
    if (!this.shopLayer) return;
    const canPrev = page > 0;
    const canNext = page < pages - 1;
    const mkBtn = (
      bx: number,
      label: string,
      enabled: boolean,
      dir: number,
    ) => {
      const t = this.add
        .text(bx, y, label, {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '9px',
          color: enabled ? '#7dffb3' : '#3a4250',
        })
        .setOrigin(0.5)
        .setScrollFactor(0);
      if (enabled) {
        t.setInteractive({ useHandCursor: true });
        t.on('pointerdown', () => {
          this.shopPane = pane;
          this.onShopPage(dir);
        });
      }
      this.shopLayer!.add(t);
      this.shopPieces.push(t);
    };
    mkBtn(x - 48, '◀', canPrev, -1);
    const mid = this.add
      .text(x, y, `${page + 1}/${pages}`, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#ffc857',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    this.shopLayer.add(mid);
    this.shopPieces.push(mid);
    mkBtn(x + 48, '▶', canNext, 1);
  }

  private openForjingGraphic(): void {
    if (!this.forjingPayload) return;
    this.ensureForjingChrome();
    this.forjingOpen = true;
    this.forjingBg?.setVisible(true).setDepth(200);
    this.forjingTitle?.setVisible(true).setDepth(201);
    this.forjingCoins?.setVisible(true).setDepth(201);
    this.forjingActionLabel?.setVisible(true).setDepth(201);
    this.forjingMatLabel?.setVisible(true).setDepth(201);
    this.forjingDetail?.setVisible(true).setDepth(201);
    this.forjingHelp?.setVisible(true).setDepth(201);
    this.forjingLayer?.setVisible(true).setDepth(202);
    this.renderForjingGrid();
    this.game.events.emit('forjing-state', true);
  }

  private closeForjingPanel(): void {
    this.forjingOpen = false;
    this.clearForjingPieces();
    this.forjingBg?.setVisible(false);
    this.forjingTitle?.setVisible(false);
    this.forjingCoins?.setVisible(false);
    this.forjingActionLabel?.setVisible(false);
    this.forjingMatLabel?.setVisible(false);
    this.forjingDetail?.setVisible(false);
    this.forjingHelp?.setVisible(false);
    this.forjingLayer?.setVisible(false);
    this.forjingPayload = null;
    this.game.events.emit('forjing-state', false);
  }

  private renderForjingGrid(): void {
    if (!this.forjingPayload || !this.forjingLayer) return;
    this.clearForjingPieces();
    const save = this.forjingPayload.save;
    const actions = listForjingActions();
    const mats = listForjingMats(save);

    this.forjingTitle?.setText('FORJE');
    this.forjingCoins?.setText(`YOUR COINS: ${save.coins}c`);

    const midX = GAME_W / 2;
    const divider = this.add
      .rectangle(midX, HUD_H + 200, 2, 280, 0x3a3150, 1)
      .setScrollFactor(0);
    this.forjingLayer.add(divider);
    this.forjingPieces.push(divider);

    const cols = FORJING_ACTION_COLS;
    const originX = 48 + FORJE_CELL / 2;
    const originY = HUD_H + 78 + FORJE_CELL / 2;
    if (this.forjingSelected >= actions.length) {
      this.forjingSelected = Math.max(0, actions.length - 1);
    }

    actions.forEach((action, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      if (row > 4) return;
      const x = originX + col * (FORJE_CELL + FORJE_GAP);
      const y = originY + row * (FORJE_CELL + FORJE_GAP);
      const selected = i === this.forjingSelected;
      const afford = canAffordForjing(save, action);

      const frame = this.add
        .rectangle(x, y, FORJE_CELL, FORJE_CELL, 0x12161f, 1)
        .setStrokeStyle(
          selected ? 3 : 2,
          selected ? COLORS.gold : afford ? 0x4a6a40 : 0x5a4030,
        )
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true });
      frame.on('pointerdown', () => {
        this.forjingSelected = i;
        this.renderForjingGrid();
        this.game.events.emit('forjing-cursor', i);
      });
      this.forjingLayer!.add(frame);
      this.forjingPieces.push(frame);

      const iconKey = forjingIconTexture(action.iconId);
      const tex = this.textures.exists(iconKey)
        ? iconKey
        : this.textures.exists(itemIconKey(action.iconId))
          ? itemIconKey(action.iconId)
          : 'icon_empty';
      const icon = this.add
        .image(x, y - 6, tex)
        .setScale(1.35)
        .setScrollFactor(0)
        .setAlpha(afford ? 1 : 0.4);
      this.forjingLayer!.add(icon);
      this.forjingPieces.push(icon);

      const label = this.add
        .text(x, y + 18, action.name.slice(0, 8), {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '5px',
          color: afford ? '#7dffb3' : '#e74c3c',
        })
        .setOrigin(0.5)
        .setScrollFactor(0);
      this.forjingLayer!.add(label);
      this.forjingPieces.push(label);
    });

    // Right: materials
    const matCols = 3;
    const matGridW = matCols * FORJE_CELL + (matCols - 1) * FORJE_GAP;
    const matOriginX = GAME_W - 48 - matGridW + FORJE_CELL / 2;

    if (!mats.length) {
      const empty = this.add
        .text(GAME_W * 0.72, originY + 40, '(no mats)', {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '8px',
          color: '#6a738a',
        })
        .setOrigin(0.5)
        .setScrollFactor(0);
      this.forjingLayer.add(empty);
      this.forjingPieces.push(empty);
    } else {
      mats.forEach((mat, i) => {
        const col = i % matCols;
        const row = Math.floor(i / matCols);
        if (row > 4) return;
        const x = matOriginX + col * (FORJE_CELL + FORJE_GAP);
        const y = originY + row * (FORJE_CELL + FORJE_GAP);
        const has = mat.count > 0;

        const frame = this.add
          .rectangle(x, y, FORJE_CELL, FORJE_CELL, 0x12161f, 1)
          .setStrokeStyle(2, has ? COLORS.green : 0x5c4d7a)
          .setScrollFactor(0);
        this.forjingLayer!.add(frame);
        this.forjingPieces.push(frame);

        const k = itemIconKey(mat.iconId);
        const tex = this.textures.exists(k) ? k : 'icon_empty';
        const icon = this.add
          .image(x, y - 6, tex)
          .setScale(1.35)
          .setScrollFactor(0)
          .setAlpha(has ? 1 : 0.35);
        this.forjingLayer!.add(icon);
        this.forjingPieces.push(icon);

        const cnt = this.add
          .text(x, y + 18, `x${mat.count}`, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '7px',
            color: has ? '#ffc857' : '#6a738a',
          })
          .setOrigin(0.5)
          .setScrollFactor(0);
        this.forjingLayer!.add(cnt);
        this.forjingPieces.push(cnt);
      });
    }

    const sel = actions[this.forjingSelected];
    if (sel) {
      const afford = canAffordForjing(save, sel);
      const wUid = save.equipped.weapon;
      const wInst = wUid ? findInBag(save, wUid) : undefined;
      const weaponLine = wInst
        ? `WEAPON: ${displayItemName(wInst)} +${wInst.enhancement}`
        : 'WEAPON: (none equipped)';
      this.forjingDetail?.setText(
        [
          `[${sel.kind.toUpperCase()}] ${sel.name}`,
          sel.blurb,
          `COST: ${formatForjingCost(sel)}`,
          weaponLine,
          afford
            ? 'ENTER TO FORJE'
            : 'NEED MORE MATERIALZ OR COINZ',
        ].join('\n'),
      );
      this.forjingDetail?.setColor(afford ? '#f4f0ff' : '#ff8a8a');
    }
  }

  private onGearTarget = (target: EquipTarget): void => {
    this.gearTarget = target;
    if (this.inventoryOpen && this.lastSave) {
      this.renderInventory(this.lastSave);
    }
  };

  private renderInventory(save: SaveData): void {
    const s = ensureBudProgress(save);
    const budMode =
      this.gearTarget === 'bud' && isCompanionActive(s);
    if (this.invAvatar) {
      if (budMode) {
        const look = ensureBuddyTexture(this, budAppearanceFromSave(s), 'idle');
        this.invAvatar.setTexture(look);
        const bud = getBestBud(s.bestBudId);
        if (bud) this.invAvatar.setTint(bud.tint);
        else this.invAvatar.clearTint();
      } else {
        const look = ensurePlayerTexture(
          this,
          appearanceFromSave(s),
          0,
          bodyLookFromSave(s),
        );
        this.invAvatar.setTexture(look);
        this.invAvatar.clearTint();
      }
    }

    const bud = getBestBud(s.bestBudId);
    this.invYouLabel?.setText(
      budMode
        ? `${bud?.name ?? 'BUD'} · Y`
        : isCompanionActive(s)
          ? 'YOU · Y=BUD'
          : 'YOU',
    );
    this.invYouLabel?.setColor(budMode ? '#ffc857' : '#8b93a7');
    this.invTitle?.setText(
      budMode ? 'BUDDY GEAR / LEVEL' : 'INVENTORY / CHARACTER',
    );

    const equipMap = budMode ? s.budEquipped : s.equipped;
    for (const slot of ALL_EQUIP_SLOTS) {
      const uid = equipMap[slot];
      const inst = uid ? findInBag(s, uid) : undefined;
      const icon = this.invSlotIcons[slot];
      const label = this.invSlotLabels[slot];
      if (icon) {
        const tid = inst?.templateId;
        const k = itemIconKey(tid);
        icon.setTexture(this.textures.exists(k) ? k : 'icon_empty');
        // Dim key slot in buddy mode
        icon.setAlpha(budMode && slot === 'key' ? 0.35 : 1);
      }
      if (label) {
        // Compact equip label: chrome + name/+enh only (no rarity overflow)
        const rawName =
          budMode && slot === 'key'
            ? '(n/a)'
            : inst
              ? equipListItemName(inst)
              : '(empty)';
        const name = truncateInvName(rawName, UIScene.INV_EQUIP_NAME_CHARS);
        label.setText(`${SLOT_SHORT[slot]} [${SLOT_KEYS[slot]}]\n${name}`);
        label.setAlpha(budMode && slot === 'key' ? 0.4 : 1);
      }
    }

    if (budMode) {
      this.clearStatButtons();
      this.invStats?.setText(budGearSummary(s));
      this.invAttrs?.setPosition(UIScene.INV_STATS_X, UIScene.INV_EQUIP_Y0 + 88);
      this.invAttrs?.setText(
        [
          `STRIKE ${computeBudStrikeDamage(s)}`,
          `ARMOR ${budArmorDef(s)}`,
          'GEAR FROM SHARED BAG',
          'Y BACK TO YOU',
        ].join('\n'),
      );
    } else {
      this.invStats?.setText(
        [
          `COINS ${s.coins}c`,
          `HP ${s.hp}/${s.maxHp}`,
          `DEF ${s.armor}`,
          `WPN ${s.hasSword ? 'Y' : '-'} KEY ${s.hasKey ? 'Y' : '-'}`,
        ].join('\n'),
      );
      const packages = s.attrPoints > 0 || !!s.pendingAttrMajor;
      const pending = s.pendingAttrMajor
        ? `TAP +1 (not ${s.pendingAttrMajor.toUpperCase()})`
        : s.attrPoints > 0
          ? 'TAP STAT: +2 then +1 other'
          : 'NO PKG';
      const touch = isTouchUiPreferred();
      // When spending, keep attrs compact so buttons fit above bag band
      this.invAttrs?.setPosition(
        UIScene.INV_STATS_X,
        packages ? UIScene.INV_EQUIP_Y0 + 68 : UIScene.INV_EQUIP_Y0 + 88,
      );
      this.invAttrs?.setText(
        packages
          ? [
              `PKG ${s.attrPoints}${s.pendingAttrMajor ? '*' : ''}`,
              pending,
              touch ? 'TAP BELOW' : 'OR KEYS 1–5',
            ].join('\n')
          : [
              s.attrPoints > 0 ? `PKG ${s.attrPoints}` : 'PKG 0',
              `STR${s.attrs.str} DEX${s.attrs.dex} VIT${s.attrs.vit}`,
              `INT${s.attrs.int} LCK${s.attrs.lck}`,
            ].join('\n'),
      );
      this.renderStatSpendButtons(s);
    }

    this.renderBagGrid(s);
  }

  private clearStatButtons(): void {
    for (const p of this.invStatPieces) p.destroy();
    this.invStatPieces = [];
    this.invStatLayer?.removeAll(true);
  }

  /**
   * Big tappable STR/DEX/VIT/INT/LCK (+ AUTO) when packages remain.
   * Clamped into character strip (max y ≤ INV_STAT_BTN_MAX_Y) so bag band stays clean.
   * Mobile primary path — keys 1–5 still work on desktop.
   */
  private renderStatSpendButtons(s: SaveData): void {
    this.clearStatButtons();
    if (!this.invStatLayer) return;
    const packages = s.attrPoints > 0 || !!s.pendingAttrMajor;
    if (!packages) return;

    const railX = UIScene.INV_STATS_X;
    // Compact 3+2 grid + AUTO — must stay above bag title (INV_STAT_BTN_MAX_Y)
    const btnW = Math.min(96, Math.floor((GAME_W - railX - 28) / 3) - 6);
    const btnH = 28;
    const gap = 5;
    const blockH = 12 + 2 * (btnH + gap) + btnH;
    const startY = Math.min(
      UIScene.INV_EQUIP_Y0 + 118,
      UIScene.INV_STAT_BTN_MAX_Y - blockH,
    );

    const title = this.add
      .text(railX, startY - 12, 'SPEND STAT PKG', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#ffc857',
      })
      .setScrollFactor(0);
    this.invStatLayer.add(title);
    this.invStatPieces.push(title);

    ATTR_IDS.forEach((attr, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = railX + col * (btnW + gap) + btnW / 2;
      const y = startY + 8 + row * (btnH + gap) + btnH / 2;
      const blocked =
        !!s.pendingAttrMajor && s.pendingAttrMajor === attr;
      const val = s.attrs[attr];
      const bg = this.add
        .rectangle(
          x,
          y,
          btnW,
          btnH,
          blocked ? 0x2a2030 : 0x1a4030,
          0.98,
        )
        .setStrokeStyle(2, blocked ? 0x6a4050 : COLORS.green)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: !blocked });
      const label = this.add
        .text(x, y, `${ATTR_LABELS[attr]}\n${val}`, {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '8px',
          color: blocked ? '#8b93a7' : '#7dffb3',
          align: 'center',
          lineSpacing: 3,
        })
        .setOrigin(0.5)
        .setScrollFactor(0);
      if (!blocked) {
        bg.on('pointerdown', () => {
          playSfx('ui_click');
          this.game.events.emit('spend-attr', attr as AttrId);
        });
        bg.on('pointerover', () => bg.setFillStyle(0x2a6040, 1));
        bg.on('pointerout', () => bg.setFillStyle(0x1a4030, 0.98));
      }
      this.invStatLayer!.add([bg, label]);
      this.invStatPieces.push(bg, label);
    });

    // AUTO fills remaining packages (same as Settings → auto, one-shot)
    const autoY = startY + 8 + 2 * (btnH + gap) + btnH / 2;
    const autoW = Math.min(btnW * 2 + gap, GAME_W - railX - 40);
    const autoBg = this.add
      .rectangle(railX + autoW / 2, autoY, autoW, btnH, 0x3a2810, 0.98)
      .setStrokeStyle(2, 0xffc857)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    const autoLb = this.add
      .text(railX + autoW / 2, autoY, 'AUTO ALL', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#ffc857',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    autoBg.on('pointerdown', () => {
      playSfx('ui_click');
      this.game.events.emit('auto-stats-flush');
    });
    this.invStatLayer.add([autoBg, autoLb]);
    this.invStatPieces.push(autoBg, autoLb);
  }

  private renderBagGrid(save: SaveData): void {
    if (!this.invBagLayer) return;
    this.clearInvBagPieces();

    const bag = this.bagList(save);
    const pages = Math.max(1, Math.ceil(bag.length / UIScene.BAG_PAGE_SIZE));
    if (this.invBagPage >= pages) this.invBagPage = pages - 1;
    if (this.invBagPage < 0) this.invBagPage = 0;

    const sortTag = inventorySortLabel(this.invBagSort);
    this.invBagTitle?.setText(
      bag.length
        ? `BAG (${bag.length})  ·  ${sortTag}  ·  P${this.invBagPage + 1}/${pages}`
        : `BAG (0)  ·  ${sortTag}`,
    );
    this.invBagTitle?.setPosition(UIScene.INV_BAG_LEFT, UIScene.INV_BAG_TITLE_Y);

    // Left-aligned bag + right inspect (siblings, 14px gutter, same height)
    const helpY = UIScene.INV_HELP_Y;
    const detailBodyX = UIScene.INV_DETAIL_X + 64;
    const detailBodyY = UIScene.INV_DETAIL_BODY_Y;
    const detailWrap = UIScene.INV_DETAIL_W - 64;
    const cols = UIScene.BAG_COLS;
    const cell = UIScene.BAG_CELL;
    const gap = UIScene.BAG_GAP;
    const gridW = cols * cell + (cols - 1) * gap;
    const originX = UIScene.INV_BAG_LEFT + cell / 2;
    const originY = UIScene.INV_BAG_ORIGIN_Y + cell / 2;

    const setInspectEmpty = (title: string, body: string): void => {
      this.invDetailHeader?.setText(title);
      this.invDetailHeader?.setPosition(
        UIScene.INV_DETAIL_X,
        UIScene.INV_DETAIL_HEADER_Y,
      );
      this.invDetailIcon?.setTexture('icon_empty');
      this.invDetailIcon?.setVisible(true);
      this.invDetailIconWell?.setVisible(true);
      // Centered empty copy in the inspect plate (not top-left orphan)
      const plateCx =
        UIScene.INV_DETAIL_PLATE_L + UIScene.INV_DETAIL_PLATE_W / 2;
      const plateCy =
        UIScene.INV_DETAIL_PLATE_TOP + UIScene.INV_DETAIL_PLATE_H / 2;
      this.invBagDetail?.setOrigin(0.5, 0.5);
      this.invBagDetail?.setPosition(plateCx, plateCy + 24);
      this.invBagDetail?.setWordWrapWidth(UIScene.INV_DETAIL_W - 32);
      this.invBagDetail?.setAlign('center');
      this.invBagDetail?.setText(body);
      this.invBagDetail?.setColor('#a8b0c4');
    };

    if (!bag.length) {
      const empty = this.add
        .text(
          originX + gridW / 2 - cell / 2,
          originY + 40,
          '(empty - loot creeps & chests)',
          {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '8px',
            color: '#a8b0c4',
          },
        )
        .setOrigin(0.5)
        .setScrollFactor(0);
      this.invBagLayer.add(empty);
      this.invBagPieces.push(empty);
      setInspectEmpty(
        'INSPECT',
        'SELECT A BAG ITEM\nor loot creeps & chests',
      );
      this.invHelp?.setPosition(GAME_W / 2, helpY);
      return;
    }

    if (this.invBagSelected >= bag.length) this.invBagSelected = 0;
    // Keep selection visible on current page when possible
    const pageStart = this.invBagPage * UIScene.BAG_PAGE_SIZE;
    const pageEnd = Math.min(bag.length, pageStart + UIScene.BAG_PAGE_SIZE);
    if (this.invBagSelected < pageStart || this.invBagSelected >= pageEnd) {
      // Jump page to selection (e.g. after equip refresh)
      this.invBagPage = Math.floor(this.invBagSelected / UIScene.BAG_PAGE_SIZE);
    }
    const start = this.invBagPage * UIScene.BAG_PAGE_SIZE;
    const end = Math.min(bag.length, start + UIScene.BAG_PAGE_SIZE);

    // Hit zone for wheel scroll — over bag grid only (left column)
    const wheelCx = originX + ((cols - 1) * (cell + gap)) / 2;
    const wheelCy = originY + ((UIScene.BAG_ROWS - 1) * (cell + gap)) / 2;
    const wheelZone = this.add
      .rectangle(
        wheelCx,
        wheelCy,
        gridW + 24,
        UIScene.BAG_ROWS * (cell + gap) + 16,
        0x000000,
        0.001,
      )
      .setScrollFactor(0)
      .setInteractive();
    wheelZone.on(
      'wheel',
      (
        _pointer: Phaser.Input.Pointer,
        deltaX: number,
        deltaY: number,
        deltaZ: number,
      ) => {
        const delta = deltaY || deltaZ || deltaX;
        if (delta > 0) this.shiftBagPage(1);
        else if (delta < 0) this.shiftBagPage(-1);
      },
    );
    this.invBagLayer.add(wheelZone);
    this.invBagPieces.push(wheelZone);

    for (let i = start; i < end; i++) {
      const item = bag[i]!;
      const local = i - start;
      const col = local % cols;
      const row = Math.floor(local / cols);
      const x = originX + col * (cell + gap);
      const y = originY + row * (cell + gap);
      const selected = i === this.invBagSelected;
      // Hero mode: grey out gear that fails class / armor-type gate
      const classBlocked =
        this.gearTarget !== 'bud' &&
        !!item.slot &&
        item.slot !== 'weapon' &&
        item.slot !== 'key' &&
        !item.usable &&
        isGearClassBlocked(save, item.templateId);
      const border = selected
        ? classBlocked
          ? 0x8a6060
          : COLORS.gold
        : item.equipped
          ? COLORS.green
          : classBlocked
            ? 0x3a3a48
            : 0x5c4d7a;

      const frame = this.add
        .rectangle(x, y, cell, cell, classBlocked ? 0x0c0e14 : 0x12161f, 1)
        .setStrokeStyle(selected ? 3 : 2, border)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true });
      frame.on('pointerdown', () => {
        this.invBagSelected = i;
        this.renderBagGrid(save);
        this.game.events.emit('inventory-bag-activate', {
          uid: item.uid,
          templateId: item.templateId,
          usable: item.usable,
          slot: item.slot,
        });
      });
      this.invBagLayer!.add(frame);
      this.invBagPieces.push(frame);

      const k = itemIconKey(item.templateId);
      const tex = this.textures.exists(k) ? k : 'icon_empty';
      const icon = this.add
        .image(x, y - 2, tex)
        .setScale(UIScene.BAG_ICON_SCALE)
        .setScrollFactor(0)
        .setAlpha(classBlocked ? 0.32 : item.equipped ? 1 : 0.95)
        .setTint(classBlocked ? 0x667788 : 0xffffff);
      this.invBagLayer!.add(icon);
      this.invBagPieces.push(icon);

      if (item.count > 1) {
        const cnt = this.add
          .text(x + 22, y + 20, `x${item.count}`, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '8px',
            color: '#ffc857',
          })
          .setOrigin(0.5)
          .setScrollFactor(0);
        this.invBagLayer!.add(cnt);
        this.invBagPieces.push(cnt);
      }

      if (item.equipped) {
        const tag = this.add
          .text(x, y + 24, 'E', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '8px',
            color: '#7dffb3',
          })
          .setOrigin(0.5)
          .setScrollFactor(0);
        this.invBagLayer!.add(tag);
        this.invBagPieces.push(tag);
      } else if (item.uid && item.slot && item.slot !== 'key') {
        // ▲ / ▼ vs currently equipped in this slot (hero or buddy gear mode)
        const inst = findInBag(save, item.uid);
        const cmp = compareToEquipped(save, inst, this.gearTarget);
        if (cmp.dir === 'up' || cmp.dir === 'down') {
          const arrow = this.add
            .text(x + 24, y - 24, cmp.arrow, {
              fontFamily: '"Press Start 2P", monospace',
              fontSize: '10px',
              color: cmp.dir === 'up' ? '#7dffb3' : '#ff6b6b',
            })
            .setOrigin(0.5)
            .setScrollFactor(0);
          this.invBagLayer!.add(arrow);
          this.invBagPieces.push(arrow);
        }
      }
    }

    // Pager under left bag grid — large hit pads (≥44×36) for touch/a11y
    const pagerY =
      originY + UIScene.BAG_ROWS * (cell + gap) - cell / 2 + 22;
    const canPrev = this.invBagPage > 0;
    const canNext = this.invBagPage < pages - 1;
    const padW = 88;
    const padH = 36;
    const pagerBaseX = UIScene.INV_BAG_LEFT + 4;

    const makePagerHit = (
      cx: number,
      label: string,
      color: string,
      enabled: boolean,
      onTap: () => void,
    ): void => {
      const hit = this.add
        .rectangle(cx, pagerY, padW, padH, 0x1a2030, enabled ? 0.9 : 0.35)
        .setStrokeStyle(1, enabled ? 0x5c4d7a : 0x2a3040)
        .setScrollFactor(0);
      if (enabled) {
        hit.setInteractive({ useHandCursor: true });
        hit.on('pointerdown', onTap);
      }
      const txt = this.add
        .text(cx, pagerY, label, {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '8px',
          color: enabled ? color : '#3a4050',
        })
        .setOrigin(0.5)
        .setScrollFactor(0);
      this.invBagLayer!.add([hit, txt]);
      this.invBagPieces.push(hit, txt);
    };

    makePagerHit(
      pagerBaseX + padW / 2,
      '◀ PREV',
      '#7dffb3',
      canPrev,
      () => this.shiftBagPage(-1),
    );
    makePagerHit(
      pagerBaseX + padW + 8 + padW / 2,
      `SORT:${sortTag}`,
      '#ffc857',
      true,
      () => this.cycleBagSort(),
    );
    const pageCx = pagerBaseX + 2 * (padW + 8) + 40;
    const pageLabel = this.add
      .text(pageCx, pagerY, `${this.invBagPage + 1}/${pages}`, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#c5cde0',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    this.invBagLayer.add(pageLabel);
    this.invBagPieces.push(pageLabel);
    makePagerHit(
      pageCx + 48 + padW / 2,
      'NEXT ▶',
      '#7dffb3',
      canNext,
      () => this.shiftBagPage(1),
    );

    this.invHelp?.setPosition(GAME_W / 2, helpY);

    const sel = bag[this.invBagSelected];
    if (sel) {
      // Structured inspect card (header + icon well + body stack)
      const headerKind = sel.usable
        ? 'STACK'
        : sel.slot
          ? SLOT_SHORT[sel.slot] ?? sel.slot.toUpperCase()
          : 'ITEM';
      this.invDetailHeader?.setText(`INSPECT · ${headerKind}`);
      this.invDetailHeader?.setPosition(
        UIScene.INV_DETAIL_X,
        UIScene.INV_DETAIL_HEADER_Y,
      );

      const ik = itemIconKey(sel.templateId);
      this.invDetailIcon?.setTexture(
        this.textures.exists(ik) ? ik : 'icon_empty',
      );
      this.invDetailIcon?.setVisible(true);
      this.invDetailIconWell?.setVisible(true);

      this.invBagDetail?.setOrigin(0, 0);
      this.invBagDetail?.setAlign('left');
      this.invBagDetail?.setPosition(detailBodyX, detailBodyY);
      this.invBagDetail?.setWordWrapWidth(detailWrap);

      const nameLine =
        sel.name + (sel.count > 1 ? ` x${sel.count}` : '');
      const bits: string[] = [nameLine];
      if (sel.blurb) bits.push(sel.blurb);

      const classGate =
        this.gearTarget !== 'bud' &&
        sel.slot &&
        sel.slot !== 'weapon' &&
        sel.slot !== 'key'
          ? canHeroEquipGear(save, sel.templateId)
          : { ok: true as const };

      if (sel.equipped) {
        bits.push('[EQUIPPED]');
        if (sel.uid) {
          const inst = findInBag(save, sel.uid);
          const cmp = compareToEquipped(save, inst, this.gearTarget);
          if (cmp.stat) bits.push(`${cmp.stat} ${cmp.candidate}`);
        }
      } else if (sel.usable) {
        bits.push('U OR CLICK TO USE');
      } else if (!classGate.ok) {
        bits.push(classGate.reason);
        bits.push('GREYED OUT. Wrong class.');
      } else if (sel.slot && sel.uid) {
        const inst = findInBag(save, sel.uid);
        const cmp = compareToEquipped(save, inst, this.gearTarget);
        const line = equipCompareDetailLine(cmp);
        if (line) bits.push(line);
        bits.push(
          `CLICK TO EQUIP · ${SLOT_SHORT[sel.slot] ?? sel.slot.toUpperCase()} [${SLOT_KEYS[sel.slot]}]`,
        );
      } else if (sel.slot) {
        bits.push(
          `CLICK TO EQUIP · ${SLOT_SHORT[sel.slot] ?? sel.slot.toUpperCase()}`,
        );
      }
      // D&D-style class proficiency / affinity line
      if (sel.slot && sel.slot !== 'weapon' && sel.slot !== 'key') {
        const hint = classGearHint(save, sel.templateId);
        if (hint.text && (classGate.ok || !bits.includes(hint.text))) {
          if (!classGate.ok && hint.text === classGate.reason) {
            // already pushed reason
          } else if (classGate.ok) {
            bits.push(hint.text);
          }
        }
        const cat = getTemplate(sel.templateId).armorCategory;
        if (
          cat &&
          classGate.ok &&
          !bits.some((b) => b.includes(cat.toUpperCase()))
        ) {
          bits.push(`${cat.toUpperCase()} ARMOR`);
        }
      }
      this.invBagDetail?.setText(bits.join('\n'));
      // Color body by status; name still readable at 9px
      if (!classGate.ok) {
        this.invBagDetail?.setColor('#ff8a8a');
      } else if (sel.uid && sel.slot && !sel.equipped) {
        const inst = findInBag(save, sel.uid);
        const cmp = compareToEquipped(save, inst, this.gearTarget);
        if (cmp.dir === 'up') this.invBagDetail?.setColor('#7dffb3');
        else if (cmp.dir === 'down') this.invBagDetail?.setColor('#ff8a8a');
        else this.invBagDetail?.setColor('#c5cde0');
      } else {
        this.invBagDetail?.setColor('#c5cde0');
      }
    } else {
      setInspectEmpty('INSPECT', 'SELECT A BAG ITEM');
    }
  }

  private onEnterKey = (event: KeyboardEvent): void => {
    if (!this.dialogOpen) return;
    event.preventDefault();
    event.stopPropagation();
    this.advanceDialog();
  };

  private onSpaceKey = (event: KeyboardEvent): void => {
    if (!this.dialogOpen) return;
    event.preventDefault();
    event.stopPropagation();
    this.advanceDialog();
  };

  private refreshHud = (save: SaveData, roomTitle: string): void => {
    this.lastSave = save;
    if (!this.heartsText?.active) return;

    // Row 1 — vitals only (no room strings)
    const filled = Math.max(0, Math.ceil(save.hp / 2));
    const empty = Math.max(0, Math.ceil(save.maxHp / 2) - filled);
    // Prefer numeric HP if many hearts (avoids overflow)
    if (filled + empty > 10) {
      this.heartsText.setText(`♥${save.hp}/${save.maxHp}`);
    } else {
      this.heartsText.setText(`${'♥'.repeat(filled)}${'♡'.repeat(empty)}`);
    }

    const band = xpProgressInLevel(save.xp);
    const xpPart =
      band.need > 0
        ? `LV${save.level} ${band.into}/${band.need}XP`
        : `LV${save.level} MAX`;
    // Compact gear: only status that changes decision-making
    const bits = [
      xpPart,
      `${save.coins}c`,
      save.armor > 0 ? `DEF${save.armor}` : null,
      !save.hasSword ? 'NO WPN' : null,
      save.hasKey ? 'KEY' : null,
      save.attrPoints > 0 || save.pendingAttrMajor
        ? `PKG${save.attrPoints}${save.pendingAttrMajor ? '*' : ''}`
        : null,
    ].filter(Boolean);
    this.itemsText?.setText(bits.join(' · '));

    // Dynamic row-1 layout: vitals sit after hearts, never collide
    const heartsRight = 16 + (this.heartsText.width || 0) + 20;
    this.itemsText?.setPosition(heartsRight, 14);
    const itemsMaxW = Math.max(120, GAME_W - heartsRight - 24);
    this.itemsText?.setWordWrapWidth(itemsMaxW, true);

    // Row 2 right — controls + quest (never mixed into vitals)
    const quest =
      save.activeQuestId
        ? 'JOB'
        : save.princessSaved
          ? '★'
          : save.landsCleared.includes('dunjunz')
            ? 'Q'
            : '';
    const hints = [
      '[I] BAG',
      '[J] LOG',
      (save.discoveredMapz?.length ?? 0) > 0 ? '[M] MAP' : null,
      quest || null,
    ]
      .filter(Boolean)
      .join('  ');
    this.hintsText?.setText(hints);
    this.hintsText?.setPosition(GAME_W - 16, 40);

    // Row 2 left — place only; wrap width stops short of hints
    const place = roomTitle
      .replace(/\s*·\s*KINGDOMZ$/i, '')
      .replace(/\s*·\s*SEWERZ$/i, '')
      .replace(/\s*·\s*SURFACE$/i, '')
      .trim();
    this.roomText?.setText(place || roomTitle);
    const hintsW = this.hintsText?.width ?? 160;
    const roomMax = Math.max(160, GAME_W - 32 - hintsW - 28);
    this.roomText?.setWordWrapWidth(roomMax, true);

    if (this.inventoryOpen) this.renderInventory(save);
  };

  private showDialog = (lines: string[]): void => {
    if (!lines?.length) return;
    if (!this.dialogBg?.active || !this.dialogText?.active) return;
    if (this.inventoryOpen) this.setInventoryVisible(false);
    if (this.mapzOpen) this.closeMapzPanel();
    if (this.forjingOpen) this.closeForjingPanel();
    if (this.shopOpen) this.closeShopPanel();
    if (this.rackOpen) this.closeRackPickerPanel();
    if (this.rackRetOpen) this.closeRackReturnPrompt();
    this.dialogLines = lines.filter(
      (l) => l !== undefined && l !== null && String(l).trim() !== '',
    );
    if (!this.dialogLines.length) return;
    this.dialogIndex = 0;
    this.dialogOpen = true;
    this.setDialogChromeVisible(true);
    this.renderDialogLine();
    playSfx('dialog');
    this.game.events.emit('dialog-state', true);
  };

  private setDialogChromeVisible(open: boolean): void {
    this.dialogBg?.setVisible(open);
    this.dialogText?.setVisible(open);
    this.dialogNextHit?.setVisible(open);
    this.dialogCloseHit?.setVisible(open);
    this.dialogNextLabel?.setVisible(open);
    this.dialogCloseLabel?.setVisible(open);
  }

  private renderDialogLine(): void {
    if (!this.dialogText) return;
    const line = this.dialogLines[this.dialogIndex] ?? '';
    const more =
      this.dialogIndex < this.dialogLines.length - 1
        ? '\n\n▼ TAP / NEXT'
        : '\n\n[DONE — NEXT OR CLOSE]';
    this.dialogText.setText(line + more);
  }

  private advanceDialog = (): void => {
    if (!this.dialogOpen) return;
    if (this.dialogIndex < this.dialogLines.length - 1) {
      this.dialogIndex += 1;
      playSfx('dialog');
      this.renderDialogLine();
      return;
    }
    this.closeDialog();
  };

  /** Skip remaining lines and end talk (ESC / CLOSE / pad MENU). */
  private closeDialog = (): void => {
    if (!this.dialogOpen) return;
    this.dialogOpen = false;
    this.dialogIndex = 0;
    this.dialogLines = [];
    this.setDialogChromeVisible(false);
    playSfx('ui_close');
    this.game.events.emit('dialog-state', false);
  };

  /** D-pad bag navigation while inventory open. */
  private onInventoryNav = (dir: 'up' | 'down' | 'left' | 'right'): void => {
    if (!this.inventoryOpen || !this.lastSave) return;
    const bag = this.bagList(this.lastSave);
    if (!bag.length) return;
    const cols = UIScene.BAG_COLS;
    let i = this.invBagSelected;
    if (dir === 'left') i = Math.max(0, i - 1);
    else if (dir === 'right') i = Math.min(bag.length - 1, i + 1);
    else if (dir === 'up') i = Math.max(0, i - cols);
    else if (dir === 'down') i = Math.min(bag.length - 1, i + cols);
    this.invBagSelected = i;
    this.invBagPage = Math.floor(i / UIScene.BAG_PAGE_SIZE);
    this.renderBagGrid(this.lastSave);
  };

  private showToast = (msg: string): void => {
    if (!this.toastText?.active) return;
    this.toastText.setText(msg);
    this.tweens.killTweensOf(this.toastText);
    this.toastText.setAlpha(1);
    this.tweens.add({
      targets: this.toastText,
      alpha: 0,
      delay: 1400,
      duration: 400,
    });
  };

  private setPaused = (paused: boolean): void => {
    if (paused && this.inventoryOpen) this.setInventoryVisible(false);
    if (paused && this.mapzOpen) this.closeMapzPanel();
    if (paused && this.forjingOpen) this.closeForjingPanel();
    if (paused && this.shopOpen) this.closeShopPanel();
    if (paused && this.rackOpen) this.closeRackPickerPanel();
    if (paused && this.rackRetOpen) this.closeRackReturnPrompt();
    this.pauseText?.setVisible(paused);
    this.pauseResumeHit?.setVisible(paused);
    this.pauseTitleHit?.setVisible(paused);
    this.pauseResumeLabel?.setVisible(paused);
    this.pauseTitleLabel?.setVisible(paused);
  };
}
