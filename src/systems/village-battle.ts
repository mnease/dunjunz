/**
 * Humanz & Villagez — pure turn-based battle rules.
 * You are the dragon. Villagers want your gold. Dice optional; math mandatory.
 */

export type DragonActionId = 'claw' | 'flame' | 'roar' | 'guard' | 'hoard';

export type VillagerKind = 'peasant' | 'thief' | 'knight' | 'mage';

export interface DragonActionDef {
  id: DragonActionId;
  name: string;
  blurb: string;
  /** Needs a living target index (claw). */
  needsTarget: boolean;
}

export const DRAGON_ACTIONS: DragonActionDef[] = [
  {
    id: 'claw',
    name: 'CLAW',
    blurb: 'Swipe one human. Honest violence.',
    needsTarget: true,
  },
  {
    id: 'flame',
    name: 'FLAME',
    blurb: 'Toast the whole squad. Medium burn.',
    needsTarget: false,
  },
  {
    id: 'roar',
    name: 'ROAR',
    blurb: 'Scare them stiff. Stun chance.',
    needsTarget: false,
  },
  {
    id: 'guard',
    name: 'GUARD',
    blurb: 'Curl over the hoard. Half damage next round.',
    needsTarget: false,
  },
  {
    id: 'hoard',
    name: 'HOARD',
    blurb: 'Count coins. Heal a bit. Gain nothing else.',
    needsTarget: false,
  },
];

export interface Villager {
  id: string;
  name: string;
  kind: VillagerKind;
  hp: number;
  maxHp: number;
  atk: number;
  /** Gold stolen if they complete a steal action. */
  steal: number;
  alive: boolean;
  stunned: boolean;
}

export type BattlePhase = 'player' | 'enemy' | 'won' | 'lost';

export interface BattleState {
  wave: number;
  dragonHp: number;
  dragonMaxHp: number;
  gold: number;
  phase: BattlePhase;
  villagers: Villager[];
  guarding: boolean;
  log: string[];
  selectedTarget: number;
}

export interface HumanzCampaign {
  version: 1;
  mode: 'humanz';
  dragonHp: number;
  dragonMaxHp: number;
  gold: number;
  /** Next wave to fight (1-based). */
  wave: number;
  victories: number;
  bestWave: number;
  dragonName: string;
}

const VILLAGER_NAMES = [
  'GREG',
  'MAUD',
  'PIP',
  'SIR BOB',
  'HEXA',
  'TOAD',
  'NELL',
  'KRUM',
  'WISP',
  'FANGLESS',
];

export function defaultCampaign(): HumanzCampaign {
  return {
    version: 1,
    mode: 'humanz',
    dragonHp: 40,
    dragonMaxHp: 40,
    gold: 100,
    wave: 1,
    victories: 0,
    bestWave: 0,
    dragonName: 'SCALES McHOARD',
  };
}

function villagerTemplate(
  kind: VillagerKind,
  wave: number,
  _index: number,
): Omit<Villager, 'id' | 'name'> {
  const w = Math.max(1, wave);
  switch (kind) {
    case 'thief':
      return {
        kind,
        hp: 6 + w,
        maxHp: 6 + w,
        atk: 2 + Math.floor(w / 3),
        steal: 8 + w * 2,
        alive: true,
        stunned: false,
      };
    case 'knight':
      return {
        kind,
        hp: 12 + w * 2,
        maxHp: 12 + w * 2,
        atk: 4 + Math.floor(w / 2),
        steal: 3 + w,
        alive: true,
        stunned: false,
      };
    case 'mage':
      return {
        kind,
        hp: 7 + w,
        maxHp: 7 + w,
        atk: 5 + Math.floor(w / 2),
        steal: 4 + w,
        alive: true,
        stunned: false,
      };
    default:
      return {
        kind: 'peasant',
        hp: 5 + w,
        maxHp: 5 + w,
        atk: 2 + Math.floor(w / 4),
        steal: 5 + w,
        alive: true,
        stunned: false,
      };
  }
}

function kindsForWave(wave: number): VillagerKind[] {
  if (wave <= 1) return ['peasant', 'peasant', 'thief'];
  if (wave === 2) return ['peasant', 'thief', 'knight'];
  if (wave === 3) return ['thief', 'knight', 'mage'];
  if (wave === 4) return ['knight', 'knight', 'thief', 'mage'];
  // 5+
  const n = Math.min(5, 3 + Math.floor(wave / 2));
  const pool: VillagerKind[] = ['peasant', 'thief', 'knight', 'mage'];
  const out: VillagerKind[] = [];
  for (let i = 0; i < n; i++) {
    out.push(pool[(wave + i) % pool.length]!);
  }
  return out;
}

