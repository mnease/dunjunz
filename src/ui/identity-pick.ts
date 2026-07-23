/**
 * Beach identity gate — Male / Female only (binary covenant).
 * Required before wake; rolls random race on confirm.
 */

import { loadSave, writeSave } from '../systems/save';
import {
  chooseIdentity,
  getRace,
  needsIdentityPick,
  type RaceId,
} from '../systems/races';
import { playSfx } from '../systems/audio';

export function initIdentityPickUi(): void {
  ensureModal();
  window.addEventListener('dunjunz-identity-open', (() => {
    openIdentityPick();
  }) as EventListener);
  (window as unknown as { openDunjunzIdentityPick?: () => void }).openDunjunzIdentityPick =
    openIdentityPick;
}

function ensureModal(): void {
  if (document.getElementById('identity-pick-modal')) return;
  const el = document.createElement('div');
  el.id = 'identity-pick-modal';
  el.className = 'feedback-modal';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'identity-pick-title');
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `
    <div class="feedback-panel journal-panel">
      <header class="feedback-header">
        <h2 id="identity-pick-title">Who wakes on the beach?</h2>
      </header>
      <p class="feedback-blurb">
        A random ancestry already clings to your bones. Pick the shape of the story —
        <strong>Male</strong> or <strong>Female</strong> only.
      </p>
      <div id="identity-pick-body" class="journal-body identity-pick-list" role="listbox">
        <button type="button" class="journal-row identity-card" data-gender="male" role="option">
          <strong>MALE</strong>
          <span class="journal-row-meta">Traditional hero. Boots optional but recommended.</span>
        </button>
        <button type="button" class="journal-row identity-card" data-gender="female" role="option">
          <strong>FEMALE</strong>
          <span class="journal-row-meta">Traditional heroine. Same boots policy.</span>
        </button>
      </div>
      <p class="feedback-blurb identity-pick-note">No other options. No later. Destiny is binary here.</p>
    </div>
  `;
  document.body.appendChild(el);

  // No close / no dismiss — must pick
  el.querySelectorAll('[data-gender]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const g = (btn as HTMLElement).dataset.gender;
      if (g === 'male' || g === 'female') confirmGender(g);
    });
  });
}

function setOpen(open: boolean): void {
  const modal = document.getElementById('identity-pick-modal');
  if (!modal) return;
  modal.classList.toggle('is-open', open);
  modal.setAttribute('aria-hidden', open ? 'false' : 'true');
  if (open) playSfx('ui_open');
  else playSfx('ui_close');
}

export function openIdentityPick(): void {
  ensureModal();
  const save = loadSave();
  if (!needsIdentityPick(save)) {
    setOpen(false);
    return;
  }
  setOpen(true);
}

function confirmGender(gender: 'male' | 'female'): void {
  let save = loadSave();
  if (!needsIdentityPick(save) && save.identityChosen) {
    setOpen(false);
    return;
  }
  save = chooseIdentity(save, gender);
  writeSave(save);
  playSfx('success');
  setOpen(false);
  const raceName = getRace(save.race as RaceId).name;
  window.dispatchEvent(
    new CustomEvent('dunjunz-identity-chosen', {
      detail: { gender, race: save.race, raceName },
    }),
  );
  window.dispatchEvent(new CustomEvent('dunjunz-save-updated'));
}

/** True if the blocking modal is open. */
export function isIdentityPickOpen(): boolean {
  const modal = document.getElementById('identity-pick-modal');
  return !!modal?.classList.contains('is-open');
}
