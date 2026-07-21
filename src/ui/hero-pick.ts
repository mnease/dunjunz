/**
 * Class / multiclass / race picker modal (level gates 5 / 15 / 25).
 */

import { loadSave, writeSave } from '../systems/save';
import {
  CLASS_IDS,
  CLASSES,
  type ClassId,
  pickPrimaryClass,
  pickSecondaryClass,
} from '../systems/classes';
import {
  RACE_IDS,
  RACES,
  type RaceId,
  pickRace,
} from '../systems/races';
import { pendingHeroPick, type HeroPickKind } from '../systems/hero-identity';
import { syncDerivedStats } from '../systems/inventory';
import { playSfx } from '../systems/audio';

export function initHeroPickUi(): void {
  ensureModal();

  window.addEventListener('dunjunz-hero-pick', ((ev: CustomEvent) => {
    const kind = (ev.detail?.kind ?? pendingHeroPick(loadSave())) as HeroPickKind | null;
    if (kind) openPick(kind);
  }) as EventListener);

  // Also expose for debugging / resume
  (window as unknown as { openDunjunzHeroPick?: (k: HeroPickKind) => void }).openDunjunzHeroPick =
    openPick;
}

function ensureModal(): void {
  if (document.getElementById('hero-pick-modal')) return;
  const el = document.createElement('div');
  el.id = 'hero-pick-modal';
  el.className = 'feedback-modal';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'hero-pick-title');
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `
    <div class="feedback-panel journal-panel">
      <header class="feedback-header">
        <h2 id="hero-pick-title">Choose your path</h2>
        <button type="button" class="feedback-x" data-hero-pick-close aria-label="Close">×</button>
      </header>
      <p id="hero-pick-blurb" class="feedback-blurb"></p>
      <div id="hero-pick-body" class="journal-body" role="listbox" tabindex="0"></div>
      <div class="feedback-actions">
        <button type="button" class="btn" data-hero-pick-close>Later</button>
      </div>
    </div>
  `;
  document.body.appendChild(el);

  el.querySelectorAll('[data-hero-pick-close]').forEach((btn) => {
    btn.addEventListener('click', () => setOpen(false));
  });
  el.addEventListener('click', (e) => {
    if (e.target === el) setOpen(false);
  });
}

function setOpen(open: boolean): void {
  const modal = document.getElementById('hero-pick-modal');
  if (!modal) return;
  modal.classList.toggle('is-open', open);
  modal.setAttribute('aria-hidden', open ? 'false' : 'true');
  if (open) playSfx('ui_open');
  else playSfx('ui_close');
}

function openPick(kind: HeroPickKind): void {
  ensureModal();
  const title = document.getElementById('hero-pick-title');
  const blurb = document.getElementById('hero-pick-blurb');
  const body = document.getElementById('hero-pick-body');
  if (!title || !blurb || !body) return;

  if (kind === 'class') {
    title.textContent = 'Choose a class (Lv 5)';
    blurb.textContent =
      'Standard D&D-style class. Full attribute package. You can multiclass at 15.';
    body.innerHTML = CLASS_IDS.map((id) => classCard(id)).join('');
  } else if (kind === 'multiclass') {
    title.textContent = 'Double class (Lv 15)';
    blurb.textContent =
      'Pick a second class. Secondary bonuses are half strength. Cannot match primary.';
    const save = loadSave();
    body.innerHTML = CLASS_IDS.filter((id) => id !== save.primaryClass)
      .map((id) => classCard(id))
      .join('');
  } else {
    title.textContent = 'Change race (Lv 25)';
    blurb.textContent =
      'Common D&D ancestries. One choice — spend it wisely. Human gets versatile +1s.';
    body.innerHTML = RACE_IDS.map((id) => raceCard(id)).join('');
  }

  body.querySelectorAll('[data-pick-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.pickId!;
      confirmPick(kind, id);
    });
  });

  setOpen(true);
}

function classCard(id: ClassId): string {
  const c = CLASSES[id];
  const bits = Object.entries(c.bonuses)
    .filter(([, v]) => v)
    .map(([k, v]) => `+${v} ${k.toUpperCase()}`)
    .join(' · ');
  return `<button type="button" class="journal-row" data-pick-id="${id}" role="option">
    <strong>${c.name}</strong>
    <span class="journal-row-meta">${c.blurb}</span>
    <span class="journal-row-meta">${bits || '—'}</span>
  </button>`;
}

function raceCard(id: RaceId): string {
  const r = RACES[id];
  const bonus =
    id === 'human'
      ? '+1 ALL (versatile)'
      : Object.entries(r.bonuses)
          .filter(([, v]) => v)
          .map(([k, v]) => `+${v} ${k.toUpperCase()}`)
          .join(' · ');
  return `<button type="button" class="journal-row" data-pick-id="${id}" role="option">
    <strong>${r.name}</strong>
    <span class="journal-row-meta">${r.blurb}</span>
    <span class="journal-row-meta">${bonus}</span>
  </button>`;
}

function confirmPick(kind: HeroPickKind, id: string): void {
  let save = loadSave();
  if (kind === 'class') {
    const r = pickPrimaryClass(save, id as ClassId);
    if (!r.ok) {
      playSfx('error');
      return;
    }
    save = syncDerivedStats(r.save);
  } else if (kind === 'multiclass') {
    const r = pickSecondaryClass(save, id as ClassId);
    if (!r.ok) {
      playSfx('error');
      return;
    }
    save = syncDerivedStats(r.save);
  } else {
    const r = pickRace(save, id as RaceId);
    if (!r.ok) {
      playSfx('error');
      return;
    }
    save = syncDerivedStats(r.save);
  }
  writeSave(save);
  playSfx('success');
  setOpen(false);
  // Notify game to refresh HUD if running
  window.dispatchEvent(new CustomEvent('dunjunz-save-updated'));
  // Chain next pending pick if any
  const next = pendingHeroPick(save);
  if (next) {
    setTimeout(() => openPick(next), 300);
  }
}
