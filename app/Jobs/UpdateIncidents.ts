import { JobContract, WorkerOptions } from '@ioc:Rocketseat/Bull';
import { DateTime } from 'luxon';
import WildlandFire2, { Incident } from 'App/Models/WildlandFire2';
import fetch from 'node-fetch';
import Logger from '@ioc:Adonis/Core/Logger';
import Trail from 'App/Models/Trail';
import Perimeter, { perimetersMatch } from 'App/Models/Perimeter';
import Database, { TransactionClientContract } from '@ioc:Adonis/Lucid/Database';
import applePushNotifications from '@ioc:ApplePushNotifications';

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

const baseUrl = 'https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services';

const currentWildFirePerimetersUrl = (irwinId: string) => (
  `${baseUrl}/Current_WildlandFire_Perimeters/FeatureServer/0/query?where=irwin_IrwinID%3D%27{${irwinId}}%27&outFields=&outSR=4326&f=json`
);

const currentWildFireLocationsUrl = () => (
  `${baseUrl}/Current_WildlandFire_Locations/FeatureServer/0/query?where=1%3D1&outFields=IrwinID,DailyAcres,IncidentName,ModifiedOnDateTime_dt,FireDiscoveryDateTime,PercentContained,IncidentTypeCategory,GlobalID&outSR=4326&f=json`
);

const maxDistanceToTrail = 1609.34 * 10; // 10 miles in meters

type NifcIncident = {
  attributes: {
    GlobalID: string,
    IrwinID: string,
    IncidentName: string,
    FireDiscoveryDateTime: number,
    ModifiedOnDateTime_dt: number,
    IncidentTypeCategory: string,
    DailyAcres: number,
    PercentContained: number,
    ContainmentDateTime: number,
  },
  geometry: { x: number, y: number },
}

export const finishDateTime = async (globalId: string) => {
  try {
    const response = await fetch(
      `${baseUrl}/Fire_History_Locations_Public/FeatureServer/0/query?where=GlobalID%20%3D%20'{${globalId}}'&outFields=ContainmentDateTime,ControlDateTime,FireOutDateTime,ModifiedOnDateTime_dt,DailyAcres&outSR=4326&f=json`,
    );

    if (response.ok) {
      const body = await response.json();

      if (body.features?.length) {
        if (body.features[0].attributes.ContainmentDateTime) {
          return DateTime.fromMillis(
            body.features[0].attributes.ContainmentDateTime,
          );
        }

        if (body.features[0].attributes.ControlDateTime) {
          return DateTime.fromMillis(
            body.features[0].attributes.ControlDateTime,
          );
        }

        if (body.features[0].attributes.FireOutDateTime) {
          return DateTime.fromMillis(
            body.features[0].attributes.FireOutDateTime,
          );
        }

        const { DailyAcres: dailyAcres } = body.features[0].attributes;

        const modifiedDateTime = DateTime.fromMillis(
          body.features[0].attributes.ModifiedOnDateTime_dt,
        );

        const daysSince = DateTime.now().diff(modifiedDateTime, 'days').days;

        if (
          (dailyAcres < 10 && daysSince > 3)
          || (dailyAcres <= 100 && daysSince > 8)
          || daysSince > 14
        ) {
          return modifiedDateTime;
        }

        return null;
      }
    }
  }
  catch (error) {
    Logger.error(error.message);
  }

  return null;
};

type INCIDENT_CHANGE_TYPE = 'NONE' | 'UPDATED' | 'ADDED'

