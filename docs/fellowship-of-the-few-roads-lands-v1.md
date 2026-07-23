# The Fellowship of the Few — Roads, Mapz & Lands — LOCKED design v1

**Status:** LOCKED (EMA Council 2026-07-23). Implementable. No debate in PR — follow this doc.  
**Tone:** Dunjunz humor, Zelda-like crawl. Intentional misspellingz. Binary gender only where characters have gender.  
**Do not contradict shipped lore** in `src/systems/fellowship.ts` / Glamdolph speech / quest-log `side-fellowship`.  
**Do not redesign Wood Elvez** — pocket realm stays `land: 'woodz'` per `docs/elfwood-kingdom-v1.md`.  
**Stack reuse only:** GameScene rooms, flags, killed[], mapz, forjing, portal tables, hard-mode tables, Best Bud (sole follower), quest-log, room-validate. **No multiplayer. No new scene class.**

---

## 1. North star

After the Queen’s Legendary Elven Box, Glamdolph’s Fellowship of the Few becomes the post-princess epic: open **roads north to the Dwarvez**, **north-west to the Roarhimz horse-folk of Men**, return to the Wood Elf queen for **one elite elven warrior**, then march **far south into Moredorkz** to defeat **Zoron**, seize the **black sword**, and reforge it in the volcano into the **white sword of many Livez**. The crawl stays single-hero + Best Bud; allies are flags, HUD party marks, passive combat bonuses, and scripted final-room assists — not a second party AI engine.

---

## 2. Consistency map

How each new land plugs into **existing** systems.

| System | Decision | Rationale |
| --- | --- | --- |
| **LandId** | **Add** `dwarvez` \| `roarhimz` \| `moredorkz` | Distinct mapz colors, `LAND_THREAT`, portal/hard tables, grammar doctrine. Not pocket-reuse (unlike elfwood): biomes, threat, and mapz identity are full lands. |
| **Surface roads** | New approach rooms tagged **`land: 'surface'`** (or the destination land at the gate only) | Matches trail → woodz pattern; mapz “SURFACE” can show road stubs without cluttering three land mapz. |
| **mapz `LANDS`** | Three new `LandInfo` entries + colors | Required once LandId exists. Scroll pickups `kind: 'mapz'` + `mapzId`. |
| **`LAND_THREAT`** | `dwarvez: 4`, `roarhimz: 4`, `moredorkz: 7` | Between kingdomz/sewerz and above sewerz for endgame ash. |
| **Hard mode** | **Not in PR1–PR3.** Add to `HARD_MODE_LANDS` + gates only after each land boss clears once (PR hard-pass). | Same pattern as woodz/dezertz; avoid shipping empty hard gates. |
| **Portal tables** | `DUNGEON_ENTRANCE` + `BOSS_ROOM_META` for each land boss | Boss exit portal → land mouth only (mid-bosses stay out). |
| **World grammar** | Extend `LAND_LENGTH_DOCTRINE` | Dwarvez medium-pipe; Roarhimz short surface ceremony; Moredorkz long-ish endgame spine. |
| **EntityKind** | New hostiles: `goblin`, `orc` only. Optional prop: `horse`. Reuse everything else. | Silhouette + HP band need kinds; do not invent party kinds. |
| **Best Bud** | **Unchanged sole follower** | Fellowship allies ≠ extra Best Buds. |
| **Army mode** | **Out of scope** | ArmyScene is L20 collective; fellowship is flag/buff epic, not army enlist. |
| **Forjing** | New mats + 2–4 recipes; one Dwarvez forje room | Reuse `forje` entity + `CRAFT_RECIPES` / stacks. |
| **Mithril** | Mine drops + forje synergy with existing mithril gear | Queen box already grants random mithril; mines deepen the material fantasy. |
| **Quest journal** | Extend existing `side-fellowship` hints; remove “(Road opens later.)” when roads ship | No parallel quest state — pure flags. |
| **Save** | Flags only (+ stacks/items). No save version bump unless LandId union forces type-only migration | `discoveredMapz: LandId[]` already flexible. |
| **Lighting** | Moredorkz: dark rooms + lava cookies; Dwarvez mines: `dark: true` deep; Roarhimz: surface sun | Reuse lighting cookies / torch ladder. |
| **Smashables** | Barrel/crate/vase auto-corners in halls / mead / fort | Existing kinds. |
| **Room authoring** | 16×11, single `D`/`L`/`S`/`U`, tile legend `. # g d s ~ D L S U = P c` | `room-validate` bidirectional + map-adj. |
| **mapX/mapY** | North-up; **mapY increases north** | Per land grid (lands do not share one global grid). |

### LandId justification (explicit)

| Option | Verdict |
| --- | --- |
| Reuse `surface` for all three | **Reject** — mapz becomes unreadable; threat tier wrong. |
| Reuse `woodz` / `dezertz` pockets | **Reject** — wrong biome identity; elfwood was wood-adjacent and tiny. |
| **New LandIds (LOCKED)** | **Accept** — three full biomes, three mapz, three boss portals, future hard mode. |

### Party representation (LOCKED)

