/* eslint-disable class-methods-use-this */
import {
  BaseCommand, Exception, args, flags,
} from '@adonisjs/core/build/standalone';
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

  @flags.boolean({ alias: 'r', description: 'Replaces the existing data with new data' })
  public replace: boolean;

  @flags.boolean({ alias: 'f', description: 'Outputs file only' })
  public fileOnly: boolean;

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
    const { default: Trail } = await import('App/Models/Trail');

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

    const findPrecedingSegment = (
      segments: [number, number][][],
      candidates: [number, number][][],
    ): [number, boolean] => {
      const firstSegment = segments[0];
      const firstPoint = firstSegment[0];

      // Find segment before first segment
      const index = candidates.findIndex((c) => (
        (c[0][0] === firstPoint[0]
          && c[0][1] === firstPoint[1])
          || (c[c.length - 1][0] === firstPoint[0]
            && c[c.length - 1][1] === firstPoint[1])
      ));

      if (index === -1) {
        return [index, false];
      }

      const p = candidates[index][candidates[index].length - 1];

      return [index, p[0] !== firstPoint[0] || p[1] !== firstPoint[1]];
    };

    const findFollowingSegment = (
      segments: [number, number][][],
      candidates: [number, number][][],
    ): [number, boolean] => {
      const lastSegment = segments[segments.length - 1];
      const lastPoint = lastSegment[lastSegment.length - 1];

      // Find segment after last segment
      const index = candidates.findIndex((c) => (
        (c[0][0] === lastPoint[0]
          && c[0][1] === lastPoint[1])
          || (c[c.length - 1][0] === lastPoint[0]
            && c[c.length - 1][1] === lastPoint[1])
      ));

      if (index === -1) {
        return [index, false];
      }

      const p = candidates[index][candidates[index].length - 1];

      return [index, p[0] !== lastPoint[0] || p[1] !== lastPoint[1]];
    };

    let segmentGroups: [number, number][][] = [];

    while (coordinates2.length !== 0) {
      let newSegments: [number, number][][] = [coordinates2[0]];
      coordinates2.splice(0, 1);

      while (coordinates2.length !== 0) {
        const [segmentIndex, reverse] = findPrecedingSegment(newSegments, coordinates2);

        if (segmentIndex === -1) {
          break;
        }

        newSegments = [
          reverse ? coordinates2[segmentIndex].reverse() : coordinates2[segmentIndex],
          ...newSegments.slice(),
        ];
        coordinates2.splice(segmentIndex, 1);
      }

      while (coordinates2.length !== 0) {
        const [segmentIndex, reverse] = findFollowingSegment(newSegments, coordinates2);

        if (segmentIndex === -1) {
          break;
        }

        newSegments = [
          ...newSegments.slice(),
          reverse ? coordinates2[segmentIndex].reverse() : coordinates2[segmentIndex],
        ];
        coordinates2.splice(segmentIndex, 1);
      }

      segmentGroups = [
        ...segmentGroups.slice(),
        newSegments.flatMap((s) => s),
      ];
    }

    await Drive.put(`${this.trail}.json`, JSON.stringify(segmentGroups));

    if (!this.fileOnly) {
      if (this.replace) {
        const trail = await Trail.findBy('name', this.trail);

        if (trail) {
          trail.points = segmentGroups;

          console.log('updating trail points');

          trail.save();
          return;
        }
      }

      const trail = new Trail();

      trail.fill({
        name: this.trail,
        points: segmentGroups,
      });

      console.log('inserting trail points');

      trail.save();
    }
  }
}
