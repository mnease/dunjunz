/**
 * Best Bud pose + stretch/grab combat animation helpers.
 * Pose frames live on canvas textures; motion uses scale/angle/tweens.
 * All motion respects reduceMotion via vfx.motionAllowed.
 */

import type Phaser from 'phaser';
import { SPRITE_SCALE } from '../config';
import type { BudAttackStyle } from './best-bud-combat';
import { motionAllowed, sparkBurst } from './vfx';

export type BudPose =
  | 'idle'
  | 'stretch'
  | 'grab'
  | 'strike'
  | 'spit'
  | 'blink'
  | 'guard'
  | 'heal'
  | 'chase';

/** How long each pose holds (ms) unless overridden. */
export const BUD_POSE_MS: Record<BudPose, number> = {
  idle: 0,
  stretch: 280,
  grab: 320,
  strike: 200,
  spit: 240,
  blink: 180,
  guard: 350,
  heal: 400,
  chase: 0,
};

export function budPoseTextureKey(pose: BudPose): string {
  if (pose === 'idle' || pose === 'chase') return 'best_bud';
  const key = `best_bud_${pose}`;
  return key;
}

export function poseForAttackStyle(style: BudAttackStyle): BudPose {
  switch (style) {
    case 'stretch':
      return 'stretch';
    case 'slash':
      return 'strike';
    case 'spit':
      return 'spit';
    case 'blink':
      return 'blink';
    case 'guard':
      return 'guard';
    case 'aura':
      return 'heal';
    default:
      return 'strike';
  }
}

/** Face the companion toward a world point (flipX). */
export function faceBuddyToward(
  sprite: Phaser.GameObjects.Sprite,
  x: number,
  _y: number,
): void {
  const dx = x - sprite.x;
  if (Math.abs(dx) > 2) sprite.setFlipX(dx < 0);
}

/**
 * Apply pose texture if it exists; fall back to base best_bud.
 * Returns the texture key used.
 */
export function setBuddyPose(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Sprite,
  pose: BudPose,
): string {
  const key = budPoseTextureKey(pose);
  const use = scene.textures.exists(key) ? key : 'best_bud';
  if (sprite.texture.key !== use) sprite.setTexture(use);
  return use;
}

export interface StretchStrikeOpts {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  tint?: number;
  /** Style drives pose + particle color accent. */
  style: BudAttackStyle;
  onComplete?: () => void;
}

/**
 * Full attack animation: face target, pose swap, stretch/lunge toward
 * enemy, spark trail, snap back. No-ops body when reduceMotion (instant).
 */
export function playBuddyAttackAnim(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Sprite,
  opts: StretchStrikeOpts,
): void {
  const pose = poseForAttackStyle(opts.style);
  faceBuddyToward(sprite, opts.toX, opts.toY);
  setBuddyPose(scene, sprite, pose);

  if (!motionAllowed()) {
    sprite.setScale(SPRITE_SCALE);
    sprite.setAngle(0);
    opts.onComplete?.();
    scene.time.delayedCall(BUD_POSE_MS[pose] || 120, () => {
      if (sprite.active) setBuddyPose(scene, sprite, 'idle');
    });
    return;
  }

  // Kill prior pose tweens so strike doesn't stack
  scene.tweens.killTweensOf(sprite);

  const dx = opts.toX - opts.fromX;
  const dy = opts.toY - opts.fromY;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = dx / dist;
  const ny = dy / dist;
  const ang = (Math.atan2(dy, dx) * 180) / Math.PI;

  // Accent particles along the stretch path
  const accent =
    opts.style === 'stretch'
      ? 0x4ad4c8
      : opts.style === 'spit'
        ? 0xc4a06a
        : opts.style === 'blink'
          ? 0x7d5cff
          : opts.style === 'aura'
            ? 0xe8f0ff
            : opts.style === 'guard'
              ? 0xffc857
              : 0x7dffb3;

  const stretchAmt =
    opts.style === 'stretch'
      ? Math.min(2.6, 1.35 + dist / 90)
      : opts.style === 'slash'
        ? 1.45
        : opts.style === 'blink'
          ? 1.2
          : opts.style === 'spit'
            ? 1.25
            : 1.4;

  // Origin bias: stretch grows toward the enemy
  const originX = nx >= 0 ? 0.35 : 0.65;
  sprite.setOrigin(originX, 0.55);

  // Wind-up squash
  sprite.setScale(SPRITE_SCALE * 0.85, SPRITE_SCALE * 1.15);
  sprite.setAngle(ang * 0.12);

  scene.tweens.add({
    targets: sprite,
    scaleX: SPRITE_SCALE * stretchAmt,
    scaleY: SPRITE_SCALE * (opts.style === 'stretch' ? 0.72 : 0.9),
    x: opts.fromX + nx * Math.min(28, dist * 0.22),
    y: opts.fromY + ny * Math.min(28, dist * 0.22),
    angle: opts.style === 'slash' ? ang * 0.25 : ang * 0.08,
    duration: opts.style === 'slash' ? 70 : 110,
    ease: 'Cubic.easeOut',
    onComplete: () => {
      // Trail sparks along lash
      const steps = opts.style === 'stretch' ? 5 : 3;
      for (let i = 1; i <= steps; i++) {
        const t = i / (steps + 1);
        sparkBurst(
          scene,
          opts.fromX + dx * t,
          opts.fromY + dy * t,
          accent,
          1,
        );
      }
      // Stretch limb ghost (elastic body line)
      if (opts.style === 'stretch' || opts.style === 'slash') {
        spawnStretchGhost(scene, opts.fromX, opts.fromY, opts.toX, opts.toY, accent);
      }
      sparkBurst(scene, opts.toX, opts.toY, accent, 4);

      // Snap-back
      scene.tweens.add({
        targets: sprite,
        scaleX: SPRITE_SCALE,
        scaleY: SPRITE_SCALE,
        x: opts.fromX,
        y: opts.fromY,
        angle: 0,
        duration: 140,
        ease: 'Back.easeOut',
        onComplete: () => {
          if (!sprite.active) return;
          sprite.setOrigin(0.5, 0.5);
          sprite.setScale(SPRITE_SCALE);
          sprite.setAngle(0);
          setBuddyPose(scene, sprite, 'idle');
          opts.onComplete?.();
        },
      });
    },
  });
}

