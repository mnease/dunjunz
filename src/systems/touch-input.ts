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

/**
 * Contextual pad modes — labels remap so every desktop action has a thumb path.
 * explore: crawl · dialog: talk · panel: bag/shop/forje/mapz · pause: menu
 */
export type TouchPadMode = 'explore' | 'dialog' | 'panel' | 'pause';

const PAD_LABELS: Record<
  TouchPadMode,
  Record<'attack' | 'interact' | 'inventory' | 'map' | 'use' | 'menu', string>
> = {
  explore: {
    attack: 'ATK',
    interact: 'TALK',
    inventory: 'BAG',
    map: 'MAP',
    use: 'USE',
    menu: 'MENU',
  },
  dialog: {
    attack: 'NEXT',
    interact: 'NEXT',
    inventory: '···',
    map: '···',
    use: 'SKIP',
    menu: 'CLOSE',
  },
  panel: {
    attack: 'OK',
    interact: 'USE',
    inventory: 'BAG',
    map: 'PAGE+',
    use: 'PAGE-',
    menu: 'CLOSE',
  },
  pause: {
    attack: 'GO',
    interact: 'GO',
    inventory: '···',
    map: 'TITLE',
    use: 'TITLE',
    menu: 'GO',
  },
};

const ACTION_BTN_IDS: Record<
  'attack' | 'interact' | 'inventory' | 'map' | 'use' | 'menu',
  string
> = {
  attack: 'touch-attack',
  interact: 'touch-talk',
  inventory: 'touch-inv',
  map: 'touch-map',
  use: 'touch-use',
  menu: 'touch-menu',
};

let padMode: TouchPadMode = 'explore';
let fullscreenAttempted = false;

/** Virtual stick vector −1..1 (for tests / future analog speed). */
let stickX = 0;
let stickY = 0;

const held: Record<TouchAxis, boolean> = {
  up: false,
  down: false,
  left: false,
  right: false,
};

/** Dead zone before an axis counts as held (0–1 of stick radius). */
export const STICK_DEADZONE = 0.28;
/** Max knob travel in CSS px (matches .stick-base radius ~ half of 7rem). */
export const STICK_MAX_PX = 42;

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

/** Normalized stick (−1..1). Zero when released. */
export function touchStickVector(): { x: number; y: number } {
  return { x: stickX, y: stickY };
}

/**
 * Map stick nx,ny (−1..1) into digital held axes (8-way).
 * Pure helper for tests.
 */
export function axesFromStick(
  nx: number,
  ny: number,
  dead = STICK_DEADZONE,
): Record<TouchAxis, boolean> {
  return {
    left: nx < -dead,
    right: nx > dead,
    up: ny < -dead,
    down: ny > dead,
  };
}

function applyStickAxes(nx: number, ny: number): void {
  stickX = nx;
  stickY = ny;
  const a = axesFromStick(nx, ny);
  held.left = a.left;
  held.right = a.right;
  held.up = a.up;
  held.down = a.down;
}

function clearStick(): void {
  stickX = 0;
  stickY = 0;
  held.up = held.down = held.left = held.right = false;
  if (typeof document === 'undefined') return;
  const knob = document.getElementById('stick-knob');
  if (knob) knob.style.transform = 'translate(-50%, -50%)';
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
  clearStick();
  for (const k of Object.keys(edge) as TouchAction[]) edge[k] = false;
}

/** Prefer landscape for mobile / PWA (best-effort; needs gesture on many UAs). */
export async function tryLockLandscape(): Promise<boolean> {
  if (typeof screen === 'undefined') return false;
  try {
    const orient = screen.orientation as ScreenOrientation & {
      lock?: (o: string) => Promise<void>;
    };
    if (typeof orient?.lock === 'function') {
      // Prefer any landscape; some engines only accept primary
      try {
        await orient.lock('landscape');
      } catch {
        await orient.lock('landscape-primary');
      }
      return true;
    }
  } catch {
    /* denied or unsupported */
  }
  return false;
}

/** Show/hide portrait rotate gate while mobile play is active. */
export function syncLandscapeGate(): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  const hint = document.getElementById('rotate-hint');
  const showPad = padVisible && isTouchUiPreferred();
  const portrait = window.matchMedia('(orientation: portrait)').matches;
  const needRotate = showPad && portrait;
  document.body.classList.toggle('need-landscape', needRotate);
  if (hint) {
    hint.hidden = !needRotate;
    hint.setAttribute('aria-hidden', needRotate ? 'false' : 'true');
  }
  if (showPad && !portrait) {
    void tryLockLandscape();
  }
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
    setTouchPadMode(padMode);
    void tryLockLandscape();
  } else {
    document.documentElement.classList.remove('touch-play-root');
    document.body.classList.remove('mobile-immersive');
    document.body.classList.remove('need-landscape');
    const hint = document.getElementById('rotate-hint');
    if (hint) {
      hint.hidden = true;
      hint.setAttribute('aria-hidden', 'true');
    }
  }
  syncLandscapeGate();
  syncMobileToggleUi();
  refreshGameScale();
}

export function isTouchPadVisible(): boolean {
  return padVisible && isTouchUiPreferred();
}

export function getTouchPadMode(): TouchPadMode {
  return padMode;
}