| Role | Crawl representation |
| --- | --- |
| **Player** | Hero as today |
| **Best Bud** | Only full follow + combat companion |
| **Glamdolph** | Court NPC in `elfwood_court` (`GLAMDOLPH_ROOM`); banter via `glamdolphBanterDialog`; **does not follow** the crawl |
| **Dwarvez warrior** | Flag `fellowship_dwarves` → HUD party chip + **passive** (+1 contact dmg OR +2 DEF — pick one in combat PR; default **+1 ATK**) |
| **Roarhimz fighter** | Flag `fellowship_roarhimz` → HUD chip + passive (**+8% move** or short charge stub on Space if free; default **+1 contact mitigation**) |
| **Elven warrior** | Flag `fellowship_elf_warrior` → HUD chip + passive (**+1 potion heal** or rare free block; default **+1 maxHp hearts display via armor formula +1 DEF**) |
| **Zoron fight** | If flag true, spawn **non-controllable assist phantoms** (tint allies, low HP, simple chase or timed damage ticks) in throne room only — **not** new global AI party system |
| **Camp banter** | Optional sign/NPC lines in mead / hall / court that list who has joined |

**Explicit non-goals:** multi-slot companion AI, party inventory, turn-based fellowship formation UI, ArmyMode enlist of these heroes.

---

## 3. World graph

### 3.1 Existing anchors (do not break)

| Room | Land | mapX,mapY | Notes |
| --- | --- | --- | --- |
| `overworld_east` | surface | 1,0 | Hub trail: N woodz, S dezertz, E kingdomz |
| `woodz_path` → `woodz_edge` → `woodz_deep` | woodz | 1,1 → 1,2 → 1,3 | North spine |
| `woodz_glade` / `woodz_arch` | woodz | 0,2 / 0,3 | West of edge; Living Arch portal |
| `elfwood_*` | woodz | pocket −2…−1 | Queen + Glamdolph court |
| `dezertz_dunes` → `dezertz_edge` → `dezertz_tower` | dezertz | 1,−1 → 1,−2 → 1,−3 | South spine |

### 3.2 Surface / approach roads (new)

| id | title | land | mapX | mapY | links | purpose | open when |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `road_north_1` | NORTH ROAD · FOOTHILLZ | surface | 1 | 1* | S→`woodz_deep`†, N→`road_north_2` | Stone road out of woodz | `fellowship_of_the_few` |
| `road_north_2` | NORTH ROAD · PASS | surface | 1 | 2* | S→`road_north_1`, N→`dwarvez_gate` | Mountain pass, light combat | same |
| `road_nw_1` | NW ROAD · GRASS SEA | surface | 0 | 2* | E→`woodz_glade` or N-link from `road_north_1` W, W→`road_nw_2` | Open grass toward Roarhimz | same |
| `road_nw_2` | NW ROAD · BANNER MARK | surface | −1 | 2* | E→`road_nw_1`, N→`roarhimz_gate` | Banners, scout NPC | same |
| `road_south_ash_1` | SOUTH ROAD · ASH CREEP | surface | 1 | −4* | N→`dezertz_tower` (post-clear) or `dezertz_edge`, S→`road_south_ash_2` | Living land dying into ash | `fellowship_elf_warrior` |
| `road_south_ash_2` | SOUTH ROAD · BLACK SMOKE | surface | 1 | −5* | N→`road_south_ash_1`, S→`moredorkz_gate` | Final approach | same |

\*Surface map coords for roads are **local extensions** of the trail grid; if map-collide with woodz/dezertz land cells, author roads on **surface** with free coords that do not collide **within surface** (e.g. use mapX 2 / mapY 4 for north if needed). **room-validate `map-collide` is per-land** — verify in PR.

†**Graph edit:** `woodz_deep.north = 'road_north_1'` only after flag **or** always linked with **gate prop** that blocks until flag (prefer always-authored bidirectional links + soft gate dialog so validate stays green).

**LOCKED gate pattern:** Always bidirectional room links. Block with solid `pillar`/`crate` cluster + `npc` gatekeeper **or** mid-row wall with single `D` behind a talk-gate that removes barrier entities when flag true (GameScene conditional spawn). Do not one-way link.

### 3.3 Dwarvez rooms (`land: 'dwarvez'`)

Doctrine: **medium-pipe** (≈10–14 rooms, path to boss ≈6–8). Underground hall fantasy + mines.

| id | title | mapX | mapY | floor | links | purpose |
| --- | --- | --- | --- | --- | --- | --- |
| `dwarvez_gate` | STONE GATE · DWARVEZ | 0 | 0 | 0 | S→`road_north_2`, N→`dwarvez_road` | Land mouth; mapz scroll; sign |
| `dwarvez_road` | SWITCHBACK · DWARVEZ | 0 | 1 | 0 | S→gate, N→`dwarvez_mouth`, E→`dwarvez_overlook` | Outdoor mountain path |
| `dwarvez_overlook` | ORE OVERLOOK · DWARVEZ | 1 | 1 | 0 | W→road | Side combat + ore piles; optional |
| `dwarvez_mouth` | MINE MOUTH · DWARVEZ | 0 | 2 | 0 | S→road, N→`dwarvez_hall`, stairsDown→`dwarvez_b1` | Entrance hall; soft foyer (≤1 hostile) |
| `dwarvez_hall` | GREAT HALL · DWARVEZ | 0 | 3 | 0 | S→mouth, E→`dwarvez_treasury`, W→`dwarvez_forje`, N→`dwarvez_throne` | Pillars, gold, banners, NPCs |
| `dwarvez_treasury` | TREASURE VAULT · DWARVEZ | 1 | 3 | 0 | W→hall | Chests, gems, smashables; vault role |
| `dwarvez_forje` | DEEP FORJE · DWARVEZ | −1 | 3 | 0 | E→hall | `forje` entity + dwarf smith NPC |
| `dwarvez_throne` | UNDER-KING · DWARVEZ | 0 | 4 | 0 | S→hall | King NPC; recruit ceremony; land clear chest |
| `dwarvez_b1` | LOWER GALLERY · B1 | 0 | 2 | −1 | stairsUp→mouth, E→`dwarvez_b1_mine`, W→`dwarvez_b1_side` | Dark mine corridor |
| `dwarvez_b1_mine` | GOLD VEIN · B1 | 1 | 2 | −1 | W→b1 | Ore mats, creeps |
| `dwarvez_b1_side` | CAVE-IN · B1 | −1 | 2 | −1 | E→b1 | Optional mid-boss den |
| `dwarvez_b2` | MITHRIL ROOT · B2 | 0 | 2 | −2 | stairs from b1 spine | Deep optional mastery + mithril mat |

