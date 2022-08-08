/* eslint-disable class-methods-use-this */
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import WildlandFire, { Incident } from "App/Models/WildlandFire";
import { DateTime } from "luxon";

export default class WildlandFiresController {
  public async get({ params }: HttpContextContract): Promise<Incident[]> {
    const dateStart = DateTime.fromISO(`${params.year}-01-01`)
      .plus({ days: parseInt(params.day, 10) });

    const date = dateStart.toISODate();

    const wf = await WildlandFire.findBy('date', date);

    if (wf) {
      return wf.incidents;
    }

    return [];
  }
}