export const sendPushNotification = async (
  wildlandFireIncident: WildlandFire2,
  changeType: INCIDENT_CHANGE_TYPE,
  changes: string[],
) => {
  const incidentInfo: Incident = {
    globalId: wildlandFireIncident.globalId,
    irwinId: wildlandFireIncident.irwinId,
    discoveredAt: wildlandFireIncident.properties.discoveredAt,
    modifiedAt: wildlandFireIncident.properties.modifiedAt,
    incidentTypeCategory: wildlandFireIncident.properties.incidentTypeCategory,
    incidentSize: wildlandFireIncident.properties.incidentSize,
    percentContained: wildlandFireIncident.properties.percentContained,
    containmentDateTime: wildlandFireIncident.properties.containmentDateTime,
    lat: wildlandFireIncident.properties.lat,
    lng: wildlandFireIncident.properties.lng,
    name: wildlandFireIncident.properties.name,
    perimeterId: wildlandFireIncident.perimeterId,
    distance: wildlandFireIncident.properties.distance ?? 0,
  };

  if (changeType === 'ADDED') {
    await applePushNotifications.sendPushNotifications(
      incidentInfo.incidentTypeCategory === 'WF'
        ? 'New Wild Fire'
        : 'New Prescribed Fire',
      `The "${incidentInfo.name}" incident has been added.`,
      incidentInfo,
    );
  }
  else if (changeType === 'UPDATED') {
    const listChanges = (): string => (
      changes.reduce((prevValue, currentValue) => (
        `${prevValue}\n - ${currentValue}`
      ), '')
    );

    await applePushNotifications.sendPushNotifications(
      incidentInfo.incidentTypeCategory === 'WF'
        ? 'Update to Wild Fire'
        : 'Update to Prescribed Fire',
      `The "${incidentInfo.name}" incident has changed:${listChanges()}`,
      incidentInfo,
      wildlandFireIncident.globalId,
    );
  }
};

export const getChanges = (incident: WildlandFire2, prevIncident: WildlandFire2): string[] => {
  const changes: string[] = [];

  if (prevIncident.properties.name !== incident.properties.name) {
    changes.push(`Name changed from ${prevIncident.properties.name} to ${incident.properties.name}`);
  }

  if (!prevIncident.properties.discoveredAt.equals(incident.properties.discoveredAt)) {
    changes.push(`Discovery time changed from ${prevIncident.properties.discoveredAt} to ${incident.properties.discoveredAt}`);
  }

  if (prevIncident.properties.incidentTypeCategory !== incident.properties.incidentTypeCategory) {
    changes.push(`Type category changed from ${prevIncident.properties.incidentTypeCategory} to ${incident.properties.incidentTypeCategory}`);
  }

  if (prevIncident.properties.incidentSize !== incident.properties.incidentSize) {
    changes.push(`Size changed from ${prevIncident.properties.incidentSize} to ${incident.properties.incidentSize}`);
  }

  if (prevIncident.properties.percentContained !== incident.properties.percentContained) {
    changes.push(`Percent contained changed from ${prevIncident.properties.percentContained} to ${incident.properties.percentContained}`);
  }

  if (
    (prevIncident.properties.containmentDateTime === null
      && incident.properties.containmentDateTime !== null)
    || (prevIncident.properties.containmentDateTime !== null
      && incident.properties.containmentDateTime === null)
    || (
      prevIncident.properties.containmentDateTime !== null
      && incident.properties.containmentDateTime !== null
      && prevIncident.properties.containmentDateTime.equals(incident.properties.containmentDateTime)
    )
  ) {
    changes.push(`Containment date changed from ${prevIncident.properties.containmentDateTime} to ${incident.properties.containmentDateTime}`);
  }

  if (prevIncident.properties.lat !== incident.properties.lat
    || prevIncident.properties.lng !== incident.properties.lng
  ) {
    changes.push(`Point of origin changed from (${prevIncident.properties.lat}, ${prevIncident.properties.lng}) to (${incident.properties.lat}, ${incident.properties.lng})`);
  }

  if (prevIncident.properties.distance !== incident.properties.distance) {
    changes.push(`Distance to trail changed from ${prevIncident.properties.distance} to ${incident.properties.distance}`);
  }

  if (prevIncident.perimeterId !== incident.perimeterId) {
    changes.push('Perimeter changed');
  }

  return changes;
};

export default class UpdateIncidents implements JobContract {
  public key = 'UpdateIncidents';

  public workerOptions: WorkerOptions = {
    lockDuration: 5 * 60 * 1000,
  };

