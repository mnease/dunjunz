/**
 * Player visual appearance keys from equipped gear.
 * Used by world avatar + inventory paper-doll.
 */

import type { SaveData } from '../types';

export type ArmorLook = 'none' | 'leather_armor' | 'reinforced_leather';
export type AmuletLook = 'none' | 'gold_trinket' | 'shiny_bauble';

export interface AppearanceSpec {
  armor: ArmorLook;
  amulet: AmuletLook;
  sword: boolean;
}

const ARMOR_LOOKS: ArmorLook[] = ['none', 'leather_armor', 'reinforced_leather'];
const AMULET_LOOKS: AmuletLook[] = ['none', 'gold_trinket', 'shiny_bauble'];

export function appearanceFromSave(save: SaveData): AppearanceSpec {
  const armor = (ARMOR_LOOKS.includes(save.equippedArmor as ArmorLook)
    ? save.equippedArmor
    : 'none') as ArmorLook;
  const amulet = (AMULET_LOOKS.includes(save.equippedAmulet as AmuletLook)
    ? save.equippedAmulet
    : 'none') as AmuletLook;
  // Sword on hip when any weapon is equipped
  const sword = !!(
    save.equippedWeapon && (save.inventory[save.equippedWeapon] ?? 0) > 0
  );
  return {
    armor,
    amulet,
    sword,
  };
}

/** Phaser texture key for a full player look. */
export function playerTextureKey(spec: AppearanceSpec): string {
  return `player_${spec.armor}_${spec.amulet}_${spec.sword ? 's' : 'n'}`;
}

export function playerTextureKeyFromSave(save: SaveData): string {
  return playerTextureKey(appearanceFromSave(save));
}

/** Item icon texture keys (24x24). */
export function itemIconKey(itemId: string | null | undefined): string {
  if (!itemId) return 'icon_empty';
  return `icon_${itemId}`;
}

export function allPlayerTextureKeys(): string[] {
  const keys: string[] = [];
  for (const armor of ARMOR_LOOKS) {
    for (const amulet of AMULET_LOOKS) {
      for (const sword of [false, true]) {
        keys.push(playerTextureKey({ armor, amulet, sword }));
      }
    }
  }
  return keys;
}

export { ARMOR_LOOKS, AMULET_LOOKS };
