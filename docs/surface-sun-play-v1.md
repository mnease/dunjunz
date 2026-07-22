# Surface sun play pass v1

**Status:** shipped (`surface-sun.ts` + GameScene RT + big trees on meadow/trail)  
**Council:** Pollen (tokens), Hexis (math), Waggle (guards)

## Intent
Outdoor surface gets **depth from light**: big trees cast SE ground shadows under a NW sun, and soft **cloud shade** drifts across the grass without drawing clouds.

## Locks
| Item | Value |
| --- | --- |
| Outdoor gate | `isOutdoorSurface` — floor≥0, not dark, not kingdom/village |
| Sun cast | SE (`SUN_DIR` ~0.62, 0.48) |
| Big trees | meadow + trail, `scale` 2.2–2.6, trunk-only collider |
| Cloud blobs | 5 soft dark cookies, ~12–30 px/s drift |
| Cloud α | ~0.12–0.26, never pure black |
| reduceMotion | freeze drift via settings |
| Dungeon | unchanged cookie veil |

## Files
- `src/systems/surface-sun.ts`
- `src/scenes/GameScene.ts` (`refreshSurfaceShadows`)
- `src/data/world.ts` (meadow/trail oaks)
- Hexis math notes: `docs/surface-sun-shadows-v1.md`
