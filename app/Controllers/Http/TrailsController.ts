/* eslint-disable class-methods-use-this */
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import Trail from 'App/Models/Trail';
import { TrailResponse } from 'Common/ResponseTypes';

export default class TrailsController {
  public async get({ params }: HttpContextContract): Promise<TrailResponse> {
    const trail = await Trail.findByOrFail('name', params.name);

    return trail.points;
  }
}
