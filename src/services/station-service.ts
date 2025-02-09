import * as PIXI from "pixi.js";
import { Station, Process, Coordinates } from "../utils/types";

export class StationService {
  private stations: Station[] = [];

 getAllStations(): Station[] {
    return this.stations;
 }

  constructor(
    private stationContainer: PIXI.Container,
    private processes: Process[] // Reference to processes array
  ) {}

  createStation(stationCoords: Coordinates, lines: Process[]): Station {
    const stationId = this.stations.length + 1;
    const station: Station = {
      id: stationId,
      name: `station_${stationId}`,
      coords: stationCoords,
      lines: lines.map((line) => line.id),
      graphic: null,
    };

    if (lines.length === 1) {
      station.graphic = this.drawSingleLineStation(lines[0], stationCoords);
    } else {
      station.graphic = this.drawMultiLineStation(lines, stationCoords);
    }

    this.stations.push(station);
    return station;
  }

  drawSingleLineStation(
    line: Process,
    coords: Coordinates
  ): PIXI.Graphics {
    const station = new PIXI.Graphics();
    const radius = 5;

    station.circle(coords.x, coords.y, radius);
    station.stroke({ width: 4, color: 0x000 });
    station.fill({ color: 0xffffff });

    this.stationContainer.addChild(station);
    return station;
  }

  drawMultiLineStation(
    lines: Process[],
    coords: Coordinates
  ): PIXI.Graphics {
    const uniqueLines = Array.from(new Set(lines.map((line) => line.id)))
      .map((id) => this.processes.find((p) => p.id === id))
      .filter((line): line is Process => line !== undefined);

    const closestPoints = uniqueLines.map((line) => {
      return this.getClosestPointOnLine(coords, line.coords);
    });

    const center = this.calculateCenterPoint(closestPoints);

    const station = new PIXI.Graphics();
    const rectWidth = 10;
    const rectHeight = 10 * uniqueLines.length;

    station.roundRect(
      center.x - rectWidth / 2,
      center.y - rectHeight / 2,
      rectWidth,
      rectHeight,
      4
    );
    station.fill(0xffffff);
    station.stroke({ width: 3, color: 0x0000 });

    this.stationContainer.addChild(station);
    return station;
  }

  private calculateCenterPoint(points: Coordinates[]): Coordinates {
    const center = points.reduce(
      (acc, point) => ({
        x: acc.x + point.x,
        y: acc.y + point.y,
      }),
      { x: 0, y: 0 }
    );

    return {
      x: center.x / points.length,
      y: center.y / points.length,
    };
  }

  getClosestPointOnLine(
    position: Coordinates,
    coords: Coordinates[]
  ): Coordinates {
    let closestPoint = coords[0];
    let minDistance = Infinity;

    coords.forEach((point, index) => {
      if (index < coords.length - 1) {
        const segmentStart = coords[index];
        const segmentEnd = coords[index + 1];
        const pointOnSegment = this.getClosestPointOnSegment(
          position,
          segmentStart,
          segmentEnd
        );

        const distance = Math.hypot(
          position.x - pointOnSegment.x,
          position.y - pointOnSegment.y
        );

        if (distance < minDistance) {
          closestPoint = pointOnSegment;
          minDistance = distance;
        }
      }
    });

    return closestPoint;
  }

  getClosestPointOnSegment(
    p: Coordinates,
    a: Coordinates,
    b: Coordinates
  ): Coordinates {
    const t = Math.max(
      0,
      Math.min(
        1,
        ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) /
          ((b.x - a.x) ** 2 + (b.y - a.y) ** 2)
      )
    );

    return {
      x: a.x + t * (b.x - a.x),
      y: a.y + t * (b.y - a.y),
    };
  }
}
