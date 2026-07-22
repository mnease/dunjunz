# Tutorial state machine (v1) — pure helpers

**Status:** design locked for implement  
**Module:** `src/systems/tutorial.ts` (vitest; no Phaser)  
**Tone:** Guild Master HR + Zelda old-man parody (ALL CAPS dialog)

---

## 1. Flag key

| Key | Where | Meaning |
| --- | --- | --- |
| **`tutorial_complete`** | `save.flags.tutorial_complete` | Stairs into Dunjunz legal |

Progress flags (boolean only — matches `SaveData.flags`):

| Key | Meaning |
| --- | --- |
| `tutorial_armed` | Sword granted/picked (step ≥ `armed`) |
| `tutorial_briefed` | Controls + quest pitch heard (step ≥ `briefed`) |
| `tutorial_complete` | Gate open (step = `complete`) |

No SaveData version bump. Defaults: all absent/`false` → step `meet`.

**Legacy migrate (load path):** if any of  
`hasSword` · `collected` has `starter-sword` · `visitedRooms` has `b1_`/`b2_`… · `bossDefeated` · `landsCleared.length > 0` · `xp > 0` · `level > 1`  
→ set `tutorial_complete` (+ `tutorial_armed` if sword evidence). Veterans never re-orient.

---

## 2. `canUseDungeonStairs(save, room)`

```ts
/** Gate only meadow mouth → B1. All other stairs free. */
export function canUseDungeonStairs(
  save: SaveData,
  room: Pick<RoomDef, 'id' | 'stairsDown'>,
): boolean {
  if (room.id !== 'overworld' || room.stairsDown !== 'b1_entrance') return true;
  return isTutorialComplete(save);
}

export function isTutorialComplete(save: SaveData): boolean {
  return !!save.flags?.tutorial_complete;
}
```

- Block: stand on `S` → **no** `loadRoom`; toast/dialog only.
- East trail / woodz / dezertz / up-stairs / mid-dungeon: **never** gated.
- Softlock guard: meadow always walkable; skip event always available on GM talk.

---

## 3. Steps + `advanceTutorialStep`

```ts
export type TutorialStep = 'meet' | 'armed' | 'briefed' | 'complete';

export type TutorialEvent =
  | 'talk'       // E on Guild Master
  | 'got_sword'  // ground pickup or grant mid-talk
  | 'skip';       // explicit "I GOT THIS"

export const GUILD_MASTER_ID = 'old-man'; // keep id; display name "GUILD MASTER"
// Optional later rename → 'guild-master' with id alias in tryInteract
```

### Derive step (pure)

```ts
export function getTutorialStep(save: SaveData): TutorialStep {
  if (save.flags?.tutorial_complete) return 'complete';
  if (save.flags?.tutorial_briefed) return 'briefed';
  if (
    save.flags?.tutorial_armed ||
    save.hasSword ||
    save.collected.includes('starter-sword')
  ) {
    return 'armed';
  }
  return 'meet';
}
```

### Transitions

| From | Event | To | Side effects |
| --- | --- | --- | --- |
| `meet` | `talk` | `armed` | `grantSword` signal; `tutorial_armed`; dialog phase A |
| `meet` | `got_sword` | `armed` | `tutorial_armed` only (no complete) |
| `meet` | `skip` | `complete` | grant sword if missing; all three flags |
| `armed` | `talk` | `complete` | `tutorial_briefed` + `tutorial_complete`; dialog phase B |
| `armed` | `got_sword` | `armed` | no-op / idempotent |
| `armed` | `skip` | `complete` | grant if missing; complete flags |
| `briefed` | any | `complete` | set complete (safety) |
| `complete` | `talk` | `complete` | post-tutorial dialog only (`questHint`); no flag churn |

```ts
export function advanceTutorialStep(
  save: SaveData,
  event: TutorialEvent,
): {
  save: SaveData;
  step: TutorialStep;
  dialog: string[];
  /** Scene calls grantSword() when true */
  grantSword: boolean;
  toast?: string;
}
```

Immutable: always `{ ...save, flags: { ...save.flags, ... } }`.

### Dialog phases (P0 copy skeleton, ≤5 lines/show)

**Phase A (`meet` + talk):**  
`GUILD MASTER OF… UH… THIS MEADOW.` / `IT'S DANGEROUS TO GO ALONE!` / `SWORD OF MILD ENTHUSIASM — YOURS.` / `SPACE / Z TO SWING.` / `TALK TO ME AGAIN WHEN YOU'RE READY.`

**Phase B (`armed` + talk → complete):**  
`ORIENTATION COMPLETE.` / `STAIRS = DUNJUNZ. EAST = TRAIL.` / `PRINCESS PRIZELLA AIN'T GONNA RESCUE HERSELF.` / `MATHEMATICAL!`

**Skip (any incomplete + skip):**  
`ALREADY A PRO? COOL.` / `STAIRS OPEN. TRY NOT TO DIE.`

**Stairs sealed:**  
`STAIRS LOCKED — GUILD POLICY.` / `TALK TO THE GUILD MASTER FIRST.`

**Post-complete re-talk:** short lore (trim world.ts dump) + `questHint(save)`.

---

## 4. Checklist UI vs dialog multi-phase

