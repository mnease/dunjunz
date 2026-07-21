/**
 * Army vs Horde — over-the-top multi-unit brawl.
 * Entire army deploys. No party-size cap. Enemies scale with roster size.
 */

import type { ArmyMember, ArmySave, PersonalityId } from './army';
import { memberPower, personalityOf } from './army';

export interface BattleUnit {
  id: string;
  name: string;
  side: 'army' | 'horde';
  hp: number;
  maxHp: number;
  power: number;
  personality?: PersonalityId;
  classLabel: string;
  alive: boolean;
}

export interface ArmyBattleState {
  wave: number;
  army: BattleUnit[];
  horde: BattleUnit[];
  log: string[];
  phase: 'player' | 'resolving' | 'won' | 'lost';
  turn: number;
}

const HORDE_NAMES = [
  'TAX COLLECTOR',
  'SENTIENT MUD',
  'EVIL INTERN',
  'MIMIC HR',
  'GOBLIN CPA',
  'SKELETON INFLUENCER',
  'FINAL BOSS JR.',
  'ANGRY GOOSE',
  'VOID SALESMAN',
  'CURSED TUTORIAL',
];

export function startArmyBattle(
  armySave: ArmySave,
  wave = 1,
  rng: () => number = Math.random,
): ArmyBattleState | { error: string } {
  if (!armySave.members.length) {
    return { error: 'NO ARMY — GRADUATE L20+ HEROES FROM DUNJUNZ FIRST' };
  }

  const army: BattleUnit[] = armySave.members.map((m) => ({
    id: m.id,
    name: `${m.name} ${m.title}`,
    side: 'army' as const,
    hp: m.maxHp,
    maxHp: m.maxHp,
    power: memberPower(m),
    personality: m.personality,
    classLabel: m.primaryClass ?? 'adventurer',
    alive: true,
  }));

  const n = Math.min(80, Math.max(3, army.length + Math.floor(wave * 1.5) + 2));
  const horde: BattleUnit[] = [];
  for (let i = 0; i < n; i++) {
    const base = 8 + wave * 3 + Math.floor(rng() * 6);
    const pwr = 10 + wave * 4 + Math.floor(rng() * 8);
    horde.push({
      id: `horde_${wave}_${i}`,
      name: HORDE_NAMES[Math.floor(rng() * HORDE_NAMES.length)]!,
      side: 'horde',
      hp: base,
      maxHp: base,
      power: pwr,
      classLabel: 'MENACE',
      alive: true,
    });
  }

  return {
    wave,
    army,
    horde,
    log: [
      `WAR WAVE ${wave} — ${army.length} HEROES VS ${horde.length} PROBLEMS`,
      'THE ARMY IS NOT LIMITED BY PARTY SIZE. ONLY BY YOUR LIFE CHOICES.',
    ],
    phase: 'player',
    turn: 1,
  };
}

function living(units: BattleUnit[]): BattleUnit[] {
  return units.filter((u) => u.alive && u.hp > 0);
}

function pickTarget(units: BattleUnit[], rng: () => number): BattleUnit | null {
  const L = living(units);
  if (!L.length) return null;
  return L[Math.floor(rng() * L.length)]!;
}

function attackLine(
  attacker: BattleUnit,
  target: BattleUnit,
  dmg: number,
  member?: ArmyMember,
): string {
  if (attacker.side === 'horde') {
    return `${attacker.name} BONKS ${target.name} FOR ${dmg}!`;
  }
  const p = attacker.personality
    ? personalityOf({
        personality: attacker.personality,
      } as ArmyMember)
    : null;
  const cry = p
    ? p.battleCries[Math.floor(Math.random() * p.battleCries.length)]
    : 'HIYAAA';
  const verb = p
    ? p.attackVerbs[Math.floor(Math.random() * p.attackVerbs.length)]
    : 'HITS';
  void member;
  return `${attacker.name}: "${cry}" — ${verb} ${target.name} (${dmg})`;
}

/**
 * One full round: every living army unit attacks, then horde responds.
 */
export function resolveArmyRound(
  state: ArmyBattleState,
  roster: ArmyMember[],
  rng: () => number = Math.random,
): ArmyBattleState {
  if (state.phase === 'won' || state.phase === 'lost') return state;

  let s: ArmyBattleState = {
    ...state,
    army: state.army.map((u) => ({ ...u })),
    horde: state.horde.map((u) => ({ ...u })),
    log: [...state.log],
    phase: 'resolving',
  };

  // Army attacks
  for (const unit of s.army) {
    if (!unit.alive) continue;
    const mem = roster.find((m) => m.id === unit.id);
    const p = mem ? personalityOf(mem) : null;
    // Hype man / sleepy sometimes skip attack for flavor
    if (p && p.id === 'sleepy' && rng() < 0.2) {
      s.log.push(`${unit.name} …sleeps through their turn. Iconic.`);
      continue;
    }
    if (p && p.id === 'hype_man' && rng() < 0.25) {
      // heal weakest ally
      const allies = living(s.army).sort((a, b) => a.hp - b.hp);
      const weak = allies[0];
      if (weak) {
        const heal = 4 + Math.floor(unit.power / 10);
        weak.hp = Math.min(weak.maxHp, weak.hp + heal);
        s.log.push(
          `${unit.name}: "LET'S GOOO" — HYPES ${weak.name} (+${heal} HP)`,
        );
        continue;
      }
    }

    const target = pickTarget(s.horde, rng);
    if (!target) break;
    const dmg = Math.max(
      1,
      Math.floor(unit.power / 4) + Math.floor(rng() * 6) + state.wave,
    );
    target.hp = Math.max(0, target.hp - dmg);
    s.log.push(attackLine(unit, target, dmg, mem));
    if (target.hp <= 0) {
      target.alive = false;
      s.log.push(`${target.name} IS CANCELLED.`);
    }
  }

  if (!living(s.horde).length) {
    return {
      ...s,
      phase: 'won',
      log: [
        ...s.log.slice(-40),
        'THE HORDE FOLDS. THE ARMY ROARS (OR NAPS). WAVE CLEAR!',
      ],
    };
  }

  // Horde attacks
  for (const foe of s.horde) {
    if (!foe.alive) continue;
    const target = pickTarget(s.army, rng);
    if (!target) break;
    const dmg = Math.max(
      1,
      Math.floor(foe.power / 5) + Math.floor(rng() * 4) + Math.floor(state.wave / 2),
    );
    // Polite murder / accountant slightly tankier flavor via dodge
    if (rng() < 0.08) {
      s.log.push(`${target.name} DODGES WITH MAIN-CHARACTER ENERGY.`);
      continue;
    }
    target.hp = Math.max(0, target.hp - dmg);
    s.log.push(attackLine(foe, target, dmg));
    if (target.hp <= 0) {
      target.alive = false;
      s.log.push(`${target.name} IS DOWN! SOMEONE WRITE A BALLAD!`);
    }
  }

  if (!living(s.army).length) {
    return {
      ...s,
      phase: 'lost',
      log: [
        ...s.log.slice(-40),
        'THE ARMY IS WIPED. RESPAWN THE VIBES. RETRY WAVE.',
      ],
    };
  }

  return {
    ...s,
    phase: 'player',
    turn: s.turn + 1,
    log: [...s.log.slice(-50), `— END OF ROUND ${s.turn} —`],
  };
}

export function countLiving(units: BattleUnit[]): number {
  return living(units).length;
}
