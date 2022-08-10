/* eslint-disable class-methods-use-this */
import { CronJob } from 'cron';
// import { DateTime } from 'luxon';
// import { parseStringPromise } from 'xml2js';
import fetch from 'node-fetch';
import Trail from 'App/Models/Trail';
import { DateTime } from 'luxon';
import { Incident } from 'App/Models/WildlandFire';
import { getExtents } from 'App/Models/Math';

class IncidentsUpdater {
  cronJob: CronJob;

  running = false;

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

  private static async getPerimeter(irwinID: string) {
    const response = await fetch(
      `https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/Current_WildlandFire_Perimeters/FeatureServer/0/query?where=irwin_IrwinID%3D%27{${irwinID}}%27&outFields=&outSR=4326&f=json`,
    );

    if (response.ok) {
      const body = await response.json();

      if (body.features && body.features.length > 0) {
        return body.features[0].geometry;
      }
    }

    return null;
  }

  public static async getIncidents(
    trail: Trail,
    debug = false,
  ): Promise<void> {
    const { default: WildlandFire } = await import('App/Models/WildlandFire');

    const response = await fetch(
      'https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/Current_WildlandFire_Locations/FeatureServer/0/query?where=1%3D1&outFields=IrwinID,DailyAcres,IncidentName,ModifiedOnDateTime_dt,FireDiscoveryDateTime,PercentContained,IncidentTypeCategory,GlobalID&outSR=4326&f=json',
    );

    if (response.ok) {
      const body = await response.json();

      if (debug) {
        console.log(body);
      }

      // eslint-disable-next-line no-restricted-syntax
      for (const feature of body.features) {
        // eslint-disable-next-line no-await-in-loop
        feature.perimeter = await IncidentsUpdater.getPerimeter(feature.attributes.IrwinID);
      }

      // eslint-disable-next-line no-restricted-syntax
      const incidents = await Promise.all(body.features.map(async (feature) => {
        const { attributes: properties } = feature;

        let shortestDistance: number | null = null;

        feature.perimeter?.rings.forEach((r: [number, number][]) => {
          const extents = getExtents(r);

          if (extents.east !== null
            && extents.west !== null
            && extents.north !== null
            && extents.south !== null
            && trail.expandedBoundsIntersection(
              extents.east, extents.west, extents.north, extents.south,
            )
          ) {
            r.forEach((c: [number, number]) => {
              const distance = trail?.getDistanceToTrail(c);

              if (distance && (shortestDistance === null || distance < shortestDistance)) {
                shortestDistance = distance;
              }
            });
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

        return incident;
      }));

      const date = DateTime.local().setZone('America/Los_Angeles').toISODate();
      let wf = await WildlandFire.findBy('date', date);

      if (wf) {
        await wf
          .merge({
            incidents: incidents.filter((i) => i !== null),
          })
          .save();
      }
      else {
        wf = new WildlandFire();

        await wf
          .fill({
            date,
            incidents: incidents.filter((i) => i !== null),
          })
          .save();
      }
    }
  }

  async updateIncidents() {
    if (!this.running) {
      this.running = true;

      try {
        const { default: Trail } = await import('App/Models/Trail');

        const trail = await Trail.findBy('name', 'PCT');

        if (trail) {
          console.log('Updating wildland fire incidents');
          await IncidentsUpdater.getIncidents(trail);
          console.log('Completed updating wildland fire incidents');
        }
      }
      catch (error) {
        console.log(error.message);
      }

      this.running = false;
    }
  }
}

export default IncidentsUpdater;
