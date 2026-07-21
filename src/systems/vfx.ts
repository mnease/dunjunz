/**
 * Lightweight VFX helpers — particles + motion checks.
 * Respect reduceMotion from settings.
 */

import type Phaser from 'phaser';
import { loadSettings } from './settings';
import { SCALE } from '../config';

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
  if (!motionAllowed()) return { sx: SCALE, sy: SCALE };
  if (moving) {
    const w = Math.sin(timeSec * 14) * 0.07;
    return { sx: SCALE * (1 + w * 0.25), sy: SCALE * (1 - w * 0.45) };
  }
  const b = Math.sin(timeSec * 3.2) * 0.035;
  return { sx: SCALE * (1 + b * 0.2), sy: SCALE * (1 - b) };
}

export function enemyBobScale(
  timeSec: number,
  kind: string,
  seed: number,
): { sx: number; sy: number } {
  if (!motionAllowed()) return { sx: SCALE, sy: SCALE };
  const phase = timeSec * 3 + seed;
  if (kind === 'slime' || kind === 'cube') {
    const s = Math.sin(phase * 1.4) * 0.1;
    return { sx: SCALE * (1 + s), sy: SCALE * (1 - s * 0.9) };
  }
  if (kind === 'skeleton') {
    const s = Math.sin(phase * 5) * 0.03;
    return { sx: SCALE * (1 + s), sy: SCALE };
  }
  if (kind === 'wolf' || kind === 'cactus') {
    const s = Math.sin(phase * 2.2) * 0.05;
    return { sx: SCALE, sy: SCALE * (1 + s * 0.4) };
  }
  const s = Math.sin(phase * 2) * 0.04;
  return { sx: SCALE * (1 + s * 0.3), sy: SCALE * (1 - s * 0.2) };
}
