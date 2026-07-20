import Phaser from 'phaser';
import {
  COLORS,
  GAME_H,
  GAME_W,
  HUD_H,
  MAP_PIXEL_H,
  MAP_PIXEL_W,
  SCALE,
  TILE,
  VIEW_TILES_H,
  VIEW_TILES_W,
} from '../config';
import { ROOMS } from '../data/world';
import {
  enemyXpReward,
  grantXp,
} from '../systems/progression';
import {
  applyLootToSave,
  lootSummary,
  openChest,
} from '../systems/loot';
import {
  attemptFeaturedPurchase,
  shopCatalogLines,
} from '../systems/shop';
import { useInventoryItem } from '../systems/inventory';
import { loadSave, writeSave } from '../systems/save';
import type { EntityDef, EntityKind, RoomDef, SaveData, TileKind } from '../types';

interface Actor {
  sprite: Phaser.Physics.Arcade.Sprite;
  kind: EntityKind;
  id: string;
  hp: number;
  maxHp: number;
  dialog?: string[];
  hurtCooldown: number;
  aiTimer: number;
  alive: boolean;
  interactive: boolean;
  chestTable?: string;
  shopId?: string;
}

const SOLID: TileKind[] = ['wall', 'water', 'void', 'locked'];
const CHAR_TO_TILE: Record<string, TileKind> = {
  '#': 'wall',
  '.': 'floor',
  g: 'grass',
  d: 'dirt',
  '~': 'water',
  D: 'door',
  L: 'locked',
  S: 'stairs',
  '=': 'lava',
  P: 'pad',
  ' ': 'void',
};

const TEX: Record<TileKind, string> = {
  void: 'tile-floor',
  floor: 'tile-floor',
  wall: 'tile-wall',
  grass: 'tile-grass',
  dirt: 'tile-dirt',
  water: 'tile-water',
  door: 'tile-door',
  locked: 'tile-locked',
  stairs: 'tile-stairs',
  entrance: 'tile-stairs',
  lava: 'tile-lava',
  pad: 'tile-pad',
};

const ENTITY_TEX: Record<EntityKind, string> = {
  slime: 'slime',
  skeleton: 'skeleton',
  redshirt: 'redshirt',
  cube: 'cube',
  boss: 'boss',
  npc: 'npc',
  merchant: 'merchant',
  key: 'key',
  heart: 'heart',
  sword: 'sword-item',
  sign: 'sign',
  chest: 'chest',
};

export class GameScene extends Phaser.Scene {
  private save!: SaveData;
  private room!: RoomDef;
  private tileGrid: TileKind[][] = [];
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private actors: Actor[] = [];
  private player!: Phaser.Physics.Arcade.Sprite;
  private swordHit!: Phaser.Physics.Arcade.Image;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: {
    w: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
    z: Phaser.Input.Keyboard.Key;
    space: Phaser.Input.Keyboard.Key;
    esc: Phaser.Input.Keyboard.Key;
    e: Phaser.Input.Keyboard.Key;
    m: Phaser.Input.Keyboard.Key;
    enter: Phaser.Input.Keyboard.Key;
    b: Phaser.Input.Keyboard.Key;
    i: Phaser.Input.Keyboard.Key;
    u: Phaser.Input.Keyboard.Key;
    one: Phaser.Input.Keyboard.Key;
  };
  private facing: 'up' | 'down' | 'left' | 'right' = 'down';
  private attacking = false;
  private invuln = 0;
  private dialogLocked = false;
  /** Blocks re-open / attack for a beat after dialog closes (same key must not re-trigger). */
  private dialogCloseCooldown = 0;
  private inventoryOpen = false;
  private paused = false;
  private transitionLock = false;
  private roomOriginX = 0;
  private roomOriginY = 0;
  private padCooldown = 0;
  private bossIntroShown = false;

  constructor() {
    super('Game');
  }