export function startWave(campaign: HumanzCampaign): BattleState {
  const kinds = kindsForWave(campaign.wave);
  const villagers: Villager[] = kinds.map((kind, i) => {
    const base = villagerTemplate(kind, campaign.wave, i);
    return {
      ...base,
      id: `v${campaign.wave}-${i}`,
      name: VILLAGER_NAMES[(campaign.wave * 3 + i) % VILLAGER_NAMES.length]!,
    };
  });
  return {
    wave: campaign.wave,
    dragonHp: campaign.dragonHp,
    dragonMaxHp: campaign.dragonMaxHp,
    gold: campaign.gold,
    phase: 'player',
    villagers,
    guarding: false,
    log: [
      `WAVE ${campaign.wave} — VILLAGERS APPROACH THE HOARD`,
      `${villagers.length} HUMANZ WANT YOUR GOLD. RUDE.`,
    ],
    selectedTarget: firstLivingIndex(villagers),
  };
}

export function firstLivingIndex(villagers: Villager[]): number {
  const i = villagers.findIndex((v) => v.alive);
  return i < 0 ? 0 : i;
}

export function livingVillagers(state: BattleState): Villager[] {
  return state.villagers.filter((v) => v.alive);
}

export function allVillagersDown(state: BattleState): boolean {
  return state.villagers.every((v) => !v.alive);
}

function pushLog(state: BattleState, line: string): BattleState {
  const log = [...state.log, line].slice(-12);
  return { ...state, log };
}

function clampTarget(state: BattleState): BattleState {
  if (!state.villagers[state.selectedTarget]?.alive) {
    return { ...state, selectedTarget: firstLivingIndex(state.villagers) };
  }
  return state;
}

export function cycleTarget(state: BattleState, dir: 1 | -1): BattleState {
  if (state.phase !== 'player') return state;
  const living = state.villagers
    .map((v, i) => ({ v, i }))
    .filter((x) => x.v.alive);
  if (!living.length) return state;
  const cur = living.findIndex((x) => x.i === state.selectedTarget);
  const next = living[(cur + dir + living.length) % living.length]!;
  return { ...state, selectedTarget: next.i };
}

function dmgToDragon(state: BattleState, raw: number): number {
  let d = Math.max(1, raw);
  if (state.guarding) d = Math.max(1, Math.floor(d / 2));
  return d;
}

/** Apply dragon action; advances to enemy phase (or won). */
export function applyDragonAction(
  state: BattleState,
  action: DragonActionId,
  rng: () => number = Math.random,
): BattleState {
  if (state.phase !== 'player') return state;
  let s = { ...state, guarding: false, villagers: state.villagers.map((v) => ({ ...v })) };

  switch (action) {
    case 'claw': {
      s = clampTarget(s);
      const t = s.villagers[s.selectedTarget];
      if (!t?.alive) {
        return pushLog(s, 'NOBODY TO CLAW. AWKWARD.');
      }
      const dmg = 8 + Math.floor(s.wave / 2);
      t.hp = Math.max(0, t.hp - dmg);
      if (t.hp <= 0) {
        t.alive = false;
        s = pushLog(s, `CLAW CRITS ${t.name} — DOWN! (-${dmg})`);
      } else {
        s = pushLog(s, `CLAW HITS ${t.name} FOR ${dmg} (${t.hp}/${t.maxHp})`);
      }
      break;
    }
    case 'flame': {
      let hits = 0;
      const dmg = 4 + Math.floor(s.wave / 3);
      for (const v of s.villagers) {
        if (!v.alive) continue;
        v.hp = Math.max(0, v.hp - dmg);
        hits++;
        if (v.hp <= 0) v.alive = false;
      }
      s = pushLog(s, `FLAME BATH — ${hits} HUMANZ SINGED (${dmg} EACH)`);
      break;
    }
    case 'roar': {
      let stunned = 0;
      for (const v of s.villagers) {
        if (!v.alive) continue;
        v.hp = Math.max(0, v.hp - 2);
        if (v.hp <= 0) {
          v.alive = false;
          continue;
        }
        if (rng() < 0.55) {
          v.stunned = true;
          stunned++;
        }
      }
      s = pushLog(s, `ROAR! ${stunned} HUMANZ FREEZE. EARS RING.`);
      break;
    }
    case 'guard': {
      s = { ...s, guarding: true };
      s = pushLog(s, 'YOU CURL OVER THE HOARD. GUARD UP.');
      break;
    }
    case 'hoard': {
      const heal = 4 + Math.floor(s.wave / 2);
      const before = s.dragonHp;
      s = {
        ...s,
        dragonHp: Math.min(s.dragonMaxHp, s.dragonHp + heal),
      };
      s = pushLog(
        s,
        `YOU COUNT COINS. +${s.dragonHp - before} HP. VERY DRAGON.`,
      );
      break;
    }
  }

  if (allVillagersDown(s)) {
    return { ...s, phase: 'won', selectedTarget: 0 };
  }
  return { ...s, phase: 'enemy' };
}

