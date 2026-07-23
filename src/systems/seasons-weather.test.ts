import { describe, expect, it } from 'vitest';
import {
  seasonFromMonth,
  weatherForSeason,
  weatherSlotIndex,
  resolveSeasonWeather,
  WEATHER_ROTATION,
  nextWeatherInRotation,
  isColdWeather,
} from './seasons-weather';

describe('seasons and weather', () => {
  it('maps months to four seasons (NH)', () => {
    expect(seasonFromMonth(1)).toBe('winter');
    expect(seasonFromMonth(2)).toBe('winter');
    expect(seasonFromMonth(12)).toBe('winter');
    expect(seasonFromMonth(3)).toBe('spring');
    expect(seasonFromMonth(6)).toBe('summer');
    expect(seasonFromMonth(9)).toBe('autumn');
  });

  it('winter rotation includes snowy and icy', () => {
    const w = WEATHER_ROTATION.winter;
    expect(w).toContain('snowy');
    expect(w).toContain('icy');
    expect(w).toContain('overcast');
  });

  it('weather cycles through season pool', () => {
    const a = weatherForSeason('winter', 0);
    const b = weatherForSeason('winter', 1);
    expect(WEATHER_ROTATION.winter).toContain(a);
    expect(WEATHER_ROTATION.winter).toContain(b);
    expect(nextWeatherInRotation('winter', 'snowy')).toBeTruthy();
  });

  it('slot index is stable for same period', () => {
    const d = new Date('2026-01-15T12:00:00Z');
    const a = weatherSlotIndex(d, 60_000);
    const b = weatherSlotIndex(d, 60_000);
    expect(a).toBe(b);
  });

  it('resolveSeasonWeather returns full outdoor state', () => {
    const jan = resolveSeasonWeather(new Date('2026-01-10T15:00:00'));
    expect(jan.season).toBe('winter');
    expect(['sunny', 'rainy', 'overcast', 'snowy', 'icy']).toContain(
      jan.weather,
    );
    expect(jan.label).toMatch(/WINTER/);
    expect(jan.skyColor).toBeGreaterThan(0);
    expect(isColdWeather('snowy')).toBe(true);
    expect(isColdWeather('sunny')).toBe(false);

    const jul = resolveSeasonWeather(new Date('2026-07-10T15:00:00'));
    expect(jul.season).toBe('summer');
  });
});
