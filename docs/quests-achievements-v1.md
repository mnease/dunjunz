# Quests + Achievements (v1 design)

Shippable design for Dunjunz. Pure systems under `src/systems/`; Phaser panel UI (not HTML footer). Tone: bard bragz, not corporate unlocks.

**Status:** design-only (2026-07-21). Implement when greenlit.

---

## 0. Existing facts (do not reinvent)

| Concern | Where |
| --- | --- |
| Save shape | `SaveData` v5 in `src/types.ts` |
| Main path hints | `questHint` in `src/systems/quest.ts` |
| Land clear + princess | `landsCleared`, `princessSaved`, `bossDefeated` |
| Best Bud stages | `bestBudStage`: none → offered → accepted → found → complete |
| Champion board | `activeQuestId`, `questsCompleted`, `CHAMPION_QUESTS` in `champion-quests.ts` |
| Toast | `UIScene.showToast` / `game.events.emit('toast', msg)` |
| Modal panels | Inventory `I`, Mapz `M`, shop, forjing — Phaser rectangles + text |
| HTML modals | Settings / Account / Feedback only (meta, not play-state) |
| Death | `GameScene.die()` → meadow, **no death counter yet** |
| Boss kill ids | `dungeon-master`, `wolf-lord`, `sand-wraith`, `royal-goose` |

**Principle:** Quest **status is mostly derived** from fields already on `SaveData`. Achievements need a small unlock list + a few counters.

---

## 1. Data model (`SaveData`)

Stay on **version: 5**. Backfill in `withV5Fields` / `defaultSave` (same pattern as `questsCompleted`).

```ts
// types.ts — additions on SaveData
/** Unlocked achievement ids (stable catalog keys). */
achievementsUnlocked: string[];

/**
 * Lightweight run stats for brag conditions.
 * Only store what cannot be cheaply derived from killed/collected/lands/etc.
 */
stats: {
  deaths: number;
  kills: number;       // any hostile kill (not best_bud / npc)
  shopBuys: number;    // successful purchase count
  shopSells: number;
  forjes: number;      // successful craft or enhance
  potionsDrunk: number;
  roomsVisitedPeak: number; // max unique visitedRooms length seen (optional; can derive)
};
```

### Defaults / migration

```ts
// defaultSave + withV5Fields
achievementsUnlocked: [],
stats: {
  deaths: 0,
  kills: 0,
  shopBuys: 0,
  shopSells: 0,
  forjes: 0,
  potionsDrunk: 0,
  roomsVisitedPeak: 0,
},
```

`loadSave` always:

```ts
achievementsUnlocked: Array.isArray(s.achievementsUnlocked) ? s.achievementsUnlocked : [],
stats: {
  deaths: n(s.stats?.deaths),
  kills: n(s.stats?.kills),
  // ...
},
```

Also call `reconcileStatsFromSave(save)` once on load to bump `roomsVisitedPeak` from `visitedRooms.length` and (optional) re-scan achievements for old saves that already cleared bosses.

### What NOT to store

- Do **not** duplicate quest stage enums for main path (derive from `landsCleared` / `princessSaved`).
- Do **not** store `achievementsSeen` / notification queue on save for v1 — fire toast at unlock time only; if player misses toast, list still shows unlocked.
- Do **not** store timestamps unless needed later.
- Do **not** put achievement progress percentages in save (compute at read time).

### Cloud / slots

Cloud blob is opaque JSON. New fields ride for free. Mirror defaults in `api/lib/default-save.ts` when implementing.

---

## 2. Quest catalog — unify main / side / champion

### 2.1 Types

