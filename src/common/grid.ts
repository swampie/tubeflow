import * as PIXI from 'pixi.js';
import {
  GRID_SIZE,
  WORLD_WIDTH,
  WORLD_HEIGHT,
} from './constants.js'
import { GridPosition } from '../utils/types.js';

export function snapToGrid(x: number, y: number, gridSize: number = GRID_SIZE): GridPosition {
  // Clamp to world bounds
  const clampedX = Math.min(Math.max(x, 0), WORLD_WIDTH);
  const clampedY = Math.min(Math.max(y, 0), WORLD_HEIGHT);
  
  // Calculate the nearest grid line for each coordinate
  const snappedX = Math.round(clampedX / gridSize) * gridSize;
  const snappedY = Math.round(clampedY / gridSize) * gridSize;
  
  // Handle the edge case at the maximum bounds
  return {
    x: Math.min(snappedX, WORLD_WIDTH - (snappedX === WORLD_WIDTH ? gridSize : 0)),
    y: Math.min(snappedY, WORLD_HEIGHT - (snappedY === WORLD_HEIGHT ? gridSize : 0)),
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