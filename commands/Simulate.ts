/* eslint-disable max-classes-per-file */
/* eslint-disable class-methods-use-this */
import { BaseCommand, flags } from '@adonisjs/core/build/standalone';

function degToRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function haversineGreatCircleDistance(
  latitudeFrom: number,
  longitudeFrom: number,
  latitudeTo: number,
  longitudeTo: number,
  earthRadius = 6378137,
): number {
  // convert from degrees to radians
  const latFrom = degToRad(latitudeFrom);
  const lonFrom = degToRad(longitudeFrom);
  const latTo = degToRad(latitudeTo);
  const lonTo = degToRad(longitudeTo);

  const latDelta = latTo - latFrom;
  const lonDelta = lonTo - lonFrom;

  const a = (Math.sin(latDelta / 2) ** 2)
    + Math.cos(latFrom) * Math.cos(latTo) * (Math.sin(lonDelta / 2) ** 2);

  const angle = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return angle * earthRadius;
}

class Hiker {
  lat: number;

  lng: number;

  metersPerDay: number;

  segmentIndex = 0;

  segmentFraction = 0;

  hikingDays = 0;

  zeroDays = 0;

  constructor(lat: number, lng: number) {
    this.lat = lat;
    this.lng = lng;
    this.metersPerDay = (Math.random() * 10 + 15) * 1609.34;
  }

  hike(segment: [number, number][]): boolean {
    if (this.zeroDays > 0) {
      this.zeroDays -= 1;
      return false;
    }

    let remainingDistance = this.metersPerDay;

    for (let i = this.segmentIndex; i < segment.length - 1; i += 1) {
      const distance = haversineGreatCircleDistance(
        segment[i][1],
        segment[i][0],
        segment[i + 1][1],
        segment[i + 1][0],
      );

      if (distance > remainingDistance) {
        // todo: compute offset into segment
        this.segmentIndex = i;
        [this.lng, this.lat] = segment[i];
        remainingDistance = 0;
        break;
      }

      this.hikingDays += 1;

      if (this.hikingDays === 5) {
        // Randomly choose
        this.zeroDays += Math.trunc(3 * Math.random());
      }

      remainingDistance -= distance;
    }

    return remainingDistance > 0;
  }
}

export default class Simulate extends BaseCommand {
  /**
   * Command name is used to run the command
   */
  public static commandName = 'simulate';

  /**
   * Command description is displayed in the "help" output
   */
  public static description = 'Simulates hikers for testing heatmap';

  @flags.number({ alias: 'd', description: 'Maximum number of days to run simulation' })
  public maxDays: number;

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
    const { default: Trail } = await import('App/Models/Trail');
    const { default: Heatmap } = await import('App/Models/Heatmap');

    const trail = await Trail.query().first();

    if (trail) {
      // Find longest segment
      let longestSegment: [number, number][] | undefined;
      let longestLength: number | undefined;

      if (typeof trail.points === 'string') {
        throw new Error('points is a string');
      }

      trail.points.forEach((s) => {
        if (s.length > (longestLength ?? 0)) {
          longestSegment = s;
          longestLength = s.length;
        }
      });

      if (longestSegment) {
        const hikers: Hiker[] = [];

        const addHikers = () => {
          const numberOfHikers = Math.trunc(Math.random() * 20 + 30);

          for (let i = 0; i < numberOfHikers; i += 1) {
            if (!longestSegment) {
              throw new Error('longestSegment is undefined');
            }

            hikers.push(new Hiker(longestSegment[0][1], longestSegment[0][0]));
          }
        };

        let d = 0;
        while ((d === 0 || hikers.length > 0)
          && (this.maxDays === undefined || d < this.maxDays)
        ) {
          const points: [number, number][] = [];

          d += 1;

          // Only add hikers for the first 90 days
          if (d < 90) {
            addHikers();
          }

          console.log(`Day ${d}, hikers: ${hikers.length}`);

          // Move hikers
          for (let i = 0; i < hikers.length;) {
            const completed = hikers[i].hike(longestSegment);

            points.push([hikers[i].lng, hikers[i].lat]);

            if (completed) {
              hikers.splice(i, 1);
            }
            else {
              i += 1;
            }
          }

          const heatmap = new Heatmap();

          heatmap.points = points;

          // eslint-disable-next-line no-await-in-loop
          await heatmap.save();
        }
      }
    }
  }
}
