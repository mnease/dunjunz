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

/** Inventory item ids used by loot + shop. */
export type ItemId =
  | 'potion'
  | 'leather_armor'
  | 'gold_trinket'
  | 'shiny_bauble'
  | 'tinker_oil';

export type LootKind = 'coins' | 'potion' | 'armor' | 'treasure';

export interface EntityDef {
  kind: EntityKind;
  x: number;
  y: number;
  id?: string;
  dialog?: string[];
  hp?: number;
  loot?: 'key' | 'heart' | 'none';
  /** Chest loot table id (see systems/loot.ts). */
  chestTable?: string;
  /** Merchant stock id (see systems/shop.ts). */
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
 * Persistent player state. version 2 adds RPG fields; loadSave merges defaults
 * so older localStorage blobs still load.
 */
export interface SaveData {
  version: 2;
  roomId: string;
  hp: number;
  maxHp: number;
  hasSword: boolean;
  hasKey: boolean;
  bossDefeated: boolean;
  flags: Record<string, boolean>;
  killed: string[];
  collected: string[];
  /** Total experience points (never decreases). */
  xp: number;
  /** Derived primarily from xp; stored for HUD/fast load. */
  level: number;
  /** Spendable coin balance. */
  coins: number;
  /** itemId → count. */
  inventory: Record<string, number>;
  /** Flat damage reduction from armor gear. */
  armor: number;
}
