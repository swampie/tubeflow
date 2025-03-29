import { DrawingService } from "../services/drawing-service";
import * as PIXI from "pixi.js";
import { Coordinates, GridPosition } from "../utils/types";
import { snapToGrid } from "../common/grid";

export class DrawingHandler {
  constructor(
    private drawingService: DrawingService,
    private ghostPoint: PIXI.Graphics
  ) {
    this.ghostPoint = ghostPoint;
  }

  handleDrawing = (event: { x: number; y: number }) => {
    const { x, y } = event;

    if (this.shouldFinalizeLine(x, y)) {
      this.ghostPoint.visible = false;
      this.drawingService.finalizeLine();
      return;
    }

    if (!this.drawingService.isCurrentlyDrawing()) {
      this.drawingService.startNewLine({ x, y });
    } else {
      const nextPoint = this.calculateNextPoint(x, y);
      this.drawingService.addPoint(nextPoint);
    }
  }

  handleDrawingPreview(position: GridPosition) {
    // Snap to grid first
    const snappedPos = snapToGrid(position.x, position.y);
    
    // If not currently drawing, just show the ghost point at the snapped position
    if (!this.drawingService.isCurrentlyDrawing()) {
      this.ghostPoint.position.set(snappedPos.x, snappedPos.y);
      this.ghostPoint.visible = true;
      return;
    }
    
    // If we are drawing, apply the angle constraints
    const linePoints = this.drawingService.getActiveLinePoints();
    if (linePoints.length === 0) return;
    
    const lastPoint = linePoints[linePoints.length - 1];
    const angle = Math.atan2(position.y - lastPoint.y, position.x - lastPoint.x) * (180 / Math.PI);
    const directionConstrained = this.constrainToAngles(position.x, position.y, lastPoint, angle);
    const finalSnappedPoint = snapToGrid(directionConstrained.x, directionConstrained.y);
    
    this.ghostPoint.position.set(finalSnappedPoint.x, finalSnappedPoint.y);
    this.ghostPoint.visible = true;
  }
  
  private calculateNextPoint(x: number, y: number): Coordinates {
    const linePoints = this.drawingService.getActiveLinePoints();
    const lastPoint = linePoints[linePoints.length - 1];
  
    const angle = Math.atan2(y - lastPoint.y, x - lastPoint.x) * (180 / Math.PI);
    const directionConstrained = this.constrainToAngles(x, y, lastPoint, angle);
    
    // Ensure the point is snapped to grid
    return snapToGrid(directionConstrained.x, directionConstrained.y);
  }

  private shouldFinalizeLine(x: number, y: number): boolean {
    const linePoints = this.drawingService.getActiveLinePoints();
    if (linePoints.length <= 1) return false;

    const lastPoint = linePoints[linePoints.length - 1];
    const distance = Math.hypot(x - lastPoint.x, y - lastPoint.y);
    return distance < 15; // Threshold for completing the line
  }

  private constrainToAngles(
    x: number,
    y: number,
    lastPoint: Coordinates,
    angle: number
  ): Coordinates {
    // Normalize angle to 0-360
    const normalizedAngle = ((angle + 360) % 360 + 360) % 360;
    
    // Find the closest permitted angle (0, 45, 90, 135, 180, 225, 270, 315)
    let closestAngle = Math.round(normalizedAngle / 45) * 45;
    if (closestAngle === 360) closestAngle = 0;
    
    // Get distance from last point to current position
    const dx = x - lastPoint.x;
    const dy = y - lastPoint.y;
    const distance = Math.hypot(dx, dy);
    
    // Calculate new point based on angle
    switch (closestAngle) {
      case 0: // → Right
        return { x: lastPoint.x + distance, y: lastPoint.y };
      case 45: // ↗ Up-Right
        return { 
          x: lastPoint.x + distance * Math.cos(45 * Math.PI / 180), 
          y: lastPoint.y + distance * Math.sin(45 * Math.PI / 180)
        };
      case 90: // ↑ Up
        return { x: lastPoint.x, y: lastPoint.y + distance };
      case 135: // ↖ Up-Left
        return { 
          x: lastPoint.x - distance * Math.cos(45 * Math.PI / 180), 
          y: lastPoint.y + distance * Math.sin(45 * Math.PI / 180)
        };
      case 180: // ← Left
        return { x: lastPoint.x - distance, y: lastPoint.y };
      case 225: // ↙ Down-Left
        return { 
          x: lastPoint.x - distance * Math.cos(45 * Math.PI / 180),
          y: lastPoint.y - distance * Math.sin(45 * Math.PI / 180)
        };
      case 270: // ↓ Down
        return { x: lastPoint.x, y: lastPoint.y - distance };
      case 315: // ↘ Down-Right
        return { 
          x: lastPoint.x + distance * Math.cos(45 * Math.PI / 180),
          y: lastPoint.y - distance * Math.sin(45 * Math.PI / 180)
        };
      default:
        return { x, y };
    }
  }
}
