/**
 * ARMY MODE — barracks, mass level-up, unlimited roster brawl.
 */

import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config';
import {
  ARMY_MIN_LEVEL,
  armySize,
  armyTotalPower,
  canGraduateToArmy,
  enlistPrefab,
  graduateHeroToArmy,
  loadArmySave,
  PERSONALITY_IDS,
  PERSONALITIES,
  writeArmySave,
  type ArmySave,
  type PersonalityId,
} from '../systems/army';
import { levelEntireArmy, type ArmyLevelMode } from '../systems/army-level';
import {
  countLiving,
  resolveArmyRound,
  startArmyBattle,
  type ArmyBattleState,
} from '../systems/army-battle';
import { ATTR_IDS } from '../systems/attributes';
import type { AttrId } from '../types';
import { loadSave } from '../systems/save';
import { playMusic, playSfx, unlockAudio } from '../systems/audio';
import { setLastMode } from '../systems/humanz-save';

type Panel = 'barracks' | 'battle' | 'level';

export class ArmyScene extends Phaser.Scene {
  private army!: ArmySave;
  private panel: Panel = 'barracks';
  private titleText!: Phaser.GameObjects.Text;
  private bodyText!: Phaser.GameObjects.Text;
  private logText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private cursor = 0;
  private battle: ArmyBattleState | null = null;
  private levelMode: ArmyLevelMode = 'auto';
  private manualMajor: AttrId = 'str';
  private manualMinor: AttrId = 'vit';
  private wave = 1;

  constructor() {
    super('Army');
  }

  create(): void {
    void unlockAudio().then(() => playMusic('dungeon'));
    setLastMode('army');
    this.cameras.main.setBackgroundColor(0x120a18);
    this.army = loadArmySave();
    this.levelMode = this.army.preferAutoLevel ? 'auto' : 'manual';
    this.panel = 'barracks';
    this.cursor = 0;
    this.battle = null;
    this.wave = 1;

    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x120a18);
    this.add
      .rectangle(GAME_W / 2, GAME_H / 2, GAME_W - 20, GAME_H - 20)
      .setStrokeStyle(2, 0xffc857, 0.85)
      .setFillStyle(0x000000, 0);

