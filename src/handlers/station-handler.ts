import * as PIXI from "pixi.js";
import { StationService } from "../services/station-service";
import { isPointNearLine } from "../util";
import { Process, Coordinates } from "../utils/types";
import { getClosestPointOnLines } from "../utils/geometry-utils";

export class StationHandler {
  constructor(
    private stationService: StationService,
    private ghostPoint: PIXI.Graphics,
    private processes: Process[]
  ) {}

  handleStationPreview(position: Coordinates): void {
    const closeLines = this.findClosestLines(position);

    if (closeLines.length > 0) {
      const closestPoint = this.getClosestPointOnLines(position, closeLines);

      this.ghostPoint.position.set(closestPoint.x, closestPoint.y);
      this.ghostPoint.visible = true;
    } else {
      this.ghostPoint.visible = false;
    }
  }

  handleStationPlacement(position: Coordinates): void {
    const closeLines = this.findClosestLines(position);

    if (closeLines.length > 0) {
      const stationCoords = this.getClosestPointOnLines(position, closeLines);

      this.stationService.createStation(stationCoords, closeLines);
    }
  }

  private getClosestPointOnLines(position: Coordinates, lines: Process[]): Coordinates {
    const processCoords = lines.map((line) => line.coords);
    return getClosestPointOnLines(position, processCoords);
  }

  private findClosestLines(position: Coordinates): Process[] {
    const closeProcesses = this.processes.filter((process) =>
      isPointNearLine(position, process.coords)
    );

    const relatedLines = new Set<Process>();
    closeProcesses.forEach((process) => {
      const allRelated = this.getAllRelatedLines(process);
      allRelated.forEach((line) => relatedLines.add(line));
    });

    return Array.from(relatedLines);
  }

  private getAllRelatedLines(process: Process): Process[] {
    const relatedLines = new Set<Process>();
    const toProcess = [process];

    while (toProcess.length > 0) {
      const currentLine = toProcess.pop();
      if (!currentLine || relatedLines.has(currentLine)) continue;

      relatedLines.add(currentLine);

      if (currentLine.$parent) {
        const parentLine = this.processes.find(
          (p) => p.id === currentLine.$parent
        );
        if (parentLine) toProcess.push(parentLine);
      }

      if (currentLine.$children) {
        currentLine.$children.forEach((childId) => {
          const childLine = this.processes.find((p) => p.id === childId);
          if (childLine) toProcess.push(childLine);
        });
      }
    }

    return Array.from(relatedLines);
  }
}
