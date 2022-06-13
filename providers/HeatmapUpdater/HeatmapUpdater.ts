/* eslint-disable class-methods-use-this */
import { CronJob } from 'cron';
import { DateTime } from 'luxon';

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

    const users = await User.all();
    const points: [number, number][] = [];

    await Promise.all(users.map(async (u) => {
      const result = await u.getLocation();

      if (result !== null && result.code === 'success') {
        if (!result.point) {
          throw new Error('point is undefined');
        }

        const { hours } = DateTime.now().diff(result.point.timestamp, ['hours']);
        if (hours <= 24) {
          points.push(result.point.point);
        }
      }
    }));

    const heatmap = new Heatmap();

    heatmap.points = points;

    heatmap.save();
  }
}

export default HeatmapUpdater;
