import * as PIXI from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { isPointNearLine, normalize } from './util.js';
import { Colors } from './common/colors.js';
import { GlowFilter } from 'pixi-filters';
import { Coordinates, Process, ToolType } from './types.js';

let isDrawing = false;
// main objects storage
let processes = [];
let stations = [];

// temporary artifacts
let linePoints: Coordinates[] = [];
let activeLine: PIXI.Graphics | null = null;
let activeColor: number | null = null;
let ghostPoint: PIXI.Graphics | null = null;
let activeTool: ToolType = null;
let hoveredLine: Process | null = null;
//containers
const stationContainer = new PIXI.Container();
const processContainer = new PIXI.Container();
const gridContainer = new PIXI.Container();
gridContainer.zIndex = 0; // Ensure it’s behind other layers


// utils
const colors = new Colors();

// constants
const GRID_SIZE = 20;
const LINE_DEFAULT_WIDTH = 8
const HIGHLIGHTED_LINE_DEFAULT_WIDTH = LINE_DEFAULT_WIDTH + 2
const WORLD_WIDTH = 1000;
const WORLD_HEIGHT = 1000;
const GHOST_POINT_RADIUS = 5;
const GHOST_POINT_COLOR = 0x00ff00;
const DEFAULT_HIGHLIGHT_OPTIONS = {glow: false}

const initializeApp = async () => {
    const canvas = document.getElementById('tube');
    const lineTool = document.getElementById('line-tool');
    const selectTool = document.getElementById('select-tool');
    const duplicateTool = document.getElementById('duplicate-tool');
    const stationTool = document.getElementById('station-tool'); // New Station tool


    if (!(canvas instanceof HTMLCanvasElement)) {
        throw new Error("Element with id 'tube' is not a canvas element.");
    }

    // Tool Selection for Line
    lineTool?.addEventListener('click', () => {
        setActiveTool("line");
    });

    // Tool Selection for Select
    selectTool?.addEventListener('click', () => {
        setActiveTool("select");
    });

    // Tool Selection for Duplicate
    duplicateTool?.addEventListener('click', () => {
        setActiveTool("duplicate");
    });

    stationTool?.addEventListener('click', () => {
        setActiveTool("station");
    });


    

    // Initialize PIXI Application
    const app = new PIXI.Application();
    await app.init({
        view: canvas,
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: 0xffffff,
        antialias: true,
        resolution: 2,
        autoDensity: true
    })

    const viewport = new Viewport({
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        worldWidth: WORLD_WIDTH,
        worldHeight: WORLD_HEIGHT,
        events: app.renderer.events
    });

    viewport.sortableChildren = true;

    window.addEventListener('resize', () => {
        app.renderer.resize(window.innerWidth, window.innerHeight);
        viewport.resize(window.innerWidth, window.innerHeight, WORLD_WIDTH, WORLD_HEIGHT);
    });

    viewport.drag().pinch().wheel().decelerate();
    app.stage.addChild(viewport);
    viewport.addChild(gridContainer);


    // Initialize ghost point for preview
    ghostPoint = new PIXI.Graphics();
    ghostPoint.zIndex = 10000
    
    ghostPoint.fill({color:GHOST_POINT_COLOR}); // Semi-transparent green
    ghostPoint.circle(0, 0, GHOST_POINT_RADIUS); // Small circle as ghost point
    ghostPoint.stroke({width:4, color:0x000}); // Line color border
    
    viewport.addChild(ghostPoint);
    ghostPoint.visible = false; // Start as invisible
  

    // Single pointermove listener to handle all pointer movements
    viewport.on('pointermove', (event) => {
        const position = viewport.toWorld(event.global);

        if (activeTool === "station") {
            handleStationPreview(position);
        }
        if (activeTool === "select" || activeTool === 'duplicate') {
            handleHighlighting(position);
        } else if (activeTool === "line" && linePoints.length > 0) {
            handleDrawingPreview(position);
        }
    });

    // Handle line drawing on pointer down
    const toolHandlers = {
        line: handleDrawing,
        select: handleHighlighting,
        duplicate: handleDuplicate,
        station: handleStationPlacement
    };
    
    viewport.on('pointerdown', (event) => {
        const position = viewport.toWorld(event.global);
        if (toolHandlers[activeTool]) {
            toolHandlers[activeTool](position, viewport);
        }
    });
    processContainer.zIndex = 1; // Lower zIndex for lines
    viewport.addChild(processContainer);

    stationContainer.zIndex = 2; // Higher zIndex for stations
    viewport.addChild(stationContainer);

    drawGrid()
    
    
};

