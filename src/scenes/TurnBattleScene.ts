/**
 * Classic turn-based battle presentation — heroes left, enemies right.
 * Launched from GameScene when combatMode === 'turn'.
 */

import Phaser from 'phaser';
import { GAME_H, GAME_W, HUD_H, SPRITE_SCALE } from '../config';
import { playSfx } from '../systems/audio';
import {
  applyBattleToSave,
  currentActor,
  selectAction,
  selectTarget,
  startBattle,
  type TbActionId,
  type TbBattleState,
  type TbEnemySeed,
  buildEnemies,
  buildHeroes,
  potionCount,
} from '../systems/turn-battle';
import { loadSave, writeSave } from '../systems/save';
import { enemyXpReward, grantXp } from '../systems/progression';
import { recordKill } from '../systems/hard-mode';
import type { LandId, SaveData } from '../types';
import { getBestBud, isCompanionActive } from '../systems/best-bud';

export type TurnBattleLaunch = {
  enemies: TbEnemySeed[];
  roomId: string;
  land?: LandId;
  /** Threat for XP scaling. */
  threat?: number;
};

export class TurnBattleScene extends Phaser.Scene {
  private state!: TbBattleState;
  private save!: SaveData;
  private launch!: TurnBattleLaunch;
  private logText!: Phaser.GameObjects.Text;
  private cmdTexts: Phaser.GameObjects.Text[] = [];
  private heroSprites: Phaser.GameObjects.Image[] = [];
  private enemySprites: Phaser.GameObjects.Image[] = [];
  private hpTexts: Phaser.GameObjects.Text[] = [];
  private titleText!: Phaser.GameObjects.Text;
  private cmdIndex = 0;
  private targetIndex = 0;
  private readonly cmds: { id: TbActionId; label: string }[] = [
    { id: 'attack', label: '1 ATTACK' },
    { id: 'defend', label: '2 DEFEND' },
    { id: 'item', label: '3 ITEM' },
    { id: 'flee', label: '4 FLEE' },
  ];

  constructor() {
    super('TurnBattle');
  }

  init(data: TurnBattleLaunch): void {
    this.launch = data;
  }

  create(): void {
    this.save = loadSave();
    this.cameras.main.setBackgroundColor(0x0a1020);
    this.add
      .rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x0a1020)
      .setDepth(0);

    // Arena floor bands
    this.add
      .rectangle(GAME_W / 2, HUD_H + 40, GAME_W - 40, 8, 0x1a3048)
      .setOrigin(0.5, 0);
    this.add
      .rectangle(GAME_W * 0.22, GAME_H * 0.55, 220, 12, 0x2a3a28, 0.5)
      .setOrigin(0.5);
    this.add
      .rectangle(GAME_W * 0.78, GAME_H * 0.55, 280, 12, 0x3a2a28, 0.5)
      .setOrigin(0.5);