```ts
// src/systems/quest-log.ts

export type QuestTrack = 'main' | 'side' | 'champion';

/** Player-facing list status (derived, never stored). */
export type QuestListStatus =
  | 'locked'    // not yet available; show as ??? or short tease
  | 'available' // can start / should talk to NPC
  | 'active'    // in progress
  | 'done'      // complete
  | 'optional';  // available forever but skippable (Woodz)

export interface QuestCatalogEntry {
  id: string;
  track: QuestTrack;
  /** Sort key within track (lower first). */
  order: number;
  title: string;
  /** One-line flavor when known. */
  blurb: string;
  /** Spoiler-safe tease when locked. */
  lockedTease: string;
  /**
   * Optional champion registry id (sewerz-goose) or best-bud synthetic.
   * When set, assign/complete stays in existing champion/best-bud modules.
   */
  championId?: string;
}

export interface QuestListRow {
  id: string;
  track: QuestTrack;
  title: string;
  status: QuestListStatus;
  /** Progress line under title (stage, hint, or "DONE"). */
  detail: string;
  /** Hide title spoilers when locked. */
  spoilerHidden: boolean;
}
```

### 2.2 Catalog (static)

```ts
export const QUEST_CATALOG: readonly QuestCatalogEntry[] = [
  // ── MAIN ──────────────────────────────────────────────
  {
    id: 'main-enter-dunjunz',
    track: 'main',
    order: 10,
    title: 'INTO THE DUNJUNZ',
    blurb: 'Stairs in the meadow. Bonk the Dunjun Master. Politely.',
    lockedTease: 'SOMETHING UNDER THE MEADOW HUMS WEIRD.',
  },
  {
    id: 'main-find-prizella',
    track: 'main',
    order: 20,
    title: 'FIND PRINCESS PRIZELLA',
    blurb: 'She got yeeted. Follow the breadcrumb of bad news.',
    lockedTease: 'A PRINCESS-SHAPED HOLE IN THE PLOT.',
  },
  {
    id: 'main-dezertz-rescue',
    track: 'main',
    order: 30,
    title: 'DEZERTZ RESCUE',
    blurb: 'South of the trail. Tower. Wraith. Sandy mad royalty.',
    lockedTease: 'SAND. HOT. PROBABLY IMPORTANT.',
  },
  {
    id: 'main-rescue-complete',
    track: 'main',
    order: 40,
    title: 'PRINCESS: SAVED',
    blurb: 'You did the thing. Kingdom duty resumes. Champion work opens.',
    lockedTease: 'THE SONG ENDS WHEN SHE DOESN\'T.',
  },

  // ── SIDE ──────────────────────────────────────────────
  {
    id: 'side-woodz',
    track: 'side',
    order: 10,
    title: 'WOODZ SIDE BITE',
    blurb: 'Optional wolf problems north of the trail. Good forjing mats.',
    lockedTease: 'TREES THAT BITE. OPTIONAL TREES.',
  },

  // ── CHAMPION ──────────────────────────────────────────
  {
    id: 'champ-best-bud',
    track: 'champion',
    order: 10,
    title: 'CHAMPION JOB #1: BEST BUD',
    blurb: 'Find a weird loyal non-human. Report back. Don\'t make it a wedding.',
    lockedTease: 'LONELY AS A FORJE. FIX THAT LATER.',
    championId: 'best-bud', // synthetic; not in CHAMPION_QUESTS
  },
  {
    id: 'champ-sewerz-goose',
    track: 'champion',
    order: 20,
    title: 'CHAMPION JOB #2: ROYAL SEWERZ',
    blurb: 'Goose. Scrolls. Honk chamber under the courtyard.',
    lockedTease: 'SOMETHING HONKS UNDER THE CASTLE.',
    championId: 'sewerz-goose', // CHAMPION_QUESTS id
  },
];
```

**Extension hook:** New champion jobs = append `CHAMPION_QUESTS` **and** a matching `QUEST_CATALOG` row with `championId`. Prefer a helper later:

```ts
// v1.1 optional: auto-append champion rows from CHAMPION_QUESTS
function championCatalogRows(): QuestCatalogEntry[]
```

v1 can keep the dual list tiny (2 champion rows).

### 2.3 Status derivation (`questStatus(save, entry)`)