// Handle Station Tool: Ghost Preview
function handleStationPreview(position) {
    const closeLines = findClosestLines(position);

    if (closeLines.length > 0) {
        const closestPoint = getClosestPointOnLines(position, closeLines);

        // Move the ghost point to the closest point
        ghostPoint.position.set(closestPoint.x, closestPoint.y);
        ghostPoint.visible = true; // Show the ghost point

        // Optionally, you can draw a ghost station symbol here
        // using a temporary graphics object if desired
    } else {
        ghostPoint.visible = false; // Hide if no close lines
    }
}

// Handle Station Tool: Place Station
function handleStationPlacement(position) {
    const closeLines = findClosestLines(position);

    if (closeLines.length > 0) {
        const stationCoords = getClosestPointOnLines(position, closeLines);

        // Create station object
        const stationId = stations.length + 1;
        const stationName = `station_${stationId}`;
        const station = {
            id: stationId,
            name: stationName,
            coords: stationCoords,
            lines: closeLines.map(line => line.id),
            graphic: null,
            $graphic: null // Will be set after drawing
        };

        // Render the station
        if (closeLines.length === 1) {
            station.graphic = drawSingleLineStation(closeLines[0], stationCoords);
        } else {
            station.graphic = drawMultiLineStation(closeLines, stationCoords);
        }
        
        // Add station to the array
        stations.push(station);
    }
}

// Utility: Find Closest Lines
function findClosestLines(position): any[] {
    const closeProcesses = processes.filter(process => isPointNearLine(position, process.coords));

    // Collect all related lines
    const relatedLines = new Set();
    closeProcesses.forEach(process => {
        const allRelated = getAllRelatedLines(process);
        allRelated.forEach(line => relatedLines.add(line));
    });

    return Array.from(relatedLines);
}

// Utility: Get Closest Point on Lines
function getClosestPointOnLines(position, lines) {
    let closestPoint = null;
    let minDistance = Infinity;

    lines.forEach(line => {
        line.coords.forEach((point, index) => {
            if (index < line.coords.length - 1) {
                const segmentStart = line.coords[index];
                const segmentEnd = line.coords[index + 1];
                const pointOnSegment = getClosestPointOnSegment(position, segmentStart, segmentEnd);

                const distance = Math.hypot(
                    position.x - pointOnSegment.x,
                    position.y - pointOnSegment.y
                );

                if (distance < minDistance) {
                    closestPoint = pointOnSegment;
                    minDistance = distance;
                }
            }
        });
    });

    return closestPoint;
}

// Utility: Get Closest Point on a Line Segment
function getClosestPointOnSegment(p, a, b) {
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / ((b.x - a.x) ** 2 + (b.y - a.y) ** 2)));
    return {
        x: a.x + t * (b.x - a.x),
        y: a.y + t * (b.y - a.y),
    };
}

// Draw Single Line Station
function drawSingleLineStation(line, coords) {
    const station = new PIXI.Graphics();
    const radius = 5; // Adjust as needed

    
    station.circle(coords.x, coords.y, radius);
    station.stroke({width:4, color:0x000}); // Line color border
    station.fill({color:0xffffff}); // White fill
    // Add station to a dedicated container or directly to the viewport
    stationContainer.addChild(station);

    return station;
    
}

// Draw Multi-Line Station
function drawMultiLineStation(lines, coords) {
    const uniqueLines = Array.from(new Set(lines.map(line => line.id))).map(id => processes.find(p => p.id === id));
    
    // Compute the closest point on each line to the given position
    const closestPoints = uniqueLines.map(line => {
        return getClosestPointOnLine(coords, line.coords);
    });

    // Calculate the average position (center point)
    const center = closestPoints.reduce((acc, point) => {
        acc.x += point.x;
        acc.y += point.y;
        return acc;
    }, { x: 0, y: 0 });

    center.x /= closestPoints.length;
    center.y /= closestPoints.length;

    
    const station = new PIXI.Graphics();
    const rectWidth = 10;
    const rectHeight = 10 * uniqueLines.length;

    console.log("w", rectWidth, "h", rectHeight)
    
    station.roundRect(
        center.x - rectWidth / 2,
        center.y - rectHeight / 2,
        rectWidth,
        rectHeight,
        4
    );
    station.fill(0xffffff); // Black border
    station.stroke({width:3, color: 0x0000})
    
    stationContainer.addChild(station);
    return station
}

