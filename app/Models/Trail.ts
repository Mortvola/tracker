import { DateTime } from 'luxon';
import { afterFind, BaseModel, column } from '@ioc:Adonis/Lucid/Orm';
import { getExtents, haversineGreatCircleDistance, nearestPointOnPolyLine } from 'App/Models/Math';

export default class Trail extends BaseModel {
  @column({ isPrimary: true })
  public id: number;

  @column.dateTime({ autoCreate: true, serializeAs: null })
  public createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true, serializeAs: null })
  public updatedAt: DateTime;

  @column()
  public name: string;

  @column({
    prepare: (value: [number, number][][]) => JSON.stringify(value),
  })
  public points: [number, number][][];

  @afterFind()
  public static generateExtents(trail: Trail) {
    let east: number | null = null;
    let west: number | null = null;
    let north: number | null = null;
    let south: number | null = null;

    // eslint-disable-next-line no-restricted-syntax
    for (const trailSegment of trail.points) {
      const extents = getExtents(trailSegment);

      if (extents.east !== null && (east === null || east < extents.east)) {
        east = extents.east;
      }

      if (extents.west !== null && (west === null || west > extents.west)) {
        west = extents.west;
      }

      if (extents.north !== null && (north === null || north < extents.north)) {
        north = extents.north;
      }

      if (extents.south !== null && (south === null || south > extents.south)) {
        south = extents.south;
      }
    }

    if (east !== null && west !== null && north !== null && south !== null) {
      trail.extents = {
        east,
        west,
        south,
        north,
      };

      trail.expandedExtents = {
        east: east + 0.5,
        west: west - 0.5,
        north: north + 0.5,
        south: south - 0.5,
      };
    }
  }

  public extents: { east: number, west: number, north: number, south: number };

  public expandedExtents: { east: number, west: number, north: number, south: number };

  public expandedBoundsIntersection(
    east: number, west: number, north: number, south: number,
  ): boolean {
    return this.expandedExtents.west < east && this.expandedExtents.east > west
      && this.expandedExtents.north > south && this.expandedExtents.south < north;
  }

  public getDistanceToTrail(point: [number, number]) {
    let shortestDistance: number | null = null;
    let closestPoint: [number, number] | null = null;

    // eslint-disable-next-line no-restricted-syntax
    for (const trailSegment of this.points) {
      const [trailPoint, distance] = nearestPointOnPolyLine(trailSegment, point);

      if (shortestDistance === null || distance < shortestDistance) {
        shortestDistance = distance;
        closestPoint = trailPoint;
      }
    }

    if (shortestDistance && closestPoint) {
      shortestDistance = haversineGreatCircleDistance(
        point[1], point[0], closestPoint[1], closestPoint[0],
      );
    }

    return shortestDistance;
  }
}
