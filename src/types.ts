import * as PIXI from "pixi.js";
import { GlowFilter } from "pixi-filters";


// Domain Types
export interface Coordinates {
  x: number;
  y: number;
}

export interface Process {
  id: number;
  coords: Coordinates[];
  line: PIXI.Graphics;
  color: number;
  $children: number[];
  $parent: number | null;
  highlighted?: boolean;
  outline?: PIXI.Graphics;
  glowFilter?: GlowFilter;
}

export interface Station {
  id: number;
  name: string;
  coords: Coordinates;
  lines: number[];
  graphic: PIXI.Graphics;
}

export interface HighlightOptions {
  glow: boolean;
}

export interface StrokeOptions {
  color: number;
  width: number;
  alpha?: number;
}

export interface GridPosition {
  x: number;
  y: number;
}

export type ToolType = "line" | "select" | "duplicate" | "station" | null;
