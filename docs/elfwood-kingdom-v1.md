# Enchanted Woodz + Wood Elf Kingdom — LOCKED design v1

**Status:** LOCKED (EMA Council 2026-07-22). Implementable. No debate in PR — follow this doc.  
**Tone:** Dunjunz humor, Zelda-like. Intentional misspellingz. Player identity binary gender only (already in save). Queen NPC is fine.  
**Repo systems reused:** rooms (`world.ts`), tree scale + trunk colliders, NPC/sign E-talk, portal walk-on, water/pond, quest-log side entries, flags, stacks, `openLootBox` special boxes, mintItem legendary.

---

## 0. Existing anchors (do not reinvent)

| Fact | Value |
| --- | --- |
| Authored room size | 16×11 tiles |
| Woodz surface rooms | `woodz_path` (1,1) → `woodz_edge` (1,2) → `woodz_deep` (1,3); east `woodz_hollow` (2,2) |
| Tree scale API | `EntityDef.scale` (meadow ~2.2–2.8; trunk collider shrinks when `scale > 1.5`) |
| Lands | `LandId`: surface \| dunjunz \| woodz \| dezertz \| kingdomz \| sewerz |
| Special loot box pattern | `crawler_starter_box` + `openLootBox` branch (not tier pool) |
| Quest journal sides | `quest-log.ts` `sideEntries()` derived from flags / killed |
| Materials already in world | `wood_shard`, `wolf_pelt` stacks |

---

## A. Room graph (LOCKED)

### Land id

**Reuse `land: 'woodz'` for all new rooms.**  
Do **not** add `elfwoodz` to `LandId` in v1 (no mapz texture, LANDS table, hard-mode land, portal table churn).  
Kingdom is a **pocket realm** still tagged woodz; map fog uses free west/north coords.

### Giant trees (existing rooms)

Apply redwood-scale trees on **all four** current woodz surface rooms. Keep dirt/door corridors clear.

| Room | Tree action |
| --- | --- |
| `woodz_path` | Set existing 6 trees to scale **4.8–5.5**; nudge off path (cols 2–3 / 12–13 only) |
| `woodz_edge` | Scale **5.0–6.0** on corners; remove or move center-ish trees (x:6,y:3 and x:9,y:7) if they choke doors |
| `woodz_hollow` | Scale **4.5–5.5** corners; pond shore stays walkable |
| `woodz_deep` | Scale **4.5–5.2** corners only (boss arena center clear) |

Add **optional** 0–2 extra giants per room max if empty corners exist. No new entity kind — `kind: 'tree'` + `scale`.

Sign copy refresh (example `woodz-sign`):

```
THE ENCHANTED WOODZ — TREES GOT IDEAS.
NORTH: WOLF LORD (STILL RUDE).
WEST: A GLADE THAT HUMS. PROBABLY FINE.
EAST: BEST BUD HOLLOW.
```

### New rooms (6 total)

| Room id | Title | mapX | mapY | land | Links |
| --- | --- | --- | --- | --- | --- |
| `woodz_glade` | RIDDLE GLADE · WOODZ | 0 | 2 | woodz | east → `woodz_edge`; north → `woodz_arch` |
| `woodz_arch` | LIVING ARCH · WOODZ | 0 | 3 | woodz | south → `woodz_glade` |
| `elfwood_gate` | ELVEN GATE · WOOD ELVES | -1 | 2 | woodz | east → `elfwood_waters`; south → `elfwood_thicket` |
| `elfwood_waters` | HEALING WATERS · WOOD ELVES | -2 | 2 | woodz | west → `elfwood_gate`; north → `elfwood_court` |
| `elfwood_court` | QUEEN'S COURT · WOOD ELVES | -2 | 3 | woodz | south → `elfwood_waters` |
| `elfwood_thicket` | BLIGHTED THICKET · WOOD ELVES | -1 | 1 | woodz | north → `elfwood_gate` |

**Graph edit on existing:**

```
woodz_edge.west = 'woodz_glade'
```

Bidirectional: `woodz_glade.east = 'woodz_edge'`.

**Portal (not edge link):** `woodz_arch` portal ↔ `elfwood_gate` (return portal in gate).

