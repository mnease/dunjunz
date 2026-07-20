import Phaser from 'phaser';
import { COLORS, GAME_W, HUD_H } from '../config';
import type { SaveData } from '../types';

export class UIScene extends Phaser.Scene {
  private heartsText!: Phaser.GameObjects.Text;
  private itemsText!: Phaser.GameObjects.Text;
  private roomText!: Phaser.GameObjects.Text;
  private dialogBg!: Phaser.GameObjects.Rectangle;
  private dialogText!: Phaser.GameObjects.Text;
  private dialogLines: string[] = [];
  private dialogIndex = 0;
  private dialogOpen = false;
  private pauseText!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'UI', active: false });
  }

  create(): void {
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
      .setDepth(20);

    this.dialogText = this.add
      .text(48, 440, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '11px',
        color: '#f4f0ff',
        wordWrap: { width: GAME_W - 96 },
        lineSpacing: 8,
      })
      .setVisible(false)
      .setDepth(21);

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
      .setDepth(30);

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
      .setDepth(25);

    this.game.events.on('hud-update', this.refreshHud, this);
    this.game.events.on('dialog-show', this.showDialog, this);
    this.game.events.on('toast', this.showToast, this);
    this.game.events.on('pause-ui', this.setPaused, this);

    this.input.keyboard?.on('keydown-ENTER', () => this.advanceDialog());
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (this.dialogOpen) this.advanceDialog();
    });

    this.events.on('shutdown', () => {
      this.game.events.off('hud-update', this.refreshHud, this);
      this.game.events.off('dialog-show', this.showDialog, this);
      this.game.events.off('toast', this.showToast, this);
      this.game.events.off('pause-ui', this.setPaused, this);
    });
  }

  private refreshHud = (save: SaveData, roomTitle: string): void => {
    const filled = Math.max(0, Math.ceil(save.hp / 2));
    const empty = Math.max(0, Math.ceil(save.maxHp / 2) - filled);
    this.heartsText.setText(`${'♥'.repeat(filled)}${'♡'.repeat(empty)}`);
    const items = [
      save.hasSword ? 'SWORD' : null,
      save.hasKey ? 'KEY' : null,
      save.bossDefeated ? 'CROWN' : null,
    ]
      .filter(Boolean)
      .join('  ·  ');
    this.itemsText.setText(items || 'NO LOOT YET');
    this.roomText.setText(roomTitle);
  };

  private showDialog = (lines: string[]): void => {
    this.dialogLines = lines;
    this.dialogIndex = 0;
    this.dialogOpen = true;
    this.dialogBg.setVisible(true);
    this.dialogText.setVisible(true);
    this.renderDialogLine();
    this.game.events.emit('dialog-state', true);
  };

  private renderDialogLine(): void {
    const line = this.dialogLines[this.dialogIndex] ?? '';
    const more =
      this.dialogIndex < this.dialogLines.length - 1 ? '\n\n▼' : '\n\n[ENTER]';
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
    this.dialogBg.setVisible(false);
    this.dialogText.setVisible(false);
    this.game.events.emit('dialog-state', false);
  }

  private showToast = (msg: string): void => {
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
    this.pauseText.setVisible(paused);
  };

  isDialogOpen(): boolean {
    return this.dialogOpen;
  }
}
