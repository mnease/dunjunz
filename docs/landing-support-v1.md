# Landing page + support model (v1)

**Status:** ready to implement  
**Date:** 2026-07-21  
**Owner:** EMA (captain) · implement via Mason  
**Live domain:** https://dunjunz.com  
**Game route:** https://dunjunz.com/play  
**Repo homepage:** set to `https://dunjunz.com` (see §7)

---

## 1. Information architecture

| Route | Purpose | Loads Phaser? | Notes |
| --- | --- | --- | --- |
| `/` | Marketing / welcome landing | **No** | Fast first paint, SEO-friendly static HTML |
| `/play` | Full game shell (current experience) | **Yes** | Existing shell + modals + Phaser |
| `/api/*` | Vercel serverless (auth, slots, feedback, health) | N/A | **Unchanged** — never rewrite away |
| (optional later) `/support` | Deep-link alias | No | Prefer anchor `#support` on landing for v1 |

**Not v1:** `play.dunjunz.com` subdomain (extra DNS + cookie domain friction for auth). Same origin keeps magic-link / session cookies simple (`AUTH_BASE_URL=https://dunjunz.com`).

### Nav model

**Landing topbar**

- Brand → `/`
- Play (primary CTA) → `/play`
- How to play → `/#how`
- Support → `/#support`
- Feedback → mailto or link into play feedback later; v1: `support@neasemedia.com` + optional “Play → Feedback in-shell”

**Play topbar** (existing)

- Brand → `/` (home / leave game)
- Journal · Settings · Account · Feedback (unchanged)
- Optional small text link “About” → `/` if space allows (P1)

### Redirect / deep links

- Old bookmarks that hit `/` currently load the game. After ship, `/` is landing; “I just want to play” is one click.
- Optional soft convenience (P1, not required): `localStorage` flag `dunjunz-prefer-play` → landing shows “Continue to game” emphasis. **Do not** auto-redirect without consent (ADA + surprise).

---

## 2. Architecture choice: Vite multi-page (not SPA router)

### Why MPA

1. Landing must **not** download Phaser (~1MB+) or boot the game canvas.
2. Zero client router dependency; matches current zero-framework shell.
3. Vercel static files + existing `api/*` stay clean.
4. SEO / OG tags differ per page without runtime hacks.

### Why not SPA routes (`/play` client-only)

- Shared `index.html` would still ship game entry or need conditional dynamic import + dual root DOM. More complexity for little gain.
- Catch-all rewrite already forces SPA behavior; we need to **narrow** that rewrite.

### Why not subdomain

- Auth cookies, `AUTH_BASE_URL`, Resend magic links, and feedback all assume one site origin today.
- Path `/play` is enough.

---

## 3. File / config changes

### 3.1 Tree (after)

```
Dunjunz/
  index.html              ← LANDING (new content; no Phaser script)
  play/
    index.html            ← GAME shell (move current index.html here)
  src/
    main.ts               ← game entry (unchanged imports)
    style.css             ← shared design tokens + shell + landing sections
    landing.ts            ← optional tiny JS (smooth scroll, year); no Phaser
  vite.config.ts          ← multi-page input
  vercel.json             ← drop blanket SPA rewrite (or narrow it)
  public/favicon.svg
```

### 3.2 `vite.config.ts`

```ts
import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: '/',
  server: {
    port: 5173,
    open: false,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        play: resolve(__dirname, 'play/index.html'),
      },
    },
  },
});
```

### 3.3 `vercel.json`

