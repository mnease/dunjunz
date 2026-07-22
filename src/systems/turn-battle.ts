/**
 * Classic turn-based combat (FF / D&D-adjacent).
 * Pure state machine — Phaser scene renders and calls these helpers.
 *
 * Rules (research-aligned classic JRPG):
 * - Build combatants: heroes (left) + enemies (right)
 * - Initiative / speed: higher DEX (or enemy speed) acts earlier each round
 * - Round: sort living by speed desc, each takes one action
 * - Actions: Attack (pick target), Defend (½ damage until next turn),
 *   Item (potion if available), Flee (chance vs avg enemy speed)
 * - Win: all enemies down. Lose: all heroes down.
 */

import type { SaveData } from '../types';
import { computePlayerDamage } from './attributes';
import { effectiveAttrs } from './hero-identity';
import { resolveEnemyContactDamage } from './enemies';

export type TbSide = 'hero' | 'enemy';

export type TbActionId = 'attack' | 'defend' | 'item' | 'flee';

export interface TbCombatant {
  id: string;
  name: string;
  side: TbSide;
  /** Actor kind for enemies (slime, skeleton, …). */
  kind: string;
  hp: number;
  maxHp: number;
  /** Damage dealt on Attack. */
  atk: number;
  /** Speed / initiative (higher first). */
  speed: number;
  alive: boolean;
  defending: boolean;
  /** Optional texture key for battle sprites. */
  tex?: string;
}

export type TbPhase =
  | 'pick_action'
  | 'pick_target'
  | 'animating'
  | 'won'
  | 'lost'
  | 'fled';

export interface TbBattleState {
  heroes: TbCombatant[];
  enemies: TbCombatant[];
  /** Full turn order ids for current round. */
  order: string[];
  /** Index into order for whose turn it is. */
  orderIdx: number;
  phase: TbPhase;
  /** Pending action while choosing a target. */
  pendingAction: TbActionId | null;
  log: string[];
  /** Actor ids killed this battle (for crawl despawn). */
  defeatedEnemyIds: string[];
  /** Potions available at battle start (consumed in battle). */
  potions: number;
}

export interface TbEnemySeed {
  id: string;
  kind: string;
  name?: string;
  hp: number;
  maxHp: number;
  contactDamage: number;
  tex?: string;
}

function heroSpeed(save: SaveData): number {
  const d = effectiveAttrs(save).dex;
  return 8 + d * 2;
}

function enemySpeed(kind: string): number {
  switch (kind) {
    case 'hornet':
      return 16;
    case 'redshirt':
      return 12;
    case 'scorpion':
    case 'tarantula':
      return 11;
    case 'skeleton':
      return 10;
    case 'wolf':
      return 13;
    case 'boss':
    case 'miniboss':
      return 9;
    case 'cube':
      return 6;
    case 'cactus':
      return 5;
    default:
      return 8;
  }
}

export function buildHeroes(
  save: SaveData,
  opts?: { includeBud?: boolean; budName?: string },
): TbCombatant[] {
  const atk = Math.max(1, computePlayerDamage(save));
  const heroes: TbCombatant[] = [
    {
      id: 'hero',
      name: 'YOU',
      side: 'hero',
      kind: 'hero',
      hp: Math.max(1, save.hp),
      maxHp: Math.max(1, save.maxHp),
      atk,
      speed: heroSpeed(save),
      alive: save.hp > 0,
      defending: false,
      tex: 'player',
    },
  ];
  if (opts?.includeBud && save.bestBudId && (save.bestBudStage === 'found' || save.bestBudStage === 'complete')) {
    const budLvl = Math.max(1, save.budLevel ?? 1);
    heroes.push({
      id: 'bud',
      name: (opts.budName ?? save.bestBudId).toUpperCase(),
      side: 'hero',
      kind: 'best_bud',
      hp: Math.max(4, 6 + budLvl * 2),
      maxHp: Math.max(4, 6 + budLvl * 2),
      atk: Math.max(1, 1 + Math.floor(budLvl / 2)),
      speed: 7 + budLvl,
      alive: true,
      defending: false,
      tex: 'best_bud',
    });
  }
  return heroes;
}

export function buildEnemies(seeds: TbEnemySeed[]): TbCombatant[] {
  return seeds.map((s) => ({
    id: s.id,
    name: (s.name ?? s.kind).toUpperCase(),
    side: 'enemy' as const,
    kind: s.kind,
    hp: Math.max(1, s.hp),
    maxHp: Math.max(1, s.maxHp),
    atk: Math.max(1, s.contactDamage),
    speed: enemySpeed(s.kind),
    alive: s.hp > 0,
    defending: false,
    tex: s.tex ?? s.kind,
  }));
}

