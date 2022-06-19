/* eslint-disable class-methods-use-this */
import { Exception } from '@adonisjs/core/build/standalone';
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import Database from '@ioc:Adonis/Lucid/Database';
import Authentication from 'App/Models/Authentication';
import DataDeletionLog from 'App/Models/DataDeletionLog';
import User from 'App/Models/User';
import { sha256 } from 'js-sha256';
import Env from '@ioc:Adonis/Core/Env';

export default class OAuthsController {
  public async redirect({ params, ally }: HttpContextContract) {
    const providerName = params.provider;

    switch (providerName) {
      case 'google':
        return ally.use('google').redirect((redirectRequest) => {
          redirectRequest
            .param('prompt', 'select_account');
        });

      case 'facebook':
        return ally.use('facebook').redirect();

      default:
        throw new Exception('unknown provider', 400);
    }
  }

  public async handleOauth2(
    {
      ally,
      auth,
      response,
      logger,
      session,
      params,
    }: HttpContextContract,
  ) {
    const providerName = params.provider;

    if (!['google', 'facebook'].includes(providerName)) {
      throw new Exception(`invalid provider name: ${providerName}`);
    }

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

      response.redirect('/');
    }
    catch (error) {
      response.redirect('/');
    }

    return null;
  }

  public async dataDelete({ request, response, params }: HttpContextContract) {
    const providerName = params.provider;

    if (providerName !== 'facebook') {
      throw new Exception('invalid provider name', 400);
    }

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
  }
}