// Utility function to get the closest point on a line to a given position
function getClosestPointOnLine(position, coords) {
    let closestPoint = null;
    let minDistance = Infinity;

    coords.forEach((point, index) => {
        if (index < coords.length - 1) {
            const segmentStart = coords[index];
            const segmentEnd = coords[index + 1];
            const pointOnSegment = getClosestPointOnSegment(position, segmentStart, segmentEnd);

            const distance = Math.hypot(
                position.x - pointOnSegment.x,
                position.y - pointOnSegment.y
            );

            if (distance < minDistance) {
                closestPoint = pointOnSegment;
                minDistance = distance;
            }
        }
    });

    return closestPoint;
}

// Function to handle highlighting when the "Select" tool is active
function handleHighlighting(position) {
    let foundHover = false;
    processes.forEach((process) => {
        if (isPointNearLine(position, process.coords)) {
            if (hoveredLine !== process) {
                if (hoveredLine) removeHighlight(hoveredLine); // Remove previous highlight
                hoveredLine = highlightLine(process); // Highlight the new line
            }
            foundHover = true;
        }
    });

    if (!foundHover && hoveredLine) {
        removeHighlight(hoveredLine);
        hoveredLine = null;
    }
}

function handleDuplicate(position) {
    if (!hoveredLine) return;

    const originalCoords = hoveredLine.coords;
    const offset = LINE_DEFAULT_WIDTH; // Offset distance equal to line thickness

    // Calculate the duplicated line's coordinates
    const duplicatedCoords = originalCoords.map((point, index, array) => {
        let perpendicularAngle;

        if (index === 0) {
            // For the first point, calculate the angle based on the next segment
            const nextPoint = array[index + 1];
            const angle = Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x);
            perpendicularAngle = angle + Math.PI / 2; // Perpendicular to the segment
        } else if (index === array.length - 1) {
            // For the last point, calculate the angle based on the previous segment
            const prevPoint = array[index - 1];
            const angle = Math.atan2(point.y - prevPoint.y, point.x - prevPoint.x);
            perpendicularAngle = angle + Math.PI / 2; // Perpendicular to the segment
        } else {
            // For intermediate points, average the angles of adjacent segments
            const prevPoint = array[index - 1];
            const nextPoint = array[index + 1];
            const anglePrev = Math.atan2(point.y - prevPoint.y, point.x - prevPoint.x);
            const angleNext = Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x);
            perpendicularAngle = (anglePrev + angleNext) / 2 + Math.PI / 2;
        }

        return {
            x: point.x + offset * Math.cos(perpendicularAngle),
            y: point.y + offset * Math.sin(perpendicularAngle),
        };
    });

    // Create the duplicated line
    const duplicatedLine = new PIXI.Graphics();
    const color = colors.nextColor()
    drawLine(duplicatedLine, duplicatedCoords, {color:color, width: LINE_DEFAULT_WIDTH}, duplicatedCoords.length > 4)
    
    // Add the duplicated line to the viewport and processes
    processContainer.addChild(duplicatedLine); // Add to the same container
   // Create the new line object with $parent reference
   const newLineId = processes.length + 1;
   const newLine = {
       id: newLineId,
       coords: duplicatedCoords,
       line: duplicatedLine,
       color: color,
       $parent: hoveredLine.id, // Reference to the original line
       $children: []            // Initialize as empty array
   };

   // Add the new line to processes
   processes.push(newLine);
   if (!hoveredLine.$children) {
    hoveredLine.$children = [];
}
hoveredLine.$children.push(newLineId);
console.log(processes)
}



