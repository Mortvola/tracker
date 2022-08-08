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

Route.get('/', async ({ view }) => {
  const props = {
    mapApiKey: Env.get('MAP_API_KEY'),
  };

  return view.render('home', { props });
});

Route.post('/register', 'AuthController.register');
Route.post('/register/resend', 'AuthController.resendWelcomeEmail');
Route.get('/verify-email/:token/:id', 'AuthController.verifyEmail');
Route.post('/login', 'AuthController.login');
Route.post('/logout', 'AuthController.logout');

Route.post('/password/email', 'AuthController.forgotPassword');
Route.get('/password/reset/:token/:id', 'AuthController.resetPassword');
Route.post('/password/update', 'AuthController.updatePassword').as('updatePassword');
Route.post('/password/change', 'AuthController.changePassword');

Route.post('/oauth-data-deletion/:provider', 'OAuthsController.dataDelete');
Route.get('/oauth-redirect/:provider', 'OAuthsController.redirect');
Route.get('/oauth-callback/:provider', 'OAuthsController.handleOauth2');

Route.get('/privacy-policy', ({ view }) => (
  view.render('privacy-policy')
));

Route.get('/terms-of-service', ({ view }) => (
  view.render('terms-of-service')
));

Route.group(() => {
  Route.group(() => {
    Route.get('/feed', 'UsersController.getFeed');
    Route.put('/feed', 'UsersController.setFeed');
    Route.get('/location', 'UsersController.getLocation');
    Route.post('/feed-test', 'UsersController.feedTest');
    Route.delete('/account', 'UsersController.delete');
  })
    .middleware('auth');

  Route.get('/user', 'UsersController.get');
  Route.get('/trail/:name', 'TrailsController.get');
  Route.get('/heatmap/:year/:day', 'HeatmapsController.get');
  Route.get('/heatmap-list', 'HeatmapsController.getList');
  Route.get('/wildland-fires/:year/:day', 'WildlandFiresController.get');
})
  .prefix('/api');
