/**
 * Brags (achievements) — retro brag board, not corporate gamification.
 * Unlock copy: "NEW BRAG:" — bard energy, not Xbox energy.
 */

import type { SaveData } from '../types';
import { isQuestCompleted, QUEST_SEWERZ_GOOSE } from './champion-quests';

export interface AchievementDef {
  id: string;
  /** Short brag title (ALL CAPS ok). */
  title: string;
  /** One-line flavor. */
  blurb: string;
  /** Pure predicate against save. */
  test: (save: SaveData) => boolean;
  /** Optional coin drip on unlock (small). */
  coins?: number;
}

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  {
    id: 'brag-first-bonk',
    title: 'FIRST BONK',
    blurb: 'You hit something. It noticed. Mathematical.',
    test: (s) => (s.killed?.length ?? 0) >= 1,
  },
  {
    id: 'brag-dm-down',
    title: 'META SLAYER',
    blurb: 'The Dunjun Master faceplanted. Nat 1 forever.',
    test: (s) =>
      s.killed.includes('dungeon-master') ||
      (s.landsCleared ?? []).includes('dunjunz') ||
      !!s.bossDefeated,
  },
  {
    id: 'brag-wolf-lord',
    title: 'AWOO INTERRUPTED',
    blurb: 'Wolf Lord learned about swords. Briefly.',
    test: (s) =>
      s.killed.includes('wolf-lord') ||
      (s.landsCleared ?? []).includes('woodz'),
  },
  {
    id: 'brag-wraith',
    title: 'SANDY POOF',
    blurb: 'Wraith went *poof*. Princesz un-yeeted.',
    test: (s) =>
      s.killed.includes('sand-wraith') ||
      (s.landsCleared ?? []).includes('dezertz') ||
      !!s.princessSaved,
  },
  {
    id: 'brag-rescue',
    title: 'NOT MY PERSONAL HERO',
    blurb: 'Champion energy. Kingdom duty. Zero romance. Gross.',
    test: (s) => !!s.princessSaved,
  },
  {
    id: 'brag-bud-found',
    title: 'WEIRD LOYAL',
    blurb: 'You found a Best Bud. Not a sidekick. Big difference.',
    test: (s) =>
      s.bestBudStage === 'found' || s.bestBudStage === 'complete',
  },
  {
    id: 'brag-bud-complete',
    title: 'OFFICIAL BUDDIES',
    blurb: 'Prizella stamped the friendship. Not a wedding.',
    test: (s) => s.bestBudStage === 'complete',
  },
  {
    id: 'brag-goose',
    title: 'TAX HONK',
    blurb: 'Royal Goose filed a complaint. Permanently.',
    test: (s) =>
      s.killed.includes('royal-goose') ||
      isQuestCompleted(s, QUEST_SEWERZ_GOOSE),
  },
  {
    id: 'brag-cube-friend',
    title: 'GELATINOUS DIPLOMACY',
    blurb: 'You talked to the cube. It said sorry. Kinda.',
    test: (s) => !!s.flags?.['cube_forgiven'],
  },
  {
    id: 'brag-cube-slain',
    title: 'NO MORE WOBBLES',
    blurb: 'The cube is a puddle. Mixed vibes. Strong vibes.',
    test: (s) =>
      !!s.flags?.['cube_slain'] || s.killed.includes('gel-cube'),
  },
  {
    id: 'brag-rich-100',
    title: 'COIN HOARDER',
    blurb: '100c. The tinkerer is emotionally available.',
    test: (s) => (s.coins ?? 0) >= 100,
    coins: 5,
  },
  {
    id: 'brag-rich-500',
    title: 'DRAGON-ADJACENT',
    blurb: '500c. Sleep on it. Not literally. Or do.',
    test: (s) => (s.coins ?? 0) >= 500,
    coins: 15,
  },
  {
    id: 'brag-level-10',
    title: 'DOUBLE DIGITS',
    blurb: 'Level 10. Attr points: spend them. Please.',
    test: (s) => (s.level ?? 1) >= 10,
  },
  {
    id: 'brag-explorer',
    title: 'ROOM TOURIST',
    blurb: '15+ rooms visited. Mapz soft-clapping.',
    test: (s) => (s.visitedRooms?.length ?? 0) >= 15,
  },
  {
    id: 'brag-mapz-nerd',
    title: 'CARTOGRAPHY CHAOS',
    blurb: '4+ mapz lands unfurled. Press M. Get lost on purpose.',
    test: (s) => (s.discoveredMapz?.length ?? 0) >= 4,
  },
  {
    id: 'brag-full-plate',
    title: 'WALKING CLOSET',
    blurb: 'Weapon + armor + helm + something shiny. Fashion.',
    test: (s) => {
      const e = s.equipped;
      if (!e) return false;
      return !!(
        e.weapon &&
        e.breastplate &&
        e.helmet &&
        (e.amulet || e.ring || e.shield)
      );
    },
  },
  {
    id: 'brag-bud-geared',
    title: 'SHARED LOOT LORE',
    blurb: 'You put a weapon on your bud. Teamwork. Sticky teamwork.',
    test: (s) => !!(s.budEquipped?.weapon || s.budEquipped?.breastplate),
  },
  {
    id: 'brag-bud-lv5',
    title: 'BUDDY GROWTH SPURT',
    blurb: 'Best Bud hit level 5. Still not a sidekick.',
    test: (s) => (s.budLevel ?? 1) >= 5,
  },
  {
    id: 'brag-death',
    title: 'RESPAWN BALLAD',
    blurb: 'You died. The bard is already writing. Unflattering.',
    test: (s) => !!s.flags?.['died_once'],
  },
  {
    id: 'brag-forje',
    title: 'ANVIL KISSER',
    blurb: 'You forjed something. Sparks. Opinions. Hot.',
    test: (s) => !!s.flags?.['forjed_once'],
  },
  {
    id: 'brag-shop',
    title: 'FAIR-ISH PRICES',
    blurb: 'Bought or sold. Tinkerer remains judgmental.',
    test: (s) => !!s.flags?.['shop_traded'],
  },
  {
    id: 'brag-kingdom',
    title: 'COURT APPEARANCE',
    blurb: 'You walked into Kingdomz. Mind the rugs.',
    test: (s) =>
      (s.visitedRooms ?? []).some((r) => r.startsWith('kingdom')),
  },
  {
    id: 'brag-sewer-tourist',
    title: 'PIPE CURIOSITY',
    blurb: 'Entered the Royal Sewerz. Bring snacks. Mentally.',
    test: (s) =>
      (s.visitedRooms ?? []).some((r) => r.startsWith('sewerz')),
  },
];

