import fs from 'fs';
import {
  context, FetchInit, Request, Response,
} from 'fetch-h2';
import { SignJWT, importPKCS8, KeyLike } from 'jose';
import { DateTime } from 'luxon';
import Logger from '@ioc:Adonis/Core/Logger';
import Env from '@ioc:Adonis/Core/Env';

type FetchType = (
  input: string | Request,
  init?: Partial<FetchInit> | undefined,
) => Promise<Response>;

class ApplePushNotifications {
  pushNotificationKey: KeyLike | null = null;

  providerJwtTime: DateTime | null;

  providerJwt: string | null = null;

  private async send(
    ctx: {
      fetch: (input: string | Request, init?: Partial<FetchInit> | undefined) => Promise<Response>,
    },
    deviceToken: { token: string, delete: () => Promise<void> },
    notification: unknown,
    notificationType: 'alert' | 'background',
    collapseId?: string,
  ) {
    await this.generateProviderJWT();

    const jwt = this.providerJwt;

    if (jwt === null) {
      throw new Error('provider jwt is null');
    }

    try {
      Logger.info(`pushing notification to ${deviceToken.token}`);

      const params: Partial<FetchInit> = {
        method: 'POST',
        body: JSON.stringify(notification),
        headers: {
          'Content-Type': 'application/json',
          authorization: `bearer ${jwt}`,
          'apns-priority': '5',
          'apns-topic': 'app.hikerheatmap',
          'apns-push-type': notificationType,
          'apns-collapse-id': collapseId,
        },
      };

      const response = await ctx.fetch(`${Env.get('APNS_URL')}/${deviceToken.token}`, params);

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
  }

  private async sendPushNotification(
    ctx: {
      fetch: FetchType,
    },
    deviceToken: { token: string, delete: () => Promise<void> },
    title: string,
    body: unknown,
    attributes?: unknown,
    collapseId?: string,
  ) {
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

    await this.send(ctx, deviceToken, notification, 'alert', collapseId);
  }

  private async sendBackgroundNotification(
    ctx: {
      fetch: FetchType,
    },
    deviceToken: { token: string, delete: () => Promise<void> },
  ) {
    const notification = {
      aps: {
        'content-available': 1,
      },
    };

    await this.send(ctx, deviceToken, notification, 'background', 'refresh');
  }

  public async sendPushNotifications(
    title: string,
    body: unknown,
    attributes?: unknown,
    collapseId?: string,
  ) {
    const { default: ApnsToken } = await import('App/Models/ApnsToken');

    const ctx = context();

    try {
      const userTokens = await ApnsToken.all();

      // eslint-disable-next-line no-restricted-syntax
      for (const userToken of userTokens) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await this.sendPushNotification(ctx, userToken, title, body, attributes, collapseId);
        }
        catch (error) {
          Logger.error({ err: error }, 'Push notification failed');
        }
      }
    }
    catch (error) {
      Logger.error({ err: error }, 'push notification failed');
    }

    ctx.disconnectAll();
  }

  // eslint-disable-next-line class-methods-use-this
  public async sendBackgroundPushNotifications() {
    const { default: ApnsToken } = await import('App/Models/ApnsToken');

    const ctx = context();

    try {
      const userTokens = await ApnsToken.all();

      // eslint-disable-next-line no-restricted-syntax
      for (const userToken of userTokens) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await this.sendBackgroundNotification(ctx, userToken);
        }
        catch (error) {
          Logger.error({ err: error }, 'Push notification failed');
        }
      }
    }
    catch (error) {
      Logger.error({ err: error }, 'push notification failed');
    }

    ctx.disconnectAll();
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