export function potionCount(save: SaveData): number {
  return Math.max(0, Math.floor(save.stacks?.potion ?? save.stacks?.heart ?? 0));
}

export function startBattle(
  heroes: TbCombatant[],
  enemies: TbCombatant[],
  potions: number,
): TbBattleState {
  const state: TbBattleState = {
    heroes,
    enemies,
    order: [],
    orderIdx: 0,
    phase: 'pick_action',
    pendingAction: null,
    log: ['BATTLE START!'],
    defeatedEnemyIds: [],
    potions: Math.max(0, potions),
  };
  return beginRound(state);
}

function allCombatants(s: TbBattleState): TbCombatant[] {
  return [...s.heroes, ...s.enemies];
}

function findById(s: TbBattleState, id: string): TbCombatant | null {
  return allCombatants(s).find((c) => c.id === id) ?? null;
}

function living(side: TbSide, s: TbBattleState): TbCombatant[] {
  return (side === 'hero' ? s.heroes : s.enemies).filter((c) => c.alive);
}

export function beginRound(s: TbBattleState): TbBattleState {
  const livingAll = allCombatants(s).filter((c) => c.alive);
  const order = [...livingAll]
    .sort((a, b) => b.speed - a.speed || a.name.localeCompare(b.name))
    .map((c) => c.id);
  let next: TbBattleState = {
    ...s,
    order,
    orderIdx: 0,
    pendingAction: null,
    phase: 'pick_action',
    log: [...s.log, '— NEW ROUND —'],
  };
  // Clear defend at start of own turn when they act — keep until then
  return advanceToNextActor(next);
}

function advanceToNextActor(s: TbBattleState): TbBattleState {
  let idx = s.orderIdx;
  while (idx < s.order.length) {
    const c = findById(s, s.order[idx]!);
    if (c?.alive) {
      // Clear defend when this unit's turn begins
      const heroes = s.heroes.map((h) =>
        h.id === c.id ? { ...h, defending: false } : h,
      );
      const enemies = s.enemies.map((e) =>
        e.id === c.id ? { ...e, defending: false } : e,
      );
      const cur = { ...c, defending: false };
      if (cur.side === 'hero') {
        return {
          ...s,
          heroes,
          enemies,
          orderIdx: idx,
          phase: 'pick_action',
          pendingAction: null,
          log: [...s.log, `${cur.name}'S TURN`],
        };
      }
      // Enemy acts immediately (AI)
      return enemyAct({ ...s, heroes, enemies, orderIdx: idx }, cur);
    }
    idx++;
  }
  // Round complete
  if (living('enemy', s).length === 0) {
    return { ...s, phase: 'won', log: [...s.log, 'VICTORY!'] };
  }
  if (living('hero', s).length === 0) {
    return { ...s, phase: 'lost', log: [...s.log, 'DEFEAT…'] };
  }
  return beginRound({ ...s, orderIdx: 0 });
}

function afterAction(s: TbBattleState): TbBattleState {
  if (living('enemy', s).length === 0) {
    return { ...s, phase: 'won', log: [...s.log, 'VICTORY!'] };
  }
  if (living('hero', s).length === 0) {
    return { ...s, phase: 'lost', log: [...s.log, 'DEFEAT…'] };
  }
  return advanceToNextActor({ ...s, orderIdx: s.orderIdx + 1, pendingAction: null });
}

export function currentActor(s: TbBattleState): TbCombatant | null {
  if (s.phase === 'won' || s.phase === 'lost' || s.phase === 'fled') return null;
  const id = s.order[s.orderIdx];
  if (!id) return null;
  return findById(s, id);
}

export function selectAction(
  s: TbBattleState,
  action: TbActionId,
): TbBattleState {
  if (s.phase !== 'pick_action') return s;
  const actor = currentActor(s);
  if (!actor || actor.side !== 'hero' || !actor.alive) return s;

  if (action === 'defend') {
    return applyDefend(s, actor.id);
  }
  if (action === 'flee') {
    return tryFlee(s);
  }
  if (action === 'item') {
    return applyItem(s, actor.id);
  }
  // attack → need target
  const foes = living('enemy', s);
  if (foes.length === 1) {
    return applyAttack(s, actor.id, foes[0]!.id);
  }
  return {
    ...s,
    phase: 'pick_target',
    pendingAction: 'attack',
    log: [...s.log, 'CHOOSE A TARGET'],
  };
}

export function selectTarget(s: TbBattleState, targetId: string): TbBattleState {
  if (s.phase !== 'pick_target' || s.pendingAction !== 'attack') return s;
  const actor = currentActor(s);
  if (!actor) return s;
  const t = findById(s, targetId);
  if (!t || !t.alive || t.side !== 'enemy') return s;
  return applyAttack(s, actor.id, targetId);
}

