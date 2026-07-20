import { SAVE_KEY } from '../config';
import type { SaveData } from '../types';
import { START_ROOM } from '../data/world';

export function defaultSave(): SaveData {
  return {
    version: 1,
    roomId: START_ROOM,
    hp: 6,
    maxHp: 6,
    hasSword: false,
    hasKey: false,
    bossDefeated: false,
    flags: {},
    killed: [],
    collected: [],
  };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw) as SaveData;
    if (parsed.version !== 1) return defaultSave();
    return { ...defaultSave(), ...parsed };
  } catch {
    return defaultSave();
  }
}

export function writeSave(data: SaveData): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
}
