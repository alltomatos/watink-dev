import { QueryInterface, DataTypes } from "sequelize";

const hasColumn = async (queryInterface: QueryInterface, tableName: string, columnName: string): Promise<boolean> => {
  const table = await queryInterface.describeTable(tableName);
  return !!table[columnName];
};

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    if (!(await hasColumn(queryInterface, "Messages", "isGroup"))) {
      await queryInterface.addColumn("Messages", "isGroup", {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }

    if (!(await hasColumn(queryInterface, "Messages", "groupJid"))) {
      await queryInterface.addColumn("Messages", "groupJid", {
        type: DataTypes.STRING,
        allowNull: true
      });
    }

    if (!(await hasColumn(queryInterface, "Messages", "participantJid"))) {
      await queryInterface.addColumn("Messages", "participantJid", {
        type: DataTypes.STRING,
        allowNull: true
      });
    }

    if (!(await hasColumn(queryInterface, "Messages", "participantName"))) {
      await queryInterface.addColumn("Messages", "participantName", {
        type: DataTypes.STRING,
        allowNull: true
      });
    }

    if (!(await hasColumn(queryInterface, "Messages", "waMessageId"))) {
      await queryInterface.addColumn("Messages", "waMessageId", {
        type: DataTypes.STRING,
        allowNull: true
      });
    }

    await queryInterface.sequelize.query(`
      UPDATE "Messages" m
      SET
        "isGroup" = COALESCE(t."isGroup", false),
        "groupJid" = CASE
          WHEN COALESCE(t."isGroup", false) = true THEN
            COALESCE(
              NULLIF((m."dataJson"->>'from'), ''),
              CASE WHEN c."number" IS NOT NULL AND c."number" <> '' THEN CONCAT(c."number", '@g.us') ELSE NULL END
            )
          ELSE NULL
        END,
        "participantJid" = COALESCE(NULLIF(m."participant", ''), NULLIF((m."dataJson"->>'participant'), '')),
        "participantName" = COALESCE(NULLIF((m."dataJson"->>'pushName'), ''), NULLIF((m."dataJson"->>'senderName'), '')),
        "waMessageId" = COALESCE(NULLIF(m."waMessageId", ''), m."id")
      FROM "Tickets" t
      LEFT JOIN "Contacts" c ON c."id" = t."contactId"
      WHERE m."ticketId" = t."id"
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_messages_tenant_groupjid_createdat"
      ON "Messages" ("tenantId", "groupJid", "createdAt")
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_messages_tenant_wamessageid"
      ON "Messages" ("tenantId", "waMessageId")
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_messages_tenant_participantjid"
      ON "Messages" ("tenantId", "participantJid")
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS "idx_messages_tenant_participantjid"`);
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS "idx_messages_tenant_wamessageid"`);
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS "idx_messages_tenant_groupjid_createdat"`);

    if (await hasColumn(queryInterface, "Messages", "waMessageId")) {
      await queryInterface.removeColumn("Messages", "waMessageId");
    }

    if (await hasColumn(queryInterface, "Messages", "participantName")) {
      await queryInterface.removeColumn("Messages", "participantName");
    }

    if (await hasColumn(queryInterface, "Messages", "participantJid")) {
      await queryInterface.removeColumn("Messages", "participantJid");
    }

    if (await hasColumn(queryInterface, "Messages", "groupJid")) {
      await queryInterface.removeColumn("Messages", "groupJid");
    }

    if (await hasColumn(queryInterface, "Messages", "isGroup")) {
      await queryInterface.removeColumn("Messages", "isGroup");
    }
  }
};