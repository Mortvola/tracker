import { ApplicationContract } from '@ioc:Adonis/Core/Application'
import HeatmapUpdater from './HeatmapUpdater/HeatmapUpdater';

export default class AppProvider {
  constructor(protected app: ApplicationContract) {}

  public register() {
    // Register your own bindings

    // Register the location updater binding.
    this.app.container.singleton('HeatmapUpdater', () => (
      new HeatmapUpdater()
    ));
  }

  public async boot() {
    // IoC container is ready
  }

  public async ready() {
    // App is ready

    // Importing the HeatmapUpdater will instantiate an instance
    // which will start it running.
    import('@ioc:HeatmapUpdater');
  }

  public async shutdown() {
    // Cleanup, since app is going down
  }
}
