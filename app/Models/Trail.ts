import { DateTime } from 'luxon';
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm';
import { haversineGreatCircleDistance, nearestPointOnPolyLine } from 'App/Models/Math';

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
