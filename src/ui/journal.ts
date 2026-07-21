/**
 * Journal modal — quests + brags (achievements).
 * HTML shell for scrollable lists + keyboard (matches Settings pattern).
 */

import { loadSave, writeSave } from '../systems/save';
import {
  countQuestProgress,
  listQuests,
  questStatusLabel,
  type QuestLogEntry,
} from '../systems/quest-log';
import {
  achievementProgress,
  listAchievementsForUi,
  syncAchievements,
} from '../systems/achievements';
import { playSfx } from '../systems/audio';

type Tab = 'quests' | 'brags';

let activeTab: Tab = 'quests';

export function initJournalUi(): void {
  const openBtn = document.getElementById('journal-open');
  const modal = document.getElementById('journal-modal');
  const closeBtns = document.querySelectorAll('[data-journal-close]');
  const tabQuests = document.getElementById('journal-tab-quests');
  const tabBrags = document.getElementById('journal-tab-brags');
  const body = document.getElementById('journal-body');
  const summary = document.getElementById('journal-summary');

  if (!openBtn || !modal || !body) return;

  const setOpen = (open: boolean) => {
    modal.classList.toggle('is-open', open);
    modal.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) {
      playSfx('ui_open');
      render();
      // focus first tab for keyboard users
      tabQuests?.focus();
    } else {
      playSfx('ui_close');
    }
  };

  const setTab = (tab: Tab) => {
    activeTab = tab;
    tabQuests?.classList.toggle('is-active', tab === 'quests');
    tabBrags?.classList.toggle('is-active', tab === 'brags');
    tabQuests?.setAttribute('aria-selected', tab === 'quests' ? 'true' : 'false');
    tabBrags?.setAttribute('aria-selected', tab === 'brags' ? 'true' : 'false');
    playSfx('ui_click');
    render();
  };

  const render = () => {
    let save = loadSave();
    // Refresh brags when opening journal
    const synced = syncAchievements(save);
    if (synced.newly.length) {
      save = synced.save;
      writeSave(save);
    }

    if (activeTab === 'quests') {
      const list = listQuests(save);
      const prog = countQuestProgress(save);
      if (summary) {
        summary.textContent = `QUESTS  ${prog.done}/${prog.total} DONE · ${prog.active} ACTIVE`;
      }
      body.innerHTML = list.map((q) => questRowHtml(q)).join('');
    } else {
      const list = listAchievementsForUi(save);
      const prog = achievementProgress(save);
      if (summary) {
        summary.textContent = `BRAGS  ${prog.unlocked}/${prog.total} UNLOCKED`;
      }
      body.innerHTML = list
        .map(
          (a) => `
        <article class="journal-row ${a.unlocked ? 'is-done' : 'is-locked'}" data-status="${a.unlocked ? 'done' : 'locked'}">
          <header class="journal-row-head">
            <span class="journal-status" aria-label="${a.unlocked ? 'Unlocked' : 'Locked'}">${a.unlocked ? '★' : '·'}</span>
            <h3 class="journal-title">${escapeHtml(a.title)}</h3>
            <span class="journal-progress">${a.unlocked ? 'BRAGGED' : '???'}</span>
          </header>
          <p class="journal-blurb">${a.unlocked ? escapeHtml(a.blurb) : 'Keep playing. The bard is watching.'}</p>
        </article>`,
        )
        .join('');
    }
  };

  openBtn.addEventListener('click', () => setOpen(true));
  closeBtns.forEach((el) =>
    el.addEventListener('click', () => setOpen(false)),
  );
  modal.addEventListener('click', (e) => {
    if (e.target === modal) setOpen(false);
  });
  tabQuests?.addEventListener('click', () => setTab('quests'));
  tabBrags?.addEventListener('click', () => setTab('brags'));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) {
      setOpen(false);
      return;
    }
    // J opens journal when not typing in a form
    if (
      (e.key === 'j' || e.key === 'J') &&
      !modal.classList.contains('is-open') &&
      !(e.target instanceof HTMLInputElement) &&
      !(e.target instanceof HTMLTextAreaElement)
    ) {
      // Don't steal J from game if focus is canvas... still open is fine for journal
      setOpen(true);
    }
  });

  // Expose refresh for game toasts path
  (window as unknown as { __dunjunzRefreshJournal?: () => void }).__dunjunzRefreshJournal =
    () => {
      if (modal.classList.contains('is-open')) render();
    };
}

function questRowHtml(q: QuestLogEntry): string {
  const st = questStatusLabel(q.status);
  return `
    <article class="journal-row is-${q.status}" data-status="${q.status}" data-kind="${q.kind}">
      <header class="journal-row-head">
        <span class="journal-status" aria-label="${st}">${statusGlyph(q.status)}</span>
        <h3 class="journal-title">${escapeHtml(q.title)}</h3>
        <span class="journal-progress">${escapeHtml(q.progress)}</span>
      </header>
      <p class="journal-blurb">${escapeHtml(q.blurb)}</p>
      <p class="journal-meta">${q.kind.toUpperCase()} · ${st}</p>
    </article>`;
}

function statusGlyph(s: QuestLogEntry['status']): string {
  switch (s) {
    case 'done':
      return '✓';
    case 'active':
      return '▶';
    case 'available':
      return '○';
    case 'locked':
      return '·';
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Call after game events — unlocks brags and returns toast lines. */
export function applyAchievementSync(): string[] {
  const save = loadSave();
  const { save: next, newly } = syncAchievements(save);
  if (!newly.length) return [];
  writeSave(next);
  (window as unknown as { __dunjunzRefreshJournal?: () => void }).__dunjunzRefreshJournal?.();
  return newly.map((a) => `NEW BRAG: ${a.title}`);
}
