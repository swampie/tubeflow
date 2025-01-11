export class Colors {
    usageCounter: Map<number, number>;
    availableColors: number[];

    constructor() {
        // Initialize available colors and their usage counters
        this.availableColors = [
            0xB36305, 0xE32017, 0xFFD300, 0x00782A, 0x6950a1,
            0xF3A9BB, 0xA0A5A9, 0x9B0056, 0x000000, 0x003688,
            0x0098D4, 0x95CDBA, 0x00A4A7, 0xEE7C0E, 0x84B817, 0xE21836
        ];
        this.usageCounter = new Map(
            this.availableColors.map(color => [color, 0]) // Initialize usage counters to 0
        );
    }

    /**
     * Returns the next color that has been least used.
     * If multiple colors are equally least used, it selects one at random.
     * @returns {number} - A color in hexadecimal format.
     */
    nextColor(): number {
        // Find the minimum usage count
        const minUsage = Math.min(...this.usageCounter.values());

        // Collect all colors with the minimum usage count
        const leastUsedColors = Array.from(this.usageCounter.entries())
            .filter(([color, count]) => count === minUsage)
            .map(([color]) => color);

        // Select a random color from the least used colors
        const selectedColor = leastUsedColors[
            Math.floor(Math.random() * leastUsedColors.length)
        ];

        // Increment the usage counter for the selected color
        this.usageCounter.set(selectedColor, this.usageCounter.get(selectedColor) + 1);

        return selectedColor;
    }
}
