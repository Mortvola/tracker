import { DateTime } from 'luxon';
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm';
import { PerimeterGeometry } from './Perimeter';

export type IncidentProperties = {
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
};

export type Incident = {
  globalId: string,
  irwinId: string,
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
  perimeter?: PerimeterGeometry | null
  perimeterId?: number | null,
};

export default class WildlandFire2 extends BaseModel {
  @column({ isPrimary: true })
  public id: number;

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;

  @column()
  public globalId: string;

  @column()
  public irwinId: string;

  @column()
  public perimeterId: number | null;

  @column({
    prepare: (value: IncidentProperties) => JSON.stringify(value),
    consume: (value: IncidentProperties) => {
      // Convert date srings into DateTime objects.
      value.discoveredAt = DateTime.fromISO((value.discoveredAt as unknown) as string)
      value.modifiedAt = DateTime.fromISO((value.modifiedAt as unknown) as string)
      value.containmentDateTime = value.containmentDateTime
        ? DateTime.fromISO((value.containmentDateTime as unknown) as string)
        : null
      return value;
    }
  })
  public properties: IncidentProperties;

  @column.dateTime()
  public startTimestamp: DateTime;

  @column.dateTime()
  public endTimestamp: DateTime | null;
}
