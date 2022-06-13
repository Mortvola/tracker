import { DateTime } from 'luxon';
import Hash from '@ioc:Adonis/Core/Hash';
import { column, beforeSave, BaseModel } from '@ioc:Adonis/Lucid/Orm';
import Env from '@ioc:Adonis/Core/Env';
import { sha256 } from 'js-sha256';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import { parseStringPromise } from 'xml2js';
import { PointResponse } from 'Common/ResponseTypes';

export default class User extends BaseModel {
  @column({ isPrimary: true })
  public id: number;

  @column()
  public username: string;

  @column()
  public email: string;

  @column()
  public pendingEmail: string | null;

  @column({ serializeAs: null })
  public password: string;

  @column()
  public rememberMeToken?: string;

  @column()
  public activated: boolean;

  @column({ serializeAs: 'gpsFeed' })
  public gpsFeed: string | null;

  @column({ serializeAs: 'feedPassword' })
  public feedPassword: string | null;

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;

  @beforeSave()
  public static async hashPassword(user: User) {
    if (user.$dirty.password) {
      user.password = await Hash.make(user.password);
    }
  }

  public generateToken() : unknown {
    const expiresIn = parseInt(Env.get('TOKEN_EXPIRATION') as string, 10) * 60;
    return jwt.sign(
      { id: this.id, hash: sha256(this.pendingEmail ?? this.email) },
      this.generateSecret(),
      { expiresIn },
    );
  }

  public generateSecret() : string {
    return `${this.password}-${this.createdAt.toMillis()}`;
  }

  public getEmailVerificationLink(): string {
    const token = this.generateToken();

    return `${Env.get('APP_URL') as string}/verify-email/${token}/${this.id}`;
  }

  public async getLocation(): Promise<PointResponse | null> {
    try {
      if (this.gpsFeed) {
        return await User.sendLocationRequest(this.gpsFeed, this.feedPassword);
      }
    }
    catch (error) {
      console.log(error);
    }

    return null;
  }

  public static async sendLocationRequest(
    feed: string,
    password: string | null,
  ): Promise<PointResponse> {
    const garminFeed = 'https://share.garmin.com/Feed/Share';

    let headers: Record<string, string> | undefined;

    if (password !== '' && password !== null) {
      headers = {
        Authorization: `Basic ${Buffer.from(`:${password}`).toString('base64')}`,
        Accept: 'application/xhtml+xml,application/xml',
      };
    }
    else {
      headers = {
        Accept: 'application/xhtml+xml,application/xml',
      };
    }

    const response = await fetch(
      `${garminFeed}/${feed}`,
      {
        headers,
      },
    );

    if (response.ok) {
      if (response.headers.get('content-type') !== 'application/vnd.google-earth.kml+xml') {
        return { code: 'empty-response' };
      }

      const body = await response.text();

      try {
        const d = await parseStringPromise(body);

        if (d) {
          const placemark = d.kml.Document[0].Folder[0].Placemark[0];
          const timestamp = placemark.TimeStamp[0].when;

          // Is the timestmap from yesterday? If so, process it.
          const t = DateTime.fromISO(timestamp);
          const point: string = placemark.Point[0].coordinates[0];
          const coordinates = point.split(',').map((s) => parseFloat(s));
          return {
            code: 'success',
            point: { point: [coordinates[0], coordinates[1]], timestamp: t },
          };
        }
      }
      catch (error) {
        console.log(error);
        return { code: 'parse-error' };
      }

      return { code: 'empty-response' };
    }

    return {
      code: 'garmin-error',
      garminErrorResponse: {
        status: response.status,
        statusText: response.statusText,
      },
    };
  }
}
