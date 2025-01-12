export interface Point {
  x: number;
  y: number;
}

export interface Vector {
  x: number;
  y: number;
}

export function distanceToSegment(point: Point, p1: Point, p2: Point): number {
  const x = point.x,
    y = point.y;
  const x1 = p1.x,
    y1 = p1.y,
    x2 = p2.x,
    y2 = p2.y;
  const A = x - x1,
    B = y - y1,
    C = x2 - x1,
    D = y2 - y1;

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

export function isPointNearLine(
  point: Point,
  linePoints: Point[],
  threshold = 5
): boolean {
  for (let i = 0; i < linePoints.length - 1; i++) {
    const dist = distanceToSegment(point, linePoints[i], linePoints[i + 1]);
    if (dist < threshold) return true;
  }
  return false;
}

export function getClosestPointOnLines(
  position: Point,
  lines: Point[][]
): Point {
  let closestPoint = null;
  let minDistance = Infinity;

  lines.forEach((linePoints) => {
    const pointOnLine = getClosestPointOnLine(position, linePoints);
    const distance = Math.hypot(
      position.x - pointOnLine.x,
      position.y - pointOnLine.y
    );

    if (distance < minDistance) {
      closestPoint = pointOnLine;
      minDistance = distance;
    }
  });

  return closestPoint || position;
}

export function getClosestPointOnLine(position: Point, coords: Point[]): Point {
  let closestPoint = coords[0];
  let minDistance = Infinity;

  coords.forEach((point, index) => {
    if (index < coords.length - 1) {
      const segmentStart = coords[index];
      const segmentEnd = coords[index + 1];
      const pointOnSegment = getClosestPointOnSegment(
        position,
        segmentStart,
        segmentEnd
      );

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

export function getClosestPointOnSegment(p: Point, a: Point, b: Point): Point {
  const t = Math.max(
    0,
    Math.min(
      1,
      ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) /
        ((b.x - a.x) ** 2 + (b.y - a.y) ** 2)
    )
  );

  return {
    x: a.x + t * (b.x - a.x),
    y: a.y + t * (b.y - a.y),
  };
}

export function calculateCenterPoint(points: Point[]): Point {
  const center = points.reduce(
    (acc, point) => ({
      x: acc.x + point.x,
      y: acc.y + point.y,
    }),
    { x: 0, y: 0 }
  );

  return {
    x: center.x / points.length,
    y: center.y / points.length,
  };
}
