# Dunjunz graphics level-up — motion + detail (v1 plan)

Status: **shipped** (2026-07-21 EMA council pass). Code-first, procedural textures, Phaser tweens. Module is `src/systems/vfx.ts` (not `fx.ts`). P0 + water/lava 2-frame + enemy personality bob + companion combat accents included.

## Baseline (2026-07 audit)

| Area | Current | Gap |
| --- | --- | --- |
| Textures | All canvas via `generateTextures` (`src/systems/textures.ts`); single static frames | No multi-frame keys; detail is sparse on tiles / creeps |
| Player | Static look combos; hip weapon hides on swing | No idle bob, walk, facing flip |
| Attack | `sword-swing` teleports out 220ms, no arc tween | Feels like a pop-in, not a swing |
| Hits | Tint flash + knockback; camera shake only on player hurt (`reduceMotion` gated) | No slash spark / impact puff |
| Death | 6× `particle` (gold 4×4) Image + tween | One palette; no kind-tint |
| Companion | Follow lerp; scale punch; alpha hop (Zorp); tint block (Pebbo) | No idle life; combat FX thin |
| Ambient | Water/lava/portal/forje static | Room feels frozen |
| Particles | Ad-hoc `add.image` + tween only | No shared helper; no reduceMotion gate |
| Phaser anims | **None** (`anims` / emitters unused) | Room to add lightly |

`reduceMotion` lives in `src/systems/settings.ts` + settings UI. **Only** player hurt shake checks it today (`GameScene.hurtPlayer`). Extend that gate everywhere new motion lands.

## Design principles

1. **Transform first** — bob, squash, angle, alpha, scale. Cheapest and readable at SCALE=3.
2. **Few extra canvas frames** — 2-frame water/lava/portal/forje and optional 2-frame slime/cube wobble. Never regenerate canvas every tick.
3. **Combat clarity > polish** — FX must not hide hitboxes, HP toasts, or facing.
4. **Budget** — room-local ambient tweens only; burst particles ≤8; no continuous particle storms.
5. **Tone** — Adventure Time–adjacent: bouncy, readable, slightly goofy. Not muddy dark-souls grit.

---

## A. Priority systems

### P0 (ship first; one PR slice below)

| ID | System | Why |
| --- | --- | --- |
| P0-1 | **`fx` helper module** | One place for burst particles, hit flash, swing arc, bob start/stop; all honor `loadSettings().reduceMotion` |
| P0-2 | **Idle bob** | Player + companion + peaceful cube (and optionally slime) — biggest “alive” win for ~30 lines |
| P0-3 | **Attack swing FX** | Tween sword angle/offset + 3–5 spark particles on swing and on hit |
| P0-4 | **Hit / death polish** | Kind-tinted particles; short squash on enemy hit; keep tint flash |
| P0-5 | **Ambient props** | Portal pulse, forje glow flicker (tween alpha/scale or 2-frame swap) |

### P1 (follow-up PRs)

| ID | System | Why |
| --- | --- | --- |
| P1-1 | Water / lava 2-frame tile cycle | Land personality; low CPU if room-scoped timer swaps textures |
| P1-2 | Walk “cycle” via flipX + bob phase | Real multi-frame walk multiplies appearance textures (expensive); prefer flip + Y bob phase while moving |
| P1-3 | Enemy personality motion | Slime squash-idle; skeleton rattle (tiny X jitter); wolf stretch on chase; cactus none (plant joke) |
| P1-4 | Companion style FX | Whisp heal sparkles; Zorp blink afterimage; Pebbo coil ring on block |
| P1-5 | Pickup / loot pop | Scale-in + gold glint for ground items and chest open |
| P1-6 | Texture detail pass | Extra pixels on wall edges, grass blades, best_bud silhouette per species (still tint-based) |
| P1-7 | Title / HUD micro-motion | Title logo soft bob; mapz already has star blink |

### P2 (defer)

- Full sprite-sheet walk (4-dir × frames × gear combos) — combinatorial explosion with appearance keys.
- Phaser `ParticleEmitter` managers with long lifetimes.
- Shader / post pipelines beyond existing CRT shell.
- Video / game-animation-frames skill pipeline.

---

## B. Concrete Phaser 3 + texture techniques

### B1. New module: `src/systems/fx.ts`

