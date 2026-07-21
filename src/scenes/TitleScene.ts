import Phaser from 'phaser';
import { COLORS, GAME_H, GAME_W } from '../config';
import {
  loadSlot,
  startSlot,
  type SlotSummary,
} from '../systems/auth-client';
import { playMusic, playSfx, unlockAudio } from '../systems/audio';
import { setCloudSyncEnabled } from '../systems/cloud-save';
import {
  clearHumanzSave,
  getLastMode,
  hasHumanzProgress,
  loadHumanzSave,
  setLastMode,
  writeHumanzSave,
  type GameModeId,
} from '../systems/humanz-save';
import { defaultCampaign } from '../systems/village-battle';
import { clearSave, loadSave, writeSave } from '../systems/save';
import type { SaveData } from '../types';
import { getLastAuthMe } from '../ui/auth';

type TitlePhase = 'main' | 'modeSelect';

export class TitleScene extends Phaser.Scene {
  private blink = true;
  private cloudMode = false;
  private slots: SlotSummary[] = [];
  private slotCursor = 0;
  private statusText: Phaser.GameObjects.Text | null = null;
  private slotTexts: Phaser.GameObjects.Text[] = [];
  private prompt: Phaser.GameObjects.Text | null = null;
  private blurbText: Phaser.GameObjects.Text | null = null;
  private phase: TitlePhase = 'main';
  private modeCursor = 0;
  private modeLines: Phaser.GameObjects.Text[] = [];
  /** When true, next confirm starts fresh; when false, continue preferred mode. */
  private wantFresh = false;

  constructor() {
    super('Title');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.black);
    void unlockAudio().then(() => playMusic('title'));
    this.phase = 'main';
    this.modeCursor = 0;
    this.wantFresh = false;

