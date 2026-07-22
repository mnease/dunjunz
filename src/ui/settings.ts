/**
 * Settings modal — audio + preferences.
 */

import {
  loadSettings,
  patchSettings,
  type GameSettings,
} from '../systems/settings';
import {
  onSettingsChanged,
  playMusic,
  playSfx,
  getCurrentMusic,
  unlockAudio,
} from '../systems/audio';
import { isMobileDevice, setMobileMode } from '../systems/touch-input';

export function initSettingsUi(): void {
  const openBtn = document.getElementById('settings-open');
  const modal = document.getElementById('settings-modal');
  const closeBtns = document.querySelectorAll('[data-settings-close]');
  const form = document.getElementById('settings-form') as HTMLFormElement | null;
  const muted = document.getElementById('set-muted') as HTMLInputElement | null;
  const musicEn = document.getElementById(
    'set-music-enabled',
  ) as HTMLInputElement | null;
  const sfxEn = document.getElementById(
    'set-sfx-enabled',
  ) as HTMLInputElement | null;
  const musicVol = document.getElementById(
    'set-music-vol',
  ) as HTMLInputElement | null;
  const sfxVol = document.getElementById(
    'set-sfx-vol',
  ) as HTMLInputElement | null;
  const reduce = document.getElementById(
    'set-reduce-motion',
  ) as HTMLInputElement | null;
  const mobileMode = document.getElementById(
    'set-mobile-mode',
  ) as HTMLInputElement | null;
  const autoStats = document.getElementById(
    'set-auto-stats',
  ) as HTMLInputElement | null;
  const manualStats = document.getElementById(
    'set-manual-stats',
  ) as HTMLInputElement | null;
  const musicLabel = document.getElementById('set-music-vol-label');
  const sfxLabel = document.getElementById('set-sfx-vol-label');
  const testBtn = document.getElementById('settings-test-sfx');

  if (!openBtn || !modal || !form) return;

  // Touch-controls row only makes sense on real phones/tablets
  const mobileRow = document.getElementById('set-mobile-mode-row');
  if (mobileRow) {
    const show = isMobileDevice();
    mobileRow.hidden = !show;
    (mobileRow as HTMLElement).style.display = show ? '' : 'none';
  }

  const setOpen = (open: boolean) => {
    modal.classList.toggle('is-open', open);
    modal.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) {
      playSfx('ui_open');
      fillForm(loadSettings());
    } else {
      playSfx('ui_close');
    }
  };

  const fillForm = (s: GameSettings) => {
    if (muted) muted.checked = s.muted;
    if (musicEn) musicEn.checked = s.musicEnabled;
    if (sfxEn) sfxEn.checked = s.sfxEnabled;
    if (musicVol) musicVol.value = String(Math.round(s.musicVolume * 100));
    if (sfxVol) sfxVol.value = String(Math.round(s.sfxVolume * 100));
    if (reduce) reduce.checked = s.reduceMotion;
    if (mobileMode) mobileMode.checked = !!s.mobileMode;
    if (autoStats) autoStats.checked = !!s.autoStatAllocate;
    if (manualStats) manualStats.checked = !s.autoStatAllocate;
    if (musicLabel) musicLabel.textContent = `${Math.round(s.musicVolume * 100)}%`;
    if (sfxLabel) sfxLabel.textContent = `${Math.round(s.sfxVolume * 100)}%`;
  };

  const readForm = (): GameSettings => ({
    muted: !!muted?.checked,
    musicEnabled: !!musicEn?.checked,
    sfxEnabled: !!sfxEn?.checked,
    musicVolume: Number(musicVol?.value ?? 35) / 100,
    sfxVolume: Number(sfxVol?.value ?? 55) / 100,
    reduceMotion: !!reduce?.checked,
    autoStatAllocate: !!autoStats?.checked,
    mobileMode: !!mobileMode?.checked,
  });

  const applyLive = () => {
    const prev = loadSettings();
    const s = patchSettings(readForm());
    onSettingsChanged(s);
    if (musicLabel) {
      musicLabel.textContent = `${Math.round(s.musicVolume * 100)}%`;
    }
    if (sfxLabel) sfxLabel.textContent = `${Math.round(s.sfxVolume * 100)}%`;
    // Tell the running game to flush packages if auto was just enabled
    if (s.autoStatAllocate && !prev.autoStatAllocate) {
      window.dispatchEvent(
        new CustomEvent('dunjunz-auto-stats-enabled', { detail: s }),
      );
    }
    // Mobile pad / layout — force path so pad shows even if auto-detect failed
    if (s.mobileMode !== prev.mobileMode) {
      setMobileMode(s.mobileMode);
    }
  };

  openBtn.addEventListener('click', () => {
    void unlockAudio();
    setOpen(true);
  });
  closeBtns.forEach((el) =>
    el.addEventListener('click', () => setOpen(false)),
  );
  modal.addEventListener('click', (e) => {
    if (e.target === modal) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) {
      setOpen(false);
    }
  });

  form.addEventListener('input', () => {
    applyLive();
  });
  form.addEventListener('change', () => {
    applyLive();
    playSfx('ui_click');
  });

  testBtn?.addEventListener('click', () => {
    void unlockAudio().then(() => playSfx('success'));
  });

  // Initial apply
  onSettingsChanged(loadSettings());
}

/** Convenience for game scenes after load. */
export function resumeMusicForScene(kind: 'title' | 'overworld' | 'dungeon'): void {
  const cur = getCurrentMusic();
  if (cur !== kind) playMusic(kind);
}
