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
import Authentication from 'App/Models/Authentication';

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
    mapApiKey: Env.get('MAP_API_KEY'),
    avatarUrl: authentication.avatarUrl,
  };

  return view.render('home', { props });
}).middleware('auth');

Route.post('/register', 'UsersController.register');
Route.post('/register/resend', 'UsersController.resendWelcomeEmail');
Route.get('/verify-email/:token/:id', 'UsersController.verifyEmail');
Route.post('/login', 'UsersController.login');
Route.post('/logout', 'UsersController.logout');

Route.get('/privacy-policy', ({ view }) => (
  view.render('privacy-policy')
));

Route.post('/oauth-data-deletion/:provider', 'OAuthsController.dataDelete');
Route.get('/oauth-redirect/:provider', 'OAuthsController.redirect');
Route.get('/oauth-callback/:provider', 'OAuthsController.handleOauth2');

Route.post('/password/email', 'UsersController.forgotPassword');
Route.get('/password/reset/:token/:id', 'UsersController.resetPassword');
Route.post('/password/update', 'UsersController.updatePassword').as('updatePassword');
Route.post('/password/change', 'UsersController.changePassword');

Route.group(() => {
  Route.group(() => {
    Route.get('/feed', 'UsersController.getFeed');
    Route.put('/feed', 'UsersController.setFeed');
    Route.get('/location', 'UsersController.getLocation');
    Route.post('/feed-test', 'UsersController.feedTest');
    Route.delete('/account', 'UsersController.delete');
  })
    .middleware('auth');

  Route.get('/trail/:name', 'TrailsController.get');
  Route.get('/heatmap/:id', 'HeatmapsController.get');
  Route.get('/heatmap-list', 'HeatmapsController.getList');
})
  .prefix('/api');
