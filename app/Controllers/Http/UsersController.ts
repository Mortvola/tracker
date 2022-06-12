/* eslint-disable class-methods-use-this */
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import User from 'App/Models/User';
import { schema, rules } from '@ioc:Adonis/Core/Validator';
import Env from '@ioc:Adonis/Core/Env';
import Mail from '@ioc:Adonis/Addons/Mail';
import { sha256 } from 'js-sha256';
import jwt from 'jsonwebtoken';
import { Exception } from '@adonisjs/core/build/standalone';
import { GarminErrorResponse, PointResponse } from 'Common/ResponseTypes';

export default class UsersController {
  public async register({ request, response }: HttpContextContract) : Promise<string> {
    /**
     * Validate user details
     */
    const userDetails = await request.validate({
      schema: schema.create({
        username: schema.string([
          rules.trim(),
          rules.unique({ table: 'users', column: 'username' }),
        ]),
        email: schema.string([
          rules.trim(),
          rules.normalizeEmail({ allLowercase: true }),
          rules.unique({ table: 'users', column: 'email' }),
        ]),
        password: schema.string({ trim: true }, [
          rules.trim(),
          rules.confirmed(),
        ]),
      }),
      messages: {
        'username.unique': 'An account with the requested username already exists',
        'username.required': 'A username is required',
        'email.email': 'A valid email address must be specified',
        'email.required': 'An email address is required',
        'email.unique': 'An account with the requested email address already exists',
        'password.required': 'A password is required',
        'password_confirmation.confirmed': 'The password confirmation does not match the password',
      },
    });

    /**
     * Create a new user
     */
    const user = new User();
    user.username = userDetails.username;
    user.email = userDetails.email;
    user.password = userDetails.password;
    await user.save();

    Mail.send((message) => {
      message
        .from(Env.get('MAIL_FROM_ADDRESS') as string, Env.get('MAIL_FROM_NAME') as string)
        .to(user.email)
        .subject('Welcome to the SaunterQuest Tracker!')
        .htmlView('emails/welcome', {
          url: user.getEmailVerificationLink(),
          expires: Env.get('TOKEN_EXPIRATION'),
        });
    });

    response.header('Content-type', 'application/json');

    return JSON.stringify('Your account has been created');
  }

  public async verifyEmail({
    params, view, logger,
  }: HttpContextContract) : Promise<(string | void)> {
    const user = await User.find(params.id);

    if (user) {
      const payload = jwt.verify(params.token, user.generateSecret()) as Record<string, unknown>;

      if (payload.id === user.id) {
        if (!user.activated) {
          user.activated = true;
          user.save();

          return view.render('emailVerified');
        }

        if (user.pendingEmail) {
          // todo: if the matches fail, send the user to a failure page.
          if (payload.hash === sha256(user.pendingEmail)) {
            user.email = user.pendingEmail;
            user.pendingEmail = null;

            await user.save();

            return view.render('emailVerified');
          }
        }
      }

      logger.error(`Invalid payload "${payload.id}" in token for user ${user.username}`);
    }

    return undefined;
  }

  public async login({ auth, request, response }: HttpContextContract) : Promise<void> {
    const credentials = await request.validate({
      schema: schema.create({
        username: schema.string([rules.trim()]),
        password: schema.string([rules.trim()]),
        remember: schema.string.optional([rules.trim()]),
      }),
      messages: {
        'username.required': 'A username is required',
        'password.required': 'A password is required',
      },
    });

    response.header('content-type', 'application/json');

    let responseData: unknown = JSON.stringify('/home');

    try {
      await auth.attempt(credentials.username, credentials.password, credentials.remember === 'on');
    }
    catch (error) {
      if (error.code === 'E_INVALID_AUTH_UID' || error.code === 'E_INVALID_AUTH_PASSWORD') {
        response.status(422);
        responseData = {
          errors: [
            { field: 'username', message: 'The username or password does not match our records.' },
            { field: 'password', message: 'The username or password does not match our records.' },
          ],
        };
      }
      else {
        throw (error);
      }
    }

    response.send(responseData);
  }

  public async logout({ auth }: HttpContextContract) : Promise<void> {
    auth.logout();
  }

  public async getLocation({
    auth: {
      user,
    },
  }: HttpContextContract): Promise<PointResponse | GarminErrorResponse | null> {
    if (!user || user.gpsFeed === null) {
      throw new Exception('No gps feed set');
    }

    return User.sendLocationRequest(user.gpsFeed, user.feedPassword);
  }

  public async feedTest({
    request,
  }: HttpContextContract): Promise<PointResponse | GarminErrorResponse | null> {
    const credentials = await request.validate({
      schema: schema.create({
        feed: schema.string([rules.trim()]),
        password: schema.string.optional([rules.trim()]),
      }),
      messages: {
        'feed.required': 'A Garmin MapShare URL is required',
      },
    });

    return User.sendLocationRequest(credentials.feed, credentials.password ?? null);
  }

  public async setFeed({ auth: { user }, request }: HttpContextContract): Promise<void> {
    if (!user) {
      throw new Exception('user is not set');
    }

    const credentials = await request.validate({
      schema: schema.create({
        feed: schema.string.optional([rules.trim()]),
        password: schema.string.optional([rules.trim()]),
      }),
    });

    user.gpsFeed = credentials.feed ?? null;
    user.feedPassword = credentials.password ?? null;

    user.save();
  }

  public async getFeed({
    auth: {
      user,
    },
  }: HttpContextContract): Promise<{ gpsFeed: string, feedPassword: string }> {
    if (!user) {
      throw new Exception('user is not set');
    }

    return user.serialize({
      fields: {
        pick: ['gpsFeed', 'feedPassword'],
      },
    }) as { gpsFeed: string, feedPassword: string };
  }
}