**Land boss:** not a dark lord — **recruit ceremony** after optional trial.  
**Optional mid-boss:** `kind: 'miniboss'`, id `cave-foreman`, room `dwarvez_b1_side` (cube pattern: permanent kill, no portal, no land clear).

**Recruit path (LOCKED):**

1. Enter hall → talk Under-King → flag `dwarvez_king_met`.
2. Trial: clear `dwarvez_b1_mine` hostiles **or** bring `ore_gold`×3 / `ore_mithril`×1 (either path).
3. Return → dialog → set `fellowship_dwarves` + mint trophy / passive unlock + optional ally gear gift.
4. `landsCleared` includes `dwarvez` on recruit complete (treat king ceremony as land clear; no second Zoron-scale boss required).

### 3.4 Roarhimz rooms (`land: 'roarhimz'`)

Doctrine: **short-surface-ceremony** (max path to marshal ≈4–5 rooms). Open plains, horses, mead.

| id | title | mapX | mapY | links | purpose |
| --- | --- | --- | --- | --- | --- |
| `roarhimz_gate` | PLAINS GATE · ROARHIMZ | 0 | 0 | S→`road_nw_2`, N→`roarhimz_plains` | Mouth; mapz; spear banners |
| `roarhimz_plains` | WIDE PLAINZ · ROARHIMZ | 0 | 1 | S→gate, E→`roarhimz_stables`, W→`roarhimz_camp`, N→`roarhimz_mead` | Open grass combat; wind copy |
| `roarhimz_stables` | STABLEZ · ROARHIMZ | 1 | 1 | W→plains | Horse props; merchant tack |
| `roarhimz_camp` | RIDER CAMP · ROARHIMZ | −1 | 1 | E→plains | Side combat + chest |
| `roarhimz_mead` | MEAD HALL · ROARHIMZ | 0 | 2 | S→plains, N→`roarhimz_marshal` | Indoor hall, tables, barrels, songs |
| `roarhimz_marshal` | MARSHAL’S GREEN · ROARHIMZ | 0 | 3 | S→mead | Marshal NPC; recruit; land clear |

**Recruit path (LOCKED):**

1. Mead hall gossip → marshal wants proof of courage.
2. Trial: win skirmish in `roarhimz_camp` (kill list) **or** complete “ride” stub: talk horse master in stables after clearing plains hostiles.
3. Marshal joins cause → `fellowship_roarhimz`.
4. `landsCleared` += `roarhimz`.

**Mounted flavor:** No full mount physics. **Visual horse props** in stables/plains; optional **charge stub** later (player dash i-frames 0.3s once/room) gated by `fellowship_roarhimz` — PR-optional, not blocking.

### 3.5 Moredorkz rooms (`land: 'moredorkz'`)

Doctrine: **long-ish endgame spine** (min ~10 rooms, path to Zoron ≥7). Ominous; humor sparingly.

| id | title | mapX | mapY | floor | links | purpose |
| --- | --- | --- | --- | --- | --- | --- |
| `moredorkz_gate` | BLACK GATE · MOREDORKZ | 0 | 0 | 0 | N→`road_south_ash_2`, S→`moredorkz_ash` | Mouth; mapz; warning sign |
| `moredorkz_ash` | ASH WASTEZ · MOREDORKZ | 0 | −1 | 0 | N→gate, S→`moredorkz_crag`, E→`moredorkz_pit` | Soft foyer-ish then creeps |
| `moredorkz_pit` | SLAG PIT · MOREDORKZ | 1 | −1 | 0 | W→ash | Side hazard / vault |
| `moredorkz_crag` | SMOKE CRAG · MOREDORKZ | 0 | −2 | 0 | N→ash, S→`moredorkz_camp`, W→`moredorkz_watch` | Main path |
| `moredorkz_watch` | ORC WATCH · MOREDORKZ | −1 | −2 | 0 | E→crag | Optional dens |
| `moredorkz_camp` | GOBLIN CAMP · MOREDORKZ | 0 | −3 | 0 | N→crag, S→`moredorkz_fort_gate` | Horde fight |
| `moredorkz_fort_gate` | FORTRESS GATE · MOREDORKZ | 0 | −4 | 0 | N→camp, S→`moredorkz_hall` | Soft mid pressure |
| `moredorkz_hall` | BLACK HALL · MOREDORKZ | 0 | −5 | 0 | N→fort_gate, E→`moredorkz_armory`, S→`moredorkz_throne` | Indoor dark |
| `moredorkz_armory` | WAR STORE · MOREDORKZ | 1 | −5 | 0 | W→hall | Chest / mats |
| `moredorkz_throne` | ZORON’S THRONE · MOREDORKZ | 0 | −6 | 0 | N→hall, W→`moredorkz_volcano`‡ | **Boss: Zoron** |
| `moredorkz_volcano` | DOOM FORJE · MOREDORKZ | −1 | −6 | 0 | E→throne | Black→white sword ceremony |

