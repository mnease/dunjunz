/**
 * Humanz & Villagez — turn-based dragon vs villagers.
 * Keyboard: 1–5 actions · ←/→ target · ENTER confirm · ESC title
 */

import Phaser from 'phaser';
import { GAME_H, GAME_W, SPRITE_SCALE } from '../config';
import { playMusic, playSfx, unlockAudio } from '../systems/audio';
import {
  clearHumanzSave,
  loadHumanzSave,
  writeHumanzSave,
} from '../systems/humanz-save';
import {
  applyDragonAction,
  applyWaveLoss,
  applyWaveVictory,
  cycleTarget,
  DRAGON_ACTIONS,
  resolveVillagerRound,
  startWave,
  type BattleState,
  type DragonActionId,
  type HumanzCampaign,
} from '../systems/village-battle';
import { loadSettings } from '../systems/settings';

export class VillageScene extends Phaser.Scene {
  private campaign!: HumanzCampaign;
  private battle!: BattleState;
  private hudText!: Phaser.GameObjects.Text;
  private logText!: Phaser.GameObjects.Text;
  private menuText!: Phaser.GameObjects.Text;
  private villagerTexts: Phaser.GameObjects.Text[] = [];
  private villagerSprites: Phaser.GameObjects.Image[] = [];
  private dragonSprite!: Phaser.GameObjects.Image;
  private goldPile!: Phaser.GameObjects.Image;
  private resolving = false;
  private actionCursor = 0;

  constructor() {
    super('Village');
  }

  create(): void {
    void unlockAudio().then(() => playMusic('dungeon'));
    this.cameras.main.setBackgroundColor(0x1a1020);
    this.campaign = loadHumanzSave();
    this.battle = startWave(this.campaign);
    this.resolving = false;
    this.actionCursor = 0;

    // Backdrop
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x1a1020);
    // Sky strip
    this.add.rectangle(GAME_W / 2, 80, GAME_W, 160, 0x2a1840);
    // Ground
    this.add.rectangle(GAME_W / 2, GAME_H - 100, GAME_W, 200, 0x2f6b45);
    // Village silhouettes
    for (let i = 0; i < 5; i++) {
      const x = 80 + i * 140;
      this.add.rectangle(x, 200, 40, 50, 0x3a3150).setOrigin(0.5, 1);
      this.add.triangle(x, 150, 0, 20, 25, -20, -25, -20, 0x5c4d7a);
    }

    this.goldPile = this.add
      .image(GAME_W / 2, GAME_H - 160, 'hoard-gold')
      .setScale(SPRITE_SCALE * 1.5)
      .setDepth(2);

    this.dragonSprite = this.add
      .image(GAME_W / 2, GAME_H - 220, 'dragon')
      .setScale(SPRITE_SCALE * 2)
      .setDepth(5);

    this.add
      .text(GAME_W / 2, 28, 'HUMANZ & VILLAGEZ', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '14px',
        color: '#ffc857',
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.hudText = this.add
      .text(16, 48, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '10px',
        color: '#7dffb3',
        lineSpacing: 8,
      })
      .setDepth(20);

