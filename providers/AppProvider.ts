/* eslint-disable class-methods-use-this */
import { ApplicationContract } from '@ioc:Adonis/Core/Application';

export default class AppProvider {
  // eslint-disable-next-line no-useless-constructor
  constructor(protected app: ApplicationContract) {}

  public register() {
    // Register your own bindings
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
    const { default: Bull } = await import('@ioc:Rocketseat/Bull');

    Bull.add(
      'UpdateIncidents',
      null,
      {
        repeat: {
          cron: '0 * * * *',
        }
      },
    );

    Bull.add(
      'UpdateHeatmap',
      null,
      {
        repeat: {
          cron: '0 1 * * *',
        }
      },
    );
  }

  public async shutdown() {
    // Cleanup, since app is going down
  }
}
