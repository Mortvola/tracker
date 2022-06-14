import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class extends BaseSchema {
  protected tableName = 'authentications';

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id');
      table.integer('user_id');
      table.string('type').notNullable();
      table.string('provider');
      table.string('email');
      table.string('email_verification_status');
      table.string('provider_user_id');
      table.string('provider_access_token');
      table.string('username');
      table.string('password');
      table.string('remember_me_token');

      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true });
      table.timestamp('updated_at', { useTz: true });
    });

    this.defer(async (db) => {
      const trx = await db.transaction();

      const users = await trx.from('users');

      await Promise.all(users.map(async (u) => {
        await trx.table('authentications')
          .insert({
            user_id: u.id,
            type: 'email',
            email: u.email,
            email_verification_status: 'verified',
            username: u.username,
            password: u.password,
            remember_me_token: u.remember_me_token,
          });
      }));

      await trx.commit();
    });
  }

  public async down() {
    this.schema.dropTable(this.tableName);
  }
}
