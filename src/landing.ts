/**
 * Landing page entry — no Phaser. Styles + tiny progressive enhancements.
 */
import './style.css';

const year = document.getElementById('year');
if (year) year.textContent = String(new Date().getFullYear());

// Smooth scroll for same-page anchors (respect reduced motion)
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = (a as HTMLAnchorElement).getAttribute('href')?.slice(1);
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    history.pushState(null, '', `#${id}`);
  });
});