```ts
export function questStatus(save: SaveData, id: string): QuestListStatus {
  switch (id) {
    case 'main-enter-dunjunz':
      if (save.landsCleared.includes('dunjunz') || save.bossDefeated) return 'done';
      return 'active'; // always the opening job

    case 'main-find-prizella':
      if (save.princessSaved) return 'done';
      if (save.landsCleared.includes('dunjunz') || save.bossDefeated) return 'active';
      return 'locked';

    case 'main-dezertz-rescue':
      if (save.princessSaved || save.landsCleared.includes('dezertz')) return 'done';
      if (save.landsCleared.includes('dunjunz') || save.bossDefeated) return 'active';
      // available once player knows she was moved (same as post-dunjunz)
      return 'locked';

    case 'main-rescue-complete':
      return save.princessSaved ? 'done' : 'locked';

    case 'side-woodz':
      if (save.landsCleared.includes('woodz')) return 'done';
      if (save.landsCleared.includes('dunjunz') || save.bossDefeated) return 'optional';
      return 'locked';

    case 'champ-best-bud': {
      if (!save.princessSaved) return 'locked';
      const s = save.bestBudStage ?? 'none';
      if (s === 'complete') return 'done';
      if (s === 'none') return 'available'; // talk to Princess Prizella
      return 'active'; // offered|accepted|found
    }

    case 'champ-sewerz-goose': {
      if (!save.princessSaved || save.bestBudStage !== 'complete') return 'locked';
      if ((save.questsCompleted ?? []).includes('sewerz-goose')) return 'done';
      if (save.activeQuestId === 'sewerz-goose') return 'active';
      return 'available'; // throne will assign
    }

    default: {
      // Future champion ids: generic board rules
      const entry = QUEST_CATALOG.find((q) => q.id === id);
      const cid = entry?.championId;
      if (cid && cid !== 'best-bud') {
        if (!save.princessSaved || save.bestBudStage !== 'complete') return 'locked';
        if ((save.questsCompleted ?? []).includes(cid)) return 'done';
        if (save.activeQuestId === cid) return 'active';
        // only "available" if it is the next assignable (or already flag)
        return 'locked'; // safer: hide until assignable
      }
      return 'locked';
    }
  }
}
```

### 2.4 Detail lines

Reuse existing hint helpers; do not rewrite dialogue:

```ts
export function questDetail(save: SaveData, id: string): string {
  const st = questStatus(save, id);
  if (st === 'done') return 'DONE. MATHEMATICAL.';
  if (st === 'locked') return QUEST_CATALOG.find(q => q.id === id)?.lockedTease ?? '???';

  switch (id) {
    case 'main-enter-dunjunz':
    case 'main-find-prizella':
    case 'main-dezertz-rescue':
      return (questHint(save)[0] ?? 'SAVE THE PRINCESS.').slice(0, 48);
    case 'side-woodz':
      return 'WOODZ NORTH. WOLF LORD OPTIONAL.';
    case 'champ-best-bud': {
      const lines = bestBudQuestHint(save);
      return (lines[0] ?? 'FIND A BUD.').slice(0, 48);
    }
    case 'champ-sewerz-goose': {
      const lines = championQuestHint(save);
      return (lines[0] ?? 'THRONE JOB.').slice(0, 48);
    }
    default:
      return '';
  }
}
```

### 2.5 List builder (UI)

```ts
export function buildQuestList(save: SaveData): QuestListRow[] {
  return QUEST_CATALOG
    .slice()
    .sort((a, b) => a.track.localeCompare(b.track) || a.order - b.order)
    .map((q) => {
      const status = questStatus(save, q.id);
      const spoilerHidden = status === 'locked';
      return {
        id: q.id,
        track: q.track,
        title: spoilerHidden ? '???' : q.title,
        status,
        detail: questDetail(save, q.id),
        spoilerHidden,
      };
    });
  // v1: show locked rows as ??? (encourages exploration). Optional filter later.
}

export function questSummaryLine(save: SaveData): string {
  // HUD row-2 mark — replace ad-hoc Q/★/JOB
  const rows = buildQuestList(save);
  const active = rows.find((r) => r.status === 'active' || r.status === 'available');
  if (!active) return '★';
  if (active.track === 'champion') return 'JOB';
  return 'Q';
}
```