‡Volcano link **opens only after** `zoron_defeated` **and** player holds / has looted black sword (flag `black_sword_held`). Until then west is walled or gated NPC “THE FORJE ACCEPTS ONLY THE BLACK BLADE.”

**Land boss:** `zoron` (`kind: 'boss'`, id `zoron`) in `moredorkz_throne`.  
**Boss portal:** after kill → `moredorkz_gate` (mouth).  
**White sword:** not auto on kill — player must walk black sword into `moredorkz_volcano` and talk / step forge pad → `sword_of_many_livez` + transform item.

### 3.6 Graph sketch (ASCII overview)

```
                    [dwarvez_throne]
                          |
 [forje]—[hall]—[treasury]
                          |
                    [mine mouth]—stairs—[B1…]
                          |
                    [dwarvez_road]
                          |
                    [dwarvez_gate]
                          |
                    [road_north_*]
                          |
 [roarhimz_marshal]   [woodz_deep]——N opens after fellowship
        |                 |
 [mead]—[plains]—…   [woodz_edge]—W—[glade]—W—[road_nw_*]—[roarhimz_gate]
        |                 |
                     [woodz_path]
                          |
                     [overworld_east]—E—[kingdomz…]
                          |
                     [dezertz_*]
                          |
                     [road_south_ash_*]   ← after elf warrior joined
                          |
                     [moredorkz_gate → ash → … → throne → volcano]
```

Elfwood court remains the **return hub** for elven warrior (no new elf land).

---

## 4. Road opening

### 4.1 Flag gates

| Road | Unlock flag | Player-facing journal |
| --- | --- | --- |
| North → Dwarvez | `fellowship_of_the_few` | `GO: Woodz north of Wolf Lord clearing · North Road · Dwarvez gate.` |
| NW → Roarhimz | `fellowship_of_the_few` | `GO: West of Woodz Riddle Glade · NW Road · Roarhimz plains.` |
| South → Moredorkz | `fellowship_elf_warrior` | `GO: South past Dezertz tower · Ash Road · Black Gate.` |
| Elven warrior grant | `fellowship_dwarves` **and** `fellowship_roarhimz` | `GO: Queen\'s Court · talk (E).` |
| Volcano forge | `zoron_defeated` + `black_sword_held` | `GO: West of throne · Doom Forje · present the black sword.` |

**Order soft-preferred (Glamdolph):** Dwarvez → Roarhimz → Queen → Moredorkz.  
**Order hard-allowed:** Roarhimz before Dwarvez (both roads open together).  
**Moredorkz hard-locked** until full fellowship (3 allies).

### 4.2 Queen dialog updates (ship with roads)

Replace stub “WHEN THE ROADS NORTH ARE OPEN. (SOON.)” with real grant:

```
QUEEN: YOU BROUGHT DWARVEZ AND ROARHIMZ.
I SEND LIRAEL OF THE LEAF-GUARD.
SHE IS FEW. SHE IS ENOUGH.
(FLAG fellowship_elf_warrior)
GO SOUTH. END ZORON. SAVE THE WOODZ.
```

### 4.3 Gatekeeper copy (examples)

**North gate (pre-flag):**  
`THE NORTH ROAD IS SEALED BY TREATY AND FEAR.`  
`GLAMDOLPH HAS NOT SPOKEN. GO BACK.`

**North gate (post-flag):**  
`PASS, CRAWLER. THE DWARVEZ HATE SURPRISES.`  
`KNOCK LOUD. BRING SNACKS.`

**Ash road (pre-elf):**  
`ASH CREEPS NORTH. YOU ARE NOT ENOUGH.`  
`RETURN WITH THE FELLOWSHIP OF THE FEW.`

---

## 5. Race design sheets

### 5.1 Dwarvez (culture + warriors)

#### Visual (32→64 craft)

| Trait | Spec |
| --- | --- |
| **Body** | Stout; short legs; wide shoulders (reuse player `RaceId: 'dwarf'` silhouette language) |
| **Beard** | Long, braided; male warriors full beard mandatory; female warriors braided side-locks + shorter beard optional (binary gender only) |
| **Hair** | Copper / iron-grey / black |
| **Palette** | Stone grey `#6a6a78`, deep gold `#c9a227`, bronze `#8a5a2b`, ember eyes `#ffb347`, cloak forest-black |
| **Gear** | Axe or pick (weapon look `iron` / custom axe), heavy plate, round shield, horned or plain helm |
| **Silhouette read** | Wider than human; beard mass below chin; axe head readable at 32px |

#### Combat

| Role | Entity | HP base | Contact | Notes |
| --- | --- | --- | ---: | --- |
| Cave pest | reuse `slime` / `skeleton` | 12 / 18 | 2 | Mine flavor dialog |
| Hostile digger | **new** optional `goblin` in deep only if needed; else skeleton | — | — | Prefer reuse until Moredorkz |
| Cave Foreman mid | `miniboss` `cave-foreman` | **40** | 3 | Optional den |
| Ally (recruit) | flag buff only | — | — | No world enemy |

Warrior classes (NPC labels, not player classes): **Axeguard**, **Pickminer**, **Vaultwarden**.

