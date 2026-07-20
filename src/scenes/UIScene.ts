import Phaser from 'phaser';
import { COLORS, GAME_W, HUD_H } from '../config';
import { xpProgressInLevel } from '../systems/progression';
import type { SaveData } from '../types';

/**
 * HUD + dialog overlay. Runs parallel to Game.
 *
 * IMPORTANT: prefer `game.events.emit('ui-reset')` over stop+relaunch.
 * Phaser can fire shutdown after a new create and strip dialog-show listeners.
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
  private bound = false;
  private chromeBuilt = false;

  constructor() {
    super({ key: 'UI', active: false });
  }

  create(): void {
    this.resetDialogVisuals();

    // Rebuild if never built, or if a real stop destroyed display objects
    if (!this.chromeBuilt || !this.dialogBg?.active) {
      this.buildChrome();
      this.chromeBuilt = true;
    } else {
      this.dialogBg?.setVisible(false);
      this.dialogText?.setVisible(false);
      this.pauseText?.setVisible(false);
      this.toastText?.setAlpha(0);
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
      .setDepth(110)
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
      .setDepth(105)
      .setScrollFactor(0);
  }

  private bindGameEvents(): void {
    this.game.events.off('hud-update', this.refreshHud, this);
    this.game.events.off('dialog-show', this.showDialog, this);
    this.game.events.off('toast', this.showToast, this);
    this.game.events.off('pause-ui', this.setPaused, this);
    this.game.events.off('ui-reset', this.onUiReset, this);

    this.game.events.on('hud-update', this.refreshHud, this);
    this.game.events.on('dialog-show', this.showDialog, this);
    this.game.events.on('toast', this.showToast, this);
    this.game.events.on('pause-ui', this.setPaused, this);
    this.game.events.on('ui-reset', this.onUiReset, this);

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
      this.input.keyboard?.off('keydown-ENTER', this.onEnterKey, this);
      this.input.keyboard?.off('keydown-SPACE', this.onSpaceKey, this);
      this.bound = false;
      // Force rebuild if someone truly stops this scene
      this.chromeBuilt = false;
      this.heartsText = null;
      this.itemsText = null;
      this.roomText = null;
      this.dialogBg = null;
      this.dialogText = null;
      this.pauseText = null;
      this.toastText = null;
    });
  }

  private onUiReset = (): void => {
    this.resetDialogVisuals();
    this.pauseText?.setVisible(false);
    this.toastText?.setAlpha(0);
    this.game.events.emit('dialog-state', false);
  };

  private resetDialogVisuals(): void {
    this.dialogOpen = false;
    this.dialogLines = [];
    this.dialogIndex = 0;
    this.dialogBg?.setVisible(false);
    this.dialogText?.setVisible(false);
  }

  private onEnterKey = (): void => {
    if (this.dialogOpen) this.advanceDialog();
  };

  private onSpaceKey = (event: KeyboardEvent): void => {
    if (this.dialogOpen) {
      event.preventDefault();
      this.advanceDialog();
    }
  };

  private refreshHud = (save: SaveData, roomTitle: string): void => {
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
    this.itemsText?.setText(
      `${xpPart}  ${save.coins}c${gear ? '  ' + gear : ''}`,
    );
    this.roomText?.setText(roomTitle);
  };

  private showDialog = (lines: string[]): void => {
    if (!lines?.length) return;
    if (!this.dialogBg?.active || !this.dialogText?.active) {
      console.warn('[DUNJUNZ] dialog-show before UI ready', lines);
      return;
    }
    this.dialogLines = lines.filter((l) => l !== undefined && l !== null);
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
    this.pauseText?.setVisible(paused);
  };

  isDialogOpen(): boolean {
    return this.dialogOpen;
  }
}
