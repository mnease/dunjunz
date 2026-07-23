# Dialogue Pass v1 — Non-Elf Script Bible

**Status:** Implementation pack (2026-07-23).  
**Out of scope (LOCKED good):** Wood Elf kingdom, riddle glade, Living Arch, Glamdolph / Fellowship cutscene, all `elfwood_*` / elf NPCs.

## Voice charter

| Speaker | Tone | Do | Don't |
|--------|------|-----|--------|
| **Princess Prizella** | Sharp, royal, dry; competent chaos | Short orders, one joke max, clear GO: | Spam "MATHEMATICAL"; ramble about taxes |
| **Guild Master** | Gruff mentor | Direct training steps | Corporate onboarding speak |
| **Tinkerer** | Salesy but honest | Price + control hints | "Fair-ish" thrice |
| **Dungeon Master** | Meta villain, collapsing | Dice jokes, ship-to-dezertz beat | Over-explain map |
| **Boss creeps** | One threat + one location | Personality in 3–4 lines | Lecture on stairs law |
| **Signs** | Utility first | Directions, controls | Sarcasm that hides the exit |
| **Best Buds** | Character-specific (keep roster) | Meet punch + join clarity | Wall of ability text |

## Patterns fixed

| Bad | Good |
|-----|------|
| `GOT YEETED TO THE DEZERTZ` | `SHIPPED HER TO THE DEZERTZ` |
| `MATHEMATICAL!` every line | One signature beat max / scene |
| Split thoughts mid-box | One idea per line |
| Instruction pile after loot | Loot → one GO line |
| `LIKE... MY CHAMPION` filler | Cut filler |
| `VERY SANDY AND VERY SERIOUS` | One sharp boast |

## Priority (shipped this pass)

1. Victory / quest reward dialogs (quest.ts, hard-rewards)  
2. Princess Prizella champion + Best Bud pitch  
3. Surface/dunjun signs that teach  
4. Land bosses + mid-wardens  
5. Portals / hard mode gates  

## Keep as-is (non-elf that already works)

- Cube: `*WOBBLE* ...hi.` / dissolve-boots apology  
- Captain log: red shirts / gold shirt  
- Rules Lawyer binder voice (light polish only)  
- Ballad of Dust trail sign chorus line  
- Royal Goose: short HONK threats  

---

Rewrites live in code; this doc is the charter for the pass.
