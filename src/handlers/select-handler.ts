import { SelectService } from "../services/select-service";
import { isPointNearLine } from "../utils/geometry-utils";
import { Process, Coordinates } from "../utils/types";

export class SelectHandler {
  constructor(
    private selectService: SelectService,
    private processes: Process[]
  ) {}

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
