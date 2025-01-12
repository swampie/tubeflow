import { DEFAULT_COLOR_SCHEME } from "../constants";
import { ColorScheme, ColorUsage } from "../utils/types";

export class ColorService {
  private usageCounter: Map<number, number>;
  private readonly colorScheme: ColorScheme;

  constructor(colorScheme: ColorScheme = DEFAULT_COLOR_SCHEME) {
    this.colorScheme = colorScheme;
    this.usageCounter = new Map(
      this.colorScheme.colors.map((color) => [color, 0])
    );
  }

  /**
   * Returns the next color that has been least used.
   * If multiple colors are equally least used, it selects one at random.
   */
  getNextColor(): number {
    const minUsage = Math.min(...this.usageCounter.values());
    const leastUsedColors = this.getLeastUsedColors(minUsage);
    const selectedColor = this.selectRandomColor(leastUsedColors);

    this.incrementColorUsage(selectedColor);
    return selectedColor;
  }

  /**
   * Get the current usage statistics for all colors
   */
  getColorUsageStats(): ColorUsage[] {
    return Array.from(this.usageCounter.entries()).map(([color, count]) => ({
      color,
      usageCount: count,
    }));
  }

  /**
   * Reset usage statistics for all colors
   */
  resetUsageStats(): void {
    this.usageCounter.forEach((_, color) => {
      this.usageCounter.set(color, 0);
    });
  }

  /**
   * Get all available colors in the current scheme
   */
  getAllColors(): readonly number[] {
    return this.colorScheme.colors;
  }

  private getLeastUsedColors(minUsage: number): number[] {
    return Array.from(this.usageCounter.entries())
      .filter(([_, count]) => count === minUsage)
      .map(([color]) => color);
  }

  private selectRandomColor(colors: number[]): number {
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private incrementColorUsage(color: number): void {
    const currentCount = this.usageCounter.get(color) ?? 0;
    this.usageCounter.set(color, currentCount + 1);
  }
}
