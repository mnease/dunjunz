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
  | 'key'
  | 'heart'
  | 'sword'
  | 'sign'
  | 'chest';

export interface EntityDef {
  kind: EntityKind;
  x: number;
  y: number;
  id?: string;
  dialog?: string[];
  hp?: number;
  loot?: 'key' | 'heart' | 'none';
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

export interface SaveData {
  version: 1;
  roomId: string;
  hp: number;
  maxHp: number;
  hasSword: boolean;
  hasKey: boolean;
  bossDefeated: boolean;
  flags: Record<string, boolean>;
  killed: string[];
  collected: string[];
}
