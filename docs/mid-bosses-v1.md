# Mid-level bosses (wardens) — design v1

**Status:** EMA council plan. **P0–P4 shipped** (Floor Captain, Rules Lawyer, Assistant Honk, Deputy Howl, Lease Wight).

**Problem:** After 4× dungeon depth, critical paths are long (Dunjunz ~24 spine rooms, Sewerz ~10) with a single land boss at the end. Creeps + hazards scale, but there is no midpoint *ceremony* — only the gel cube side den on B1 and hard-mode Captain.

**Goal:** Named mid-level fights on the way to each land’s main boss (and optional deep dens), without turning every floor into a boss slog or stealing land-boss thunder.

---

## Council consensus

| Source | Verdict |
| --- | --- |
| **Scout** | Only 4 land bosses today. Dunjunz has zero mid beats on a 24-room spine. Woodz/Dezertz land bosses are surface (3 rooms); deep is post-clear. Any `kind: 'boss'` hits a **generic** `applyBossReward` that sets `bossDefeated` — must special-case mid-bosses. Keep mid rooms **out of** `BOSS_ROOM_META`. |
| **Hexis** | Peaks about every **3 floors**. Mid HP ≈ 50–65% of land-boss *base*, evaluated at *placement* threat (not 55–70% of scaled final). Contact base **3** (elite), not boss **4**. XP base **18**. Soft gates only. Hard mode already +5 threat — no extra HP mult. |
| **Waggle** | Kill “every even floor.” Copy the **gel cube** pattern: identity + one room rule, permanent kill, no portal, no land clear. Job-title comedy (middle management), not second Dungeon Masters. Optional by default; **≤1** soft main-path mid on Dunjunz. |

---

## Design principles (load-bearing)

1. **One ceremony per land** — only land bosses: monologue length, `chestTable: 'boss'`, land clear / princess / champion, **exit portal**, dedicated brag.
2. **Cube is the prototype** — side/optional-first, unique id, permanent kill, joke reward, no portal.
3. **Soft gates only** — never lock stairs behind a mid-boss. Player can run past at skill cost.
4. **No mid exit portals** — `BOSS_ROOM_META` stays land finals only.
5. **Named wardens, not big creeps** — dialog + room geometry + tint; engine verbs only (chase, contact, knockback, peaceful-until-hit, bribe/talk).
6. **Rewards under land boss** — mid table / dungeon loot; never mapz-of-land, never land clear flags.
7. **Cap density** — Dunjunz: 1 main + 1 optional. Others: 1 optional (or 1 light approach if surface path is the only path to the land boss).

---

## Cadence (by path length)

| Land | Floors to land boss | Critical rooms | Mid slots | Notes |
| --- | ---: | ---: | ---: | --- |
| **Dunjunz** | 8 | ~24 | **1 main + 1 optional** | B1 cube already soft-fills early |
| **Sewerz** | 4 | ~10 | **1 optional** | Pre-goose midpoint |
| **Woodz** | surface (3 rooms) | 3 | **0 mandatory + 1 deep optional** | Land boss is early; deep is post-clear |
| **Dezertz** | surface (3 rooms) | 3 | **0 mandatory + 1 deep optional** | Same as Woodz |

Formula Hexis: \(n_{\text{mid}} = \lfloor(F-1)/3\rfloor\) peaks excluding final, then bias optional for short paths.

---

## Roster

### Dunjunz (main crawl)

| Id | Name | Floor / room | Role | Base HP | Contact | Gimmick |
| --- | --- | --- | ---: | ---: | ---: | --- |
| `floor-captain` | **The Floor Captain** | **B4** — convert `b4_side` (or new east arena off hall) | **Main mid** (soft-critical) | **40** | 3 | Redshirt-in-a-cape middle manager. Dialog first (“BADGE CHECK”). Fight = fat HP chase. Optional **bribe 15c** for side chest only; stairs never locked. |
| `rules-lawyer` | **Rules Lawyer** | **B6** — `b6_side` | Optional den | **46** | 3 | Skeleton with a binder. Peaceful until hit *or* chest open (cube dual-path). Talk → small heal / joke mat + forgiven flag. |
| `gel-cube` | Gelatinous Cube | B1 side | Existing soft mid | 30 | 3 | Keep as-is. |

**Not added:** B2/B3/B5/B7 managers.

Scaled HP (progress 0): Captain @ B4 threat≈6 → **~83 HP**; Lawyer @ B6 threat≈9 → **~121 HP**; DM stays **~228**.

### Sewerz

| Id | Name | Floor / room | Role | Base HP | Gimmick |
| --- | --- | --- | --- | ---: | --- |
| `assistant-honk` | **Assistant Honk** | **B2** — `sewerz_b2_side` | Optional | **50** | Goose intern, smaller bill. Named creep + dialog; optional fight. Scaled ~**113 HP** @ threat 7. |

### Woodz (post-clear deep)

| Id | Name | Floor / room | Role | Base HP | Gimmick |
| --- | --- | --- | --- | ---: | --- |
| `deputy-howl` | **Deputy Howl** | **B2** — `woodz_b2_side` | Optional den | **32** | Wolf Lord’s unpaid intern. Pack-as-boss (2 wolves + named tougher lead) *or* single fat wolf + dialog. |

### Dezertz (post-clear deep)

| Id | Name | Floor / room | Role | Base HP | Gimmick |
| --- | --- | --- | --- | ---: | --- |
| `lease-wight` | **Lease Wight** | **B2** — `dezertz_b2_side` | Optional den | **36** | Property manager about the security deposit. Arena = existing depth hazards + fat chase. |

**Why not surface mids on Woodz/Dezertz?** Only 3 rooms to land boss; stacking a mid immediately before Wolf Lord / Sand Wraith is double-ceremony and flattens both jokes. Deep dens honor “across all dungeons” without mandatory homework.

