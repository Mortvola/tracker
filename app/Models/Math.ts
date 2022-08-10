/* eslint-disable import/prefer-default-export */
export type Point2D = [number, number];

export const dotProduct = (p1: Point2D, p2: Point2D): number => (
  p1[0] * p2[0] + p1[1] * p2[1]
);

export const nearestPointOnLineSegment = (
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
): [[number, number] | null, number] => {
  // v1 = p2 - p1 = [p2.x - p1.x, p2.y - p1.y]
  // P = p1 + t * v1
  // P = [p1.x + t * v.x, p1.y + t * v.y]
  //
  // v2 = p3 - P = [p3 - (p1.x + t * v1.x), p3.y - (p1.y + t * v1.y)]
  //
  // v2 dot v = 0
  // [v2.x, v2.y] dot [v1.x, v1.y] = 0
  // (v2.x * v1.x) + (v2.y * v1.y) = 0
  // (p3.x - (p1.x + t * v1.x)) * (p2.x - p1.x) + (p3.y - (p1.y + t * v1.y)) * (p2.y - p1.y) = 0
  //
  // eslint-disable-next-line max-len
  // p3.x * (p2.x - p1.x) - p1.x * (p2.x - p1.x) - t * v1.x * (p2.x - p1.x) + p3.y * (p2.y - p1.y) - p1.y * (p2.y - p1.y) - t * v1.y * (p2.y - p1.y) = 0
  //
  // eslint-disable-next-line max-len
  // p3.x * (p2.x - p1.x) - p1.x * (p2.x - p1.x) + p3.y * (p2.y - p1.y) - p1.y * (p2.y - p1.y) = t * v1.x * (p2.x - p1.x) +  t * v1.y * (p2.y - p1.y)
  //
  // eslint-disable-next-line max-len
  // p3.x * (p2.x - p1.x) - p1.x * (p2.x - p1.x) + p3.y * (p2.y - p1.y) - p1.y * (p2.y - p1.y) = t * (v1.x * (p2.x - p1.x) +  v1.y * (p2.y - p1.y))
  //
  // eslint-disable-next-line max-len
  // (p3.x * v1.x - p1.x * v1.x + p3.y * v1.y - p1.y * v1.y) / (v1.x * v1.x +  v1.y * v1.y) = t
  //
  const v1 = [p2[0] - p1[0], p2[1] - p1[1]];

  if (v1[0] === 0 && v1[1] === 0) {
    return [p1, 0];
  }

  const t = (p3[0] * v1[0] - p1[0] * v1[0] + p3[1] * v1[1] - p1[1] * v1[1])
    / (v1[0] * v1[0] + v1[1] * v1[1]);

  if (t < 0 || t > 1) {
    return [null, t];
  }

  return [[p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1])], t];
};

export const length = (p1: Point2D, p2: Point2D) => {
  const l1 = p1[0] - p2[0];
  const l2 = p1[1] - p2[1];
  return Math.sqrt(l1 * l1 + l2 * l2);
};

export const nearestPointOnPolyLine = (
  line: Point2D[],
  point: Point2D,
): [Point2D, number, number] => {
  if (line.length === 0) {
    throw new Error('polyline has zero lenght');
  }

  let shorttestDistance: number | null = null;
  let closestPoint: Point2D | null = null;
  let closestIndex: number | null = null;

  for (let i = 0; i < line.length - 1; i += 1) {
    const result = nearestPointOnLineSegment(line[i], line[i + 1], point);

    let [p] = result;
    const [, t] = result;

    let d = 0;
    if (t <= 0) {
      p = line[i];
    }
    else if (t >= 1) {
      p = line[i + 1];
    }

    if (p === null) {
      throw new Error('p is null');
    }

    d = length(p, point);

    if (shorttestDistance === null || d < shorttestDistance) {
      shorttestDistance = d;
      closestPoint = p;
      closestIndex = i;
    }
  }

  if (closestPoint === null || shorttestDistance === null || closestIndex === null) {
    throw new Error('nearest point on polyline was not found');
  }

  return [closestPoint, shorttestDistance, closestIndex];
};

function degToRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export const haversineGreatCircleDistance = (
  latitudeFrom: number,
  longitudeFrom: number,
  latitudeTo: number,
  longitudeTo: number,
  earthRadius = 6378137,
): number => {
  // convert from degrees to radians
  const latFrom = degToRad(latitudeFrom);
  const lonFrom = degToRad(longitudeFrom);
  const latTo = degToRad(latitudeTo);
  const lonTo = degToRad(longitudeTo);

  const latDelta = latTo - latFrom;
  const lonDelta = lonTo - lonFrom;

  const a = (Math.sin(latDelta / 2) ** 2)
    + Math.cos(latFrom) * Math.cos(latTo) * (Math.sin(lonDelta / 2) ** 2);

  const angle = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return angle * earthRadius;
};

export const getExtents = (polyline: [number, number][]) => {
  let east: number | null = null;
  let west: number | null = null;
  let north: number | null = null;
  let south: number | null = null;

  // eslint-disable-next-line no-restricted-syntax
  for (const point of polyline) {
    if (east === null || east < point[0]) {
      [east] = point;
    }

    if (west === null || west > point[0]) {
      [west] = point;
    }

    if (north === null || north < point[1]) {
      [, north] = point;
    }

    if (south === null || south > point[1]) {
      [, south] = point;
    }
  }

  return {
    east,
    west,
    north,
    south,
  };
};
