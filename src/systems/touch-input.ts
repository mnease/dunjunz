/**
 * Mobile / touch virtual pad state.
 * DOM dock sets flags; GameScene ORs them with keyboard.
 * Does NOT synthesize KeyboardEvents (Safari-hostile).
 *
 * Mobile mode (forced pad):
 * - Settings → "Mobile mode (on-screen controls)"
 * - URL: /play?mobile=1  (or ?touch=1 / ?pad=1); ?mobile=0 forces off
 * - Topbar MOBILE toggle on the play shell
 *
 * Auto-detect still runs when mobile mode is off.
 */

import { loadSettings, patchSettings } from './settings';

export type TouchAxis = 'up' | 'down' | 'left' | 'right';
export type TouchAction =
  | 'attack'
  | 'interact'
  | 'inventory'
  | 'map'
  | 'use'
  | 'menu';

const held: Record<TouchAxis, boolean> = {
  up: false,
  down: false,
  left: false,
  right: false,
};

/** Rising-edge pulses consumed once by game update. */
const edge: Record<TouchAction, boolean> = {
  attack: false,
  interact: false,
  inventory: false,
  map: false,
  use: false,
  menu: false,
};

let padVisible = false;
let bound = false;

/**
 * Session URL override: true/false from query, null if absent.
 * Pure — pass search string for tests.
 */
export function parseMobileQuery(
  search: string,
): boolean | null {
  try {
    const q = new URLSearchParams(
      search.startsWith('?') ? search.slice(1) : search,
    );
    const raw = q.get('mobile') ?? q.get('touch') ?? q.get('pad');
    if (raw == null || raw === '') return null;
    const v = raw.toLowerCase();
    if (v === '1' || v === 'true' || v === 'on' || v === 'yes') return true;
    if (v === '0' || v === 'false' || v === 'off' || v === 'no') return false;
    return null;
  } catch {
    return null;
  }
}

/** Whether pad + touch-play chrome should be used. */
export function isTouchUiPreferred(): boolean {
  if (typeof window === 'undefined') return false;

  // Explicit setting always wins when on
  if (loadSettings().mobileMode) return true;

  // URL session force (also written into settings on init)
  const q = parseMobileQuery(window.location.search);
  if (q === true) return true;
  if (q === false) return false;

  // Auto-detect phone / tablet
  const coarse =
    window.matchMedia('(pointer: coarse)').matches ||
    window.matchMedia('(hover: none)').matches;
  const narrow = window.matchMedia('(max-width: 900px)').matches;
  const touchPoints =
    typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  const mobileUa = /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry/i.test(ua);
  return coarse || mobileUa || (narrow && touchPoints);
}

/** True when user explicitly enabled mobile mode (settings or ?mobile=1). */
export function isMobileModeEnabled(): boolean {
  return !!loadSettings().mobileMode;
}

export function setMobileMode(on: boolean): void {
  patchSettings({ mobileMode: !!on });
  // Refresh pad chrome if a play scene already asked for the pad
  if (padVisible) {
    setTouchPadVisible(true);
  } else {
    // Still update body class if they toggle on title (prep layout)
    document.body.classList.toggle('touch-play', false);
    document.documentElement.classList.remove('touch-play-root');
    syncMobileToggleUi();
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('dunjunz-mobile-mode', { detail: { on: !!on } }),
    );
  }
  syncMobileToggleUi();
}

export function toggleMobileMode(): boolean {
  const next = !isMobileModeEnabled();
  setMobileMode(next);
  return next;
}

function syncMobileToggleUi(): void {
  if (typeof document === 'undefined') return;
  const btn = document.getElementById('mobile-mode-toggle');
  if (!(btn instanceof HTMLElement)) return;
  const on = isMobileModeEnabled() || isTouchUiPreferred();
  btn.classList.toggle('is-active', isMobileModeEnabled());
  btn.setAttribute('aria-pressed', isMobileModeEnabled() ? 'true' : 'false');
  btn.textContent = isMobileModeEnabled() ? 'MOBILE ON' : 'MOBILE';
  // Hint auto-detect separately
  if (!isMobileModeEnabled() && isTouchUiPreferred()) {
    btn.title = 'Touch controls auto-on for this device. Click to force mobile mode.';
  } else if (isMobileModeEnabled()) {
    btn.title = 'Mobile mode ON — on-screen pad while playing. Click to turn off.';
  } else {
    btn.title = 'Turn on mobile mode (on-screen D-pad + buttons). Also: /play?mobile=1';
  }
  void on;
}

