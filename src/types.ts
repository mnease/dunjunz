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

/** Inventory item ids used by loot + shop + equip. */
export type ItemId =
  | 'potion'
  | 'mild_sword'
  | 'leather_armor'
  | 'reinforced_leather'
  | 'gold_trinket'
  | 'shiny_bauble'
  | 'tinker_oil';

export type EquipSlot = 'weapon' | 'armor' | 'amulet';

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
 * Persistent player state.
 * version 2: RPG fields. version 3: equip slots (still merge-loads v1/v2).
 */
export interface SaveData {
  version: 3;
  roomId: string;
  hp: number;
  maxHp: number;
  /**
   * Derived: true when a weapon is equipped (kept for HUD / old code paths).
   * Source of truth is equippedWeapon.
   */
  hasSword: boolean;
  hasKey: boolean;
  bossDefeated: boolean;
  flags: Record<string, boolean>;
  killed: string[];
  collected: string[];
  xp: number;
  level: number;
  coins: number;
  inventory: Record<string, number>;
  /**
   * Derived DEF used in combat (from equipped armor + amulet).
   * Recomputed by inventory.syncDerivedStats — do not treat as source of truth.
   */
  armor: number;
  /** Equipped weapon item id, or null. */
  equippedWeapon: string | null;
  /** Equipped armor piece item id, or null. */
  equippedArmor: string | null;
  /** Equipped amulet / trinket item id, or null. */
  equippedAmulet: string | null;
}
