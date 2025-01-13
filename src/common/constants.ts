import { ColorScheme } from "../utils/types";

export const GRID_SIZE = 20;
export const LINE_DEFAULT_WIDTH = 8
export const HIGHLIGHTED_LINE_DEFAULT_WIDTH = LINE_DEFAULT_WIDTH + 2
export const WORLD_WIDTH = 1000;
export const WORLD_HEIGHT = 1000;
export const GHOST_POINT_RADIUS = 5;
export const GHOST_POINT_COLOR = 0x00ff00;
export const DEFAULT_HIGHLIGHT_OPTIONS = {glow: false}

// Colors
export const DEFAULT_COLOR_SCHEME: ColorScheme = {
  colors: [
      0xB36305, 0xE32017, 0xFFD300, 0x00782A, 0x6950a1,
      0xF3A9BB, 0xA0A5A9, 0x9B0056, 0x000000, 0x003688,
      0x0098D4, 0x95CDBA, 0x00A4A7, 0xEE7C0E, 0x84B817, 0xE21836
  ]
};