```
          [woodz_deep]
               |
[woodz_arch]—[woodz_edge]—[woodz_hollow]
     |             |
[woodz_glade]  [woodz_path]
     ^
   (west from edge)

PORTAL woodz_arch ↔ elfwood_gate

[elfwood_thicket]
       |
[elfwood_gate]—[elfwood_waters]—N→[elfwood_court]
```

### ASCII sketches (authored 16×11)

#### `woodz_glade` — Riddle Glade

```
################
#gg..T....T..gg#   T = giant tree entity (not tile)
#g............g#
#g..1......2..g#   1/2/3 = statue NPCs (see puzzle)
#g............g#
....####.####...   west wall solid; east D door to edge
#g............g#
#g......3.....g#
#g............g#
#gg..........gg#
########D#######   north D → arch
```

Tiles (exact):

```
'################',
'#gg..........gg#',
'#g............g#',
'#g............g#',
'#g............g#',
'.............g#',   // east open mouth (matches woodz_edge west)
'#g............g#',
'#g............g#',
'#g............g#',
'#gg..........gg#',
'########D#######',
```

**Edge doors:** east open row 5 col 0…15 per contract (match `woodz_edge` west mouth at row 5). Use same pattern as hollow/edge: single-char open edge, not multi-tile.

Recommended east mouth (row 5 full open east like woodz_edge west):

```
tiles:
'################',
'#gg..........gg#',
'#g..##....##..g#',
'#g............g#',
'#g............g#',
'...............',  // full open? Prefer:
```

**LOCKED edge pattern** (mirror hollow west):

```
'################',
'#gg..........gg#',
'#g..##....##..g#',
'#g............g#',
'#g............g#',
'....########....',  // NO — use door mouth
```

Use standard door-edge:

```
'################',
'#gg..........gg#',
'#g............g#',
'#g............g#',
'#g............g#',
'..............g#', // if west closed and east open: col0 wall, col15 open
```

**Canonical tiles for `woodz_glade`:**

```
'########D#######',  // N → woodz_arch
'#gg..........gg#',
'#g............g#',
'#g............g#',
'#g............g#',
'#g............. .', // E open — MUST be 16 chars:
```

Final 16-char rows:

```
'########D#######', // N D
'#gg..........gg#',
'#g............g#',
'#g............g#',
'#g............g#',
'#g..............', // east open (col 15)
'#g............g#',
'#g............g#',
'#g............g#',
'#gg..........gg#',
'################', // no south exit
```

And `woodz_edge` gains matching **west** open at row 5 (already has east open rows; add west open on row 4–6 like current east). Today woodz_edge west is walled — **PR must open west mouth** on row 5:

Current edge row 5: `'#g~~dddddddddddd'` (east open). Change to dual open or west D:

LOCKED edit row 5 of woodz_edge:

```
'g~~dddddddddddd'  // west open + east open (16 chars after #?)
```

Count: `#` + 14 + open. Standard pattern from trail: full open sides use no `#` on that edge.

Use:

```
'g~~#dddddd#...g'  // not it
```

**Simplest LOCKED fix:** west door tile mid-west wall:

Row 5 of woodz_edge becomes (16 chars):

```
'g~~.dddddd...g.'  // both sides open through grass — verify length 16
```

`'g~~.dddddd...g.'` = 16. Good. Drop leading `#` only if west should open entire edge; for single door use:

```
'#~~.dddddd...g.'  // col0 wall? For west exit need col0 walkable:
' ~~.dddddd...g.' // bad
```

Look at woodz_edge east open rows:

```
'#g~~#dddddd#.gg.',  // 16, east open (no # on right)
```

West open twin:

```
'.gg.#dddddd#~~g#',  // west open
```

**PR instruction:** open `woodz_edge` west on rows 4–6 symmetrically to east mouth; link `west: 'woodz_glade'`.

#### `woodz_arch` — Living Arch (door room)

```
'########D#######', // N solid-ish
'#gg..........gg#',
'#g....####....g#',
'#g...##..##...g#',
'#g...#....#...g#',
'#g...#..P.#...g#', // P = portal entity tile (floor . under portal)
'#g...#....#...g#',
'#g...##..##...g#',
'#g....####....g#',
'#gg..........gg#',
'########D#######', // S → glade
```

Use `.` for floor; portal is entity at (8,5). No portal until unlock flag (spawn rule).

