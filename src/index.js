import * as PIXI from 'pixi.js';
import {tubeMap}  from "./map";
import * as d3 from 'd3';

(generate) = async (el) => {
    await start('#tube',el.value)
  }
  
  
 start = async (id, data) =>
    {
    const app = new PIXI.Application();

    // Initialize the application
    var width = document.body.clientWidth;
	var height = document.body.clientHeight;
    
    
    await app.init({ width,
        height,
        resolution: 2,
        background: '#ffffff',
        transparent: false,
        antialias: true,
        autoDensity: true,
        autoStart: true,
    })
		
   

	
    document.body.appendChild(app.canvas);
    
    var canvas = d3.select(app.canvas);
    canvas.style("width", width).style("height",height);
        
    var width = 500;
    var height = 300;
    data = data.replace(/\\n/g, '')
    var map = 
        tubeMap()
        .width(width)
        .height(height)
        .margin({
            top: height / 50,
            right: width / 7,
            bottom: height / 10,
            left: width / 7,
        });
    canvas.datum(JSON.parse(data)).call(map);
    var canvas2 = d3.select(id);
    canvas2.datum(JSON.parse(data)).call(map);
    
}