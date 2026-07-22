/**
 * Global crawler ordinal ("CRAWLER 001") for beach wake-up.
 * Prefers server allocate; falls back to local sequential counter.
 */

import type { SaveData } from '../types';

const LOCAL_KEY = 'dunjunz-local-crawler-seq';

export function formatCrawlerId(n: number): string {
  const v = Math.max(1, Math.floor(n));
  return String(v).padStart(3, '0');
}

function allocateLocal(): number {
  try {
    const prev = Number(localStorage.getItem(LOCAL_KEY) ?? '0');
    const next = (Number.isFinite(prev) ? prev : 0) + 1;
    localStorage.setItem(LOCAL_KEY, String(next));
    return next;
  } catch {
    return 1 + (Date.now() % 900);
  }
}

/** Request next global crawler id from API (or local fallback). */
export async function allocateCrawlerId(): Promise<number> {
  try {
    const ctrl = new AbortController();
    const t = window.setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch('/api/crawler-spawn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
    });
    window.clearTimeout(t);
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      crawlerId?: number;
    };
    if (res.ok && data.ok && typeof data.crawlerId === 'number' && data.crawlerId >= 1) {
      return Math.floor(data.crawlerId);
    }
  } catch {
    /* offline / no DB / 500 / timeout — never block beach load */
  }
  return allocateLocal();
}

/** Ensure save has a crawlerId (async allocate if missing). */
export async function ensureCrawlerId(save: SaveData): Promise<SaveData> {
  if (typeof save.crawlerId === 'number' && save.crawlerId >= 1) {
    return save;
  }
  const crawlerId = await allocateCrawlerId();
  return { ...save, crawlerId };
}

export function beachWakeDialog(crawlerId: number): string[] {
  const tag = formatCrawlerId(crawlerId);
  return [
    '…',
    'WHA?…',
    'WHERE AM I?…',
    '',
    '??? A VOICE CUTS THROUGH THE HAZE:',
    '',
    `WELCOME, CRAWLER ${tag}.`,
    'PLEASE PROCEED NORTH',
    'TO FIND THE TUTORIAL GUILD.',
  ];
}

export const FLAG_BEACH_WAKE_SEEN = 'beach_wake_seen';

export function needsBeachWake(save: SaveData): boolean {
  return !save.flags?.[FLAG_BEACH_WAKE_SEEN];
}

export function markBeachWakeSeen(save: SaveData): SaveData {
  if (save.flags?.[FLAG_BEACH_WAKE_SEEN]) return save;
  return {
    ...save,
    flags: { ...save.flags, [FLAG_BEACH_WAKE_SEEN]: true },
  };
}
