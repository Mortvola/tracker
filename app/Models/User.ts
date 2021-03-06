import { DateTime } from 'luxon';
import { column, BaseModel } from '@ioc:Adonis/Lucid/Orm';
import fetch from 'node-fetch';
import { parseStringPromise } from 'xml2js';
import { PointResponse } from 'Common/ResponseTypes';

export default class User extends BaseModel {
  @column({ isPrimary: true })
  public id: number;

  @column({ serializeAs: 'gpsFeed' })
  public gpsFeed: string | null;

  @column({ serializeAs: 'feedPassword' })
  public feedPassword: string | null;

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;

  @column()
  public initialized: boolean;

  public async getLocation(debug = false): Promise<PointResponse | null> {
    try {
      if (this.gpsFeed) {
        return await User.sendLocationRequest(this.gpsFeed, this.feedPassword, debug);
      }

      return { code: 'gps-feed-null' };
    }
    catch (error) {
      console.log(error);
    }

    return null;
  }

  public static async sendLocationRequest(
    feed: string,
    password: string | null,
    debug = false,
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

      if (debug) {
        console.log(body);
      }

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
