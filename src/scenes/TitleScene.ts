import Phaser from 'phaser';
import { COLORS, GAME_H, GAME_W } from '../config';
import { clearSave, loadSave } from '../systems/save';

export class TitleScene extends Phaser.Scene {
  private blink = true;

  constructor() {
    super('Title');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.black);

    this.add
      .rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x0d1220)
      .setDepth(0);

    // Decorative border
    this.add
      .rectangle(GAME_W / 2, GAME_H / 2, GAME_W - 24, GAME_H - 24)
      .setStrokeStyle(3, COLORS.green, 0.9)
      .setFillStyle(0x000000, 0);

    this.add
      .text(GAME_W / 2, 120, 'DUNJUNZ', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '40px',
        color: '#7dffb3',
        align: 'center',
      })
      .setOrigin(0.5)
      .setShadow(4, 4, '#0d3d28', 0, false, true);

    this.add
      .text(GAME_W / 2, 180, 'AN EPIC OF QUESTIONABLE QUESTING', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '10px',
        color: '#ffc857',
        align: 'center',
      })
      .setOrigin(0.5);

    const blurb = [
      'A RETRO DUNGEON CRAWLER',
      'STUFFED WITH TROPES FROM',
      'GAMES, D&D, TREK & BEYOND.',
      '',
      'PARODY. HOMAGE. CHAOS.',
    ].join('\n');

    this.add
      .text(GAME_W / 2, 280, blurb, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '11px',
        color: '#c5cde0',
        align: 'center',
        lineSpacing: 10,
      })
      .setOrigin(0.5);

    const save = loadSave();
    const hasProgress =
      save.hasSword || save.roomId !== 'overworld' || save.bossDefeated;

    const prompt = this.add
      .text(
        GAME_W / 2,
        420,
        hasProgress ? 'ENTER - CONTINUE    R - NEW GAME' : 'PRESS ENTER TO START',
        {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '12px',
          color: '#ffffff',
          align: 'center',
        },
      )
      .setOrigin(0.5);

    this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        this.blink = !this.blink;
        prompt.setAlpha(this.blink ? 1 : 0.25);
      },
    });

    this.add
      .text(GAME_W / 2, 520, 'NEASEMEDIA  ·  V0.1 VERTICAL SLICE', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#6a738a',
      })
      .setOrigin(0.5);

    const onEnter = () => this.startGame(false);
    const onSpace = () => this.startGame(false);
    const onNew = () => this.startGame(true);
    this.input.keyboard?.on('keydown-ENTER', onEnter);
    this.input.keyboard?.on('keydown-SPACE', onSpace);
    this.input.keyboard?.on('keydown-R', onNew);

    this.events.once('shutdown', () => {
      this.input.keyboard?.off('keydown-ENTER', onEnter);
      this.input.keyboard?.off('keydown-SPACE', onSpace);
      this.input.keyboard?.off('keydown-R', onNew);
    });
  }

  private startGame(fresh: boolean): void {
    if (fresh) clearSave();
    // Soft-reset UI if still running — do not stop/relaunch (listener race)
    if (this.scene.isActive('UI')) {
      this.game.events.emit('ui-reset');
    }
    this.scene.start('Game');
  }
}