  private static async getPerimeter(
    irwinID: string,
  ): Promise<undefined | { rings: [number, number][][] }> {
    try {
      const response = await fetch(currentWildFirePerimetersUrl(irwinID));

      if (response.ok) {
        const body = await response.json();

        if (body.features?.length) {
          return body.features[0].geometry;
        }
      }
    }
    catch (error) {
      Logger.error(error.message);
    }

    return undefined;
  }

  private static async processPerimeter(
    feature: NifcIncident,
    prevIncident: WildlandFire2 | null,
    trail: Trail,
    trx: TransactionClientContract,
  ): Promise<[number | null, number | null]> {
    const { attributes } = feature;
    let prevPerimeter: Perimeter | null = null;
    let perimeterId: number | null = null;
    let shortestDistance: number | null = null;

    if (prevIncident?.perimeterId) {
      prevPerimeter = await Perimeter.find(prevIncident.perimeterId, { client: trx });
    }

    // eslint-disable-next-line no-await-in-loop
    const perimeter = await UpdateIncidents.getPerimeter(attributes.IrwinID);

    if (perimeter) {
      if (prevPerimeter && perimetersMatch(prevPerimeter.geometry, perimeter)) {
        shortestDistance = prevIncident?.properties.distance ?? null;
        perimeterId = prevIncident?.perimeterId ?? null;
      }
      else {
        const newPerimeter = new Perimeter().useTransaction(trx);

        newPerimeter.fill({
          geometry: perimeter,
        });

        await newPerimeter.save();

        perimeterId = newPerimeter.id;

        // Get the closest distance from the trail to the perimeter
        perimeter.rings.forEach((r: [number, number][]) => {
          const distance = trail.getPolylineDistanceToTrail(r);

          if (distance && (shortestDistance === null || distance < shortestDistance)) {
            shortestDistance = distance;
          }
        });
      }
    }
    else if (prevIncident && prevIncident.perimeterId !== null) {
      // If the incident being processed does not have an associated perimeter
      // but the previous version of the incident did have a perimter
      // assume the fetching of the perimeter failed and use the perimiter ID
      // from the previous version
      perimeterId = prevIncident?.perimeterId ?? null;

      Logger.info(`Latest version of incident ${attributes.GlobalID} did not have a perimeter but the previous version did.`);
    }

    return [
      perimeterId,
      shortestDistance,
    ];
  }

  private static async processIncident(
    feature: NifcIncident,
    trail: Trail,
    date: string,
    trx: TransactionClientContract,
  ): Promise<[INCIDENT_CHANGE_TYPE, WildlandFire2 | null, string[]]> {
    const { attributes } = feature;
    let changes: string[] = [];

    // Logger.info(`Started processing feature ${attributes.IncidentName}`);

    // eslint-disable-next-line no-await-in-loop
    const prevIncident = await WildlandFire2
      .query({ client: trx })
      .where('globalId', attributes.GlobalID)
      .orderBy('startTimestamp', 'desc')
      .first();

    // eslint-disable-next-line prefer-const
    let [perimeterId, shortestDistance] = await UpdateIncidents.processPerimeter(
      feature,
      prevIncident,
      trail,
      trx,
    );

    // Use the distance between the point of origin and the trail if it
    // is closer.
    const coordinates = feature.geometry;
    const distance = trail.getDistanceToTrail([coordinates.x, coordinates.y]);
    if (distance && (shortestDistance === null || distance < shortestDistance)) {
      shortestDistance = distance;
    }

    if (shortestDistance !== null && shortestDistance < maxDistanceToTrail) {
      attributes.IncidentName = attributes.IncidentName.trim();

      const discoveredAt = DateTime.fromMillis(attributes.FireDiscoveryDateTime);
      const modifiedAt = DateTime.fromMillis(attributes.ModifiedOnDateTime_dt);
      const containmentDateTime = attributes.ContainmentDateTime
        ? DateTime.fromMillis(attributes.ContainmentDateTime)
        : null;

      const newIncident = new WildlandFire2().useTransaction(trx);

      newIncident.fill({
        globalId: attributes.GlobalID,
        irwinId: attributes.IrwinID,
        properties: {
          name: attributes.IncidentName,
          discoveredAt,
          modifiedAt,
          incidentTypeCategory: attributes.IncidentTypeCategory,
          incidentSize: attributes.DailyAcres,
          percentContained: attributes.PercentContained,
          containmentDateTime,
          lat: coordinates.y,
          lng: coordinates.x,
          distance: shortestDistance,
        },
        perimeterId,
        startTimestamp: DateTime.fromISO(date),
      });

      // If there was a previous version of the incident then set
      // the end date to be that of the start date of the new version.
      if (!prevIncident) {
        await newIncident.save();

        return ['ADDED', newIncident, changes];
      }

      changes = getChanges(newIncident, prevIncident);
      Logger.info('Changes', changes);

      if (changes.length > 0) {
        prevIncident.merge({
          endTimestamp: DateTime.fromISO(date),
        });

        await newIncident.save();

        await prevIncident.save();

        return ['UPDATED', newIncident, changes];
      }
    }

    // Logger.info(`Finished processing feature ${attributes.IncidentName}`);

    return ['NONE', null, changes];
  }

