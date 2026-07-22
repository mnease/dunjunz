# Tutorial guild room + dummy weapons (v1) — pure state

**Status:** design locked for implement  
**Module:** `src/systems/tutorial.ts` (+ thin item/look wiring)  
**No SaveData version bump** — boolean `flags` only

---

## 0. Intent

| Before | After |
| --- | --- |
| `START_ROOM = overworld` | `START_ROOM = guild_hall` |
| Swing once + bag + sword | Hit straw dummy with **sword, axe, bow, staff** |
| Stairs gate only | **East door** gated until 4 hits; **stairs** still `tutorial_complete` |
| Weapons: sword / bow / staff looks | **+ `axe` WeaponLook** + `wood_axe` template |

---

## 1. Flags + step enum

### Flag keys (`save.flags`)

| Key | Meaning |
| --- | --- |
| `tutorial_hit_sword` | Dummy scored with sword-family |
| `tutorial_hit_axe` | Dummy scored with axe |
| `tutorial_hit_bow` | Dummy scored with bow-family |
| `tutorial_hit_staff` | Dummy scored with staff-family |
| `tutorial_guild_east_open` | Latch: east exit from guild legal |
| `tutorial_intro_seen` | Keep — auto monologue once |
| `tutorial_complete` | Keep — dungeon stairs legal |
| `tutorial_swung` / `tutorial_bag` | **Deprecated** (migrate ignore; stop writing) |

No parallel counters. Hits are **idempotent booleans**.

### Closed weapon kind (dummy curriculum)

```ts
export type DummyWeaponKind = 'sword' | 'axe' | 'bow' | 'staff';

export const DUMMY_HIT_FLAGS: Record<DummyWeaponKind, string> = {
  sword: 'tutorial_hit_sword',
  axe: 'tutorial_hit_axe',
  bow: 'tutorial_hit_bow',
  staff: 'tutorial_hit_staff',
};

export const FLAG_GUILD_EAST_OPEN = 'tutorial_guild_east_open';
// existing
// FLAG_TUTORIAL_COMPLETE, FLAG_TUTORIAL_INTRO
```

### Step enum (derived only — never stored)

```ts
export type TutorialStep =
  | 'meet'        // no hits
  | 'train'       // 1–3 hit kinds
  | 'east_ready'  // all 4 hits and/or east latch
  | 'complete';    // tutorial_complete
```

```ts
export function getTutorialStep(save: SaveData): TutorialStep {
  if (isTutorialComplete(save)) return 'complete';
  if (canExitGuildEast(save)) return 'east_ready';
  if (dummyHitCount(save) > 0) return 'train';
  return 'meet';
}

export function dummyHitCount(save: SaveData): number {
  return (['sword', 'axe', 'bow', 'staff'] as const).filter((k) =>
    !!save.flags?.[DUMMY_HIT_FLAGS[k]],
  ).length;
}

export function allDummyHits(save: SaveData): boolean {
  return dummyHitCount(save) === 4;
}
```

---

## 2. `recordDummyHit(save, weaponKind)` pure

```ts
export function recordDummyHit(
  save: SaveData,
  weaponKind: DummyWeaponKind,
): SaveData {
  if (isTutorialComplete(save)) return save;

  const key = DUMMY_HIT_FLAGS[weaponKind];
  const already = !!save.flags?.[key];
  let flags = already
    ? save.flags
    : { ...save.flags, [key]: true };

  const next: SaveData = already ? save : { ...save, flags };

  // Latch east when curriculum complete (idempotent)
  if (
    !next.flags?.[FLAG_GUILD_EAST_OPEN] &&
    allDummyHits(next)
  ) {
    return {
      ...next,
      flags: { ...next.flags, [FLAG_GUILD_EAST_OPEN]: true },
    };
  }
  return next;
}
```

**Map hit → kind (scene / combat hook, pure):**