/** Resolve all living villagers; returns player phase or lost. */
export function resolveVillagerRound(
  state: BattleState,
  rng: () => number = Math.random,
): BattleState {
  if (state.phase !== 'enemy') return state;
  let s: BattleState = {
    ...state,
    villagers: state.villagers.map((v) => ({ ...v })),
    log: [...state.log],
  };

  for (let i = 0; i < s.villagers.length; i++) {
    const v = s.villagers[i]!;
    if (!v.alive) continue;
    if (v.stunned) {
      v.stunned = false;
      s = pushLog(s, `${v.name} SHAKES IT OFF (STUNNED).`);
      continue;
    }

    // Thieves prefer steal; knights prefer attack; mages attack; peasants 50/50
    const preferSteal =
      v.kind === 'thief'
        ? true
        : v.kind === 'knight'
          ? false
          : v.kind === 'mage'
            ? rng() < 0.35
            : rng() < 0.5;

    if (preferSteal && s.gold > 0) {
      const take = Math.min(s.gold, v.steal);
      s = { ...s, gold: s.gold - take };
      s = pushLog(s, `${v.name} STEALS ${take} GOLD! (${s.gold} LEFT)`);
      if (s.gold <= 0) {
        return {
          ...s,
          gold: 0,
          phase: 'lost',
          log: [...s.log, 'THE HOARD IS EMPTY. YOU ARE… EMBARRASSED.'],
        };
      }
    } else {
      const raw = v.atk + (rng() < 0.2 ? 2 : 0);
      const dmg = dmgToDragon(s, raw);
      s = { ...s, dragonHp: Math.max(0, s.dragonHp - dmg) };
      s = pushLog(
        s,
        `${v.name} HITS YOU FOR ${dmg}${s.guarding ? ' (GUARDED)' : ''} (${s.dragonHp}/${s.dragonMaxHp})`,
      );
      if (s.dragonHp <= 0) {
        return {
          ...s,
          dragonHp: 0,
          phase: 'lost',
          log: [...s.log, 'YOU FALL. SOMEONE LOOTS YOUR EYEBROWS.'],
        };
      }
    }
  }

  s = {
    ...s,
    phase: 'player',
    guarding: false,
    selectedTarget: firstLivingIndex(s.villagers),
  };
  s = pushLog(s, '— YOUR TURN —');
  return s;
}

/** After wave win: heal a bit, bump wave, keep gold. */
export function applyWaveVictory(campaign: HumanzCampaign, battle: BattleState): HumanzCampaign {
  const heal = Math.min(
    battle.dragonMaxHp,
    battle.dragonHp + 6 + Math.floor(battle.wave / 2),
  );
  const nextWave = battle.wave + 1;
  return {
    ...campaign,
    dragonHp: heal,
    gold: battle.gold + 15 + battle.wave * 5,
    wave: nextWave,
    victories: campaign.victories + 1,
    bestWave: Math.max(campaign.bestWave, battle.wave),
  };
}

export function applyWaveLoss(campaign: HumanzCampaign, battle: BattleState): HumanzCampaign {
  // Soft fail: keep progress but gold floor + partial heal
  return {
    ...campaign,
    dragonHp: Math.max(8, Math.floor(campaign.dragonMaxHp * 0.5)),
    gold: Math.max(20, Math.floor(battle.gold * 0.5) || 20),
    // stay on same wave to retry
    wave: campaign.wave,
    bestWave: campaign.bestWave,
  };
}

export function actionByIndex(i: number): DragonActionId | null {
  return DRAGON_ACTIONS[i]?.id ?? null;
}
