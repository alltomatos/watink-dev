import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  Default,
  BelongsToMany,
  ForeignKey,
  BelongsTo
} from "sequelize-typescript";
import Permission from "./Permission";
import RolePermission from "./RolePermission";
import User from "./User";
import UserRole from "./UserRole";
import Tenant from "./Tenant";

@Table
class Role extends Model<Role> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  name: string;

  @Column
  description: string;

  @Default(false)
  @Column
  isSystem: boolean;

  @ForeignKey(() => Tenant)
  @Column(DataType.UUID)
  tenantId: number | string;

  @BelongsTo(() => Tenant)
  tenant: Tenant;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @BelongsToMany(() => Permission, () => RolePermission)
  permissions: Permission[];

  @BelongsToMany(() => User, () => UserRole)
  users: User[];
}

export default Role;
