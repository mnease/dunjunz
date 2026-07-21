import Phaser from 'phaser';
import { COLORS, GAME_H, GAME_W } from '../config';
import {
  loadSlot,
  startSlot,
  type SlotSummary,
} from '../systems/auth-client';
import { playMusic, playSfx, unlockAudio } from '../systems/audio';
import { setCloudSyncEnabled } from '../systems/cloud-save';
import { clearSave, loadSave, writeSave } from '../systems/save';
import type { SaveData } from '../types';
import { getLastAuthMe } from '../ui/auth';

export class TitleScene extends Phaser.Scene {
  private blink = true;
  private cloudMode = false;
  private slots: SlotSummary[] = [];
  private slotCursor = 0;
  private statusText: Phaser.GameObjects.Text | null = null;
  private slotTexts: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('Title');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.black);
    void unlockAudio().then(() => playMusic('title'));

    this.add
      .rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x0d1220)
      .setDepth(0);

    this.add
      .rectangle(GAME_W / 2, GAME_H / 2, GAME_W - 24, GAME_H - 24)
      .setStrokeStyle(3, COLORS.green, 0.9)
      .setFillStyle(0x000000, 0);

    this.add
      .text(GAME_W / 2, 90, 'DUNJUNZ', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '40px',
        color: '#7dffb3',
        align: 'center',
      })
      .setOrigin(0.5)
      .setShadow(4, 4, '#0d3d28', 0, false, true);

    this.add
      .text(GAME_W / 2, 140, 'AN EPIC OF QUESTIONABLE QUESTING', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '10px',
        color: '#ffc857',
        align: 'center',
      })
      .setOrigin(0.5);

    const blurb = [
      'SAVE PRIZELLA · FIND YOUR BEST BUD',
      'DUNJUNZ · WOODZ · DEZERTZ',
      '',
      'PARODY. HOMAGE. CHAOS.',
    ].join('\n');

    this.add
      .text(GAME_W / 2, 210, blurb, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '11px',
        color: '#c5cde0',
        align: 'center',
        lineSpacing: 10,
      })
      .setOrigin(0.5);

    this.statusText = this.add
      .text(GAME_W / 2, 290, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '9px',
        color: '#7dffb3',
        align: 'center',
      })
      .setOrigin(0.5);

    for (let i = 0; i < 3; i++) {
      const t = this.add
        .text(GAME_W / 2, 340 + i * 36, '', {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '11px',
          color: '#c5cde0',
          align: 'center',
        })
        .setOrigin(0.5);
      this.slotTexts.push(t);
    }

    const prompt = this.add
      .text(GAME_W / 2, 470, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '11px',
        color: '#ffffff',
        align: 'center',
      })
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
      .text(GAME_W / 2, 540, 'NEASEMEDIA  ·  V0.6  ·  CLOUD SLOTS OPTIONAL', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#6a738a',
      })
      .setOrigin(0.5);

    const refreshFromAuth = () => {
      const me = getLastAuthMe();
      if (me?.authenticated && me.slots) {
        this.cloudMode = true;
        this.slots = me.slots;
        setCloudSyncEnabled(true);
        this.renderCloudSlots();
        prompt.setText(
          '↑↓ SELECT SLOT   ENTER LOAD/NEW   R WIPE SLOT\nFOOTER: ACCOUNT FOR GUEST / MAGIC LINK',
        );
      } else {
        this.cloudMode = false;
        setCloudSyncEnabled(false);
        this.renderLocalMode();
        const save = loadSave();
        const hasProgress =
          save.hasSword ||
          save.roomId !== 'overworld' ||
          save.bossDefeated ||
          save.princessSaved ||
          (save.landsCleared?.length ?? 0) > 0;
        prompt.setText(
          hasProgress
            ? 'ENTER - CONTINUE    R - NEW GAME\nOR OPEN ACCOUNT (FOOTER) FOR CLOUD SLOTS'
            : 'PRESS ENTER TO START (LOCAL)\nOR ACCOUNT (FOOTER) FOR CLOUD',
        );
      }
    };

    refreshFromAuth();
    // Poll briefly so shell auth completes
    this.time.addEvent({
      delay: 800,
      repeat: 6,
      callback: refreshFromAuth,
    });

    const onEnter = () => {
      void unlockAudio();
      playSfx('ui_click');
      if (this.cloudMode) void this.activateCloudSlot(false);
      else this.startGame(false);
    };
    const onSpace = () => onEnter();
    const onNew = () => {
      void unlockAudio();
      playSfx('ui_click');
      if (this.cloudMode) void this.activateCloudSlot(true);
      else this.startGame(true);
    };
    const onUp = () => {
      if (!this.cloudMode) return;
      this.slotCursor = (this.slotCursor + 2) % 3;
      playSfx('ui_click');
      this.renderCloudSlots();
    };
    const onDown = () => {
      if (!this.cloudMode) return;
      this.slotCursor = (this.slotCursor + 1) % 3;
      playSfx('ui_click');
      this.renderCloudSlots();
    };

    this.input.keyboard?.on('keydown-ENTER', onEnter);
    this.input.keyboard?.on('keydown-SPACE', onSpace);
    this.input.keyboard?.on('keydown-R', onNew);
    this.input.keyboard?.on('keydown-UP', onUp);
    this.input.keyboard?.on('keydown-DOWN', onDown);
    this.input.keyboard?.on('keydown-W', onUp);
    this.input.keyboard?.on('keydown-S', onDown);

    this.events.once('shutdown', () => {
      this.input.keyboard?.off('keydown-ENTER', onEnter);
      this.input.keyboard?.off('keydown-SPACE', onSpace);
      this.input.keyboard?.off('keydown-R', onNew);
      this.input.keyboard?.off('keydown-UP', onUp);
      this.input.keyboard?.off('keydown-DOWN', onDown);
      this.input.keyboard?.off('keydown-W', onUp);
      this.input.keyboard?.off('keydown-S', onDown);
    });
  }

  private renderLocalMode(): void {
    this.statusText?.setText('LOCAL PLAY (no account)');
    for (const t of this.slotTexts) t.setText('');
  }

  private renderCloudSlots(): void {
    const me = getLastAuthMe();
    this.statusText?.setText(
      me?.verified
        ? `ACCOUNT  ${me.email ?? ''}`
        : `GUEST  ${me?.email ?? ''}  (magic link to verify)`,
    );
    for (let i = 0; i < 3; i++) {
      const s = this.slots.find((x) => x.slotIndex === i);
      const sel = i === this.slotCursor ? '▶ ' : '  ';
      let line = `${sel}SLOT ${i + 1}: `;
      if (!s || s.isEmpty) line += '(empty)';
      else line += `${s.name}  Lv${s.level}  ${s.roomId}`;
      this.slotTexts[i]?.setText(line);
      this.slotTexts[i]?.setColor(i === this.slotCursor ? '#ffc857' : '#c5cde0');
    }
  }

  private async activateCloudSlot(wipe: boolean): Promise<void> {
    const s = this.slots.find((x) => x.slotIndex === this.slotCursor);
    if (!s) return;

    if (wipe || s.isEmpty) {
      const name = wipe ? `Hero ${this.slotCursor + 1}` : s.name || `Slot ${this.slotCursor + 1}`;
      const created = await startSlot(this.slotCursor, name);
      if (!created) return;
      clearSave();
      this.startGame(false);
      return;
    }

    const data = await loadSlot(s.id);
    if (!data) return;
    writeSave(data as unknown as SaveData);
    // writeSave already queued cloud; start without clearing
    if (this.scene.isActive('UI')) {
      this.game.events.emit('ui-reset');
    }
    this.scene.start('Game');
  }

  private startGame(fresh: boolean): void {
    if (fresh) clearSave();
    playSfx('success');
    if (this.scene.isActive('UI')) {
      this.game.events.emit('ui-reset');
    }
    this.scene.start('Game');
  }
}
