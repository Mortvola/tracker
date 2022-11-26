import { args, BaseCommand, flags } from '@adonisjs/core/build/standalone';
import { getChanges, sendPushNotification } from 'App/Jobs/UpdateIncidents';
import WildlandFire2 from 'App/Models/WildlandFire2';

export default class ApnPush extends BaseCommand {
  /**
   * Command name is used to run the command
   */
  public static commandName = 'apn:push';

  /**
   * Command description is displayed in the "help" output
   */
  public static description = '';

  @args.string({ description: 'The global ID of the incident' })
  public globalId: string;

  @flags.boolean({ alias: 'u', description: 'Indicates the notification is an update' })
  public update: boolean;

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

  // eslint-disable-next-line class-methods-use-this
  public async run() {
    let changes: string[] = [];

    const incident = await WildlandFire2
      .query()
      .where('globalId', this.globalId).orderBy('updatedAt', 'desc')
      .firstOrFail();

    if (this.update) {
      const prevIncident = await WildlandFire2
        .query()
        .where('globalId', this.globalId).orderBy('updatedAt', 'desc')
        .andWhere('id', '!=', incident.id)
        .first();

      if (prevIncident) {
        changes = getChanges(incident, prevIncident);

        console.log(JSON.stringify(changes));
      }
      else {
        console.log('previous incident not found.');
      }
    }

    await sendPushNotification(incident, this.update ? 'UPDATED' : 'ADDED', changes);
  }
}
