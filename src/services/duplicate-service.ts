import * as PIXI from "pixi.js";
import { Process, Coordinates } from "../utils/types";
import { LINE_DEFAULT_WIDTH } from "../common/constants";
import { DrawingService } from "./drawing-service";
import { ColorService } from "./color-service";

export class DuplicateService {
  constructor(
    private drawingService: DrawingService,
    private colorService: ColorService,
    private processContainer: PIXI.Container,
    private processes: Process[]
  ) {}

  duplicateLine(originalProcess: Process): Process {
    const offset = LINE_DEFAULT_WIDTH;
    const duplicatedCoords = this.calculateDuplicateCoordinates(
      originalProcess.coords,
      offset
    );

    const duplicatedLine = new PIXI.Graphics();
    const color = this.colorService.getNextColor();

    this.drawingService.drawLine(
      duplicatedLine,
      duplicatedCoords,
      { color, width: LINE_DEFAULT_WIDTH },
      duplicatedCoords.length > 4
    );

    this.processContainer.addChild(duplicatedLine);

    const newLineId = this.processes.length + 1;
    const newLine: Process = {
      id: newLineId,
      coords: duplicatedCoords,
      line: duplicatedLine,
      color,
      $parent: originalProcess.id,
      $children: [],
    };

    this.processes.push(newLine);

    if (!originalProcess.$children) {
      originalProcess.$children = [];
    }
    originalProcess.$children.push(newLineId);

    return newLine;
  }

  private calculateDuplicateCoordinates(
    originalCoords: Coordinates[],
    offset: number
  ): Coordinates[] {
    return originalCoords.map((point, index, array) => {
      const perpendicularAngle = this.calculatePerpendicularAngle(
        point,
        index,
        array
      );

      return {
        x: point.x + offset * Math.cos(perpendicularAngle),
        y: point.y + offset * Math.sin(perpendicularAngle),
      };
    });
  }

  private calculatePerpendicularAngle(
    point: Coordinates,
    index: number,
    array: Coordinates[]
  ): number {
    if (index === 0) {
      const nextPoint = array[index + 1];
      const angle = Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x);
      return angle + Math.PI / 2;
    } else if (index === array.length - 1) {
      const prevPoint = array[index - 1];
      const angle = Math.atan2(point.y - prevPoint.y, point.x - prevPoint.x);
      return angle + Math.PI / 2;
    } else {
      const prevPoint = array[index - 1];
      const nextPoint = array[index + 1];
      const anglePrev = Math.atan2(
        point.y - prevPoint.y,
        point.x - prevPoint.x
      );
      const angleNext = Math.atan2(
        nextPoint.y - point.y,
        nextPoint.x - point.x
      );
      return (anglePrev + angleNext) / 2 + Math.PI / 2;
    }
  }
}