// Function to handle drawing preview (ghost point) when the "Line" tool is active
function handleDrawingPreview(position) {
    const snappedPos = snapToGrid(position.x, position.y);

    let { x, y } = snappedPos;
    const lastPoint = linePoints[linePoints.length - 1];

    // Calculate the ghost point based on angle constraints
    const angle = Math.atan2(y - lastPoint.y, x - lastPoint.x) * (180 / Math.PI);

    if (Math.abs(angle) % 45 !== 0) {
        if (Math.abs(angle) < 22.5 || Math.abs(angle) > 157.5) {
            y = lastPoint.y; // horizontal
        } else if (Math.abs(angle) < 67.5) {
            // 45° logic
            const dx = x - lastPoint.x;
            const dy = y - lastPoint.y;
            // enforce dx == ±dy
            // simplest approach: pick sign from dx/dy
            const dist = Math.abs(dx);
            if (Math.abs(dy) > Math.abs(dx)) {
                // enforce equal magnitude
                y = lastPoint.y + Math.sign(dy) * dist;
            } else {
                x = lastPoint.x + Math.sign(dx) * Math.abs(dy);
            }
        } else {
            x = lastPoint.x; // vertical
        }
    }

    ghostPoint.position.set(x, y);
    
    ghostPoint.visible = true; // Show the ghost point
    console.log("show ghost point", ghostPoint.visible)
}

// Function to handle drawing lines when the "Line" tool is active
function handleDrawing(event, viewport) {
    
    const { x, y } = event;

    if (linePoints.length > 1) {
        const lastPoint = linePoints[linePoints.length - 1];
        const distance = Math.hypot(x - lastPoint.x, y - lastPoint.y);
        if (distance < 15) { // Threshold for completing the line
            finalizeLine();
            return;
        }
    }

    // Start a new line if it's the first point
    if (linePoints.length === 0) {
        activeLine = new PIXI.Graphics();
        activeColor = colors.nextColor()
        processContainer.addChild(activeLine);
        linePoints.push({ x, y });
    } else {
        const lastPoint = linePoints[linePoints.length - 1];
        let nextPoint = { x, y };
        const angle = Math.atan2(y - lastPoint.y, x - lastPoint.x) * (180 / Math.PI);

        // Enforce straight lines or 45-degree angles
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
        drawLine(activeLine, linePoints,{color:activeColor, width: LINE_DEFAULT_WIDTH}, linePoints.length > 4);
    }
}

// Finalize the line drawing
function finalizeLine() {
    isDrawing = false;
    ghostPoint.visible = false;
    
    // Store the finalized line in processes with metadata
    const processesCount = processes.length;
    processes.push({
        id: processesCount + 1,
        coords: linePoints,
        line: activeLine, // Store the activeLine (PIXI.Graphics object) here
        color: activeColor,
        $children: [],
        parent: null

    });
    
    linePoints = [];
    activeLine = null;
    activeColor = null;
    document.getElementById('line-tool').classList.remove('active');
}

// Function to draw the line as points are added
function drawLine(line,coords, strokeOptions, smooth = false) {
    if (!line) return;

    line.clear();
    line.moveTo(coords[0].x, coords[0].y);
    if(!smooth) {
        
        for (let i = 1; i < coords.length; i++) {
            line.lineTo(coords[i].x, coords[i].y);
            
            //drawStation(linePoints[i], linePoints[i - 1], color);
        }
    } else {
            for (let i = 1; i < coords.length; i++) {
                const prevNode = coords[i - 1];
                const currNode = coords[i];
                const prevVector = { x: currNode.x - prevNode.x, y: currNode.y - prevNode.y };
    
                if (i < coords.length - 1) {
                    const nextNode = coords[i + 1];
                    const nextVector = { x: nextNode.x - currNode.x, y: nextNode.y - currNode.y };
    
                    // Normalize vectors
                    const prevVectorNorm = normalize(prevVector);
                    const nextVectorNorm = normalize(nextVector);
    
                    // Calculate control point as the intersection of the two vectors
                    const controlPoint = {
                        x: (prevNode.x + currNode.x) / 2,
                        y: (prevNode.y + currNode.y) / 2,
                    };
    
                    // Draw a quadratic curve to the next point
                    line.quadraticCurveTo(controlPoint.x, controlPoint.y, currNode.x, currNode.y);
                } else {
                    // For the last point, draw a line
                    line.lineTo(currNode.x, currNode.y);
                }
            }
            
    }
    line.stroke(strokeOptions); // Set line color and width
}

