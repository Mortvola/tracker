import { DateTime } from 'luxon';
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm';

export default class Heatmap extends BaseModel {
  @column({ isPrimary: true })
  public id: number;

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;

  @column()
  public date: string;

  @column({
    prepare: (value: [number, number][]) => JSON.stringify(value),
  })
  public points: [number, number][];

  @column()
  public offTrail: number;

  @column()
  public feedNotSetup: number;

  @column()
  public feedError: number;
}
