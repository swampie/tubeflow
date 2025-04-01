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
    if (!line || coords.length < 2) return;
  
    line.clear();
    
    // If not smooth or too few points, just draw straight lines
    if (!smooth || coords.length <= 2) {
      line.moveTo(coords[0].x, coords[0].y);
      for (let i = 1; i < coords.length; i++) {
        line.lineTo(coords[i].x, coords[i].y);
      }
    } else {
      // Start at the first point
      line.moveTo(coords[0].x, coords[0].y);
      
      // For each segment (except the last one)
      for (let i = 1; i < coords.length - 1; i++) {
        const prev = coords[i - 1];
        const curr = coords[i];
        const next = coords[i + 1];
        
        // Determine the corner radius - small value for subtle curves
        // Adjust this value to control how rounded the corners are
        const cornerRadius = 10; 
        
        // Calculate vectors for the segments
        const prevToCurrentVector = {
          x: curr.x - prev.x,
          y: curr.y - prev.y
        };
        
        const currentToNextVector = {
          x: next.x - curr.x,
          y: next.y - curr.y
        };
        
        // Calculate the distance of each segment
        const prevSegmentLength = Math.sqrt(
          prevToCurrentVector.x * prevToCurrentVector.x + 
          prevToCurrentVector.y * prevToCurrentVector.y
        );
        
        const nextSegmentLength = Math.sqrt(
          currentToNextVector.x * currentToNextVector.x + 
          currentToNextVector.y * currentToNextVector.y
        );
        
        // Calculate the proportion of the radius relative to segment length
        // This ensures we don't exceed the length of either segment
        const maxRadiusPrev = Math.min(cornerRadius, prevSegmentLength * 0.4);
        const maxRadiusNext = Math.min(cornerRadius, nextSegmentLength * 0.4);
        const useRadius = Math.min(maxRadiusPrev, maxRadiusNext);
        
        // Calculate points where the rounded corner starts and ends
        const cornerStartPoint = {
          x: curr.x - (prevToCurrentVector.x / prevSegmentLength) * useRadius,
          y: curr.y - (prevToCurrentVector.y / prevSegmentLength) * useRadius
        };
        
        const cornerEndPoint = {
          x: curr.x + (currentToNextVector.x / nextSegmentLength) * useRadius,
          y: curr.y + (currentToNextVector.y / nextSegmentLength) * useRadius
        };
        
        // Draw line to the start of the corner
        line.lineTo(cornerStartPoint.x, cornerStartPoint.y);
        
        // Draw the curved corner
        line.quadraticCurveTo(
          curr.x, curr.y,  // Control point at the actual corner
          cornerEndPoint.x, cornerEndPoint.y // End at the exit point of the corner
        );
      }
      
      // Draw the final segment to the last point
      line.lineTo(coords[coords.length - 1].x, coords[coords.length - 1].y);
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
