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
  | 'chest';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type EquipSlot =
  | 'weapon'
  | 'helmet'
  | 'breastplate'
  | 'greaves'
  | 'shoes'
  | 'gloves'
  | 'amulet'
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
}

export interface EquippedMap {
  weapon: string | null;
  helmet: string | null;
  breastplate: string | null;
  greaves: string | null;
  shoes: string | null;
  gloves: string | null;
  amulet: string | null;
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
}

export interface RoomDef {
  id: string;
  title: string;
  tiles: string[];
  entities?: EntityDef[];
  north?: string;
  south?: string;
  east?: string;
  west?: string;
  onEnter?: string;
}

/**
 * Save v4 — multi-slot gear, stacks, attributes, formula XP.
 * loadSave migrates ≤3.
 */
export interface SaveData {
  version: 4;
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
  /** Stackable consumables. */
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
}
