export type TileKind =
  | 'void'
  | 'floor'
  | 'wall'
  | 'grass'
  | 'dirt'
  | 'water'
  | 'door'
  | 'locked'
  | 'stairs'
  | 'stairs_up'
  | 'entrance'
  | 'lava'
  | 'pad';

export type EntityKind =
  | 'slime'
  | 'skeleton'
  | 'redshirt'
  | 'cube'
  | 'boss'
  | 'npc'
  | 'merchant'
  | 'key'
  | 'heart'
  | 'sword'
  | 'sign'
  | 'chest'
  | 'mapz'
  | 'forje'
  | 'princess'
  | 'cactus'
  | 'wolf'
  | 'best_bud'
  | 'portal'
  /** Woodz prop — solid scenery. */
  | 'tree'
  /** Dezertz prop — drifts; no damage. */
  | 'tumbleweed'
  /** Dezertz fauna. */
  | 'scorpion'
  | 'tarantula'
  | 'hornet';

/** Non-human best friend companion (randomized per playthrough). */
export type BestBudId =
  | 'gloop'
  | 'nub'
  | 'whisp'
  | 'tater'
  | 'zorp'
  | 'pebbo';

export type BestBudStage =
  | 'none'
  | 'offered'
  | 'accepted'
  | 'found'
  | 'complete';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type EquipSlot =
  | 'weapon'
  | 'shield'
  | 'helmet'
  | 'breastplate'
  | 'greaves'
  | 'shoes'
  | 'gloves'
  | 'amulet'
  | 'ring'
  | 'key';

export type AttrId = 'str' | 'dex' | 'vit' | 'int' | 'lck';

export interface Attributes {
  str: number;
  dex: number;
  vit: number;
  int: number;
  lck: number;
}

/** Unique gear / key instance in the bag. */
export interface ItemInstance {
  uid: string;
  templateId: string;
  rarity: Rarity;
  /** 0–3 flat enhancement on primary stat. */
  enhancement: number;
  /** Magical stat enhancers from forjing (e.g. +2 STR). */
  attrBonuses?: Partial<Attributes>;
}

/** Player-facing land ids (intentional misspellingz). */
export type LandId =
  | 'surface'
  | 'dunjunz'
  | 'woodz'
  | 'dezertz'
  | 'kingdomz'
  | 'sewerz';

export interface EquippedMap {
  weapon: string | null;
  shield: string | null;
  helmet: string | null;
  breastplate: string | null;
  greaves: string | null;
  shoes: string | null;
  gloves: string | null;
  amulet: string | null;
  ring: string | null;
  key: string | null;
}

export type LootKind = 'coins' | 'potion' | 'armor' | 'treasure' | 'weapon' | 'gear';

export interface EntityDef {
  kind: EntityKind;
  x: number;
  y: number;
  id?: string;
  dialog?: string[];
  hp?: number;
  loot?: 'key' | 'heart' | 'none';
  chestTable?: string;
  shopId?: string;
  /** Which mapz this pickup discovers. */
  mapzId?: LandId;
  /** Room id for portal entities (boss exit → dungeon mouth). */
  portalTarget?: string;
}

export interface RoomDef {
  id: string;
  title: string;
  tiles: string[];
  entities?: EntityDef[];
  /** Cardinal links — must match door openings on room edges. */
  north?: string;
  south?: string;
  east?: string;
  west?: string;
  /** Floor depth: 0 = surface, -1 = B1, -2 = B2, … */
  floor?: number;
  /** Map grid coords within this floor (for consistency / debugging). */
  mapX?: number;
  mapY?: number;
  /** Land for mapz grouping (surface / dunjunz / woodz / dezertz). */
  land?: LandId;
  /** Room reached by walking onto stairs-down tiles (S). */
  stairsDown?: string;
  /** Room reached by walking onto stairs-up tiles (U). */
  stairsUp?: string;
  onEnter?: string;
}

/**
 * Save v6 — hard mode, class/race identity (migrates from ≤5).
 */
export interface SaveData {
  version: 5 | 6;
  roomId: string;
  hp: number;
  maxHp: number;
  /** Derived: weapon equipped. */
  hasSword: boolean;
  /** Derived: key equipped. */
  hasKey: boolean;
  bossDefeated: boolean;
  flags: Record<string, boolean>;
  killed: string[];
  collected: string[];
  xp: number;
  level: number;
  coins: number;
  /** Stackable consumables + forjing materials. */
  stacks: Record<string, number>;
  /** Unique gear + key instances. */
  bag: ItemInstance[];
  nextItemUid: number;
  equipped: EquippedMap;
  attrs: Attributes;
  /**
   * Unspent level-up packages. Each package: +2 to one chosen stat, then +1 to another.
   * No hard cap on level or on how high a stat can go.
   */
  attrPoints: number;
  /**
   * Mid-package: major (+2) already applied; next 1–5 pick is minor (+1) on a different stat.
   */
  pendingAttrMajor?: AttrId | null;
  /** Derived total DEF. */
  armor: number;
  /** Mapz the player has found (enables mapz view for that land). */
  discoveredMapz: LandId[];
  /** Rooms visited (for mapz fog of war). */
  visitedRooms: string[];
  /** Quest: Princess Prizella saved. */
  princessSaved: boolean;
  /** Land bosses cleared (dunjunz, woodz, dezertz). */
  landsCleared: LandId[];
  /** Stable per-playthrough seed (best bud roll, etc.). */
  runSeed: number;
  /** Rolled once on Best Bud quest accept; null until then. */
  bestBudId: BestBudId | null;
  /** Best Bud champion quest stage. */
  bestBudStage: BestBudStage;
  /** Buddy XP (same curve as hero). */
  budXp: number;
  /** Buddy level (derived from budXp; stored for HUD). */
  budLevel: number;
  /** Gear worn by the Best Bud (uids from shared bag). */
  budEquipped: EquippedMap;
  /** Active champion quest id from Prizella's board (null = none). */
  activeQuestId: string | null;
  /** Completed champion quest ids (beyond main rescue / best bud). */
  questsCompleted: string[];
  /** Unlocked brag (achievement) ids. */
  achievementsUnlocked: string[];
  // ── v6: hard mode + identity ─────────────────────────────
  /** Land currently being replayed on hard (null = normal). */
  hardRunLand?: LandId | null;
  /** Entity ids killed during the active hard run (rooms re-fill each run). */
  hardKilled?: string[];
  /** Lands whose hard boss / hard clear has been completed. */
  hardLandsCleared?: LandId[];
  /** Primary class (chosen at L5). */
  primaryClass?: ClassId | null;
  /** Secondary multiclass (chosen at L15). */
  secondaryClass?: ClassId | null;
  /** Ancestry (default human; choosable at L25). */
  race?: RaceId;
  /** True after the L25 race pick is spent. */
  raceChosen?: boolean;
}

/** Re-export identity ids for SaveData (defined in systems to avoid cycles). */
export type ClassId =
  | 'fighter'
  | 'wizard'
  | 'rogue'
  | 'cleric'
  | 'ranger'
  | 'barbarian'
  | 'paladin'
  | 'bard'
  | 'monk'
  | 'warlock'
  | 'sorcerer'
  | 'druid';

export type RaceId =
  | 'human'
  | 'elf'
  | 'dwarf'
  | 'halfling'
  | 'half_orc'
  | 'half_elf'
  | 'gnome'
  | 'dragonborn'
  | 'tiefling';
