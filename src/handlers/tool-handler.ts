import * as PIXI from "pixi.js";
import { DrawingService } from "../services/drawing-service";
import { ToolService } from "../services/tool-service";
import { ToolType } from "../utils/types";

interface ToolElements {
  lineTool: HTMLElement | null;
  selectTool: HTMLElement | null;
  duplicateTool: HTMLElement | null;
  stationTool: HTMLElement | null;
}

export class ToolHandler {
  private toolElements: ToolElements;

  constructor(
    private toolService: ToolService,
    private drawingService: DrawingService,
    private ghostPoint: PIXI.Graphics
  ) {
    this.toolElements = {
      lineTool: document.getElementById("line-tool"),
      selectTool: document.getElementById("select-tool"),
      duplicateTool: document.getElementById("duplicate-tool"),
      stationTool: document.getElementById("station-tool"),
    };

    this.initializeToolListeners();
    this.initializeToolStateListener();
  }

  private initializeToolListeners(): void {
    // Tool Selection Listeners
    this.toolElements.lineTool?.addEventListener("click", () => {
      this.toolService.setActiveTool("line");
    });

    this.toolElements.selectTool?.addEventListener("click", () => {
      this.toolService.setActiveTool("select");
    });

    this.toolElements.duplicateTool?.addEventListener("click", () => {
      this.toolService.setActiveTool("duplicate");
    });

    this.toolElements.stationTool?.addEventListener("click", () => {
      this.toolService.setActiveTool("station");
    });
  }

  private initializeToolStateListener(): void {
    this.toolService.subscribe((tool: ToolType) => {
      this.updateToolButtonStates(tool);
      this.handleToolChange(tool);
    });
  }

  private updateToolButtonStates(activeTool: ToolType): void {
    // Remove active state from all tools
    Object.values(this.toolElements).forEach((element) => {
      element?.classList.remove("active");
    });

    // Add active state to selected tool
    switch (activeTool) {
      case "line":
        this.toolElements.lineTool?.classList.add("active");
        break;
      case "select":
        this.toolElements.selectTool?.classList.add("active");
        break;
      case "duplicate":
        this.toolElements.duplicateTool?.classList.add("active");
        break;
      case "station":
        this.toolElements.stationTool?.classList.add("active");
        break;
    }
  }

  private handleToolChange(tool: ToolType): void {
    // Reset states when tool changes
    this.ghostPoint.visible = false;

    if (tool !== "line") {
      this.drawingService.resetDrawing();
    }
  }

  getCurrentTool(): ToolType {
    return this.toolService.getActiveTool();
  }
}
