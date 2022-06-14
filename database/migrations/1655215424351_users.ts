import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class extends BaseSchema {
  protected tableName = 'users';

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('username');
      table.dropColumn('email');
      table.dropColumn('pending_email');
      table.dropColumn('password');
      table.dropColumn('remember_me_token');
      table.dropColumn('activated');
      table.dropColumn('access_token');
    });
  }

  public async down() {
    this.schema.alterTable(this.tableName, (/* table */) => {
    });
  }
}
