import fs from 'fs';
import {
  context, // FetchInit, Request, Response,
} from 'fetch-h2';
import { SignJWT, importPKCS8, KeyLike } from 'jose';
import { DateTime } from 'luxon';
import Logger from '@ioc:Adonis/Core/Logger';
import Env from '@ioc:Adonis/Core/Env';

// type FetchType = (
//   input: string | Request,
//   init?: Partial<FetchInit> | undefined,
// ) => Promise<Response>;

class ApplePushNotifications {
  pushNotificationKey: KeyLike | null = null;

  providerJwtTime: DateTime | null;

  providerJwt: string | null = null;

  public async sendPushNotifications(
    title: string,
    body: unknown,
    attributes?: unknown,
    collapseId?: string,
  ) {
    const { default: ApnsToken } = await import('App/Models/ApnsToken');

    const { fetch, disconnectAll } = context();

    const sendPushNotification = async (
      deviceToken: any,
    ) => {
      await this.generateProviderJWT();

      const jwt = this.providerJwt;

      if (jwt === null) {
        throw new Error('provider jwt is null');
      }

      const notification = {
        aps: {
          alert: {
            title,
            body,
          },
          sound: 'default',
        },
        attributes,
      };

      try {
        Logger.info(`pushing notification to ${deviceToken.token}`);

        const response = await fetch(`${Env.get('APNS_URL')}/${deviceToken.token}`, {
          method: 'POST',
          body: JSON.stringify(notification),
          headers: {
            'Content-Type': 'application/json',
            authorization: `bearer ${jwt}`,
            'apns-priority': '5',
            'apns-topic': 'app.hikerheatmap',
            'apns-push-type': 'alert',
            'apns-collapse-id': collapseId,
          },
        });

        if (response.ok) {
          Logger.info(`apns success, device token: ${deviceToken.token}, apns id: ${response.headers.get('apns-id')}`);
        }
        else {
          const b2 = await response.json();

          if ((response.status === 400 && b2.reason === 'BadDeviceToken')
            || (response.status === 410 && b2.reason === 'Unregistered')) {
            // Remove the bad device token
            await deviceToken.delete();
          }

          Logger.error(`apns failure: ${response.status}: ${response.statusText}, body: ${JSON.stringify(b2)}`);
        }
      }
      catch (error) {
        Logger.error({ err: error }, 'send push notification');
      }
    };

    try {
      const userTokens = await ApnsToken.all();

      // eslint-disable-next-line no-restricted-syntax
      for (const userToken of userTokens) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await sendPushNotification(userToken);
        }
        catch (error) {
          Logger.error({ err: error }, 'Push notification failed');
        }
      }
    }
    catch (error) {
      Logger.error({ err: error }, 'push notification failed');
    }

    disconnectAll();
  }

  private async generateProviderJWT() {
    if (this.pushNotificationKey === null) {
      const privateKey = fs.readFileSync('./PushNotificationKey.p8');
      this.pushNotificationKey = await importPKCS8(privateKey.toString(), 'ES256');
    }

    if (this.pushNotificationKey === null) {
      throw new Error('push notification key is null');
    }

    let age: number | null = null;
    if (this.providerJwtTime) {
      age = DateTime.now().diff(this.providerJwtTime, 'minutes').minutes;
    }

    if (this.providerJwt === null || age == null
      || age > 30
    ) {
      Logger.info(`Generating new provider token. Age: ${age}`);

      this.providerJwtTime = DateTime.now();

      this.providerJwt = await new SignJWT({
        iss: Env.get('APNS_TEAM_ID'),
        iat: this.providerJwtTime.toSeconds(),
      })
        .setProtectedHeader({
          alg: 'ES256',
          kid: Env.get('APNS_KEY_ID'),
        })
        .sign(this.pushNotificationKey);
    }
  }
}

export default ApplePushNotifications;
