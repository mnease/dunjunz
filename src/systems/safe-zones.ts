/**
 * Safe-zone rules — pure helpers (no inventory cycle).
 * Tutorial Guild and future rest stops: no enemy damage; boxes open only here.
 */

import { ROOMS } from '../data/world';

export const GUILD_HALL_SAFE_ID = 'guild_hall';

/** Room is a safe zone (no enemy damage; boxes may open). */
export function isSafeRoom(roomId: string | undefined | null): boolean {
  if (!roomId) return false;
  if (roomId === GUILD_HALL_SAFE_ID) return true;
  const room = ROOMS[roomId];
  if (room?.safe === true) return true;
  return false;
}

/** Prefer this when RoomDef is available. */
export function isSafeRoomDef(room: {
  id?: string;
  safe?: boolean;
} | null | undefined): boolean {
  if (!room) return false;
  if (room.safe === true) return true;
  return isSafeRoom(room.id);
}

/**
 * Hard rule: loot boxes / world crates open only inside safe zones.
 */
export function canOpenLootBoxInRoom(
  roomId: string | undefined | null,
  roomSafe?: boolean,
): boolean {
  if (roomSafe === true) return true;
  return isSafeRoom(roomId);
}

export function boxOpenBlockedToast(): string {
  return 'BOXES ONLY OPEN IN SAFE ZONES — FIND A GUILD OR REST STOP';
}
