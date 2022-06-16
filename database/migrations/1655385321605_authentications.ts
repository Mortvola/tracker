import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class extends BaseSchema {
  protected tableName = 'authentications';

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('username');
    });
  }

  public async down() {
    this.schema.alterTable(this.tableName, () => {
    });
  }
}
