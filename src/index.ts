import * as PIXI from "pixi.js";
import { tubeMap } from "./map";
import * as d3 from "d3";

const start = async (id: string, data: string): Promise<void> => {
  const app = new PIXI.Application();

  const width = document.body.clientWidth;
  const height = document.body.clientHeight;

  await app.init({
    width,
    height,
    resolution: 2,
    background: "#ffffff",
    // transparent: false,
    antialias: true,
    autoDensity: true,
    autoStart: true,
  });

  document.body.appendChild(app.canvas);

  const canvas = d3.select(app.canvas);
  canvas.style("width", `${width}px`).style("height", `${height}px`);

  // Map dimensions
  const mapWidth = 500;
  const mapHeight = 300;

  // Clean data
  const cleanedData = data.replace(/\\n/g, "");

  // Initialize tube map
  const map = (tubeMap() as any)
    .width(mapWidth)
    .height(mapHeight)
    .margin({
      top: mapHeight / 50,
      right: mapWidth / 7,
      bottom: mapHeight / 10,
      left: mapWidth / 7,
    });

  // Parse and render data
  try {
    const parsedData = JSON.parse(cleanedData);
    canvas.datum(parsedData).call(map);

    const canvas2 = d3.select(id);
    canvas2.datum(parsedData).call(map);
  } catch (error) {
    console.error("Error parsing or rendering map data:", error);
  }
};