#### Culture

| Element | Content |
| --- | --- |
| **Names** | Under-King **Bramli Deepvault**; smith **Forga Anvilgrin**; recruitable champion **Thrain Ironlaugh** (joins as flag, not follower) |
| **Speech** | Short, gold-obsessed, dry jokes: `WE DIG. WE EAT. WE HIT ROCKS THAT LOOK AT US.` |
| **Signs** | `MINES OF THE DWARVEZ — WATCH YOUR BEARD.` / `TREASURY: LOOKING COSTS. TOUCHING COSTS MORE.` |

#### Economy

| Stack id | Source | Use |
| --- | --- | --- |
| `ore_iron` | existing | Keep |
| `ore_gold` | **new** — treasury/mine | Craft / king trial / sell value via merchant |
| `gem_rough` | **new** — vault smash/chest | Craft amulet / coins sink |
| `ore_mithril` | **new** — B2 rare | Craft/enhance path toward mithril gear |

**Forje recipes (Dwarvez forje, additive):**

| id | result | cost |
| --- | --- | --- |
| `craft_dwarf_axe` | `dwarf_axe` weapon ATK 5 | `ore_iron`×3, `ore_gold`×1, 40c |
| `craft_mithril_plate_shard` | stack or enhance mat | `ore_mithril`×1, `ore_spark`×2, 60c |
| `craft_gem_ring` | ring DEF+2 | `gem_rough`×2, `ore_gold`×1, 35c |

**Mithril synergy:** Mines grant `ore_mithril`; forje can mint **or** upgrade path that uses existing templates (`mithril_blade` etc.) via recipe `craft_mithril_blade` cost `ore_mithril`×2 + `ore_iron`×1 + 100c — only if not already owned from queen box.

---

### 5.2 Roarhimz (Men of the horse plains)

#### Visual

| Trait | Spec |
| --- | --- |
| **Body** | Human proportions; athletic |
| **Hair** | Long blond / brown / wind-tossed; male facial hair short stubble only (not dwarf beards) |
| **Palette** | Green field `#3d7a45`, gold sun `#ffc857`, leather `#6b5344`, white horse `#f0ebe0`, banner red `#c0392b` |
| **Gear** | Spear / longsword, round shield with horse sigil, cloaks, riding boots |
| **Silhouette** | Tall vs dwarves; spear vertical read; banner props in room |

#### Combat

| Role | Entity | HP | Contact | Notes |
| --- | --- | ---: | ---: | --- |
| Plains pests | `wolf`, `slime` | 26 / 12 | 3 / 2 | Reuse |
| Bandit men | `redshirt` retint **or** `skeleton` “raiders” | 4–18 | 1–2 | Prefer redshirt joke raiders |
| Ally | flag buff | — | — | Mounted flavor passive |

#### Culture

| Element | Content |
| --- | --- |
| **Names** | Marshal **Éorik Windmane** (humorous not-quite-Éomer); stablemaster **Hilda Hayfast**; champion **Rofa Spearhymn** |
| **Speech** | Proud, horse metaphors: `MY HORSE HAS BETTER MANNERS THAN YOUR SWORD.` |
| **Signs** | `ROARHIMZ — RIDE TRUE. MEAD AFTER.` / `STABLEZ: NO WOLVEZ. YES, THAT MEANS YOU, BUD.` |

#### Economy

| Stack | Source | Use |
| --- | --- | --- |
| `horse_hair` | stables / camp | craft bandage / bowstring joke |
| `mead_flask` | mead hall chest | consumable heal 3 (optional) |

Light recipes only; no second forje required (mead hall can host **merchant** only).

---

### 5.3 Moredorkz hosts (goblins, orcs, ash)

#### Visual — Goblin

| Trait | Spec |
| --- | --- |
| Body | Small, lanky arms, big ears/nose |
| Palette | Sick green `#4a7a3a`, brown rags, yellow eyes |
| Gear | Rust knife, scrap shield |
| Silhouette | Smaller than slime footprint; ear spikes |

#### Visual — Orc

| Trait | Spec |
| --- | --- |
| Body | Broad, hunched, tusked (half_orc language, greyer) |
| Palette | Ash green-grey `#3a4a3a`, black iron, red cloth |
| Gear | Cleaver, crude plate |
| Silhouette | Heavier than skeleton; shoulder mass |

#### Combat (new kinds)

```ts
// enemies.ts (LOCKED defaults)
ENEMY_BASE_HP.goblin = 16;
ENEMY_BASE_HP.orc = 30;
ENEMY_CONTACT_DAMAGE.goblin = 2;
ENEMY_CONTACT_DAMAGE.orc = 3;
// XP: goblin ~6, orc ~12 (progression.ts)
```

| Threat band | Placement |
| --- | --- |
| Goblin packs | ash, camp, watch |
| Orcs | crag, fort, hall |
| Soft-respawn | common goblins yes; named captains permanent `killed[]` |

Reuse `wolf` as ash-warg tint if cheap (palette override only).

---

### 5.4 Zoron

