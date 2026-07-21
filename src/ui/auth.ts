/**
 * Shell account UI: guest (email + token) or magic-link account.
 */

import {
  createGuest,
  fetchMe,
  hasGuestToken,
  importLocalSave,
  logoutCloud,
  requestMagicLink,
  type AuthMe,
  type SlotSummary,
} from '../systems/auth-client';
import { setCloudSyncEnabled } from '../systems/cloud-save';
import { loadSave } from '../systems/save';

let lastMe: AuthMe | null = null;
let onAuthChange: ((me: AuthMe) => void) | null = null;

export function getLastAuthMe(): AuthMe | null {
  return lastMe;
}

export function setAuthChangeHandler(fn: (me: AuthMe) => void): void {
  onAuthChange = fn;
}

export async function refreshAuthUi(): Promise<AuthMe> {
  const me = await fetchMe();
  lastMe = me;
  const status = document.getElementById('auth-status');
  if (status) {
    if (me.authenticated) {
      status.textContent = me.verified
        ? `Signed in: ${me.email}`
        : `Guest: ${me.email}`;
      setCloudSyncEnabled(true);
    } else if (hasGuestToken()) {
      status.textContent = 'Guest session (reconnecting…)';
      setCloudSyncEnabled(true);
    } else {
      status.textContent = 'Playing as local guest (no cloud)';
      setCloudSyncEnabled(false);
    }
  }
  onAuthChange?.(me);
  return me;
}

export function initAuthUi(): void {
  const openBtn = document.getElementById('auth-open');
  const modal = document.getElementById('auth-modal');
  const closeBtns = document.querySelectorAll('[data-auth-close]');
  const guestForm = document.getElementById('auth-guest-form') as HTMLFormElement | null;
  const magicForm = document.getElementById('auth-magic-form') as HTMLFormElement | null;
  const logoutBtn = document.getElementById('auth-logout');
  const importBtn = document.getElementById('auth-import-local');
  const msg = document.getElementById('auth-msg');

  const setMsg = (t: string, kind: 'idle' | 'ok' | 'err' = 'idle') => {
    if (!msg) return;
    msg.textContent = t;
    msg.dataset.kind = kind;
  };

  const setOpen = (open: boolean) => {
    if (!modal) return;
    modal.classList.toggle('is-open', open);
    modal.setAttribute('aria-hidden', open ? 'false' : 'true');
  };

  openBtn?.addEventListener('click', () => {
    setMsg('');
    void refreshAuthUi();
    setOpen(true);
  });
  closeBtns.forEach((el) => el.addEventListener('click', () => setOpen(false)));
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) setOpen(false);
  });

  guestForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(guestForm);
    const email = String(fd.get('email') || '');
    setMsg('Creating guest…', 'idle');
    try {
      const r = await createGuest(email);
      if (!r.ok) {
        setMsg(r.message || r.error || 'Guest failed', 'err');
        return;
      }
      setMsg('Guest ready — pick a save slot on the title screen.', 'ok');
      await refreshAuthUi();
      window.setTimeout(() => setOpen(false), 1200);
    } catch {
      setMsg('Network error.', 'err');
    }
  });

  magicForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(magicForm);
    const email = String(fd.get('email') || '');
    setMsg('Sending magic link…', 'idle');
    try {
      const r = await requestMagicLink(email);
      if (!r.ok) {
        setMsg(r.error || 'Could not send link', 'err');
        return;
      }
      setMsg('Check your email for the sign-in link (15 min).', 'ok');
    } catch {
      setMsg('Network error.', 'err');
    }
  });

  logoutBtn?.addEventListener('click', async () => {
    await logoutCloud();
    setMsg('Signed out.', 'ok');
    await refreshAuthUi();
  });

  importBtn?.addEventListener('click', async () => {
    setMsg('Importing local save…', 'idle');
    try {
      const local = loadSave();
      const slot = await importLocalSave(local, undefined, 'Imported');
      if (!slot) {
        setMsg('Import failed (sign in as guest/account first).', 'err');
        return;
      }
      setMsg(`Imported into ${slot.name}.`, 'ok');
      await refreshAuthUi();
    } catch {
      setMsg('Import failed.', 'err');
    }
  });

  // Handle magic-link return
  const params = new URLSearchParams(window.location.search);
  const auth = params.get('auth');
  if (auth === 'ok') {
    setMsg('Signed in! Pick a cloud slot on the title screen.', 'ok');
    // Clean URL
    window.history.replaceState({}, '', window.location.pathname);
    void refreshAuthUi();
  } else if (auth === 'error') {
    setMsg(`Sign-in failed (${params.get('reason') || 'error'}).`, 'err');
    window.history.replaceState({}, '', window.location.pathname);
  } else {
    void refreshAuthUi();
  }
}

export type { SlotSummary };