  create(): void {
    // Phaser reuses the same Scene instance — always reset runtime state on enter.
    // Leftover dialogLocked/paused from a prior run freezes movement entirely.
    this.dialogLocked = false;
    this.dialogCloseCooldown = 0;
    this.inventoryOpen = false;
    this.paused = false;
    this.attacking = false;
    this.invuln = 0;
    this.transitionLock = false;
    this.padCooldown = 0;
    this.bossIntroShown = false;
    this.facing = 'down';
    this.actors = [];
    this.tileGrid = [];

    this.save = loadSave();
    this.roomOriginX = (GAME_W - MAP_PIXEL_W) / 2;
    this.roomOriginY = HUD_H + (GAME_H - HUD_H - MAP_PIXEL_H) / 2;

    this.cameras.main.setBackgroundColor(COLORS.black);
    this.physics.world.setBounds(
      this.roomOriginX,
      this.roomOriginY,
      MAP_PIXEL_W,
      MAP_PIXEL_H,
    );

    this.walls = this.physics.add.staticGroup();
    const kb = this.input.keyboard!;
    // Only capture action keys — do not capture movement keys
    kb.addCapture([
      Phaser.Input.Keyboard.KeyCodes.SPACE,
      Phaser.Input.Keyboard.KeyCodes.Z,
      Phaser.Input.Keyboard.KeyCodes.E,
      Phaser.Input.Keyboard.KeyCodes.ENTER,
      Phaser.Input.Keyboard.KeyCodes.B,
      Phaser.Input.Keyboard.KeyCodes.I,
      Phaser.Input.Keyboard.KeyCodes.U,
    ]);
    this.cursors = kb.createCursorKeys();
    this.keys = {
      w: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      z: kb.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
      space: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      esc: kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
      e: kb.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      m: kb.addKey(Phaser.Input.Keyboard.KeyCodes.M),
      enter: kb.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
      b: kb.addKey(Phaser.Input.Keyboard.KeyCodes.B),
      i: kb.addKey(Phaser.Input.Keyboard.KeyCodes.I),
      u: kb.addKey(Phaser.Input.Keyboard.KeyCodes.U),
      one: kb.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
    };

    // Event-based attack / interact / shop buy / inventory
    // NOTE: Enter is advance-only (UIScene). Opening talk is E so the last
    // Enter that closes a sign cannot immediately re-open it.
    kb.on('keydown-SPACE', this.onAttackKey, this);
    kb.on('keydown-Z', this.onAttackKey, this);
    kb.on('keydown-E', this.onInteractKey, this);
    kb.on('keydown-B', this.onBuyKey, this);
    kb.on('keydown-I', this.onInventoryKey, this);
    kb.on('keydown-U', this.onUseItemKey, this);
    kb.on('keydown-ONE', this.onUseItemKey, this);

    this.player = this.physics.add.sprite(0, 0, 'player');
    this.player.setScale(SCALE);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
    // Body size in source pixels (texture is 16x16); Phaser scales with the sprite
    this.player.setBodySize(10, 12, true);

    this.swordHit = this.physics.add.image(-999, -999, 'sword-swing');
    this.swordHit.setScale(SCALE);
    this.swordHit.setDepth(15);
    this.swordHit.setVisible(false);
    this.swordHit.setActive(false);
    const swordBody = this.swordHit.body as Phaser.Physics.Arcade.Body;
    swordBody.setAllowGravity(false);
    swordBody.enable = false;

    this.physics.add.collider(this.player, this.walls);

    this.game.events.on('dialog-state', this.onDialogState, this);
    this.game.events.on('inventory-state', this.onInventoryState, this);
    this.events.once('shutdown', () => {
      this.game.events.off('dialog-state', this.onDialogState, this);
      this.game.events.off('inventory-state', this.onInventoryState, this);
      kb.off('keydown-SPACE', this.onAttackKey, this);
      kb.off('keydown-Z', this.onAttackKey, this);
      kb.off('keydown-E', this.onInteractKey, this);
      kb.off('keydown-B', this.onBuyKey, this);
      kb.off('keydown-I', this.onInventoryKey, this);
      kb.off('keydown-U', this.onUseItemKey, this);
      kb.off('keydown-ONE', this.onUseItemKey, this);
      writeSave(this.save);
    });

    // Soft-reset UI only — stop+relaunch races strip dialog-show listeners
    if (!this.scene.isActive('UI')) {
      this.scene.launch('UI');
    } else {
      this.game.events.emit('ui-reset');
    }
    this.dialogLocked = false;
    this.game.events.emit('dialog-state', false);
    this.game.events.emit('pause-ui', false);

    this.loadRoom(this.save.roomId, true);
    this.emitHud();
  }

  private addWallAt(x: number, y: number, kind: TileKind): void {
    const wall = this.walls.create(x, y, TEX[kind]) as Phaser.Physics.Arcade.Sprite;
    // Invisible collider sized to one display tile — do NOT setSize(TILE*SCALE)
    // after setScale (that oversizes bodies and freezes the player).
    wall.setVisible(false);
    wall.setDisplaySize(TILE * SCALE, TILE * SCALE);
    wall.refreshBody();
  }

