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
import { xpProgressInLevel } from '../systems/progression';
import type { EquipSlot, LandId, SaveData } from '../types';

const MAPZ_CELL = 56;
const MAPZ_GAP = 14;

const PANEL_STYLE = {
  fontFamily: '"Press Start 2P", monospace',
  fontSize: '10px',
  color: '#f4f0ff',
  lineSpacing: 8,
} as const;

const SLOT_KEYS: Record<EquipSlot, string> = {
  weapon: 'W',
  helmet: 'H',
  breastplate: 'C',
  greaves: 'L',
  shoes: 'F',
  gloves: 'G',
  amulet: 'N',
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
  private invBagText: Phaser.GameObjects.Text | null = null;
  private invHelp: Phaser.GameObjects.Text | null = null;
  private invSlotFrames: Partial<Record<EquipSlot, Phaser.GameObjects.Image>> = {};
  private invSlotIcons: Partial<Record<EquipSlot, Phaser.GameObjects.Image>> = {};
  private invSlotLabels: Partial<Record<EquipSlot, Phaser.GameObjects.Text>> = {};

  private inventoryOpen = false;
  private mapzOpen = false;
  private forjingOpen = false;
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

  constructor() {
    super({ key: 'UI', active: false });
  }

  create(): void {
    this.resetDialogVisuals();
    this.inventoryOpen = false;
    this.mapzOpen = false;
    this.forjingOpen = false;
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

  private buildInventoryPanel(): void {
    const d = 120;
    this.invBg = this.add
      .rectangle(GAME_W / 2, GAME_H / 2 + 8, GAME_W - 32, GAME_H - 68, 0x0a0c10, 0.96)
      .setStrokeStyle(3, COLORS.gold)
      .setScrollFactor(0)
      .setDepth(d);

    this.invTitle = this.add
      .text(GAME_W / 2, 52, 'INVENTORY / CHARACTER', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '12px',
        color: '#7dffb3',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(d + 1);

    this.invAvatarPlate = this.add
      .rectangle(130, 200, 160, 200, 0x12161f, 1)
      .setStrokeStyle(2, COLORS.green)
      .setScrollFactor(0)
      .setDepth(d + 1);

    this.invAvatar = this.add
      .image(130, 190, 'player')
      .setScale(SCALE * 3)
      .setScrollFactor(0)
      .setDepth(d + 2);

    this.invYouLabel = this.add
      .text(130, 300, 'YOU', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#8b93a7',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(d + 2);

    // 2-column slot grid
    const slots: EquipSlot[] = [...ALL_EQUIP_SLOTS];
    const startX = 280;
    const startY = 100;
    const colW = 220;
    const rowH = 52;
    slots.forEach((slot, i) => {
      const col = i < 4 ? 0 : 1;
      const row = i % 4;
      const x = startX + col * colW;
      const y = startY + row * rowH;
      this.invSlotFrames[slot] = this.add
        .image(x, y, 'slot_frame')
        .setScale(1.15)
        .setScrollFactor(0)
        .setDepth(d + 1);
      this.invSlotIcons[slot] = this.add
        .image(x, y, 'icon_empty')
        .setScale(1.35)
        .setScrollFactor(0)
        .setDepth(d + 2);
      this.invSlotLabels[slot] = this.add
        .text(x + 36, y - 12, `${slot.toUpperCase()} [${SLOT_KEYS[slot]}]\n(empty)`, {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '7px',
          color: '#c5cde0',
          lineSpacing: 5,
        })
        .setScrollFactor(0)
        .setDepth(d + 2);
    });

    this.invStats = this.add
      .text(48, 330, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#ffc857',
        lineSpacing: 6,
      })
      .setScrollFactor(0)
      .setDepth(d + 2);

    this.invAttrs = this.add
      .text(280, 330, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#7dffb3',
        lineSpacing: 6,
      })
      .setScrollFactor(0)
      .setDepth(d + 2);

    this.invBagText = this.add
      .text(48, 420, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '7px',
        color: '#c5cde0',
        wordWrap: { width: GAME_W - 96 },
        lineSpacing: 5,
      })
      .setScrollFactor(0)
      .setDepth(d + 2);

    this.invHelp = this.add
      .text(
        GAME_W / 2,
        GAME_H - 32,
        'W H C L F G N K  ·  1-5 ATTR  ·  U POTION  ·  I/ESC',
        {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '7px',
          color: '#7dffb3',
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(d + 2);

    this.setInventoryVisible(false);
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
    this.setInvPieceVisible(this.invBagText, open);
    this.setInvPieceVisible(this.invHelp, open);
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
    this.pauseText?.setVisible(false);
    this.toastText?.setAlpha(0);
    this.game.events.emit('dialog-state', false);
    this.game.events.emit('inventory-state', false);
    this.game.events.emit('mapz-state', false);
    this.game.events.emit('forjing-state', false);
  };

  private resetDialogVisuals(): void {
    this.dialogOpen = false;
    this.dialogLines = [];
    this.dialogIndex = 0;
    this.dialogBg?.setVisible(false);
    this.dialogText?.setVisible(false);
  }

  private onInventoryToggle = (save: SaveData): void => {
    if (this.dialogOpen || this.mapzOpen || this.forjingOpen) return;
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
    // Opening blocked only by inventory / forjing (dialog ok after pickup)
    if (this.inventoryOpen || this.forjingOpen) return;
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
    if (this.dialogOpen || this.inventoryOpen || this.mapzOpen) {
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
        `COINS  ${save.coins}c`,
        `HP     ${save.hp}/${save.maxHp}`,
        `DEF    ${save.armor}`,
        `WEAPON ${save.hasSword ? 'ready' : 'none'}`,
        `KEY    ${save.hasKey ? 'ready' : 'none'}`,
      ].join('\n'),
    );

    this.invAttrs?.setText(
      [
        `ATTR PTS: ${save.attrPoints}`,
        `1 STR ${save.attrs.str}`,
        `2 DEX ${save.attrs.dex}`,
        `3 VIT ${save.attrs.vit}`,
        `4 INT ${save.attrs.int}`,
        `5 LCK ${save.attrs.lck}`,
      ].join('\n'),
    );

    const bag = listInventory(save);
    if (!bag.length) {
      this.invBagText?.setText('BAG: (empty)');
    } else {
      const lines = ['BAG:'];
      for (const b of bag.slice(0, 8)) {
        const tag = b.equipped ? ' [WORN]' : b.usable ? ' [U]' : '';
        lines.push(` ${b.name} x${b.count}${tag}`);
      }
      if (bag.length > 8) lines.push(` ...+${bag.length - 8} more`);
      this.invBagText?.setText(lines.join('\n'));
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
    this.pauseText?.setVisible(paused);
  };
}
