import * as PIXI from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { isPointNearLine } from './util.js';
import { GlowFilter } from 'pixi-filters';
import { drawGrid } from "./common/grid.js";
import {
    LINE_DEFAULT_WIDTH,
    HIGHLIGHTED_LINE_DEFAULT_WIDTH,
    WORLD_WIDTH,
    WORLD_HEIGHT,
    GHOST_POINT_RADIUS,
    GHOST_POINT_COLOR,
    DEFAULT_HIGHLIGHT_OPTIONS,
} from './constants.js';
import { Coordinates, Process, ToolType } from './utils/types.js';
import { ColorService } from './services/color-service.js';
import { DrawingService } from './services/drawing-service.js';
import { DrawingHandler } from './handlers/drawing-handler.js';
import { StationService } from './services/station-service.js';
import { StationHandler } from './handlers/station-handler.js';
import { ToolService } from './services/tool-service.js';
import { ToolHandler } from './handlers/tool-handler.js';
import { SelectService } from './services/select-service.js';
import { SelectHandler } from './handlers/select-handler.js';

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
const colors = new ColorService();

// Initialize ghost point for preview
ghostPoint = new PIXI.Graphics();
ghostPoint.zIndex = 10000
ghostPoint.fill({color:GHOST_POINT_COLOR}); // Semi-transparent green
ghostPoint.circle(0, 0, GHOST_POINT_RADIUS); // Small circle as ghost point
ghostPoint.stroke({width:4, color:0x000}); // Line color border
ghostPoint.visible = false; // Start as invisible

// services
const colorService = new ColorService();
const drawingService = new DrawingService(colorService, processContainer);
const stationService = new StationService(stationContainer, drawingService.getAllProcesses());
const toolService = new ToolService();
const selectService = new SelectService(drawingService);

// handlers
const selectHandler = new SelectHandler(selectService, drawingService.getAllProcesses());
const drawingHandler = new DrawingHandler(drawingService, ghostPoint);
const stationHandler = new StationHandler(stationService, ghostPoint, drawingService.getAllProcesses());
const toolHandler = new ToolHandler(toolService, drawingService, ghostPoint);

const initializeApp = async () => {
    const canvas = document.getElementById('tube');

    if (!(canvas instanceof HTMLCanvasElement)) {
        throw new Error("Element with id 'tube' is not a canvas element.");
    }

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
    viewport.addChild(ghostPoint);
  
    // Single pointermove listener to handle all pointer movements
    viewport.on('pointermove', (event) => {
        const position = viewport.toWorld(event.global);
        const currentTool = toolHandler.getCurrentTool();
    
        if (currentTool === "station") {
            stationHandler.handleStationPreview(position);
        }
        if (currentTool === "select" || currentTool === 'duplicate') {
            selectHandler.handleHighlighting(position);
        } else if (currentTool === "line" && drawingService.isCurrentlyDrawing()) {
            drawingHandler.handleDrawingPreview(position);
        }
    });

    // Handle line drawing on pointer down
    const toolHandlers = {
        line: (position) => drawingHandler.handleDrawing(position),
        select: (position) => selectHandler.handleHighlighting(position),
        duplicate: handleDuplicate,
        station: (position) => stationHandler.handleStationPlacement(position)
    };
    
    viewport.on('pointerdown', (event) => {
        const position = viewport.toWorld(event.global);
        const currentTool = toolHandler.getCurrentTool();
        
        if (toolHandlers[currentTool]) {
            toolHandlers[currentTool](position);
        }
    });

    processContainer.zIndex = 1; // Lower zIndex for lines
    viewport.addChild(processContainer);

    stationContainer.zIndex = 2; // Higher zIndex for stations
    viewport.addChild(stationContainer);

    drawGrid(gridContainer);
};

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
    const color = colors.getNextColor()
    drawingService.drawLine(duplicatedLine, duplicatedCoords, {color:color, width: LINE_DEFAULT_WIDTH}, duplicatedCoords.length > 4)
    
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

// Resets the line drawing when the line tool is deselected
function resetDrawing() {
    linePoints = [];
    if (activeLine) {
        activeLine.clear();
        activeLine = null;
    }
}

initializeApp().catch(console.error);