  private onDialogState = (open: boolean): void => {
    this.dialogLocked = open;
    if (!open) {
      // Same physical keypress that closed dialog must not re-open or attack
      this.dialogCloseCooldown = 280;
      if (this.player.body) {
        (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      }
    }
  };

  private onInventoryState = (open: boolean): void => {
    this.inventoryOpen = open;
    if (open && this.player.body) {
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    }
  };

  private onAttackKey = (): void => {
    // Space advances dialog when open (UI scene); do not swing mid-dialog
    if (
      this.dialogLocked ||
      this.inventoryOpen ||
      this.paused ||
      this.dialogCloseCooldown > 0
    ) {
      return;
    }
    this.tryAttack();
  };

  private onInteractKey = (): void => {
    // E opens talk. Enter never opens (UI only advances with Enter).
    if (
      this.dialogLocked ||
      this.inventoryOpen ||
      this.paused ||
      this.dialogCloseCooldown > 0
    ) {
      return;
    }
    this.tryInteract();
  };

  private onBuyKey = (): void => {
    if (
      this.dialogLocked ||
      this.inventoryOpen ||
      this.paused ||
      this.dialogCloseCooldown > 0
    ) {
      return;
    }
    this.tryBuyFromNearbyMerchant();
  };

  private onInventoryKey = (): void => {
    if (this.dialogLocked || this.paused) return;
    this.game.events.emit('inventory-toggle', this.save);
  };

  private onUseItemKey = (): void => {
    if (this.dialogLocked || this.paused) return;
    // Use potion from bag (works with inventory open or closed)
    const result = useInventoryItem(this.save, 'potion');
    if (!result.ok) {
      this.game.events.emit('toast', result.reason);
      return;
    }
    this.save = result.save;
    writeSave(this.save);
    this.emitHud();
    this.game.events.emit('inventory-refresh', this.save);
    this.game.events.emit('toast', result.message);
  };

  /** Reach in world pixels (~1.75 tiles at SCALE 3). Adjacent NPCs must be hittable. */
  private interactReach(): number {
    return TILE * SCALE * 1.75;
  }

  /** Grant starter sword (old man gift or ground pickup). */
  private grantSword(showDialog = true): void {
    if (this.save.hasSword) return;
    this.save.hasSword = true;
    if (!this.save.collected.includes('starter-sword')) {
      this.save.collected.push('starter-sword');
    }
    // Remove ground sword if still present
    const ground = this.actors.find((a) => a.id === 'starter-sword' && a.alive);
    if (ground) {
      ground.alive = false;
      ground.sprite.destroy();
    }
    writeSave(this.save);
    this.emitHud();
    if (showDialog) {
      this.game.events.emit('dialog-show', [
        'YOU GOT THE SWORD OF',
        'MILD ENTHUSIASM!',
        'PRESS SPACE OR Z TO SWING.',
        'TRY NOT TO HIT THE FURNITURE.',
      ]);
    } else {
      this.game.events.emit('toast', 'SWORD EQUIPPED!');
    }
  }

  private tileToWorld(tx: number, ty: number): { x: number; y: number } {
    return {
      x: this.roomOriginX + (tx + 0.5) * TILE * SCALE,
      y: this.roomOriginY + (ty + 0.5) * TILE * SCALE,
    };
  }

  private worldToTile(x: number, y: number): { tx: number; ty: number } {
    return {
      tx: Math.floor((x - this.roomOriginX) / (TILE * SCALE)),
      ty: Math.floor((y - this.roomOriginY) / (TILE * SCALE)),
    };
  }

  private parseTiles(room: RoomDef): TileKind[][] {
    const grid: TileKind[][] = [];
    for (let y = 0; y < VIEW_TILES_H; y++) {
      const row = room.tiles[y] ?? '#'.repeat(VIEW_TILES_W);
      const cells: TileKind[] = [];
      for (let x = 0; x < VIEW_TILES_W; x++) {
        const ch = row[x] ?? '#';
        cells.push(CHAR_TO_TILE[ch] ?? 'floor');
      }
      grid.push(cells);
    }
    return grid;
  }

  private clearRoomObjects(): void {
    this.walls.clear(true, true);
    for (const a of this.actors) {
      a.sprite.destroy();
    }
    this.actors = [];
    // Destroy map tiles (images tagged)
    this.children.list
      .filter((c) => (c as Phaser.GameObjects.Image).getData?.('mapTile'))
      .forEach((c) => c.destroy());
  }

  private loadRoom(roomId: string, fromSave: boolean, entryFrom?: string): void {
    const room = ROOMS[roomId];
    if (!room) return;

    this.transitionLock = false;
    this.clearRoomObjects();
    this.room = room;
    this.save.roomId = roomId;
    this.tileGrid = this.parseTiles(room);

    for (let y = 0; y < VIEW_TILES_H; y++) {
      for (let x = 0; x < VIEW_TILES_W; x++) {
        const kind = this.tileGrid[y][x];
        const pos = this.tileToWorld(x, y);
        const img = this.add
          .image(pos.x, pos.y, TEX[kind])
          .setScale(SCALE)
          .setDepth(0);
        img.setData('mapTile', true);

        if (SOLID.includes(kind)) {
          this.addWallAt(pos.x, pos.y, kind);
        }
      }
    }

    // Player spawn
    const spawn = this.findSpawn(entryFrom, fromSave);
    const p = this.tileToWorld(spawn.tx, spawn.ty);
    this.player.setPosition(p.x, p.y);
    const pBody = this.player.body as Phaser.Physics.Arcade.Body;
    pBody.setVelocity(0, 0);
    pBody.enable = true;
    this.player.setActive(true).setVisible(true);

    // Entities
    for (const def of room.entities ?? []) {
      if (def.id && this.save.killed.includes(def.id)) continue;
      if (def.id && this.save.collected.includes(def.id)) continue;
      // Boss chest waits until the DM is defeated
      if (
        def.kind === 'chest' &&
        def.id === 'boss-chest' &&
        !this.save.bossDefeated
      ) {
        continue;
      }
      this.spawnEntity(def);
    }

    // Ensure boss chest appears after victory if not collected
    if (roomId === 'boss' && this.save.bossDefeated) {
      const chestDef = room.entities?.find((e) => e.id === 'boss-chest');
      if (chestDef && !this.save.collected.includes(chestDef.id ?? '')) {
        const exists = this.actors.some((a) => a.id === 'boss-chest');
        if (!exists) this.spawnEntity(chestDef);
      }
    }

    this.emitHud();
    writeSave(this.save);

    if (roomId === 'boss' && !this.save.bossDefeated && !this.bossIntroShown) {
      this.bossIntroShown = true;
      const boss = this.actors.find((a) => a.kind === 'boss');
      if (boss?.dialog) {
        this.time.delayedCall(300, () => {
          this.game.events.emit('dialog-show', boss.dialog);
        });
      }
    }
  }

  private findSpawn(
    entryFrom?: string,
    fromSave?: boolean,
  ): { tx: number; ty: number } {
    // Entering dungeon from overworld stairs
    if (this.room.id === 'dungeon_1' && entryFrom === 'overworld') {
      return { tx: 8, ty: 9 };
    }
    if (this.room.id === 'overworld' && entryFrom === 'dungeon_1') {
      return { tx: 7, ty: 6 };
    }

    // Directional transitions
    if (entryFrom === 'north') return { tx: 8, ty: 9 };
    if (entryFrom === 'south') return { tx: 8, ty: 1 };
    if (entryFrom === 'east') return { tx: 1, ty: 5 };
    if (entryFrom === 'west') return { tx: 14, ty: 5 };

    // Default spawn mid-room or near stairs
    if (fromSave || !entryFrom) {
      if (this.room.id === 'overworld') return { tx: 8, ty: 4 };
      for (let y = 0; y < VIEW_TILES_H; y++) {
        for (let x = 0; x < VIEW_TILES_W; x++) {
          if (this.tileGrid[y][x] === 'stairs') return { tx: x, ty: y };
        }
      }
      return { tx: 8, ty: 8 };
    }
    return { tx: 8, ty: 5 };
  }

  private spawnEntity(def: EntityDef): void {
    const tex = ENTITY_TEX[def.kind] ?? 'npc';
    const pos = this.tileToWorld(def.x, def.y);
    const sprite = this.physics.add.sprite(pos.x, pos.y, tex);
    sprite.setScale(SCALE);
    sprite.setDepth(5);
    sprite.setImmovable(true);
    // Generous pickup / talk hitboxes (tile is 16px, scaled by SCALE in display)
    if (
      ['key', 'heart', 'sword', 'npc', 'merchant', 'sign', 'chest'].includes(
        def.kind,
      )
    ) {
      sprite.setSize(14, 14);
      sprite.setOffset(1, 1);
    }

    const hostile = ['slime', 'skeleton', 'redshirt', 'cube', 'boss'].includes(
      def.kind,
    );
    const interactive = [
      'npc',
      'merchant',
      'sign',
      'chest',
      'key',
      'heart',
      'sword',
      'cube',
    ].includes(def.kind);

    let hp = def.hp ?? 1;
    if (def.kind === 'boss') hp = def.hp ?? 12;
    if (def.kind === 'redshirt') hp = 1;

    const actor: Actor = {
      sprite,
      kind: def.kind,
      id: def.id ?? `${def.kind}-${def.x}-${def.y}`,
      hp,
      maxHp: hp,
      dialog: def.dialog,
      hurtCooldown: 0,
      aiTimer: 0,
      alive: true,
      interactive: interactive || !!def.dialog || !!def.shopId,
      chestTable: def.chestTable,
      shopId: def.shopId,
    };

    if (hostile) {
      this.physics.add.overlap(this.player, sprite, () =>
        this.hurtPlayer(actor),
      );
      this.physics.add.overlap(this.swordHit, sprite, () =>
        this.hitEnemy(actor),
      );
    } else if (def.kind === 'key' || def.kind === 'heart' || def.kind === 'sword') {
      this.physics.add.overlap(this.player, sprite, () =>
        this.collectItem(actor),
      );
    }

    this.actors.push(actor);
  }

  private emitHud(): void {
    this.game.events.emit('hud-update', this.save, this.room.title);
    if (this.inventoryOpen) {
      this.game.events.emit('inventory-refresh', this.save);
    }
  }

  private hurtPlayer(from: Actor): void {
    if (!from.alive || this.invuln > 0 || this.dialogLocked || this.paused) return;
    if (from.kind === 'cube' && from.dialog && !this.save.flags['cube-talked']) {
      this.save.flags['cube-talked'] = true;
      this.game.events.emit('dialog-show', from.dialog);
    }

    // Base hit is 2 hearts; armor reduces damage (min 1) so gear matters
    const baseDmg = 2;
    const dmg = Math.max(1, baseDmg - this.save.armor);
    this.save.hp = Math.max(0, this.save.hp - dmg);
    this.invuln = 900;
    this.emitHud();
    writeSave(this.save);

    this.cameras.main.shake(120, 0.01);
    this.player.setTint(0xff6666);
    this.time.delayedCall(150, () => this.player.clearTint());

    // Knockback
    const angle = Phaser.Math.Angle.Between(
      from.sprite.x,
      from.sprite.y,
      this.player.x,
      this.player.y,
    );
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(Math.cos(angle) * 220, Math.sin(angle) * 220);

    if (this.save.hp <= 0) {
      this.die();
    }
  }

  private die(): void {
    this.dialogLocked = true;
    this.game.events.emit('dialog-show', [
      'YOU HAVE DIED.',
      'THE BARD WILL WRITE A SONG.',
      'IT WILL NOT BE FLATTERING.',
      'RESPAWNING AT THE MEADOW...',
    ]);
    this.time.delayedCall(100, () => {
      this.save.hp = this.save.maxHp;
      this.save.roomId = 'overworld';
      writeSave(this.save);
    });
    this.time.delayedCall(2500, () => {
      this.dialogLocked = false;
      this.loadRoom('overworld', true);
      this.invuln = 1500;
    });
  }

  private hitEnemy(actor: Actor): void {
    if (!actor.alive || actor.hurtCooldown > 0 || !this.attacking) return;
    if (!this.save.hasSword) return;

    actor.hurtCooldown = 250;
    actor.hp -= 1;
    actor.sprite.setTint(0xffffff);
    this.time.delayedCall(80, () => {
      if (actor.alive) actor.sprite.clearTint();
    });

    // Redshirts die dramatically
    if (actor.kind === 'redshirt') {
      actor.hp = 0;
      this.game.events.emit('toast', 'ENSIGN DOWN!');
    }

    if (actor.hp <= 0) {
      this.killActor(actor);
    }
  }

  private killActor(actor: Actor): void {
    actor.alive = false;
    this.save.killed.push(actor.id);

    // XP + level from pure progression module
    const xpGain = enemyXpReward(actor.kind);
    const prog = grantXp(
      { xp: this.save.xp, level: this.save.level },
      xpGain,
    );
    this.save.xp = prog.xp;
    this.save.level = prog.level;
    if (prog.leveledUp) {
      this.game.events.emit(
        'toast',
        `LEVEL UP! NOW LV ${prog.level} (+${xpGain} XP)`,
      );
    } else {
      this.game.events.emit('toast', `+${xpGain} XP`);
    }

    if (actor.kind === 'boss') {
      this.save.bossDefeated = true;
      this.game.events.emit('dialog-show', [
        'THE DUNGEON MASTER FALLS!',
        'HE MUTTERS: "NEXT TIME...',
        "I'LL BRING A TPK...",
        'A CHEST APPEARS. GO ON.',
      ]);
      const chestDef = this.room.entities?.find((e) => e.id === 'boss-chest');
      if (
        chestDef &&
        !this.save.collected.includes(chestDef.id ?? '') &&
        !this.actors.some((a) => a.id === 'boss-chest' && a.alive)
      ) {
        this.spawnEntity(chestDef);
      }
    } else if (actor.kind === 'cube') {
      this.game.events.emit('toast', 'THE CUBE APOLOGIZES ONE LAST TIME');
    }

    // Death particles
    for (let i = 0; i < 6; i++) {
      const p = this.add.image(actor.sprite.x, actor.sprite.y, 'particle');
      p.setScale(SCALE);
      this.tweens.add({
        targets: p,
        x: p.x + Phaser.Math.Between(-40, 40),
        y: p.y + Phaser.Math.Between(-40, 40),
        alpha: 0,
        duration: 350,
        onComplete: () => p.destroy(),
      });
    }

    actor.sprite.destroy();
    writeSave(this.save);
    this.emitHud();
  }

  private collectItem(actor: Actor): void {
    if (!actor.alive) return;
    actor.alive = false;
    if (!this.save.collected.includes(actor.id)) {
      this.save.collected.push(actor.id);
    }

    if (actor.kind === 'sword') {
      actor.sprite.destroy();
      this.grantSword(true);
      return;
    } else if (actor.kind === 'key') {
      this.save.hasKey = true;
      this.game.events.emit('toast', 'GOT KEY: "FRIEND"');
      this.game.events.emit('dialog-show', [
        'YOU PICKED UP A KEY LABELED',
        '"FRIEND".',
        'THE DOOR WAS NOT SUBTLE.',
      ]);
    } else if (actor.kind === 'heart') {
      this.save.maxHp = Math.min(12, this.save.maxHp + 2);
      this.save.hp = Math.min(this.save.maxHp, this.save.hp + 2);
      this.game.events.emit('toast', 'MAX HP UP!');
    }

    actor.sprite.destroy();
    writeSave(this.save);
    this.emitHud();
  }

  private findInteractable(reach?: number): Actor | null {
    const max = reach ?? this.interactReach();
    let best: Actor | null = null;
    let bestDist = max;
    for (const a of this.actors) {
      if (!a.alive || !a.interactive) continue;
      if (['slime', 'skeleton', 'redshirt', 'boss'].includes(a.kind)) continue;
      if (!a.sprite?.active) continue;
      const dist = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        a.sprite.x,
        a.sprite.y,
      );
      if (dist < bestDist) {
        bestDist = dist;
        best = a;
      }
    }
    return best;
  }

