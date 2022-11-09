import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class extends BaseSchema {
  protected tableName = 'wildland_fire2s';

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id');

      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true });
      table.timestamp('updated_at', { useTz: true });

      table.string('global_id').notNullable();
      table.string('irwin_id');

      table.json('properties');
      table.integer('perimeter_id');

      table.timestamp('start_timestamp', { useTz: false }).notNullable();
      table.timestamp('end_timestamp', { useTz: false });
    });
  }

  public async down() {
    this.schema.dropTable(this.tableName);
  }
}
