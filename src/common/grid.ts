import * as PIXI from 'pixi.js';
import {
  GRID_SIZE,
  WORLD_WIDTH,
  WORLD_HEIGHT,
} from '../constants.js'
import { GridPosition } from './types.js';

export function snapToGrid(x: number, y: number, gridSize: number = GRID_SIZE): GridPosition {
  const snappedX = Math.floor((x + gridSize / 2) / gridSize) * gridSize;
  const snappedY = Math.floor((y + gridSize / 2) / gridSize) * gridSize;

  // Ensure we stay within world bounds
  return {
    x: Math.min(Math.max(snappedX, 0), WORLD_WIDTH),
    y: Math.min(Math.max(snappedY, 0), WORLD_HEIGHT),
  };
}

export function drawGrid(gridContainer) {
  // Clear any existing grid lines
  gridContainer.removeChildren();

  // Calculate how many lines we need horizontally and vertically
  const linesHorizontal = Math.ceil(WORLD_HEIGHT / GRID_SIZE);
  const linesVertical = Math.ceil(WORLD_WIDTH / GRID_SIZE);

  // Draw horizontal lines
  for (let i = 0; i <= linesHorizontal; i++) {
    const y = i * GRID_SIZE;
    const line = new PIXI.Graphics();

    line.moveTo(0, y);
    line.lineTo(WORLD_WIDTH, y);
    line.stroke({ width: 1, color: 0xaaaaaa, alpha: 0.3 }); // color, alpha)
    gridContainer.addChild(line);
  }

  // Draw vertical lines
  for (let j = 0; j <= linesVertical; j++) {
    const x = j * GRID_SIZE;
    const line = new PIXI.Graphics();
    line.moveTo(x, 0);
    line.lineTo(x, WORLD_HEIGHT);
    line.stroke({ width: 1, color: 0xaaaaaa, alpha: 0.3 }); // color, alpha)
    gridContainer.addChild(line);
  }
}