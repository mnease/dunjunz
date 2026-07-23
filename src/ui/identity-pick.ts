/**
 * Beach identity gate — race first, then Male / Female of that race.
 * Binary gender covenant. Visuals match race immediately; stats at L25 ritual.
 */

import { loadSave, writeSave } from '../systems/save';
import {
  chooseIdentity,
  getRace,
  needsIdentityPick,
  RACE_IDS,
  RACES,
  type RaceId,
} from '../systems/races';
import { identityPreviewDataUrl } from '../systems/identity-preview';
import { playSfx } from '../systems/audio';

type Step = 'race' | 'gender';

let step: Step = 'race';
let selectedRace: RaceId | null = null;

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
        <h2 id="identity-pick-title">What walks out of the surf?</h2>
      </header>
      <p id="identity-pick-blurb" class="feedback-blurb">
        Pick an ancestry. Looks only for now — stats wait for the wizard at Lv 25.
      </p>
      <div id="identity-pick-body" class="identity-pick-body"></div>
      <div id="identity-pick-actions" class="identity-step-actions"></div>
      <p id="identity-pick-note" class="feedback-blurb identity-pick-note">
        All ten ancestries. Cosmetic until the ritual.
      </p>
    </div>
  `;
  document.body.appendChild(el);
}

function setOpen(open: boolean): void {
  const modal = document.getElementById('identity-pick-modal');
  if (!modal) return;
  modal.classList.toggle('is-open', open);
  modal.setAttribute('aria-hidden', open ? 'false' : 'true');
  if (open) {
    step = 'race';
    selectedRace = null;
    renderStep();
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

function renderStep(): void {
  const title = document.getElementById('identity-pick-title');
  const blurb = document.getElementById('identity-pick-blurb');
  const body = document.getElementById('identity-pick-body');
  const actions = document.getElementById('identity-pick-actions');
  const note = document.getElementById('identity-pick-note');
  if (!title || !blurb || !body || !actions || !note) return;

  if (step === 'race') {
    title.textContent = 'What walks out of the surf?';
    blurb.innerHTML =
      'Pick an ancestry. Looks only for now — stats wait for the wizard at Lv 25.';
    note.textContent = 'All ten ancestries. Cosmetic until the ritual.';
    body.innerHTML = '';
    body.className = 'identity-pick-body identity-race-grid';
    body.setAttribute('role', 'listbox');
    body.setAttribute('aria-label', 'Choose ancestry');

    for (const id of RACE_IDS) {
      const def = RACES[id]!;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'identity-race-card';
      btn.dataset.race = id;
      btn.setAttribute('role', 'option');
      btn.setAttribute('aria-selected', selectedRace === id ? 'true' : 'false');
      btn.setAttribute('aria-label', `Select ${def.name}`);
      if (selectedRace === id) btn.classList.add('is-selected');

      const img = document.createElement('img');
      img.className = 'identity-race-thumb';
      img.alt = '';
      img.width = 64;
      img.height = 64;
      img.src = identityPreviewDataUrl(id, 'male', 2);
      img.decoding = 'async';

      const name = document.createElement('strong');
      name.className = 'identity-race-name';
      name.textContent = def.name;

      const desc = document.createElement('span');
      desc.className = 'identity-race-blurb';
      desc.textContent = def.blurb;

      if (selectedRace === id) {
        const chip = document.createElement('span');
        chip.className = 'identity-selected-chip';
        chip.textContent = 'SELECTED';
        btn.appendChild(chip);
      }

      btn.appendChild(img);
      btn.appendChild(name);
      btn.appendChild(desc);

      btn.addEventListener('click', () => {
        selectedRace = id;
        playSfx('ui_open');
        renderStep();
      });
      btn.addEventListener('dblclick', () => {
        selectedRace = id;
        goGenderStep();
      });
      body.appendChild(btn);
    }

    actions.innerHTML = '';
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'feedback-btn primary identity-next-btn';
    next.textContent = 'Next →';
    next.disabled = !selectedRace;
    next.addEventListener('click', () => {
      if (selectedRace) goGenderStep();
    });
    actions.appendChild(next);

    // Focus first or selected race card
    const focusSel =
      body.querySelector<HTMLButtonElement>('.identity-race-card.is-selected') ??
      body.querySelector<HTMLButtonElement>('.identity-race-card');
    focusSel?.focus();
    return;
  }

  // Step 2 — gender of selected race
  const race = selectedRace ?? 'human';
  const raceName = getRace(race).name;
  title.textContent = 'Male or Female?';
  blurb.innerHTML = `<strong>${raceName}</strong>. Binary only — choose your form.`;
  note.textContent = 'Click a portrait to wake. Back to change ancestry.';
  body.innerHTML = '';
  body.className = 'identity-pick-body identity-pick-gallery';
  body.setAttribute('role', 'listbox');
  body.setAttribute('aria-label', 'Choose male or female');

  for (const gender of ['male', 'female'] as const) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'identity-portrait-card';
    btn.dataset.gender = gender;
    btn.setAttribute('role', 'option');
    btn.setAttribute(
      'aria-label',
      `Select ${gender} ${raceName.toLowerCase()}`,
    );

    const img = document.createElement('img');
    img.className = 'identity-portrait';
    img.alt = `${gender} ${raceName}`;
    img.width = 192;
    img.height = 192;
    img.src = identityPreviewDataUrl(race, gender, 6);

    const label = document.createElement('strong');
    label.className = 'identity-portrait-label';
    label.textContent = gender === 'male' ? 'MALE' : 'FEMALE';

    btn.appendChild(img);
    btn.appendChild(label);
    btn.addEventListener('click', () => confirmIdentity(race, gender));
    body.appendChild(btn);
  }

  actions.innerHTML = '';
  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'feedback-btn identity-back-btn';
  back.textContent = '← Back';
  back.addEventListener('click', () => {
    step = 'race';
    playSfx('ui_open');
    renderStep();
  });
  actions.appendChild(back);

  body.querySelector<HTMLButtonElement>('.identity-portrait-card')?.focus();
}

function goGenderStep(): void {
  if (!selectedRace) return;
  step = 'gender';
  playSfx('ui_open');
  renderStep();
}

function confirmIdentity(race: RaceId, gender: 'male' | 'female'): void {
  let save = loadSave();
  if (!needsIdentityPick(save) && save.identityChosen) {
    setOpen(false);
    return;
  }
  save = chooseIdentity(save, { race, gender });
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
