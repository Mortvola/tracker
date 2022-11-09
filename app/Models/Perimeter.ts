import { DateTime } from 'luxon';
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm';

export type PerimeterGeometry = { rings: [number, number][][]};

export const perimetersMatch = (
  perimeter1: PerimeterGeometry,
  perimeter2: PerimeterGeometry,
): boolean => {
  if (perimeter1.rings.length !== perimeter2.rings.length) {
    return false;
  }

  for (let i = 0; i < perimeter2.rings.length; i += 1) {
    if (perimeter1.rings[i].length !== perimeter2.rings[i].length) {
      return false;
    }

    for (let j = 0; j < perimeter1.rings[i].length; j += 1) {
      if (perimeter1.rings[i][j][0] !== perimeter2.rings[i][j][0]
        || perimeter1.rings[i][j][1] !== perimeter2.rings[i][j][1]
      ) {
        return false;
      }
    }
  }

  return true;
};

export default class Perimeter extends BaseModel {
  @column({ isPrimary: true })
  public id: number;

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;

  @column({
    prepare: (value: PerimeterGeometry) => JSON.stringify(value),
  })
  public geometry: PerimeterGeometry;
}