Giant trees scale 5–6 at corners. Sign at (8,2).

#### `elfwood_gate`

```
'########D#######', // N unused — no link; or wall
'################',
'#gg..........gg#',
'#g............g#',
'#g....####....g#',
'.....#..P.#.....', // W optional wall; E → waters; P return portal
'#g....####....g#',
'#g............g#',
'#gg..........gg#',
'########D#######', // S → thicket
```

Links: east `elfwood_waters`, south `elfwood_thicket`. Portal entity always (return).

#### `elfwood_waters` — healing pond

```
'########D#######', // N → court
'#gg..........gg#',
'#g....~~~~....g#',
'#g...~~~~~~...g#',
'#g..~~~~~~~~..g#',
'....~~~~~~~~....', // E/W links if needed — W to gate only:
```

W open, N D:

```
'########D#######',
'#gg..........gg#',
'#g....~~~~....g#',
'#g...~~~~~~...g#',
'#g..~~~~~~~~..g#',
'....~~~~~~~~..g#', // west open
'#g..~~~~~~~~..g#',
'#g...~~~~~~...g#',
'#g....~~~~....g#',
'#gg..........gg#',
'################',
```

Entities: spring NPC on north shore (8,2), koi auto from pond, trees scale 4–5, optional heart.

#### `elfwood_court` — Queen

```
'################',
'#gg..........gg#',
'#g..##....##..g#',
'#g............g#',
'#g............g#',
'#g......Q.....g#', // Q = queen NPC
'#g............g#',
'#g..##....##..g#',
'#gg..........gg#',
'########D#######', // S → waters
'################',
```

Wait 11 rows — fix:

```
'################', // 0
'#gg..........gg#', // 1
'#g..##....##..g#', // 2
'#g............g#', // 3
'#g............g#', // 4
'#g......Q.....g#', // 5 queen
'#g............g#', // 6
'#g..##....##..g#', // 7
'#gg..........gg#', // 8
'#g............g#', // 9
'########D#######', // 10 S
```

#### `elfwood_thicket` — blight wolves

```
'########D#######', // N → gate
'#gg..........gg#',
'#g..##....##..g#',
'#g............g#',
'#g...W....W...g#', // W = wolf entities
'#g............g#',
'#g............g#',
'#g..##....##..g#',
'#gg..........gg#',
'#g............g#',
'################',
```

### Entity lists (ids LOCKED)

**woodz_glade**

| kind | id | x,y | notes |
| --- | --- | --- | --- |
| tree | glade-redwood-1..4 | corners | scale 5.2–6.0 |
| sign | glade-riddle-sign | 8,2 | riddle text |
| npc | glade-statue-root | 4,4 | ROOT statue |
| npc | glade-statue-trunk | 11,4 | TRUNK statue |
| npc | glade-statue-crown | 8,7 | CROWN statue |
| heart | glade-heart | 2,8 | optional |

**woodz_arch**

| kind | id | x,y | notes |
| --- | --- | --- | --- |
| tree | arch-redwood-1..2 | 2,2 / 13,2 | scale 5.5 |
| sign | arch-sign | 8,2 | locked vs unlocked dialog |
| portal | portal-elfwood-in | 8,5 | `portalTarget: 'elfwood_gate'`; **spawn only if** `flags.elf_door_unlocked` |

**elfwood_gate**

| kind | id | x,y |
| --- | --- | --- |
| portal | portal-elfwood-out | 8,5 | → `woodz_arch` |
| sign | elf-gate-sign | 8,2 |
| npc | elf-sentry | 10,5 | flavor talk |
| tree | gate-tree-1..2 | corners scale 5 |

**elfwood_waters**

| kind | id | x,y |
| --- | --- | --- |
| npc | elf-healing-spring | 8,2 | E heal (see §E) |
| sign | waters-sign | 3,2 |
| tree | waters-tree-1..2 | scale 5 |

**elfwood_court**

| kind | id | x,y |
| --- | --- | --- |
| npc | queen-wood-elves | 8,5 | dialog state machine |
| sign | court-sign | 3,2 |
| tree | court-tree-1..4 | scale 4.5–5.5 |

**elfwood_thicket**

