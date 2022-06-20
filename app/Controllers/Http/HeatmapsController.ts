/* eslint-disable class-methods-use-this */
// import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

import Heatmap from 'App/Models/Heatmap';
import { HeatmapListResponse, HeatmapResponse } from 'Common/ResponseTypes';
import { DateTime } from 'luxon';

export default class HeatmapsController {
  public async get({ params }): Promise<HeatmapResponse> {
    const dateStart = DateTime.fromISO(`${params.year}-01-01`)
      .plus({ days: parseInt(params.day, 10) });

    const heatmap = await Heatmap.query()
      .where('date', dateStart.toISODate())
      .orderBy('createdAt', 'desc')
      .first();

    return heatmap?.points ?? [];
  }

  public async getList(): Promise<HeatmapListResponse> {
    const heatmaps = await Heatmap.query().select('id', 'created_at').orderBy('created_at', 'asc');

    return heatmaps.map((hm) => ({ id: hm.id, date: hm.createdAt.toISODate() }));
  }
}