export function touchAxisDown(axis: TouchAxis): boolean {
  return held[axis];
}

export function touchAnyMove(): boolean {
  return held.up || held.down || held.left || held.right;
}

/** Consume a one-shot action (like JustDown). */
export function consumeTouchAction(action: TouchAction): boolean {
  if (!edge[action]) return false;
  edge[action] = false;
  return true;
}

export function setTouchAxis(axis: TouchAxis, down: boolean): void {
  held[axis] = down;
}

export function pulseTouchAction(action: TouchAction): void {
  edge[action] = true;
}

export function clearAllTouch(): void {
  held.up = held.down = held.left = held.right = false;
  for (const k of Object.keys(edge) as TouchAction[]) edge[k] = false;
}

/** Nudge Phaser Scale.FIT after DOM layout changes (pad dock / chrome). */
function refreshGameScale(): void {
  if (typeof window === 'undefined') return;
  requestAnimationFrame(() => {
    window.dispatchEvent(new Event('resize'));
  });
}

/**
 * Show/hide the pad. When `visible` is true, pad shows if mobile mode OR auto-detect.
 * Forced mobileMode always shows the pad when a scene requests it.
 */
export function setTouchPadVisible(visible: boolean): void {
  padVisible = visible;
  const el = document.getElementById('touch-pad');
  if (!el) return;
  const show = visible && isTouchUiPreferred();
  el.hidden = !show;
  el.setAttribute('aria-hidden', show ? 'false' : 'true');
  document.body.classList.toggle('touch-play', show);
  if (show) {
    document.documentElement.classList.add('touch-play-root');
  } else {
    document.documentElement.classList.remove('touch-play-root');
  }
  syncMobileToggleUi();
  refreshGameScale();
}

export function isTouchPadVisible(): boolean {
  return padVisible && isTouchUiPreferred();
}

/**
 * Hold button: pointer-only + capture.
 * Do not also bind touch* — iOS would fire both and double-set state.
 */
function bindHold(
  el: HTMLElement,
  onDown: () => void,
  onUp: () => void,
): void {
  let activeId: number | null = null;

  const down = (e: PointerEvent) => {
    if (activeId !== null) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    e.stopPropagation();
    activeId = e.pointerId;
    el.classList.add('is-down');
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* older browsers */
    }
    onDown();
  };

  const up = (e: PointerEvent) => {
    if (activeId === null || e.pointerId !== activeId) return;
    e.preventDefault();
    activeId = null;
    el.classList.remove('is-down');
    try {
      if (el.hasPointerCapture?.(e.pointerId)) {
        el.releasePointerCapture(e.pointerId);
      }
    } catch {
      /* ignore */
    }
    onUp();
  };

  el.addEventListener('pointerdown', down);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('lostpointercapture', (e) => {
    if (activeId === null || e.pointerId !== activeId) return;
    activeId = null;
    el.classList.remove('is-down');
    onUp();
  });
}

/** One-shot action on pointerdown only (no touchstart twin). */
function bindTap(el: HTMLElement, action: TouchAction): void {
  el.addEventListener('pointerdown', (e: PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    e.stopPropagation();
    el.classList.add('is-down');
    pulseTouchAction(action);
    window.setTimeout(() => el.classList.remove('is-down'), 120);
  });
}

/** Apply ?mobile=1 / ?mobile=0 into settings once per page load. */
export function applyMobileQueryToSettings(
  search: string = typeof window !== 'undefined' ? window.location.search : '',
): boolean | null {
  const parsed = parseMobileQuery(search);
  if (parsed === null) return null;
  patchSettings({ mobileMode: parsed });
  return parsed;
}

