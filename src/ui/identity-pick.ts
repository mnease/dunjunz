/**
 * Beach identity gate — Male / Female only (binary covenant).
 * Side-by-side adventurer portraits; click image to select.
 */

import { loadSave, writeSave } from '../systems/save';
import {
  chooseIdentity,
  getRace,
  needsIdentityPick,
  type RaceId,
} from '../systems/races';
import { genderPreviewDataUrl } from '../systems/identity-preview';
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
    <div class="feedback-panel journal-panel identity-pick-panel">
      <header class="feedback-header">
        <h2 id="identity-pick-title">Who wakes on the beach?</h2>
      </header>
      <p class="feedback-blurb">
        Click an adventurer. A random ancestry will cling to your bones either way —
        <strong>Male</strong> or <strong>Female</strong> only.
      </p>
      <div id="identity-pick-body" class="identity-pick-gallery" role="listbox" aria-label="Choose male or female">
        <button type="button" class="identity-portrait-card" data-gender="male" role="option" aria-label="Select male adventurer">
          <img class="identity-portrait" data-portrait="male" alt="Male adventurer" width="192" height="192" />
          <strong class="identity-portrait-label">MALE</strong>
        </button>
        <button type="button" class="identity-portrait-card" data-gender="female" role="option" aria-label="Select female adventurer">
          <img class="identity-portrait" data-portrait="female" alt="Female adventurer" width="192" height="192" />
          <strong class="identity-portrait-label">FEMALE</strong>
        </button>
      </div>
      <p class="feedback-blurb identity-pick-note">Click a portrait to choose. No other options.</p>
    </div>
  `;
  document.body.appendChild(el);

  el.querySelectorAll('[data-gender]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const g = (btn as HTMLElement).dataset.gender;
      if (g === 'male' || g === 'female') confirmGender(g);
    });
  });
}

function paintPortraits(): void {
  const maleUrl = genderPreviewDataUrl('male', 6);
  const femaleUrl = genderPreviewDataUrl('female', 6);
  const maleImg = document.querySelector<HTMLImageElement>(
    '#identity-pick-modal img[data-portrait="male"]',
  );
  const femaleImg = document.querySelector<HTMLImageElement>(
    '#identity-pick-modal img[data-portrait="female"]',
  );
  if (maleImg && maleUrl) maleImg.src = maleUrl;
  if (femaleImg && femaleUrl) femaleImg.src = femaleUrl;
}

function setOpen(open: boolean): void {
  const modal = document.getElementById('identity-pick-modal');
  if (!modal) return;
  modal.classList.toggle('is-open', open);
  modal.setAttribute('aria-hidden', open ? 'false' : 'true');
  if (open) {
    paintPortraits();
    playSfx('ui_open');
  } else {
    playSfx('ui_close');
  }
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
