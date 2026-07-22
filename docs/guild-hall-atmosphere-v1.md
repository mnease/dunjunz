# Training Guild hall atmosphere (EMA council) — v1

**Status:** implement  
**Room:** `guild_hall`  
**Goal:** Ominous lived-in guild quarters; training floor remains center stage.

---

## EMA council brief

| Seat | Verdict |
| --- | --- |
| **Scout** | Sparse hall reads as empty prototype. Need wall density, light pools, reading furniture. |
| **Hexis** | Keep 16×11 authored grid + expand. Center free for dummies/racks. New prop kinds solid + lamp fixtures in `collectLightSources`. Ambient special-case `guild_hall` so cookies read without forcing carried light. |
| **Waggle** | Living quarters of a long-dead (or never-sleeping) master: books, chairs, side lamps — not a sterile dojo. |
| **Mason** | Entity kinds: `bookshelf`, `chair`, `table`, `lamp`. Textures 32px craft. Torches = existing `torch_wall`. |
| **Pollen / Comb** | Warm torch pools vs cool shadow between shelves. Reading corners NW + SE. Sign + GM stay readable. |

---

## Lighting

| Param | Value | Why |
| --- | --- | --- |
| Ambient | `AMBIENT_GUILD_HALL = 0.26` via `ambientForRoom({ id: 'guild_hall' })` | Noticeably dark; silhouette readable |
| `dark` flag | **false** (do not set) | No carried-light soft-lock for new players |
| Wall torches | 6–8 `torch_wall` | Cookie radii along walls |
| Floor lamps | 2–4 `lamp` entities | Reading-corner pools (same fixture pipeline) |

---

## Layout

- **Perimeter:** bookshelves along north/south/west/east walls (walk aisle one tile in).
- **Center:** dummies + weapon racks + Guild Master (unchanged roles).
- **Reading corners:** NW + SE each = chair + table + lamp + local shelves.
- **East L door:** clear approach path.

---

## Interact

- Bookshelves / tables: short flavor dialog (E).
- Lamps / chairs: solid props only (no talk required).
- Racks / dummies / GM: existing tutorial flow.

---

## Non-goals

- No new tutorial steps.
- No SaveData version bump.
- No outdoor sun shade in guild (indoor ambient only).
