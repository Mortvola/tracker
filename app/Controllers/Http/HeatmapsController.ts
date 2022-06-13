/* eslint-disable class-methods-use-this */
// import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

import Heatmap from "App/Models/Heatmap";
import { HeatmapListResponse, HeatmapResponse } from "Common/ResponseTypes";

export default class HeatmapsController {
  public async get({ params }): Promise<HeatmapResponse> {
    let heatmap: Heatmap | null;

    if (params.id === 'latest') {
      heatmap = await Heatmap.query().orderBy('created_at', 'desc').first();
    }
    else {
      heatmap = await Heatmap.find(parseInt(params.id, 10));
    }

    return heatmap?.points ?? [];
  }

  public async getList(): Promise<HeatmapListResponse> {
    const heatmaps = await Heatmap.query().select('id', 'created_at').orderBy('created_at', 'asc');

    return heatmaps.map((hm) => ({ id: hm.id, date: hm.createdAt.toISODate() }));
  }
}