    this.add
      .rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x0d1220)
      .setDepth(0);

    this.add
      .rectangle(GAME_W / 2, GAME_H / 2, GAME_W - 24, GAME_H - 24)
      .setStrokeStyle(3, COLORS.green, 0.9)
      .setFillStyle(0x000000, 0);

    this.add
      .text(GAME_W / 2, 72, 'DUNJUNZ', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '40px',
        color: '#7dffb3',
        align: 'center',
      })
      .setOrigin(0.5)
      .setShadow(4, 4, '#0d3d28', 0, false, true);

    this.add
      .text(GAME_W / 2, 118, 'AN EPIC OF QUESTIONABLE QUESTING', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '10px',
        color: '#ffc857',
        align: 'center',
      })
      .setOrigin(0.5);

    this.blurbText = this.add
      .text(
        GAME_W / 2,
        175,
        [
          'SAVE PRIZELLA · FIND YOUR BEST BUD',
          'OR PLAY THE DRAGON. EAT THE LOOTERS.',
          '',
          'TWO MODES. ONE BAD ATTITUDE.',
        ].join('\n'),
        {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '10px',
          color: '#c5cde0',
          align: 'center',
          lineSpacing: 8,
        },
      )
      .setOrigin(0.5);

    this.statusText = this.add
      .text(GAME_W / 2, 250, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '9px',
        color: '#7dffb3',
        align: 'center',
      })
      .setOrigin(0.5);

    for (let i = 0; i < 3; i++) {
      const t = this.add
        .text(GAME_W / 2, 290 + i * 32, '', {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '11px',
          color: '#c5cde0',
          align: 'center',
        })
        .setOrigin(0.5);
      this.slotTexts.push(t);
    }

    // Mode select lines (hidden until phase)
    for (let i = 0; i < 2; i++) {
      const t = this.add
        .text(GAME_W / 2, 300 + i * 48, '', {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '12px',
          color: '#c5cde0',
          align: 'center',
          lineSpacing: 6,
        })
        .setOrigin(0.5)
        .setVisible(false);
      this.modeLines.push(t);
    }

    this.prompt = this.add
      .text(GAME_W / 2, 470, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '11px',
        color: '#ffffff',
        align: 'center',
        lineSpacing: 14,
      })
      .setOrigin(0.5);

    this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        this.blink = !this.blink;
        this.prompt?.setAlpha(this.blink ? 1 : 0.25);
      },
    });

    this.add
      .text(GAME_W / 2, 545, 'NEASEMEDIA  ·  V0.7  ·  HUMANZ & VILLAGEZ', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#6a738a',
      })
      .setOrigin(0.5);

    const refreshFromAuth = () => {
      if (this.phase !== 'main') return;
      const me = getLastAuthMe();
      if (me?.authenticated && me.slots) {
        this.cloudMode = true;
        this.slots = me.slots;
        setCloudSyncEnabled(true);
        this.renderCloudSlots();
        this.prompt?.setText(
          '↑↓ SELECT SLOT   ENTER LOAD/NEW   R WIPE SLOT\nTOP BAR: ACCOUNT FOR GUEST / MAGIC LINK',
        );
      } else {
        this.cloudMode = false;
        setCloudSyncEnabled(false);
        this.renderLocalMode();
      }
    };

    refreshFromAuth();
    this.time.addEvent({
      delay: 800,
      repeat: 6,
      callback: refreshFromAuth,
    });

    const onEnter = () => {
      void unlockAudio();
      playSfx('ui_click');
      if (this.phase === 'modeSelect') {
        this.confirmMode();
        return;
      }
      if (this.cloudMode) void this.activateCloudSlot(false);
      else this.onLocalEnter();
    };
    const onSpace = () => onEnter();
    const onNew = () => {
      void unlockAudio();
      playSfx('ui_click');
      if (this.phase === 'modeSelect') {
        this.leaveModeSelect();
        return;
      }
      if (this.cloudMode) void this.activateCloudSlot(true);
      else {
        this.wantFresh = true;
        this.openModeSelect();
      }
    };
    const onUp = () => {
      if (this.phase === 'modeSelect') {
        this.modeCursor = (this.modeCursor + 1) % 2;
        playSfx('ui_click');
        this.renderModeSelect();
        return;
      }
      if (!this.cloudMode) return;
      this.slotCursor = (this.slotCursor + 2) % 3;
      playSfx('ui_click');
      this.renderCloudSlots();
    };
    const onDown = () => {
      if (this.phase === 'modeSelect') {
        this.modeCursor = (this.modeCursor + 1) % 2;
        playSfx('ui_click');
        this.renderModeSelect();
        return;
      }
      if (!this.cloudMode) return;
      this.slotCursor = (this.slotCursor + 1) % 3;
      playSfx('ui_click');
      this.renderCloudSlots();
    };

    this.input.keyboard?.on('keydown-ENTER', onEnter);
    this.input.keyboard?.on('keydown-SPACE', onSpace);
    this.input.keyboard?.on('keydown-R', onNew);
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.phase === 'modeSelect') {
        playSfx('ui_close');
        this.leaveModeSelect();
      }
    });
    this.input.keyboard?.on('keydown-UP', onUp);
    this.input.keyboard?.on('keydown-DOWN', onDown);
    this.input.keyboard?.on('keydown-W', onUp);
    this.input.keyboard?.on('keydown-S', onDown);
    this.input.keyboard?.on('keydown-LEFT', () => {
      if (this.phase === 'modeSelect') {
        this.modeCursor = 0;
        playSfx('ui_click');
        this.renderModeSelect();
      }
    });
    this.input.keyboard?.on('keydown-RIGHT', () => {
      if (this.phase === 'modeSelect') {
        this.modeCursor = 1;
        playSfx('ui_click');
        this.renderModeSelect();
      }
    });
    this.input.keyboard?.on('keydown-ONE', () => {
      if (this.phase === 'modeSelect') {
        this.modeCursor = 0;
        this.confirmMode();
      }
    });
    this.input.keyboard?.on('keydown-TWO', () => {
      if (this.phase === 'modeSelect') {
        this.modeCursor = 1;
        this.confirmMode();
      }
    });

    this.events.once('shutdown', () => {
      this.input.keyboard?.removeAllListeners();
    });
  }

  private hasDunjunzProgress(): boolean {
    const save = loadSave();
    return (
      save.hasSword ||
      save.roomId !== 'overworld' ||
      save.bossDefeated ||
      save.princessSaved ||
      (save.landsCleared?.length ?? 0) > 0 ||
      save.xp > 0
    );
  }

  private renderLocalMode(): void {
    this.statusText?.setText('LOCAL PLAY (no account)');
    for (const t of this.slotTexts) t.setText('');
    const d = this.hasDunjunzProgress();
    const h = hasHumanzProgress();
    const last = getLastMode();
    if (d || h) {
      this.prompt?.setText(
        `ENTER - CONTINUE (${last === 'humanz' ? 'HUMANZ' : 'DUNJUNZ'})\nR - NEW GAME (PICK MODE)   LAST: ${last.toUpperCase()}`,
      );
    } else {
      this.prompt?.setText(
        'ENTER OR R — CHOOSE MODE\nDUNJUNZ CRAWL  ·  HUMANZ & VILLAGEZ',
      );
    }
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

  private openModeSelect(): void {
    this.phase = 'modeSelect';
    this.cloudMode = false;
    for (const t of this.slotTexts) t.setVisible(false);
    this.statusText?.setText(
      this.wantFresh ? 'NEW GAME — PICK A MODE' : 'START — PICK A MODE',
    );
    this.blurbText?.setText(
      [
        'DUNJUNZ: classic crawl. Real-time. Swords.',
        'HUMANZ & VILLAGEZ: you are the dragon.',
        'Turn-based. Guard the gold. Toast the town.',
      ].join('\n'),
    );
    for (const t of this.modeLines) t.setVisible(true);
    this.renderModeSelect();
    this.prompt?.setText(
      '↑↓ OR 1/2 SELECT    ENTER CONFIRM    ESC/R BACK',
    );
  }

  private leaveModeSelect(): void {
    this.phase = 'main';
    this.wantFresh = false;
    for (const t of this.modeLines) t.setVisible(false);
    for (const t of this.slotTexts) t.setVisible(true);
    this.blurbText?.setText(
      [
        'SAVE PRIZELLA · FIND YOUR BEST BUD',
        'OR PLAY THE DRAGON. EAT THE LOOTERS.',
        '',
        'TWO MODES. ONE BAD ATTITUDE.',
      ].join('\n'),
    );
    this.renderLocalMode();
  }

  private renderModeSelect(): void {
    const modes: { id: GameModeId; title: string; sub: string }[] = [
      {
        id: 'dunjunz',
        title: '1  DUNJUNZ MODE',
        sub: 'Dungeon crawl · real-time · Best Bud',
      },
      {
        id: 'humanz',
        title: '2  HUMANZ & VILLAGEZ',
        sub: 'Dragon vs villagers · turn-based',
      },
    ];
    modes.forEach((m, i) => {
      const sel = i === this.modeCursor;
      this.modeLines[i]?.setText(`${sel ? '▶ ' : '  '}${m.title}\n   ${m.sub}`);
      this.modeLines[i]?.setColor(sel ? '#ffc857' : '#c5cde0');
    });
  }

  private confirmMode(): void {
    const mode: GameModeId = this.modeCursor === 0 ? 'dunjunz' : 'humanz';
    playSfx('success');
    if (mode === 'humanz') {
      if (this.wantFresh) {
        clearHumanzSave();
        writeHumanzSave(defaultCampaign());
      } else if (!hasHumanzProgress()) {
        writeHumanzSave(loadHumanzSave());
      }
      setLastMode('humanz');
      this.scene.start('Village');
      return;
    }
    // Dunjunz
    if (this.wantFresh) clearSave();
    setLastMode('dunjunz');
    if (this.scene.isActive('UI')) {
      this.game.events.emit('ui-reset');
    }
    this.scene.start('Game');
  }

  private onLocalEnter(): void {
    const d = this.hasDunjunzProgress();
    const h = hasHumanzProgress();
    if (!d && !h) {
      this.wantFresh = true;
      this.openModeSelect();
      return;
    }
    // Continue last mode if it has progress; else the one that exists
    const last = getLastMode();
    if (last === 'humanz' && h) {
      setLastMode('humanz');
      this.scene.start('Village');
      return;
    }
    if (last === 'dunjunz' && d) {
      setLastMode('dunjunz');
      if (this.scene.isActive('UI')) this.game.events.emit('ui-reset');
      this.scene.start('Game');
      return;
    }
    if (h && !d) {
      setLastMode('humanz');
      this.scene.start('Village');
      return;
    }
    if (d) {
      setLastMode('dunjunz');
      if (this.scene.isActive('UI')) this.game.events.emit('ui-reset');
      this.scene.start('Game');
      return;
    }
    this.wantFresh = true;
    this.openModeSelect();
  }

  private async activateCloudSlot(wipe: boolean): Promise<void> {
    const s = this.slots.find((x) => x.slotIndex === this.slotCursor);
    if (!s) return;

    if (wipe || s.isEmpty) {
      // Cloud slots remain Dunjunz crawl for now; mode select for local
      const name = wipe
        ? `Hero ${this.slotCursor + 1}`
        : s.name || `Slot ${this.slotCursor + 1}`;
      const created = await startSlot(this.slotCursor, name);
      if (!created) return;
      clearSave();
      setLastMode('dunjunz');
      if (this.scene.isActive('UI')) this.game.events.emit('ui-reset');
      this.scene.start('Game');
      return;
    }

    const data = await loadSlot(s.id);
    if (!data) return;
    writeSave(data as unknown as SaveData);
    setLastMode('dunjunz');
    if (this.scene.isActive('UI')) {
      this.game.events.emit('ui-reset');
    }
    this.scene.start('Game');
  }
}