| Trait | Spec |
| --- | --- |
| **Role** | Dark sorceror land boss; end of fellowship combat arc |
| **Visual** | Black plate full helm; tall; **black sword** oversized; purple/black aura; no silly redshirt energy |
| **Palette** | `#0a0a10` armor, `#2a0a30` cloak, blade `#1a1a22` with `#6b2a8a` edge glow |
| **Entity** | `kind: 'boss'`, id `zoron`, authored `hp: 64` (scales via threat; land tier 7 → very fat) |
| **Contact** | 4 (boss default) |
| **Gimmick** | Phase dialog only in v1; optional black-sword swing telegraph later. Fellowship assist phantoms if flags set. |
| **Loot** | On kill: flag `zoron_defeated`, grant **quest item** `black_sword` (weapon or key-slot quest blade), chest `boss` table, `landsCleared` += `moredorkz` |
| **Humor** | One line max: `ZORON: YOU BROUGHT A BUD? …FINE.` |

**Black sword template (quest gear):**

```
id: black_sword
name: BLACK SWORD OF ZORON
slot: weapon
baseAtk: 6
blurb: 'Evil. Heavy. Temporary. Take it to the volcano. [W]'
// Optional: while held, -1 DEF or slow — teach “don’t keep it”
```

---

### 5.5 Recruitable / cast heroes

| Id | Role | Gender | Visual | How represented |
| --- | --- | --- | --- | --- |
| **Glamdolph** | Grey wizard, quest giver | male | Long white beard, grey robes, staff | NPC court only |
| **Thrain Ironlaugh** | Dwarvez greatest warrior | male | Gold-braid beard, twin axes | Flag + HUD chip + throne dialog |
| **Rofa Spearhymn** | Roarhimz greatest fighter | female | Green cloak, spear, wind hair | Flag + HUD chip + marshal green |
| **Lirael Leaf-Guard** | Best elven warrior | female | Wood-elf greens, mithril bow/leaf blade | Flag after queen grant; court send-off |
| **Queen of the Wood Elvez** | Existing | female | Do not redesign | Grant Lirael |
| **Under-King Bramli** | Dwarf king | male | Crown-helm, ridiculous gold chain | NPC |
| **Marshal Éorik** | Roarhimz leader | male | Horse banner cape | NPC |

---

## 6. Room packs (ASCII 16×11 sketches)

Legend reminder: `.` floor `#` wall `g` grass `d` dirt `s` sand `~` water `D` door `c` carpet `P` special pad. **Single door glyphs only.**

### 6.1 `dwarvez_mouth` — Mine mouth

```
########D#######
#dddd......dddd#
#d##..####..##d#
#d............d#
#d..##....##..d#
#d............d#
#d..##....##..d#
#d............d#
#d##..####..##d#
#dddd..S...dddd#
################
```

Entities: torch_wall ×4, sign, 0–1 skeleton, stairs `S` → B1, north `D` → hall.

### 6.2 `dwarvez_hall` — Great hall

```
########D#######
#c....####....c#
#c............c#
#c..P......P..c#
#c............c#
D......##......D
#c............c#
#c..P......P..c#
#c............c#
#c....####....c#
########D#######
```

Entities: `pillar` on P tiles (or pillar kinds), `banner` N wall, `throne` only in throne room not here, merchant optional, torch_wall, barrel corners, NPC courtiers. Gold “piles” = chest + vase cluster, not new tiles.

### 6.3 `dwarvez_treasury`

```
################
#..............#
#..$$$$....$$..#   ← $ is NOT a tile; place chest entities
#..............#
#..##......##..#
#..............#
#..##......##..#
#..............#
#..............#
#......D.......#
################
```

Tiles only:

```
'################',
'#..............#',
'#..............#',
'#..............#',
'#..##......##..#',
'#..............#',
'#..##......##..#',
'#..............#',
'#..............#',
'#......D.......#',
'################',
```

Entities: chests ×2–3, gem sparkle via heart/chest loot, smashables, optional permanent elite.

### 6.4 `dwarvez_forje`

```
################
#..............#
#..####........#
#..#~~#...F....#   F = forje entity
#..#~~#........#
#..####........#
#..............#
#..............#
#..............#
#.............D#
################
```

`~` as cooling trough water; forje entity id `forje-dwarvez`.

### 6.5 `roarhimz_gate` — Plains gate

```
########D#######
#gg..........gg#
#g............g#
#g............g#
#g............g#
#g............g#
#g............g#
#g............g#
#g............g#
#gg..........gg#
########D#######
```

Entities: `banner`×2, `sign`, mapz pickup, light wolves.

### 6.6 `roarhimz_mead` — Mead hall

```
################
#c............c#
#c..tt....tt..c#   t = table entities
#c............c#
#c............c#
D..............D
#c............c#
#c..bb....bb..c#   b = barrel
#c............c#
#c............c#
########D#######
```

Indoor dirt/carpet; no grass. NPC singers, merchant of mead, torch/lamp.

### 6.7 `moredorkz_ash` — Ash wastes

```
########D#######
#ss..........ss#
#s....ssss....s#
#s............s#
#s..ss....ss..s#
#s............s#
#s..ss....ss..s#
#s............s#
#s....ssss....s#
#ss..........ss#
########D#######
```

Entities: goblins 2–3, ash “trees” none, tumbleweed optional reuse, sign ominous, dark false (surface ash under smoke — mild light penalty optional later).

### 6.8 `moredorkz_volcano` — Doom forje

```
################
#ss....~~....ss#   ~ = lava (existing water tile art retint per land OR reuse ~ with land palette)
#s....~~~~....s#
#s...~~~~~~...s#
#s....~~~~....s#
#s.....PP.....s#   P = forge pad
#s............s#
#s............s#
#s............s#
#s......D.....s#
################
```

