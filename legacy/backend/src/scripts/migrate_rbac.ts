import Role from "../models/Role";
import RolePermission from "../models/RolePermission";
import Permission from "../models/Permission";
import Group from "../models/Group";
import GroupPermission from "../models/GroupPermission";
import User from "../models/User";
import UserRole from "../models/UserRole";
import sequelize from "../database";

export async function migrateGroupsToRoles() {
  const transaction = await sequelize.transaction();
  try {
    console.log("🚀 Starting migration: Groups to Roles...");

    const groups = await Group.findAll({
      include: [{ model: Permission, as: "permissions" }],
      transaction
    });

    for (const group of groups) {
      console.log(`📦 Migrating group: ${group.name}`);

      // 1. Create Role
      const [role] = await Role.findOrCreate({
        where: { name: group.name, tenantId: group.tenantId },
        defaults: {
          description: `Role migrated from group ${group.name}`,
          isSystem: false,
          tenantId: group.tenantId
        },
        transaction
      });

      // 2. Link Permissions to Role
      if (group.permissions && group.permissions.length > 0) {
        for (const permission of group.permissions) {
          await RolePermission.findOrCreate({
            where: {
              roleId: role.id,
              permissionId: permission.id,
              tenantId: group.tenantId
            },
            defaults: {
              roleId: role.id,
              permissionId: permission.id,
              tenantId: group.tenantId,
              scope: { all: true } // Default scope
            },
            transaction
          });
        }
      }

      // 3. Link Users to Role
      const users = await User.findAll({
        where: { groupId: group.id },
        transaction
      });

      for (const user of users) {
        await UserRole.findOrCreate({
          where: { userId: user.id, roleId: role.id },
          transaction
        });
      }
    }

    await transaction.commit();
    console.log("✅ Migration completed successfully!");
  } catch (error) {
    await transaction.rollback();
    console.error("❌ Error during migration:", error);
    throw error;
  }
}