### 2.6 How main / side / champion unify

| Layer | Source of truth | Catalog role |
| --- | --- | --- |
| Main story beats | `landsCleared`, `princessSaved`, `bossDefeated` | Read-only progress rows |
| Side (Woodz) | `landsCleared` includes woodz | Optional status |
| Best Bud | `bestBudStage` + existing `best-bud.ts` | Champion track #1 |
| Board quests | `activeQuestId` / `questsCompleted` + `champion-quests.ts` | Champion track #2+ |

**Do not** route assign/complete through `quest-log.ts`. Keep mutators in `quest.ts` / `best-bud.ts` / `champion-quests.ts`. Quest-log is **read model + list UI**.

---

## 3. Achievements (“BRAGZ”)

### 3.1 Types

```ts
// src/systems/achievements.ts

export type BragCategory =
  | 'combat'
  | 'explore'
  | 'buddy'
  | 'shop'
  | 'death'
  | 'boss'
  | 'forje'
  | 'quest'
  | 'misc';

export interface AchievementDef {
  id: string;
  /** Funny player-facing name (ALL CAPS ok). */
  title: string;
  /** Bard line when unlocked / in list. */
  blurb: string;
  category: BragCategory;
  /** Hidden until unlocked (??? in list). */
  secret?: boolean;
  /**
   * Pure check against current save.
   * Prefer derived state; use stats.* for counters.
   */
  isComplete: (save: SaveData) => boolean;
}

export interface UnlockResult {
  save: SaveData;
  /** Newly unlocked defs this tick (0–N). */
  unlocked: AchievementDef[];
}
```

### 3.2 Catalog (18 concrete IDs)

| id | title | blurb | condition |
| --- | --- | --- | --- |
| `brag-first-blood` | FIRST BLOOD (ISH) | The bard marks one (1) bonk. | `stats.kills >= 1` |
| `brag-slime-squisher` | GELATINOUS HABIT | Ten things that jiggle less now. | count killed with kind slime hard — **v1:** `stats.kills >= 10` |
| `brag-centurion` | CENTURION OF MEH | One hundred creeps. The meadow is quieter. | `stats.kills >= 100` |
| `brag-dunjun-master` | POLITE FACEPLANT | Dunjun Master down. She wasn't even here. | `killed` has `dungeon-master` OR `landsCleared` has dunjunz / `bossDefeated` |
| `brag-wolf-lord` | HOWL CANCELLED | Wolf Lord hits dirt. Trees do a little clap. | `killed` has `wolf-lord` OR woodz cleared |
| `brag-sand-wraith` | SANDY POOF | Sand Wraith *poof*. Princess Prizella brush-off pending. | `killed` has `sand-wraith` OR dezertz/princess |
| `brag-royal-goose` | HONK BROKEN | You beat a magical rude goose. Plumbers will sing. | `killed` has `royal-goose` OR questsCompleted sewerz |
| `brag-prizella-saved` | NOT A SIDEKICK | You saved the Princess. Champion energy unlocked. | `princessSaved` |
| `brag-best-buds` | PLATONIC. CRISPY. COOL. | Official Best Bud. Don't make it a wedding. | `bestBudStage === 'complete'` |
| `brag-bud-fighter` | ELASTIC JUSTICE | Your bud landed a fight contribution (or bud level ≥ 2). | `budLevel >= 2` OR flag `bud_got_kill` if you add one — **v1:** `budLevel >= 2` |
| `brag-mapz-nerd` | MAPZ NERD | You unfurled three land mapz. | `discoveredMapz.length >= 3` |
| `brag-cartographer` | CARTOGRAPHER OF WEIRD | All known mapz found (surface+dunjunz+woodz+dezertz+kingdomz). | every of those lands in `discoveredMapz` (sewerz optional bonus) |
| `brag-first-forje` | SPARKS FLEW | You forjed something. The anvil remembers. | `stats.forjes >= 1` |
| `brag-forje-habit` | ANVIL REGULAR | Five forjes. Smells like ambition and ore. | `stats.forjes >= 5` |
| `brag-window-shopper` | WINDOW SHOPPER | Bought something. Capitalism, but cute. | `stats.shopBuys >= 1` |
| `brag-merchant-friend` | TINKERER'S FAVORITE | Five buys. The shopkeeper almost smiles. | `stats.shopBuys >= 5` |
| `brag-die-once` | BARD MATERIAL | You died. The song will not be flattering. | `stats.deaths >= 1` |
| `brag-die-a-lot` | RESPAWN CONNOISSEUR | Ten trips back to the meadow. Still cool. | `stats.deaths >= 10` |
| `brag-level-five` | MID BOSS ENERGY | Hit hero level 5. Numbers go brrr. | `level >= 5` |
| `brag-full-pockets` | HEAVY POCKETS | 100+ coins at once. Don't get mugged by a goose. | `coins >= 100` |