// Function to highlight a line
function highlightLine(process,options = DEFAULT_HIGHLIGHT_OPTIONS) {
    if (process.highlighted) return; // Skip if already highlighted
    process.highlighted = true;

    if(options.glow) {
        if (!process.glowFilter) {
            process.glowFilter = new GlowFilter({
                distance: 15, // Glow distance
                outerStrength: 2, // Outer glow intensity
                innerStrength: 1, // Inner glow intensity
                color: 0xffff00, // Glow color (yellow)
                quality: 0.5, // Rendering quality
            });
        }
    
        // Apply the glow filter to the line
        process.line.filters = [process.glowFilter]; 
    } else {
        if (!process.outline) {
            process.outline = new PIXI.Graphics();
            process.line.parent.addChildAt(process.outline, process.line.parent.getChildIndex(process.line));
        }
    
        // Draw the outline
        process.outline.clear();
        process.outline.moveTo(process.coords[0].x, process.coords[0].y);
        
        drawLine(process.outline, process.coords, {color: process.color, width: HIGHLIGHTED_LINE_DEFAULT_WIDTH,alpha: 0.5}, process.coords.length > 4)
        
    }
    // Create and apply a glow filter
    
    return process
}

function removeHighlight(process, options = DEFAULT_HIGHLIGHT_OPTIONS) {
    if (!process.highlighted) return; // Skip if not highlighted
    process.highlighted = false;
    if(options.glow) {
        process.line.filters = [];
    } else {
        if (process.outline) {
            process.outline.clear();
        }
    }
}

function getAllRelatedLines(line) {
    const relatedLines = new Set();
    const toProcess = [line];

    while (toProcess.length > 0) {
        const currentLine = toProcess.pop();
        if (relatedLines.has(currentLine.id)) continue;
        relatedLines.add(currentLine.id);

        // Add parent line
        if (currentLine.$parent !== null) {
            const parentLine = processes.find(p => p.id === currentLine.$parent);
            if (parentLine) {
                toProcess.push(parentLine);
            }
        }

        // Add child lines
        if (currentLine.$children && currentLine.$children.length > 0) {
            currentLine.$children.forEach(childId => {
                const childLine = processes.find(p => p.id === childId);
                if (childLine) {
                    toProcess.push(childLine);
                }
            });
        }
    }

    return Array.from(relatedLines).map(id => processes.find(p => p.id === id));
}


// Function to set the active tool
function setActiveTool(tool: ToolType) {
   // Toggle off if the same tool is clicked again
   if (activeTool === tool) {
    activeTool = null;

    // Remove active state from all tool buttons
        document.getElementById('line-tool')!.classList.remove('active');
        document.getElementById('select-tool')!.classList.remove('active');
        document.getElementById('duplicate-tool')!.classList.remove('active');
        document.getElementById('station-tool')!.classList.remove('active');

        resetDrawing(); // Reset drawing state if applicable
        return;
    }

    // Set the new active tool
    activeTool = tool;

    // Update the active state of tool buttons
    document.getElementById('line-tool')!.classList.toggle('active', tool === "line");
    document.getElementById('select-tool')!.classList.toggle('active', tool === "select");
    document.getElementById('duplicate-tool')!.classList.toggle('active', tool === "duplicate");
    document.getElementById('station-tool')!.classList.toggle('active', tool === "station");

    if (tool !== "line") resetDrawing();
}

// Resets the line drawing when the line tool is deselected
function resetDrawing() {
    linePoints = [];
    if (activeLine) {
        activeLine.clear();
        activeLine = null;
    }
}

// GRID FUNCTIONS
function snapToGrid(x: number, y: number, gridSize = GRID_SIZE) {
    const snappedX = Math.floor((x + gridSize / 2) / gridSize) * gridSize;
    const snappedY = Math.floor((y + gridSize / 2) / gridSize) * gridSize; 

    // Ensure we stay within world bounds
    return {
        x: Math.min(Math.max(snappedX, 0), WORLD_WIDTH),
        y: Math.min(Math.max(snappedY, 0), WORLD_HEIGHT)
    };
}

function drawGrid() {
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
        line.stroke({width:1, color:0xaaaaaa,alpha:0.3}); // color, alpha)
        gridContainer.addChild(line);
    }

    // Draw vertical lines
    for (let j = 0; j <= linesVertical; j++) {
        const x = j * GRID_SIZE;
        const line = new PIXI.Graphics();
        line.moveTo(x, 0);
        line.lineTo(x, WORLD_HEIGHT);
        line.stroke({width:1, color:0xaaaaaa,alpha:0.3}); // color, alpha)
        gridContainer.addChild(line);
    }
}



initializeApp().catch(console.error);
