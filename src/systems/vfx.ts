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

export type LightningPoint = { x: number; y: number };

/**
 * Build a jagged lightning polyline from start → end (screen/world coords).
 * Pure geometry — used for VFX draw + hit tests.
 */
export function buildLightningPath(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  segs = 8,
  jag = 14,
  rng: () => number = Math.random,
): LightningPoint[] {
  const n = Math.max(2, segs | 0);
  const pts: LightningPoint[] = [{ x: x0, y: y0 }];
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  for (let i = 1; i < n; i++) {
    const t = i / n;
    // Mid-path jags stronger; ends hug the line
    const amp = jag * Math.sin(t * Math.PI) * (0.55 + rng() * 0.9);
    const side = rng() < 0.5 ? -1 : 1;
    pts.push({
      x: x0 + dx * t + nx * amp * side,
      y: y0 + dy * t + ny * amp * side,
    });
  }
  pts.push({ x: x1, y: y1 });
  return pts;
}

/**
 * Draw a bright electric arc along a polyline, then fade/destroy.
 * Main bolt + thinner core + optional side forks.
 */
export function drawLightningArc(
  scene: Phaser.Scene,
  points: readonly LightningPoint[],
  opts?: {
    color?: number;
    coreColor?: number;
    durationMs?: number;
    forks?: boolean;
  },
): void {
  if (points.length < 2) return;
  const color = opts?.color ?? 0x4ac0ff;
  const core = opts?.coreColor ?? 0xe0f8ff;
  const duration = opts?.durationMs ?? 220;
  const forks = opts?.forks !== false;

  const g = scene.add.graphics().setDepth(18);
  // Outer glow
  g.lineStyle(5, color, 0.35);
  g.beginPath();
  g.moveTo(points[0]!.x, points[0]!.y);
  for (let i = 1; i < points.length; i++) {
    g.lineTo(points[i]!.x, points[i]!.y);
  }
  g.strokePath();
  // Mid bolt
  g.lineStyle(2.5, color, 0.95);
  g.beginPath();
  g.moveTo(points[0]!.x, points[0]!.y);
  for (let i = 1; i < points.length; i++) {
    g.lineTo(points[i]!.x, points[i]!.y);
  }
  g.strokePath();
  // Hot core
  g.lineStyle(1.2, core, 1);
  g.beginPath();
  g.moveTo(points[0]!.x, points[0]!.y);
  for (let i = 1; i < points.length; i++) {
    g.lineTo(points[i]!.x, points[i]!.y);
  }
  g.strokePath();

  // Short side forks from mid segments
  if (forks && motionAllowed()) {
    for (let i = 2; i < points.length - 2; i += 2) {
      if (Math.random() > 0.55) continue;
      const p = points[i]!;
      const ang = Math.random() * Math.PI * 2;
      const fl = 10 + Math.random() * 18;
      const fx = p.x + Math.cos(ang) * fl;
      const fy = p.y + Math.sin(ang) * fl;
      g.lineStyle(1.5, color, 0.75);
      g.beginPath();
      g.moveTo(p.x, p.y);
      g.lineTo(
        p.x + Math.cos(ang + 0.4) * fl * 0.45,
        p.y + Math.sin(ang + 0.4) * fl * 0.45,
      );
      g.lineTo(fx, fy);
      g.strokePath();
    }
  }

  if (!motionAllowed()) {
    scene.time.delayedCall(80, () => g.destroy());
    return;
  }
  scene.tweens.add({
    targets: g,
    alpha: 0,
    duration,
    ease: 'Cubic.easeOut',
    onComplete: () => g.destroy(),
  });
  // Second flicker bolt slightly offset
  scene.time.delayedCall(40, () => {
    if (!scene.sys?.isActive()) return;
    const g2 = scene.add.graphics().setDepth(18);
    g2.lineStyle(2, core, 0.85);
    g2.beginPath();
    const j = 3;
    g2.moveTo(points[0]!.x + j, points[0]!.y - j);
    for (let i = 1; i < points.length; i++) {
      g2.lineTo(
        points[i]!.x + (Math.random() - 0.5) * 6,
        points[i]!.y + (Math.random() - 0.5) * 6,
      );
    }
    g2.strokePath();
    scene.tweens.add({
      targets: g2,
      alpha: 0,
      duration: duration * 0.7,
      ease: 'Quad.easeOut',
      onComplete: () => g2.destroy(),
    });
  });
}

/** Distance from point to polyline (min segment distance). */
export function distPointToPolyline(
  px: number,
  py: number,
  points: readonly LightningPoint[],
): number {
  if (points.length < 2) return Number.POSITIVE_INFINITY;
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const apx = px - a.x;
    const apy = py - a.y;
    const ab2 = abx * abx + aby * aby || 1;
    let t = (apx * abx + apy * aby) / ab2;
    t = Math.max(0, Math.min(1, t));
    const cx = a.x + abx * t;
    const cy = a.y + aby * t;
    const d = Math.hypot(px - cx, py - cy);
    if (d < best) best = d;
  }
  return best;
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
