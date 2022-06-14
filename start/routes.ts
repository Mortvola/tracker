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

Route.get('/', async ({ view }) => {
  const props = {
    mapApiKey: Env.get('MAP_API_KEY'),
  };

  return view.render('welcome', { props });
});

Route.get('/home', async ({ view, auth: { user } }) => {
  if (!user) {
    throw new Exception('user not set');
  }

  const props = {
    username: '',
    mapApiKey: Env.get('MAP_API_KEY'),
  };

  return view.render('home', { props });
}).middleware('auth');

Route.post('/register', 'UsersController.register');
Route.get('/verify-email/:token/:id', 'UsersController.verifyEmail');
Route.post('/login', 'UsersController.login');
Route.post('/logout', 'UsersController.logout');

Route.get('/google/redirect', async ({ ally }) => (
  ally.use('google').redirect()
));

Route.get('/facebook/redirect', async ({ ally }) => (
  ally.use('facebook').redirect((request) => {
    request.scopes(['email']);
  })
));

const handleOauth2 = async (
  { ally, auth, response }: HttpContextContract,
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
      });

      await authentication.save();

      await auth.use('web').login(user);
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
        });

        await authentication.save();

        await trx.commit();

        await auth.use('web').login(user);
      }
      catch (error) {
        console.log(error);
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
