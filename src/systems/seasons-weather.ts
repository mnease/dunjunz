/**
 * Four seasons + outdoor weather.
 * Season follows real calendar (Northern Hemisphere).
 * Weather rotates on a short cycle; winter prefers snowy / icy.
 */

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export type Weather =
  | 'sunny'
  | 'rainy'
  | 'overcast'
  | 'snowy'
  | 'icy';

export interface SeasonWeatherState {
  season: Season;
  weather: Weather;
  /** Sky / void backdrop. */
  skyColor: number;
  /** Multiply tint on grass / outdoor ground (0xffffff = none). */
  groundTint: number;
  /** Ambient light factor 0.55–1.05 (overcast dimmer). */
  lightMul: number;
  /** Label for HUD toast / mapz. */
  label: string;
  /** Show precipitation particles. */
  precip: 'none' | 'rain' | 'snow' | 'sleet';
  /** Cloud shade strength mult (overcast = heavier). */
  cloudMul: number;
  /** Tree shadow strength mult (sunny = strong, overcast weak). */
  sunShadowMul: number;
}

const SEASON_ORDER: Season[] = ['spring', 'summer', 'autumn', 'winter'];

/** Northern Hemisphere month → season (1–12). */
export function seasonFromMonth(month1to12: number): Season {
  const m = ((month1to12 - 1) % 12) + 1;
  if (m === 12 || m <= 2) return 'winter';
  if (m <= 5) return 'spring';
  if (m <= 8) return 'summer';
  return 'autumn';
}

export function seasonFromDate(d: Date = new Date()): Season {
  return seasonFromMonth(d.getMonth() + 1);
}

/** Weather pools by season (winter includes snowy + icy). */
export const WEATHER_ROTATION: Record<Season, readonly Weather[]> = {
  spring: ['sunny', 'rainy', 'overcast', 'rainy', 'sunny'],
  summer: ['sunny', 'sunny', 'overcast', 'rainy', 'sunny'],
  autumn: ['overcast', 'rainy', 'sunny', 'overcast', 'rainy'],
  /** Winter months: snowy & icy rotate with overcast / rare sun. */
  winter: ['snowy', 'icy', 'overcast', 'snowy', 'icy', 'sunny'],
};

/**
 * Weather slot index advances every `periodMs` (default 12 real minutes).
 * Seeded by date day + slot so all clients agree.
 */
export function weatherSlotIndex(
  d: Date = new Date(),
  periodMs = 12 * 60 * 1000,
): number {
  const dayKey =
    d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  const slot = Math.floor(d.getTime() / periodMs);
  return (dayKey * 17 + slot) >>> 0;
}

export function weatherForSeason(
  season: Season,
  slotIndex: number,
): Weather {
  const pool = WEATHER_ROTATION[season];
  return pool[slotIndex % pool.length]!;
}

export function seasonWeatherAt(d: Date = new Date()): {
  season: Season;
  weather: Weather;
  slot: number;
} {
  const season = seasonFromDate(d);
  const slot = weatherSlotIndex(d);
  return { season, weather: weatherForSeason(season, slot), slot };
}

function seasonSkyBase(season: Season): number {
  switch (season) {
    case 'spring':
      return 0x8ec8e8;
    case 'summer':
      return 0x5ab0e8;
    case 'autumn':
      return 0xc4a878;
    case 'winter':
      return 0xa8b8c8;
  }
}

function applyWeatherToSky(base: number, weather: Weather): number {
  const r = (base >> 16) & 0xff;
  const g = (base >> 8) & 0xff;
  const b = base & 0xff;
  let tr = r;
  let tg = g;
  let tb = b;
  switch (weather) {
    case 'sunny':
      tr = Math.min(255, r + 12);
      tg = Math.min(255, g + 8);
      break;
    case 'rainy':
      tr = Math.floor(r * 0.55);
      tg = Math.floor(g * 0.6);
      tb = Math.floor(b * 0.7);
      break;
    case 'overcast':
      tr = Math.floor(r * 0.65);
      tg = Math.floor(g * 0.68);
      tb = Math.floor(b * 0.72);
      break;
    case 'snowy':
      tr = Math.floor(r * 0.75 + 40);
      tg = Math.floor(g * 0.78 + 40);
      tb = Math.floor(b * 0.85 + 50);
      break;
    case 'icy':
      tr = Math.floor(r * 0.7 + 20);
      tg = Math.floor(g * 0.8 + 35);
      tb = Math.floor(b * 0.95 + 40);
      break;
  }
  return (
    (Math.min(255, tr) << 16) |
    (Math.min(255, tg) << 8) |
    Math.min(255, tb)
  );
}

