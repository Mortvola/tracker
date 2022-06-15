import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class extends BaseSchema {
  protected tableName = 'authentications';

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('avatar_url');
    });
  }

  public async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('"avatar_url"');
    });
  }
}
