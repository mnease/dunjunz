/**
 * Layered player appearance from equipped gear (v4).
 */

import type { SaveData } from '../types';
import { findInBag, getTemplate } from './items';

export type BreastLook = 'none' | 'leather' | 'reinforced';
export type HelmetLook = 'none' | 'leather';
export type AmuletLook = 'none' | 'gold' | 'bauble';

export interface AppearanceSpec {
  breastplate: BreastLook;
  helmet: HelmetLook;
  amulet: AmuletLook;
  weapon: boolean;
  shield: boolean;
  key: boolean;
}

function lookFromUid(
  save: SaveData,
  uid: string | null,
): string | undefined {
  if (!uid) return undefined;
  const inst = findInBag(save, uid);
  if (!inst) return undefined;
  return getTemplate(inst.templateId).look;
}

export function appearanceFromSave(save: SaveData): AppearanceSpec {
  const bodyLook = lookFromUid(save, save.equipped.breastplate);
  const breastplate: BreastLook =
    bodyLook === 'reinforced'
      ? 'reinforced'
      : bodyLook === 'leather'
        ? 'leather'
        : 'none';

  const helmLook = lookFromUid(save, save.equipped.helmet);
  const helmet: HelmetLook = helmLook === 'leather' ? 'leather' : 'none';

  const amLook = lookFromUid(save, save.equipped.amulet);
  const amulet: AmuletLook =
    amLook === 'bauble' ? 'bauble' : amLook === 'gold' ? 'gold' : 'none';

  return {
    breastplate,
    helmet,
    amulet,
    weapon: !!save.equipped.weapon && !!findInBag(save, save.equipped.weapon),
    shield: !!save.equipped.shield && !!findInBag(save, save.equipped.shield),
    key: !!save.equipped.key && !!findInBag(save, save.equipped.key),
  };
}

export function playerTextureKey(spec: AppearanceSpec): string {
  return `player_${spec.breastplate}_${spec.helmet}_${spec.amulet}_${spec.weapon ? 'w' : 'n'}_${spec.shield ? 's' : 'n'}_${spec.key ? 'k' : 'n'}`;
}

export function playerTextureKeyFromSave(save: SaveData): string {
  return playerTextureKey(appearanceFromSave(save));
}

export function itemIconKey(itemId: string | null | undefined): string {
  if (!itemId) return 'icon_empty';
  // if uid-like, callers should pass templateId
  return `icon_${itemId}`;
}

export const BREAST_LOOKS: BreastLook[] = ['none', 'leather', 'reinforced'];
export const HELMET_LOOKS: HelmetLook[] = ['none', 'leather'];
export const AMULET_LOOKS: AmuletLook[] = ['none', 'gold', 'bauble'];