function applyDefend(s: TbBattleState, actorId: string): TbBattleState {
  const heroes = s.heroes.map((h) =>
    h.id === actorId ? { ...h, defending: true } : h,
  );
  const enemies = s.enemies.map((e) =>
    e.id === actorId ? { ...e, defending: true } : e,
  );
  const name = findById(s, actorId)?.name ?? '?';
  return afterAction({
    ...s,
    heroes,
    enemies,
    log: [...s.log, `${name} DEFENDS`],
  });
}

function applyItem(s: TbBattleState, actorId: string): TbBattleState {
  if (s.potions <= 0) {
    return {
      ...s,
      log: [...s.log, 'NO POTIONS!'],
    };
  }
  const actor = findById(s, actorId);
  if (!actor || !actor.alive) return s;
  const heal = Math.max(3, Math.floor(actor.maxHp * 0.35));
  const hp = Math.min(actor.maxHp, actor.hp + heal);
  const heroes = s.heroes.map((h) =>
    h.id === actorId ? { ...h, hp } : h,
  );
  return afterAction({
    ...s,
    heroes,
    potions: s.potions - 1,
    log: [...s.log, `${actor.name} USES POTION (+${heal} HP)`],
  });
}

function tryFlee(s: TbBattleState): TbBattleState {
  const heroSp =
    living('hero', s).reduce((a, c) => a + c.speed, 0) /
    Math.max(1, living('hero', s).length);
  const foeSp =
    living('enemy', s).reduce((a, c) => a + c.speed, 0) /
    Math.max(1, living('enemy', s).length);
  const chance = Math.min(0.85, Math.max(0.2, 0.45 + (heroSp - foeSp) * 0.03));
  const ok = Math.random() < chance;
  if (ok) {
    return { ...s, phase: 'fled', log: [...s.log, 'GOT AWAY SAFELY!'] };
  }
  return afterAction({
    ...s,
    log: [...s.log, 'COULD NOT ESCAPE!'],
  });
}

function applyAttack(
  s: TbBattleState,
  attackerId: string,
  targetId: string,
): TbBattleState {
  const atk = findById(s, attackerId);
  const def = findById(s, targetId);
  if (!atk?.alive || !def?.alive) return s;
  let dmg = Math.max(1, atk.atk);
  if (def.defending) dmg = Math.max(1, Math.floor(dmg / 2));
  const hp = Math.max(0, def.hp - dmg);
  const dead = hp <= 0;
  let heroes = s.heroes;
  let enemies = s.enemies;
  let defeated = s.defeatedEnemyIds;
  if (def.side === 'hero') {
    heroes = heroes.map((h) =>
      h.id === targetId ? { ...h, hp, alive: hp > 0 } : h,
    );
  } else {
    enemies = enemies.map((e) =>
      e.id === targetId ? { ...e, hp, alive: hp > 0 } : e,
    );
    if (dead) defeated = [...defeated, def.id];
  }
  const log = [
    ...s.log,
    `${atk.name} HITS ${def.name} FOR ${dmg}${dead ? ' — DOWN!' : ''}`,
  ];
  return afterAction({ ...s, heroes, enemies, defeatedEnemyIds: defeated, log });
}

function enemyAct(s: TbBattleState, enemy: TbCombatant): TbBattleState {
  const targets = living('hero', s);
  if (targets.length === 0) {
    return { ...s, phase: 'lost', log: [...s.log, 'DEFEAT…'] };
  }
  // Prefer lowest HP hero
  const target = [...targets].sort((a, b) => a.hp - b.hp)[0]!;
  return applyAttack(
    { ...s, log: [...s.log, `${enemy.name}'S TURN`] },
    enemy.id,
    target.id,
  );
}

/** Apply battle result HP / potions back onto save. */
export function applyBattleToSave(
  save: SaveData,
  state: TbBattleState,
): SaveData {
  const hero = state.heroes.find((h) => h.id === 'hero');
  const hp = hero ? Math.max(0, hero.hp) : save.hp;
  const used = Math.max(0, potionCount(save) - state.potions);
  let stacks = { ...save.stacks };
  if (used > 0) {
    const key = stacks.potion != null ? 'potion' : 'heart';
    const left = Math.max(0, (stacks[key] ?? 0) - used);
    if (left <= 0) delete stacks[key];
    else stacks[key] = left;
  }
  return { ...save, hp, stacks };
}

/** Build enemy seeds from room actors for engagement. */
export function enemySeedFromActor(a: {
  id: string;
  kind: string;
  hp: number;
  maxHp: number;
  contactDamage?: number;
}): TbEnemySeed {
  return {
    id: a.id,
    kind: a.kind,
    name: a.kind,
    hp: a.hp,
    maxHp: a.maxHp,
    contactDamage:
      a.contactDamage ??
      resolveEnemyContactDamage(a.kind, 0),
  };
}