/**
 * Wire #touch-pad buttons + MOBILE toggle. Safe to call once from main.
 */
export function initTouchPad(): void {
  if (bound || typeof document === 'undefined') return;
  const root = document.getElementById('touch-pad');
  if (!root) return;
  bound = true;

  // Honor URL before first paint of pad preference
  applyMobileQueryToSettings();

  // Block iOS scroll/callout on the dock without driving game input
  root.addEventListener(
    'touchstart',
    (e) => {
      if ((e.target as Element | null)?.closest?.('.touch-btn')) {
        e.preventDefault();
      }
    },
    { passive: false },
  );
  root.addEventListener(
    'touchmove',
    (e) => {
      e.preventDefault();
    },
    { passive: false },
  );

  const map: [string, TouchAxis][] = [
    ['touch-up', 'up'],
    ['touch-down', 'down'],
    ['touch-left', 'left'],
    ['touch-right', 'right'],
  ];
  for (const [id, axis] of map) {
    const el = document.getElementById(id);
    if (!(el instanceof HTMLElement)) continue;
    bindHold(
      el,
      () => setTouchAxis(axis, true),
      () => setTouchAxis(axis, false),
    );
  }

  const taps: [string, TouchAction][] = [
    ['touch-attack', 'attack'],
    ['touch-talk', 'interact'],
    ['touch-inv', 'inventory'],
    ['touch-map', 'map'],
    ['touch-use', 'use'],
    ['touch-menu', 'menu'],
  ];
  for (const [id, action] of taps) {
    const el = document.getElementById(id);
    if (el instanceof HTMLElement) bindTap(el, action);
  }

  // Topbar MOBILE toggle
  const toggle = document.getElementById('mobile-mode-toggle');
  if (toggle instanceof HTMLElement) {
    toggle.addEventListener('click', () => {
      const on = toggleMobileMode();
      // If already in a crawl, re-show pad immediately
      if (padVisible) setTouchPadVisible(true);
      toggle.textContent = on ? 'MOBILE ON' : 'MOBILE';
    });
  }
  syncMobileToggleUi();

  // Hide pad when shell modals open
  const modals = [
    'journal-modal',
    'settings-modal',
    'auth-modal',
    'feedback-modal',
    'hero-pick-modal',
  ];
  const syncModals = () => {
    const modalOpen = modals.some((id) => {
      const m = document.getElementById(id);
      return m && !m.hidden && m.classList.contains('open');
    });
    if (modalOpen) {
      clearAllTouch();
      const el = document.getElementById('touch-pad');
      if (el) {
        el.hidden = true;
        el.setAttribute('aria-hidden', 'true');
      }
      document.body.classList.remove('touch-play');
      document.documentElement.classList.remove('touch-play-root');
      refreshGameScale();
    } else if (padVisible) {
      setTouchPadVisible(true);
    }
  };
  const obs = new MutationObserver(syncModals);
  for (const id of modals) {
    const m = document.getElementById(id);
    if (m) obs.observe(m, { attributes: true, attributeFilter: ['class', 'hidden'] });
  }

  window.addEventListener('resize', () => {
    if (padVisible) {
      const el = document.getElementById('touch-pad');
      if (!el) return;
      const show = isTouchUiPreferred();
      el.hidden = !show;
      el.setAttribute('aria-hidden', show ? 'false' : 'true');
      document.body.classList.toggle('touch-play', show);
      document.documentElement.classList.toggle('touch-play-root', show);
      syncMobileToggleUi();
    }
  });

  window.addEventListener('orientationchange', () => {
    window.setTimeout(() => {
      if (padVisible) setTouchPadVisible(true);
      refreshGameScale();
    }, 120);
  });

  window.visualViewport?.addEventListener('resize', () => {
    if (padVisible) refreshGameScale();
  });

  window.addEventListener('dunjunz-mobile-mode', () => {
    if (padVisible) setTouchPadVisible(true);
    else syncMobileToggleUi();
  });

  // Start hidden until a play scene asks for it
  setTouchPadVisible(false);
}
