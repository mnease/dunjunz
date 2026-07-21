/**
 * Lightweight VFX helpers — particles + motion checks.
 * Respect reduceMotion from settings.
 */

import type Phaser from 'phaser';
import { loadSettings } from './settings';
import { SCALE, SPRITE_SCALE } from '../config';

export function motionAllowed(): boolean {
  return !loadSettings().reduceMotion;
}

/** Burst of sparkles at a point (hits, pickups). */
export function sparkBurst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color = 0xffc857,
  count = 5,
): void {
  if (!motionAllowed()) return;
  const n = Math.min(10, count);
  for (let i = 0; i < n; i++) {
    const p = scene.add.image(x, y, 'particle');
    p.setScale(SCALE * (0.5 + Math.random() * 0.6));
    p.setTint(color);
    p.setDepth(20);
    const ang = Math.random() * Math.PI * 2;
    const dist = 18 + Math.random() * 36;
    scene.tweens.add({
      targets: p,
      x: x + Math.cos(ang) * dist,
      y: y + Math.sin(ang) * dist,
      alpha: 0,
      scale: 0.2,
      duration: 220 + Math.random() * 180,
      ease: 'Cubic.easeOut',
      onComplete: () => p.destroy(),
    });
  }
}

/** Slash whoosh along attack facing. */
export function slashArc(
  scene: Phaser.Scene,
  x: number,
  y: number,
  angleDeg: number,
): void {
  if (!motionAllowed()) return;
  const p = scene.add.image(x, y, 'slash-arc');
  p.setScale(SCALE * 0.9);
  p.setAngle(angleDeg);
  p.setDepth(16);
  p.setAlpha(0.9);
  scene.tweens.add({
    targets: p,
    alpha: 0,
    scale: SCALE * 1.35,
    duration: 140,
    ease: 'Quad.easeOut',
    onComplete: () => p.destroy(),
  });
}

/** Soft float bob amplitude for display scale (physics-safe). */
export function bobScale(
  timeSec: number,
  moving: boolean,
): { sx: number; sy: number } {
  const base = SPRITE_SCALE;
  if (!motionAllowed()) return { sx: base, sy: base };
  if (moving) {
    const w = Math.sin(timeSec * 14) * 0.07;
    return { sx: base * (1 + w * 0.25), sy: base * (1 - w * 0.45) };
  }
  const b = Math.sin(timeSec * 3.2) * 0.035;
  return { sx: base * (1 + b * 0.2), sy: base * (1 - b) };
}

export function enemyBobScale(
  timeSec: number,
  kind: string,
  seed: number,
): { sx: number; sy: number } {
  const base = SPRITE_SCALE;
  if (!motionAllowed()) return { sx: base, sy: base };
  const phase = timeSec * 3 + seed;
  if (kind === 'slime' || kind === 'cube') {
    const s = Math.sin(phase * 1.4) * 0.1;
    return { sx: base * (1 + s), sy: base * (1 - s * 0.9) };
  }
  if (kind === 'skeleton') {
    const s = Math.sin(phase * 5) * 0.03;
    return { sx: base * (1 + s), sy: base };
  }
  if (kind === 'wolf' || kind === 'cactus' || kind === 'tarantula') {
    const s = Math.sin(phase * 2.2) * 0.05;
    return { sx: base, sy: base * (1 + s * 0.4) };
  }
  if (kind === 'hornet') {
    const s = Math.sin(phase * 8) * 0.06;
    return { sx: base * (1 + s * 0.3), sy: base * (1 - s * 0.5) };
  }
  if (kind === 'scorpion') {
    const s = Math.sin(phase * 3) * 0.04;
    return { sx: base * (1 + s), sy: base };
  }
  const s = Math.sin(phase * 2) * 0.04;
  return { sx: base * (1 + s * 0.3), sy: base * (1 - s * 0.2) };
}
