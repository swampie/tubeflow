import { SelectService } from "../services/select-service";
import { Coordinates } from "../utils/types";

export class DuplicateHandler {
  constructor(
    private duplicateService: DuplicateService,
    private selectService: SelectService
  ) {}

  handleDuplicate(position: Coordinates): void {
    const hoveredLine = this.selectService.getHoveredLine();
    if (!hoveredLine) return;

    this.duplicateService.duplicateLine(hoveredLine);
  }
}
