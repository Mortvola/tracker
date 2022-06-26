import { args, BaseCommand } from '@adonisjs/core/build/standalone';

export default class LocationGet extends BaseCommand {
  /**
   * Command name is used to run the command
   */
  public static commandName = 'location:get';

  @args.string({ description: 'The name of the GPS feed' })
  public feed: string;

  /**
   * Command description is displayed in the "help" output
   */
  public static description = '';

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
    const { default: User } = await import('App/Models/User');

    const user = await User.findBy('gpsFeed', this.feed);

    if (user) {
      const response = await user.getLocation();

      console.log(JSON.stringify(response));
    }
  }
}
