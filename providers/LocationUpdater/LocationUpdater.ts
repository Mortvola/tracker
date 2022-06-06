/* eslint-disable class-methods-use-this */
import { CronJob } from 'cron';

class LocationUpdater {
  cronJob: CronJob;

  intervalId: NodeJS.Timer;

  constructor() {
    // this.cronJob = new CronJob('0 21 * * *', () => this.updateLocations());
    // this.cronJob.start();

    this.intervalId = setInterval(() => this.updateLocations(), 10000);
  }

  async updateLocations() {
    const { default: User } = await import('App/Models/User');
    const { default: Heatmap } = await import('App/Models/Heatmap');
    console.log('update locations');

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

export default LocationUpdater;