```ts
/** templateId or WeaponLook → DummyWeaponKind | null */
export function dummyKindFromTemplateId(id: string): DummyWeaponKind | null {
  switch (id) {
    case 'mild_sword':
    case 'iron_blade':
    case 'sand_saber':
    case 'dunjun_cleaver':
    case 'honk_blade':
    case 'bud_fang':
    case 'bud_claw':
      return 'sword';
    case 'wood_axe':
      return 'axe';
    case 'short_bow':
    case 'hunter_crossbow':
    case 'phaser': // optional: count as bow-curriculum OR ignore — lock: ignore
      return id === 'phaser' ? null : 'bow';
    case 'wizard_staff':
      return 'staff';
    default:
      return null;
  }
}
```

Lock: **phaser does not** count. Only curriculum weapons.

Scene: on successful dummy strike with equipped weapon →  
`save = recordDummyHit(save, kind)` if `kind != null`.

---

## 3. `canExitGuildEast(save)`

```ts
export function canExitGuildEast(save: SaveData): boolean {
  return (
    isTutorialComplete(save) ||
    !!save.flags?.[FLAG_GUILD_EAST_OPEN] ||
    allDummyHits(save)
  );
}
```

- Guild room **east door/tile**: blocked unless this is true. Toast: `EAST DOOR LOCKED — HIT THE DUMMY WITH ALL FOUR WEAPONS`.
- Veterans / complete: always open.
- Derive + latch both accepted (latch survives flag-only UI).

---

## 4. `canUseDungeonStairs` — unchanged gate

```ts
export function canUseDungeonStairs(save: SaveData): boolean {
  return isTutorialComplete(save);
}
```

- **Not** opened by dummy hits alone.
- East exit ≠ stairs. Stairs still need graduation (`completeTutorial` / GM talk after east, or migrate).
- Soft rule: graduate when player talks to Guild Master at `east_ready` **or** after leaving guild (same as today: checklist → talk). Replace old sword/swing/bag checklist with dummy curriculum:

```ts
export function tutorialChecklist(save: SaveData) {
  const complete = isTutorialComplete(save);
  const hits = {
    sword: !!save.flags?.[DUMMY_HIT_FLAGS.sword],
    axe: !!save.flags?.[DUMMY_HIT_FLAGS.axe],
    bow: !!save.flags?.[DUMMY_HIT_FLAGS.bow],
    staff: !!save.flags?.[DUMMY_HIT_FLAGS.staff],
  };
  const eastOpen = canExitGuildEast(save);
  return {
    complete,
    hits,
    hitCount: dummyHitCount(save),
    eastOpen,
    readyToGraduate: !complete && eastOpen, // GM talk completes
  };
}
```

`completeTutorial` also sets all four hit flags + east open (idempotent graduate).

---

## 5. Axe — id / stats / look mapping

### `WeaponLook` (`appearance.ts`)

```ts
export type WeaponLook =
  | 'none'
  | 'sword'
  | 'axe'      // NEW
  | 'iron'
  // ...
  | 'bow'
  | 'crossbow'
  | 'staff';
```

`mapWeapon`: `case 'axe': return 'axe';`

### Item template (`items.ts`)

```ts
wood_axe: {
  id: 'wood_axe',
  name: 'WOOD AXE',
  blurb: 'Choppy. Space/Z to swing. [W]',
  kind: 'gear',
  slot: 'weapon',
  baseAtk: 1,          // parity with mild_sword
  look: 'axe',
  // weaponStyle omitted → melee default
},
```

### `weaponLookFromTemplateId`

```ts
case 'wood_axe':
  return 'axe';
```

### Guild rack / start kit (world, not pure)

Floor or chest entities in `guild_hall`: `mild_sword`, `wood_axe`, `short_bow` (+ free `arrows` stack grant on pickup or pre-seeded `stacks.arrows = 20`), `wizard_staff`.  
Equip-swap teaching is free; dummy only cares about **which family hits**, not permanent equip.

---

## 6. Dummy entity kind

```ts
// types.ts EntityKind union:
| 'dummy'
```

| Field | Value |
| --- | --- |
| `kind` | `'dummy'` |
| `id` | `'guild-dummy'` (stable) |
| Contact damage | **0** |
| Death | **never** — ignore HP kill path; hit = VFX only |
| `killed[]` | **do not** push |
| Combat | On player attack overlap/ray: resolve equipped → `dummyKindFromTemplateId` → `recordDummyHit` |
| Texture | Straw post / sack silhouette (implement later) |

