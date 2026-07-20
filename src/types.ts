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
  | 'wolf';

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
export type LandId = 'surface' | 'dunjunz' | 'woodz' | 'dezertz';

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
 * Save v5 — multi-land quest, mapz, forjing.
 * loadSave migrates ≤4.
 */
export interface SaveData {
  version: 5;
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
  /** Unspent attribute points from level-ups. */
  attrPoints: number;
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
}
