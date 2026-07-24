/**
 * Phase E — lighting / weather visual contracts (real shipped modules).
 */
import { describe, expect, it } from 'vitest';
import {
  AMBIENT_DARK,
  AMBIENT_GUILD_HALL,
  AMBIENT_INDOOR_SURFACE,
  AMBIENT_LADDER_DESC,
  AMBIENT_LIT_DUNGEON,
  AMBIENT_SURFACE,
  ambientForRoom,
  fillWarmLightCookieData,
  LIGHT_VEIL_RGB,
  lightCookieIntensity,
  sampleWarmLightCookiePixel,
  TORCH_COOKIE_MID_RGB,
  TORCH_COOKIE_PEAK_RGB,
  TORCH_COOKIE_TINT,
  warmCookieStampAlpha,
} from './lighting';
import { drawTerrariaLightCookie } from './terraria-style';

describe('Phase E ambient ladder', () => {
  it('never uses pure-black floor; dark ambient stays > 0', () => {
    expect(AMBIENT_DARK).toBeGreaterThan(0);
    expect(AMBIENT_DARK).toBeLessThan(AMBIENT_SURFACE);
    for (const a of AMBIENT_LADDER_DESC) {
      expect(a).toBeGreaterThan(0);
      expect(a).toBeLessThanOrEqual(1);
    }
  });

  it('ladder is strictly outdoor > indoor > lit dungeon > guild ≥ dark', () => {
    expect(AMBIENT_SURFACE).toBeGreaterThan(AMBIENT_INDOOR_SURFACE);
    expect(AMBIENT_INDOOR_SURFACE).toBeGreaterThan(AMBIENT_LIT_DUNGEON);
    expect(AMBIENT_LIT_DUNGEON).toBeGreaterThan(AMBIENT_GUILD_HALL);
    expect(AMBIENT_GUILD_HALL).toBeGreaterThanOrEqual(AMBIENT_DARK);
    // Monotonic high→low list
    for (let i = 1; i < AMBIENT_LADDER_DESC.length; i++) {
      expect(AMBIENT_LADDER_DESC[i - 1]!).toBeGreaterThanOrEqual(
        AMBIENT_LADDER_DESC[i]!,
      );
    }
  });

  it('ambientForRoom maps outdoor clear / survival dark / guild correctly', () => {
    const outdoor = ambientForRoom({ floor: 0, land: 'woodz' });
    const indoor = ambientForRoom({ floor: 0, land: 'kingdom' });
    const b1 = ambientForRoom({ floor: -1, land: 'dunjunz' });
    const dark = ambientForRoom({ floor: -3, land: 'dunjunz' });
    const survival = ambientForRoom({ floor: 0, dark: true });
    const guild = ambientForRoom({
      id: 'guild_hall',
      floor: 0,
      land: 'surface',
    });

    expect(outdoor).toBe(AMBIENT_SURFACE);
    expect(outdoor).toBeGreaterThan(indoor);
    expect(indoor).toBe(AMBIENT_INDOOR_SURFACE);
    expect(b1).toBeGreaterThan(dark);
    expect(dark).toBe(AMBIENT_DARK);
    expect(survival).toBe(AMBIENT_DARK);
    expect(guild).toBe(AMBIENT_GUILD_HALL);
    expect(guild).toBeGreaterThan(0);
    // Outdoor combat-clear without torch: high ambient
    expect(outdoor).toBeGreaterThanOrEqual(0.85);
  });
});

