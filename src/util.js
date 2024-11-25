// util.js

/**
 * Calculate the distance from a point to a line segment
 * @param {Object} point - The point {x, y}
 * @param {Object} p1 - The first endpoint of the line segment {x, y}
 * @param {Object} p2 - The second endpoint of the line segment {x, y}
 * @returns {number} - The distance from the point to the line segment
 */
export function distanceToSegment(point, p1, p2) {
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

/**
 * Check if a point is near a line defined by a set of line segments
 * @param {Object} point - The point {x, y}
 * @param {Array} linePoints - Array of points defining the line segments [{x, y}, {x, y}, ...]
 * @param {number} [threshold=20] - Distance threshold to consider the point near the line
 * @returns {boolean} - True if the point is near any segment of the line
 */
export function isPointNearLine(point, linePoints, threshold = 5) {
    for (let i = 0; i < linePoints.length - 1; i++) {
        const dist = distanceToSegment(point, linePoints[i], linePoints[i + 1]);
        if (dist < threshold) return true; // Threshold for detecting mouse over line
    }
    return false;
}
