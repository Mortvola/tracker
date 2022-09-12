import { DateTime } from 'luxon';
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm';

export type Incident = {
  globalId: string,
  irwinId?: string,
  lat: number,
  lng: number,
  name: string,
  discoveredAt: DateTime,
  modifiedAt: DateTime,
  incidentTypeCategory: string,
  incidentSize: number | null,
  percentContained: number | null,
  containmentDateTime: DateTime | null,
  distance?: number,
  perimeter?: { rings: [number, number][][]},
};

export default class WildlandFire extends BaseModel {
  @column({ isPrimary: true })
  public id: number;

  @column.dateTime({ autoCreate: true, serializeAs: null })
  public createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true, serializeAs: null })
  public updatedAt: DateTime;

  @column()
  public date: string;

  @column({
    prepare: (value: Incident[]) => JSON.stringify(value),
  })
  public incidents: Incident[];
}
