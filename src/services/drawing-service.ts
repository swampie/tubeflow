import * as PIXI from "pixi.js";
import { ColorService } from "./color-service";
import { Coordinates, Process, StrokeOptions } from "../utils/types";
import { LINE_DEFAULT_WIDTH } from "../common/constants";

export class DrawingService {
  private isDrawing = false;
  private linePoints: Coordinates[] = [];
  private activeLine: PIXI.Graphics | null = null;
  private activeColor: number | null = null;
  private processes: Process[] = [];

  constructor(
    private colorService: ColorService,
    private processContainer: PIXI.Container
  ) {}

  startNewLine(point: Coordinates) {
    this.activeLine = new PIXI.Graphics();
    this.activeColor = this.colorService.getNextColor();
    this.processContainer.addChild(this.activeLine);
    this.linePoints = [point];
    this.isDrawing = true;
  }

  addPoint(point: Coordinates) {
    if (!this.isDrawing || !this.activeLine) return;
    this.linePoints.push(point);
    this.updateActiveLine();
  }

  finalizeLine() {
    if (!this.activeLine || !this.activeColor) return;

    const processesCount = this.processes.length;
    const newProcess: Process = {
      id: processesCount + 1,
      coords: this.linePoints,
      line: this.activeLine,
      color: this.activeColor,
      $children: [],
      $parent: null,
    };

    this.processes.push(newProcess);

    // Reset state
    this.isDrawing = false;
    this.linePoints = [];
    this.activeLine = null;
    this.activeColor = null;

    return newProcess;
  }

  getAllProcesses(): Process[] {
    return this.processes;
  }

  getActiveLinePoints(): Coordinates[] {
    return this.linePoints;
  }



  isCurrentlyDrawing(): boolean {
    return this.isDrawing;
  }

  private updateActiveLine() {
    if (!this.activeLine || !this.activeColor) return;
    this.drawLine(
      this.activeLine,
      this.linePoints,
      {
        color: this.activeColor,
        width: LINE_DEFAULT_WIDTH,
      },
      this.linePoints.length > 4
    );
  }

  drawLine(
    line: PIXI.Graphics,
    coords: Coordinates[],
    strokeOptions: StrokeOptions,
    smooth = false
  ) {
    if (!line) return;

    line.clear();
    line.moveTo(coords[0].x, coords[0].y);

    if (!smooth) {
      // Simple straight lines
      for (let i = 1; i < coords.length; i++) {
        line.lineTo(coords[i].x, coords[i].y);
      }
    } else {
      // Smooth curved lines
      for (let i = 1; i < coords.length; i++) {
        const prevNode = coords[i - 1];
        const currNode = coords[i];
        const prevVector = {
          x: currNode.x - prevNode.x,
          y: currNode.y - prevNode.y,
        };

        if (i < coords.length - 1) {
          const nextNode = coords[i + 1];
          const nextVector = {
            x: nextNode.x - currNode.x,
            y: nextNode.y - currNode.y,
          };

          // Calculate control point as the intersection of the two vectors
          const controlPoint = {
            x: (prevNode.x + currNode.x) / 2,
            y: (prevNode.y + currNode.y) / 2,
          };

          // Draw a quadratic curve to the next point
          line.quadraticCurveTo(
            controlPoint.x,
            controlPoint.y,
            currNode.x,
            currNode.y
          );
        } else {
          // For the last point, draw a straight line
          line.lineTo(currNode.x, currNode.y);
        }
      }
    }

    line.stroke(strokeOptions);
  }

  resetDrawing() {
    if (this.activeLine) {
      this.activeLine.clear();
    }
    this.linePoints = [];
    this.activeLine = null;
    this.activeColor = null;
    this.isDrawing = false;
  }
}
