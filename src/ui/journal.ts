/**
 * Journal modal — Quests and Achievements on separate tabs.
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

export type JournalTab = 'quests' | 'achievements';

let activeTab: JournalTab = 'quests';

const TAB_COPY: Record<
  JournalTab,
  { title: string; blurb: string }
> = {
  quests: {
    title: 'Quests',
    blurb:
      'Track quests and <strong>WHERE</strong> to go next. Active jobs pin to the top. Press <strong>J</strong> anytime.',
  },
  achievements: {
    title: 'Achievements',
    blurb:
      'Unlocks the bard bothers to write down. Locked rows stay spoiler-safe until you earn them.',
  },
};

/** Open the journal on a specific tab (used by topbar + game J key). */
export function openJournal(tab: JournalTab = 'quests'): void {
  (
    window as unknown as { __dunjunzOpenJournal?: (t: JournalTab) => void }
  ).__dunjunzOpenJournal?.(tab);
}

export function initJournalUi(): void {
  const openBtn = document.getElementById('journal-open');
  const achievementsBtn = document.getElementById('achievements-open');
  const modal = document.getElementById('journal-modal');
  const closeBtns = document.querySelectorAll('[data-journal-close]');
  const tabQuests = document.getElementById('journal-tab-quests');
  const tabAchievements = document.getElementById('journal-tab-achievements');
  const panelQuests = document.getElementById('journal-panel-quests');
  const panelAchievements = document.getElementById(
    'journal-panel-achievements',
  );
  const summary = document.getElementById('journal-summary');
  const titleEl = document.getElementById('journal-title');
  const blurbEl = document.getElementById('journal-blurb');

  if (!openBtn || !modal || !panelQuests || !panelAchievements) return;

  const setOpen = (open: boolean, tab?: JournalTab) => {
    if (open && tab) activeTab = tab;
    modal.classList.toggle('is-open', open);
    modal.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) {
      playSfx('ui_open');
      applyTabChrome();
      render();
      (activeTab === 'quests' ? tabQuests : tabAchievements)?.focus();
    } else {
      playSfx('ui_close');
    }
  };

  const applyTabChrome = () => {
    const isQuests = activeTab === 'quests';
    tabQuests?.classList.toggle('is-active', isQuests);
    tabAchievements?.classList.toggle('is-active', !isQuests);
    tabQuests?.setAttribute('aria-selected', isQuests ? 'true' : 'false');
    tabAchievements?.setAttribute('aria-selected', isQuests ? 'false' : 'true');
    tabQuests?.setAttribute('tabindex', isQuests ? '0' : '-1');
    tabAchievements?.setAttribute('tabindex', isQuests ? '-1' : '0');
    panelQuests.hidden = !isQuests;
    panelAchievements.hidden = isQuests;
    const copy = TAB_COPY[activeTab];
    if (titleEl) titleEl.textContent = copy.title;
    if (blurbEl) blurbEl.innerHTML = copy.blurb;
  };

  const setTab = (tab: JournalTab) => {
    if (activeTab === tab && modal.classList.contains('is-open')) {
      render();
      return;
    }
    activeTab = tab;
    applyTabChrome();
    playSfx('ui_click');
    render();
  };

  const render = () => {
    let save = loadSave();
    const synced = syncAchievements(save);
    if (synced.newly.length) {
      save = synced.save;
      writeSave(save);
    }

    if (activeTab === 'quests') {
      const list = listQuests(save);
      const prog = countQuestProgress(save);
      const active = list.filter((q) => q.status === 'active');
      if (summary) {
        summary.textContent = `QUESTS  ${prog.done}/${prog.total} DONE · ${prog.active} ACTIVE`;
      }
      const focus =
        active.length > 0
          ? `<div class="journal-focus" role="status">
              <p class="journal-focus-label">NOW TRACKING</p>
              ${active.map((q) => questRowHtml(q, true)).join('')}
            </div>
            <p class="journal-section-label">ALL QUESTS</p>`
          : `<p class="journal-section-label">ALL QUESTS</p>`;
      panelQuests.innerHTML =
        focus + list.map((q) => questRowHtml(q, false)).join('');
    } else {
      const list = listAchievementsForUi(save);
      const prog = achievementProgress(save);
      if (summary) {
        summary.textContent = `ACHIEVEMENTS  ${prog.unlocked}/${prog.total} UNLOCKED`;
      }
      panelAchievements.innerHTML = list
        .map(
          (a) => `
        <article class="journal-row ${a.unlocked ? 'is-done' : 'is-locked'}" data-status="${a.unlocked ? 'done' : 'locked'}">
          <header class="journal-row-head">
            <span class="journal-status" aria-label="${a.unlocked ? 'Unlocked' : 'Locked'}">${a.unlocked ? '★' : '·'}</span>
            <h3 class="journal-title">${escapeHtml(a.title)}</h3>
            <span class="journal-progress">${a.unlocked ? 'UNLOCKED' : '???'}</span>
          </header>
          <p class="journal-blurb">${a.unlocked ? escapeHtml(a.blurb) : 'Keep playing. The bard is watching.'}</p>
        </article>`,
        )
        .join('');
    }
  };

  openBtn.addEventListener('click', () => setOpen(true, 'quests'));
  achievementsBtn?.addEventListener('click', () =>
    setOpen(true, 'achievements'),
  );
  closeBtns.forEach((el) =>
    el.addEventListener('click', () => setOpen(false)),
  );
  modal.addEventListener('click', (e) => {
    if (e.target === modal) setOpen(false);
  });
  tabQuests?.addEventListener('click', () => setTab('quests'));
  tabAchievements?.addEventListener('click', () => setTab('achievements'));

  // Arrow keys between tabs when focus is on a tab control
  const onTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    setTab(activeTab === 'quests' ? 'achievements' : 'quests');
    (activeTab === 'quests' ? tabQuests : tabAchievements)?.focus();
  };
  tabQuests?.addEventListener('keydown', onTabKey);
  tabAchievements?.addEventListener('keydown', onTabKey);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) {
      setOpen(false);
      return;
    }
    // J opens Quests tab when not typing in a form
    if (
      (e.key === 'j' || e.key === 'J') &&
      !modal.classList.contains('is-open') &&
      !(e.target instanceof HTMLInputElement) &&
      !(e.target instanceof HTMLTextAreaElement)
    ) {
      setOpen(true, 'quests');
    }
  });

  (
    window as unknown as {
      __dunjunzRefreshJournal?: () => void;
      __dunjunzOpenJournal?: (t: JournalTab) => void;
    }
  ).__dunjunzRefreshJournal = () => {
    if (modal.classList.contains('is-open')) render();
  };
  (
    window as unknown as { __dunjunzOpenJournal?: (t: JournalTab) => void }
  ).__dunjunzOpenJournal = (t) => setOpen(true, t);
}

