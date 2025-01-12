export interface Point {
  x: number;
  y: number;
}

export interface Vector {
  x: number;
  y: number;
}

export function distanceToSegment(point: Point, p1: Point, p2: Point): number {
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

export function isPointNearLine(point: Point, linePoints: Point[], threshold = 5): boolean {
  for (let i = 0; i < linePoints.length - 1; i++) {
      const dist = distanceToSegment(point, linePoints[i], linePoints[i + 1]);
      if (dist < threshold) return true;
  }
  return false;
}

// mathUtils.ts
export function normalize(vector: Vector): Vector {
  const length = Math.hypot(vector.x, vector.y);
  return length === 0 ? { x: 0, y: 0 } : { x: vector.x / length, y: vector.y / length };
}

export function calculateAngle(p1: Point, p2: Point): number {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x);
}

export function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function radiansToDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}