That's **20** — ship all or trim to 16 by dropping `brag-centurion` + `brag-cartographer` if timeboxed.

**Secret example (optional v1):** `brag-punch-bud` — hit Best Bud once (GameScene already toasts "OW. RUDE."). Set flag `punched_bud` or count; title: `RUDE GEOMETRY`. Secret until unlocked.

### 3.3 Unlock pipeline

```ts
export function ensureStats(save: SaveData): SaveData { /* backfill stats */ }

export function evaluateAchievements(save: SaveData): UnlockResult {
  let next = ensureStats(save);
  const unlocked: AchievementDef[] = [];
  const have = new Set(next.achievementsUnlocked ?? []);

  for (const def of ACHIEVEMENTS) {
    if (have.has(def.id)) continue;
    if (!def.isComplete(next)) continue;
    have.add(def.id);
    unlocked.push(def);
  }

  if (!unlocked.length) return { save: next, unlocked: [] };

  next = {
    ...next,
    achievementsUnlocked: [...have],
  };
  return { save: next, unlocked };
}
```

**Call sites** (after save mutation, before/after `writeSave`):

| Event | File | stats bump + evaluate |
| --- | --- | --- |
| Hostile kill | `GameScene` on enemy death | `kills++` |
| Player death | `GameScene.die` | `deaths++` |
| Boss clear / land reward | already in quest rewards | evaluate only |
| Best bud complete | `completeBestBudQuest` | evaluate |
| Quest complete | `completeActiveQuest` | evaluate |
| Shop buy/sell | `shop.ts` attemptBuy/Sell success | shopBuys/Sells++ |
| Forjing success | `forjing.ts` craft/enhance ok | forjes++ |
| Potion use | GameScene / inventory | potionsDrunk++ |
| Mapz discover | `discoverMapz` | evaluate |
| Level-up | progression path | evaluate |
| Load save | `loadSave` end | `evaluateAchievements` once (retroactive unlocks, **no toast** on load — or toast only if you track session flag) |

**Toast policy:**

- In-session unlock → `emit('toast', \`NEW BRAG: ${def.title}\`)` (queue if multiple: show first, then next after toast ends, max 3).
- On load retroactive → silent add to list only (`evaluateAchievements` with `{ silent: true }`).

**Coins / rewards:** v1 = **brag only**. Optional hook:

```ts
// future
reward?: { coins?: number; stack?: [string, number] }
```

Do not implement reward grants in v1.

### 3.4 List for UI

