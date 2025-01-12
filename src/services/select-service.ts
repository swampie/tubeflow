import * as PIXI from "pixi.js";
import { Process } from "../utils/types";
import { GlowFilter } from "pixi-filters";
import {
  DEFAULT_HIGHLIGHT_OPTIONS,
  HIGHLIGHTED_LINE_DEFAULT_WIDTH,
} from "../constants";
import { DrawingService } from "./drawing-service";

export class SelectService {
  private hoveredLine: Process | null = null;

  constructor(
    private drawingService: DrawingService,
  ) {}

  highlightLine(
    process: Process,
    options = DEFAULT_HIGHLIGHT_OPTIONS
  ): Process {
    if (process.highlighted) return process;
    process.highlighted = true;

    if (options.glow) {
      if (!process.glowFilter) {
        process.glowFilter = new GlowFilter({
          distance: 15,
          outerStrength: 2,
          innerStrength: 1,
          color: 0xffff00,
          quality: 0.5,
        });
      }
      process.line.filters = [process.glowFilter];
    } else {
      if (!process.outline) {
        process.outline = new PIXI.Graphics();
        process.line.parent.addChildAt(
          process.outline,
          process.line.parent.getChildIndex(process.line)
        );
      }

      process.outline.clear();
      process.outline.moveTo(process.coords[0].x, process.coords[0].y);
      this.drawingService.drawLine(
        process.outline,
        process.coords,
        {
          color: process.color,
          width: HIGHLIGHTED_LINE_DEFAULT_WIDTH,
          alpha: 0.5,
        },
        process.coords.length > 4
      );
    }

    return process;
  }

  removeHighlight(process: Process, options = DEFAULT_HIGHLIGHT_OPTIONS): void {
    if (!process.highlighted) return;
    process.highlighted = false;

    if (options.glow) {
      process.line.filters = [];
    } else {
      if (process.outline) {
        process.outline.clear();
      }
    }
  }

  setHoveredLine(process: Process | null): void {
    if (this.hoveredLine === process) return;

    if (this.hoveredLine) {
      this.removeHighlight(this.hoveredLine);
    }

    this.hoveredLine = process;
    if (process) {
      this.highlightLine(process);
    }
  }

  getHoveredLine(): Process | null {
    return this.hoveredLine;
  }
}
