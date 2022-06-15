/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| This file is dedicated for defining HTTP routes. A single file is enough
| for majority of projects, however you can define routes in different
| files and just make sure to import them inside this file. For example
|
| Define routes in following two files
| ├── start/routes/cart.ts
| ├── start/routes/customer.ts
|
| and then import them inside `start/routes.ts` as follows
|
| import './routes/cart'
| import './routes/customer''
|
*/

import Route from '@ioc:Adonis/Core/Route';
import Env from '@ioc:Adonis/Core/Env';
import { Exception } from '@adonisjs/core/build/standalone';
import User from 'App/Models/User';
import Authentication from 'App/Models/Authentication';
import Database from '@ioc:Adonis/Lucid/Database';
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import { sha256 } from 'js-sha256';
import DataDeletionLog from 'App/Models/DataDeletionLog';

Route.get('/', async ({ view, auth: { user }, response }) => {
  if (user) {
    return response.redirect('/home');
  }

  const props = {
    mapApiKey: Env.get('MAP_API_KEY'),
  };

  return view.render('welcome', { props });
});
// todo: add silent auth

Route.get('/home', async ({
  view,
  auth: {
    user,
  },
  session,
  response,
}) => {
  if (!user) {
    throw new Exception('user not set');
  }

  const authenticationId = session.get('authenticationId');

  if (authenticationId === undefined) {
    return response.redirect('/');
  }

  const authentication = await Authentication.find(authenticationId);

  if (!authentication) {
    return response.redirect('/');
  }

  const props = {
    username: '',
    mapApiKey: Env.get('MAP_API_KEY'),
    avatarUrl: authentication.avatarUrl,
  };

  return view.render('home', { props });
}).middleware('auth');

Route.post('/register', 'UsersController.register');
Route.get('/verify-email/:token/:id', 'UsersController.verifyEmail');
Route.post('/login', 'UsersController.login');
Route.post('/logout', 'UsersController.logout');

Route.get('/privacy-policy', ({ view }) => (
  view.render('privacy-policy')
));

Route.post('/facebook/data-deletion', async ({ request, response }) => {
  const body = request.raw();
  if (!body) {
    throw new Exception('no payload delivered', 400);
  }

  const [, signedRequset] = body.split('=');
  const [encodedSignature, encodedPayload] = signedRequset.split('.');

  const signature = Buffer.from(encodedSignature, 'base64').toString('hex');
  const payloadString = Buffer.from(encodedPayload, 'base64').toString();
  const payload = JSON.parse(payloadString);

  const payloadHash = sha256.hmac(Env.get('FACEBOOK_CLIENT_SECRET'), encodedPayload);

  if (payloadHash !== signature) {
    throw new Exception('invalid signature', 400);
  }

  const trx = await Database.transaction();

  try {
    const authentication = await Authentication.query({ client: trx })
      .where('providerUserId', payload.user_id)
      .andWhere('provider', 'facebook')
      .first();

    const log = (new DataDeletionLog()).useTransaction(trx);

    if (authentication) {
      await authentication.delete();

      log.description = `Deleted data for facebook user id ${authentication.providerUserId}`;

      const authentications = await Authentication.query({ client: trx }).where('userId', authentication.userId);

      if (authentications.length === 0) {
        // The user has no other authentications so delete the user.
        const user = await User.find(authentication.userId, { client: trx });

        if (user) {
          await user.delete();
        }
      }
    }
    else {
      log.description = `No data found for facebook user id ${payload.user_id}`;
    }

    await log.save();

    await trx.commit();

    return response.json({
      url: `${Env.get('APP_URL')}/data-deletion?id=${log.id}`,
      confirmation_code: log.id,
    });
  }
  catch (error) {
    trx.rollback();
    throw error;
  }
});

Route.get('/google/redirect', async ({ ally }) => (
  ally.use('google').redirect()
));

Route.get('/facebook/redirect', async ({ ally }) => (
  ally.use('facebook').redirect((request) => {
    request.scopes(['email']);
  })
));

const handleOauth2 = async (
  {
    ally,
    auth,
    response,
    logger,
    session,
  }: HttpContextContract,
  providerName: 'google' | 'facebook',
) => {
  const provider = ally.use(providerName);

  /**
   * User has explicitly denied the login request
   */
  if (provider.accessDenied()) {
    response.redirect('/');
    return 'Access was denied';
  }

  /**
   * Unable to verify the CSRF state
   */
  if (provider.stateMisMatch()) {
    response.redirect('/');
    return 'Request expired. Retry again';
  }

  /**
   * There was an unknown error during the redirect
   */
  if (provider.hasError()) {
    response.redirect('/');
    return provider.getError();
  }

  try {
  /**
   * Finally, access the user
   */
    const providerUser = await provider.user();

    let authentication = await Authentication.query()
      .where('type', 'oauth2')
      .andWhere('provider', providerName)
      .andWhere('providerUserId', providerUser.id)
      .first();

    if (authentication) {
      // Make sure there is a user record
      const user = await User.findOrFail(authentication.userId);

      authentication.merge({
        email: providerUser.email,
        emailVerificationStatus: providerUser.emailVerificationState,
        providerAccessToken: providerUser.token.token,
        avatarUrl: providerUser.avatarUrl,
      });

      await authentication.save();

      await auth.use('web').login(user);

      session.put('authenticationId', authentication.id);
    }
    else {
      const trx = await Database.transaction();

      try {
        const user = (new User()).useTransaction(trx);

        await user.save();

        authentication = (new Authentication()).useTransaction(trx);

        authentication.fill({
          userId: user.id,
          type: 'oauth2',
          provider: providerName,
          email: providerUser.email,
          emailVerificationStatus: providerUser.emailVerificationState,
          providerUserId: providerUser.id,
          providerAccessToken: providerUser.token.token,
          avatarUrl: providerUser.avatarUrl,
        });

        await authentication.save();

        await trx.commit();

        await auth.use('web').login(user);

        session.put('authenticationId', authentication.id);
      }
      catch (error) {
        logger.error(error);
        await trx.rollback();
        throw error;
      }
    }

    response.redirect('/home');
  }
  catch (error) {
    response.redirect('/');
  }

  return null;
};

Route.get('/google/callback', async (ctx): Promise<string | null | void> => (
  handleOauth2(ctx, 'google')
));

Route.get('/facebook/callback', async (ctx): Promise<string | null | void> => (
  handleOauth2(ctx, 'facebook')
));

Route.post('/password/email', 'UsersController.forgotPassword');
Route.get('/password/reset/:id/:token', 'UsersController.resetPassword');
Route.post('/password/update', 'UsersController.updatePassword').as('updatePassword');
Route.post('/password/change', 'UsersController.changePassword');

Route.group(() => {
  Route.group(() => {
    Route.get('/feed', 'UsersController.getFeed');
    Route.put('/feed', 'UsersController.setFeed');
    Route.get('/location', 'UsersController.getLocation');
    Route.post('/feed-test', 'UsersController.feedTest');
  })
    .middleware('auth');

  Route.get('/trail/:name', 'TrailsController.get');
  Route.get('/heatmap/:id', 'HeatmapsController.get');
  Route.get('/heatmap-list', 'HeatmapsController.getList');
})
  .prefix('/api');
