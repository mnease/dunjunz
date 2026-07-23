import { describe, expect, it } from 'vitest';
import { defaultSave } from './save';
import {
  harvestOreVein,
  isOreVeinId,
  mineralFromVeinId,
  MINERAL_STACK,
} from './ore-vein';
import { ROOMS } from '../data/world';
import { validateRooms } from './room-validate';

describe('ore veins', () => {
  it('parses mineral from vein id', () => {
    expect(isOreVeinId('ore-vein-gold-1')).toBe(true);
    expect(mineralFromVeinId('ore-vein-mithril-b2')).toBe('mithril');
    expect(mineralFromVeinId('ore-vein-diamond-treas')).toBe('diamond');
    expect(mineralFromVeinId('chest-1')).toBe(null);
  });

  it('harvest grants stack once via collected', () => {
    let s = defaultSave();
    const r1 = harvestOreVein(s, 'ore-vein-gold-mine-1');
    expect(r1.harvested).toBe(true);
    expect(r1.save.stacks[MINERAL_STACK.gold]).toBe(1);
    expect(r1.save.collected).toContain('ore-vein-gold-mine-1');

    const r2 = harvestOreVein(r1.save, 'ore-vein-gold-mine-1');
    expect(r2.harvested).toBe(false);
    expect(r2.save.stacks[MINERAL_STACK.gold]).toBe(1);
  });

  it('gems also grant gem_rough', () => {
    const r = harvestOreVein(defaultSave(), 'ore-vein-ruby-ov');
    expect(r.save.stacks.gem_ruby).toBe(1);
    expect(r.save.stacks.gem_rough).toBe(1);
  });
});

describe('dwarvez mountain approach atmosphere', () => {
  it('north road rooms use snow and water', () => {
    const n1 = ROOMS.road_north_1!.tiles.join('');
    const n2 = ROOMS.road_north_2!.tiles.join('');
    expect(n1.includes('n')).toBe(true);
    expect(n1.includes('~')).toBe(true);
    expect(n2.includes('n')).toBe(true);
    // more snow chars further north
    const snow1 = (n1.match(/n/g) ?? []).length;
    const snow2 = (n2.match(/n/g) ?? []).length;
    expect(snow2).toBeGreaterThan(snow1);
  });

  it('dwarvez caves place ore veins of multiple minerals', () => {
    const veins: string[] = [];
    for (const r of Object.values(ROOMS)) {
      if (r.land !== 'dwarvez') continue;
      for (const e of r.entities ?? []) {
        if (e.kind === 'ore_vein' && e.id) veins.push(e.id);
      }
    }
    expect(veins.length).toBeGreaterThanOrEqual(8);
    const kinds = new Set(veins.map((id) => mineralFromVeinId(id)));
    expect(kinds.has('gold')).toBe(true);
    expect(kinds.has('mithril')).toBe(true);
    expect(kinds.has('diamond') || kinds.has('ruby') || kinds.has('emerald')).toBe(
      true,
    );
  });

  it('room-validate clean for mountain + dwarvez rooms', () => {
    const issues = validateRooms(ROOMS);
    const ids = Object.keys(ROOMS).filter(
      (id) => id.startsWith('road_north') || id.startsWith('dwarvez'),
    );
    const bad = issues.filter((i) => ids.includes(i.id));
    if (bad.length) console.error(bad);
    expect(bad).toEqual([]);
  });

  it('dwarvez cave interiors use dungeon dark / light rules', async () => {
    const { roomIsDark, ambientForRoom, AMBIENT_DARK, roomNeedsCarriedLight } =
      await import('./lighting');
    const caves = [
      'dwarvez_mouth',
      'dwarvez_hall',
      'dwarvez_treasury',
      'dwarvez_forje',
      'dwarvez_throne',
      'dwarvez_b1',
      'dwarvez_b1_mine',
      'dwarvez_b1_side',
      'dwarvez_b2',
    ];
    for (const id of caves) {
      const r = ROOMS[id]!;
      expect(r.dark, id).toBe(true);
      expect(roomIsDark(r), id).toBe(true);
      expect(ambientForRoom(r), id).toBe(AMBIENT_DARK);
    }
    // Outdoor approach stays daylit (not survival dark)
    expect(roomIsDark(ROOMS.dwarvez_gate!)).toBe(false);
    expect(roomIsDark(ROOMS.dwarvez_road!)).toBe(false);
    expect(ambientForRoom(ROOMS.dwarvez_gate!)).toBeGreaterThan(AMBIENT_DARK);
    // World law: dark rooms have zero authored torch_wall — carry + place light
    for (const id of caves) {
      const walls = (ROOMS[id]!.entities ?? []).filter(
        (e) => e.kind === 'torch_wall',
      );
      expect(walls, `${id} must have no authored wall torches`).toEqual([]);
    }
    expect(roomNeedsCarriedLight(ROOMS.dwarvez_hall!, 0)).toBe(true);
    // Placed/carried path: with any wall torch count, no "need carried" toast
    expect(roomNeedsCarriedLight(ROOMS.dwarvez_hall!, 2)).toBe(false);
  });
});