  private tryInteract(): void {
    if (this.dialogLocked || this.paused) return;
    const best = this.findInteractable();
    if (!best) {
      this.game.events.emit('toast', 'NOTHING HERE - GET CLOSER');
      return;
    }

    if (best.kind === 'key' || best.kind === 'heart' || best.kind === 'sword') {
      this.collectItem(best);
      return;
    }

    if (best.kind === 'chest') {
      this.openTreasureChest(best);
      return;
    }

    if (best.kind === 'merchant' || best.shopId) {
      const shopId = best.shopId ?? 'tinkerer';
      const lines = best.dialog?.length
        ? [...best.dialog, ...shopCatalogLines(shopId).slice(-4)]
        : shopCatalogLines(shopId);
      this.game.events.emit('dialog-show', lines);
      return;
    }

    if (best.dialog?.length) {
      // Classic Zelda: talking to the old man hands you the sword
      if (best.id === 'old-man' && !this.save.hasSword) {
        this.grantSword(false);
        this.game.events.emit('dialog-show', [
          ...best.dialog,
          '',
          'SWORD OF MILD ENTHUSIASM:',
          'ACQUIRED. SPACE / Z TO SWING.',
        ]);
        return;
      }
      this.game.events.emit('dialog-show', best.dialog);
      return;
    }

    this.game.events.emit('toast', 'THEY HAVE NOTHING TO SAY');
  }

