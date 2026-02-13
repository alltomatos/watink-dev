import { QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS contacts_tenant_lid_lookup_idx
      ON "Contacts" ("tenantId", "lid")
      WHERE "lid" IS NOT NULL;
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS contacts_tenant_number_lookup_idx
      ON "Contacts" ("tenantId", "number")
      WHERE "number" IS NOT NULL;
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS contacts_tenant_lid_lookup_idx;`);
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS contacts_tenant_number_lookup_idx;`);
  }
};