| kind | id | x,y | hp |
| --- | --- | --- | --- |
| wolf | elf-blight-wolf-1 | 5,4 | ~18–22 |
| wolf | elf-blight-wolf-2 | 11,4 | ~18–22 |
| tree | thicket-tree-1..4 | corners scale 5 |
| chest | thicket-chest | 8,8 | `chestTable: 'dungeon'` |

---

## B. Entrance puzzle (LOCKED)

### Type

**Riddle sign + three statue NPCs, E-talk order.**  
No new tile engine, no inventory key item, no pattern-walk grid. Reuses interact + flags (same family as cube forgive / door-unlocked).

### Riddle copy (sign `glade-riddle-sign`)

```
A LIVING DOOR SLEEPS NORTH.
WAKE IT IN ORDER OF A TREE:
FIRST THE ROOT.
THEN THE TRUNK.
THEN THE CROWN.
TOUCH WRONG AND THE WOOD FORGETS YOU.
(E ON THE STUMPS. YES, THE STUMPS.)
```

### Statue dialog (before correct complete)

Each statue when E:

- Always try to register press in order state machine (not only "read dialog").
- Dialog flavor:

| id | success line (when correct step) | idle |
| --- | --- | --- |
| glade-statue-root | ROOT: ...GOOD. DEEP. | ROOT: I AM LOW. START HERE. PROBABLY. |
| glade-statue-trunk | TRUNK: ...SOLID. | TRUNK: MIDDLE MANAGEMENT OF TREES. |
| glade-statue-crown | CROWN: ...THE ARCH STIRS. | CROWN: TOP ENERGY. DO NOT START WITH ME. |

### Steps

1. Player free to roam glade anytime (linked from woodz_edge west).
2. In-memory (or flag-backed) sequence progress: `elf_statue_step` ∈ {0,1,2,3} stored as **flags**:
   - Prefer pure flags for save-safety mid-sequence optional; v1 may use session-only step + only persist unlock.
   - **LOCKED persist:** only unlock flag required. Step counter can be `flags.elf_statue_step` as number… but flags are boolean. Use:
     - `elf_statue_root_ok` (bool)
     - `elf_statue_trunk_ok` (bool)
     - `elf_door_unlocked` (bool)
3. Order enforcement:
   - E ROOT: if not unlocked → set `elf_statue_root_ok=true`; toast `ROOT ACKNOWLEDGED.`
   - E TRUNK: if `root_ok` and not trunk → set `elf_statue_trunk_ok=true`; toast `TRUNK ACKNOWLEDGED.`
   - E TRUNK without root → **fail**
   - E CROWN: if root+trunk → set `elf_door_unlocked=true`; clear step flags optional; success
   - E CROWN early → **fail**
   - E ROOT again after root_ok before complete → fail (must be exact sequence once)
4. **Fail:** clear `elf_statue_root_ok` + `elf_statue_trunk_ok`; toast + short dialog:

```
THE WOODZ SNORT.
ORDER: ROOT → TRUNK → CROWN.
TRY AGAIN, LEAF-BRAIN.
```

5. **Success:**

```
THE STUMPS HUM IN THREE-PART HARMONY.
NORTH: A LIVING ARCH OPENS.
(WELL. PORTALS. SAME DIFF.)
```

Toast: `ELVEN DOOR UNLOCKED.`  
On next `loadRoom('woodz_arch')` / if already in arch, spawn portal.

6. Arch sign when locked:

```
A WOVEN ARCH OF LIVING WOOD.
IT IS VERY CLOSED.
SOMETHING ABOUT ROOTS. GLADE SOUTH.
```

When unlocked:

```
THE ARCH BREATHES. STEP ON THE PORTAL.
WOOD ELVES AHEAD. BE COOL. PROBABLY.
```

### Flags (persist)

| Flag | Meaning |
| --- | --- |
| `elf_statue_root_ok` | step 1 done |
| `elf_statue_trunk_ok` | step 2 done |
| `elf_door_unlocked` | portal may spawn; arch open |
| `elfwood_entered` | first portal cross (optional toast / journal) |

### Implementation hook

- Pure helper `src/systems/elfwood.ts`: `touchElfStatue(save, statueId) → { save, dialog, toast?, unlocked? }`
- GameScene interact on those npc ids calls helper (same pattern as cube talk).
- Portal spawn: mirror `shouldSpawnBossExitPortal` → `shouldSpawnElfwoodPortal(save, roomId)`.

