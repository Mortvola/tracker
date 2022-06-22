/* eslint-disable class-methods-use-this */
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import Trail from 'App/Models/Trail';

export default class TrailsController {
  public async get({ params, response }: HttpContextContract): Promise<void> {
    const trail = await Trail.findByOrFail('name', params.name);

    response.send(trail.points, true);
  }
}
