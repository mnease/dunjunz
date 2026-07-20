import Phaser from 'phaser';
import { COLORS, GAME_W, GAME_H, HUD_H, SCALE } from '../config';
import {
  itemIconKey,
  playerTextureKeyFromSave,
} from '../systems/appearance';
import {
  formatInventoryPanel,
  getItemInfo,
  listInventory,
} from '../systems/inventory';
import { xpProgressInLevel } from '../systems/progression';
import type { SaveData } from '../types';

/**
 * HUD + dialog + graphic inventory overlay. Runs parallel to Game.
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

  // Inventory graphic layout
  private invRoot: Phaser.GameObjects.Container | null = null;
  private invBg: Phaser.GameObjects.Rectangle | null = null;
  private invTitle: Phaser.GameObjects.Text | null = null;
  private invStats: Phaser.GameObjects.Text | null = null;
  private invBagText: Phaser.GameObjects.Text | null = null;
  private invHelp: Phaser.GameObjects.Text | null = null;
  private invAvatar: Phaser.GameObjects.Image | null = null;
  private invAvatarPlate: Phaser.GameObjects.Rectangle | null = null;
  private invArmorSlot: Phaser.GameObjects.Image | null = null;
  private invAmuletSlot: Phaser.GameObjects.Image | null = null;
  private invArmorIcon: Phaser.GameObjects.Image | null = null;
  private invAmuletIcon: Phaser.GameObjects.Image | null = null;
  private invArmorLabel: Phaser.GameObjects.Text | null = null;
  private invAmuletLabel: Phaser.GameObjects.Text | null = null;
  private invSlotHints: Phaser.GameObjects.Text | null = null;
  private invYouLabel: Phaser.GameObjects.Text | null = null;

  private inventoryOpen = false;
  private lastSave: SaveData | null = null;
  private bound = false;
  private chromeBuilt = false;

  constructor() {
    super({ key: 'UI', active: false });
  }

  create(): void {
    this.resetDialogVisuals();
    this.inventoryOpen = false;

    if (!this.chromeBuilt || !this.dialogBg?.active) {
      this.buildChrome();
      this.chromeBuilt = true;
    } else {
      this.dialogBg?.setVisible(false);
      this.dialogText?.setVisible(false);
      this.pauseText?.setVisible(false);
      this.toastText?.setAlpha(0);
      this.setInventoryVisible(false);
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

    this.itemsText = this.add.text(220, 16, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '10px',
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

  private buildInventoryPanel(): void {
    const depth = 120;
    this.invBg = this.add
      .rectangle(GAME_W / 2, GAME_H / 2 + 8, GAME_W - 36, GAME_H - 72, 0x0a0c10, 0.96)
      .setStrokeStyle(3, COLORS.gold)
      .setScrollFactor(0)
      .setDepth(depth);

    this.invTitle = this.add
      .text(GAME_W / 2, 56, 'INVENTORY', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '14px',
        color: '#7dffb3',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depth + 1);

    // Left: avatar stage
    this.invAvatarPlate = this.add
      .rectangle(160, 220, 180, 220, 0x12161f, 1)
      .setStrokeStyle(2, COLORS.green)
      .setScrollFactor(0)
      .setDepth(depth + 1);

    this.invAvatar = this.add
      .image(160, 210, 'player')
      .setScale(SCALE * 3.2)
      .setScrollFactor(0)
      .setDepth(depth + 2);

    this.invYouLabel = this.add
      .text(160, 320, 'YOU', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#8b93a7',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depth + 2);

    // Right: equip slots
    const slotX = 420;
    this.invArmorSlot = this.add
      .image(slotX, 150, 'slot_frame')
      .setScale(1.6)
      .setScrollFactor(0)
      .setDepth(depth + 1);
    this.invArmorIcon = this.add
      .image(slotX, 150, 'icon_empty')
      .setScale(1.8)
      .setScrollFactor(0)
      .setDepth(depth + 2);
    this.invArmorLabel = this.add
      .text(slotX + 50, 140, 'ARMOR [A]\n(empty)', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#ffc857',
        lineSpacing: 6,
      })
      .setScrollFactor(0)
      .setDepth(depth + 2);

    this.invAmuletSlot = this.add
      .image(slotX, 250, 'slot_frame')
      .setScale(1.6)
      .setScrollFactor(0)
      .setDepth(depth + 1);
    this.invAmuletIcon = this.add
      .image(slotX, 250, 'icon_empty')
      .setScale(1.8)
      .setScrollFactor(0)
      .setDepth(depth + 2);
    this.invAmuletLabel = this.add
      .text(slotX + 50, 240, 'AMULET [N]\n(empty)', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#ff6b9d',
        lineSpacing: 6,
      })
      .setScrollFactor(0)
      .setDepth(depth + 2);

    this.invStats = this.add
      .text(slotX - 40, 310, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '9px',
        color: '#f4f0ff',
        lineSpacing: 8,
      })
      .setScrollFactor(0)
      .setDepth(depth + 2);

    this.invBagText = this.add
      .text(48, 360, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#c5cde0',
        wordWrap: { width: GAME_W - 96 },
        lineSpacing: 6,
      })
      .setScrollFactor(0)
      .setDepth(depth + 2);

    this.invHelp = this.add
      .text(
        GAME_W / 2,
        GAME_H - 36,
        'A ARMOR  ·  N AMULET  ·  U POTION  ·  I/ESC CLOSE',
        {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '8px',
          color: '#7dffb3',
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depth + 2);

    this.invSlotHints = this.add
      .text(160, 340, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '7px',
        color: '#8b93a7',
        align: 'center',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depth + 2);

    // Group visibility via root flag on each
    this.invRoot = this.add.container(0, 0);
    // Container unused for scrollFactor children already set — we just track list
    this.setInventoryVisible(false);
  }

  private inventoryObjects(): Phaser.GameObjects.GameObject[] {
    return [
      this.invBg,
      this.invTitle,
      this.invAvatarPlate,
      this.invAvatar,
      this.invYouLabel,
      this.invArmorSlot,
      this.invArmorIcon,
      this.invArmorLabel,
      this.invAmuletSlot,
      this.invAmuletIcon,
      this.invAmuletLabel,
      this.invStats,
      this.invBagText,
      this.invHelp,
      this.invSlotHints,
    ].filter(Boolean) as Phaser.GameObjects.GameObject[];
  }

  private bindGameEvents(): void {
    this.game.events.off('hud-update', this.refreshHud, this);
    this.game.events.off('dialog-show', this.showDialog, this);
    this.game.events.off('toast', this.showToast, this);
    this.game.events.off('pause-ui', this.setPaused, this);
    this.game.events.off('ui-reset', this.onUiReset, this);
    this.game.events.off('inventory-toggle', this.onInventoryToggle, this);
    this.game.events.off('inventory-refresh', this.onInventoryRefresh, this);

    this.game.events.on('hud-update', this.refreshHud, this);
    this.game.events.on('dialog-show', this.showDialog, this);
    this.game.events.on('toast', this.showToast, this);
    this.game.events.on('pause-ui', this.setPaused, this);
    this.game.events.on('ui-reset', this.onUiReset, this);
    this.game.events.on('inventory-toggle', this.onInventoryToggle, this);
    this.game.events.on('inventory-refresh', this.onInventoryRefresh, this);

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
      this.input.keyboard?.off('keydown-ENTER', this.onEnterKey, this);
      this.input.keyboard?.off('keydown-SPACE', this.onSpaceKey, this);
      this.bound = false;
      this.chromeBuilt = false;
      this.heartsText = null;
      this.itemsText = null;
      this.roomText = null;
      this.dialogBg = null;
      this.dialogText = null;
      this.pauseText = null;
      this.toastText = null;
      this.invBg = null;
      this.invTitle = null;
      this.invStats = null;
      this.invBagText = null;
      this.invHelp = null;
      this.invAvatar = null;
      this.invAvatarPlate = null;
      this.invArmorSlot = null;
      this.invAmuletSlot = null;
      this.invArmorIcon = null;
      this.invAmuletIcon = null;
      this.invArmorLabel = null;
      this.invAmuletLabel = null;
      this.invSlotHints = null;
      this.invYouLabel = null;
      this.invRoot = null;
    });
  }

  private onUiReset = (): void => {
    this.resetDialogVisuals();
    this.setInventoryVisible(false);
    this.pauseText?.setVisible(false);
    this.toastText?.setAlpha(0);
    this.game.events.emit('dialog-state', false);
    this.game.events.emit('inventory-state', false);
  };

  private resetDialogVisuals(): void {
    this.dialogOpen = false;
    this.dialogLines = [];
    this.dialogIndex = 0;
    this.dialogBg?.setVisible(false);
    this.dialogText?.setVisible(false);
  }

  private onInventoryToggle = (save: SaveData): void => {
    if (this.dialogOpen) return;
    this.lastSave = save;
    this.setInventoryVisible(!this.inventoryOpen);
  };

  private onInventoryRefresh = (save: SaveData): void => {
    this.lastSave = save;
    if (this.inventoryOpen) this.renderInventory(save);
  };

  private setInventoryVisible(open: boolean): void {
    this.inventoryOpen = open;
    for (const obj of this.inventoryObjects()) {
      if ('setVisible' in obj) {
        (obj as Phaser.GameObjects.Components.Visible).setVisible(open);
      }
    }
    if (open && this.lastSave) this.renderInventory(this.lastSave);
    this.game.events.emit('inventory-state', open);
  }

  private renderInventory(save: SaveData): void {
    // Paper-doll avatar matches world look
    const look = playerTextureKeyFromSave(save);
    if (this.textures.exists(look) && this.invAvatar) {
      this.invAvatar.setTexture(look);
    }

    // Slot icons
    const armorId = save.equippedArmor;
    const amuletId = save.equippedAmulet;
    if (this.invArmorIcon) {
      const k = itemIconKey(armorId);
      this.invArmorIcon.setTexture(this.textures.exists(k) ? k : 'icon_empty');
    }
    if (this.invAmuletIcon) {
      const k = itemIconKey(amuletId);
      this.invAmuletIcon.setTexture(this.textures.exists(k) ? k : 'icon_empty');
    }

    if (this.invArmorLabel) {
      const name = armorId ? getItemInfo(armorId).name : '(empty)';
      this.invArmorLabel.setText(`ARMOR [A]\n${name}`);
    }
    if (this.invAmuletLabel) {
      const name = amuletId ? getItemInfo(amuletId).name : '(empty)';
      this.invAmuletLabel.setText(`AMULET [N]\n${name}`);
    }

    if (this.invStats) {
      this.invStats.setText(
        [
          `COINS  ${save.coins}c`,
          `HP     ${save.hp}/${save.maxHp}`,
          `DEF    ${save.armor}`,
          save.hasSword ? 'SWORD  yes' : 'SWORD  no',
          save.hasKey ? 'KEY    yes' : 'KEY    no',
        ].join('\n'),
      );
    }

    if (this.invSlotHints) {
      this.invSlotHints.setText(
        save.armor > 0 ? `LOOKIN' TOUGH (+${save.armor} DEF)` : 'BARELY DRESSED',
      );
    }

    // Bag list (text)
    if (this.invBagText) {
      const bag = listInventory(save);
      if (bag.length === 0) {
        this.invBagText.setText('BAG: (empty)  — open chests / buy from tinkerer');
      } else {
        const lines = ['BAG:'];
        for (const item of bag) {
          const tags: string[] = [];
          if (item.equipped) tags.push('WORN');
          if (item.usable) tags.push('U');
          if (item.slot === 'armor') tags.push('A');
          if (item.slot === 'amulet') tags.push('N');
          const tag = tags.length ? ` [${tags.join(' ')}]` : '';
          lines.push(` ${item.name} x${item.count}${tag}`);
        }
        // Keep formatInventoryPanel available for tests; short bag only here
        void formatInventoryPanel;
        this.invBagText.setText(lines.join('\n'));
      }
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
      save.hasSword ? 'SW' : null,
      save.hasKey ? 'KEY' : null,
      save.armor > 0 ? `DEF${save.armor}` : null,
      save.bossDefeated ? 'CROWN' : null,
    ]
      .filter(Boolean)
      .join(' ');
    const bagCount = Object.values(save.inventory).reduce((a, n) => a + n, 0);
    const bagHint = bagCount > 0 ? ` BAG${bagCount}` : '';
    this.itemsText?.setText(
      `${xpPart}  ${save.coins}c${gear ? '  ' + gear : ''}${bagHint}`,
    );
    this.roomText?.setText(roomTitle + '  [I]');

    if (this.inventoryOpen) this.renderInventory(save);
  };

  private showDialog = (lines: string[]): void => {
    if (!lines?.length) return;
    if (!this.dialogBg?.active || !this.dialogText?.active) {
      console.warn('[DUNJUNZ] dialog-show before UI ready', lines);
      return;
    }
    if (this.inventoryOpen) this.setInventoryVisible(false);

    this.dialogLines = lines.filter(
      (l) => l !== undefined && l !== null && String(l).trim() !== '',
    );
    if (!this.dialogLines.length) return;
    this.dialogIndex = 0;
    this.dialogOpen = true;
    this.dialogBg.setVisible(true);
    this.dialogText.setVisible(true);
    this.dialogBg.setDepth(100);
    this.dialogText.setDepth(101);
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
    this.pauseText?.setVisible(paused);
  };

  isDialogOpen(): boolean {
    return this.dialogOpen;
  }

  isInventoryOpen(): boolean {
    return this.inventoryOpen;
  }
}