**Current problem:** rewrite sends all non-api traffic to `/index.html`, which would swallow `/play` after MPA.

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "functions": {
    "api/**/*.{js,ts}": {
      "memory": 256,
      "maxDuration": 15
    }
  },
  "rewrites": [
    {
      "source": "/play",
      "destination": "/play/index.html"
    },
    {
      "source": "/play/",
      "destination": "/play/index.html"
    }
  ]
}
```

Notes:

- Vercel serves real files first; rewrites only fill gaps (trailing slash / clean `/play`).
- **Do not** re-add a catch-all `/(.*) → /index.html` unless you add client-side routes later.
- `api/*` continues to map to serverless functions automatically; never rewrite those.

### 3.4 Move game HTML

1. Copy current root `index.html` → `play/index.html`.
2. In `play/index.html`:
   - Script stays `src="/src/main.ts"` (Vite resolves from project root).
   - Logo `href="/"` (landing).
   - Skip link still `#game-container`.
   - Optional: add nav text link “About” → `/`.
3. Replace root `index.html` with landing markup (no `main.ts` / Phaser).

### 3.5 CSS strategy

- Keep **one** `src/style.css` with existing tokens from design-ada-pass-v1 (`--bg`, `--neon`, `--amber`, fonts, focus rings, touch min).
- Landing imports the same file via `<script type="module" src="/src/landing.ts">` that only does `import './style.css'`, **or** link a built CSS entry. Simplest: landing entry `src/landing.ts`:

```ts
import './style.css';
// optional: smooth-scroll for in-page anchors if desired
```

- Namespace landing-only rules: `.landing-hero`, `.landing-section`, `.cta-row`, etc. Do not break `.topbar` / `.btn` used on `/play`.

### 3.6 Auth / env

- Production `AUTH_BASE_URL` should be `https://dunjunz.com` (not vercel.app) once custom domain is primary.
- Magic-link callback paths stay under `/api/auth/*` (unaffected).
- If magic links currently encode `dunjunz.vercel.app`, update Vercel env + Resend templates when domain cutover happens (ops checklist §8).

### 3.7 package.json / scripts

No new scripts required. Optional:

```json
"dev:play": "vite --open /play/"
```

`tsc && vite build` still typechecks game code; landing has no TS surface beyond `landing.ts`.

---

## 4. Landing sections + rough copy (game voice)

Tone: Adventure Time–adjacent, bard-weird, never corporate SaaS. Intentional misspellings only where branded (Dunjunz, woodz, mapz, Princesz Prizella). Body copy stays readable IBM Plex Mono; display Press Start for titles/CTAs.

### Meta

```html
<title>DUNJUNZ — An epic of questionable questing</title>
<meta name="description" content="Free browser dungeon crawler. Save Princesz Prizella, find your Best Bud, forje loot, and ignore the user agreement in the woodz." />
<meta property="og:title" content="DUNJUNZ" />
<meta property="og:description" content="An epic of questionable questing. Free in the browser." />
<meta property="og:url" content="https://dunjunz.com/" />
<meta name="theme-color" content="#0a0c10" />
```

### A. Hero (`#top`)

**Display:** DUNJUNZ  
**Tagline:** An epic of questionable questing  
**Lede:**

> A free, humorous retro dungeon crawler for your browser. Save Princesz Prizella, recruit a Best Bud who actually fights, forje questionable loot, and mapz three kinds of bad ideas: Dunjunz, woodz, and dezertz.

**CTAs:**

- Primary: **Play free** → `/play` (neon `.btn.primary` / amber nav energy)
- Secondary: **How it works** → `#how` (ghost)

**Micro:** “No install. No lootboxes. Local save works without an account.”

### B. What it is (`#what`)

**H2:** What even is this

> Dunjunz is a top-down crawler in the spirit of classic Zelda-likes, stuffed with affectionate parody: old-man sword tutorials, redshirt misfortune, door riddles that were never subtle, and a princesz who hands out champion jobs like overdue library books.
>
> Built by **NeaseMedia**. Played in the browser. Progress lives in your browser (and optional cloud slots if you want them).

Bullets (short):

- Procedural pixel look + CRT shell (tasteful; respects reduce-motion)
- RPG bits: attributes, rarity, forjing, mapz fog
- Best Bud companion combat (stretch, claws, fog, roast, blink, guard — depending on who you roll)
- Journal for quests + brags (achievements with bard commentary)

### C. How to play (`#how`)

**H2:** How to play (the short scroll)

| Keys | Do the thing |
| --- | --- |
| Arrows / WASD | Move |
| Space / Z | Attack (once you have a sword, hero) |
| E | Talk, open, stairs, mapz, forje, princesz energy |
| I | Inventory + character sheet |
| J | Journal (quests + brags) |
| Esc | Close panels / pause |

**Quest in one breath:**

> Meadow sword → Dunjunz boss → woodz & dezertz → rescue Prizella → find your Best Bud → more champion nonsense (sewerz, geese, regret).

**Account blurb:**

> Local play needs nothing. Optional guest or magic-link account unlocks **3 cloud save slots** so your Best Bud survives a laptop fire. Almost.

### D. Philosophy (`#why`)

**H2:** The idea

> Games can be free, funny, and finished enough to enjoy without a battle pass breathing down your neck.
>
> Dunjunz is **parody + homage + chaos** — not a clone, not a grind treadmill, not a shopfront wearing a game costume. If something is paywalled later, it will never be power you can only buy. The woodz stay walkable for everyone.

### E. Support (`#support`)

See §5 for model. On-page copy:

**H2:** Keep the candles lit

> Dunjunz is free. Tips are optional, never required, and never buy you a stronger sword.
>
> If the crawler made you laugh, or you want more lands and fewer bugs, you can throw a coin to the bard.

**Primary CTA button:** **Tip the bard on Ko-fi** → `https://ko-fi.com/<USERNAME>`  
**Secondary line:** “Or email vibes / bugs to **support@neasemedia.com** — the Feedback form in-game goes there too.”

**What your tip does (honest list):**

- Hosting, email, and the occasional “why is the goose hitbox like that” night
- More lands, jobs, and Best Bud nonsense
- Keeping the free tier actually free

**What we will not do:**

- Lootboxes, gacha, or surprise-mechanic cash shops  
- Pay-to-win gear or exclusive combat power  
- Fake countdown timers or “only 3 left” pressure  
- Guilt copy (“we can’t survive without you”)

### F. Footer

> © 2026 NeaseMedia. All rights reserved. DUNJUNZ is an original work by NeaseMedia.  
> [Play](/play) · [Support](/#support) · [GitHub](https://github.com/mnease/dunjunz)  
> Hard-refresh after deploys if the shell looks haunted.

---

## 5. Support model recommendation

### Decision (v1)

| Role | Choice | Why |
| --- | --- | --- |
| **Primary CTA** | **Ko-fi one-time tip** (“Tip the bard”) | Lowest ops, ethical tip-jar framing, one link, optional monthly later without redesign, player-friendly not dev-only |
| Secondary (footer / README only) | GitHub Sponsors (if/when enabled) | Free for open-source patrons; weak for non-dev players — do not make it the only path |
| Defer | Patreon | Membership expectations + content cadence burden for a solo browser game |
| Defer | Stripe custom tips | Tax/compliance/UI ownership; worth it after volume, not before |
| Defer | Merch | Fun later; inventory and fulfillment are real work |
| Never (for this game) | Lootboxes, P2W, FOMO scarcity, energy systems for cash | Violates project tone and trust |

### Comparison (short)

| Option | Ops burden | Player fit | Ethical tip-jar | v1? |
| --- | --- | --- | --- | --- |
| Ko-fi | Very low | High | Excellent | **Yes — primary** |
| Buy Me a Coffee | Very low | High | Excellent | Fine alt; pick one to avoid split |
| GitHub Sponsors | Low | Devs | Good | Secondary link |
| Patreon | Medium | Fans of “creators” | OK if no pressure tiers | Later |
| Stripe tips | Medium–high | High if polished | Good | Later |
| In-game shop / cosmetics | High | Mixed | Only if pure cosmetic + no FOMO | Post-v1, careful design |

**Pick one tip platform for v1** so the CTA is not a buffet. Ko-fi wins on “coffee for the dungeon master” metaphor and simple button.

### Setup checklist (ops, ~20 min)

1. Create Ko-fi page: display name **DUNJUNZ** / **NeaseMedia**, avatar = favicon or logo mark.
2. Enable **Donations** (one-time). Optional: low monthly tier later (“Candle fund”) — not required for ship.
3. Turn **off** any shop items that imply in-game power.
4. Goal message example: “Tips keep hosting on and the goose angry.”
5. Copy page URL into landing CTA + README + optional play footer.
6. No need to embed Ko-fi widget iframe for v1 — a clear button is more ADA-friendly and on-brand.

### Copy tone rules (support)

- Grateful, short, funny.
- Always restate: **game is free**.
- Always restate: **tips ≠ power**.
- Never: urgency, scarcity, “supporters are real fans,” paywall tease.
- Button label options (pick one):  
  - **Tip the bard on Ko-fi** (recommended)  
  - **Buy the dungeon a coffee**  
  - **Support the quest**

### What NOT to do (explicit)

1. Monetize progression, loot rarity, or Best Bud strength.  
2. Interstitial “support us” modal on every death / title screen.  
3. Fake limited editions of digital nothing.  
4. Dark-pattern prechecked tips or hard gates before Play.  
5. Split primary CTA across three platforms on the hero.  
6. Promise roadmap deliverables as paid unlocks.

---

## 6. Branding + ADA (must match design-ada-pass-v1)

Reuse tokens from `src/style.css` / `docs/design-ada-pass-v1.md`:

| Role | Spec |
| --- | --- |
| Display | Press Start 2P, ≥10px |
| Body | IBM Plex Mono, 14–16px, line-height ≥1.65 (prefer 1.75) |
| BG | `#0a0c10` |
| Neon / amber / pink | `#7dffb3` / `#ffc857` / `#ff6b9d` |
| Muted | `#a8b0c4` (not dimmer greys) |
| Focus | amber ring `--focus` |
| Touch | min height ~40px |
| Motion | honor `prefers-reduced-motion` |

Landing layout:

- Same max width `--shell-max: 1100px`
- Top menubar brand left / nav right (not center-only stack)
- Sections stacked with clear `h2` hierarchy
- Skip link: “Skip to content” → `#main`
- CTA contrast: neon on dark or amber on dark with solid borders (existing `.btn.primary` / `.nav-btn`)

**Do not:** Inter, white cards, SaaS pricing tables, sub-10px Press Start paragraphs.

---

## 7. GitHub homepage URL

```bash
# from any machine with gh auth
gh repo edit mnease/dunjunz --homepage "https://dunjunz.com"

# verify
gh repo view mnease/dunjunz --json homepage,url
```

Also update human-facing strings in the same PR when landing ships:

- `README.md` — lead with https://dunjunz.com and play link https://dunjunz.com/play  
- `CHANGELOG.md` — live build line  
- `AGENTS.md` — Live URL line  
- Optional: package.json `homepage` field

---

## 8. Domain / Vercel ops checklist

1. Vercel project domain: `dunjunz.com` + `www` → redirect to apex (or vice versa; pick one canonical).  
2. Env: `AUTH_BASE_URL=https://dunjunz.com`  
3. Resend magic-link host matches production.  
4. After deploy: smoke  
   - `/` landing, no Phaser network request  
   - `/play` boots title scene  
   - `/api/health` 200  
   - Feedback POST still works from play shell  
5. Hard-refresh note remains valid for shell CSS.

---

## 9. Landing HTML skeleton (implement as-is)

```html
<!doctype html>
<html lang="en">
  <head>
    <!-- meta + fonts same as play shell -->
    <title>DUNJUNZ — An epic of questionable questing</title>
    <!-- description / og / theme-color -->
  </head>
  <body class="page-landing">
    <a class="skip-link" href="#main">Skip to content</a>
    <div id="shell">
      <header class="topbar" role="banner">
        <div class="topbar-brand">
          <a class="logo" href="/" aria-label="DUNJUNZ home">
            <span class="logo-mark">DUNJUNZ</span>
          </a>
          <p class="tagline">An epic of questionable questing</p>
        </div>
        <nav class="topbar-nav" aria-label="Site">
          <a class="nav-btn nav-btn-ghost" href="#how">How to play</a>
          <a class="nav-btn nav-btn-ghost" href="#support">Support</a>
          <a class="nav-btn nav-btn-primary" href="/play">Play free</a>
        </nav>
      </header>

      <main id="main" class="landing-main">
        <section class="landing-hero" aria-labelledby="hero-title">
          <h1 id="hero-title" class="landing-title">DUNJUNZ</h1>
          <p class="landing-tag">An epic of questionable questing</p>
          <p class="landing-lede"><!-- lede copy --></p>
          <div class="cta-row">
            <a class="btn primary" href="/play">Play free</a>
            <a class="btn ghost" href="#how">How it works</a>
          </div>
          <p class="landing-micro">No install. No lootboxes. Local save works without an account.</p>
        </section>

        <section id="what" class="landing-section"><!-- ... --></section>
        <section id="how" class="landing-section"><!-- ... --></section>
        <section id="why" class="landing-section"><!-- ... --></section>
        <section id="support" class="landing-section">
          <!-- Ko-fi primary CTA -->
          <a class="btn primary" href="https://ko-fi.com/USERNAME" rel="noopener noreferrer" target="_blank">
            Tip the bard on Ko-fi
          </a>
        </section>
      </main>

      <footer class="site-footer" role="contentinfo"><!-- ... --></footer>
    </div>
    <script type="module" src="/src/landing.ts"></script>
  </body>
</html>
```

Add minimal CSS for `.landing-title`, `.landing-lede`, `.landing-section`, `.cta-row` (spacing with existing `--space-*`). Style `a.nav-btn` like buttons (play shell uses `<button>`; landing uses links — share classes, add `text-decoration: none; display: inline-flex;`).

---

## 10. P0 ship list

Implement in one PR if possible.

| # | Task | Done when |
| --- | --- | --- |
| P0.1 | Add `play/index.html` (move game shell) | Game HTML only under `/play` |
| P0.2 | New root landing `index.html` + `src/landing.ts` | `/` has no Phaser |
| P0.3 | Multi-page `vite.config.ts` inputs | `npm run build` emits `dist/index.html` + `dist/play/index.html` |
| P0.4 | Fix `vercel.json` rewrites (no catch-all SPA) | `/play` and `/api/*` work on Preview |
| P0.5 | Landing sections + copy (hero, what, how, why, support) | Matches voice + ADA floors |
| P0.6 | Shared CSS: landing sections + `a.nav-btn` | Visual parity with shell |
| P0.7 | Play shell logo → `/`; skip/brand consistent | Can leave game to landing |
| P0.8 | Ko-fi URL wired (or `#support` placeholder + env note if account pending) | One primary CTA |
| P0.9 | README / CHANGELOG / AGENTS live URLs | `dunjunz.com` + `/play` |
| P0.10 | `gh repo edit … --homepage https://dunjunz.com` | GitHub UI shows domain |
| P0.11 | Deploy Preview smoke: landing, play, `/api/health` | No regressions |
| P0.12 | Commit + push; Unreleased changelog bullet | Per AGENTS.md |

### P1 (next, not blocking)

- OG image (`public/og.png`) pixel art banner  
- Focus-visible polish on landing link-buttons  
- “Prefer play” remembered CTA (opt-in)  
- GitHub Sponsors secondary link  
- Soft `www` → apex redirect verification  
- Landing control table responsive stack  
- Optional `/support` redirect → `/#support`

### Out of scope

- Payment infrastructure in-repo  
- Cosmetics shop  
- Subdomain split  
- i18n  
- Blog / news engine  

---

## 11. Implementation order (Mason, ~1–2 hours)

1. Create `play/` and move game HTML; fix logo href.  
2. Write landing HTML + `landing.ts` + CSS blocks.  
3. Update Vite + Vercel config.  
4. `npm run build && npm run preview` — open `/` and `/play`.  
5. Wire Ko-fi URL (or TODO constant at top of landing).  
6. Docs + changelog + `gh repo edit`.  
7. Push → Vercel Preview → prod when green.  
8. Hive Mind write: `dunjunz-build` / `2026-07-21-landing-support-v1`.

### Risk watch

| Risk | Mitigation |
| --- | --- |
| Catch-all rewrite breaks `/play` | Remove it; explicit `/play` rewrite only |
| Relative asset paths in moved HTML | Keep absolute `/src/main.ts`, `/favicon.svg` |
| Auth cookie path / base URL | Confirm `AUTH_BASE_URL` on custom domain |
| Users bookmarked `/` for game | Big Play CTA; optional later prefer-play |
| Ko-fi not ready | Ship CTA as `mailto:support@neasemedia.com` temporarily; swap URL same day |

---

## 12. Changelog bullet (when shipping code)

```markdown
### Added
- **Marketing landing at `/`** — welcome, how to play, philosophy, optional Ko-fi support; game shell moves to **`/play`**
```

---

## 13. Acceptance criteria

- [ ] `https://dunjunz.com/` shows landing; network tab has no `phaser` chunk  
- [ ] `https://dunjunz.com/play` title screen + continue/new game  
- [ ] `/api/health` OK  
- [ ] Keyboard focus visible on landing CTAs  
- [ ] Support section: free + no P2W language + one primary tip CTA  
- [ ] GitHub repo homepage = `https://dunjunz.com`  
- [ ] CHANGELOG + commit/push  

---

*End of plan. Implement against this doc; update this file only if architecture choice changes.*