export function isAchievementUnlocked(
  save: SaveData,
  id: string,
): boolean {
  return (save.achievementsUnlocked ?? []).includes(id);
}

export function getAchievement(id: string): AchievementDef | null {
  return ACHIEVEMENTS.find((a) => a.id === id) ?? null;
}

/**
 * Scan all brags; unlock any newly earned.
 * Returns updated save + list of fresh unlocks (for toasts).
 */
export function syncAchievements(save: SaveData): {
  save: SaveData;
  newly: AchievementDef[];
} {
  const have = new Set(save.achievementsUnlocked ?? []);
  const newly: AchievementDef[] = [];
  let coins = save.coins ?? 0;

  for (const a of ACHIEVEMENTS) {
    if (have.has(a.id)) continue;
    try {
      if (a.test(save)) {
        have.add(a.id);
        newly.push(a);
        if (a.coins) coins += a.coins;
      }
    } catch {
      /* ignore bad predicates */
    }
  }

  if (!newly.length) {
    return { save, newly: [] };
  }

  return {
    save: {
      ...save,
      coins,
      achievementsUnlocked: [...have],
      flags: {
        ...save.flags,
        ...Object.fromEntries(newly.map((a) => [`brag_${a.id}`, true])),
      },
    },
    newly,
  };
}

export function achievementProgress(save: SaveData): {
  unlocked: number;
  total: number;
} {
  const u = save.achievementsUnlocked ?? [];
  return { unlocked: u.length, total: ACHIEVEMENTS.length };
}

/** Lines for journal UI. */
export function listAchievementsForUi(save: SaveData): {
  id: string;
  title: string;
  blurb: string;
  unlocked: boolean;
}[] {
  return ACHIEVEMENTS.map((a) => ({
    id: a.id,
    title: a.title,
    blurb: a.blurb,
    unlocked: isAchievementUnlocked(save, a.id),
  }));
}