  private openTreasureChest(actor: Actor): void {
    if (!actor.alive) return;
    if (this.save.collected.includes(actor.id)) {
      this.game.events.emit('dialog-show', ['ALREADY LOOTED. DUSTY.']);
      return;
    }

    const table = actor.chestTable ?? 'dungeon';
    const drops = openChest(table);
    this.save = applyLootToSave(this.save, drops);
    this.save.collected.push(actor.id);
    actor.alive = false;
    actor.sprite.destroy();

    const lines = [
      'CHEST OPENED!',
      ...lootSummary(drops).map((l) => `+ ${l}`),
      ...(actor.dialog ?? []),
    ];
    writeSave(this.save);
    this.emitHud();
    this.game.events.emit('dialog-show', lines);
  }

  private tryBuyFromNearbyMerchant(): void {
    const merchant = this.findInteractable();
    if (
      !merchant ||
      (merchant.kind !== 'merchant' && !merchant.shopId)
    ) {
      this.game.events.emit('toast', 'NO MERCHANT NEARBY');
      return;
    }
    const shopId = merchant.shopId ?? 'tinkerer';
    const result = attemptFeaturedPurchase(
      {
        coins: this.save.coins,
        inventory: this.save.inventory,
        armor: this.save.armor,
        hp: this.save.hp,
        maxHp: this.save.maxHp,
      },
      shopId,
    );

    if (!result.ok) {
      if (result.reason === 'insufficient_funds') {
        this.game.events.emit(
          'toast',
          `NEED MORE COINS (${this.save.coins}c)`,
        );
        this.game.events.emit('dialog-show', [
          'TINKERER: COME BACK WHEN',
          'YOUR PURSE JINGLES LOUDER.',
          `YOU HAVE ${this.save.coins} COINS.`,
        ]);
      } else {
        this.game.events.emit('toast', 'CANNOT BUY THAT');
      }
      // Balance and inventory unchanged
      return;
    }

    this.save.coins = result.state.coins;
    this.save.inventory = result.state.inventory;
    this.save.armor = result.state.armor;
    this.save.hp = result.state.hp;
    writeSave(this.save);
    this.emitHud();
    this.game.events.emit(
      'toast',
      `BOUGHT ${result.item.name} (-${result.item.price}c)`,
    );
    this.game.events.emit('dialog-show', [
      `PURCHASED: ${result.item.name}`,
      result.item.description,
      `COINS LEFT: ${this.save.coins}`,
    ]);
  }