---

## C. Queen + quests (LOCKED)

### Queen

| Field | Value |
| --- | --- |
| NPC id | `queen-wood-elves` |
| kind | `npc` |
| Room | `elfwood_court` @ (8,5) |
| Name in dialog | `QUEEN OF THE WOOD ELVES` |

### Unlock talk

Requires `elf_door_unlocked` (player already inside). No princess-gate — side content available whenever Woodz is reachable.

### Quest set (exactly 3)

Stored like mini board on flags (not champion `activeQuestId` — avoid colliding with Prizella board).  
Pattern: accept flags + done flags; journal via `sideEntries`.

| Quest id | Title | Type | Complete condition | Intermediate gift |
| --- | --- | --- | --- | --- |
| `elf_q_wolves` | BLIGHT BITE | kill | `killed` includes **both** `elf-blight-wolf-1` and `elf-blight-wolf-2` | 3× `potion` + 25 coins |
| `elf_q_shards` | THREE SHARDS FOR HER MAJESTY | deliver | turn-in: consume **3× `wood_shard`** from stacks when talking with quest active | 1× `loot_box_gold` (stack) |
| `elf_q_waters` | DRINK THE QUIET | visit/use | flag `elf_heal_once` true (used healing spring at least once) | mint `silver_ring` uncommon **or** 40 coins if already owned path — LOCKED: **40 coins + 1 potion** (simplest) |

### Progress flags

| Flag | Meaning |
| --- | --- |
| `elf_queen_met` | first audience done |
| `elf_q_wolves` | accepted |
| `elf_q_wolves_done` | turned in |
| `elf_q_shards` | accepted |
| `elf_q_shards_done` | turned in |
| `elf_q_waters` | accepted |
| `elf_q_waters_done` | turned in |
| `elf_queen_complete` | all 3 done; box granted |
| `got_legendary_elven_box` | stack granted once |

### Queen dialog flow (state machine)

1. **First meet** (`!elf_queen_met`):

```
QUEEN OF THE WOOD ELVES: AH. A CRAWLER.
YOU FOUND THE ROOT-TRUNK-CROWN GAG. IMPRESSIVE.
I HAVE THREE ERRANDS. SMALL. ROYAL. SLIGHTLY HAZARDOUS.
TALK TO ME AGAIN TO TAKE WORK.
```

Set `elf_queen_met`.

2. **Board** (met, not complete): offer next incomplete quest in order wolves → shards → waters (one active optional; **LOCKED: allow all three accepted in parallel** — simpler turn-in checks).

Accept lines (short):

- Wolves: `SOUTH OF THE GATE: TWO BLIGHTED WOLVES. END THEM. AWOO OPTIONAL.`
- Shards: `BRING ME THREE WOOD SHARDS. FORJING LEFTOVERS COUNT. I HAVE STANDARDS.`
- Waters: `DRINK FROM THE HEALING WATERS WEST-ISH. E ON THE SPRING. HYDRATE ROYALLY.`

3. **Turn-in** when condition met and accepted:

```
QUEEN: DONE? MATHEMATICAL. TAKE THIS. DO NOT LOSE IT IN A BUSH.
```

Grant intermediate gift; set `*_done`.

4. **Final** when all three `*_done` and `!got_legendary_elven_box`:

```
QUEEN OF THE WOOD ELVES: YOU DID THE WHOLE LIST.
RARE. USUALLY CRAWLERS STOP AT "ONE WOLF AND A NAP."
TAKE THE LEGENDARY ELVEN BOX.
ONE MITHRIL GIFT. RANDOM. FATE IS A JERK.
OPEN IT FROM INVENTORY. TRY NOT TO CRY ON THE MOSS.
```

Grant `legendary_elven_box` ×1 stack; set `got_legendary_elven_box` + `elf_queen_complete`.

5. **Post-complete idle:**

```
QUEEN: THE WOODZ REMEMBER YOU. MOSTLY FONDLY.
GO FORJE. OR NAP. BOTH VALID.
```

### Quest log (`quest-log.ts` sideEntries)

Add three side entries (order 220–240):