function groundTint(season: Season, weather: Weather): number {
  // Seasonal base
  let tint =
    season === 'autumn'
      ? 0xffd0a0
      : season === 'winter'
        ? 0xd0e0f0
        : season === 'spring'
          ? 0xe8ffe8
          : 0xffffff;
  if (weather === 'snowy' || weather === 'icy') tint = 0xe8f0ff;
  if (weather === 'rainy') tint = 0xc0d0c8;
  if (weather === 'overcast' && season !== 'winter') tint = 0xd8d8d0;
  return tint;
}

export function resolveSeasonWeather(
  d: Date = new Date(),
): SeasonWeatherState {
  const { season, weather } = seasonWeatherAt(d);
  const skyColor = applyWeatherToSky(seasonSkyBase(season), weather);
  const precip: SeasonWeatherState['precip'] =
    weather === 'rainy'
      ? 'rain'
      : weather === 'snowy'
        ? 'snow'
        : weather === 'icy'
          ? 'sleet'
          : 'none';
  const lightMul =
    weather === 'sunny'
      ? 1.05
      : weather === 'overcast'
        ? 0.72
        : weather === 'rainy'
          ? 0.65
          : weather === 'snowy'
            ? 0.85
            : 0.78;
  const cloudMul =
    weather === 'overcast'
      ? 1.6
      : weather === 'rainy'
        ? 1.4
        : weather === 'snowy'
          ? 1.2
          : weather === 'sunny'
            ? 0.7
            : 1.1;
  const sunShadowMul =
    weather === 'sunny' ? 1.15 : weather === 'overcast' || weather === 'rainy' ? 0.35 : 0.55;

  return {
    season,
    weather,
    skyColor,
    groundTint: groundTint(season, weather),
    lightMul,
    label: `${season.toUpperCase()} · ${weather.toUpperCase()}`,
    precip,
    cloudMul,
    sunShadowMul,
  };
}

export function seasonLabel(s: Season): string {
  return s.toUpperCase();
}

export function weatherLabel(w: Weather): string {
  return w.toUpperCase();
}

/** Next weather in the seasonal rotation (for tests / debug). */
export function nextWeatherInRotation(
  season: Season,
  current: Weather,
): Weather {
  const pool = WEATHER_ROTATION[season];
  const i = pool.indexOf(current);
  return pool[(i + 1) % pool.length]!;
}

export function isColdWeather(w: Weather): boolean {
  return w === 'snowy' || w === 'icy';
}

/**
 * Rooms that get sky weather + precip (not indoor guild / caves).
 * Broader outdoor surface check is in surface-sun; weather is stricter.
 */
export function isWeatherRoom(room: {
  id?: string;
  floor?: number;
  dark?: boolean;
  land?: string;
}): boolean {
  if (room.dark === true) return false;
  if ((room.floor ?? 0) < 0) return false;
  const id = (room.id ?? '').toLowerCase();
  if (id.includes('guild') || id.includes('hall') || id.includes('shop')) {
    // Training guild etc. are indoors on surface floor
    if (id.includes('guild')) return false;
  }
  const land = room.land ?? '';
  return (
    land === 'surface' ||
    land === 'woodz' ||
    land === 'dezertz' ||
    land === 'sewerz' || // mouth/open pipes can feel outdoor; skip if dark
    id.includes('beach') ||
    id.includes('meadow') ||
    id.includes('overworld') ||
    id.includes('path') ||
    id.includes('dunes') ||
    id.includes('edge') ||
    id.includes('hollow')
  );
}

export { SEASON_ORDER };