**Art note:** If `~` is always water blue, prefer land-based lava recolor in tile renderer for `moredorkz` (config already has `COLORS.lava`). No new tile char required if land palette swaps water→lava in Moredorkz.

### 6.9 `moredorkz_throne` — Zoron

```
########D#######
#c............c#
#c....####....c#
#c............c#
#c.....T......c#   T = throne prop
#c............c#
#c.....Z......c#   Z = Zoron spawn
#c............c#
#c............c#
#c............c#
################
```

West door to volcano appears only post-kill (GameScene conditional tiles **or** always open but forge rejects). Prefer **always west `D`** + forge gate logic to keep validate simple.

---

## 7. Quest state machine

### 7.1 Flag table

| Flag | Set when | Clears? |
| --- | --- | --- |
| `fellowship_of_the_few` | Cutscene after legendary box (shipped) | never |
| `glamdolph_met` | same | never |
| `fellowship_dwarves` | Under-King recruit complete | never |
| `fellowship_roarhimz` | Marshal recruit complete | never |
| `fellowship_elf_warrior` | Queen send-off after both recruits | never |
| `dwarvez_king_met` | first talk | never |
| `dwarvez_trial_done` | trial objective | never |
| `roarhimz_marshal_met` | first talk | never |
| `roarhimz_trial_done` | trial objective | never |
| `black_sword_held` | Zoron kill loot applied | cleared when white sword forged |
| `zoron_defeated` | Zoron kill | never |
| `sword_of_many_livez` | volcano ceremony | never |

### 7.2 Transitions

```
[Queen box] → fellowship_of_the_few + Glamdolph cutscene
        ↓
   roads N + NW open
        ↓
   ┌────┴────┐
   ↓         ↓
Dwarvez    Roarhimz
recruit    recruit
   └────┬────┘
        ↓
Queen grants Lirael → fellowship_elf_warrior
        ↓
road south open → Moredorkz crawl
        ↓
defeat Zoron → zoron_defeated + black_sword_held
        ↓
volcano pad → sword_of_many_livez
        ↓
isFellowshipActive == false (epic done; free roam)
```

### 7.3 Journal WHERE text (replace stubs)

| State | `side-fellowship` hint |
| --- | --- |
| locked | Finish Queen’s three errands (Legendary Box). |
| available / not started cutscene | `GO: Queen\'s Court · talk if Glamdolph has not appeared.` |
| active, no dwarves | `GO: Woodz Deep · North Road · Dwarvez Gate · recruit the Under-King\'s champion.` |
| dwarves, no roarhimz | `GO: Woodz Glade west · NW Road · Roarhimz · recruit the Marshal\'s fighter.` |
| both, no elf | `GO: Queen\'s Court · receive an elven warrior.` |
| elf, no zoron | `GO: South past Dezertz · Ash Road · Moredorkz · defeat Zoron.` |
| zoron, no white sword | `GO: Doom Forje west of throne · present the black sword.` |
| done | `Zoron fallen. The white sword of many Livez is yours.` |

Progress labels (existing pattern):

- `N: DWARVEZ · NW: ROARHIMZ`
- `n/3 ALLIES`
- `MOREDORKZ — ZORON`
- `SWORD OF MANY LIVEZ`

### 7.4 Pure module layout

```
src/systems/fellowship.ts     — extend: recruit helpers, roadOpen(), partyPassives()
src/systems/dwarvez.ts        — king talk, trial checks (optional split)
src/systems/roarhimz.ts       — marshal talk
src/systems/moredorkz.ts      — zoron loot, volcano forge
GameScene                     — gates, cutscenes already patterned on glamdolph
quest-log.ts                  — hint strings only
```

---

## 8. Loot & rewards

### 8.1 Land clears

| Land | Clear condition | Rewards |
| --- | --- | --- |
| dwarvez | `fellowship_dwarves` | `landsCleared`, coins, `ore_mithril`×1, brag later |
| roarhimz | `fellowship_roarhimz` | `landsCleared`, `mead_flask`×2, spear trophy optional |
| moredorkz | `zoron_defeated` | `landsCleared`, boss chest, black sword |

### 8.2 White sword of many Livez

```
id: sword_of_many_livez
name: WHITE SWORD OF MANY LIVEZ
slot: weapon
baseAtk: 7
blurb: 'Forged from Zoron\'s evil. Heals the legend. [W]'
// LOCKED special: on kill, 15% chance grant +1 HP (not exceed max) OR potionHealBonus +1
// Rarity: legendary mint
```

Ceremony removes `black_sword` from bag/equip; sets `sword_of_many_livez` flag; `mintItem` white sword; clear `black_sword_held`.

### 8.3 Mithril synergy

| Source | Outcome |
| --- | --- |
| Queen box (shipped) | random mithril gear |
| Dwarvez B2 / treasury | `ore_mithril` stacks |
| Dwarvez forje | craft missing mithril templates / dwarf axe |
| White sword | top-tier unique; not mithril-named but endgame equal |

### 8.4 Mapz scrolls

| Pickup room | mapzId |
| --- | --- |
| `dwarvez_gate` | `dwarvez` |
| `roarhimz_gate` | `roarhimz` |
| `moredorkz_gate` | `moredorkz` |

### 8.5 mapz colors (LOCKED)

```ts
dwarvez:  { color: 0x6a5a3a, fog: 0x2a2010, border: 0xffc857, blurb: 'Deep hallz. Louder beards.' }
roarhimz: { color: 0x4a8a40, fog: 0x1a3018, border: 0xffe08a, blurb: 'Plainz. Horsez. Mead.' }
moredorkz:{ color: 0x3a2020, fog: 0x120808, border: 0xc44b2b, blurb: 'Ash. Orcs. Bad sword energy.' }
```

