import { SelectService } from "../services/select-service";
import { isPointNearLine } from "../utils/geometry-utils";
import { Process, Station, Coordinates } from "../utils/types";

export class SelectHandler {
  constructor(
    private selectService: SelectService,
    private processes: Process[],
    private stations: Station[]
  ) {}

  handleSelection(position: Coordinates): void {
    // Check stations first (higher priority)
    console.log("Selecting position")
    const station = this.findClickedStation(position);
    if (station) {
      this.selectService.selectElement(station);
      return;
    }

    // Then check lines
    const line = this.findClickedLine(position);
    if (line) {
      this.selectService.selectElement(line);
      return;
    }

    this.selectService.clearSelection();
  }

  private findClickedStation(position: Coordinates): Station | null {
    if(!this.stations) return null;
    return this.stations.find(station => {
      const dx = position.x - station.coords.x;
      const dy = position.y - station.coords.y;
      return Math.sqrt(dx * dx + dy * dy) < 10; // Adjust radius as needed
    }) || null;
  }

  private findClickedLine(position: Coordinates): Process | null {
    return this.processes.find(process => 
      isPointNearLine(position, process.coords)
    ) || null;
  }

  handleHighlighting(position: Coordinates): void {
    let foundHover = false;

    for (const process of this.processes) {
      if (isPointNearLine(position, process.coords)) {
        this.selectService.setHoveredLine(process);
        foundHover = true;
        break;
      }
    }

    if (!foundHover) {
      this.selectService.setHoveredLine(null);
    }
  }
}
