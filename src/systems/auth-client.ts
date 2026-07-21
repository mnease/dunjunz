/**
 * Client-side cloud identity (guest token + account session cookie).
 */

export const GUEST_TOKEN_KEY = 'dunjunz-guest-token';
export const ACTIVE_SLOT_KEY = 'dunjunz-active-slot';

export type CloudMode = 'guest' | 'account' | 'none';

export interface SlotSummary {
  id: string;
  slotIndex: number;
  name: string;
  level: number;
  roomId: string;
  land: string | null;
  isEmpty: boolean;
  saveVersion: number;
  updatedAt: string;
}

export interface AuthMe {
  ok: boolean;
  authenticated: boolean;
  mode?: CloudMode;
  email?: string;
  verified?: boolean;
  userId?: string;
  slots?: SlotSummary[];
  reason?: string;
}

function authHeaders(): HeadersInit {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const guest = localStorage.getItem(GUEST_TOKEN_KEY);
  if (guest) h.Authorization = `Bearer ${guest}`;
  return h;
}

export async function fetchMe(): Promise<AuthMe> {
  try {
    const res = await fetch('/api/auth/me', {
      credentials: 'include',
      headers: authHeaders(),
    });
    return (await res.json()) as AuthMe;
  } catch {
    return { ok: false, authenticated: false };
  }
}

export async function createGuest(email: string): Promise<{
  ok: boolean;
  error?: string;
  message?: string;
  guestToken?: string;
  slots?: SlotSummary[];
  email?: string;
}> {
  const res = await fetch('/api/auth/guest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = (await res.json()) as {
    ok: boolean;
    error?: string;
    message?: string;
    guestToken?: string;
    slots?: SlotSummary[];
    email?: string;
  };
  if (data.ok && data.guestToken) {
    localStorage.setItem(GUEST_TOKEN_KEY, data.guestToken);
  }
  return data;
}

export async function requestMagicLink(email: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const res = await fetch('/api/auth/magic-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return (await res.json()) as { ok: boolean; error?: string };
}

export async function logoutCloud(): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(),
    });
  } catch {
    /* ignore */
  }
  localStorage.removeItem(GUEST_TOKEN_KEY);
}

export async function listSlots(): Promise<SlotSummary[]> {
  const res = await fetch('/api/slots', {
    credentials: 'include',
    headers: authHeaders(),
  });
  const data = (await res.json()) as { ok?: boolean; slots?: SlotSummary[] };
  return data.slots ?? [];
}

export async function loadSlot(id: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`/api/slots/${id}`, {
    credentials: 'include',
    headers: authHeaders(),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    ok?: boolean;
    slot?: { data?: Record<string, unknown>; id?: string };
  };
  if (data.slot?.id) localStorage.setItem(ACTIVE_SLOT_KEY, data.slot.id);
  return data.slot?.data ?? null;
}

export async function saveSlot(
  id: string,
  saveData: unknown,
  name?: string,
): Promise<boolean> {
  const res = await fetch(`/api/slots/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: authHeaders(),
    body: JSON.stringify({ data: saveData, name }),
  });
  return res.ok;
}

export async function startSlot(
  slotIndex: number,
  name: string,
  data?: unknown,
): Promise<SlotSummary | null> {
  const res = await fetch('/api/slots', {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(),
    body: JSON.stringify({ slotIndex, name, data }),
  });
  const body = (await res.json()) as {
    ok?: boolean;
    slot?: SlotSummary;
  };
  if (body.slot?.id) localStorage.setItem(ACTIVE_SLOT_KEY, body.slot.id);
  return body.slot ?? null;
}

export async function deleteSlot(id: string): Promise<boolean> {
  const res = await fetch(`/api/slots/${id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: authHeaders(),
  });
  return res.ok;
}

export async function importLocalSave(
  data: unknown,
  slotIndex?: number,
  name?: string,
): Promise<SlotSummary | null> {
  const res = await fetch('/api/slots/import-local', {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(),
    body: JSON.stringify({ data, slotIndex, name }),
  });
  const body = (await res.json()) as { ok?: boolean; slot?: SlotSummary };
  if (body.slot?.id) localStorage.setItem(ACTIVE_SLOT_KEY, body.slot.id);
  return body.slot ?? null;
}

export function getActiveSlotId(): string | null {
  return localStorage.getItem(ACTIVE_SLOT_KEY);
}

export function setActiveSlotId(id: string | null): void {
  if (id) localStorage.setItem(ACTIVE_SLOT_KEY, id);
  else localStorage.removeItem(ACTIVE_SLOT_KEY);
}

export function hasGuestToken(): boolean {
  return !!localStorage.getItem(GUEST_TOKEN_KEY);
}
