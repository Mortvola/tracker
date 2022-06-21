/* eslint-disable class-methods-use-this */
import { CronJob } from 'cron';
import { DateTime } from 'luxon';

// Points have to be less than 0.1 miles from the
// trail to be included
const distanceThreshold = 160.934; // meters

class HeatmapUpdater {
  cronJob: CronJob;

  intervalId: NodeJS.Timer;

  constructor() {
    this.cronJob = new CronJob(
      '0 1 * * *', // 1 AM
      () => this.updateLocations(),
      undefined,
      undefined,
      'America/Los_Angeles',
    );
    this.cronJob.start();
  }

  async updateLocations() {
    const { default: User } = await import('App/Models/User');
    const { default: Heatmap } = await import('App/Models/Heatmap');
    const { default: Trail } = await import('App/Models/Trail');

    const trail = await Trail.findBy('name', 'PCT');

    const users = await User.all();
    const points: [number, number][] = [];
    let offTrail = 0;
    let feedNotSetup = 0;
    let feedError = 0;

    await Promise.all(users.map(async (u) => {
      const result = await u.getLocation();

      if (result !== null) {
        if (result.code === 'success') {
          if (!result.point) {
            throw new Error('point is undefined');
          }

          const { hours } = DateTime.now().diff(result.point.timestamp, ['hours']);
          if (hours <= 24) {
            const distance = trail?.getDistanceToTrail(result.point.point);

            if (distance && distance < distanceThreshold) {
              points.push(result.point.point);
            }
            else {
              offTrail += 1;
            }
          }
          else {
            offTrail += 1;
          }
        }
        else if (result.code === 'gps-feed-null') {
          feedNotSetup += 1;
        }
        else {
          feedError += 1;
        }
      }
      else {
        feedError += 1;
      }
    }));

    const heatmap = new Heatmap();

    heatmap.date = DateTime.now().minus({ days: 1 }).toISODate();
    heatmap.points = points;
    heatmap.offTrail = offTrail;
    heatmap.feedNotSetup = feedNotSetup;
    heatmap.feedError = feedError;

    heatmap.save();
  }
}

export default HeatmapUpdater;