  private tryAttack(): void {
    if (this.attacking || this.dialogLocked || this.paused) return;

    if (!this.save.hasSword) {
      this.game.events.emit('toast', 'NO SWORD YET — TALK TO THE OLD MAN');
      return;
    }

    this.attacking = true;
    const offset = 36;
    let x = this.player.x;
    let y = this.player.y;
    let angle = 0;
    if (this.facing === 'up') {
      y -= offset;
      angle = 0;
    } else if (this.facing === 'down') {
      y += offset;
      angle = 180;
    } else if (this.facing === 'left') {
      x -= offset;
      angle = -90;
    } else {
      x += offset;
      angle = 90;
    }

    this.swordHit.setPosition(x, y);
    this.swordHit.setAngle(angle);
    this.swordHit.setVisible(true);
    this.swordHit.setActive(true);
    this.swordHit.setDepth(15);
    const body = this.swordHit.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.reset(x, y);
    body.setSize(18, 18);
    // Keep attacking flag true long enough for overlap callbacks
    this.time.delayedCall(180, () => {
      this.swordHit.setVisible(false);
      this.swordHit.setActive(false);
      body.enable = false;
      this.swordHit.setPosition(-999, -999);
      this.attacking = false;
    });
  }

  private tryUnlockNearPlayer(): void {
    if (!this.save.hasKey) return;
    const { tx, ty } = this.worldToTile(this.player.x, this.player.y);
    const dirs = [
      [0, 0],
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ];
    for (const [dx, dy] of dirs) {
      const x = tx + dx;
      const y = ty + dy;
      if (y < 0 || y >= VIEW_TILES_H || x < 0 || x >= VIEW_TILES_W) continue;
      if (this.tileGrid[y][x] === 'locked') {
        this.unlockDoor(x, y);
        return;
      }
    }
  }

