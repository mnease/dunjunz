/**
 * Debounced cloud slot sync when authed (guest or account).
 */

import type { SaveData } from '../types';
import {
  getActiveSlotId,
  hasGuestToken,
  saveSlot,
} from './auth-client';

let timer: ReturnType<typeof setTimeout> | null = null;
let pending: SaveData | null = null;
let cloudEnabled = false;

export function setCloudSyncEnabled(on: boolean): void {
  cloudEnabled = on;
}

export function isCloudSyncEnabled(): boolean {
  return cloudEnabled;
}

export function queueCloudSave(save: SaveData): void {
  if (!cloudEnabled) return;
  const slotId = getActiveSlotId();
  if (!slotId) return;
  // Need guest bearer or account cookie; if neither, skip
  if (!hasGuestToken() && document.cookie.indexOf('dunjunz_session') < 0) {
    // Account cookie is HttpOnly — still try PUT; 401 is fine
  }
  pending = save;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    void flushCloudSave();
  }, 2000);
}

export async function flushCloudSave(): Promise<void> {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  const save = pending;
  pending = null;
  if (!save || !cloudEnabled) return;
  const slotId = getActiveSlotId();
  if (!slotId) return;
  try {
    await saveSlot(slotId, save);
  } catch {
    /* offline ok */
  }
}
