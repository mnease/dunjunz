/**
 * Room-entry voice lines (same “??? A VOICE CUTS THROUGH…” style as beach wake).
 * First visit only; expand room table as more lands get scripted.
 */

import type { SaveData } from '../types';

export const FLAG_ROOM_VOICE_PREFIX = 'room_voice_';

export function roomVoiceFlag(roomId: string): string {
  return `${FLAG_ROOM_VOICE_PREFIX}${roomId}`;
}

export function hasHeardRoomVoice(save: SaveData, roomId: string): boolean {
  return !!save.flags?.[roomVoiceFlag(roomId)];
}

export function markRoomVoiceHeard(save: SaveData, roomId: string): SaveData {
  const f = roomVoiceFlag(roomId);
  if (save.flags?.[f]) return save;
  return {
    ...save,
    flags: { ...save.flags, [f]: true },
  };
}

/**
 * Dialog lines for first entry into a room, or null if none / already heard.
 * Lines use the beach-wake “voice cuts through” framing for continuity.
 */
export function roomEntryVoiceDialog(
  roomId: string,
  save: SaveData,
): string[] | null {
  if (hasHeardRoomVoice(save, roomId)) return null;

  if (roomId === 'guild_hall') {
    return [
      '',
      '??? A VOICE CUTS THROUGH THE HAZE:',
      '',
      'NEW ACHIEVEMENT: YOU’VE FOUND A TUTORIAL GUILD!',
      'PLEASE PROCEED TO THE CENTER OF THE GUILD',
      'WHERE YOU WILL FIND THE GUILD MASTER.',
    ];
  }

  return null;
}
