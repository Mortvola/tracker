/* eslint-disable class-methods-use-this */
import { CronJob } from 'cron';

class HeatmapUpdater {
  cronJob: CronJob;

  intervalId: NodeJS.Timer;

  constructor() {
    this.cronJob = new CronJob('0 1 * * *', () => this.updateLocations());
    this.cronJob.start();
  }

  async updateLocations() {
    const { default: User } = await import('App/Models/User');
    const { default: Heatmap } = await import('App/Models/Heatmap');
    console.log('update heatmap');

    const users = await User.all();
    const points: [number, number][] = [];

    await Promise.all(users.map(async (u) => {
      const result = await u.getLocation();

      if (result !== null) {
        points.push(result);
      }
    }));

    const heatmap = new Heatmap();

    heatmap.points = JSON.stringify(points);

    heatmap.save();
  }
}

export default HeatmapUpdater;
