import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  DataType,
  Unique,
  AllowNull
} from "sequelize-typescript";

@Table
class Plan extends Model<Plan> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Unique
  @AllowNull(false)
  @Column
  name: string;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  pluginQuota: number;

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  price: number;

  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  active: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default Plan;