| id | title | blurb |
| --- | --- | --- |
| `side-elf-door` | LIVING ARCH | West of Woodz Edge. Root → Trunk → Crown. |
| `side-elf-queen` | QUEEN OF THE WOOD ELVES | Pocket realm via Living Arch portal. |
| `side-elf-quests` | ELVEN ERRANDS | 3 jobs. Full clear → Legendary Elven Box. |

Status derived from flags above.

### Pure module

`src/systems/elfwood.ts` exports:

- statue puzzle
- `talkQueen(save) → { save, dialog }`
- `shouldSpawnElfwoodPortal`
- heal spring helper
- constants for flags / room ids / statue ids

Keep GameScene thin.

---

## D. Legendary Elven Box (LOCKED)

### Template

```ts
// items.ts
legendary_elven_box: {
  id: 'legendary_elven_box',
  name: 'LEGENDARY ELVEN BOX',
  blurb: 'Queen-sealed. One mithril surprise. [U]',
  kind: 'consumable',
  usable: true,
  stackable: true,
},
```

### Pool (exactly 7; pick **ONE** on open)

| templateId | slot | base stats (LOCKED ballpark) | look |
| --- | --- | --- | --- |
| `mithril_blade` | weapon | baseAtk 5 | sword / iron |
| `mithril_bow` | weapon | baseAtk 4, ranged bow, ammo arrows | magic_bow |
| `mithril_staff` | weapon | baseAtk 4, magic staff | staff |
| `mithril_breastplate` | breastplate | baseDef 5, medium | fighter_plate-ish |
| `mithril_greaves` | greaves | baseDef 3 | plate_greaves |
| `mithril_amulet` | amulet | healBonus 2 or +1 all mild — LOCKED: `heal: 0` field on amulet via existing healBonus pattern (+2 heal) | shiny |
| `mithril_ring` | ring | +1 LCK feel — use attr on template if supported else baseDef 1 | luck_ring look |

All minted at **`rarity: 'legendary'`**, enhancement **1**.

### openLootBox integration

Extend `isLootBoxTemplateId` **or** special-case in `openLootBox`:

```ts
export const LEGENDARY_ELVEN_BOX_ID = 'legendary_elven_box';
export const ELVEN_BOX_POOL = [ ...7 ids ] as const;

// in openLootBox:
if (templateId === LEGENDARY_ELVEN_BOX_ID) {
  const tid = ELVEN_BOX_POOL[Math.floor(rng() * ELVEN_BOX_POOL.length)]!;
  // mint one at legendary / enh 1
  // message: OPENED LEGENDARY ELVEN BOX — {name}
}
```

Do **not** put this id in tiered `loot_box_*` weights. Never drops from achievements random roll.

### Grant path

Only Queen final turn-in sets stack + `got_legendary_elven_box` (idempotent).

---

## E. Healing waters (LOCKED)

### How

**Not** walk-on water (water tiles are solid).  
**Not** new fountain entity kind for v1.

**E interact** on NPC `elf-healing-spring` (shore of pond in `elfwood_waters`).

### Effect

- Full heal: `hp = maxHp`
- SFX: `heal`
- Toast: `HEALING WATERS · HP RESTORED` or `THE SPRING GURGLES. YOU FEEL LESS DEAD.`

### Rate limit

**Once per room visit** (session): private `GameScene` field `elfHealUsedThisVisit` reset in `loadRoom`.  
Also set **save flag** `elf_heal_once = true` on first successful drink (quest progress).  
Repeat visits to room after re-entry heal again (Zelda fairy fountain vibe, not infinite mid-fight spam without leaving).

If player spams E same visit after heal:

```
THE SPRING: SIP QUIETLY. COME BACK AFTER A WALK.
```

### Quest hook

`elf_q_waters` completes when `elf_heal_once` (even if drunk before accepting — turn-in still works; Queen: `PREEMPTIVE HYDRATION. I RESPECT THAT.`).

---

## F. Implementation order (PR steps)

### PR1 — Atmosphere: giant trees + west link shell
1. Scale trees on `woodz_path|edge|hollow|deep`.
2. Open west mouth on `woodz_edge`; add empty `woodz_glade` + `woodz_arch` rooms (no puzzle yet).
3. Signs + dirt/grass tiles; room-validate / mapz smoke.
4. CHANGELOG Unreleased bullet.