  private static async getIncidents(): Promise<NifcIncident[]> {
    type IncidentResponse = {
      features: NifcIncident[],
    }

    const response = await fetch(currentWildFireLocationsUrl());

    if (response.ok) {
      const body = (await response.json()) as IncidentResponse;

      // const date = DateTime.local().setZone('America/Los_Angeles').toISODate();
      // let wf = await WildlandFire.findBy('date', date);

      Logger.info(`Number of features: ${body.features.length}`);

      return body.features;
    }

    return [];
  }

  private static async getActiveIncidents(
    trx: TransactionClientContract,
  ): Promise<Map<string, WildlandFire2>> {
    const map = new Map<string, WildlandFire2>();
    const incidents = await WildlandFire2
      .query({ client: trx })
      .whereNull('endTimestamp');

    incidents.forEach((i) => {
      map.set(i.globalId, i);
    });

    return map;
  }

  private static async updateEndTimestamp(incident: WildlandFire2): Promise<void> {
    incident.endTimestamp = await finishDateTime(incident.globalId);

    // if (incident.endTimestamp === null) {
    //   incident.endTimestamp = DateTime.now();
    // }
    await incident.save();
  }

  private static async updateIncidents() {
    try {
      const trail = await Trail.findBy('name', 'PCT');

      if (trail) {
        Logger.info('Updating wildland fire incidents');
        const incidents = await UpdateIncidents.getIncidents();

        const date = DateTime.local().setZone('America/Los_Angeles').toISODate();

        const trx = await Database.transaction();

        const activeIncidents = await UpdateIncidents.getActiveIncidents(trx);

        try {
          // Iterate over the incidents
          // eslint-disable-next-line no-restricted-syntax
          await Promise.all(incidents.map(async (incident) => {
            const [
              changeType,
              wildlandFireIncident,
              changes,
            ] = await UpdateIncidents.processIncident(incident, trail, date, trx);

            if (wildlandFireIncident !== null) {
              await sendPushNotification(wildlandFireIncident, changeType, changes);

              activeIncidents.delete(incident.attributes.GlobalID);
            }
          }));

          // Find end dates for the active incidents that were not found in
          // the data set fetched from NIFC.
          // eslint-disable-next-line no-restricted-syntax
          if (activeIncidents.size > 0) {
            Logger.info(`${activeIncidents.size} active incidents not found. Updating end timestamps.`);
            const promises: Promise<void>[] = [];
            activeIncidents.forEach((incident) => {
              promises.push(UpdateIncidents.updateEndTimestamp(incident));
            });
            await Promise.all(promises);

            activeIncidents.forEach((incident) => {
              if (incident.endTimestamp === null) {
                Logger.info(`${incident.globalId} incident not found and has no end timetamp`);
              }
            });
          }

          await trx.commit();
        }
        catch (error) {
          Logger.error(error);
          await trx.rollback();
        }

        Logger.info('Completed updating wildland fire incidents');
      }
      else {
        Logger.error('Trail not found');
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
