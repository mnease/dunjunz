/**
 * Feedback modal — posts to /api/feedback (Vercel SMTP handler).
 */

const STATUS_OK = 'Thanks! Message sent to support@neasemedia.com.';
const STATUS_ERR = 'Could not send. Try again or email support@neasemedia.com.';

export function initFeedbackUi(): void {
  const openBtn = document.getElementById('feedback-open');
  const modal = document.getElementById('feedback-modal');
  const form = document.getElementById('feedback-form') as HTMLFormElement | null;
  const closeBtns = document.querySelectorAll('[data-feedback-close]');
  const statusEl = document.getElementById('feedback-status');
  const submitBtn = document.getElementById(
    'feedback-submit',
  ) as HTMLButtonElement | null;

  if (!openBtn || !modal || !form) return;

  const setOpen = (open: boolean) => {
    modal.classList.toggle('is-open', open);
    modal.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) {
      const name = document.getElementById('feedback-name') as HTMLInputElement | null;
      name?.focus();
    }
  };

  const setStatus = (text: string, kind: 'idle' | 'ok' | 'err' | 'busy') => {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.dataset.kind = kind;
  };

  openBtn.addEventListener('click', () => {
    setStatus('', 'idle');
    setOpen(true);
  });

  closeBtns.forEach((el) => {
    el.addEventListener('click', () => setOpen(false));
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) setOpen(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) {
      setOpen(false);
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!submitBtn) return;

    const fd = new FormData(form);
    const payload = {
      name: String(fd.get('name') ?? ''),
      email: String(fd.get('email') ?? ''),
      message: String(fd.get('message') ?? ''),
      website: String(fd.get('website') ?? ''), // honeypot
    };

    submitBtn.disabled = true;
    setStatus('Sending…', 'busy');

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (res.ok && data.ok !== false) {
        setStatus(STATUS_OK, 'ok');
        form.reset();
        window.setTimeout(() => setOpen(false), 1800);
      } else {
        setStatus(data.error || STATUS_ERR, 'err');
      }
    } catch {
      setStatus(STATUS_ERR, 'err');
    } finally {
      submitBtn.disabled = false;
    }
  });
}
