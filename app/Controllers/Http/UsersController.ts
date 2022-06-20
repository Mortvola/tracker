/* eslint-disable class-methods-use-this */
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import User from 'App/Models/User';
import { schema, rules } from '@ioc:Adonis/Core/Validator';
import Env from '@ioc:Adonis/Core/Env';
import Mail from '@ioc:Adonis/Addons/Mail';
import { sha256 } from 'js-sha256';
import jwt from 'jsonwebtoken';
import { Exception } from '@adonisjs/core/build/standalone';
import { ErrorResponse, FeedResponse, PointResponse } from 'Common/ResponseTypes';
import Authentication from 'App/Models/Authentication';
import Database from '@ioc:Adonis/Lucid/Database';
import FieldErrorReporter from 'App/Validators/Reporters/FieldErrorReporter';

export default class UsersController {
  public async get({
    auth: {
      user,
    },
    session,
  }: HttpContextContract): Promise<{ id: number, avatarUrl: string | null } | null> {
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
        id: user.id,
        avatarUrl: authentication.avatarUrl,
      };
    }

    return null;
  }

  public async register({ request }: HttpContextContract) : Promise<void> {
    /**
     * Validate user details
     */
    const userDetails = await request.validate({
      schema: schema.create({
        email: schema.string([
          rules.trim(),
          rules.normalizeEmail({ allLowercase: true }),
          rules.unique({
            table: 'authentications',
            column: 'email',
            caseInsensitive: true,
            where: {
              type: 'email',
            },
          }),
        ]),
        password: schema.string([
          rules.trim(),
          rules.confirmed('passwordConfirmation'),
        ]),
        passwordConfirmation: schema.string([
          rules.trim(),
        ]),
      }),
      messages: {
        'email.email': 'A valid email address must be specified',
        'email.required': 'An email address is required',
        'email.unique': 'An account with the requested email address already exists',
        'password.required': 'A password is required',
        'passwordConfirmation.required': 'A password confirmation is required',
        'passwordConfirmation.confirmed': 'The password confirmation does not match the password',
      },
      reporter: FieldErrorReporter,
    });

    /**
     * Create a new user
     */
    const user = new User();
    await user.save();

    const authentication = new Authentication();

    authentication.fill({
      type: 'email',
      userId: user.id,
      email: userDetails.email,
      password: userDetails.password,
      emailVerificationStatus: 'unverified',
    });

    await authentication.save();

    this.sendWelcomeEmail(authentication);
  }

  private async sendWelcomeEmail(authentication: Authentication) {
    Mail.send((message) => {
      if (!authentication.email) {
        throw new Exception('email address not set');
      }

      message
        .from(Env.get('MAIL_FROM_ADDRESS') as string, Env.get('MAIL_FROM_NAME') as string)
        .to(authentication.email)
        .subject('Welcome to Follow the Herd!')
        .htmlView('emails/welcome', {
          url: authentication.getEmailVerificationLink(),
          expires: Env.get('TOKEN_EXPIRATION'),
        });
    });
  }

  public async resendWelcomeEmail({ request }: HttpContextContract) {
    const requestData = await request.validate({
      schema: schema.create({
        email: schema.string([
          rules.trim(),
          rules.normalizeEmail({ allLowercase: true }),
        ]),
      }),
      reporter: FieldErrorReporter,
    });

    const authentication = await Authentication.query()
      .where('type', 'email')
      .andWhere('emailVerificationStatus', 'unverified')
      .andWhere('email', requestData.email)
      .first();

    if (authentication) {
      this.sendWelcomeEmail(authentication);
    }
  }

  public async verifyEmail({
    params, view, logger,
  }: HttpContextContract): Promise<(string | void)> {
    const authentication = await Authentication.findOrFail(params.id);

    const payload = jwt.verify(
      params.token, authentication.generateSecret(),
    ) as Record<string, unknown>;

    if (payload.id === authentication.id) {
      if (authentication.emailVerificationStatus !== 'verified') {
        authentication.emailVerificationStatus = 'verified';
        await authentication.save();

        return view.render('emailVerified');
      }

      if (authentication.pendingEmail) {
        // todo: if the matches fail, send the user to a failure page.
        if (payload.hash === sha256(authentication.pendingEmail)) {
          authentication.email = authentication.pendingEmail;
          authentication.pendingEmail = null;

          await authentication.save();

          return view.render('emailVerified');
        }
      }
    }

    logger.error(`Invalid payload "${payload.id}" in token for user ${authentication.email}`);

    return undefined;
  }

  // eslint-disable-next-line class-methods-use-this
  public async forgotPassword({ request }: HttpContextContract) : Promise<void> {
    const requestData = await request.validate({
      schema: schema.create({
        email: schema.string([rules.trim(), rules.normalizeEmail({ allLowercase: true })]),
      }),
      messages: {
        'email.required': 'An email address is required',
      },
      reporter: FieldErrorReporter,
    });

    const authentication = await Authentication.query()
      .where('type', 'email')
      .where('email', requestData.email)
      .first();

    if (authentication) {
      Mail.send((message) => {
        if (!authentication.email) {
          throw new Exception('email is not set');
        }

        message
          .from(Env.get('MAIL_FROM_ADDRESS') as string, Env.get('MAIL_FROM_NAME') as string)
          .to(authentication.email)
          .subject('Reset Password Notification')
          .htmlView('emails/reset-password', {
            url: authentication.getPasswordResetLink(),
            expires: Env.get('TOKEN_EXPIRATION'),
          });
      });
    }
  }

  // eslint-disable-next-line class-methods-use-this
  public async resetPassword({
    params, view, logger,
  }: HttpContextContract) : Promise<(string | void)> {
    const authentication = await Authentication.find(params.id);

    if (authentication) {
      const payload = jwt.verify(
        params.token, authentication.generateSecret(),
      ) as Record<string, unknown>;

      if (payload.id === parseInt(params.id, 10)) {
        return view.render('reset-password', { authentication, token: params.token });
      }

      logger.error(`Invalid payload "${payload.id}" in token for user ${authentication.email}`);
    }

    return undefined;
  }

  // eslint-disable-next-line class-methods-use-this
  public async updatePassword({
    request,
    response,
    view,
    logger,
  }: HttpContextContract) : Promise<(string | void)> {
    const requestData = await request.validate({
      schema: schema.create({
        email: schema.string(),
        password: schema.string(),
        passwordConfirmation: schema.string(),
        token: schema.string(),
      }),
      reporter: FieldErrorReporter,
    });

    const authentication = await Authentication.query()
      .where('type', 'email')
      .andWhere('email', requestData.email)
      .first();

    if (!authentication) {
      return view.render(
        'reset-password',
        { authentication, token: requestData.token, errorMessage: 'The account could not be found.' },
      );
    }

    if (requestData.password !== requestData.passwordConfirmation) {
      return view.render(
        'reset-password',
        { authentication, token: requestData.token, errorMessage: 'The passwords do not match.' },
      );
    }

    let payload: Record<string, unknown> = { id: null };

    try {
      payload = jwt.verify(
        requestData.token, authentication.generateSecret(),
      ) as Record<string, unknown>;
    }
    catch (error) {
      logger.error(error);
    }

    if (payload.id !== authentication.id) {
      return view.render(
        'reset-password',
        { authentication, token: requestData.token, errorMessage: 'The token is no longer valid.' },
      );
    }

    authentication.password = requestData.password;
    await authentication.save();

    return response.redirect('/');
  }

  public async login({
    auth, request, response, session,
  }: HttpContextContract) : Promise<void | ErrorResponse> {
    const credentials = await request.validate({
      schema: schema.create({
        email: schema.string([rules.trim()]),
        password: schema.string([rules.trim()]),
        remember: schema.boolean.optional([rules.trim()]),
      }),
      messages: {
        'email.required': 'An email address is required',
        'password.required': 'A password is required',
      },
      reporter: FieldErrorReporter,
    });

    try {
      await auth.attempt(credentials.email, credentials.password, credentials.remember);

      if (auth.user === undefined) {
        throw new Exception('user id not set');
      }

      const authentication = await Authentication.query()
        .where('type', 'email')
        .andWhere('userId', auth.user?.id ?? -1)
        .firstOrFail();

      session.put('authenticationId', authentication.id);

      return undefined;
    }
    catch (error) {
      if (error.code === 'E_INVALID_AUTH_UID' || error.code === 'E_INVALID_AUTH_PASSWORD') {
        response.status(422);
        return {
          code: 'E_FORM_ERRORS',
          errors: [
            { field: 'email', message: 'The email address or password does not match our records.' },
            { field: 'password', message: 'The email address or password does not match our records.' },
          ],
        };
      }

      if (error.code === 'E_EMAIL_NOT_VERIFIED') {
        response.status(422);
        return {
          code: error.code,
        };
      }

      throw (error);
    }
  }

  public async logout({ auth }: HttpContextContract) : Promise<void> {
    auth.logout();
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
