import * as PIXI from 'pixi.js';
import {Viewport} from 'pixi-viewport';

let isDrawing = false;
let linePoints = [];

let processes = []

let activeLine = null;

let hovered = null;

initializeApp = async () => {

  const canvas = document.getElementById('tube');
    if (!(canvas instanceof HTMLCanvasElement)) {
        throw new Error("Element with id 'map-canvas' is not a canvas element.");
    }
  
  const lineTool = document.getElementById('line-tool');
  lineTool.addEventListener('click', () => {
      console.log("Line tool selected:", isDrawing);
      isDrawing = !isDrawing;
      lineTool.classList.toggle('active', isDrawing); // Toggle button style
      if (!isDrawing) resetDrawing();
  });

  // Initialize PIXI Application
  const app = new PIXI.Application();
  await app.init({
      view: canvas,
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x000,
  });


  // Initialize Viewport for pan and zoom functionality
  const viewport = new Viewport({
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      worldWidth: 1000,
      worldHeight: 1000,
      events: app.renderer.events
  });

  viewport
    .drag()
    .pinch()
    .wheel()
    .decelerate()

app.stage.addChild(viewport);

  ghostPoint = new PIXI.Graphics();
  ghostPoint.beginFill(0x00ff00, 0.5); // Semi-transparent green
  ghostPoint.drawCircle(0, 0, 5); // Small circle as ghost point
  ghostPoint.endFill();
  viewport.addChild(ghostPoint);
  ghostPoint.visible = false; // Start as invisible

// Track the currently highlighted line
let hoveredLine = null;

viewport.on('pointermove', (event) => {
    if (isDrawing) return;

    const position = viewport.toWorld(event.global);
    // Check if the mouse is over any line
    let foundHover = false;
    processes.forEach((process) => {
        if (isPointNearLine(position, process.coords)) {
            if (hoveredLine !== process) {
                if (hoveredLine) removeHighlight(hoveredLine); // Remove highlight from previous line
                hoveredLine = highlightLine(process); // Highlight the new line
            }
            foundHover = true;
        }
    });

    if (!foundHover && hoveredLine) {
        removeHighlight(hoveredLine); // Remove highlight if no line is hovered
        hoveredLine = null;
    }

    ghostPoint.visible = false; // Hide ghost point if not drawing
});
viewport.on('pointerdown', (event) => {
  if (!isDrawing) return;

  const position = viewport.toWorld(event.global);
  const { x, y } = position;

  // Check if clicked close to the last point to finish the line
  if (linePoints.length > 1) {
      const lastPoint = linePoints[linePoints.length - 1];
      const distance = Math.hypot(x - lastPoint.x, y - lastPoint.y);
      if (distance < 15) { // Threshold for double-clicking the last point
          finalizeLine();
          return;
      }
  }

  // Add the first point or calculate a new segment
  if (linePoints.length === 0) {
      activeLine = new PIXI.Graphics();
      viewport.addChild(activeLine);
      linePoints.push({ x, y });
  } else {
      const lastPoint = linePoints[linePoints.length - 1];
      let nextPoint = { x, y };
      const angle = Math.atan2(y - lastPoint.y, x - lastPoint.x) * (180 / Math.PI);

      if (Math.abs(angle) % 45 !== 0) {
          if (Math.abs(angle) < 22.5 || Math.abs(angle) > 157.5) {
              nextPoint = { x, y: lastPoint.y };
          } else if (Math.abs(angle) < 67.5) {
              nextPoint = {
                  x: lastPoint.x + (x > lastPoint.x ? 1 : -1) * Math.abs(y - lastPoint.y),
                  y,
              };
          } else {
              nextPoint = { x: lastPoint.x, y };
          }
      }

      linePoints.push(nextPoint);
      drawLine();
  }
});

// Move the ghost point with the mouse
viewport.on('pointermove', (event) => {
  if (!isDrawing || linePoints.length === 0) return;

  const position = viewport.toWorld(event.global);
  const lastPoint = linePoints[linePoints.length - 1];

  // Calculate the ghost point based on angle constraints
  let { x, y } = position;
  const angle = Math.atan2(y - lastPoint.y, x - lastPoint.x) * (180 / Math.PI);

  if (Math.abs(angle) % 45 !== 0) {
      if (Math.abs(angle) < 22.5 || Math.abs(angle) > 157.5) {
          y = lastPoint.y;
      } else if (Math.abs(angle) < 67.5) {
          x = lastPoint.x + (x > lastPoint.x ? 1 : -1) * Math.abs(y - lastPoint.y);
      } else {
          x = lastPoint.x;
      }
  }

  ghostPoint.position.set(x, y);
  ghostPoint.visible = true; // Show the ghost point
});
};

