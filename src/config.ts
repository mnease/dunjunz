export const GAME_W = 768;
export const GAME_H = 576;
export const TILE = 16;
export const SCALE = 3;
export const VIEW_TILES_W = 16;
export const VIEW_TILES_H = 11;
export const HUD_H = 48;
export const MAP_PIXEL_W = VIEW_TILES_W * TILE * SCALE;
export const MAP_PIXEL_H = VIEW_TILES_H * TILE * SCALE;

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
