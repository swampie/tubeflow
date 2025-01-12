import { ToolType } from "../utils/types";

export class ToolService {
  private activeTool: ToolType = null;
  private listeners: Set<(tool: ToolType) => void> = new Set();

  getActiveTool(): ToolType {
    return this.activeTool;
  }

  setActiveTool(tool: ToolType): void {
    // Toggle off if the same tool is clicked again
    if (this.activeTool === tool) {
      this.activeTool = null;
    } else {
      this.activeTool = tool;
    }

    // Notify listeners of the change
    this.notifyListeners();
  }

  subscribe(listener: (tool: ToolType) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.activeTool));
  }
}
