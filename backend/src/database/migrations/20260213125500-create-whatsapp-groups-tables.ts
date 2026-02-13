import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS "WhatsAppGroups" (
        "id" SERIAL PRIMARY KEY,
        "groupJid" VARCHAR(255) NOT NULL,
        "subject" VARCHAR(255),
        "participantsCount" INTEGER NOT NULL DEFAULT 0,
        "metadataJson" JSONB,
        "lastSyncedAt" TIMESTAMP WITH TIME ZONE,
        "whatsappId" INTEGER REFERENCES "Whatsapps"("id") ON UPDATE CASCADE ON DELETE SET NULL,
        "contactId" INTEGER REFERENCES "Contacts"("id") ON UPDATE CASCADE ON DELETE SET NULL,
        "tenantId" UUID NOT NULL REFERENCES "Tenants"("id") ON UPDATE CASCADE ON DELETE CASCADE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        UNIQUE ("tenantId", "groupJid")
      )
    `);

    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS "WhatsAppGroupParticipants" (
        "id" SERIAL PRIMARY KEY,
        "groupId" INTEGER NOT NULL REFERENCES "WhatsAppGroups"("id") ON UPDATE CASCADE ON DELETE CASCADE,
        "participantJid" VARCHAR(255) NOT NULL,
        "participantName" VARCHAR(255),
        "isAdmin" BOOLEAN NOT NULL DEFAULT false,
        "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
        "metadataJson" JSONB,
        "tenantId" UUID NOT NULL REFERENCES "Tenants"("id") ON UPDATE CASCADE ON DELETE CASCADE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        UNIQUE ("groupId", "participantJid")
      )
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_wagroups_tenant_updated"
      ON "WhatsAppGroups" ("tenantId", "updatedAt" DESC)
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_wagroupparticipants_group"
      ON "WhatsAppGroupParticipants" ("groupId", "updatedAt" DESC)
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS "idx_wagroupparticipants_group"`);
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS "idx_wagroups_tenant_updated"`);
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS "WhatsAppGroupParticipants"`);
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS "WhatsAppGroups"`);
  }
};