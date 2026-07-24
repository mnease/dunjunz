import { describe, expect, it } from 'vitest';
import {
  seasonFromMonth,
  weatherForSeason,
  weatherSlotIndex,
  resolveSeasonWeather,
  WEATHER_ROTATION,
  nextWeatherInRotation,
  isColdWeather,
  isWeatherRoom,
  shouldWeatherTintGround,
  weatherPrecipActive,
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

describe('Phase E weather room + precip gates', () => {
  it('isWeatherRoom is outdoor surface only (not guild / dark / basements)', () => {
    expect(
      isWeatherRoom({ id: 'meadow_1', floor: 0, land: 'woodz' }),
    ).toBe(true);
    expect(
      isWeatherRoom({ id: 'beach_start', floor: 0, land: 'surface' }),
    ).toBe(true);
    expect(
      isWeatherRoom({ id: 'guild_hall', floor: 0, land: 'surface' }),
    ).toBe(false);
    expect(
      isWeatherRoom({ id: 'cave_b2', floor: -2, land: 'dunjunz', dark: true }),
    ).toBe(false);
    expect(
      isWeatherRoom({ id: 'basement', floor: -1, land: 'dunjunz' }),
    ).toBe(false);
  });

  it('weatherPrecipActive requires outdoor room, precip, and no reduceMotion', () => {
    const outdoor = { id: 'meadow_1', floor: 0, land: 'woodz' };
    expect(
      weatherPrecipActive({
        room: outdoor,
        precip: 'rain',
        reduceMotion: false,
      }),
    ).toBe(true);
    expect(
      weatherPrecipActive({
        room: outdoor,
        precip: 'rain',
        reduceMotion: true,
      }),
    ).toBe(false);
    expect(
      weatherPrecipActive({
        room: outdoor,
        precip: 'none',
        reduceMotion: false,
      }),
    ).toBe(false);
    expect(
      weatherPrecipActive({
        room: { id: 'guild_hall', floor: 0, land: 'surface' },
        precip: 'rain',
        reduceMotion: false,
      }),
    ).toBe(false);
  });

  it('shouldWeatherTintGround covers grass/dirt/sand and beach floor', () => {
    expect(shouldWeatherTintGround('grass', false)).toBe(true);
    expect(shouldWeatherTintGround('dirt', false)).toBe(true);
    expect(shouldWeatherTintGround('sand', false)).toBe(true);
    expect(shouldWeatherTintGround('floor', true)).toBe(true);
    expect(shouldWeatherTintGround('floor', false)).toBe(false);
    expect(shouldWeatherTintGround('wall', false)).toBe(false);
    expect(shouldWeatherTintGround('water', false)).toBe(false);
  });
});

