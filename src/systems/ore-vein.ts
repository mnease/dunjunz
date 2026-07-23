/**
 * Harvestable mineral deposits in Dwarvez mines / halls.
 * Pure helpers; GameScene wires E-talk.
 */

import type { SaveData } from '../types';

export type MineralId =
  | 'bronze'
  | 'gold'
  | 'silver'
  | 'diamond'
  | 'ruby'
  | 'emerald'
  | 'mithril';

export const ORE_VEIN_PREFIX = 'ore-vein-';

/** Stack ids granted per mineral (new + existing). */
export const MINERAL_STACK: Record<MineralId, string> = {
  bronze: 'ore_bronze',
  gold: 'ore_gold',
  silver: 'ore_silver',
  diamond: 'gem_diamond',
  ruby: 'gem_ruby',
  emerald: 'gem_emerald',
  mithril: 'ore_mithril',
};

export const MINERAL_LABEL: Record<MineralId, string> = {
  bronze: 'BRONZE',
  gold: 'GOLD',
  silver: 'SILVER',
  diamond: 'DIAMOND',
  ruby: 'RUBY',
  emerald: 'EMERALD',
  mithril: 'MITHRIL',
};

export function isOreVeinId(id: string | undefined): boolean {
  return !!id && id.startsWith(ORE_VEIN_PREFIX);
}

/** Parse mineral from entity id: ore-vein-gold-1 → gold */
export function mineralFromVeinId(id: string): MineralId | null {
  if (!isOreVeinId(id)) return null;
  const rest = id.slice(ORE_VEIN_PREFIX.length); // gold-1
  const name = rest.split('-')[0] ?? '';
  if (name in MINERAL_STACK) return name as MineralId;
  return null;
}

export function oreVeinDialog(mineral: MineralId): string[] {
  const label = MINERAL_LABEL[mineral];
  return [
    `A ${label} VEIN GLINTS IN THE STONE.`,
    'E: CHIP A SAMPLE. (ONCE PER VEIN.)',
  ];
}

export type HarvestVeinResult = {
  save: SaveData;
  dialog: string[];
  toast?: string;
  harvested: boolean;
};

/** One-shot harvest → stack + collected id. */
export function harvestOreVein(
  save: SaveData,
  veinId: string,
): HarvestVeinResult {
  const mineral = mineralFromVeinId(veinId);
  if (!mineral) {
    return {
      save,
      dialog: ['JUST ROCK. DISAPPOINTING ROCK.'],
      harvested: false,
    };
  }
  if (save.collected.includes(veinId)) {
    return {
      save,
      dialog: [
        `THE ${MINERAL_LABEL[mineral]} VEIN IS SPENT.`,
        'SOME OTHER CRAWLER GOT HERE FIRST. PROBABLY YOU.',
      ],
      harvested: false,
    };
  }
  const stackId = MINERAL_STACK[mineral];
  const stacks = { ...save.stacks };
  stacks[stackId] = (stacks[stackId] ?? 0) + 1;
  // Gems also count as gem_rough for craft flexibility
  if (stackId.startsWith('gem_') && stackId !== 'gem_rough') {
    stacks.gem_rough = (stacks.gem_rough ?? 0) + 1;
  }
  const next: SaveData = {
    ...save,
    stacks,
    collected: [...save.collected, veinId],
  };
  return {
    save: next,
    dialog: [
      `YOU CHIP ${MINERAL_LABEL[mineral]} FROM THE WALL.`,
      `+1 ${stackId.toUpperCase().replace(/_/g, ' ')}.`,
      'THE UNDER-KING WOULD APPROVE. OR CHARGE TAX.',
    ],
    toast: `+1 ${MINERAL_LABEL[mineral]}`,
    harvested: true,
  };
}

/** Texture key for a mineral vein sprite. */
export function oreVeinTextureKey(mineral: MineralId): string {
  return `ore_vein_${mineral}`;
}
