import { JobContract, WorkerOptions } from '@ioc:Rocketseat/Bull';
import { DateTime } from 'luxon';
import WildlandFire, { Incident } from 'App/Models/WildlandFire';
import fetch from 'node-fetch';
import Logger from '@ioc:Adonis/Core/Logger'

/*
|--------------------------------------------------------------------------
| Job setup
|--------------------------------------------------------------------------
|
| This is the basic setup for creating a job, but you can override
| some settings.
|
| You can get more details by looking at the bullmq documentation.
| https://docs.bullmq.io/
*/

export default class UpdateIncidents implements JobContract {
  public key = 'UpdateIncidents';

  public workerOptions: WorkerOptions = {
    lockDuration: 5 * 60 * 1000,
  };

  private static async getPerimeter(
    irwinID: string,
  ): Promise<undefined | { rings: [number, number][][] }> {
    try {
      const response = await fetch(
        `https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/Current_WildlandFire_Perimeters/FeatureServer/0/query?where=irwin_IrwinID%3D%27{${irwinID}}%27&outFields=&outSR=4326&f=json`,
      );

      if (response.ok) {
        const body = await response.json();

        if (body.features && body.features.length > 0) {
          return body.features[0].geometry;
        }
      }
    }
    catch (error) {
      Logger.error(error.message);
    }

    return undefined;
  }

  private static async processFeature(feature, trail) {
    const { attributes: properties } = feature;

    Logger.info(`Started processing feature ${properties.IncidentName}`);

    properties.IncidentName = properties.IncidentName.trim();
    let shortestDistance: number | null = null;

    feature.perimeter?.rings.forEach((r: [number, number][]) => {
      const distance = trail?.getPolylineDistanceToTrail(r);

      if (distance && (shortestDistance === null || distance < shortestDistance)) {
        shortestDistance = distance;
      }
    });

    const coordinates = feature.geometry;
    const distance = trail?.getDistanceToTrail([coordinates.x, coordinates.y]);
    if (distance && (shortestDistance === null || distance < shortestDistance)) {
      shortestDistance = distance;
    }

    let incident: Incident | null = null;

    if (shortestDistance !== null && shortestDistance < 1609.34 * 10) {
      incident = {
        globalId: properties.GlobalID,
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
        distance: shortestDistance,
        perimeter: feature.perimeter,
      };
    }

    Logger.info(`Finished processing feature ${properties.IncidentName}`);

    return incident;
  }

  public static async getIncidents(
    trail: any,
  ): Promise<void> {
    type IncidentResponse = {
      features: {
        attributes: {
          IrwinID: string,
          GlobalID: string,
          IncidentName: string,
          FireDiscoveryDateTime: number,
          ModifiedOnDateTime_dt: number,
          IncidentTypeCategory: string,
          DailyAcres: number,
          PercentContained: number,
          ContainmentDateTime: number,
        },
        perimeter?: {
          rings: [number, number][][],
        },
        geometry: { x: number, y: number },
      }[],
    }

    const response = await fetch(
      'https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/Current_WildlandFire_Locations/FeatureServer/0/query?where=1%3D1&outFields=IrwinID,DailyAcres,IncidentName,ModifiedOnDateTime_dt,FireDiscoveryDateTime,PercentContained,IncidentTypeCategory,GlobalID&outSR=4326&f=json',
    );

    if (response.ok) {
      const body = (await response.json()) as IncidentResponse;

      Logger.info(`Number of features: ${body.features.length}`);

      const featurePromises: Promise<Incident | null>[] = [];

      // eslint-disable-next-line no-restricted-syntax
      for (const feature of body.features) {
        // eslint-disable-next-line no-await-in-loop
        feature.perimeter = await UpdateIncidents.getPerimeter(feature.attributes.IrwinID);
        Logger.info(`Perimeter fetched for feature ${feature.attributes.IncidentName}`);

        featurePromises.push(UpdateIncidents.processFeature(feature, trail));
      }

      // eslint-disable-next-line no-restricted-syntax
      const incidents = (await Promise.all(featurePromises))
        .filter((i) => i !== null) as Incident[];

      const date = DateTime.local().setZone('America/Los_Angeles').toISODate();
      let wf = await WildlandFire.findBy('date', date);

      if (wf) {
        await wf
          .merge({
            incidents,
          })
          .save();
      }
      else {
        wf = new WildlandFire();

        await wf
          .fill({
            date,
            incidents,
          })
          .save();
      }
    }
  }

  static async updateIncidents() {
    try {
      const { default: Trail } = await import('App/Models/Trail');

      const trail = await Trail.findBy('name', 'PCT');

      if (trail) {
        Logger.info('Updating wildland fire incidents');
        await UpdateIncidents.getIncidents(trail);
        Logger.info('Completed updating wildland fire incidents');
      }
    }
    catch (error) {
      Logger.error(error.message);
    }
  }

  // eslint-disable-next-line class-methods-use-this
  public async handle() {
    // const { data } = job;
    return UpdateIncidents.updateIncidents();
  }
}
