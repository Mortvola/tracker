import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class extends BaseSchema {
  protected tableName = 'heatmaps';

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('off_trail').notNullable().defaultTo(0);
      table.integer('feed_not_setup').notNullable().defaultTo(0);
      table.integer('feed_error').notNullable().defaultTo(0);
    });
  }

  public async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('off_trail');
      table.dropColumn('feed_not_setup');
      table.dropColumn('feed_error');
    });
  }
}
