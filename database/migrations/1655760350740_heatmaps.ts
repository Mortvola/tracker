import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class extends BaseSchema {
  protected tableName = 'heatmaps';

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('date');
    });

    this.defer(async (db) => {
      const trx = await db.transaction();

      await trx.rawQuery(`
        update heatmaps
        set date = DATE(created_at);
      `);

      await trx.commit();
    });
  }

  public async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('date');
    });
  }
}
