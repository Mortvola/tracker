/* eslint-disable class-methods-use-this */
import { ApplicationContract } from '@ioc:Adonis/Core/Application';
import FireIncidentUpdater from './FireIncidentUpdater';
import HeatmapUpdater from './HeatmapUpdater/HeatmapUpdater';

export default class AppProvider {
  // eslint-disable-next-line no-useless-constructor
  constructor(protected app: ApplicationContract) {}

  public register() {
    // Register your own bindings

    // Register the location updater binding.
    this.app.container.singleton('HeatmapUpdater', () => (
      new HeatmapUpdater()
    ));

    // Register the location updater binding.
    this.app.container.singleton('FireIncidentUpdater', () => (
      new FireIncidentUpdater()
    ));
  }

  public async boot() {
    // IoC container is ready
    const Auth = this.app.container.resolveBinding('Adonis/Addons/Auth');
    const Hash = this.app.container.resolveBinding('Adonis/Core/Hash');

    const { MyUserProvider } = await import('./MyUserProvider');

    Auth.extend('provider', 'myProvider', (_, __, config) => new MyUserProvider(config, Hash));
  }

  public async ready() {
    // App is ready

    // Importing the HeatmapUpdater will instantiate an instance
    // which will start it running.
    import('@ioc:HeatmapUpdater');

    // Importing the FireIncidentUpdater will instantiate an instance
    // which will start it running.
    import('@ioc:FireIncidentUpdater');
  }

  public async shutdown() {
    // Cleanup, since app is going down
  }
}
