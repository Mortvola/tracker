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
    username: user.username,
    mapApiKey: Env.get('MAP_API_KEY'),
  };

  return view.render('home', { props });
}).middleware('auth');

Route.post('/register', 'UsersController.register');
Route.get('/verify-email/:token/:id', 'UsersController.verifyEmail');
Route.post('/login', 'UsersController.login');
Route.post('/logout', 'UsersController.logout');

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
  Route.get('/heatmap', 'HeatmapsController.get');
})
  .prefix('/api');