```ts
export function buildBragList(save: SaveData): {
  id: string;
  title: string;
  blurb: string;
  unlocked: boolean;
  category: BragCategory;
}[] {
  const have = new Set(save.achievementsUnlocked ?? []);
  return ACHIEVEMENTS.map((d) => {
    const unlocked = have.has(d.id);
    const hide = d.secret && !unlocked;
    return {
      id: d.id,
      title: hide ? '???' : d.title,
      blurb: hide ? 'THE BARD REFUSES TO SPOIL IT.' : d.blurb,
      unlocked,
      category: d.category,
    };
  });
}
```

---

## 4. UI surface

### 4.1 Recommendation: **Phaser journal panel** (not HTML footer)

| Option | Pros | Cons |
| --- | --- | --- |
| HTML footer modal | ADA freeform, easy scroll | Breaks CRT immersion; focus leaves game; not how inv/mapz work |
| **Phaser panel (like mapz)** | Same pause model, font, depth stack, keyboard | Text wrapping care; a11y via high contrast + keys |

**Ship Phaser.** HTML stays for Settings/Account/Feedback.

### 4.2 Keys

| Key | Action |
| --- | --- |
| **J** | Toggle Journal (Quests + Bragz). Free key (not equip). |
| **← / →** or **Tab** | Switch tab: QUESTS ↔ BRAGZ |
| **↑ / ↓** | Move selection / scroll |
| **Esc** or **J** | Close |
| **Enter** | Optional: expand detail line (v1 can skip — detail always visible under selection) |

HUD hints row: add `[J] LOG` when journal is useful (always after game start, or after first Q mark).

Close mutual exclusion: opening Journal closes inventory/mapz/shop/forjing/dialog advance lock same as mapz. Emit `journal-state` boolean like `mapz-state`.

### 4.3 Layout (768×576 game area, below HUD)

```
┌─────────────────────────────────────────────┐
│  JOURNAL                          [J] CLOSE │
│  [ QUESTS ]   BRAGZ                         │  ← tab highlight
├─────────────────────────────────────────────┤
│  MAIN                                       │
│  ▸ INTO THE DUNJUNZ              ACTIVE     │
│    Stairs in the meadow…                    │
│    FIND PRIZESZ…                 LOCKED     │
│  SIDE                                       │
│    WOODZ SIDE BITE               OPTIONAL   │
│  CHAMPION                                   │
│    JOB #1 BEST BUD               —          │
├─────────────────────────────────────────────┤
│  ↑↓ MOVE  ←→ TAB  J/ESC CLOSE               │
└─────────────────────────────────────────────┘
```

Bragz tab:

```
│  BRAGZ  4/18                                    │
│  ▸ POLITE FACEPLANT                    ★        │
│    Dunjun Master down…                          │
│    ???                                 ·        │  secret locked
│    FIRST BLOOD (ISH)                   ★        │
```

**Status glyphs (color, high contrast on dark panel):**

| Status | Glyph | Color |
| --- | --- | --- |
| locked | · | `#6a6578` |
| available | ! | `#ffc857` gold |
| active | ▸ | `#7dffb3` green |
| done | ★ | `#ff6b9d` pink |
| optional | ~ | `#7dffb3` dim |

Panel: `COLORS.panel` / `panelBorder`, Press Start 2P 8–10px, same as inventory.

### 4.4 ADA

- Never rely on color alone — always glyph + word (`ACTIVE` / `DONE`).
- Min contrast: green/gold/pink on `#12161f` (existing palette).
- Keyboard-only complete path (no mouse required).
- Respect `reduceMotion` (no shake on unlock; toast fade ok).
- Toast text short (≤ ~28 chars title) so it fits.

### 4.5 Unlock toast copy

**Never:** `Achievement Unlocked!!!`

**Do:**

- `NEW BRAG: POLITE FACEPLANT`
- `BARD NOTES: HONK BROKEN`
- Multi: queue; optional second line unused in v1

SFX: reuse `ui_open` or `level-up` lightly once per unlock.

---

## 5. Implementation file plan