---

## 9. PR implementation order

| PR | Name | Scope | Exit criteria |
| --- | --- | --- | --- |
| **PR1** | Roads shell | Surface road rooms + gatekeepers; links from woodz_deep / woodz_glade / dezertz; flag open logic; journal hint text without “(later)”; signs | Walk roads end-to-end when flags forced on; room-validate clean |
| **PR2** | LandId + mapz plumbing | Add `dwarvez`/`roarhimz`/`moredorkz` to types, LANDS, LAND_THREAT, doctrine stubs, mapz pickups, threat tests | Mapz UI switches lands; no runtime holes |
| **PR3** | Dwarvez land pack | All dwarvez rooms, entities, king quest pure module, forje recipes/mats, recruit flag | `fellowship_dwarves` achievable; landsCleared |
| **PR4** | Roarhimz land pack | Plains/mead/marshal, horse props, recruit flag | `fellowship_roarhimz` |
| **PR5** | Elf warrior grant | Queen dialog real grant; remove soon-stub; HUD party chips ×3 | `fellowship_elf_warrior`; passives apply |
| **PR6** | Moredorkz crawl | Ash→fort rooms, goblin/orc kinds + art, combat numbers | Can reach throne door |
| **PR7** | Zoron boss | Boss room, kill flags, black sword mint, portal meta, assist phantoms | `zoron_defeated` |
| **PR8** | Volcano ceremony | Doom forje room, white sword template + transform | `sword_of_many_livez`; epic journal done |
| **PR9** | Polish | Lighting lava, smashables, banter, achievements/brags, hard-mode tables (optional) | Feel pass |
| **PRn** | Hard mode | Gates for three lands after clear | Optional post-1.0 |

**Tests per PR:** pure vitest on flags/transitions (extend `fellowship.test.ts`); room-validate; threat record completeness.

---

## 10. What NOT to do

1. **Do not** redesign Wood Elf kingdom / Living Arch / queen errands.
2. **Do not** contradict Glamdolph speech names: Zoron, Moredorkz, Roarhimz, Dwarvez, Livez, Elvez.
3. **Do not** add multiplayer, new Phaser scene for fellowship, or ArmyMode coupling.
4. **Do not** make Glamdolph / three heroes full Best Bud-style followers.
5. **Do not** use multi-tile doors (`DD`) or multi-tile stairs.
6. **Do not** put mid-bosses in `BOSS_ROOM_META` or give them exit portals.
7. **Do not** soft-lock stairs behind mid-bosses or recruit trials (trial = optional path + alternate mat path).
8. **Do not** open Moredorkz before `fellowship_elf_warrior`.
9. **Do not** keep the black sword as permanent best-in-slot without volcano transform (quest blade → white sword).
10. **Do not** invent Chinese model tooling / platform mesh noise in this silo.
11. **Do not** add non-binary gender fields.
12. **Do not** reuse `land: 'woodz'` for dwarvez mines or `dezertz` for ash — new LandIds only.
13. **Do not** ship hard-mode gates before land clear exists.
14. **Do not** name Tolkien-copy characters (no “Gandalf/Frodo/Mordor/Rohan” strings) — Dunjunz spellings only.
15. **Do not** expand ArmyScene for this epic.

---

## 11. Council seal table

| Agent | Focus | Verdict |
| --- | --- | --- |
| **EMA** | Unify shipped fellowship flags + elfwood pocket pattern + three-land mapz need | **LOCK** design as written |
| **Scout** | Shipped: `fellowship.ts` flags, quest-log stubs, LandId six-value, Best Bud sole companion, elfwood reuse woodz, portal/hard tables | Facts incorporated; roads currently missing (“opens later”) |
| **Hexis** | Threat tiers 4/4/7; goblin 16/2, orc 30/3; Zoron base 64; mid 40; party = passives not AI | Numbers LOCKED for v1; tune only if playtest breaks hit-counts |
| **Mason** | PR order 1→8 pure systems first, GameScene wiring last per feature | Implement against this doc; no redesign |
| **Waggle** | Risks: party AI scope creep; map-collide on surface roads; black sword overpowered; Moredorkz too long | Mitigations: flags-only party; per-land coords; quest blade; spine ~10 rooms not Dunjunz-24 |
| **Wax** | Stack: rooms + flags + mapz + forje + portal — zero new engines | **Compliant** |
| **Comb** | Journal WHERE strings must update when roads ship; gate copy accessible via E-talk | **Required in PR1/PR5** |
| **Pollen** | Dwarvez gold/stone, Roarhimz green/gold, Moredorkz ash/blood-red borders on mapz | Colors LOCKED §8.5 |
| **Forager** | Future mobile: room graph + flags translate; avoid scene split | OK |

### Seal

| Field | Value |
| --- | --- |
| **Doc** | `docs/fellowship-of-the-few-roads-lands-v1.md` |
| **Status** | **LOCKED v1** |
| **Date** | 2026-07-23 |
| **Depends on shipped** | Elfwood queen complete, Glamdolph cutscene, fellowship flags, Best Bud, mapz, forjing, room-validate |
| **Next action** | **PR1 Roads shell** |

---

*End of LOCKED design. Implementation PRs follow §9 without reopening §2–§5 unless operator breaks seal.*
