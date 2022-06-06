/* eslint-disable class-methods-use-this */
// import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

import Heatmap from "App/Models/Heatmap";

export default class HeatmapsController {
  public async get(): Promise<[number, number][]> {
    const heatmap = await Heatmap.query().orderBy('created_at', 'desc').first();

    if (Array.isArray(heatmap?.points)) {
      return heatmap?.points ?? [];
    }

    return [];
  }
}
