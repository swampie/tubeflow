import * as PIXI from "pixi.js";
import { Process, Station } from "../utils/types";
import { GlowFilter } from "pixi-filters";
import {
  DEFAULT_HIGHLIGHT_OPTIONS,
  HIGHLIGHTED_LINE_DEFAULT_WIDTH,
} from "../common/constants";
import { DrawingService } from "./drawing-service";

export type SelectableElement = Process | Station;

export class SelectService {
  private hoveredElement: SelectableElement | null = null;
  private selectedElement: SelectableElement | null = null;
  private drawer: HTMLElement;
  private stationProps: HTMLElement;
  private lineProps: HTMLElement;

  constructor(
    private drawingService: DrawingService,
  ) {
    this.drawer = document.getElementById('properties-drawer')!;
    this.stationProps = document.getElementById('station-properties')!;
    this.lineProps = document.getElementById('line-properties')!;
    this.setupDrawerListeners();
  }

  private setupDrawerListeners() {
    document.getElementById('close-drawer')?.addEventListener('click', () => {
      this.clearSelection();
    });

    document.getElementById('station-name')?.addEventListener('change', (e) => {
      if (this.selectedElement && 'name' in this.selectedElement) {
        this.updateStationName(this.selectedElement, (e.target as HTMLInputElement).value);
      }
    });

    document.getElementById('line-color')?.addEventListener('change', (e) => {
      if (this.selectedElement && !('name' in this.selectedElement)) {
        this.updateLineColor(this.selectedElement, parseInt((e.target as HTMLInputElement).value.slice(1), 16));
      }
    });
  }

  selectElement(element: SelectableElement): void {
    this.selectedElement = element;
    this.showDrawer();
    this.updateDrawerContent();
  }

  private showDrawer(): void {
    this.drawer.classList.add('open');
  }

  private hideDrawer(): void {
    this.drawer.classList.remove('open');
  }

  private updateDrawerContent(): void {
    if (!this.selectedElement) return;

    if ('name' in this.selectedElement) {
      // Station properties
      this.stationProps.style.display = 'block';
      this.lineProps.style.display = 'none';
      (document.getElementById('station-name') as HTMLInputElement).value = this.selectedElement.name;
    } else {
      // Line properties
      this.stationProps.style.display = 'none';
      this.lineProps.style.display = 'block';
      (document.getElementById('line-color') as HTMLInputElement).value = 
        '#' + this.selectedElement.color.toString(16).padStart(6, '0');
    }
  }

  private updateStationName(station: Station, newName: string): void {
    station.name = newName;
    // Update station visual label
    if (station.graphic) {
      // Remove existing label if any
      const existingLabel = station.graphic.children.find(child => child instanceof PIXI.Text);
      if (existingLabel) station.graphic.removeChild(existingLabel);
      
      // Add new label
      const label = new PIXI.Text({
        text: newName,
        position: { x: station.coords.x, y: station.coords.y - 20 },
        style: {
          fontFamily: 'Arial',
          fontSize: 12,
          fill: 0x000000
        }
        
      });
      station.graphic.addChild(label);
    }
  }

  private updateLineColor(line: Process, newColor: number): void {
    line.color = newColor;
    this.drawingService.drawLine(
      line.line, 
      line.coords, 
      { color: newColor, width: line.line.width },
      line.coords.length > 4
    );
  }

  clearSelection(): void {
    this.selectedElement = null;
    this.hideDrawer();
  }

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

  removeHighlight(selected: SelectableElement, options = DEFAULT_HIGHLIGHT_OPTIONS): void {
    
    if (!selected.highlighted) return;
    selected.highlighted = false;

    if (options.glow) {
      (selected as Process).line.filters = [];
    } else {
      if ((selected as Process).outline) {
        (selected as Process).outline.clear();
      }
    }
  }

  setHoveredLine(process: Process | null): void {
    if (this.hoveredElement === process) return;

    if (this.hoveredElement) {
      this.removeHighlight(this.hoveredElement);
    }

    this.hoveredElement = process;
    if (process) {
      this.highlightLine(process);
    }
  }

  getHoveredLine(): Process | null {
    return this.hoveredElement as Process;
  }
}