---

## Combat numbers (ship defaults)

```ts
// enemies.ts
ENEMY_BASE_HP.miniboss = 36;
ENEMY_CONTACT_DAMAGE.miniboss = 3;

// progression.ts
ENEMY_XP.miniboss = 18;
```

Room overrides use authored `hp` above; still pass through `resolveEnemyHp` / threat.

| Band | Target hits-to-kill |
| --- | --- |
| Main mid (Captain) @ iron ~3–4 dmg | **~21–28** |
| Optional dens @ on-path / post-land gear | **~10–23** |
| Always | **≪** same-land final at same gear |

**Hard mode:** rely on existing `HARD_THREAT_BONUS = 5` only. Prefer arrow over fireball if projectiles apply. Permanent via `hardKilled` on hard runs.

---

## Systems contract (must ship with content)

### 1. Kill reward path (critical)

Today any unlisted `kind: 'boss'` hits generic `applyBossReward` → sets `bossDefeated` + portal attempt (`GameScene.ts`).

**Required:**

- Prefer new entity kind **`miniboss`** (cleanest), **or** explicit mid-boss id allowlist.
- Mid kill: toast + XP + optional fixed/joke loot + permanent `killed` / `hardKilled`.
- **Never:** `bossDefeated`, `reward*Clear`, `landsCleared`, `ensureBossExitPortal` for mid rooms.
- **Never:** add mid rooms to `BOSS_ROOM_META` / `PORTAL_TILE`.

### 2. Respawn

Treat `miniboss` like `boss` / `cube` in `respawn.ts` (permanent).

### 3. Loot

| Source | Table |
| --- | --- |
| Mid death | Coins 16–32, potion chance, gear ~0.35 **or** 1 mid mat stack |
| Mid room chest | `dungeon` or thin `miniboss` table — **not** `boss` |
| Land boss | unchanged `boss` table + portal |

### 4. Meta / quests / brags

- **No new quests** for mid-bosses.
- Optional single meta brag later: “MIDDLE MANAGEMENT” if ≥N warden kills (v2).
- Journal can list kill ids; no per-warden achievement spam in v1.

### 5. Textures

Tint + prop (clipboard, binder, name tag, tiny bill) before new full sprites. Reuse boss/creep base frames where needed.

---

## Placement implementation sketch

1. **`makeBasementFloor` hook** (optional): when `prefix` matches mid schedule, replace side entities with warden + sign + mid chest.
2. Or **post-process** in `buildDunjunzDeep` / `buildSewerzDeep` / woodz / dezertz after floor gen — override `b4_side`, `b6_side`, `sewerz_b2_side`, `woodz_b2_side`, `dezertz_b2_side`.
3. Room titles: e.g. `BADGE CHECK · B4`, `ERRATA DEN · B6`, `HONKLET OFFICE · B2`.
4. Signs on foyer of those floors: “SIDE: MIDDLE MANAGEMENT.”

Room-validate: still one door per exit; no new orphan mouths.

---

## Ship order (phased)

| Phase | Scope | Exit criteria |
| --- | ---: | --- |
| **P0** | Systems: `miniboss` kind + reward path + respawn + XP/HP tables + tests | No `bossDefeated` on mid kill; tsc + vitest green |
| **P1** | Dunjunz Floor Captain @ B4 only | First clear: iron-ish gear, &lt;35 hits, &lt;3 deaths typical; stairs free |
| **P2** | Dunjunz Rules Lawyer @ B6 optional | Skippable; dual talk/fight |
| **P3** | Sewerz Assistant Honk @ B2 | Optional; no goose interference |
| **P4** | Woodz Deputy Howl + Dezertz Lease Wight deep dens | Optional post-clear; rewards not better than land boss |

Playtest gate after P1 before filling dens.

---

## Explicit non-goals (v1)

- Mid-boss every N floors
- Stair locks / key gates for mids
- Mid land-exit portals
- Relocating Wolf Lord / Sand Wraith into deep (larger redesign)
- Per-mid achievements and quest rows
- New projectile AI trees
- Boss-table chests on mid rooms

---

## Acceptance checklist

- [ ] All four lands have **at least one** named mid-or-warden beat somewhere in their dungeon graph (Dunjunz main; others optional dens or existing cube equivalent).
- [ ] Dunjunz B1→B8 has a midpoint identity fight before the Throne of Meta.
- [ ] Killing a mid never sets land clear / portal / `bossDefeated`.
- [ ] Mid scaled HP &lt; land boss scaled HP on same save.
- [ ] Hard run re-fights mids via `hardKilled` only.
- [ ] `validateRooms` / deep-dungeon tests still pass.
- [ ] CHANGELOG documents wardens + balance intent.

---

## Open product choices (resolve before code if disputed)

1. **B4 side vs B4 hall** for Floor Captain — side = more optional; hall = harder to miss. Council lean: **side with foyer sign** (soft-critical, not hard gate).
2. **Entity kind `miniboss` vs reuse `boss` + allowlist** — lean **`miniboss`** for safety.
3. **Woodz/Dezertz surface micro-elite** — rejected for v1 (too close to land boss); deep dens only.

---

## Source map

- `src/data/world.ts`, `src/data/world-deep.ts` — graphs, land bosses, `makeBasementFloor`
- `src/systems/portal.ts` — land-only exit portals
- `src/systems/threat.ts`, `floor-depth.ts`, `enemies.ts`, `progression.ts` — numbers
- `src/scenes/GameScene.ts` — `applyBossReward`, cube/captain patterns
- `src/systems/respawn.ts` — permanent kills
- Gel cube room `b1_cube` — behavioral prototype