| Option | Verdict |
| --- | --- |
| **Interactive quest checklist** (action gates: walk, swing, I, M) | **P1 polish only** |
| **Pure dialog multi-phase** | **P0 ship** |

**Why dialog:** existing `dialog-show` + E pipeline; pure reducers; zero new UI; Zelda-old-man pattern; quest-log already **derives** status (no parallel interactive checklist system).  
**P1 action gates** (Comb UX): optional straw dummy, inventory-open event, mapz pickup — add events to `TutorialEvent` without changing flag keys.

---

## 5. Integration points

| Site | Change |
| --- | --- |
| **`GameScene` stairs** (~4194) | Before `loadRoom(stairsDown)`: if `!canUseDungeonStairs(save, room)` → toast/dialog sealed copy; return |
| **`GameScene.tryInteract` old-man** (~3729) | Replace inline sword+dialog with `advanceTutorialStep(save, 'talk')`; apply save; if `grantSword` → `grantSword(false)`; `dialog-show` result |
| **`GameScene.collectItem` sword** (~3554) | After grant: `advanceTutorialStep(save, 'got_sword')` (armed only; stairs still locked until talk/skip) |
| **`loadSave` / `defaultSave`** | Call `migrateTutorial(save)` once on load |
| **`world.ts` NPC** | Keep `id: 'old-man'`; rewrite `dialog` to short post-complete base (live lines from pure module preferred) |
| **quest-log (optional P1)** | Entry `side-tutorial`: locked/active/done from `getTutorialStep` |
| **Not in P0** | Auto-talk on spawn, dummy enemy, forje/shop/Hard/Army teaching |

Skip UX: second E option **or** last line of phase A offers skip on next talk — simplest P0: long-press unused; use **re-talk while armed completes** + dedicated skip only if `event === 'skip'` from holding a line choice later. **P0 skip path:** if player has sword and talks once more → complete (phase B). True skip without phase B: emit `skip` from same talk when step is `meet` if we add a CLOSE-as-skip — **decide:** Phase A talk does **not** complete; player must talk twice **or** we complete on phase A for max ship speed.

### P0 decisive ship rule

**One talk completes orientation** (meet → complete in single `talk` if we also grant sword), **or** two talks (meet→armed, armed→complete).  

**Lock: two-step talk** (sword, then brief+open). Skip event still one-shot complete for testers/vets who somehow miss migrate.

---

## 6. P0 vs P1

### P0 (minimum ship) — ~1 file + 3 call sites

1. `src/systems/tutorial.ts` — flag consts, get/advance/canUse/migrate  
2. Stairs gate in `GameScene`  
3. Talk handler → `advanceTutorialStep(..., 'talk')`  
4. Sword pickup → `got_sword`  
5. `migrateTutorial` on load  
6. Vitest cases below  
7. `CHANGELOG.md` Unreleased bullet  

**Out of P0:** rename id, dummy, action gates, quest-log row, auto-greet, blocked-stairs tile art.

### P1 polish

1. Action events: `moved`, `swung`, `opened_bag`, `opened_mapz`  
2. Straw dummy 1 HP / 0 contact  
3. Display name / id `guild-master` + alias  
4. Quest-log side entry  
5. Stairs seal VFX / padlock tint  
6. First-enter auto `dialog-show` if step `meet` and room `overworld`  
7. Skip line in UI (NEXT vs SKIP)

---

## 7. Test cases (`rpg-systems.test.ts` or `tutorial.test.ts`)

| # | Case |
| --- | --- |
| 1 | `defaultSave` → step `meet`, `!isTutorialComplete`, `!canUseDungeonStairs(overworld)` |
| 2 | `canUseDungeonStairs` true for non-overworld rooms always |
| 3 | `canUseDungeonStairs` true for overworld when `tutorial_complete` |
| 4 | `talk` from `meet` → `armed`, `grantSword: true`, `tutorial_armed` |
| 5 | `talk` from `armed` → `complete`, all flags, stairs open |
| 6 | `got_sword` from `meet` → `armed`, stairs still closed |
| 7 | `skip` from `meet` → `complete` + `grantSword: true` |
| 8 | `skip` from `armed` → `complete`, grant only if no sword |
| 9 | `talk` when `complete` → step stays, flags unchanged, dialog uses hint path |
| 10 | advance is pure (input save not mutated) |
| 11 | `migrateTutorial`: sword/b1 visit/xp → complete |
| 12 | `migrateTutorial`: fresh meadow → no complete |
| 13 | double `talk` meet is idempotent enough (second talk if already armed advances to complete) |
| 14 | overworld `stairsDown` other target (if any) not gated — contract: only `b1_entrance` |

---

## 8. File sketch

```
src/systems/tutorial.ts     // pure
src/systems/tutorial.test.ts // or append rpg-systems.test.ts
src/scenes/GameScene.ts      // 3 hooks
src/systems/save.ts          // migrateTutorial in loadSave
docs/tutorial-state-machine-v1.md
```

## 9. Acceptance (P0)

1. New game: stairs toast-block until Guild Master orientation finishes.  
2. After complete: stairs → `b1_entrance` as today.  
3. Old saves: no block.  
4. All tutorial logic unit-tested with zero Phaser imports.
