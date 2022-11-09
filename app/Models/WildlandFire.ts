import { DateTime } from 'luxon';
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm';
import { Incident } from './WildlandFire2';

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