```ts
import type Phaser from 'phaser';
import { loadSettings } from './settings';
import { SCALE } from '../config';

export function motionOk(): boolean {
  return !loadSettings().reduceMotion;
}

/** One-shot gold/slime/etc puffs. Caps count. No-ops when reduceMotion. */
export function burstParticles(
  scene: Phaser.Scene,
  x: number,
  y: number,
  opts?: {
    key?: string; // 'particle' | 'particle_slime' | ...
    count?: number;
    spread?: number;
    duration?: number;
    tint?: number;
  },
): void {
  if (!motionOk()) return;
  const count = Math.min(opts?.count ?? 6, 8);
  const key = opts?.key ?? 'particle';
  const spread = opts?.spread ?? 40;
  const duration = opts?.duration ?? 320;
  for (let i = 0; i < count; i++) {
    const p = scene.add.image(x, y, key).setDepth(20).setScale(SCALE);
    if (opts?.tint != null) p.setTint(opts.tint);
    scene.tweens.add({
      targets: p,
      x: x + Phaser.Math.Between(-spread, spread),
      y: y + Phaser.Math.Between(-spread, spread),
      alpha: 0,
      scale: SCALE * 0.4,
      duration,
      onComplete: () => p.destroy(),
    });
  }
}

/** Continuous idle bob. Stores tween on GO data so we can kill cleanly. */
export function startIdleBob(
  scene: Phaser.Scene,
  go: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite,
  amp = 2,
  period = 900,
): void {
  stopIdleBob(scene, go);
  if (!motionOk()) return;
  const baseY = go.y;
  go.setData('bobBaseY', baseY);
  const tw = scene.tweens.add({
    targets: go,
    y: baseY - amp,
    duration: period / 2,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
  go.setData('bobTween', tw);
}

export function stopIdleBob(
  scene: Phaser.Scene,
  go: Phaser.GameObjects.GameObject,
): void {
  const tw = go.getData('bobTween') as Phaser.Tweens.Tween | undefined;
  if (tw) tw.stop();
  go.setData('bobTween', null);
  // Caller repositions; do not snap Y here if body-driven
}

/** Flash tint then restore (enemies may use clearTint or bud tint). */
export function hitFlash(
  scene: Phaser.Scene,
  go: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite,
  color = 0xffffff,
  ms = 80,
  onRestore?: () => void,
): void {
  go.setTint(color);
  scene.time.delayedCall(ms, () => {
    if (onRestore) onRestore();
    else go.clearTint();
  });
}
```

**Bob + physics note:** Player and enemies use Arcade bodies. Prefer bobbing **display only**:

- Option A (recommended): wrap visual in a parent Container, move body/root with physics, bob child sprite `y`.
- Option B (simpler, good enough): bob only when velocity ≈ 0; while moving, clear bob and let position be body-driven. Avoid fighting `body.position` every frame.

For Dunjunz one-session PR, **Option B** is enough:

```ts
// in update, after setVelocity:
const moving = Math.abs(vx) + Math.abs(vy) > 1;
if (moving) {
  // no bob; optional walk phase:
  this.player.y; // body owns y
  this.player.setScale(SCALE, SCALE * (1 + 0.04 * Math.sin(_time / 70))); // tiny squash walk
} else {
  ensurePlayerBob();
}
```

Even simpler P0: **companion + cube only bob** (manual position / idle), player gets **walk squash** only. Zero body conflict.

### B2. Attack swing (replace static pop)

Today (`tryAttack`): set position/angle, visible 220ms, hide.

Upgrade:

```ts
// Pseudo — keep hitbox at final reach; animate sprite into place
const fromAngle = angle - 70;
const toAngle = angle + 20;
this.swordHit.setAngle(fromAngle);
this.swordHit.setVisible(true);
this.swordHit.setAlpha(1);
// Position still at reach cell for overlap reliability
this.swordHit.setPosition(x, y);
if (motionOk()) {
  this.tweens.add({
    targets: this.swordHit,
    angle: toAngle,
    duration: 140,
    ease: 'Cubic.easeOut',
  });
  burstParticles(this, x, y, { count: 4, spread: 18, duration: 200, tint: 0xdfe6f0 });
}
// existing delayedCall 220ms hide + attacking=false
```

On `hitEnemy`:

