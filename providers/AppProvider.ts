import { ApplicationContract } from '@ioc:Adonis/Core/Application'
import LocationUpdater from './LocationUpdater/LocationUpdater';

export default class AppProvider {
  constructor(protected app: ApplicationContract) {}

  public register() {
    // Register your own bindings

    // Register the location updater binding.
    this.app.container.singleton('LocationUpdater', () => (
      new LocationUpdater()
    ));
  }

  public async boot() {
    // IoC container is ready
  }

  public async ready() {
    // App is ready

    // Importing the LocationUpdater will instantiate an instance
    // which will start it running.
    import('@ioc:LocationUpdater');
  }

  public async shutdown() {
    // Cleanup, since app is going down
  }
}