/** Elastic rubber-band ghost between bud and target. */
function spawnStretchGhost(
  scene: Phaser.Scene,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  tint: number,
): void {
  if (!motionAllowed()) return;
  const midX = (x0 + x1) / 2;
  const midY = (y0 + y1) / 2;
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const ang = (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI;
  const key = scene.textures.exists('bud_stretch_limb')
    ? 'bud_stretch_limb'
    : 'particle';
  const limb = scene.add.image(midX, midY, key);
  limb.setTint(tint);
  limb.setDepth(5);
  limb.setAlpha(0.85);
  limb.setAngle(ang);
  // particle is 4×4; limb texture is 24×8 — scale length to cover gap
  if (key === 'bud_stretch_limb') {
    limb.setDisplaySize(Math.max(12, dist * 0.92), 10);
  } else {
    limb.setScale(Math.max(2, dist / 8), SPRITE_SCALE * 0.45);
  }
  scene.tweens.add({
    targets: limb,
    alpha: 0,
    scaleY: 0.2,
    duration: 160,
    ease: 'Quad.easeOut',
    onComplete: () => limb.destroy(),
  });
}

/**
 * Grab / reach toward a point (loot, chest, player after kill).
 * Longer lean than a strike; ends in idle.
 */
export function playBuddyGrabAnim(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Sprite,
  toX: number,
  toY: number,
  tint = 0xffc857,
): void {
  const fromX = sprite.x;
  const fromY = sprite.y;
  faceBuddyToward(sprite, toX, toY);
  setBuddyPose(scene, sprite, 'grab');

  if (!motionAllowed()) {
    scene.time.delayedCall(BUD_POSE_MS.grab, () => {
      if (sprite.active) setBuddyPose(scene, sprite, 'idle');
    });
    return;
  }

  scene.tweens.killTweensOf(sprite);
  const dx = toX - fromX;
  const dy = toY - fromY;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = dx / dist;
  const ny = dy / dist;
  const originX = nx >= 0 ? 0.3 : 0.7;
  sprite.setOrigin(originX, 0.6);

  scene.tweens.add({
    targets: sprite,
    scaleX: SPRITE_SCALE * Math.min(2.2, 1.3 + dist / 100),
    scaleY: SPRITE_SCALE * 0.78,
    x: fromX + nx * Math.min(22, dist * 0.3),
    y: fromY + ny * Math.min(22, dist * 0.3),
    duration: 140,
    ease: 'Cubic.easeOut',
    onComplete: () => {
      spawnStretchGhost(scene, fromX, fromY, toX, toY, tint);
      sparkBurst(scene, toX, toY, tint, 3);
      scene.tweens.add({
        targets: sprite,
        scaleX: SPRITE_SCALE,
        scaleY: SPRITE_SCALE,
        x: fromX,
        y: fromY,
        duration: 160,
        ease: 'Back.easeOut',
        onComplete: () => {
          if (!sprite.active) return;
          sprite.setOrigin(0.5, 0.5);
          setBuddyPose(scene, sprite, 'idle');
        },
      });
    },
  });
}

/** Soft heal float for Whisp. */
export function playBuddyHealAnim(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Sprite,
  playerX: number,
  playerY: number,
): void {
  setBuddyPose(scene, sprite, 'heal');
  faceBuddyToward(sprite, playerX, playerY);
  if (!motionAllowed()) {
    scene.time.delayedCall(BUD_POSE_MS.heal, () => {
      if (sprite.active) setBuddyPose(scene, sprite, 'idle');
    });
    sparkBurst(scene, playerX, playerY, 0xff6b9d, 3);
    return;
  }
  scene.tweens.killTweensOf(sprite);
  scene.tweens.add({
    targets: sprite,
    scaleX: SPRITE_SCALE * 1.15,
    scaleY: SPRITE_SCALE * 1.25,
    y: sprite.y - 6,
    duration: 180,
    yoyo: true,
    ease: 'Sine.easeInOut',
    onComplete: () => {
      if (!sprite.active) return;
      sprite.setScale(SPRITE_SCALE);
      setBuddyPose(scene, sprite, 'idle');
    },
  });
  sparkBurst(scene, playerX, playerY, 0xff6b9d, 5);
  sparkBurst(scene, sprite.x, sprite.y, 0xe8f0ff, 3);
}

/** Guard coil flash (Pebbo block). */
export function playBuddyGuardAnim(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Sprite,
): void {
  setBuddyPose(scene, sprite, 'guard');
  if (!motionAllowed()) {
    scene.time.delayedCall(BUD_POSE_MS.guard, () => {
      if (sprite.active) setBuddyPose(scene, sprite, 'idle');
    });
    return;
  }
  scene.tweens.killTweensOf(sprite);
  scene.tweens.add({
    targets: sprite,
    scaleX: SPRITE_SCALE * 1.35,
    scaleY: SPRITE_SCALE * 0.85,
    duration: 90,
    yoyo: true,
    repeat: 1,
    ease: 'Quad.easeOut',
    onComplete: () => {
      if (!sprite.active) return;
      sprite.setScale(SPRITE_SCALE);
      setBuddyPose(scene, sprite, 'idle');
    },
  });
  sparkBurst(scene, sprite.x, sprite.y, 0xffc857, 5);
}

/** Zorp blink afterimage at old position. */
export function playBuddyBlinkTrail(
  scene: Phaser.Scene,
  fromX: number,
  fromY: number,
  tint: number,
): void {
  if (!motionAllowed() || !scene.textures.exists('best_bud_blink')) {
    sparkBurst(scene, fromX, fromY, tint, 3);
    return;
  }
  const ghost = scene.add.image(fromX, fromY, 'best_bud_blink');
  ghost.setScale(SPRITE_SCALE).setTint(tint).setAlpha(0.55).setDepth(3);
  scene.tweens.add({
    targets: ghost,
    alpha: 0,
    scale: SPRITE_SCALE * 0.6,
    duration: 200,
    ease: 'Quad.easeOut',
    onComplete: () => ghost.destroy(),
  });
}

/**
 * Idle personality: tiny stretch yawn every few seconds when parked.
 * Returns true if a stretch was started.
 */
export function maybeBuddyIdleStretch(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Sprite,
  idleTimerMs: number,
  everyMs = 4200,
): boolean {
  if (!motionAllowed() || !sprite.active) return false;
  if (idleTimerMs < everyMs) return false;
  // Don't interrupt if already mid-tween
  if (scene.tweens.isTweening(sprite)) return false;
  setBuddyPose(scene, sprite, 'stretch');
  scene.tweens.add({
    targets: sprite,
    scaleX: SPRITE_SCALE * 1.35,
    scaleY: SPRITE_SCALE * 0.82,
    duration: 220,
    yoyo: true,
    ease: 'Sine.easeInOut',
    onComplete: () => {
      if (!sprite.active) return;
      sprite.setScale(SPRITE_SCALE * 0.95);
      setBuddyPose(scene, sprite, 'idle');
    },
  });
  return true;
}