```ts
burstParticles(this, actor.sprite.x, actor.sprite.y, {
  count: 5,
  tint: kindParticleTint(actor.kind), // slime green, bone cream, etc.
});
if (motionOk()) {
  this.tweens.add({
    targets: actor.sprite,
    scaleX: SCALE * 1.15,
    scaleY: SCALE * 0.85,
    duration: 60,
    yoyo: true,
  });
}
```

### B3. Texture additions (still `canvasTex`)

In `generateTextures`:

```ts
// Extra particle colors (4×4)
for (const [key, color] of [
  ['particle_slime', COLORS.slime],
  ['particle_bone', COLORS.bone],
  ['particle_pink', COLORS.pink],
  ['particle_cyan', 0x4ecdc4],
  ['particle_ember', 0xff8a4c],
] as const) {
  canvasTex(scene, key, 4, 4, (ctx) => {
    ctx.fillStyle = hex(color);
    ctx.fillRect(0, 0, 4, 4);
  });
}

// 2-frame water / lava (P1 — optional in same PR if time)
canvasTex(scene, 'tile-water-b', TILE, TILE, (ctx) => { /* shifted highlight rows */ });
canvasTex(scene, 'tile-lava-b', TILE, TILE, (ctx) => { /* shifted hot spots */ });

// Portal / forje “hot” frames for alpha crossfade or texture swap
canvasTex(scene, 'portal-b', TILE, TILE, (ctx) => { /* brighter ring */ });
canvasTex(scene, 'forje-b', TILE, TILE, (ctx) => { /* taller ember */ });
```

**Sword swing detail:** add a soft arc wedge in `sword-swing` canvas (semi-transparent pixels) so motion reads even without particles.

**Detail without animation (cheap):**

- Wall: 1px brick mortar lines (not full grid — 2–3 lines max).
- Grass: 1 extra blade shade.
- Best bud: slightly rounder body + ear pixels (still monochrome for tint).
- Do **not** anti-alias or use gradients that smear at SCALE=3.

### B4. Ambient room loop

On `loadRoom`, after tiles/actors:

```ts
private startRoomAmbience(): void {
  this.stopRoomAmbience();
  if (!motionOk()) return;
  for (const a of this.actors) {
    if (!a.alive) continue;
    if (a.kind === 'portal') {
      this.tweens.add({
        targets: a.sprite,
        alpha: 0.65,
        scale: SCALE * 1.08,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
    if (a.kind === 'forje') {
      this.tweens.add({
        targets: a.sprite,
        alpha: 0.75,
        duration: 280,
        yoyo: true,
        repeat: -1,
      });
    }
    if (a.kind === 'cube' && !a.aggressive) {
      startIdleBob(this, a.sprite, 3, 1100);
    }
  }
}
```

Kill ambience tweens in `loadRoom` teardown / `shutdown` so rooms do not leak tweens.

### B5. Companion

In `updateCompanionFollow` when dist ≤ 24 (parked): ensure bob. When moving to player or chasing: stop bob, optional squash.

On bud strike (already scale 1.25): add `burstParticles` cyan/pink by bud id.

On Whisp heal: 4 pink particles on player.

On Pebbo block: short ring — 6 cyan particles with small spread, or scale pulse already present.

### B6. reduceMotion contract

| Effect | reduceMotion ON |
| --- | --- |
| Camera shake | skip (already) |
| Idle bob / ambient pulse | skip |
| Particle bursts | skip |
| Sword angle tween | skip (instant final pose still OK) |
| Hit squash | skip |
| Invuln blink | **keep** (gameplay feedback, not decorative) |
| Tint hit flash | **keep** (readability) |
| Toast / mapz alpha | keep (UI) |

Optional later: sync `prefers-reduced-motion` into `reduceMotion` default on first visit (landing already reads OS media query; game settings are separate).

---

## C. File touch list

| File | Change |
| --- | --- |
| **`src/systems/fx.ts`** | **New** — `motionOk`, `burstParticles`, `startIdleBob` / `stopIdleBob`, `hitFlash`, kind tint map |
| **`src/systems/textures.ts`** | Particle color keys; richer `sword-swing`; optional water/lava/portal/forje B frames; light static detail on wall/grass/bud |
| **`src/scenes/GameScene.ts`** | Wire FX: `tryAttack`, `hitEnemy`, death, hurt, companion combat, room ambience, walk squash / idle |
| **`src/systems/settings.ts`** | Comment only (or helper re-export); no schema change |
| **`src/scenes/UIScene.ts`** | Optional: forjing success sparkle via event; out of scope for P0 slice |
| **`src/scenes/TitleScene.ts`** | P1 logo bob |
| **`CHANGELOG.md`** | Unreleased bullets when shipping |
| **`docs/graphics-motion-detail-v1.md`** | This plan |
| Tests | Pure systems unchanged; no vitest required for tweens. Manual: reduceMotion on/off in settings |

