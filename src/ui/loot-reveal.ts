/**
 * Big loot crate reveal — large item icons after opening a box.
 */

import type { LootRevealItem } from '../systems/loot-boxes';
import { itemIconDataUrl } from '../systems/item-icon-preview';
import { playSfx } from '../systems/audio';

export interface LootRevealPayload {
  boxName: string;
  boxTemplateId?: string;
  items: LootRevealItem[];
}

export function initLootRevealUi(): void {
  ensureModal();
  window.addEventListener('dunjunz-loot-reveal', ((ev: CustomEvent) => {
    const d = ev.detail as LootRevealPayload | undefined;
    if (d?.items?.length) openLootReveal(d);
  }) as EventListener);
  (
    window as unknown as { openDunjunzLootReveal?: (p: LootRevealPayload) => void }
  ).openDunjunzLootReveal = openLootReveal;
}

function ensureModal(): void {
  if (document.getElementById('loot-reveal-modal')) return;
  const el = document.createElement('div');
  el.id = 'loot-reveal-modal';
  el.className = 'feedback-modal';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'loot-reveal-title');
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `
    <div class="feedback-panel journal-panel loot-reveal-panel">
      <header class="feedback-header">
        <h2 id="loot-reveal-title">LOOT CRATE</h2>
      </header>
      <p id="loot-reveal-blurb" class="feedback-blurb">You cracked it open. Claim your haul.</p>
      <div id="loot-reveal-box-icon" class="loot-reveal-box-wrap" aria-hidden="true"></div>
      <div id="loot-reveal-grid" class="loot-reveal-grid" role="list"></div>
      <div class="feedback-actions loot-reveal-actions">
        <button type="button" class="feedback-btn primary" id="loot-reveal-claim">CLAIM</button>
      </div>
    </div>
  `;
  document.body.appendChild(el);

  el.querySelector('#loot-reveal-claim')?.addEventListener('click', () => {
    setOpen(false);
  });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') {
      e.preventDefault();
      setOpen(false);
    }
  });
}

function setOpen(open: boolean): void {
  const modal = document.getElementById('loot-reveal-modal');
  if (!modal) return;
  modal.classList.toggle('is-open', open);
  modal.setAttribute('aria-hidden', open ? 'false' : 'true');
  if (open) {
    playSfx('success');
    (
      modal.querySelector('#loot-reveal-claim') as HTMLButtonElement | null
    )?.focus();
  } else {
    playSfx('ui_close');
    window.dispatchEvent(new CustomEvent('dunjunz-loot-reveal-closed'));
  }
}

export function openLootReveal(payload: LootRevealPayload): void {
  ensureModal();
  const title = document.getElementById('loot-reveal-title');
  const blurb = document.getElementById('loot-reveal-blurb');
  const boxWrap = document.getElementById('loot-reveal-box-icon');
  const grid = document.getElementById('loot-reveal-grid');
  if (!title || !blurb || !grid) return;

  title.textContent = payload.boxName || 'LOOT CRATE';
  blurb.textContent =
    payload.items.length === 1
      ? 'One prize. Treasure it.'
      : `${payload.items.length} prizes burst out in a flash of light.`;

  if (boxWrap) {
    boxWrap.innerHTML = '';
    if (payload.boxTemplateId) {
      const boxImg = document.createElement('img');
      boxImg.className = 'loot-reveal-box-img';
      boxImg.alt = '';
      boxImg.width = 128;
      boxImg.height = 128;
      boxImg.src = itemIconDataUrl(payload.boxTemplateId, 4);
      boxWrap.appendChild(boxImg);
    }
  }

  grid.innerHTML = '';
  for (const item of payload.items) {
    const card = document.createElement('div');
    card.className = 'loot-reveal-card';
    card.setAttribute('role', 'listitem');

    const img = document.createElement('img');
    img.className = 'loot-reveal-icon';
    img.alt = item.name;
    img.width = 128;
    img.height = 128;
    img.src = itemIconDataUrl(item.templateId, 4);

    const name = document.createElement('strong');
    name.className = 'loot-reveal-name';
    name.textContent =
      item.qty && item.qty > 1 ? `${item.name} ×${item.qty}` : item.name;

    card.appendChild(img);
    card.appendChild(name);
    grid.appendChild(card);
  }

  setOpen(true);
}

export function isLootRevealOpen(): boolean {
  const modal = document.getElementById('loot-reveal-modal');
  return !!modal?.classList.contains('is-open');
}
