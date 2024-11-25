import * as PIXI from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { isPointNearLine } from './util.js';
import { Colors } from './common/colors.js';

let activeTool = null; // Tracks the currently active tool ("line" or "select")
let hoveredLine = null;
let isDrawing = false;
let linePoints = [];
let processes = [];
let activeLine = null;
const LINE_DEFAULT_WIDTH = 8
const HIGHLIGHTED_LINE_DEFAULT_WIDTH = LINE_DEFAULT_WIDTH + 2
const WORLD_WIDTH = 1000;
const WORLD_HEIGHT = 1000;
const GHOST_POINT_RADIUS = 5;
const GHOST_POINT_COLOR = 0x00ff00;
let activeColor = null;
let ghostPoint = null;
const colors = new Colors();
initializeApp = async () => {
    const canvas = document.getElementById('tube');
    const lineTool = document.getElementById('line-tool');
    const selectTool = document.getElementById('select-tool');
    const duplicateTool = document.getElementById('duplicate-tool');
    

    if (!(canvas instanceof HTMLCanvasElement)) {
        throw new Error("Element with id 'tube' is not a canvas element.");
    }

    // Tool Selection for Line
    lineTool.addEventListener('click', () => {
        setActiveTool("line");
    });

    // Tool Selection for Select
    selectTool.addEventListener('click', () => {
        setActiveTool("select");
    });

    // Tool Selection for Duplicate
    duplicateTool.addEventListener('click', () => {
        setActiveTool("duplicate");
    });

    // Initialize PIXI Application
    const app = new PIXI.Application();
    await app.init({
        view: canvas,
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: 0x000,
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

    viewport.drag().pinch().wheel().decelerate();
    app.stage.addChild(viewport);

    // Initialize ghost point for preview
    ghostPoint = new PIXI.Graphics();
    ghostPoint.beginFill(GHOST_POINT_COLOR, 0.5); // Semi-transparent green
    ghostPoint.drawCircle(0, 0, GHOST_POINT_RADIUS); // Small circle as ghost point
    ghostPoint.endFill();
    viewport.addChild(ghostPoint);
    ghostPoint.visible = false; // Start as invisible
  

    // Single pointermove listener to handle all pointer movements
    viewport.on('pointermove', (event) => {
        const position = viewport.toWorld(event.global);

        // Call the appropriate handler based on the active tool
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
    };
    
    viewport.on('pointerdown', (event) => {
        const position = viewport.toWorld(event.global);
        if (toolHandlers[activeTool]) {
            toolHandlers[activeTool](position, viewport);
        }
    });
};

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
    
    duplicatedLine.moveTo(duplicatedCoords[0].x, duplicatedCoords[0].y);
    const color = colors.nextColor()
    for (let i = 1; i < duplicatedCoords.length; i++) {
        duplicatedLine.lineTo(duplicatedCoords[i].x, duplicatedCoords[i].y);
        duplicatedLine.stroke({width:LINE_DEFAULT_WIDTH, color:color,join:"round"}); // Green color for the duplicated line
    }

    // Add the duplicated line to the viewport and processes
    hoveredLine.line.parent.addChild(duplicatedLine); // Add to the same container
    processes.push({
        id: processes.length + 1,
        coords: duplicatedCoords,
        line: duplicatedLine,
        color: color
    });
}



// Function to handle drawing preview (ghost point) when the "Line" tool is active
function handleDrawingPreview(position) {
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
        viewport.addChild(activeLine);
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
        drawLine(activeColor);
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
        color: activeColor
    });
    
    linePoints = [];
    activeLine = null;
    activeColor = null;
    document.getElementById('line-tool').classList.remove('active');
}

// Function to draw the line as points are added
function drawLine(color) {
    if (!activeLine) return;

    activeLine.clear();
    
    activeLine.moveTo(linePoints[0].x, linePoints[0].y);
    
    for (let i = 1; i < linePoints.length; i++) {
        activeLine.lineTo(linePoints[i].x, linePoints[i].y);
        activeLine.stroke({width:LINE_DEFAULT_WIDTH, color:color, join:"round"}); // Set line color and width
        //drawStation(linePoints[i], linePoints[i - 1], color);
    }
}

// Function to draw a station at each point
function drawStation(startPoint, endPoint, color) {
    const station = new PIXI.Graphics();
    const stationLength = 8; // Length of the station line in pixels

    const angle = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x);
    const perpendicularAngle = angle + Math.PI / 2;

    const xOffset = stationLength * Math.cos(perpendicularAngle) / 2;
    const yOffset = stationLength * Math.sin(perpendicularAngle) / 2;

    station.moveTo(endPoint.x - xOffset, endPoint.y - yOffset);
    station.lineTo(endPoint.x + xOffset, endPoint.y + yOffset);
    station.stroke({width:8, color:color});
    activeLine.addChild(station);
}

// Function to highlight a line
function highlightLine(process) {
    
    if (process.highlighted) return; // Skip if already highlighted
    process.highlighted = true;
    
    process.line.clear();
    process.line.moveTo(process.coords[0].x, process.coords[0].y);
    for (let i = 1; i < process.coords.length; i++) {
        process.line.lineTo(process.coords[i].x, process.coords[i].y);
        process.line.stroke({width:HIGHLIGHTED_LINE_DEFAULT_WIDTH, color:0xffff00,join:"round"}); // Yellow highlight
    }
    return process;
}

// Function to remove highlight from a line
function removeHighlight(process) {
    if (!process.highlighted) return; // Skip if not highlighted
    process.highlighted = false;
    process.line.clear();
    
    process.line.moveTo(process.coords[0].x, process.coords[0].y);
    for (let i = 1; i < process.coords.length; i++) {
        process.line.lineTo(process.coords[i].x, process.coords[i].y);
        process.line.stroke({width:LINE_DEFAULT_WIDTH, color:process.color, join:"round"}); // Red default color
    }
}

// Function to set the active tool
function setActiveTool(tool) {
    activeTool = tool;

    document.getElementById('line-tool').classList.toggle('active', tool === "line");
    document.getElementById('select-tool').classList.toggle('active', tool === "select");
    document.getElementById('duplicate-tool').classList.toggle('active', tool === "duplicate");

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

initializeApp().catch(console.error);
