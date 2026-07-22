/**
 * Layered player appearance from equipped gear.
 * Each equip slot maps to a distinct look fragment so weapons, shields,
 * armor pieces, amulets, and rings all read uniquely on the avatar.
 */

import type { SaveData } from '../types';
import { findInBag, getTemplate } from './items';

export type BreastLook =
  | 'none'
  | 'leather'
  | 'reinforced'
  | 'cloth_arcane'
  | 'cloak_ranger'
  | 'plate'
  | 'holy'
  | 'hide';
export type HelmetLook = 'none' | 'leather' | 'cloth_arcane' | 'plate';
export type GreavesLook = 'none' | 'leather' | 'plate';
export type ShoesLook = 'none' | 'leather' | 'apology';
export type GlovesLook = 'none' | 'leather' | 'sheath';
export type AmuletLook = 'none' | 'gold' | 'bauble' | 'cube';
export type RingLook = 'none' | 'copper' | 'silver' | 'luck';
export type WeaponLook =
  | 'none'
  | 'sword'
  | 'iron'
  | 'saber'
  | 'cleaver'
  | 'honk'
  | 'phaser'
  | 'bow'
  | 'crossbow'
  | 'staff';
export type ShieldLook = 'none' | 'wood' | 'iron' | 'tower';
export type KeyLook = 'none' | 'key';

export interface AppearanceSpec {
  breastplate: BreastLook;
  helmet: HelmetLook;
  greaves: GreavesLook;
  shoes: ShoesLook;
  gloves: GlovesLook;
  amulet: AmuletLook;
  ring: RingLook;
  weapon: WeaponLook;
  shield: ShieldLook;
  key: KeyLook;
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

function mapWeapon(look: string | undefined): WeaponLook {
  switch (look) {
    case 'sword':
      return 'sword';
    case 'iron':
      return 'iron';
    case 'saber':
      return 'saber';
    case 'cleaver':
      return 'cleaver';
    case 'honk':
      return 'honk';
    case 'phaser':
      return 'phaser';
    case 'bow':
      return 'bow';
    case 'crossbow':
      return 'crossbow';
    case 'staff':
      return 'staff';
    default:
      return look ? 'sword' : 'none';
  }
}

function mapShield(look: string | undefined): ShieldLook {
  if (look === 'wood' || look === 'iron' || look === 'tower') return look;
  return look ? 'wood' : 'none';
}

function mapAmulet(look: string | undefined): AmuletLook {
  if (look === 'gold' || look === 'bauble' || look === 'cube') return look;
  return look ? 'gold' : 'none';
}

function mapRing(look: string | undefined): RingLook {
  if (look === 'copper' || look === 'silver' || look === 'luck') return look;
  return look ? 'copper' : 'none';
}

function mapShoes(look: string | undefined): ShoesLook {
  if (look === 'apology') return 'apology';
  if (look === 'leather') return 'leather';
  return look ? 'leather' : 'none';
}

function mapBreast(look: string | undefined): BreastLook {
  switch (look) {
    case 'reinforced':
    case 'leather':
    case 'cloth_arcane':
    case 'cloak_ranger':
    case 'plate':
    case 'holy':
    case 'hide':
      return look;
    default:
      return look ? 'leather' : 'none';
  }
}

function mapHelmet(look: string | undefined): HelmetLook {
  if (look === 'leather' || look === 'cloth_arcane' || look === 'plate') {
    return look;
  }
  return look ? 'leather' : 'none';
}

function mapGreaves(look: string | undefined): GreavesLook {
  if (look === 'leather' || look === 'plate') return look;
  return look ? 'leather' : 'none';
}

function mapGloves(look: string | undefined): GlovesLook {
  if (look === 'leather' || look === 'sheath') return look;
  return look ? 'leather' : 'none';
}

export function appearanceFromSave(save: SaveData): AppearanceSpec {
  const breastplate = mapBreast(lookFromUid(save, save.equipped.breastplate));
  const helmet = mapHelmet(lookFromUid(save, save.equipped.helmet));
  const greaves = mapGreaves(lookFromUid(save, save.equipped.greaves));
  const shoes = mapShoes(lookFromUid(save, save.equipped.shoes));
  const gloves = mapGloves(lookFromUid(save, save.equipped.gloves));

  const amulet = mapAmulet(lookFromUid(save, save.equipped.amulet));
  const ring = mapRing(lookFromUid(save, save.equipped.ring));

  const wUid = save.equipped.weapon;
  const weapon =
    wUid && findInBag(save, wUid)
      ? mapWeapon(lookFromUid(save, wUid))
      : 'none';

  const sUid = save.equipped.shield;
  const shield =
    sUid && findInBag(save, sUid)
      ? mapShield(lookFromUid(save, sUid))
      : 'none';

  const kUid = save.equipped.key;
  const key: KeyLook =
    kUid && findInBag(save, kUid) ? 'key' : 'none';

  return {
    breastplate,
    helmet,
    greaves,
    shoes,
    gloves,
    amulet,
    ring,
    weapon,
    shield,
    key,
  };
}

/** Stable texture key for a full gear loadout. */
export function playerTextureKey(spec: AppearanceSpec): string {
  return [
    'player',
    spec.breastplate,
    spec.helmet,
    spec.greaves,
    spec.shoes,
    spec.gloves,
    spec.amulet,
    spec.ring,
    spec.weapon,
    spec.shield,
    spec.key,
  ].join('_');
}

export function playerTextureKeyFromSave(save: SaveData): string {
  return playerTextureKey(appearanceFromSave(save));
}

export function itemIconKey(itemId: string | null | undefined): string {
  if (!itemId) return 'icon_empty';
  return `icon_${itemId}`;
}

/** Bare hero — used for default `player` texture + tests. */
export const BARE_APPEARANCE: AppearanceSpec = {
  breastplate: 'none',
  helmet: 'none',
  greaves: 'none',
  shoes: 'none',
  gloves: 'none',
  amulet: 'none',
  ring: 'none',
  weapon: 'none',
  shield: 'none',
  key: 'none',
};

export function withHiddenWeapon(spec: AppearanceSpec): AppearanceSpec {
  return { ...spec, weapon: 'none' };
}
