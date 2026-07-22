/**
 * Mobile / touch virtual pad state.
 * DOM dock sets flags; GameScene ORs them with keyboard.
 * Does NOT synthesize KeyboardEvents (Safari-hostile).
 *
 * iOS notes:
 * - Use Pointer Events only (no touchstart+pointerdown double-fire).
 * - setPointerCapture so hold survives finger drift off the button.
 * - touch-action:none + preventDefault on pad root blocks rubber-band scroll.
 */

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

export function isTouchUiPreferred(): boolean {
  if (typeof window === 'undefined') return false;
  // Coarse pointer or no hover ≈ phone/tablet
  const coarse =
    window.matchMedia('(pointer: coarse)').matches ||
    window.matchMedia('(hover: none)').matches;
  const narrow = window.matchMedia('(max-width: 900px)').matches;
  const touchPoints =
    typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
  return coarse || (narrow && touchPoints);
}

/** Nudge Phaser Scale.FIT after DOM layout changes (pad dock / chrome). */
function refreshGameScale(): void {
  if (typeof window === 'undefined') return;
  requestAnimationFrame(() => {
    window.dispatchEvent(new Event('resize'));
  });
}

export function setTouchPadVisible(visible: boolean): void {
  padVisible = visible;
  const el = document.getElementById('touch-pad');
  if (!el) return;
  const show = visible && isTouchUiPreferred();
  el.hidden = !show;
  el.setAttribute('aria-hidden', show ? 'false' : 'true');
  document.body.classList.toggle('touch-play', show);
  if (show) {
    // iOS: reduce accidental page pan while pad is up
    document.documentElement.classList.add('touch-play-root');
  } else {
    document.documentElement.classList.remove('touch-play-root');
  }
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
    // Primary contact only (ignore multi-finger noise on same button)
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
    // brief visual; release next frame
    window.setTimeout(() => el.classList.remove('is-down'), 120);
  });
}

/**
 * Wire #touch-pad buttons. Safe to call once from main.
 */
export function initTouchPad(): void {
  if (bound || typeof document === 'undefined') return;
  const root = document.getElementById('touch-pad');
  if (!root) return;
  bound = true;

  // Block iOS scroll/callout on the dock without driving game input
  // (input is pointer-only above).
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
      // Re-evaluate coarse/narrow; keep pad state consistent
      const el = document.getElementById('touch-pad');
      if (!el) return;
      const show = isTouchUiPreferred();
      el.hidden = !show;
      el.setAttribute('aria-hidden', show ? 'false' : 'true');
      document.body.classList.toggle('touch-play', show);
      document.documentElement.classList.toggle('touch-play-root', show);
    }
  });

  // orientationchange: iOS often needs an extra layout tick
  window.addEventListener('orientationchange', () => {
    window.setTimeout(() => {
      if (padVisible) setTouchPadVisible(true);
      refreshGameScale();
    }, 120);
  });

  // iOS Safari address-bar show/hide changes visual viewport without window resize
  window.visualViewport?.addEventListener('resize', () => {
    if (padVisible) refreshGameScale();
  });

  // Start hidden until a play scene asks for it
  setTouchPadVisible(false);
}
