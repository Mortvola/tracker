/* eslint-disable class-methods-use-this */
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import Trail from 'App/Models/Trail';

export default class TrailsController {
  public async get({ params }: HttpContextContract): Promise<[number, number][][]> {
    const trail = await Trail.findByOrFail('name', params.name);

    return trail.points;
  }
}
