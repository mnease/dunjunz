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

function appearanceFromEquipped(
  save: SaveData,
  equipped: SaveData['equipped'],
  opts?: { allowKey?: boolean },
): AppearanceSpec {
  const breastplate = mapBreast(lookFromUid(save, equipped.breastplate));
  const helmet = mapHelmet(lookFromUid(save, equipped.helmet));
  const greaves = mapGreaves(lookFromUid(save, equipped.greaves));
  const shoes = mapShoes(lookFromUid(save, equipped.shoes));
  const gloves = mapGloves(lookFromUid(save, equipped.gloves));

  const amulet = mapAmulet(lookFromUid(save, equipped.amulet));
  const ring = mapRing(lookFromUid(save, equipped.ring));

  const wUid = equipped.weapon;
  const weapon =
    wUid && findInBag(save, wUid)
      ? mapWeapon(lookFromUid(save, wUid))
      : 'none';

  const sUid = equipped.shield;
  const shield =
    sUid && findInBag(save, sUid)
      ? mapShield(lookFromUid(save, sUid))
      : 'none';

  const allowKey = opts?.allowKey !== false;
  const kUid = equipped.key;
  const key: KeyLook =
    allowKey && kUid && findInBag(save, kUid) ? 'key' : 'none';

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

export function appearanceFromSave(save: SaveData): AppearanceSpec {
  return appearanceFromEquipped(save, save.equipped, { allowKey: true });
}

/** Best Bud loadout from shared bag / budEquipped (no keyring). */
export function budAppearanceFromSave(save: SaveData): AppearanceSpec {
  const equipped = save.budEquipped ?? {
    weapon: null,
    shield: null,
    breastplate: null,
    helmet: null,
    greaves: null,
    shoes: null,
    gloves: null,
    amulet: null,
    ring: null,
    key: null,
  };
  return appearanceFromEquipped(save, equipped, { allowKey: false });
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

/** Pose names that share canvas frames with gear overlays. */
export type BuddyPoseName =
  | 'idle'
  | 'chase'
  | 'stretch'
  | 'grab'
  | 'strike'
  | 'spit'
  | 'blink'
  | 'guard'
  | 'heal';

/** Stable texture key for buddy pose + gear loadout. */
export function buddyTextureKey(
  spec: AppearanceSpec,
  pose: BuddyPoseName = 'idle',
): string {
  const poseTag =
    pose === 'idle' || pose === 'chase' ? 'idle' : pose;
  return [
    'bud',
    poseTag,
    spec.breastplate,
    spec.helmet,
    spec.greaves,
    spec.shoes,
    spec.gloves,
    spec.amulet,
    spec.ring,
    spec.weapon,
    spec.shield,
  ].join('_');
}

export function buddyTextureKeyFromSave(
  save: SaveData,
  pose: BuddyPoseName = 'idle',
): string {
  return buddyTextureKey(budAppearanceFromSave(save), pose);
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
