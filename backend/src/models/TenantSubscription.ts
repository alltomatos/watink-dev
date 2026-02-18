import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  DataType,
  PrimaryKey,
  Default,
  ForeignKey,
  BelongsTo,
  Index
} from "sequelize-typescript";
import Tenant from "./Tenant";

@Table
class TenantSubscription extends Model<TenantSubscription> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Index
  @ForeignKey(() => Tenant)
  @Column(DataType.UUID)
  tenantId: string;

  @BelongsTo(() => Tenant)
  tenant: Tenant;

  @Default("Start")
  @Column
  planName: string;

  @Default(4)
  @Column
  pluginQuota: number;

  @Default("active")
  @Column
  status: string;

  @Column
  expiresAt: Date;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default TenantSubscription;
