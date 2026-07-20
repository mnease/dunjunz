import Phaser from 'phaser';
import { COLORS, GAME_W, GAME_H, HUD_H, SCALE } from '../config';
import { ROOMS } from '../data/world';
import {
  itemIconKey,
  playerTextureKeyFromSave,
} from '../systems/appearance';
import { listInventory } from '../systems/inventory';
import { ALL_EQUIP_SLOTS, displayItemName, findInBag } from '../systems/items';
import {
  buildMapzView,
  floorLabel,
  type MapzOpenPayload,
  type MapzViewModel,
} from '../systems/mapz';
import {
  canAfford,
  getShop,
  shopGridDims,
  shopIconTexture,
  type ShopOpenPayload,
} from '../systems/shop';
import { xpProgressInLevel } from '../systems/progression';
import type { EquipSlot, LandId, SaveData } from '../types';

const MAPZ_CELL = 56;
const MAPZ_GAP = 14;
const SHOP_COLS = 4;
const SHOP_CELL = 72;
const SHOP_GAP = 16;

const PANEL_STYLE = {
  fontFamily: '"Press Start 2P", monospace',
  fontSize: '10px',
  color: '#f4f0ff',
  lineSpacing: 8,
} as const;

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

/**
 * HUD + dialog + multi-slot inventory paper-doll.
 */
export class UIScene extends Phaser.Scene {
  private heartsText: Phaser.GameObjects.Text | null = null;
  private itemsText: Phaser.GameObjects.Text | null = null;
  private roomText: Phaser.GameObjects.Text | null = null;
  private dialogBg: Phaser.GameObjects.Rectangle | null = null;
  private dialogText: Phaser.GameObjects.Text | null = null;
  private dialogLines: string[] = [];
  private dialogIndex = 0;
  private dialogOpen = false;
  private pauseText: Phaser.GameObjects.Text | null = null;
  private toastText: Phaser.GameObjects.Text | null = null;

  private invBg: Phaser.GameObjects.Rectangle | null = null;
  private invTitle: Phaser.GameObjects.Text | null = null;
  private invAvatar: Phaser.GameObjects.Image | null = null;
  private invAvatarPlate: Phaser.GameObjects.Rectangle | null = null;
  private invYouLabel: Phaser.GameObjects.Text | null = null;
  private invStats: Phaser.GameObjects.Text | null = null;
  private invAttrs: Phaser.GameObjects.Text | null = null;
  private invBagTitle: Phaser.GameObjects.Text | null = null;
  private invBagDetail: Phaser.GameObjects.Text | null = null;
  private invBagLayer: Phaser.GameObjects.Container | null = null;
  private invBagPieces: Phaser.GameObjects.GameObject[] = [];
  private invBagSelected = 0;
  private invHelp: Phaser.GameObjects.Text | null = null;
  private invSlotFrames: Partial<Record<EquipSlot, Phaser.GameObjects.Image>> = {};
  private invSlotIcons: Partial<Record<EquipSlot, Phaser.GameObjects.Image>> = {};
  private invSlotLabels: Partial<Record<EquipSlot, Phaser.GameObjects.Text>> = {};

  private inventoryOpen = false;
  private mapzOpen = false;
  private forjingOpen = false;
  private shopOpen = false;
  private lastSave: SaveData | null = null;
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
  private forjingText: Phaser.GameObjects.Text | null = null;

  private shopBg: Phaser.GameObjects.Rectangle | null = null;
  private shopTitle: Phaser.GameObjects.Text | null = null;
  private shopCoins: Phaser.GameObjects.Text | null = null;
  private shopDetail: Phaser.GameObjects.Text | null = null;
  private shopHelp: Phaser.GameObjects.Text | null = null;
  private shopLayer: Phaser.GameObjects.Container | null = null;
  private shopPieces: Phaser.GameObjects.GameObject[] = [];
  private shopPayload: ShopOpenPayload | null = null;
  private shopSelected = 0;

  constructor() {
    super({ key: 'UI', active: false });
  }