    this.menuText = this.add
      .text(16, GAME_H - 150, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '10px',
        color: '#c5cde0',
        lineSpacing: 8,
      })
      .setDepth(20);

    this.logText = this.add
      .text(GAME_W - 16, 48, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#c5cde0',
        align: 'right',
        lineSpacing: 6,
        wordWrap: { width: Math.min(420, Math.floor(GAME_W * 0.36)) },
      })
      .setOrigin(1, 0)
      .setDepth(20);

    this.add
      .text(
        GAME_W / 2,
        GAME_H - 16,
        '1-5 ACT  ←→ TARGET  ENTER  ESC TITLE  N NEW RUN',
        {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '8px',
          color: '#6a738a',
        },
      )
      .setOrigin(0.5)
      .setDepth(20);

    this.buildVillagerVisuals();
    this.refreshUi();

    const kb = this.input.keyboard!;
    const handlers: [string, () => void][] = [
      ['keydown-ONE', () => this.pickAction(0)],
      ['keydown-TWO', () => this.pickAction(1)],
      ['keydown-THREE', () => this.pickAction(2)],
      ['keydown-FOUR', () => this.pickAction(3)],
      ['keydown-FIVE', () => this.pickAction(4)],
      ['keydown-LEFT', () => this.moveTarget(-1)],
      ['keydown-RIGHT', () => this.moveTarget(1)],
      ['keydown-A', () => this.moveTarget(-1)],
      ['keydown-D', () => this.moveTarget(1)],
      ['keydown-UP', () => this.moveAction(-1)],
      ['keydown-DOWN', () => this.moveAction(1)],
      ['keydown-W', () => this.moveAction(-1)],
      ['keydown-S', () => this.moveAction(1)],
      ['keydown-ENTER', () => this.confirmAction()],
      ['keydown-SPACE', () => this.confirmAction()],
      ['keydown-ESC', () => this.backToTitle()],
      ['keydown-N', () => this.newRun()],
    ];
    for (const [ev, fn] of handlers) kb.on(ev, fn);
    this.events.once('shutdown', () => {
      for (const [ev, fn] of handlers) kb.off(ev, fn);
    });
  }

  private buildVillagerVisuals(): void {
    for (const t of this.villagerTexts) t.destroy();
    for (const s of this.villagerSprites) s.destroy();
    this.villagerTexts = [];
    this.villagerSprites = [];

    const n = this.battle.villagers.length;
    const startX = GAME_W / 2 - ((n - 1) * 70) / 2;
    this.battle.villagers.forEach((v, i) => {
      const x = startX + i * 70;
      const y = 280;
      const tex =
        v.kind === 'knight'
          ? 'villager-knight'
          : v.kind === 'mage'
            ? 'villager-mage'
            : v.kind === 'thief'
              ? 'villager-thief'
              : 'villager';
      const key = this.textures.exists(tex) ? tex : 'villager';
      const img = this.add.image(x, y, key).setScale(SPRITE_SCALE).setDepth(4);
      const label = this.add
        .text(x, y + 36, '', {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '7px',
          color: '#c5cde0',
          align: 'center',
        })
        .setOrigin(0.5)
        .setDepth(10);
      this.villagerSprites.push(img);
      this.villagerTexts.push(label);
    });
  }

  private refreshUi(): void {
    const b = this.battle;
    const c = this.campaign;
    this.hudText.setText(
      [
        c.dragonName,
        `HP ${b.dragonHp}/${b.dragonMaxHp}`,
        `GOLD ${b.gold}`,
        `WAVE ${b.wave}  WINS ${c.victories}`,
        b.guarding ? 'GUARDING' : '',
        b.phase === 'player'
          ? 'YOUR TURN'
          : b.phase === 'enemy'
            ? 'HUMANZ ACT…'
            : b.phase === 'won'
              ? 'WAVE CLEAR!'
              : 'DEFEAT',
      ]
        .filter(Boolean)
        .join('\n'),
    );

    this.logText.setText(b.log.slice(-10).join('\n'));

    if (b.phase === 'player') {
      const lines = DRAGON_ACTIONS.map((a, i) => {
        const sel = i === this.actionCursor ? '▶' : ' ';
        return `${sel}${i + 1} ${a.name} — ${a.blurb}`;
      });
      this.menuText.setText(lines.join('\n'));
    } else if (b.phase === 'won') {
      this.menuText.setText('ENTER — NEXT WAVE\nESC — TITLE');
    } else if (b.phase === 'lost') {
      this.menuText.setText('ENTER — RETRY WAVE\nN — NEW RUN\nESC — TITLE');
    } else {
      this.menuText.setText('…');
    }

    // Villager sprites
    b.villagers.forEach((v, i) => {
      const img = this.villagerSprites[i];
      const lab = this.villagerTexts[i];
      if (!img || !lab) return;
      img.setAlpha(v.alive ? 1 : 0.25);
      img.setTint(v.stunned ? 0x88aaff : 0xffffff);
      const mark =
        b.phase === 'player' && b.selectedTarget === i && v.alive ? '◀' : '';
      lab.setText(
        v.alive
          ? `${mark}${v.name}\n${v.hp}/${v.maxHp}`
          : `${v.name}\nOUT`,
      );
      lab.setColor(
        b.selectedTarget === i && v.alive ? '#ffc857' : '#c5cde0',
      );
    });

    // Gold pile scale with gold
    const gScale = SPRITE_SCALE * (1.2 + Math.min(1.5, b.gold / 100));
    this.goldPile.setScale(gScale);
    this.dragonSprite.setTint(b.dragonHp < b.dragonMaxHp * 0.3 ? 0xff8888 : 0xffffff);
  }

  private moveTarget(dir: 1 | -1): void {
    if (this.resolving || this.battle.phase !== 'player') return;
    playSfx('ui_click');
    this.battle = cycleTarget(this.battle, dir);
    this.refreshUi();
  }

  private moveAction(dir: 1 | -1): void {
    if (this.resolving || this.battle.phase !== 'player') return;
    playSfx('ui_click');
    this.actionCursor =
      (this.actionCursor + dir + DRAGON_ACTIONS.length) % DRAGON_ACTIONS.length;
    this.refreshUi();
  }

  private pickAction(index: number): void {
    if (this.resolving || this.battle.phase !== 'player') return;
    if (index < 0 || index >= DRAGON_ACTIONS.length) return;
    this.actionCursor = index;
    this.confirmAction();
  }

  private confirmAction(): void {
    if (this.resolving) return;

    if (this.battle.phase === 'won') {
      this.nextWave();
      return;
    }
    if (this.battle.phase === 'lost') {
      this.retryWave();
      return;
    }
    if (this.battle.phase !== 'player') return;

    const action = DRAGON_ACTIONS[this.actionCursor]?.id as DragonActionId;
    if (!action) return;

    playSfx('attack');
    this.resolving = true;
    this.battle = applyDragonAction(this.battle, action);
    this.refreshUi();
    this.flashDragon();

    if (this.battle.phase === 'won') {
      playSfx('success');
      this.resolving = false;
      this.refreshUi();
      return;
    }

    // Enemy phase after short delay
    this.time.delayedCall(450, () => {
      this.battle = resolveVillagerRound(this.battle);
      if (this.battle.phase === 'lost') {
        playSfx('death');
      } else {
        playSfx('hit_player');
      }
      if (!loadSettings().reduceMotion && this.battle.phase === 'lost') {
        this.cameras.main.shake(100, 0.008);
      }
      this.refreshUi();
      this.resolving = false;
    });
  }

  private flashDragon(): void {
    if (loadSettings().reduceMotion) return;
    this.tweens.add({
      targets: this.dragonSprite,
      scale: SPRITE_SCALE * 2.2,
      duration: 80,
      yoyo: true,
    });
  }

  private nextWave(): void {
    this.campaign = applyWaveVictory(this.campaign, this.battle);
    writeHumanzSave(this.campaign);
    playSfx('level_up');
    this.battle = startWave(this.campaign);
    this.buildVillagerVisuals();
    this.actionCursor = 0;
    this.resolving = false;
    this.refreshUi();
  }

  private retryWave(): void {
    this.campaign = applyWaveLoss(this.campaign, this.battle);
    writeHumanzSave(this.campaign);
    playSfx('ui_click');
    this.battle = startWave(this.campaign);
    this.buildVillagerVisuals();
    this.actionCursor = 0;
    this.resolving = false;
    this.refreshUi();
  }

  private newRun(): void {
    clearHumanzSave();
    this.campaign = loadHumanzSave();
    writeHumanzSave(this.campaign);
    this.battle = startWave(this.campaign);
    this.buildVillagerVisuals();
    this.actionCursor = 0;
    this.resolving = false;
    playSfx('success');
    this.refreshUi();
  }

  private backToTitle(): void {
    writeHumanzSave({
      ...this.campaign,
      dragonHp: this.battle.dragonHp,
      gold: this.battle.gold,
    });
    playSfx('ui_close');
    if (this.scene.isActive('UI')) this.scene.stop('UI');
    this.scene.start('Title');
  }
}
