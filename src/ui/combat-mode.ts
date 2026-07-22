/**
 * Mirror of Changing — combat mode picker modal.
 */

import { loadSave, writeSave } from '../systems/save';
import {
  COMBAT_MODES,
  combatModeLabel,
  getCombatMode,
  setCombatMode,
} from '../systems/combat-mode';
import type { CombatMode } from '../types';
import { playSfx } from '../systems/audio';

export function initCombatModeUi(): void {
  ensureModal();
  window.addEventListener('dunjunz-mirror-open', (() => {
    openMirror();
  }) as EventListener);
}

function ensureModal(): void {
  if (document.getElementById('mirror-mode-modal')) return;
  const el = document.createElement('div');
  el.id = 'mirror-mode-modal';
  el.className = 'feedback-modal';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'mirror-mode-title');
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `
    <div class="feedback-panel journal-panel">
      <header class="feedback-header">
        <h2 id="mirror-mode-title">Mirror of Changing</h2>
        <button type="button" class="feedback-x" data-mirror-close aria-label="Close">×</button>
      </header>
      <p class="feedback-blurb">
        Choose how battles feel. You can return here anytime from the Tutorial Guild.
      </p>
      <div id="mirror-mode-body" class="journal-body mirror-mode-list"></div>
      <div class="feedback-actions">
        <button type="button" class="btn btn-primary" id="mirror-mode-apply">Apply</button>
        <button type="button" class="btn" data-mirror-close>Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(el);

  el.querySelectorAll('[data-mirror-close]').forEach((btn) => {
    btn.addEventListener('click', () => setOpen(false));
  });
  el.addEventListener('click', (e) => {
    if (e.target === el) setOpen(false);
  });
  el.querySelector('#mirror-mode-apply')?.addEventListener('click', () => {
    applySelection();
  });
}

function setOpen(open: boolean): void {
  const modal = document.getElementById('mirror-mode-modal');
  if (!modal) return;
  modal.classList.toggle('is-open', open);
  modal.setAttribute('aria-hidden', open ? 'false' : 'true');
  if (open) playSfx('ui_open');
  else playSfx('ui_close');
}

function openMirror(): void {
  ensureModal();
  const body = document.getElementById('mirror-mode-body');
  if (!body) return;
  const save = loadSave();
  const current = getCombatMode(save);
  body.innerHTML = COMBAT_MODES.map(
    (m) => `
    <label class="mirror-mode-row">
      <input type="radio" name="combat-mode" value="${m.id}" ${
        m.id === current ? 'checked' : ''
      } />
      <span class="mirror-mode-copy">
        <strong>${m.label}</strong>
        <span class="mirror-mode-blurb">${m.blurb}</span>
      </span>
    </label>
  `,
  ).join('');
  setOpen(true);
}

function applySelection(): void {
  const checked = document.querySelector(
    'input[name="combat-mode"]:checked',
  ) as HTMLInputElement | null;
  const mode = (checked?.value ?? 'live') as CombatMode;
  if (mode !== 'live' && mode !== 'turn') return;
  let save = loadSave();
  const prev = getCombatMode(save);
  save = setCombatMode(save, mode);
  writeSave(save);
  playSfx('success');
  setOpen(false);
  window.dispatchEvent(
    new CustomEvent('dunjunz-combat-mode', {
      detail: { mode, previous: prev },
    }),
  );
  // Toast via game bus if present
  const g = (window as unknown as { __DUNJUNZ_GAME__?: Phaser.Game }).__DUNJUNZ_GAME__;
  g?.events.emit(
    'toast',
    `COMBAT MODE: ${combatModeLabel(mode)}`,
  );
}