Avoid: BootScene (unless registering anims later), appearance combinatorial explosion, new npm deps.

---

## D. Do-not

1. **No continuous particle emitters** per enemy/tile (mobile melt).
2. **No 60-particle death storms** — hard cap 8, short duration.
3. **No muddy pixels** — stay hard-edge 1×1 fills; no blur filters on sprites.
4. **No full walk sheet × gear combos** — appearance matrix already large.
5. **No bob on physics root while moving** — jitter / tunneling / double-Y bugs.
6. **No screen shake on every hit** — player hurt only (or boss kill once).
7. **No abandoning contrast** — white hit flash + HP toast stay.
8. **No video / external sprite pipeline** this pass (skills exist; code-first first).
9. **No ignoring `reduceMotion`** on new decorative motion.
10. **No depth chaos** — FX depth ~20; player 10; actors 5; tiles 0.

---

## E. Ship slice (one PR / one session)

**Title:** `feat(fx): idle life, swing arc, hit sparks, ambient portal/forje`

### Scope (must)

1. Add `src/systems/fx.ts` with `motionOk`, `burstParticles`, bob helpers.
2. Textures: `particle_slime`, `particle_bone`, `particle_pink`, `particle_cyan`, `particle_ember`; slightly better `sword-swing` (blade + thin arc pixels).
3. `tryAttack`: angle tween + small spark burst at blade.
4. `hitEnemy` + death: kind-tinted bursts + hit squash; refactor existing death loop to `burstParticles`.
5. Companion: idle bob when close; heal/block/strike particle accents.
6. Room ambience: portal + forje pulse; peaceful cube bob; teardown on room change.
7. Player: while moving, subtle scaleY pulse (walk feel); no multi-frame textures.
8. Gate all decorative motion with `motionOk()`; keep invuln blink + hit tints.
9. `CHANGELOG.md` under Unreleased.

### Out of slice

- Water/lava frame swap
- Enemy-specific AI motion
- Title logo bob
- Container-based bob architecture
- Texture brick/grass mega-detail pass

### Manual verify checklist

- [ ] New game: player moves with subtle squash; sword arcs; slime death green sparks
- [ ] Settings → Reduce motion: no bob/pulse/particles/shake; combat still readable
- [ ] Best Bud present: bobs when idle; sparks on strike
- [ ] Boss room portal pulses; forje glows
- [ ] Peaceful cube bobs; after hit, bob can stop (aggressive)
- [ ] Mobile Safari / low CPU: no frame hitch in a 5-creep room
- [ ] Room transition does not leave orphan tweens (portal ghost pulse)

### Estimate

~2–3 hours focused. ~150–250 LOC. No build pipeline change.

### Implementation order (session)

1. `fx.ts` + particle textures  
2. Refactor death particles → helper  
3. Attack + hit FX  
4. Companion bob + accents  
5. Portal/forje/cube ambience + cleanup  
6. Player walk squash  
7. reduceMotion pass audit  
8. CHANGELOG + playtest  

---

## Follow-up PR ideas (ordered)

1. Water/lava 2-frame + tile swap timer (room-scoped).  
2. Enemy personality motion + cactus “does nothing funny”.  
3. Static texture detail pass (walls, doors, bud silhouette).  
4. Loot pop + chest open.  
5. Only if needed: Container bob for true idle while standing on moving platforms (N/A today).

## References in repo

- `src/systems/textures.ts` — `canvasTex`, `generateTextures`, ends with `particle`
- `src/scenes/GameScene.ts` — `tryAttack` ~2470, `hitEnemy` ~1767, death particles ~1886, companion ~1180–1318, `hurtPlayer` reduceMotion ~1719, `update` ~2846
- `src/systems/settings.ts` — `reduceMotion`
- `src/ui/settings.ts` — `#set-reduce-motion`
- `src/scenes/UIScene.ts` — mapz star tween, toast fade
