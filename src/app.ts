import * as PIXI from 'pixi.js';

import { Viewport } from 'pixi-viewport';
import { drawGrid } from "./common/grid.js";
import { ColorService } from './services/color-service.js';
import { DrawingService } from './services/drawing-service.js';
import { DrawingHandler } from './handlers/drawing-handler.js';
import { StationService } from './services/station-service.js';
import { StationHandler } from './handlers/station-handler.js';
import { ToolService } from './services/tool-service.js';
import { ToolHandler } from './handlers/tool-handler.js';
import { SelectService } from './services/select-service.js';
import { SelectHandler } from './handlers/select-handler.js';
import { DuplicateService } from './services/duplicate-service.js';
import { DuplicateHandler } from './handlers/duplicate-handler.js';

import {
    WORLD_WIDTH,
    WORLD_HEIGHT,
    GHOST_POINT_RADIUS,
    GHOST_POINT_COLOR,
} from './common/constants.js';
import { Coordinates } from './utils/types.js';

// temporary artifacts
let ghostPoint: PIXI.Graphics | null = null;

//containers
const stationContainer = new PIXI.Container();
const processContainer = new PIXI.Container();
const gridContainer = new PIXI.Container();
gridContainer.zIndex = 0; // Ensure it’s behind other layers

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
const duplicateService = new DuplicateService(
    drawingService,
    colorService,
    processContainer,
    drawingService.getAllProcesses()
);


// handlers
const selectHandler = new SelectHandler(selectService, drawingService.getAllProcesses());
const drawingHandler = new DrawingHandler(drawingService, ghostPoint);
const stationHandler = new StationHandler(stationService, ghostPoint, drawingService.getAllProcesses());
const toolHandler = new ToolHandler(toolService, drawingService, ghostPoint);
const duplicateHandler = new DuplicateHandler(duplicateService, selectService);

// bootstrapping the application
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
        line:      (position: Coordinates) => drawingHandler.handleDrawing(position),
        select:    (position: Coordinates) => selectHandler.handleHighlighting(position),
        duplicate: (position: Coordinates) => duplicateHandler.handleDuplicate(position),
        station:   (position: Coordinates) => stationHandler.handleStationPlacement(position)
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


// Resets the line drawing when the line tool is deselected

initializeApp().catch(console.error);
