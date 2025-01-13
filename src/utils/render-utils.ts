import * as PIXI from 'pixi.js';
import { Point } from './geometry-utils';

export interface RenderOptions {
    color: number;
    width: number;
    alpha?: number;
}

export function createLine(points: Point[], options: RenderOptions): PIXI.Graphics {
    const line = new PIXI.Graphics();
    line.lineStyle(options.width, options.color, options.alpha ?? 1);
    line.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
        line.lineTo(points[i].x, points[i].y);
    }
    
    return line;
}

export function createCircle(center: Point, radius: number, options: RenderOptions): PIXI.Graphics {
    const circle = new PIXI.Graphics();
    circle.lineStyle(options.width, options.color, options.alpha ?? 1);
    circle.drawCircle(center.x, center.y, radius);
    return circle;
}