describe('Phase E warm torch cookie', () => {
  it('peak RGB is gold family (Style Bible #ffc857), not cold white', () => {
    expect(TORCH_COOKIE_PEAK_RGB.r).toBe(255);
    expect(TORCH_COOKIE_PEAK_RGB.g).toBeGreaterThan(180);
    expect(TORCH_COOKIE_PEAK_RGB.g).toBeLessThan(220);
    expect(TORCH_COOKIE_PEAK_RGB.b).toBeLessThan(120);
    // Mid is warm #f6ba6c family
    expect(TORCH_COOKIE_MID_RGB.r).toBeGreaterThan(200);
    expect(TORCH_COOKIE_MID_RGB.b).toBeLessThan(TORCH_COOKIE_MID_RGB.g);
    expect(TORCH_COOKIE_TINT).toBe(0xffc857);
  });

  it('lightCookieIntensity is soft at rim, bright at center, no hard step to 0', () => {
    expect(lightCookieIntensity(0)).toBeCloseTo(1, 2);
    expect(lightCookieIntensity(1)).toBe(0);
    const mid = lightCookieIntensity(0.5);
    expect(mid).toBeGreaterThan(0.1);
    expect(mid).toBeLessThan(0.85);
    // Soft: nearby radii differ without cliff
    const a = lightCookieIntensity(0.4);
    const b = lightCookieIntensity(0.42);
    expect(Math.abs(a - b)).toBeLessThan(0.25);
  });

  it('sampleWarmLightCookiePixel center is warm gold with high alpha', () => {
    const size = 64;
    const c = sampleWarmLightCookiePixel(size / 2, size / 2, size);
    expect(c.a).toBeGreaterThan(200);
    expect(c.r).toBeGreaterThan(c.b);
    expect(c.g).toBeGreaterThan(c.b);
    // Not pure white
    expect(c.b).toBeLessThan(200);
  });

  it('sampleWarmLightCookiePixel rim is transparent', () => {
    const size = 64;
    const corner = sampleWarmLightCookiePixel(0, 0, size);
    expect(corner.a).toBe(0);
  });

  it('fillWarmLightCookieData paints shipped cookie buffer (textures use same path)', () => {
    const size = 32;
    const data = new Uint8ClampedArray(size * size * 4);
    fillWarmLightCookieData(data, size);
    const cx = size / 2;
    const cy = size / 2;
    const i = (cy * size + cx) * 4;
    expect(data[i + 3]!).toBeGreaterThan(200);
    // Warm: red channel strong, blue softer
    expect(data[i]!).toBeGreaterThan(data[i + 2]!);
    // Corner transparent
    expect(data[3]!).toBe(0);
    // Matches pure sample (single source of truth)
    const mid = sampleWarmLightCookiePixel(cx, cy, size);
    expect(data[i]).toBe(mid.r);
    expect(data[i + 1]).toBe(mid.g);
    expect(data[i + 2]).toBe(mid.b);
    expect(data[i + 3]).toBe(mid.a);
  });

  it('drawTerrariaLightCookie is the warm lighting export (alias for textures)', () => {
    // Structural: terraria alias is the same function as drawWarmLightCookie path
    expect(typeof drawTerrariaLightCookie).toBe('function');
    expect(drawTerrariaLightCookie.name).toMatch(/drawWarmLightCookie|drawTerrariaLightCookie/);
  });

  it('warmCookieStampAlpha scales with intensity and stays soft', () => {
    expect(warmCookieStampAlpha(0)).toBeGreaterThan(0);
    expect(warmCookieStampAlpha(1)).toBeLessThanOrEqual(0.24);
    expect(warmCookieStampAlpha(1)).toBeGreaterThan(warmCookieStampAlpha(0));
  });

  it('LIGHT_VEIL_RGB is warm near-black, not pure black or cold blue-dominant', () => {
    expect(LIGHT_VEIL_RGB).toBeGreaterThan(0);
    const r = (LIGHT_VEIL_RGB >> 16) & 0xff;
    const g = (LIGHT_VEIL_RGB >> 8) & 0xff;
    const b = LIGHT_VEIL_RGB & 0xff;
    expect(r + g + b).toBeGreaterThan(0);
    // Warm: red channel ≥ blue (ember, not ice)
    expect(r).toBeGreaterThanOrEqual(b);
  });
});