// Finalize the line drawing
function finalizeLine() {
  console.log("Line finalized.");
  isDrawing = false;
  ghostPoint.visible = false;
  
  // Store the finalized line in processes with metadata
  const processesCount = processes.length;
  processes.push({
      id: processesCount + 1,
      coords: linePoints,
      line: activeLine // Store the activeLine (PIXI.Graphics object) here
  });
  
  linePoints = [];
  activeLine = null;
  document.getElementById('line-tool').classList.remove('active');
}


function drawLine() {
  if (!activeLine) return;

  activeLine.clear();
  
  // Draw each segment in linePoints
  activeLine.moveTo(linePoints[0].x, linePoints[0].y);
  for (let i = 1; i < linePoints.length; i++) {
      activeLine.lineTo(linePoints[i].x, linePoints[i].y);
      //activeLine.fill('0xff00')
      activeLine.stroke({ width: 4, color: 0xff0000 }); // Set line color and width
      drawStation(linePoints[i], linePoints[i-1], 0xff0000)
  }
}

// Function to draw a station at a given point
function drawStation(startPoint, endPoint,color) {
  const station = new PIXI.Graphics();
  const stationLength = 8; // Length of the station line in pixels
  
  // Calculate the angle of the segment and its perpendicular
  const angle = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x);
  const perpendicularAngle = angle + Math.PI / 2;

  // Calculate the station line's start and end points
  const xOffset = stationLength * Math.cos(perpendicularAngle) / 2;
  const yOffset = stationLength * Math.sin(perpendicularAngle) / 2;

  const stationStartX = endPoint.x - xOffset;
  const stationStartY = endPoint.y - yOffset;
  const stationEndX = endPoint.x + xOffset;
  const stationEndY = endPoint.y + yOffset;

  // Draw the station line
  station.moveTo(stationStartX, stationStartY);
  station.lineTo(stationEndX, stationEndY);
  station.stroke({width:3, color:color}); // White station color
  
  // Add the station marker to the active line's container
  activeLine.addChild(station);
}

// Check if a point is near a line
function isPointNearLine(point, linePoints) {
  for (let i = 0; i < linePoints.length - 1; i++) {
      const p1 = linePoints[i];
      const p2 = linePoints[i + 1];

      // Calculate the distance from the point to the line segment
      const dist = distanceToSegment(point, p1, p2);
      if (dist < 20) return true; // Threshold for detecting mouse over line
  }
  return false;
}

// Function to highlight a line
function highlightLine(process) {
  if (!process.line) return;
  process.line.clear();

  // Draw each segment of the line with a thicker stroke for highlighting
  
  process.line.moveTo(process.coords[0].x, process.coords[0].y);
  for (let i = 1; i < process.coords.length; i++) {
      process.line.lineTo(process.coords[i].x, process.coords[i].y);
      process.line.stroke({width:6, color:0xffff00}); // Yellow highlight
  }
  return process;
}

// Function to remove highlight from a line
function removeHighlight(process) {
  if (!process.line) return;
  process.line.clear();

  // Redraw each segment with the default style
  
  process.line.moveTo(process.coords[0].x, process.coords[0].y);
  for (let i = 1; i < process.coords.length; i++) {
      process.line.lineTo(process.coords[i].x, process.coords[i].y);
      process.line.stroke({width:4, color:0xff0000}); // Red default color
  }
}

// Calculate the distance from a point to a line segment
function distanceToSegment(point, p1, p2) {
  const x = point.x, y = point.y;
  const x1 = p1.x, y1 = p1.y, x2 = p2.x, y2 = p2.y;
  const A = x - x1, B = y - y1, C = x2 - x1, D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  if (lenSq !== 0) param = dot / lenSq;

  let xx, yy;
  if (param < 0) {
      xx = x1;
      yy = y1;
  } else if (param > 1) {
      xx = x2;
      yy = y2;
  } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
  }

  return Math.hypot(x - xx, y - yy);
}

// Resets the line drawing when the line tool is deselected
function resetDrawing() {
  linePoints = [];
  if (activeLine) {
      activeLine.clear();
      activeLine = null;
  }
}



initializeApp().catch(console.error);