  private unlockDoor(tx: number, ty: number): void {
    this.tileGrid[ty][tx] = 'door';
    this.save.hasKey = false;
    this.save.flags['door-unlocked'] = true;
    this.game.events.emit('toast', 'THE DOOR HEARS "FRIEND"');
    this.game.events.emit('dialog-show', [
      'THE LOCKED DOOR CLICKS OPEN.',
      'SOMEWHERE, A FELLOWSHIP',
      'APPLAUDS POLITELY.',
    ]);

    // Rebuild walls for this room without full reload
    this.walls.clear(true, true);
    this.children.list
      .filter((c) => (c as Phaser.GameObjects.Image).getData?.('mapTile'))
      .forEach((c) => c.destroy());

    for (let y = 0; y < VIEW_TILES_H; y++) {
      for (let x = 0; x < VIEW_TILES_W; x++) {
        const kind = this.tileGrid[y][x];
        const pos = this.tileToWorld(x, y);
        const img = this.add
          .image(pos.x, pos.y, TEX[kind])
          .setScale(SCALE)
          .setDepth(0);
        img.setData('mapTile', true);
        if (SOLID.includes(kind)) {
          this.addWallAt(pos.x, pos.y, kind);
        }
      }
    }
    // Re-depth player/actors
    this.player.setDepth(10);
    this.actors.forEach((a) => a.sprite.setDepth(5));
    writeSave(this.save);
    this.emitHud();
  }

  private checkHazards(delta: number): void {
    const { tx, ty } = this.worldToTile(this.player.x, this.player.y);
    if (ty < 0 || ty >= VIEW_TILES_H || tx < 0 || tx >= VIEW_TILES_W) return;
    const tile = this.tileGrid[ty][tx];

    if (tile === 'lava' && this.invuln <= 0) {
      this.save.hp = Math.max(0, this.save.hp - 1);
      this.invuln = 600;
      this.emitHud();
      this.player.setTint(0xff8844);
      this.time.delayedCall(120, () => this.player.clearTint());
      if (this.save.hp <= 0) this.die();
    }

    if (tile === 'pad' && this.padCooldown <= 0) {
      this.padCooldown = 1500;
      this.game.events.emit('toast', 'TRANSPORTER MALFUNCTION!');
      // Random teleport in room
      for (let i = 0; i < 20; i++) {
        const rx = Phaser.Math.Between(1, VIEW_TILES_W - 2);
        const ry = Phaser.Math.Between(1, VIEW_TILES_H - 2);
        const k = this.tileGrid[ry][rx];
        if (!SOLID.includes(k) && k !== 'lava') {
          const p = this.tileToWorld(rx, ry);
          this.player.setPosition(p.x, p.y);
          break;
        }
      }
    }

    if (tile === 'stairs' && this.room.id === 'overworld' && !this.transitionLock) {
      this.transitionLock = true;
      this.loadRoom('dungeon_1', false, 'overworld');
    }

    void delta;
  }

