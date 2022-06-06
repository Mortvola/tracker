/* eslint-disable class-methods-use-this */
import User from 'App/Models/User';
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
    console.log('update locations');

    const users = await User.all();

    users.forEach((u) => {
      u.updateLocation();
    });
    // const { default: Institution } = await import('App/Models/Institution');
    // const { default: Database } = await import('@ioc:Adonis/Lucid/Database');
    // const { default: plaidClient } = await import('@ioc:Plaid');
    // const { default: Logger } = await import('@ioc:Adonis/Core/Logger');

    // Logger.info('Checking balances');

    // const trx = await Database.transaction();

    // try {
    //   const institutions = await Institution.query({ client: trx })
    //     .whereNotNull('accessToken')
    //     .andWhereHas('accounts', (accountsQuery) => {
    //       accountsQuery.where('tracking', 'Balances').andWhere('closed', false);
    //     })
    //     .preload('accounts', (accountsQuery) => {
    //       accountsQuery.where('tracking', 'Balances');
    //     });

    //   await Promise.all(institutions.map(async (institution) => {
    //     if (institution.accessToken !== null) {
    //       Logger.info(`Checking accounts at ${institution.name}`);
    //       const response = await plaidClient.getAccounts(institution.accessToken, {
    //         account_ids: institution.accounts.map((a) => a.plaidAccountId),
    //       });

    //       await Promise.all(institution.accounts.map(async (account) => {
    //         const plaidAccount = response.accounts.find((a) => a.account_id === account.plaidAccountId);
    //         if (plaidAccount && plaidAccount.balances.current !== null) {
    //           await account.updateAccountBalanceHistory(plaidAccount.balances.current);
    //         }
    //       }));
    //     }
    //   }));

    //   trx.commit();
    // }
    // catch (error) {
    //   console.log(error);
    //   // Logger.error(error, 'balance update failed');
    //   // await trx.rollback();
    // }
  }
}

export default LocationUpdater;
