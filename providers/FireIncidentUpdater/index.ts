/* eslint-disable class-methods-use-this */
import { CronJob } from 'cron';
// import { DateTime } from 'luxon';
// import { parseStringPromise } from 'xml2js';
import fetch from 'node-fetch';
import Trail from 'App/Models/Trail';
import { DateTime } from 'luxon';
import { Incident } from 'App/Models/WildlandFire';

class IncidentsUpdater {
  cronJob: CronJob;

  intervalId: NodeJS.Timer;

  constructor() {
    this.cronJob = new CronJob(
      '0 * * * *', // Each hour
      () => this.updateIncidents(),
      undefined,
      undefined,
      'America/Los_Angeles',
    );
    this.cronJob.start();

    this.updateIncidents();
  }

  public static async getIncidents(
    trail: Trail,
    debug = false,
  ): Promise<void> {
    const { default: WildlandFire } = await import('App/Models/WildlandFire');

    const response = await fetch(
      'https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/Current_WildlandFire_Locations/FeatureServer/0/query?where=1%3D1&outFields=DailyAcres,IncidentName,ModifiedOnDateTime_dt,FireDiscoveryDateTime,PercentContained,IncidentTypeCategory,GlobalID&outSR=4326&f=json',
    );

    if (response.ok) {
      const body = await response.json();

      if (debug) {
        console.log(body);
      }

      const incidents: Incident[] = [];

      // eslint-disable-next-line no-restricted-syntax
      for (const feature of body.features) {
        const coordinates = feature.geometry;
        const distance = trail?.getDistanceToTrail([coordinates.x, coordinates.y]);

        const { attributes: properties } = feature;

        if (distance !== null && distance < 1609.34 * 10) {
          incidents.push({
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
          });
        }
      }

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

  async updateIncidents() {
    const { default: Trail } = await import('App/Models/Trail');

    const trail = await Trail.findBy('name', 'PCT');

    if (trail) {
      IncidentsUpdater.getIncidents(trail);
    }
  }
}

export default IncidentsUpdater;