  private checkRoomExit(): void {
    if (this.transitionLock || this.dialogLocked) return;
    const { tx, ty } = this.worldToTile(this.player.x, this.player.y);

    // Edge transitions on door tiles or map edge
    if (ty <= 0 && this.room.north) {
      this.transitionLock = true;
      this.loadRoom(this.room.north, false, 'south');
      return;
    }
    if (ty >= VIEW_TILES_H - 1 && this.room.south) {
      this.transitionLock = true;
      // Special: dungeon south to overworld
      if (this.room.south === 'overworld') {
        this.loadRoom('overworld', false, 'dungeon_1');
      } else {
        this.loadRoom(this.room.south, false, 'north');
      }
      return;
    }
    if (tx <= 0 && this.room.west) {
      this.transitionLock = true;
      this.loadRoom(this.room.west, false, 'east');
      return;
    }
    if (tx >= VIEW_TILES_W - 1 && this.room.east) {
      this.transitionLock = true;
      this.loadRoom(this.room.east, false, 'west');
      return;
    }
  }

  private updateEnemies(delta: number): void {
    for (const a of this.actors) {
      if (!a.alive) continue;
      a.hurtCooldown = Math.max(0, a.hurtCooldown - delta);
      a.aiTimer -= delta;

      const hostile = ['slime', 'skeleton', 'redshirt', 'cube', 'boss'].includes(
        a.kind,
      );
      if (!hostile || this.dialogLocked || this.paused) {
        if (a.sprite.body) {
          (a.sprite.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        }
        continue;
      }

      if (a.aiTimer <= 0) {
        a.aiTimer = Phaser.Math.Between(400, 900);
        const speed =
          a.kind === 'boss' ? 70 : a.kind === 'skeleton' ? 55 : a.kind === 'redshirt' ? 80 : 40;
        const angle = Phaser.Math.Angle.Between(
          a.sprite.x,
          a.sprite.y,
          this.player.x,
          this.player.y,
        );
        // Cubes wobble slowly; redshirts panic randomly sometimes
        if (a.kind === 'redshirt' && Math.random() < 0.35) {
          (a.sprite.body as Phaser.Physics.Arcade.Body).setVelocity(
            Phaser.Math.Between(-speed, speed),
            Phaser.Math.Between(-speed, speed),
          );
        } else if (a.kind === 'cube') {
          (a.sprite.body as Phaser.Physics.Arcade.Body).setVelocity(
            Math.cos(angle) * 25,
            Math.sin(angle) * 25,
          );
        } else {
          (a.sprite.body as Phaser.Physics.Arcade.Body).setVelocity(
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
          );
        }
      }
    }
  }

  update(_time: number, delta: number): void {
    if (!this.player?.body) return;

    // Pause / inventory close
    if (Phaser.Input.Keyboard.JustDown(this.keys.esc)) {
      if (this.inventoryOpen) {
        this.game.events.emit('inventory-toggle', this.save);
      } else {
        this.paused = !this.paused;
        this.game.events.emit('pause-ui', this.paused);
        if (this.paused) {
          (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        }
      }
    }
    if (this.paused) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.m)) {
        writeSave(this.save);
        // Soft-reset UI — do not stop (listener/chrome race kills dialog)
        this.game.events.emit('ui-reset');
        this.scene.start('Title');
      }
      return;
    }

    this.invuln = Math.max(0, this.invuln - delta);
    this.padCooldown = Math.max(0, this.padCooldown - delta);
    this.dialogCloseCooldown = Math.max(0, this.dialogCloseCooldown - delta);

    if (this.dialogLocked || this.inventoryOpen) {
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      // Enemies still move while inventory is open so the world is not frozen unfairly
      this.updateEnemies(delta);
      return;
    }

    const speed = 140;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown || this.keys.a.isDown) {
      vx = -speed;
      this.facing = 'left';
    } else if (this.cursors.right.isDown || this.keys.d.isDown) {
      vx = speed;
      this.facing = 'right';
    }
    if (this.cursors.up.isDown || this.keys.w.isDown) {
      vy = -speed;
      this.facing = 'up';
    } else if (this.cursors.down.isDown || this.keys.s.isDown) {
      vy = speed;
      this.facing = 'down';
    }

    if (vx !== 0 && vy !== 0) {
      vx *= 0.707;
      vy *= 0.707;
    }
    body.setVelocity(vx, vy);

    // Blink while invuln
    this.player.setAlpha(this.invuln > 0 && Math.floor(_time / 80) % 2 === 0 ? 0.4 : 1);

    // Attack / interact also handled via keydown events; JustDown as backup
    // Attack backup via JustDown; interact is event-only (avoids double-fire)
    if (
      Phaser.Input.Keyboard.JustDown(this.keys.space) ||
      Phaser.Input.Keyboard.JustDown(this.keys.z)
    ) {
      this.tryAttack();
    }

    this.tryUnlockNearPlayer();
    this.checkHazards(delta);
    this.checkRoomExit();
    this.updateEnemies(delta);
  }
}
