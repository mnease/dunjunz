import './style.css';
import Phaser from 'phaser';
import { GAME_H, GAME_W } from './config';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { VillageScene } from './scenes/VillageScene';
import { ArmyScene } from './scenes/ArmyScene';
import { TurnBattleScene } from './scenes/TurnBattleScene';
import { installAudioUnlock } from './systems/audio';
import { initAuthUi } from './ui/auth';
import { initFeedbackUi } from './ui/feedback';
import { initHeroPickUi } from './ui/hero-pick';
import { initCombatModeUi } from './ui/combat-mode';
import { initJournalUi } from './ui/journal';
import { initSettingsUi } from './ui/settings';
import { initTouchPad } from './systems/touch-input';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#0a0c10',
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [
    BootScene,
    TitleScene,
    GameScene,
    UIScene,
    VillageScene,
    ArmyScene,
    TurnBattleScene,
  ],
};

// eslint-disable-next-line no-new
const game = new Phaser.Game(config);
(window as unknown as { __DUNJUNZ_GAME__?: Phaser.Game }).__DUNJUNZ_GAME__ = game;

// Page chrome: journal (quests/brags) + settings + account + feedback
installAudioUnlock();
initJournalUi();
initHeroPickUi();
initCombatModeUi();
initSettingsUi();
initAuthUi();
initFeedbackUi();
initTouchPad();