| File | Action |
| --- | --- |
| `src/types.ts` | Add `achievementsUnlocked`, `stats` |
| `src/systems/save.ts` | default + migrate backfill; optional silent evaluate |
| `api/lib/default-save.ts` | Mirror new fields |
| `src/systems/quest-log.ts` | **NEW** catalog + `buildQuestList` / status / HUD helper |
| `src/systems/achievements.ts` | **NEW** catalog + evaluate + buildBragList + ensureStats |
| `src/systems/rpg-systems.test.ts` | Tests: status matrix, unlock idempotent, migration |
| `src/scenes/UIScene.ts` | Journal chrome + render + toast queue for brags |
| `src/scenes/GameScene.ts` | Key J; kill/death stat bumps; call evaluate; emit toast |
| `src/systems/shop.ts` | On buy/sell success → bump + evaluate (return save) |
| `src/systems/forjing.ts` | On success → bump + evaluate |
| `src/systems/quest.ts` / best-bud / champion-quests | evaluate after major completions (or only GameScene if all saves funnel) |
| `src/systems/mapz.ts` | evaluate after discoverMapz (optional) |
| `index.html` help line | `J journal` |
| `CHANGELOG.md` | Unreleased bullets when shipping |

**Suggested pure API surface:**

```ts
// quest-log.ts
buildQuestList(save): QuestListRow[]
questSummaryLine(save): string

// achievements.ts
bumpStat(save, key, by=1): SaveData
evaluateAchievements(save, opts?: { silent?: boolean }): UnlockResult
buildBragList(save)
ACHIEVEMENTS / QUEST_CATALOG exports for tests
```

**Wire pattern in GameScene:**

```ts
private afterProgress(mutated: SaveData): void {
  const { save, unlocked } = evaluateAchievements(mutated);
  this.save = save;
  writeSave(save);
  for (const u of unlocked) {
    this.game.events.emit('toast', `NEW BRAG: ${u.title}`);
  }
  this.game.events.emit('hud-update', save);
}
```

Prefer funneling through one helper so shop/forjing pure functions return save and GameScene/UIScene call `afterProgress`.

---

## 6. What NOT to do in v1

1. **No HTML achievements page** / Steam-style grid website.
2. **No save version bump to 6** unless fields force it — backfill on v5.
3. **No coin/item rewards** on brags (hook only).
4. **No achievement sync server-side** beyond opaque cloud blob.
5. **No progress bars** ("12/100 kills") in UI — optional later; counters stay internal.
6. **No rewriting champion assign flow** into a generic quest engine.
7. **No daily/weekly** / meta battle-pass nonsense.
8. **No pop-up modal blocking** for brags — toast only.
9. **No spoiler titles** for locked secret brags or unrevealed quest names.
10. **No death penalty** beyond existing respawn; death brags are comic only.
11. **No dependency** on Phaser inside `quest-log.ts` / `achievements.ts`.
12. **Don't** store quest list status on save (derive always).

---

## 7. Test matrix (minimum)

```
quest-log
  fresh save → main-enter active; others locked/optional false
  after dunjunz clear → find-prizella active; woodz optional
  princessSaved → main rows done; best-bud available
  bestBud complete + no active → sewerz available
  sewerz activeQuestId → active; after complete → done

achievements
  evaluate twice → no duplicate ids
  kill bump → first-blood
  boss flags → boss brags without needing stats
  load old save without stats → backfill + retro unlocks silent
```

---

## 8. Tone checklist (Waggle)

- Copy uses intentional misspellings only where world already does (mapz, forjing, princesz, dunjunz, sewerz).
- Brag names are jokes a bard would yell, not enterprise badges.
- Locked quests say ??? not "Complete previous content in the Quest Hub".
- Optional Woodz never guilt-trips ("you skipped") — status `OPTIONAL` / `~` only.

---

## 9. Ship order

1. Types + save migrate + pure quest-log + pure achievements + tests  
2. Stat bumps at kill/death/shop/forje  
3. evaluateAchievements wiring + toasts  
4. Journal panel + key J + HUD hint  
5. CHANGELOG + commit/push  

Estimated: one focused session for systems+tests; one for UI polish.