Do **not** reuse `slime`/`npc`. Dummy is a prop with a hit hook.

---

## 7. World / start (wiring contract)

| Contract | Value |
| --- | --- |
| Room id | `guild_hall` |
| `START_ROOM` | `'guild_hall'` |
| East exit | `guild_hall` → `overworld` (meadow) when `canExitGuildEast` |
| GM NPC | keep `guild-master` (move into hall) |
| Meadow stairs | still `overworld` → `b1_entrance` via `canUseDungeonStairs` |

---

## 8. Migration — veterans skip guild

Extend `migrateTutorial` (load path only):

```ts
export function migrateTutorial(save: SaveData): SaveData {
  if (isTutorialComplete(save)) {
    // Ensure east/hits latched for vets who completed under old schema
    return ensureGuildCurriculumFlags(save);
  }

  const progressed = /* same as today: b*_ rooms, sewerz, woodz_b, dezertz_b,
                       level>1, xp>0, landsCleared, bossDefeated, princessSaved */;
  // Do NOT use hasSword alone

  if (!progressed) return save;

  let next = completeTutorial(save);
  next = ensureGuildCurriculumFlags(next);
  // If old save somehow landed in new room mid-migrate:
  if (next.roomId === 'guild_hall') {
    next = { ...next, roomId: 'overworld' };
  }
  return next;
}

function ensureGuildCurriculumFlags(save: SaveData): SaveData {
  return {
    ...save,
    flags: {
      ...save.flags,
      tutorial_hit_sword: true,
      tutorial_hit_axe: true,
      tutorial_hit_bow: true,
      tutorial_hit_staff: true,
      [FLAG_GUILD_EAST_OPEN]: true,
      [FLAG_TUTORIAL_COMPLETE]: true,
      [FLAG_TUTORIAL_INTRO]: true,
    },
  };
}
```

Fresh save: no hits, start `guild_hall`, east sealed, stairs sealed.

---

## 9. Test cases

| # | Case |
| --- | --- |
| 1 | `defaultSave` → step `meet`, `!canExitGuildEast`, `!canUseDungeonStairs` |
| 2 | Single `recordDummyHit(sword)` → flag set, still `!canExitGuildEast`, pure (no mutate) |
| 3 | Hit sword×2 → still one flag true (idempotent) |
| 4 | All four kinds → `allDummyHits`, `canExitGuildEast`, step `east_ready`, still `!canUseDungeonStairs` |
| 5 | Fourth hit latches `tutorial_guild_east_open` |
| 6 | `canExitGuildEast` true if only latch set (derive OR) |
| 7 | `canExitGuildEast` true if `tutorial_complete` even with zero hits |
| 8 | `canUseDungeonStairs` false until `completeTutorial` |
| 9 | `completeTutorial` sets all hit + east + complete |
| 10 | `dummyKindFromTemplateId('wood_axe') === 'axe'`; mild_sword→sword; short_bow→bow; wizard_staff→staff; phaser→null |
| 11 | `weaponLookFromTemplateId('wood_axe') === 'axe'` |
| 12 | `migrateTutorial` + `visitedRooms: ['b1_entrance']` → complete + east + all hits; room remapped if `guild_hall` |
| 13 | `migrateTutorial` fresh meadow/guild → no complete |
| 14 | `migrateTutorial` hasSword only → no complete |
| 15 | `recordDummyHit` after complete → same reference / no flag churn |

---

## 10. Implement order (not this design task)

1. Flags + pure helpers in `tutorial.ts`  
2. `wood_axe` + `WeaponLook 'axe'` + visual stub  
3. `EntityKind 'dummy'` + combat hook  
4. `guild_hall` room + `START_ROOM`  
5. East gate in `GameScene`  
6. Vitest + CHANGELOG  
7. Retire swing/bag writes

---

## 11. Acceptance

1. New game boots in guild hall; east locked.  
2. Four distinct weapon-family dummy hits open east; stairs still locked.  
3. GM graduate (or skip/migrate) opens stairs.  
4. Old dungeon saves never re-sit guild.  
5. All pure helpers unit-tested, zero Phaser.
