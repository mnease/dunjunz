/**
 * Mobile / touch virtual pad state.
 * DOM overlay sets flags; GameScene ORs them with keyboard.
 * Does NOT synthesize KeyboardEvents (Safari-hostile).
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

export function setTouchPadVisible(visible: boolean): void {
  padVisible = visible;
  const el = document.getElementById('touch-pad');
  if (!el) return;
  const show = visible && isTouchUiPreferred();
  el.hidden = !show;
  el.setAttribute('aria-hidden', show ? 'false' : 'true');
  document.body.classList.toggle('touch-play', show);
}

export function isTouchPadVisible(): boolean {
  return padVisible && isTouchUiPreferred();
}

function bindHold(
  el: Element,
  onDown: () => void,
  onUp: () => void,
): void {
  const down = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    onDown();
  };
  const up = (e: Event) => {
    e.preventDefault();
    onUp();
  };
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointerleave', up);
  el.addEventListener('pointercancel', up);
  // Prevent iOS scroll/callout on pad
  el.addEventListener(
    'touchstart',
    (e) => {
      e.preventDefault();
      onDown();
    },
    { passive: false },
  );
  el.addEventListener(
    'touchend',
    (e) => {
      e.preventDefault();
      onUp();
    },
    { passive: false },
  );
}

function bindTap(el: Element, action: TouchAction): void {
  const fire = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    pulseTouchAction(action);
  };
  el.addEventListener('pointerdown', fire);
  el.addEventListener(
    'touchstart',
    (e) => {
      e.preventDefault();
      pulseTouchAction(action);
    },
    { passive: false },
  );
}

/**
 * Wire #touch-pad buttons. Safe to call once from main.
 */
export function initTouchPad(): void {
  if (bound || typeof document === 'undefined') return;
  const root = document.getElementById('touch-pad');
  if (!root) return;
  bound = true;

  const map: [string, TouchAxis][] = [
    ['touch-up', 'up'],
    ['touch-down', 'down'],
    ['touch-left', 'left'],
    ['touch-right', 'right'],
  ];
  for (const [id, axis] of map) {
    const el = document.getElementById(id);
    if (!el) continue;
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
    if (el) bindTap(el, action);
  }

  // Fullscreen (user gesture)
  document.getElementById('touch-fs')?.addEventListener('click', () => {
    const frame = document.getElementById('game-frame');
    if (!frame) return;
    if (!document.fullscreenElement) {
      void frame.requestFullscreen?.().catch(() => undefined);
    } else {
      void document.exitFullscreen?.().catch(() => undefined);
    }
  });

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
    if (padVisible) setTouchPadVisible(true);
  });

  // Start hidden until a play scene asks for it
  setTouchPadVisible(false);
}