    this.titleText = this.add
      .text(GAME_W / 2, 28, 'ARMY MODE — UNLIMITED MENACE', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '12px',
        color: '#ffc857',
        align: 'center',
      })
      .setOrigin(0.5);

    this.bodyText = this.add
      .text(20, 52, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '9px',
        color: '#c5cde0',
        lineSpacing: 6,
        wordWrap: { width: GAME_W - 40 },
      });

    this.logText = this.add
      .text(20, Math.floor(GAME_H * 0.52), '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#7dffb3',
        lineSpacing: 5,
        wordWrap: { width: GAME_W - 40 },
      });

    this.promptText = this.add
      .text(GAME_W / 2, GAME_H - 22, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#6a738a',
        align: 'center',
      })
      .setOrigin(0.5);

    this.refresh();

    const kb = this.input.keyboard!;
    const handlers: [string, () => void][] = [
      ['keydown-ESC', () => this.goTitle()],
      ['keydown-B', () => this.setPanel('barracks')],
      ['keydown-F', () => this.setPanel('battle')],
      ['keydown-L', () => this.setPanel('level')],
      ['keydown-G', () => this.tryGraduate()],
      ['keydown-ENTER', () => this.onConfirm()],
      ['keydown-SPACE', () => this.onConfirm()],
      ['keydown-UP', () => this.moveCursor(-1)],
      ['keydown-DOWN', () => this.moveCursor(1)],
      ['keydown-W', () => this.moveCursor(-1)],
      ['keydown-S', () => this.moveCursor(1)],
      ['keydown-A', () => this.toggleLevelMode()],
      ['keydown-M', () => this.toggleLevelMode()],
      ['keydown-ONE', () => this.pickMajor(0)],
      ['keydown-TWO', () => this.pickMajor(1)],
      ['keydown-THREE', () => this.pickMajor(2)],
      ['keydown-FOUR', () => this.pickMajor(3)],
      ['keydown-FIVE', () => this.pickMajor(4)],
      ['keydown-SIX', () => this.pickMinor(0)],
      ['keydown-SEVEN', () => this.pickMinor(1)],
      ['keydown-EIGHT', () => this.pickMinor(2)],
      ['keydown-NINE', () => this.pickMinor(3)],
      ['keydown-ZERO', () => this.pickMinor(4)],
      ['keydown-R', () => this.rerollPrefab()],
    ];
    for (const [ev, fn] of handlers) kb.on(ev, fn);
    this.events.once('shutdown', () => {
      for (const [ev, fn] of handlers) kb.off(ev, fn);
    });
  }

  private setPanel(p: Panel): void {
    playSfx('ui_click');
    this.panel = p;
    this.cursor = 0;
    if (p === 'battle' && !this.battle) {
      this.startBattle();
    }
    this.refresh();
  }

  private saveArmy(): void {
    writeArmySave(this.army);
  }

  private refresh(): void {
    const n = armySize(this.army);
    const power = armyTotalPower(this.army);

    if (this.panel === 'barracks') {
      this.titleText.setText('ARMY BARRACKS — BUILD YOUR HORDE');
      const lines = [
        `ROSTER: ${n}  (NO PARTY CAP — ONLY DEV LIMIT)`,
        `TOTAL POWER: ${power}   WINS ${this.army.battlesWon} / LOSS ${this.army.battlesLost}`,
        `GRADUATE FROM DUNJUNZ AT LV${ARMY_MIN_LEVEL}+ (G)`,
        '',
      ];
      if (!n) {
        lines.push(
          'EMPTY. PATHETIC. BEAUTIFUL POTENTIAL.',
          `TRAIN A HERO TO ${ARMY_MIN_LEVEL}, THEN PRESS G HERE.`,
          'OR R FOR A PREFAB MENACE (DEBUG FUN).',
        );
      } else {
        const start = Math.max(0, Math.min(this.cursor, n - 1) - 4);
        const slice = this.army.members.slice(start, start + 9);
        slice.forEach((m, i) => {
          const idx = start + i;
          const sel = idx === this.cursor ? '▶' : ' ';
          const p = PERSONALITIES[m.personality]?.name ?? '?';
          lines.push(
            `${sel}${idx + 1}. ${m.name} ${m.title}`,
            `   Lv${m.level} ${m.primaryClass ?? '???'} · ${p}`,
            `   STR${m.attrs.str} DEX${m.attrs.dex} VIT${m.attrs.vit} INT${m.attrs.int} LCK${m.attrs.lck}`,
            `   Focus +2 ${m.primaryStat.toUpperCase()} / +1 ${m.secondaryStat.toUpperCase()} (5th lvls)`,
          );
        });
      }
      this.bodyText.setText(lines.join('\n'));
      this.logText.setText(
        n
          ? this.army.members[this.cursor]?.originNote ?? ''
          : 'Tip: each crawl hero is a new personality in the collective.',
      );
      this.promptText.setText(
        'B BARRACKS  F FIGHT  L LEVEL-UP  G GRADUATE  R PREFAB  ESC TITLE',
      );
      return;
    }

    if (this.panel === 'level') {
      this.titleText.setText('ARMY LEVEL-UP — MASS ABSURDITY');
      const lines = [
        `MODE: ${this.levelMode.toUpperCase()}  (A/M TOGGLE)`,
        this.levelMode === 'auto'
          ? 'AUTO: +2 LOWEST · +1 2ND LOWEST · EVERY 5TH LVL USES FOCUS STATS'
          : `MANUAL: +2 ${this.manualMajor.toUpperCase()} · +1 ${this.manualMinor.toUpperCase()}`,
        '',
        'MANUAL KEYS: 1-5 = MAJOR(+2)   6-0 = MINOR(+1)',
        '  1STR 2DEX 3VIT 4INT 5LCK',
        '  6STR 7DEX 8VIT 9INT 0LCK',
        '',
        'ENTER = LEVEL ENTIRE ARMY +1',
        'UP/DOWN + ENTER ON UNIT = LEVEL ONE',
        '',
        `ROSTER ${n} · Cursor unit: ${this.army.members[this.cursor]?.name ?? '—'}`,
      ];
      this.bodyText.setText(lines.join('\n'));
      this.logText.setText(
        'Auto is random-feeling on ties — you may hate it. That is the point.',
      );
      this.promptText.setText(
        'ENTER MASS LEVEL  ·  SHIFT+ENTER N/A  ·  B BACK  ·  ESC TITLE',
      );
      return;
    }

    // battle
    this.titleText.setText(`ARMY BRAWL — WAVE ${this.wave}`);
    if (!this.battle) {
      this.bodyText.setText('NO BATTLE. PRESS ENTER TO DEPLOY THE WHOLE ARMY.');
      this.logText.setText('');
      this.promptText.setText('ENTER FIGHT  B BARRACKS  ESC TITLE');
      return;
    }
    const b = this.battle;
    this.bodyText.setText(
      [
        `ARMY ALIVE ${countLiving(b.army)}/${b.army.length}`,
        `HORDE ALIVE ${countLiving(b.horde)}/${b.horde.length}`,
        `TURN ${b.turn}  PHASE ${b.phase.toUpperCase()}`,
        '',
        b.phase === 'won'
          ? 'VICTORY — ENTER NEXT WAVE'
          : b.phase === 'lost'
            ? 'DEFEAT — ENTER RETRY'
            : 'ENTER = RESOLVE ROUND (EVERYONE SWINGS)',
      ].join('\n'),
    );
    this.logText.setText(b.log.slice(-12).join('\n'));
    this.promptText.setText('ENTER ROUND/ADVANCE  B BARRACKS  ESC TITLE');
  }

  private moveCursor(dir: number): void {
    if (this.panel === 'battle') return;
    const n = Math.max(1, this.army.members.length);
    this.cursor = (this.cursor + dir + n) % n;
    playSfx('ui_click');
    this.refresh();
  }

  private toggleLevelMode(): void {
    if (this.panel !== 'level') return;
    this.levelMode = this.levelMode === 'auto' ? 'manual' : 'auto';
    playSfx('ui_click');
    this.refresh();
  }

  private pickMajor(i: number): void {
    if (this.panel !== 'level') return;
    const a = ATTR_IDS[i];
    if (!a) return;
    this.manualMajor = a;
    if (this.manualMinor === a) {
      this.manualMinor = ATTR_IDS.find((x) => x !== a) ?? 'vit';
    }
    playSfx('ui_click');
    this.refresh();
  }

  private pickMinor(i: number): void {
    if (this.panel !== 'level') return;
    const a = ATTR_IDS[i];
    if (!a) return;
    this.manualMinor = a;
    if (this.manualMajor === a) {
      this.manualMajor = ATTR_IDS.find((x) => x !== a) ?? 'str';
    }
    playSfx('ui_click');
    this.refresh();
  }

  private onConfirm(): void {
    if (this.panel === 'level') {
      this.doMassLevel();
      return;
    }
    if (this.panel === 'battle') {
      this.advanceBattle();
      return;
    }
    // barracks: level selected unit shortcut via L panel preferred
    playSfx('ui_click');
  }

  private doMassLevel(): void {
    const manual =
      this.levelMode === 'manual'
        ? { major: this.manualMajor, minor: this.manualMinor }
        : undefined;
    const r = levelEntireArmy(this.army, this.levelMode, manual);
    if ('error' in r) {
      playSfx('error');
      this.logText.setText(r.error);
      return;
    }
    this.army = r.army;
    this.saveArmy();
    playSfx('level_up');
    this.logText.setText(r.log.slice(0, 14).join('\n'));
    this.refresh();
  }

  private tryGraduate(): void {
    const save = loadSave();
    if (!canGraduateToArmy(save)) {
      playSfx('error');
      this.logText.setText(
        `CRAWL HERO IS LV${save.level} — NEED ${ARMY_MIN_LEVEL}+. GO TRAIN IN DUNJUNZ.`,
      );
      return;
    }
    const r = graduateHeroToArmy(this.army, save);
    if (!r.ok) {
      playSfx('error');
      this.logText.setText(r.reason);
      return;
    }
    this.army = r.army;
    this.saveArmy();
    this.cursor = this.army.members.length - 1;
    playSfx('success');
    this.logText.setText(
      [
        `ENLISTED: ${r.member.name} ${r.member.title}`,
        PERSONALITIES[r.member.personality].blurb,
        r.member.originNote,
        'KEEP THE CRAWL SAVE — TRAIN ANOTHER PERSONALITY!',
      ].join('\n'),
    );
    this.panel = 'barracks';
    this.refresh();
  }

  private rerollPrefab(): void {
    const classes = [
      'barbarian',
      'ranger',
      'wizard',
      'bard',
      'druid',
      'fighter',
    ] as const;
    const c = classes[Math.floor(Math.random() * classes.length)]!;
    const p = PERSONALITY_IDS[
      Math.floor(Math.random() * PERSONALITY_IDS.length)
    ] as PersonalityId;
    this.army = enlistPrefab(
      this.army,
      c,
      p,
      ARMY_MIN_LEVEL + Math.floor(Math.random() * 10),
    );
    this.saveArmy();
    this.cursor = this.army.members.length - 1;
    playSfx('success');
    this.refresh();
  }

  private startBattle(): void {
    const r = startArmyBattle(this.army, this.wave);
    if ('error' in r) {
      playSfx('error');
      this.battle = null;
      this.logText.setText(r.error);
      return;
    }
    this.battle = r;
    playSfx('attack');
  }

  private advanceBattle(): void {
    if (!this.battle) {
      this.startBattle();
      this.refresh();
      return;
    }
    if (this.battle.phase === 'won') {
      this.army = {
        ...this.army,
        battlesWon: this.army.battlesWon + 1,
      };
      this.saveArmy();
      this.wave += 1;
      playSfx('level_up');
      this.startBattle();
      this.refresh();
      return;
    }
    if (this.battle.phase === 'lost') {
      this.army = {
        ...this.army,
        battlesLost: this.army.battlesLost + 1,
      };
      this.saveArmy();
      playSfx('death');
      this.startBattle();
      this.refresh();
      return;
    }
    this.battle = resolveArmyRound(this.battle, this.army.members);
    if (this.battle.phase === 'won') playSfx('success');
    else if (this.battle.phase === 'lost') playSfx('death');
    else playSfx('hit_enemy');
    this.refresh();
  }

  private goTitle(): void {
    this.saveArmy();
    playSfx('ui_close');
    if (this.scene.isActive('UI')) this.scene.stop('UI');
    this.scene.start('Title');
  }
}
