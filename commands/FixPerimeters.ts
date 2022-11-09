/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import { BaseCommand } from '@adonisjs/core/build/standalone';
import Perimeter, { PerimeterGeometry, perimetersMatch } from 'App/Models/Perimeter';
import WildlandFire2, { IncidentProperties } from 'App/Models/WildlandFire2';
import { DateTime } from 'luxon';
import Logger from '@ioc:Adonis/Core/Logger'
import fetch from 'node-fetch';
import { finishDateTime } from 'App/Jobs/UpdateIncidents';

export default class FixPerimeters extends BaseCommand {
  /**
   * Command name is used to run the command
   */
  public static commandName = 'fix:perimeters';

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

  // eslint-disable-next-line class-methods-use-this
  public async run() {
    const { default: WildlandFire } = await import('App/Models/WildlandFire');
    const { default: Database } = await import('@ioc:Adonis/Lucid/Database');
    let recordsAdded = 0;

    const trx = await Database.transaction();

    try {
      const wildlandFires = await WildlandFire.query({ client: trx }).orderBy('date');

      const incidentMap: Map<string, WildlandFire2> = new Map();

      const propertiesMatch = (p1: IncidentProperties, p2: IncidentProperties) => (
        JSON.stringify(p1) === JSON.stringify(p2)
      );

      const getIrwinID = async (globalId: string) => {
        try {
          const response = await fetch(
            `https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/CY_WildlandFire_Locations_ToDate/FeatureServer/0/query?where=GlobalID%20%3D%20'{${globalId}}'&outFields=IrwinId&outSR=4326&f=json`,
          );

          if (response.ok) {
            const body = await response.json();

            if (body.features?.length) {
              return body.features[0].attributes.IrwinID;
            }
          }
        }
        catch (error) {
          Logger.error(error.message);
        }

        return null;
      };

      const saveNewPerimeter = async (geometry: PerimeterGeometry): Promise<number> => {
        // Perimeters are different
        const perimeter = new Perimeter().useTransaction(trx);

        perimeter.fill({
          geometry,
        });

        await perimeter.save();

        return perimeter.id;
      };

      for (const wf of wildlandFires) {
        for (const i of wf.incidents) {
          const prev = incidentMap.get(i.globalId);
          let perimeterId: number | null = null;
          const timestamp = DateTime.fromISO(wf.date, { zone: 'America/Los_Angeles' });

          if (i.perimeter) {
            if (prev !== undefined && prev.perimeterId !== null) {
              // fetch the perimeter from the perimeter table
              const perimeter = await Perimeter.findOrFail(prev.perimeterId, { client: trx });

              // Compare perimeters
              if (perimetersMatch(perimeter.geometry, i.perimeter)) {
                // Perimeters match
                perimeterId = prev.perimeterId;
              }
              else {
                perimeterId = await saveNewPerimeter(i.perimeter);
              }
            }
            else {
              perimeterId = await saveNewPerimeter(i.perimeter);
            }
          }
          else if (prev !== undefined) {
            perimeterId = prev.perimeterId;
          }

          const incidentProperties: IncidentProperties = {
            lat: i.lat,
            lng: i.lng,
            name: i.name,
            discoveredAt: i.discoveredAt,
            modifiedAt: i.modifiedAt,
            incidentTypeCategory: i.incidentTypeCategory,
            incidentSize: i.incidentSize,
            percentContained: i.percentContained,
            containmentDateTime: i.containmentDateTime,
            distance: i.distance,
          };

          if (!prev
            || prev.perimeterId !== perimeterId
            || !propertiesMatch(prev.properties, incidentProperties)
          ) {
            // Add a new incident
            const wf2 = new WildlandFire2().useTransaction(trx);

            let irwinId = prev ? prev.irwinId : i.irwinId;

            if (!irwinId) {
              irwinId = await getIrwinID(i.globalId);
            }
            else {
              console.log('already have irwin ID');
            }

            wf2.fill({
              globalId: i.globalId,
              irwinId,
              perimeterId,
              properties: incidentProperties,
              startTimestamp: timestamp.toUTC(),
              endTimestamp: null,
            });

            await wf2.save();

            recordsAdded += 1;
            console.log(`records added: ${recordsAdded}`);

            if (prev) {
              prev.endTimestamp = timestamp.toUTC();

              await prev.save();
            }

            incidentMap.set(wf2.globalId, wf2);
          }
        }
      }

      const unfinished = await WildlandFire2
        .query({ client: trx })
        .whereNull('endTimestamp');

      console.log(`Checking end timestamp on ${unfinished.length} records`);

      for (const u of unfinished) {
        u.endTimestamp = await finishDateTime(u.globalId);

        await u.save();
      }

      await trx.commit();
    }
    catch (error) {
      console.log(error);
      await trx.rollback();
    }
  }
}