  create(): void {
    this.resetDialogVisuals();
    this.inventoryOpen = false;
    this.mapzOpen = false;
    this.forjingOpen = false;
    this.shopOpen = false;
    if (!this.chromeBuilt || !this.dialogBg?.active) {
      this.buildChrome();
      this.chromeBuilt = true;
    } else {
      this.dialogBg?.setVisible(false);
      this.dialogText?.setVisible(false);
      this.pauseText?.setVisible(false);
      this.toastText?.setAlpha(0);
      this.setInventoryVisible(false);
      this.ensureMapzChrome();
      this.closeMapzPanel();
      this.setForjingVisible(false, '');
      this.ensureShopChrome();
      this.closeShopPanel();
    }
    this.bindGameEvents();
  }

  private buildChrome(): void {
    this.add.rectangle(GAME_W / 2, HUD_H / 2, GAME_W, HUD_H, 0x0a0c10, 0.92);
    this.add
      .rectangle(GAME_W / 2, HUD_H - 1, GAME_W, 2, COLORS.green, 0.7)
      .setOrigin(0.5, 1);

    this.heartsText = this.add.text(16, 16, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '12px',
      color: '#ff6b9d',
    });
    this.itemsText = this.add.text(200, 16, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '9px',
      color: '#ffc857',
    });
    this.roomText = this.add
      .text(GAME_W - 16, 16, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#8b93a7',
        align: 'right',
      })
      .setOrigin(1, 0);

    this.dialogBg = this.add
      .rectangle(GAME_W / 2, 480, GAME_W - 48, 120, 0x12161f, 0.95)
      .setStrokeStyle(3, COLORS.green)
      .setVisible(false)
      .setDepth(100)
      .setScrollFactor(0);
    this.dialogText = this.add
      .text(48, 440, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '11px',
        color: '#f4f0ff',
        wordWrap: { width: GAME_W - 96 },
        lineSpacing: 8,
      })
      .setVisible(false)
      .setDepth(101)
      .setScrollFactor(0);

    this.buildInventoryPanel();
    this.buildMapzPanel();
    this.buildForjingPanel();
    this.buildShopPanel();

    this.pauseText = this.add
      .text(GAME_W / 2, 300, 'PAUSED\n\nESC RESUME  ·  M TITLE', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '14px',
        color: '#7dffb3',
        align: 'center',
        backgroundColor: '#0a0c10cc',
        padding: { x: 20, y: 16 },
      })
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(130)
      .setScrollFactor(0);

    this.toastText = this.add
      .text(GAME_W / 2, 100, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '10px',
        color: '#ffc857',
        backgroundColor: '#0a0c10cc',
        padding: { x: 10, y: 8 },
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
          fontSize: '7px',
          color: '#7dffb3',
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
    const d = 140;
    this.forjingBg = this.add
      .rectangle(GAME_W / 2, GAME_H / 2 + 8, GAME_W - 48, GAME_H - 100, 0x0a0c10, 0.96)
      .setStrokeStyle(3, COLORS.gold)
      .setScrollFactor(0)
      .setDepth(d)
      .setVisible(false);
    this.forjingText = this.add
      .text(GAME_W / 2, GAME_H / 2, '', {
        ...PANEL_STYLE,
        fontSize: '10px',
        color: '#ffc857',
        align: 'center',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(d + 1)
      .setVisible(false);
  }

  private buildShopPanel(): void {
    const d = 210;
    this.clearShopPieces();
    this.shopBg?.destroy();
    this.shopTitle?.destroy();
    this.shopCoins?.destroy();
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
      .text(GAME_W / 2, HUD_H + 16, 'TINKERER SHOP', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '13px',
        color: '#ffc857',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(d + 1)
      .setVisible(false);

    this.shopCoins = this.add
      .text(GAME_W / 2, HUD_H + 40, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '10px',
        color: '#7dffb3',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(d + 1)
      .setVisible(false);

    this.shopLayer = this.add.container(0, 0).setDepth(d + 2).setScrollFactor(0);
    this.shopLayer.setVisible(false);

    this.shopDetail = this.add
      .text(40, GAME_H - 110, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '9px',
        color: '#f4f0ff',
        lineSpacing: 7,
        wordWrap: { width: GAME_W - 80 },
      })
      .setScrollFactor(0)
      .setDepth(d + 1)
      .setVisible(false);

    this.shopHelp = this.add
      .text(
        GAME_W / 2,
        GAME_H - 28,
        'ARROWS SELECT  ·  ENTER / B BUY  ·  ESC / E CLOSE',
        {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '7px',
          color: '#ffc857',
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
      .text(GAME_W / 2, 48, 'INVENTORY / CHARACTER', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '11px',
        color: '#7dffb3',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(d + 1);

    // Compact paper-doll
    this.invAvatarPlate = this.add
      .rectangle(78, 150, 100, 120, 0x12161f, 1)
      .setStrokeStyle(2, COLORS.green)
      .setScrollFactor(0)
      .setDepth(d + 1);

    this.invAvatar = this.add
      .image(78, 145, 'player')
      .setScale(SCALE * 2.2)
      .setScrollFactor(0)
      .setDepth(d + 2);

    this.invYouLabel = this.add
      .text(78, 210, 'YOU', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '7px',
        color: '#8b93a7',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(d + 2);

    // Equip slots — 2 columns × 5 rows, right of avatar
    const slots: EquipSlot[] = [...ALL_EQUIP_SLOTS];
    const startX = 200;
    const startY = 78;
    const colW = 200;
    const rowH = 34;
    slots.forEach((slot, i) => {
      const col = i < 5 ? 0 : 1;
      const row = i % 5;
      const x = startX + col * colW;
      const y = startY + row * rowH;
      this.invSlotFrames[slot] = this.add
        .image(x, y, 'slot_frame')
        .setScale(0.95)
        .setScrollFactor(0)
        .setDepth(d + 1);
      this.invSlotIcons[slot] = this.add
        .image(x, y, 'icon_empty')
        .setScale(1.15)
        .setScrollFactor(0)
        .setDepth(d + 2);
      this.invSlotLabels[slot] = this.add
        .text(x + 28, y - 8, `${slot.toUpperCase()} [${SLOT_KEYS[slot]}]\n(empty)`, {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '6px',
          color: '#c5cde0',
          lineSpacing: 4,
        })
        .setScrollFactor(0)
        .setDepth(d + 2);
    });

    // Stats under avatar
    this.invStats = this.add
      .text(28, 230, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '7px',
        color: '#ffc857',
        lineSpacing: 5,
      })
      .setScrollFactor(0)
      .setDepth(d + 2);

    this.invAttrs = this.add
      .text(28, 300, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '7px',
        color: '#7dffb3',
        lineSpacing: 5,
      })
      .setScrollFactor(0)
      .setDepth(d + 2);

    // BAG grid section (full width under equip row)
    this.invBagTitle = this.add
      .text(GAME_W / 2, 268, 'BAG', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '10px',
        color: '#ffc857',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(d + 1);

    this.invBagLayer = this.add
      .container(0, 0)
      .setScrollFactor(0)
      .setDepth(d + 2);

    this.invBagDetail = this.add
      .text(40, GAME_H - 78, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#c5cde0',
        wordWrap: { width: GAME_W - 80 },
        lineSpacing: 5,
      })
      .setScrollFactor(0)
      .setDepth(d + 2);

    this.invHelp = this.add
      .text(
        GAME_W / 2,
        GAME_H - 28,
        'CLICK BAG CELL · W O H C L F G N R K EQUIP · U USE · I/ESC',
        {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '6px',
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

  private setInventoryVisible(open: boolean): void {
    this.inventoryOpen = open;
    this.setInvPieceVisible(this.invBg, open);
    this.setInvPieceVisible(this.invTitle, open);
    this.setInvPieceVisible(this.invAvatarPlate, open);
    this.setInvPieceVisible(this.invAvatar, open);
    this.setInvPieceVisible(this.invYouLabel, open);
    this.setInvPieceVisible(this.invStats, open);
    this.setInvPieceVisible(this.invAttrs, open);
    this.setInvPieceVisible(this.invBagTitle, open);
    this.setInvPieceVisible(this.invBagDetail, open);
    this.setInvPieceVisible(this.invHelp, open);
    this.invBagLayer?.setVisible(open);
    if (!open) this.clearInvBagPieces();
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
    this.game.events.off('toast', this.showToast, this);
    this.game.events.off('pause-ui', this.setPaused, this);
    this.game.events.off('ui-reset', this.onUiReset, this);
    this.game.events.off('inventory-toggle', this.onInventoryToggle, this);
    this.game.events.off('inventory-refresh', this.onInventoryRefresh, this);
    this.game.events.off('mapz-toggle', this.onMapzToggle, this);
    this.game.events.off('mapz-nav', this.onMapzNav, this);
    this.game.events.off('forjing-toggle', this.onForjingToggle, this);
    this.game.events.off('forjing-refresh', this.onForjingRefresh, this);
    this.game.events.off('shop-toggle', this.onShopToggle, this);
    this.game.events.off('shop-select', this.onShopSelect, this);
    this.game.events.off('shop-refresh', this.onShopRefresh, this);

    this.game.events.on('hud-update', this.refreshHud, this);
    this.game.events.on('dialog-show', this.showDialog, this);
    this.game.events.on('toast', this.showToast, this);
    this.game.events.on('pause-ui', this.setPaused, this);
    this.game.events.on('ui-reset', this.onUiReset, this);
    this.game.events.on('inventory-toggle', this.onInventoryToggle, this);
    this.game.events.on('inventory-refresh', this.onInventoryRefresh, this);
    this.game.events.on('mapz-toggle', this.onMapzToggle, this);
    this.game.events.on('mapz-nav', this.onMapzNav, this);
    this.game.events.on('forjing-toggle', this.onForjingToggle, this);
    this.game.events.on('forjing-refresh', this.onForjingRefresh, this);
    this.game.events.on('shop-toggle', this.onShopToggle, this);
    this.game.events.on('shop-select', this.onShopSelect, this);
    this.game.events.on('shop-refresh', this.onShopRefresh, this);

    if (!this.bound) {
      this.bound = true;
      this.input.keyboard?.on('keydown-ENTER', this.onEnterKey, this);
      this.input.keyboard?.on('keydown-SPACE', this.onSpaceKey, this);
    }

    this.events.once('shutdown', () => {
      this.game.events.off('hud-update', this.refreshHud, this);
      this.game.events.off('dialog-show', this.showDialog, this);
      this.game.events.off('toast', this.showToast, this);
      this.game.events.off('pause-ui', this.setPaused, this);
      this.game.events.off('ui-reset', this.onUiReset, this);
      this.game.events.off('inventory-toggle', this.onInventoryToggle, this);
      this.game.events.off('inventory-refresh', this.onInventoryRefresh, this);
      this.game.events.off('mapz-toggle', this.onMapzToggle, this);
      this.game.events.off('mapz-nav', this.onMapzNav, this);
      this.game.events.off('forjing-toggle', this.onForjingToggle, this);
      this.game.events.off('forjing-refresh', this.onForjingRefresh, this);
      this.game.events.off('shop-toggle', this.onShopToggle, this);
      this.game.events.off('shop-select', this.onShopSelect, this);
      this.game.events.off('shop-refresh', this.onShopRefresh, this);
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
    this.setForjingVisible(false, '');
    this.closeShopPanel();
    this.pauseText?.setVisible(false);
    this.toastText?.setAlpha(0);
    this.game.events.emit('dialog-state', false);
    this.game.events.emit('inventory-state', false);
    this.game.events.emit('mapz-state', false);
    this.game.events.emit('forjing-state', false);
    this.game.events.emit('shop-state', false);
  };

  private resetDialogVisuals(): void {
    this.dialogOpen = false;
    this.dialogLines = [];
    this.dialogIndex = 0;
    this.dialogBg?.setVisible(false);
    this.dialogText?.setVisible(false);
  }

  private onInventoryToggle = (save: SaveData): void => {
    if (this.dialogOpen || this.mapzOpen || this.forjingOpen || this.shopOpen) {
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

    // Support legacy string payloads (no-op graphic fallback title)
    if (!payload || typeof payload === 'string') {
      if (this.lastSave) {
        this.mapzPayload = {
          save: this.lastSave,
          land: 'surface',
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

    // Corridor links first (under rooms)
    for (const c of view.cells) {
      if (!c.visited && !c.current) continue;
      const p = cellPos(c.mapX, c.mapY);
      if (c.east) {
        const link = this.add
          .rectangle(
            p.x + MAPZ_CELL / 2 + MAPZ_GAP / 2,
            p.y,
            MAPZ_GAP + 4,
            10,
            info.border,
            0.85,
          )
          .setScrollFactor(0);
        this.mapzLayer.add(link);
        this.mapzPieces.push(link);
      }
      if (c.north) {
        const link = this.add
          .rectangle(
            p.x,
            p.y - MAPZ_CELL / 2 - MAPZ_GAP / 2,
            10,
            MAPZ_GAP + 4,
            info.border,
            0.85,
          )
          .setScrollFactor(0);
        this.mapzLayer.add(link);
        this.mapzPieces.push(link);
      }
    }

    for (const c of view.cells) {
      const p = cellPos(c.mapX, c.mapY);
      const fill = c.current
        ? Phaser.Display.Color.IntegerToColor(info.color).brighten(20).color
        : c.visited
          ? info.color
          : info.fog;
      const border = c.current ? COLORS.gold : c.visited ? info.border : 0x3a4250;

      const room = this.add
        .rectangle(p.x, p.y, MAPZ_CELL, MAPZ_CELL, fill, 1)
        .setStrokeStyle(c.current ? 3 : 2, border)
        .setScrollFactor(0);
      this.mapzLayer.add(room);
      this.mapzPieces.push(room);

      // Inner floor plate
      const inner = this.add
        .rectangle(p.x, p.y + 2, MAPZ_CELL - 12, MAPZ_CELL - 16, 0x000000, 0.18)
        .setScrollFactor(0);
      this.mapzLayer.add(inner);
      this.mapzPieces.push(inner);

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
          .text(p.x, p.y + (c.current ? 10 : 0), c.shortTitle, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '7px',
            color: '#f4f0ff',
            align: 'center',
            wordWrap: { width: MAPZ_CELL - 8 },
          })
          .setOrigin(0.5)
          .setScrollFactor(0);
        this.mapzLayer.add(label);
        this.mapzPieces.push(label);

        if (c.stairsDown || c.stairsUp) {
          const stair = this.add
            .text(p.x, p.y - 16, c.stairsDown ? '▼' : '▲', {
              fontFamily: 'monospace',
              fontSize: '12px',
              color: '#ff6b9d',
            })
            .setOrigin(0.5)
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

  private onForjingToggle = (text: string): void => {
    if (this.dialogOpen || this.inventoryOpen || this.mapzOpen || this.shopOpen) {
      if (this.forjingOpen) this.setForjingVisible(false, '');
      return;
    }
    if (this.forjingOpen) {
      this.setForjingVisible(false, '');
      return;
    }
    this.setForjingVisible(true, text || 'FORJING');
  };

  private onForjingRefresh = (text: string): void => {
    if (this.forjingOpen && this.forjingText) {
      this.forjingText.setText(text);
    }
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
    this.openShopGraphic();
  };

  private onShopSelect = (index: number): void => {
    if (!this.shopOpen || !this.shopPayload) return;
    const shop = getShop(this.shopPayload.shopId);
    if (!shop?.stock.length) return;
    this.shopSelected = Math.max(0, Math.min(index, shop.stock.length - 1));
    this.renderShopGrid();
  };

  private onShopRefresh = (save: SaveData): void => {
    if (!this.shopOpen || !this.shopPayload) return;
    this.shopPayload = { ...this.shopPayload, save };
    this.lastSave = save;
    this.renderShopGrid();
  };

  private openShopGraphic(): void {
    if (!this.shopPayload) return;
    this.ensureShopChrome();
    this.shopOpen = true;
    this.shopBg?.setVisible(true).setDepth(210);
    this.shopTitle?.setVisible(true).setDepth(211);
    this.shopCoins?.setVisible(true).setDepth(211);
    this.shopDetail?.setVisible(true).setDepth(211);
    this.shopHelp?.setVisible(true).setDepth(211);
    this.shopLayer?.setVisible(true).setDepth(212);
    this.renderShopGrid();
    this.game.events.emit('shop-state', true);
  }

  private closeShopPanel(): void {
    this.shopOpen = false;
    this.clearShopPieces();
    this.shopBg?.setVisible(false);
    this.shopTitle?.setVisible(false);
    this.shopCoins?.setVisible(false);
    this.shopDetail?.setVisible(false);
    this.shopHelp?.setVisible(false);
    this.shopLayer?.setVisible(false);
    this.game.events.emit('shop-state', false);
  }

  private renderShopGrid(): void {
    if (!this.shopPayload || !this.shopLayer) return;
    this.clearShopPieces();
    const shop = getShop(this.shopPayload.shopId);
    const save = this.shopPayload.save;
    if (!shop) {
      this.shopDetail?.setText('NO SHOP HERE.');
      return;
    }

    this.shopTitle?.setText(shop.name);
    this.shopCoins?.setText(`YOUR COINS: ${save.coins}c`);

    const stock = shop.stock;
    const { cols } = shopGridDims(stock.length, SHOP_COLS);
    const rows = Math.ceil(stock.length / cols);
    const gridW = cols * SHOP_CELL + (cols - 1) * SHOP_GAP;
    const gridH = rows * SHOP_CELL + (rows - 1) * SHOP_GAP;
    const originX = GAME_W / 2 - gridW / 2 + SHOP_CELL / 2;
    const originY = HUD_H + 78 + SHOP_CELL / 2;
    void gridH;

    stock.forEach((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = originX + col * (SHOP_CELL + SHOP_GAP);
      const y = originY + row * (SHOP_CELL + SHOP_GAP);
      const selected = i === this.shopSelected;
      const afford = canAfford(save, item);

      const frame = this.add
        .rectangle(x, y, SHOP_CELL, SHOP_CELL, 0x12161f, 1)
        .setStrokeStyle(
          selected ? 3 : 2,
          selected ? COLORS.gold : afford ? COLORS.green : 0x5a4030,
        )
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true });
      frame.on('pointerdown', () => {
        this.shopSelected = i;
        this.renderShopGrid();
        this.game.events.emit('shop-cursor', i);
      });
      this.shopLayer!.add(frame);
      this.shopPieces.push(frame);

      const iconKey = shopIconTexture(item);
      const tex = this.textures.exists(iconKey) ? iconKey : 'icon_empty';
      const icon = this.add
        .image(x, y - 8, tex)
        .setScale(1.6)
        .setScrollFactor(0)
        .setAlpha(afford ? 1 : 0.45);
      this.shopLayer!.add(icon);
      this.shopPieces.push(icon);

      const priceColor = afford ? '#7dffb3' : '#e74c3c';
      const price = this.add
        .text(x, y + 22, `${item.price}c`, {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '8px',
          color: priceColor,
        })
        .setOrigin(0.5)
        .setScrollFactor(0);
      this.shopLayer!.add(price);
      this.shopPieces.push(price);
    });

    const sel = stock[this.shopSelected] ?? stock[0];
    if (sel) {
      const afford = canAfford(save, sel);
      this.shopDetail?.setText(
        [
          sel.name,
          sel.description,
          afford
            ? `BUY FOR ${sel.price}c  (you have ${save.coins}c)`
            : `NEED ${sel.price}c  (you have ${save.coins}c)`,
        ].join('\n'),
      );
      this.shopDetail?.setColor(afford ? '#f4f0ff' : '#ff8a8a');
    }
  }

  private setForjingVisible(open: boolean, text: string): void {
    this.forjingOpen = open;
    this.forjingBg?.setVisible(open);
    this.forjingText?.setVisible(open);
    if (open && this.forjingText) this.forjingText.setText(text);
    this.game.events.emit('forjing-state', open);
  }

  private renderInventory(save: SaveData): void {
    const look = playerTextureKeyFromSave(save);
    if (this.textures.exists(look) && this.invAvatar) {
      this.invAvatar.setTexture(look);
    }

    for (const slot of ALL_EQUIP_SLOTS) {
      const uid = save.equipped[slot];
      const inst = uid ? findInBag(save, uid) : undefined;
      const icon = this.invSlotIcons[slot];
      const label = this.invSlotLabels[slot];
      if (icon) {
        const tid = inst?.templateId;
        const k = itemIconKey(tid);
        icon.setTexture(this.textures.exists(k) ? k : 'icon_empty');
      }
      if (label) {
        const name = inst ? displayItemName(inst) : '(empty)';
        label.setText(
          `${slot.toUpperCase()} [${SLOT_KEYS[slot]}]\n${name}`,
        );
      }
    }

    this.invStats?.setText(
      [
        `COINS ${save.coins}c`,
        `HP ${save.hp}/${save.maxHp}`,
        `DEF ${save.armor}`,
        `WPN ${save.hasSword ? 'Y' : '-'} KEY ${save.hasKey ? 'Y' : '-'}`,
      ].join('\n'),
    );

    this.invAttrs?.setText(
      [
        `PTS ${save.attrPoints}`,
        `1STR${save.attrs.str} 2DEX${save.attrs.dex}`,
        `3VIT${save.attrs.vit} 4INT${save.attrs.int}`,
        `5LCK${save.attrs.lck}`,
      ].join('\n'),
    );

    this.renderBagGrid(save);
  }

  private renderBagGrid(save: SaveData): void {
    if (!this.invBagLayer) return;
    this.clearInvBagPieces();

    const bag = listInventory(save);
    this.invBagTitle?.setText(`BAG (${bag.length})`);

    if (!bag.length) {
      const empty = this.add
        .text(GAME_W / 2, 340, '(empty — loot creeps & chests)', {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '8px',
          color: '#6a738a',
        })
        .setOrigin(0.5)
        .setScrollFactor(0);
      this.invBagLayer.add(empty);
      this.invBagPieces.push(empty);
      this.invBagDetail?.setText('PICK UP GEAR TO FILL THE BAG GRID.');
      return;
    }

    if (this.invBagSelected >= bag.length) this.invBagSelected = 0;

    const cols = 8;
    const cell = 48;
    const gap = 8;
    const rows = Math.ceil(bag.length / cols);
    const gridW = cols * cell + (cols - 1) * gap;
    const originX = GAME_W / 2 - gridW / 2 + cell / 2;
    const originY = 300 + cell / 2;

    bag.forEach((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      // Cap visual rows if too many (scroll would be later)
      if (row > 3) return;
      const x = originX + col * (cell + gap);
      const y = originY + row * (cell + gap);
      const selected = i === this.invBagSelected;
      const border = selected
        ? COLORS.gold
        : item.equipped
          ? COLORS.green
          : 0x5c4d7a;

      const frame = this.add
        .rectangle(x, y, cell, cell, 0x12161f, 1)
        .setStrokeStyle(selected ? 3 : 2, border)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true });
      frame.on('pointerdown', () => {
        this.invBagSelected = i;
        this.renderBagGrid(save);
        // Double-activate: emit use/equip to game
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
        .image(x, y - 4, tex)
        .setScale(1.4)
        .setScrollFactor(0)
        .setAlpha(item.equipped ? 1 : 0.95);
      this.invBagLayer!.add(icon);
      this.invBagPieces.push(icon);

      if (item.count > 1) {
        const cnt = this.add
          .text(x + 14, y + 12, `x${item.count}`, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '6px',
            color: '#ffc857',
          })
          .setOrigin(0.5)
          .setScrollFactor(0);
        this.invBagLayer!.add(cnt);
        this.invBagPieces.push(cnt);
      }

      if (item.equipped) {
        const tag = this.add
          .text(x, y + 16, 'E', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '6px',
            color: '#7dffb3',
          })
          .setOrigin(0.5)
          .setScrollFactor(0);
        this.invBagLayer!.add(tag);
        this.invBagPieces.push(tag);
      }
    });

    if (rows > 4) {
      const more = this.add
        .text(GAME_W / 2, 300 + 4 * (cell + gap) + 8, `+${bag.length - 32} more`, {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '7px',
          color: '#6a738a',
        })
        .setOrigin(0.5)
        .setScrollFactor(0);
      this.invBagLayer.add(more);
      this.invBagPieces.push(more);
    }

    const sel = bag[this.invBagSelected];
    if (sel) {
      const bits = [
        sel.name + (sel.count > 1 ? ` x${sel.count}` : ''),
        sel.blurb,
      ];
      if (sel.equipped) bits.push('[EQUIPPED]');
      else if (sel.usable) bits.push('CLICK AGAIN / U TO USE');
      else if (sel.slot) bits.push(`CLICK TO EQUIP · SLOT ${sel.slot.toUpperCase()}`);
      this.invBagDetail?.setText(bits.join('\n'));
    }

    void rows;
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
    const filled = Math.max(0, Math.ceil(save.hp / 2));
    const empty = Math.max(0, Math.ceil(save.maxHp / 2) - filled);
    this.heartsText.setText(`${'♥'.repeat(filled)}${'♡'.repeat(empty)}`);

    const band = xpProgressInLevel(save.xp);
    const xpPart =
      band.need > 0
        ? `LV${save.level} ${band.into}/${band.need}XP`
        : `LV${save.level} MAX`;
    const gear = [
      save.hasSword ? 'WPN' : null,
      save.hasKey ? 'KEY' : null,
      save.armor > 0 ? `DEF${save.armor}` : null,
      save.attrPoints > 0 ? `PTS${save.attrPoints}` : null,
    ]
      .filter(Boolean)
      .join(' ');
    this.itemsText?.setText(
      `${xpPart}  ${save.coins}c${gear ? '  ' + gear : ''}`,
    );
    const questTag = save.princessSaved
      ? '  ★'
      : save.landsCleared.includes('dunjunz')
        ? '  Q'
        : '';
    const mapzHint =
      (save.discoveredMapz?.length ?? 0) > 0 ? '  [M MAPZ]' : '';
    this.roomText?.setText(roomTitle + '  [I]' + mapzHint + questTag);
    if (this.inventoryOpen) this.renderInventory(save);
  };

  private showDialog = (lines: string[]): void => {
    if (!lines?.length) return;
    if (!this.dialogBg?.active || !this.dialogText?.active) return;
    if (this.inventoryOpen) this.setInventoryVisible(false);
    if (this.mapzOpen) this.closeMapzPanel();
    if (this.forjingOpen) this.setForjingVisible(false, '');
    if (this.shopOpen) this.closeShopPanel();
    this.dialogLines = lines.filter(
      (l) => l !== undefined && l !== null && String(l).trim() !== '',
    );
    if (!this.dialogLines.length) return;
    this.dialogIndex = 0;
    this.dialogOpen = true;
    this.dialogBg.setVisible(true);
    this.dialogText.setVisible(true);
    this.renderDialogLine();
    this.game.events.emit('dialog-state', true);
  };

  private renderDialogLine(): void {
    if (!this.dialogText) return;
    const line = this.dialogLines[this.dialogIndex] ?? '';
    const more =
      this.dialogIndex < this.dialogLines.length - 1
        ? '\n\n▼ ENTER'
        : '\n\n[ENTER]';
    this.dialogText.setText(line + more);
  }

  private advanceDialog(): void {
    if (!this.dialogOpen) return;
    if (this.dialogIndex < this.dialogLines.length - 1) {
      this.dialogIndex += 1;
      this.renderDialogLine();
      return;
    }
    this.dialogOpen = false;
    this.dialogBg?.setVisible(false);
    this.dialogText?.setVisible(false);
    this.game.events.emit('dialog-state', false);
  }

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
    if (paused && this.forjingOpen) this.setForjingVisible(false, '');
    if (paused && this.shopOpen) this.closeShopPanel();
    this.pauseText?.setVisible(paused);
  };
}
