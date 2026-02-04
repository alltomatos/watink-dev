import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  BelongsTo,
  DataType,
  Default
} from "sequelize-typescript";
import Activity from "./Activity";
import Tenant from "./Tenant";

export type OccurrenceType = "info" | "impediment" | "delay";

@Table({ tableName: "ActivityOccurrences" })
class ActivityOccurrence extends Model<ActivityOccurrence> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Activity)
  @Column
  activityId: number;

  @BelongsTo(() => Activity)
  activity: Activity;

  @ForeignKey(() => Tenant)
  @Column(DataType.UUID)
  tenantId: string;

  @BelongsTo(() => Tenant)
  tenant: Tenant;

  @Column(DataType.TEXT)
  description: string;

  @Default("info")
  @Column(DataType.ENUM("info", "impediment", "delay"))
  type: OccurrenceType;

  @Column(DataType.INTEGER)
  timeImpact: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default ActivityOccurrence;
