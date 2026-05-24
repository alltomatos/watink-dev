import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("TenantSubscriptions", {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      tenantId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "Tenants", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      planName: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "Start"
      },
      pluginQuota: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 4
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "active"
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex("TenantSubscriptions", ["tenantId"], {
      unique: true,
      name: "tenant_subscriptions_tenant_id_unique"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("TenantSubscriptions");
  }
};
