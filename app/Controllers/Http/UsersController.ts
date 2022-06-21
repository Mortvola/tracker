/* eslint-disable class-methods-use-this */
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import User from 'App/Models/User';
import { schema, rules } from '@ioc:Adonis/Core/Validator';
import { Exception } from '@adonisjs/core/build/standalone';
import { FeedResponse, PointResponse, UserResponse } from 'Common/ResponseTypes';
import Authentication from 'App/Models/Authentication';
import Database from '@ioc:Adonis/Lucid/Database';
import FieldErrorReporter from 'App/Validators/Reporters/FieldErrorReporter';

export default class UsersController {
  public async get({
    auth: {
      user,
    },
    session,
  }: HttpContextContract): Promise<UserResponse | null> {
    if (user) {
      const authenticationId = session.get('authenticationId');

      if (authenticationId === undefined) {
        return null;
      }

      const authentication = await Authentication.find(authenticationId);

      if (!authentication) {
        return null;
      }

      return {
        initialized: user.initialized,
        avatarUrl: authentication.avatarUrl,
      };
    }

    return null;
  }

  public async getLocation({
    auth: {
      user,
    },
  }: HttpContextContract): Promise<PointResponse> {
    if (!user) {
      throw new Exception('User not set');
    }

    if (!user.gpsFeed) {
      return {
        code: 'gps-feed-null',
      };
    }

    return User.sendLocationRequest(user.gpsFeed, user.feedPassword);
  }

  public async feedTest({
    request,
    auth: {
      user,
    },
    response,
  }: HttpContextContract): Promise<unknown> {
    if (!user) {
      throw new Exception('user not set');
    }

    const credentials = await request.validate({
      schema: schema.create({
        feed: schema.string([
          rules.trim(),
          rules.unique({
            table: 'users',
            column: 'gps_feed',
            whereNot: {
              id: user.id,
            },
          }),
        ]),
        password: schema.string.optional([rules.trim()]),
      }),
      messages: {
        'feed.required': 'A Garmin MapShare URL is required to test the connection.',
        'feed.unique': 'The Garmin MapShare address is currently in use by another account.',
      },
      reporter: FieldErrorReporter,
    });

    const result = await User.sendLocationRequest(credentials.feed, credentials.password ?? null);

    switch (result.code) {
      case 'success':
        return undefined;

      case 'parse-error':
        response.status(400);
        return {
          code: 'E_FORM_ERRORS',
          errors: [
            { field: 'feed', message: 'An error occured parsing the Garmin response' },
          ],
        };

      case 'garmin-error':
        response.status(400);
        if (result.garminErrorResponse && result.garminErrorResponse.status === 401) {
          return {
            code: 'E_FORM_ERRORS',
            errors: [
              { field: 'password', message: 'The password may be incorrect' },
            ],
          };
        }

        return {
          code: 'E_FORM_ERRORS',
          errors: [
            { field: 'feed', message: 'An unexpected error was returned from Garmin' },
          ],
        };

      case 'empty-response':
        response.status(400);
        return {
          code: 'E_FORM_ERRORS',
          errors: [
            { field: 'feed', message: 'The MapShare address may be incorrect or your MapShare may be disabled' },
          ],
        };

      default:
        response.status(400);
        return {
          code: 'E_FORM_ERRORS',
          errors: [
            { field: 'feed', message: 'An unexpected error has occured' },
          ],
        };
    }
  }

  public async setFeed({ auth: { user }, request }: HttpContextContract): Promise<void> {
    if (!user) {
      throw new Exception('user is not set');
    }

    const credentials = await request.validate({
      schema: schema.create({
        feed: schema.string.optional([
          rules.trim(),
          rules.unique({
            table: 'users',
            column: 'gps_feed',
            whereNot: {
              id: user.id,
            },
          }),
        ]),
        password: schema.string.optional([rules.trim()]),
      }),
      messages: {
        'feed.unique': 'This Garmin MapShare URL is currently in use by another account',
      },
      reporter: FieldErrorReporter,
    });

    user.gpsFeed = credentials.feed ?? null;
    user.feedPassword = credentials.password ?? null;
    user.initialized = true;

    user.save();
  }

  public async getFeed({
    auth: {
      user,
    },
  }: HttpContextContract): Promise<FeedResponse> {
    if (!user) {
      throw new Exception('user is not set');
    }

    return user.serialize({
      fields: {
        pick: ['gpsFeed', 'feedPassword'],
      },
    }) as { gpsFeed: string, feedPassword: string };
  }

  public async delete({
    auth,
  }: HttpContextContract): Promise<void> {
    const { user } = auth;

    if (!user) {
      throw new Exception('user not set');
    }

    const trx = await Database.transaction();

    try {
      user.useTransaction(trx);

      const authentications = await Authentication.query({ client: trx })
        .where('userId', user.id);

      await Promise.all(authentications.map(async (a) => a.delete()));
      await user.delete();

      await trx.commit();
    }
    catch (error) {
      trx.rollback();
      throw error;
    }
  }
}