/** Remap button labels + data-mode for explore/dialog/panel/pause. */
export function setTouchPadMode(mode: TouchPadMode): void {
  padMode = mode;
  if (typeof document === 'undefined') return;
  const root = document.getElementById('touch-pad');
  if (!root) return;
  root.dataset.mode = mode;
  document.body.dataset.padMode = mode;
  const labels = PAD_LABELS[mode];
  for (const [action, id] of Object.entries(ACTION_BTN_IDS) as [
    keyof typeof ACTION_BTN_IDS,
    string,
  ][]) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = labels[action];
      el.setAttribute('aria-label', `${labels[action]} (${mode})`);
    }
  }
  // Hide stick during dialog so thumbs don't fight the text box
  root.classList.toggle('pad-mode-dialog', mode === 'dialog');
  root.classList.toggle('pad-mode-panel', mode === 'panel');
  root.classList.toggle('pad-mode-pause', mode === 'pause');
  root.classList.toggle('pad-mode-explore', mode === 'explore');
  if (mode === 'dialog' || mode === 'pause') clearStick();
}

/**
 * Best-effort mobile fullscreen (Chrome/Android full; iOS Safari limited).
 * Call only from a user gesture (pad tap / MOBILE toggle).
 */
export async function requestMobileFullscreen(): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  fullscreenAttempted = true;
  const target =
    document.getElementById('game-stage') ??
    document.getElementById('shell') ??
    document.documentElement;
  try {
    const anyDoc = document as Document & {
      webkitFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => Promise<void> | void;
    };
    const anyEl = target as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
      webkitRequestFullScreen?: () => Promise<void> | void;
    };
    if (!document.fullscreenElement && !anyDoc.webkitFullscreenElement) {
      if (anyEl.requestFullscreen) {
        await anyEl.requestFullscreen();
      } else if (anyEl.webkitRequestFullscreen) {
        await anyEl.webkitRequestFullscreen();
      } else if (anyEl.webkitRequestFullScreen) {
        await anyEl.webkitRequestFullScreen();
      }
    }
  } catch {
    /* iOS often rejects — fall through to CSS immersion */
  }
  await tryLockLandscape();
  document.body.classList.add('mobile-immersive');
  // Nudge iOS chrome collapse
  window.scrollTo(0, 1);
  syncLandscapeGate();
  refreshGameScale();
  return !!(
    document.fullscreenElement ||
    (document as Document & { webkitFullscreenElement?: Element })
      .webkitFullscreenElement
  );
}

/**
 * Omni-directional virtual stick — drag from base center.
 * Maps continuous vector → digital 8-way axes for GameScene.
 */
function bindJoystick(cluster: HTMLElement): void {
  const base = cluster.querySelector('.stick-base') as HTMLElement | null;
  const knob = cluster.querySelector('.stick-knob') as HTMLElement | null;
  if (!base || !knob) return;

  let activeId: number | null = null;

  const placeKnob = (dx: number, dy: number) => {
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  };

  const fromEvent = (clientX: number, clientY: number) => {
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const len = Math.hypot(dx, dy);
    const maxR = Math.min(STICK_MAX_PX, rect.width * 0.38);
    if (len > maxR && len > 0) {
      dx = (dx / len) * maxR;
      dy = (dy / len) * maxR;
    }
    placeKnob(dx, dy);
    const nx = maxR > 0 ? dx / maxR : 0;
    const ny = maxR > 0 ? dy / maxR : 0;
    applyStickAxes(nx, ny);
  };

  const down = (e: PointerEvent) => {
    if (activeId !== null) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    e.stopPropagation();
    activeId = e.pointerId;
    cluster.classList.add('is-active');
    try {
      base.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (!fullscreenAttempted && isTouchUiPreferred()) {
      void requestMobileFullscreen();
    }
    fromEvent(e.clientX, e.clientY);
  };

  const move = (e: PointerEvent) => {
    if (activeId === null || e.pointerId !== activeId) return;
    e.preventDefault();
    fromEvent(e.clientX, e.clientY);
  };

  const up = (e: PointerEvent) => {
    if (activeId === null || e.pointerId !== activeId) return;
    e.preventDefault();
    activeId = null;
    cluster.classList.remove('is-active');
    try {
      if (base.hasPointerCapture?.(e.pointerId)) {
        base.releasePointerCapture(e.pointerId);
      }
    } catch {
      /* ignore */
    }
    clearStick();
  };

  base.addEventListener('pointerdown', down);
  base.addEventListener('pointermove', move);
  base.addEventListener('pointerup', up);
  base.addEventListener('pointercancel', up);
  base.addEventListener('lostpointercapture', (e) => {
    if (activeId === null || e.pointerId !== activeId) return;
    activeId = null;
    cluster.classList.remove('is-active');
    clearStick();
  });
}

/** Drain all pending action edges (after mode switch / dialog close). */
export function drainTouchActions(): void {
  for (const k of Object.keys(edge) as TouchAction[]) edge[k] = false;
}

/** One-shot action on pointerdown only (no touchstart twin). */
function bindTap(el: HTMLElement, action: TouchAction): void {
  el.addEventListener('pointerdown', (e: PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    e.stopPropagation();
    el.classList.add('is-down');
    // First combat/UI tap: try immersive fullscreen (user gesture)
    if (!fullscreenAttempted && isTouchUiPreferred()) {
      void requestMobileFullscreen();
    }
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

  const stick = document.getElementById('touch-stick');
  if (stick instanceof HTMLElement) bindJoystick(stick);

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
      if (on) void requestMobileFullscreen();
    });
  }
  syncMobileToggleUi();
  setTouchPadMode('explore');

  // Landscape lock + rotate gate
  const onOrient = () => {
    syncLandscapeGate();
    if (
      padVisible &&
      isTouchUiPreferred() &&
      window.matchMedia('(orientation: landscape)').matches
    ) {
      document.body.classList.add('mobile-immersive');
      void tryLockLandscape();
      refreshGameScale();
    }
  };
  window.matchMedia('(orientation: landscape)').addEventListener('change', onOrient);
  window.matchMedia('(orientation: portrait)').addEventListener('change', onOrient);
  window.addEventListener('orientationchange', () => {
    window.setTimeout(onOrient, 120);
  });
  syncLandscapeGate();

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