    this.add
      .text(GAME_W / 2, 28, 'TURN-BASED BATTLE', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '12px',
        color: '#7dffb3',
      })
      .setOrigin(0.5)
      .setDepth(5);

    this.titleText = this.add
      .text(GAME_W / 2, 52, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '9px',
        color: '#ffc857',
      })
      .setOrigin(0.5)
      .setDepth(5);

    const bud = getBestBud(this.save.bestBudId);
    const heroes = buildHeroes(this.save, {
      includeBud: isCompanionActive(this.save),
      budName: bud?.name,
    });
    const enemies = buildEnemies(this.launch.enemies);
    this.state = startBattle(heroes, enemies, potionCount(this.save));

    this.buildSprites();
    this.logText = this.add
      .text(40, GAME_H - 160, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#c5cde0',
        lineSpacing: 8,
        wordWrap: { width: GAME_W - 80 },
      })
      .setDepth(10);

    // Command menu
    const cmdY = GAME_H - 90;
    this.cmds.forEach((c, i) => {
      const t = this.add
        .text(48 + i * 160, cmdY, c.label, {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '9px',
          color: '#c5cde0',
        })
        .setDepth(10)
        .setInteractive({ useHandCursor: true });
      t.on('pointerdown', () => this.pickCmd(i));
      this.cmdTexts.push(t);
    });

    const kb = this.input.keyboard!;
    kb.on('keydown-ONE', () => this.pickCmd(0));
    kb.on('keydown-TWO', () => this.pickCmd(1));
    kb.on('keydown-THREE', () => this.pickCmd(2));
    kb.on('keydown-FOUR', () => this.pickCmd(3));
    kb.on('keydown-LEFT', () => this.nudgeTarget(-1));
    kb.on('keydown-RIGHT', () => this.nudgeTarget(1));
    kb.on('keydown-A', () => this.nudgeTarget(-1));
    kb.on('keydown-D', () => this.nudgeTarget(1));
    kb.on('keydown-ENTER', () => this.confirm());
    kb.on('keydown-SPACE', () => this.confirm());
    kb.on('keydown-Z', () => this.confirm());

    this.events.once('shutdown', () => {
      kb.removeAllListeners();
    });

    playSfx('ui_open');
    this.refreshUi();
  }

  private buildSprites(): void {
    this.heroSprites.forEach((s) => s.destroy());
    this.enemySprites.forEach((s) => s.destroy());
    this.hpTexts.forEach((t) => t.destroy());
    this.heroSprites = [];
    this.enemySprites = [];
    this.hpTexts = [];

    this.state.heroes.forEach((h, i) => {
      const y = 200 + i * 100;
      const x = 160;
      const key =
        h.tex && this.textures.exists(h.tex)
          ? h.tex
          : this.textures.exists('player')
            ? 'player'
            : 'npc';
      const img = this.add
        .image(x, y, key)
        .setScale(SPRITE_SCALE * 1.4)
        .setDepth(4)
        .setFlipX(false);
      this.heroSprites.push(img);
      const hp = this.add
        .text(x, y + 40, '', {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '8px',
          color: '#7dffb3',
          align: 'center',
        })
        .setOrigin(0.5)
        .setDepth(5);
      this.hpTexts.push(hp);
    });

    this.state.enemies.forEach((e, i) => {
      const y = 180 + i * 90;
      const x = GAME_W - 180;
      const key =
        e.tex && this.textures.exists(e.tex)
          ? e.tex
          : this.textures.exists(e.kind)
            ? e.kind
            : 'slime';
      const img = this.add
        .image(x, y, key)
        .setScale(SPRITE_SCALE * 1.3)
        .setDepth(4)
        .setInteractive({ useHandCursor: true });
      img.on('pointerdown', () => {
        if (this.state.phase === 'pick_target') {
          this.state = selectTarget(this.state, e.id);
          playSfx('attack');
          this.refreshUi();
          this.checkEnd();
        } else {
          this.targetIndex = i;
          this.refreshUi();
        }
      });
      this.enemySprites.push(img);
      const hp = this.add
        .text(x, y + 40, '', {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '8px',
          color: '#ff6b9d',
          align: 'center',
        })
        .setOrigin(0.5)
        .setDepth(5);
      this.hpTexts.push(hp);
    });
  }

  private livingEnemyIds(): string[] {
    return this.state.enemies.filter((e) => e.alive).map((e) => e.id);
  }

  private pickCmd(i: number): void {
    if (this.state.phase === 'won' || this.state.phase === 'lost' || this.state.phase === 'fled') {
      this.finish();
      return;
    }
    if (this.state.phase !== 'pick_action') return;
    const actor = currentActor(this.state);
    if (!actor || actor.side !== 'hero') return;
    this.cmdIndex = Phaser.Math.Clamp(i, 0, this.cmds.length - 1);
    const action = this.cmds[this.cmdIndex]!.id;
    playSfx('ui_click');
    this.state = selectAction(this.state, action);
    if (this.state.phase === 'pick_target') {
      this.targetIndex = 0;
    }
    this.refreshUi();
    this.checkEnd();
  }

  private nudgeTarget(dir: number): void {
    if (this.state.phase !== 'pick_target') {
      this.cmdIndex = Phaser.Math.Clamp(
        this.cmdIndex + dir,
        0,
        this.cmds.length - 1,
      );
      this.refreshUi();
      return;
    }
    const ids = this.livingEnemyIds();
    if (!ids.length) return;
    this.targetIndex =
      (this.targetIndex + dir + ids.length) % ids.length;
    this.refreshUi();
  }

  private confirm(): void {
    if (this.state.phase === 'won' || this.state.phase === 'lost' || this.state.phase === 'fled') {
      this.finish();
      return;
    }
    if (this.state.phase === 'pick_action') {
      this.pickCmd(this.cmdIndex);
      return;
    }
    if (this.state.phase === 'pick_target') {
      const ids = this.livingEnemyIds();
      const id = ids[this.targetIndex];
      if (!id) return;
      playSfx('attack');
      this.state = selectTarget(this.state, id);
      this.refreshUi();
      this.checkEnd();
    }
  }

  private refreshUi(): void {
    // Rebuild sprites if counts changed
    if (
      this.heroSprites.length !== this.state.heroes.length ||
      this.enemySprites.length !== this.state.enemies.length
    ) {
      this.buildSprites();
    }

    let hi = 0;
    this.state.heroes.forEach((h, i) => {
      const img = this.heroSprites[i];
      if (img) {
        img.setAlpha(h.alive ? 1 : 0.25);
        img.setTint(h.defending ? 0x88aaff : 0xffffff);
      }
      const t = this.hpTexts[hi++];
      if (t) {
        t.setText(
          `${h.name}\n${Math.max(0, h.hp)}/${h.maxHp}${h.defending ? ' [D]' : ''}`,
        );
        t.setColor(h.alive ? '#7dffb3' : '#555');
      }
    });
    this.state.enemies.forEach((e, i) => {
      const img = this.enemySprites[i];
      if (img) {
        img.setAlpha(e.alive ? 1 : 0.2);
        const living = this.livingEnemyIds();
        const sel =
          this.state.phase === 'pick_target' &&
          living[this.targetIndex] === e.id;
        img.setTint(sel ? 0xffc857 : 0xffffff);
        img.setScale(SPRITE_SCALE * (sel ? 1.45 : 1.3));
      }
      const t = this.hpTexts[hi++];
      if (t) {
        t.setText(`${e.name}\n${Math.max(0, e.hp)}/${e.maxHp}`);
        t.setColor(e.alive ? '#ff6b9d' : '#555');
      }
    });

    const logTail = this.state.log.slice(-8).join('\n');
    this.logText.setText(logTail);

    const actor = currentActor(this.state);
    if (this.state.phase === 'pick_action' && actor?.side === 'hero') {
      this.titleText.setText(
        `${actor.name} — CHOOSE ACTION  (POTIONS: ${this.state.potions})`,
      );
    } else if (this.state.phase === 'pick_target') {
      this.titleText.setText('← → SELECT ENEMY · ENTER CONFIRM');
    } else if (this.state.phase === 'won') {
      this.titleText.setText('VICTORY — ENTER TO CONTINUE');
    } else if (this.state.phase === 'lost') {
      this.titleText.setText('DEFEAT — ENTER TO CONTINUE');
    } else if (this.state.phase === 'fled') {
      this.titleText.setText('FLED — ENTER TO CONTINUE');
    } else {
      this.titleText.setText('…');
    }

    this.cmdTexts.forEach((t, i) => {
      const on = this.state.phase === 'pick_action' && actor?.side === 'hero';
      t.setVisible(on);
      t.setColor(i === this.cmdIndex ? '#ffc857' : '#c5cde0');
    });
  }

  private checkEnd(): void {
    // Enemy AI may chain — refresh after
    if (
      this.state.phase !== 'won' &&
      this.state.phase !== 'lost' &&
      this.state.phase !== 'fled'
    ) {
      // If it's still an enemy turn somehow, state already resolved AI
      this.refreshUi();
    }
  }

  private finish(): void {
    this.save = applyBattleToSave(this.save, this.state);
    const threat = this.launch.threat ?? 0;
    const land = this.launch.land;

    if (this.state.phase === 'won') {
      playSfx('success');
      let xp = 0;
      for (const id of this.state.defeatedEnemyIds) {
        const seed = this.launch.enemies.find((e) => e.id === id);
        if (!seed) continue;
        xp += enemyXpReward(seed.kind, threat);
        if (land) this.save = recordKill(this.save, id, land);
      }
      if (xp > 0) {
        const prog = grantXp(
          { xp: this.save.xp, level: this.save.level, attrPoints: this.save.attrPoints },
          xp,
        );
        this.save = {
          ...this.save,
          xp: prog.xp,
          level: prog.level,
          attrPoints: prog.attrPoints,
        };
      }
      writeSave(this.save);
      this.game.events.emit('toast', `VICTORY +${xp} XP`);
    } else if (this.state.phase === 'lost') {
      playSfx('death');
      this.save = { ...this.save, hp: 0 };
      writeSave(this.save);
    } else {
      writeSave(this.save);
      this.game.events.emit('toast', 'FLED THE BATTLE');
    }

    // Resume crawl
    this.scene.stop('TurnBattle');
    if (this.scene.isSleeping('Game')) {
      this.scene.wake('Game');
    } else if (!this.scene.isActive('Game')) {
      this.scene.start('Game');
    }
    if (this.scene.isSleeping('UI')) {
      this.scene.wake('UI');
    } else if (!this.scene.isActive('UI')) {
      this.scene.launch('UI');
    }
    this.game.events.emit('turn-battle-ended', {
      phase: this.state.phase,
      defeatedIds: this.state.defeatedEnemyIds,
      save: this.save,
    });
  }
}
