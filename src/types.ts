export type TileKind =
  | 'void'
  | 'floor'
  | 'wall'
  | 'grass'
  | 'dirt'
  | 'sand' // beach sand (walkable)
  /** Mountain snow pack (walkable) — Dwarvez approach. */
  | 'snow'
  | 'water'
  | 'door'
  | 'locked'
  | 'stairs'
  | 'stairs_up'
  | 'entrance'
  | 'lava'
  | 'pad'
  /** Royal carpet / dais floor (kingdom throne room). */
  | 'carpet';

export type EntityKind =
  | 'slime'
  | 'skeleton'
  | 'redshirt'
  | 'cube'
  | 'boss'
  /** Mid-tier warden — permanent kill, no land ceremony. */
  | 'miniboss'
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
  | 'hornet'
  /** Wall-mounted torch prop (decoration + ambient light ease). */
  | 'torch_wall'
  /** Training dummy (guild hall — hit with weapons, no contact damage). */
  | 'dummy'
  /** Weapon rack (guild hall — equip training gear). */
  | 'rack'
  /** Indoor furniture — solid scenery (guild hall living quarters). */
  | 'bookshelf'
  | 'chair'
  | 'table'
  /** Free-standing lamp — solid + warm light cookie. */
  | 'lamp'
  /** Mirror of Changing — combat mode select (live vs turn-based). */
  | 'mirror'
  /** Beach palm (coconut tree) — solid scenery. */
  | 'palm'
  /** Beach seaweed clumps — solid low prop. */
  | 'seaweed'
  /** Beach crab — non-combatant crawl NPC. */
  | 'crab'
  /** Pond koi — non-combatant swimmer (ponds only). */
  | 'koi'
  /** Loot crate drop — mid-room gift; E to open big reveal. */
  | 'loot_crate'
  /** Kingdom throne room — solid royal props. */
  | 'throne'
  | 'pillar'
  | 'banner'
  /** Smashable clutter — hit for coins / occasional potions. */
  | 'barrel'
  | 'crate'
  | 'vase'
  /** Moredorkz hostiles (Fellowship epic). */
  | 'goblin'
  | 'orc'
  /** Harvestable mineral deposit (Dwarvez caves). */
  | 'ore_vein';

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
  /**
   * Training Guild rack loaner — equip for drills only.
   * Stripped when leaving the hall; never permanent loot.
   */
  guildLoaner?: boolean;
}

/** Player-facing land ids (intentional misspellingz). */
export type LandId =
  | 'surface'
  | 'dunjunz'
  | 'woodz'
  | 'dezertz'
  | 'kingdomz'
  | 'sewerz'
  | 'dwarvez'
  | 'roarhimz'
  | 'moredorkz';

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
  /**
   * Optional display scale multiplier (1 = normal).
   * Big meadow trees use ~2.2–2.8.
   */
  scale?: number;
  /** Loot crate stack template id (crawler_starter_box / loot_box_*). */
  lootBoxId?: string;
}

/** Side chamber content role (P0 world grammar). */
export type RoomSideRole = 'combat' | 'vault' | 'quiet' | 'hazard';

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
  /**
   * Dark room: carried light is primary vision.
   * Default: true for floor ≤ -2 when unset.
   */
  dark?: boolean;
  /** Authored side role for P0 grammar / tests. */
  sideRole?: RoomSideRole;
}

/** Combat presentation (Mirror of Changing). */
export type CombatMode = 'live' | 'turn';

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
  /**
   * Global crawler ordinal assigned on beach wake ("CRAWLER 001").
   * Sequential across all players when cloud allocate succeeds.
   */
  crawlerId?: number;
  /**
   * Combat presentation mode (Mirror of Changing).
   * `live` = real-time Zelda-like crawl (default).
   * `turn` = classic turn-based battles (heroes left, enemies right).
   */
  combatMode?: CombatMode;
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
  /** Active champion quest id from Princess Prizella's board (null = none). */
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
  /**
   * Binary gender only — male | female. Never extend this union.
   * null/undefined = not chosen yet (blocks beach wake).
   */
  gender?: 'male' | 'female' | null;
  /** True after player picked male/female at start. */
  identityChosen?: boolean;
  /** Ancestry (random at start for visuals; stats after wizard ritual). */
  race?: RaceId;
  /** Frozen random roll from beach identity (lore / journal). */
  startingRace?: RaceId;
  /** Target race chosen at L25 (tome) — applied by wizard ritual. */
  pendingRaceId?: RaceId | null;
  /** True after wizard ritual (or legacy L25 instant pick). */
  raceChosen?: boolean;
  // ── lighting + temporary buffs ─────────────────────────
  /** Active carried light tier (null = none). */
  activeLight?: 'torch' | 'lantern' | 'flashlight' | null;
  /** Remaining fuel ms for activeLight. */
  lightFuelMs?: number;
  /**
   * Player-placed permanent wall torches (per room id).
   * Dark rooms only; unlimited per room. Does not burn fuel.
   */
  placedTorches?: Record<
    string,
    Array<{ id: string; x: number; y: number; dir: 0 | 1 | 2 | 3 }>
  >;
  /** Temporary ATK buff from scrolls/tomes. */
  buffAtk?: number;
  /** Temporary DEF buff from scrolls/tomes. */
  buffDef?: number;
  /** Remaining combat buff duration ms. */
  buffMs?: number;
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
  | 'tiefling'
  | 'construct';

/** Binary only — do not add other values. */
export type GenderId = 'male' | 'female';
