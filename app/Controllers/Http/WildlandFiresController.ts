/* eslint-disable class-methods-use-this */
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import Database from '@ioc:Adonis/Lucid/Database';
import Perimeter, { PerimeterGeometry } from 'App/Models/Perimeter';
import { Incident, IncidentProperties } from 'App/Models/WildlandFire2';
import { DateTime } from 'luxon';

export default class WildlandFiresController {
  public async get({ params }: HttpContextContract): Promise<Incident[]> {
    const dateStart = DateTime.fromISO(`${params.year}-01-01`)
      .plus({ days: parseInt(params.day, 10) });

    const date = dateStart.toISODate();

    // const wf = await WildlandFire2
    //   .query()
    //   .where('startTimestamp', '<=', date)
    //   .andWhere('endTimestamp', '>', date)
    //   .orderBy('');

    const query = `
      select distinct on(irwin_id)
        global_id as "globalId",
        irwin_id as "irwinId",
        properties,
        perimeter_id as "perimeterId"
      from wildland_fire2s
      where start_timestamp <= CAST('${date}' AS DATE) + 1
      and coalesce(end_timestamp, now() at time zone 'UTC') >= CAST('${date}' AS date)
      and irwin_id is not null
      order by irwin_id, start_timestamp desc, id desc
    `;

    type Record = {
      globalId: string,
      irwinId: string,
      properties: IncidentProperties,
      perimeterId: number | null,
    }

    const { rows } = await Database.rawQuery(query);

    const incidents: Incident[] = (rows as Record[]).map((r) => ({
      irwinId: r.irwinId,
      globalId: r.globalId,
      lat: r.properties.lat,
      lng: r.properties.lng,
      name: r.properties.name,
      discoveredAt: r.properties.discoveredAt,
      modifiedAt: r.properties.modifiedAt,
      incidentTypeCategory: r.properties.incidentTypeCategory,
      incidentSize: r.properties.incidentSize,
      percentContained: r.properties.percentContained,
      containmentDateTime: r.properties.containmentDateTime,
      distance: r.properties.distance,
      perimeterId: r.perimeterId,
    }));

    return incidents;
  }

  public async getPerimeter({ params }: HttpContextContract): Promise<PerimeterGeometry> {
    const perimeter = await Perimeter.findOrFail(params.id);

    return perimeter.geometry;
  }
}
