import { BaseCommand } from '@adonisjs/core/build/standalone';
import { Incident } from 'App/Models/WildlandFire2';
import { DateTime } from 'luxon';
import fetch from 'node-fetch';

type Feature = {
  geometry: { x: number, y: number},
  attributes: {
    GlobalID: string,
    IrwinID: string,
    IncidentName: string,
    FireDiscoveryDateTime: number,
    ModifiedOnDateTime_dt: number,
    IncidentTypeCategory: string,
    DailyAcres: number | null,
    PercentContained: number | null,
    ContainmentDateTime: number | null,
  },
}

export default class IncidentsUpdateHistory extends BaseCommand {
  /**
   * Command name is used to run the command
   */
  public static commandName = 'incidents:update-history';

  /**
   * Command description is displayed in the "help" output
   */
  public static description = '';

  public static settings = {
    /**
     * Set the following value to true, if you want to load the application
     * before running the command. Don't forget to call `node ace generate:manifest`
     * afterwards.
     */
    loadApp: true,

    /**
     * Set the following value to true, if you want this command to keep running until
     * you manually decide to exit the process. Don't forget to call
     * `node ace generate:manifest` afterwards.
     */
    stayAlive: false,
  };

  public static async getObjectIds(): Promise<number[]> {
    const response = await fetch(
      'https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/CY_WildlandFire_Locations_ToDate/FeatureServer/0/query?where=1%3D1&outFields=*&geometry=-125.420%2C29.800%2C-114.873%2C51.089&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&returnIdsOnly=true&outSR=4326&f=json',
    );

    if (response.ok) {
      const body = await response.json();

      return body.objectIds;
    }

    return [];
  }

  private static async getFeatures(ids: number[]): Promise<Feature[]> {
    const url = `https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/CY_WildlandFire_Locations_ToDate/FeatureServer/0/query?objectIds=${ids.join()}&outFields=*&outSR=4326&f=json`;
    const response = await fetch(
      url,
    );

    if (response.ok) {
      const body = await response.json();

      return body.features as Feature[];
    }

    return [];
  }

  public static async getIncidents(): Promise<Incident[]> {
    const { default: Trail } = await import('App/Models/Trail');
    const trail = await Trail.findBy('name', 'PCT');

    if (trail) {
      const objectIds = await IncidentsUpdateHistory.getObjectIds();

      let features: Feature[] = [];

      if (objectIds.length > 0) {
        const maxSetSize = 250;
        for (let i = 0; i < objectIds.length; i += maxSetSize) {
          // eslint-disable-next-line no-await-in-loop
          const featureSubset = await IncidentsUpdateHistory.getFeatures(
            objectIds.slice(i, i + maxSetSize),
          );

          features = features.concat(featureSubset);
        }
      }

      const incidents: Incident[] = [];

      // eslint-disable-next-line no-restricted-syntax
      for (const feature of features) {
        const coordinates = feature.geometry;
        const distance = trail.getDistanceToTrail([coordinates.x, coordinates.y]);

        const { attributes: properties } = feature;

        if (distance !== null && distance < 1609.34 * 10) {
          incidents.push({
            globalId: properties.GlobalID,
            irwinId: properties.IrwinID,
            name: properties.IncidentName,
            discoveredAt: DateTime.fromMillis(properties.FireDiscoveryDateTime),
            modifiedAt: DateTime.fromMillis(properties.ModifiedOnDateTime_dt),
            incidentTypeCategory: properties.IncidentTypeCategory,
            incidentSize: properties.DailyAcres,
            percentContained: properties.PercentContained,
            containmentDateTime: properties.ContainmentDateTime
              ? DateTime.fromMillis(properties.ContainmentDateTime)
              : null,
            lat: coordinates.y,
            lng: coordinates.x,
            distance,
          });
        }
      }

      return incidents;
    }

    return [];
  }

  // eslint-disable-next-line class-methods-use-this
  public async run() {
    const { default: WildlandFire } = await import('App/Models/WildlandFire');

    const incidents = await IncidentsUpdateHistory.getIncidents();

    if (incidents.length > 0) {
      const { days } = DateTime.fromISO('2022-12-31').diff(DateTime.fromISO('2022-01-01'), 'days');

      const year = 2022;

      // const t = incidents.find((i) => i.name === 'SOUTH');
      for (let day = 0; day < days; day += 1) {
        const date = DateTime.fromISO(`${year}-01-01`, { zone: 'America/Los_Angeles' })
          .plus({ days: day, hours: 23 });

        const incis = incidents.filter((i) => {
          if (i.discoveredAt <= date) {
            if (i.containmentDateTime && i.containmentDateTime < date) {
              return false;
            }

            let fallOffDays = 14;
            if (i.incidentSize ?? 0 < 10) {
              fallOffDays = 3;
            }
            else if (i.incidentSize ?? 0 < 100) {
              fallOffDays = 8;
            }

            if (i.modifiedAt.plus({ days: fallOffDays }) < date) {
              return false;
            }

            return true;
          }

          return false;
        });

        // eslint-disable-next-line no-await-in-loop
        let wf = await WildlandFire.findBy('date', date.toISODate());

        if (wf) {
          // eslint-disable-next-line no-await-in-loop
          await wf
            .merge({
              incidents: incis,
            })
            .save();
        }
        else {
          wf = new WildlandFire();

          // eslint-disable-next-line no-await-in-loop
          await wf
            .fill({
              date: date.toISODate(),
              incidents: incis,
            })
            .save();
        }
      }
    }
  }
}
