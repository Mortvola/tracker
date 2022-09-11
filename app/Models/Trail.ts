import { DateTime } from 'luxon';
import { afterFind, BaseModel, column } from '@ioc:Adonis/Lucid/Orm';
import {
  Point2D, getExtents, haversineGreatCircleDistance, nearestPointOnPolyLine,
  Extents, lineSegmentRectangleIntersect, expandExtents,
} from 'App/Models/Math';

type Polyline = Point2D[];

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
    prepare: (value: Polyline[]) => JSON.stringify(value),
  })
  public points: Polyline[];

  @afterFind()
  public static generateExtents(trail: Trail) {
    let east: number | null = null;
    let west: number | null = null;
    let north: number | null = null;
    let south: number | null = null;

    // eslint-disable-next-line no-restricted-syntax
    for (const trailSegment of trail.points) {
      const extents = getExtents(trailSegment);

      if (extents) {
        if (east === null || east < extents.east) {
          east = extents.east;
        }

        if (west === null || west > extents.west) {
          west = extents.west;
        }

        if (north === null || north < extents.north) {
          north = extents.north;
        }

        if (south === null || south > extents.south) {
          south = extents.south;
        }
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

  public extents: Extents;

  public expandedExtents: Extents;

  public expandedBoundsIntersection(
    bounds: Extents,
  ): boolean {
    return this.expandedExtents.west < bounds.east && this.expandedExtents.east > bounds.west
      && this.expandedExtents.north > bounds.south && this.expandedExtents.south < bounds.north;
  }

  public getSegmentsWithinExtents(extents: Extents): Polyline[] {
    const segments: Polyline[] = [];

    // eslint-disable-next-line no-restricted-syntax
    for (const trailSegment of this.points) {
      let segment: Polyline = [];
      for (let i = 1; i < trailSegment.length; i += 1) {
        if (lineSegmentRectangleIntersect(
          trailSegment[i - 1],
          trailSegment[i],
          [extents.west, extents.south],
          [extents.east, extents.north],
        )) {
          if (segment.length === 0) {
            segment.push(trailSegment[i - 1]);
          }

          segment.push(trailSegment[i]);
        }
        else if (segment.length > 0) {
          segments.push(segment);
          segment = [];
        }
      }
    }

    return segments;
  }

  public getPolylineDistanceToTrail(points: Polyline): number | null {
    let shortestDistance: number | null = null;
    let extents = getExtents(points);

    if (extents && this.expandedBoundsIntersection(extents)) {
      extents = expandExtents(extents, 0.5);

      let closestTrailPoint: Point2D | null = null;
      let closestPolylinePoint: Point2D | null = null;

      // Get segments of the trail within the expanded polyline extents
      const segments = this.getSegmentsWithinExtents(extents);

      segments.forEach((segment) => {
        points.forEach((point: Point2D) => {
          const [trailPoint, distance] = nearestPointOnPolyLine(segment, point);

          if (distance && (shortestDistance === null || distance < shortestDistance)) {
            shortestDistance = distance;
            closestTrailPoint = trailPoint;
            closestPolylinePoint = point;
          }
        });
      });

      if (shortestDistance && closestTrailPoint && closestPolylinePoint) {
        shortestDistance = haversineGreatCircleDistance(
          closestTrailPoint[1],
          closestTrailPoint[0],
          closestPolylinePoint[1],
          closestPolylinePoint[0],
        );
      }
    }

    return shortestDistance;
  }

  public getDistanceToTrail(point: Point2D) {
    let shortestDistance: number | null = null;
    let closestPoint: Point2D | null = null;

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
