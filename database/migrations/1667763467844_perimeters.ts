import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class extends BaseSchema {
  protected tableName = 'perimeters';

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id');

      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true });
      table.timestamp('updated_at', { useTz: true });

      table.json('geometry').notNullable();
    });
  }

  public async down() {
    this.schema.dropTable(this.tableName);
  }
}