### PR2 — Puzzle + portal
1. Add `src/systems/elfwood.ts` statue state machine + tests.
2. Wire GameScene npc interact for three statue ids.
3. Conditional portal spawn in `woodz_arch`; return portal in `elfwood_gate` (gate room minimal).
4. Flags persist unlock; re-entry works after death.

### PR3 — Kingdom rooms + heal spring
1. Author `elfwood_gate|waters|court|thicket` full tiles/entities.
2. Heal spring once-per-visit + `elf_heal_once`.
3. Blight wolves kill ids permanent.

### PR4 — Queen quests + journal
1. Queen dialog + gifts in `elfwood.ts`.
2. quest-log side entries.
3. wood_shard spend on deliver turn-in.
4. Tests for flag matrix.

### PR5 — Legendary Elven Box + mithril items
1. 7 item templates + box template + icons (reuse looks).
2. `openLootBox` special case + vitest pool size / single grant.
3. Queen final grant idempotent.
4. Changelog + optional patch version bump when shipped.

### Test checklist
- [ ] Root→Trunk→Crown opens portal; wrong order resets
- [ ] Portal survives save/reload
- [ ] Return portal to arch
- [ ] Heal once per visit; flag for quest
- [ ] Wolves both dead → turn-in
- [ ] 3 shards consumed exactly
- [ ] Box once; open yields one legendary mithril
- [ ] Giant trees: walkable paths, trunk-only block
- [ ] Mapz woodz shows new rooms when visited
- [ ] No LandId expansion

---

## G. What NOT to do

1. **Do not** add `elfwoodz` / new `LandId` in v1.
2. **Do not** make kingdom a land-boss / `landsCleared` / boss exit portal ceremony.
3. **Do not** put Legendary Elven Box in achievement random loot weights.
4. **Do not** gate Woodz main Wolf Lord behind this content.
5. **Do not** use multi-char doors/stairs (`DD`/`SS`) — single `D` only.
6. **Do not** full-sprite colliders on giant trees — trunk only (existing scale>1.5 path).
7. **Do not** walk-on heal into solid water tiles.
8. **Do not** extend player gender beyond male|female.
9. **Do not** hijack `activeQuestId` / champion board for elven jobs.
10. **Do not** require Princess rescue to enter (side content).
11. **Do not** add real-time multiplayer / new scene class — stay in GameScene.
12. **Do not** auto-equip mithril in a way that strips player choice without `autoEquipEmptySlots` only.
13. **Do not** rename intentional misspellings (woodz, mapz, forjing).
14. **Do not** spawn portal before `elf_door_unlocked`.
15. **Do not** softlock: glade always escapable east to woodz_edge; arch always south to glade.

---

## Copy bank (extra short lines)

**Portal step-on toast:** `WHOOSH · WOOD ELF KINGDOM`  
**First enter kingdom:** `THE AIR SMELLS LIKE MOSS AND JUDGMENT.`  
**Sentry:** `SENTRY: BADGE? ...CRAWLER BADGE COUNTS. BARELY.`  
**Thicket sign:** `BLIGHT WOLVES. NOT CUTE. DO NOT PET.`  

---

## File touch list (expected)

| File | Change |
| --- | --- |
| `src/data/world.ts` | tree scales; west link; 6 new rooms |
| `src/systems/elfwood.ts` | **new** pure logic |
| `src/systems/elfwood.test.ts` or rpg-systems.test | tests |
| `src/systems/loot-boxes.ts` | elven box open |
| `src/systems/items.ts` | box + 7 mithril + maybe icon keys |
| `src/systems/quest-log.ts` | side entries |
| `src/systems/textures.ts` / pixel-art | only if new looks needed (prefer reuse) |
| `src/scenes/GameScene.ts` | statue/queen/spring interact; portal spawn; heal visit flag |
| `CHANGELOG.md` | Unreleased |

---

## Council seal

| Topic | Decision |
| --- | --- |
| Giant trees | scale 4.5–6, existing rooms + kingdom, trunk colliders |
| Puzzle | Root → Trunk → Crown statue E order |
| Land | reuse `woodz` |
| Rooms | 2 approach + 4 kingdom = 6 new ids |
| Quests | 3 parallel-capable side jobs → box |
| Box | 1 random mithril of 7, legendary |
| Heal | E spring, once per room visit + quest flag |

**LOCKED.** Ship in PR order F. No redesign without operator override.