function questRowHtml(q: QuestLogEntry, focused = false): string {
  const st = questStatusLabel(q.status);
  const hint =
    q.hint && (q.status === 'active' || q.status === 'available' || focused)
      ? `<p class="journal-hint"><span class="journal-hint-label">WHERE</span> ${escapeHtml(q.hint)}</p>`
      : q.hint && q.status === 'done'
        ? ''
        : q.hint
          ? `<p class="journal-hint journal-hint-muted"><span class="journal-hint-label">WHERE</span> ${escapeHtml(q.hint)}</p>`
          : '';
  return `
    <article class="journal-row is-${q.status}${focused ? ' is-focus' : ''}" data-status="${q.status}" data-kind="${q.kind}">
      <header class="journal-row-head">
        <span class="journal-status" aria-label="${st}">${statusGlyph(q.status)}</span>
        <h3 class="journal-title">${escapeHtml(q.title)}</h3>
        <span class="journal-progress">${escapeHtml(q.progress)}</span>
      </header>
      <p class="journal-blurb">${escapeHtml(q.blurb)}</p>
      ${hint}
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

/** Call after game events — unlocks achievements and returns toast lines. */
export function applyAchievementSync(): string[] {
  const save = loadSave();
  const { save: next, newly } = syncAchievements(save);
  if (!newly.length) return [];
  writeSave(next);
  (
    window as unknown as { __dunjunzRefreshJournal?: () => void }
  ).__dunjunzRefreshJournal?.();
  return newly.map((a) => `NEW ACHIEVEMENT: ${a.title}`);
}
