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
    if (!this.drawingService.isCurrentlyDrawing()) return;

    const snappedPos = snapToGrid(position.x, position.y);
    const constrainedPoint = this.calculateConstrainedPoint(snappedPos);

    this.ghostPoint.position.set(constrainedPoint.x, constrainedPoint.y);
    this.ghostPoint.visible = true;
  }

  private shouldFinalizeLine(x: number, y: number): boolean {
    const linePoints = this.drawingService.getActiveLinePoints();
    if (linePoints.length <= 1) return false;

    const lastPoint = linePoints[linePoints.length - 1];
    const distance = Math.hypot(x - lastPoint.x, y - lastPoint.y);
    return distance < 15; // Threshold for completing the line
  }

  private calculateNextPoint(x: number, y: number): Coordinates {
    const linePoints = this.drawingService.getActiveLinePoints();
    const lastPoint = linePoints[linePoints.length - 1];

    const angle =
      Math.atan2(y - lastPoint.y, x - lastPoint.x) * (180 / Math.PI);
    return this.constrainToAngles(x, y, lastPoint, angle);
  }

  private calculateConstrainedPoint(pos: Coordinates): Coordinates {
    const linePoints = this.drawingService.getActiveLinePoints();
    const lastPoint = linePoints[linePoints.length - 1];

    const angle =
      Math.atan2(pos.y - lastPoint.y, pos.x - lastPoint.x) * (180 / Math.PI);

    return this.constrainToAngles(pos.x, pos.y, lastPoint, angle);
  }

  private constrainToAngles(
    x: number,
    y: number,
    lastPoint: Coordinates,
    angle: number
  ): Coordinates {
    if (Math.abs(angle) % 45 === 0) return { x, y };

    if (Math.abs(angle) < 22.5 || Math.abs(angle) > 157.5) {
      return { x, y: lastPoint.y }; // horizontal
    }

    if (Math.abs(angle) < 67.5) {
      // 45° logic
      const dx = x - lastPoint.x;
      const dy = y - lastPoint.y;
      const dist = Math.abs(dx);

      if (Math.abs(dy) > Math.abs(dx)) {
        return {
          x,
          y: lastPoint.y + Math.sign(dy) * dist,
        };
      }
      return {
        x: lastPoint.x + Math.sign(dx) * Math.abs(dy),
        y,
      };
    }

    return { x: lastPoint.x, y }; // vertical
  }
}
