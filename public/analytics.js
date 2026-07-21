/**
 * Dunjunz Google Analytics (gtag) — non-blocking loader.
 * - Does not sit on the critical path (defer + idle)
 * - On /play, waits for window load + short delay so Phaser can boot first
 * - Uses beacon transport when available (less main-thread work)
 * Measurement ID: G-P8ZG98HDSC
 */
(function () {
  var GA_ID = 'G-P8ZG98HDSC';
  if (window.__dunjunzGtagBooted) return;

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;

  function boot() {
    if (window.__dunjunzGtagBooted) return;
    window.__dunjunzGtagBooted = true;

    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
    s.onload = function () {
      gtag('js', new Date());
      gtag('config', GA_ID, {
        send_page_view: true,
        // Prefer beacon so game frames aren't blocked by analytics XHR
        transport_type: 'beacon',
      });
    };
    // If GTM fails to load, fail silently — never block the game
    s.onerror = function () {
      /* ignore */
    };
    document.head.appendChild(s);
  }

  function whenIdle(fn, timeoutMs) {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(function () {
        fn();
      }, { timeout: timeoutMs });
    } else {
      setTimeout(fn, Math.min(timeoutMs, 800));
    }
  }

  function schedule() {
    var path = location.pathname || '';
    var isPlay =
      path === '/play' ||
      path === '/play/' ||
      path.indexOf('/play/') === 0;
    // Play: let BootScene + textures settle before network chatter
    var afterLoadDelay = isPlay ? 2200 : 0;
    var idleTimeout = isPlay ? 5000 : 2500;

    function run() {
      setTimeout(function () {
        whenIdle(boot, idleTimeout);
      }, afterLoadDelay);
    }

    if (document.readyState === 'complete') {
      run();
    } else {
      window.addEventListener('load', run, { once: true });
    }
  }

  schedule();
})();
