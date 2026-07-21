/** Native canvas size — 16:9 HD. */
export const GAME_W = 1280;
export const GAME_H = 720;
/**
 * Logical tile step in the room grid (world units before display scale).
 * Textures render at ART_RES (32) for 16-bit density; sprites use SPRITE_SCALE
 * so they still occupy TILE×SCALE world pixels.
 */
export const TILE = 16;
/** Canvas resolution for map tiles, avatar, enemies (SNES-era density). */
export const ART_RES = 32;
export const SCALE = 3;
/** Phaser scale so an ART_RES×ART_RES texture covers TILE×SCALE world pixels. */
export const SPRITE_SCALE = (TILE * SCALE) / ART_RES;
/**
 * Two-row chrome: vitals (row 1) + place/hints (row 2).
 * Tall enough for Press Start 2P without clipping.
 */
export const HUD_H = 64;

/**
 * Live dungeon grid fills the playfield under the HUD (16:9).
 * Authored rooms stay 16×11 in world.ts and expand at load (room-expand).
 * 26×13 × 48px = 1248×624 — nearly full 1280×656 play area.
 */
export const VIEW_TILES_W = Math.floor(GAME_W / (TILE * SCALE));
export const VIEW_TILES_H = Math.floor((GAME_H - HUD_H) / (TILE * SCALE));

export const MAP_PIXEL_W = VIEW_TILES_W * TILE * SCALE;
export const MAP_PIXEL_H = VIEW_TILES_H * TILE * SCALE;

/** Pixel playfield below HUD (may be slightly larger than MAP_* if not divisible). */
export const PLAY_W = GAME_W;
export const PLAY_H = GAME_H - HUD_H;

export const COLORS = {
  black: 0x0a0c10,
  floor: 0x2b2438,
  floorAlt: 0x342b45,
  wall: 0x5c4d7a,
  wallDark: 0x3a3150,
  grass: 0x2f6b45,
  grassAlt: 0x3a7d52,
  dirt: 0x6b5344,
  water: 0x2a5f8f,
  lava: 0xc44b2b,
  gold: 0xffc857,
  green: 0x7dffb3,
  pink: 0xff6b9d,
  white: 0xf4f0ff,
  red: 0xe74c3c,
  slime: 0x5ad45a,
  bone: 0xe8e0d0,
  redshirt: 0xc0392b,
  panel: 0x12161f,
  panelBorder: 0x7dffb3,
};

export const SAVE_KEY = 'dunjunz-save-v1';
