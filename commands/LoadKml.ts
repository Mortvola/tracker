/* eslint-disable class-methods-use-this */
import { BaseCommand, Exception, args } from '@adonisjs/core/build/standalone';
import Database from '@ioc:Adonis/Lucid/Database';
import { parseStringPromise } from 'xml2js';

export default class LoadKml extends BaseCommand {
  /**
   * Command name is used to run the command
   */
  public static commandName = 'load:kml';

  /**
   * Command description is displayed in the "help" output
   */
  public static description = 'Converts a KML into a linestring and stores it in the trails table';

  @args.string({ description: 'The name of the KML file' })
  public kmlFile: string;

  @args.string({ description: 'The name of the trail' })
  public trail: string;

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

  public async run() {
    const { default: Drive } = await import('@ioc:Adonis/Core/Drive');

    const buffer = await Drive.get(`./${this.kmlFile}`);

    const data = await parseStringPromise(buffer.toString());

    type Placemark = {
      LineString: { coordinates: string[] }[],
    };

    if (data.kml.Document.length > 1) {
      throw new Exception('Mulitple entries in Document');
    }

    if (data.kml.Document[0].Folder.length > 1) {
      throw new Exception('Mulitple entries in Folder');
    }

    const placemarks: Placemark[] = data.kml.Document[0].Folder[0].Placemark;

    const coordinates2 = placemarks.map((p) => {
      if (p.LineString.length > 1) {
        throw new Exception('Mulitple entries in LineString');
      }

      const { coordinates } = p.LineString[0];

      return coordinates.flatMap((c) => {
        const whitespaceRgx = /[ \t\r\n]+/;

        const coord = c.split(whitespaceRgx);

        const coord2 = coord
          .filter((c2) => c2 !== '')
          .map<[number, number]>((c2) => {
            const parts = c2.split(',');

            return [parseFloat(parts[0]), parseFloat(parts[1])];
          });

        return coord2;
      });
    });

    await Database.insertQuery().table('trails').insert({
      name: this.trail,
      points: JSON.stringify(coordinates2),
    });
  }
}
